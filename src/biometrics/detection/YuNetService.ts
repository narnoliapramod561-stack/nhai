declare const global: any;

import { useMemo } from 'react';
import { Platform } from 'react-native';
import { scheduleOnRN } from 'react-native-worklets';
import { NitroModules } from 'react-native-nitro-modules';
import { useFrameOutput, Frame } from 'react-native-vision-camera';
import { useTensorflowModel } from 'react-native-fast-tflite';
import { DetectionResult, FaceDetection, FaceLandmarks } from './DetectionTypes';

const INPUT_SIZE = 320;
const IOU_THRESHOLD = 0.3;
const CONFIDENCE_THRESHOLD = 0.7;
const STACK_TRACE_PREVIEW_LINES = 3;
const FORENSIC_THRESHOLDS = [0.1, 0.05, 0.01] as const;
const CAPTURE_STATE = {
  NO_FACE: 'NO_FACE',
  FACE_NOT_CENTERED: 'FACE_NOT_CENTERED',
  READY_TO_CAPTURE: 'READY_TO_CAPTURE',
} as const;

interface Anchor {
  x: number;
  y: number;
  scale: number;
}

function generateAnchors(): Anchor[] {
  'worklet';
  const globalRef = global as any;
  if (globalRef.__yunetAnchors) return globalRef.__yunetAnchors;
  
  const anchors: Anchor[] = [];
  const scales = [8, 16, 32];
  
  for (const scale of scales) {
    const featureMapSize = Math.floor(INPUT_SIZE / scale);
    for (let y = 0; y < featureMapSize; y++) {
      for (let x = 0; x < featureMapSize; x++) {
        anchors.push({
          x: Math.floor(x * scale + scale / 2),
          y: Math.floor(y * scale + scale / 2),
          scale: scale,
        });
      }
    }
  }
  
  globalRef.__yunetAnchors = anchors;
  return anchors;
}

function sigmoid(x: number): number {
  'worklet';
  return 1 / (1 + Math.exp(-x));
}

function calculateIoU(box1: any, box2: any): number {
  'worklet';
  const xA = Math.max(box1.x, box2.x);
  const yA = Math.max(box1.y, box2.y);
  const xB = Math.min(box1.x + box1.w, box2.x + box2.w);
  const yB = Math.min(box1.y + box1.h, box2.y + box2.h);

  const interArea = Math.max(0, xB - xA) * Math.max(0, yB - yA);
  const box1Area = box1.w * box1.h;
  const box2Area = box2.w * box2.h;
  const iou = interArea / (box1Area + box2Area - interArea);
  
  return iou;
}

function nms(detections: FaceDetection[]): FaceDetection[] {
  'worklet';
  if (detections.length === 0) return [];

  // Sort by confidence descending
  detections.sort((a, b) => b.confidence - a.confidence);

  const picked: FaceDetection[] = [];
  const suppressed: boolean[] = [];
  for (let i = 0; i < detections.length; i++) {
    suppressed.push(false);
  }

  for (let i = 0; i < detections.length; i++) {
    if (suppressed[i]) continue;
    picked.push(detections[i]);
    for (let j = i + 1; j < detections.length; j++) {
      if (suppressed[j]) continue;
      const iou = calculateIoU(detections[i].bbox, detections[j].bbox);
      if (iou > IOU_THRESHOLD) {
        suppressed[j] = true;
      }
    }
  }

  return picked;
}

function checkIsCentered(bbox: any): boolean {
  'worklet';
  const cx = bbox.x + bbox.w / 2;
  const cy = bbox.y + bbox.h / 2;
  const frameCenter = INPUT_SIZE / 2;
  // Within 20% of frame center (160 +- 32)
  const margin = INPUT_SIZE * 0.2;
  const isCenteredX = Math.abs(cx - frameCenter) < margin;
  const isCenteredY = Math.abs(cy - frameCenter) < margin;
  
  // Bbox area should be > 10% of frame area to be close enough
  const bboxArea = bbox.w * bbox.h;
  const frameArea = INPUT_SIZE * INPUT_SIZE;
  const isLargeEnough = bboxArea > frameArea * 0.1;

  return isCenteredX && isCenteredY && isLargeEnough;
}

interface DecodeStats {
  rawOutputCount: number;
  postThresholdCount: number;
  postNmsCount: number;
  maxConfidence: number;
  maxConfidenceAnchorIndex: number;
  thresholdSweepCounts: Record<string, number>;
}

function decodeDetections(tensors: ArrayBuffer[]): { detections: FaceDetection[]; stats: DecodeStats } {
  'worklet';
  
  // TFLite outputs an array of ArrayBuffers (12 tensors)
  if (!tensors || tensors.length !== 12) {
    return {
      detections: [],
      stats: {
        rawOutputCount: 0,
        postThresholdCount: 0,
        postNmsCount: 0,
        maxConfidence: 0,
        maxConfidenceAnchorIndex: -1,
        thresholdSweepCounts: {
          '0.1': 0,
          '0.05': 0,
          '0.01': 0,
        },
      },
    };
  }

  // In JS context, the model outputs might be out of order if we don't map them carefully,
  // but assuming standard TFLite mapping per validate script:
  const cls_8 = new Float32Array(tensors[0]);
  const cls_16 = new Float32Array(tensors[1]);
  const cls_32 = new Float32Array(tensors[2]);
  
  const obj_8 = new Float32Array(tensors[3]);
  const obj_16 = new Float32Array(tensors[4]);
  const obj_32 = new Float32Array(tensors[5]);
  
  const bbox_8 = new Float32Array(tensors[6]);
  const bbox_16 = new Float32Array(tensors[7]);
  const bbox_32 = new Float32Array(tensors[8]);
  
  const kps_8 = new Float32Array(tensors[9]);
  const kps_16 = new Float32Array(tensors[10]);
  const kps_32 = new Float32Array(tensors[11]);

  const anchors = generateAnchors();
  const detections: FaceDetection[] = [];
  let postThresholdCount = 0;
  let maxConfidence = 0;
  let maxConfidenceAnchorIndex = -1;
  const thresholdSweepCounts: Record<string, number> = {
    '0.1': 0,
    '0.05': 0,
    '0.01': 0,
  };

  const cls8Min = Math.min(...cls_8);
  const cls8Max = Math.max(...cls_8);
  const obj8Min = Math.min(...obj_8);
  const obj8Max = Math.max(...obj_8);
  const clsObjAlreadyProbability = cls8Min >= 0 && cls8Max <= 1 && obj8Min >= 0 && obj8Max <= 1;

  const globalRef = global as any;
  if (!globalRef.__yunetOutputFormatLogged) {
    globalRef.__yunetOutputFormatLogged = true;
    console.log('[DEBUG_AUDIT] OUTPUT_TENSOR_LAYOUT: cls/obj/bbox/kps x [8,16,32]');
    console.log(
      '[DEBUG_AUDIT] OUTPUT_TENSOR_SHAPES: cls8=' +
        cls_8.length +
        ' cls16=' +
        cls_16.length +
        ' cls32=' +
        cls_32.length +
        ' obj8=' +
        obj_8.length +
        ' obj16=' +
        obj_16.length +
        ' obj32=' +
        obj_32.length +
        ' bbox8=' +
        bbox_8.length +
        ' bbox16=' +
        bbox_16.length +
        ' bbox32=' +
        bbox_32.length +
        ' kps8=' +
        kps_8.length +
        ' kps16=' +
        kps_16.length +
        ' kps32=' +
        kps_32.length
    );
    console.log(
      '[DEBUG_AUDIT] OUTPUT_VALUE_RANGE: cls8Min=' +
        cls8Min +
        ' cls8Max=' +
        cls8Max +
        ' obj8Min=' +
        obj8Min +
        ' obj8Max=' +
        obj8Max
    );
    console.log('[DEBUG_AUDIT] OUTPUT_CONF_DOMAIN: ' + (clsObjAlreadyProbability ? 'PROBABILITY' : 'LOGIT'));
    console.log('[DEBUG_AUDIT] OUTPUT_FIRST20_CLS8: ' + Array.from(cls_8.slice(0, 20)).join(','));
    console.log('[DEBUG_AUDIT] OUTPUT_FIRST20_OBJ8: ' + Array.from(obj_8.slice(0, 20)).join(','));
  }

  const shouldLogScoreDistribution = !globalRef.__yunetConfidenceDistributionLogged;
  const scoreFirst50: number[] = [];
  const scoreSigmoidFirst50: number[] = [];

  // We have 2100 anchors (1600 + 400 + 100)
  for (let i = 0; i < anchors.length; i++) {
    const anchor = anchors[i];
    let clsVal = 0, objVal = 0;
    let bboxBase = 0, kpsBase = 0;
    let bboxArray: Float32Array, kpsArray: Float32Array;

    // Determine which scale this anchor belongs to
    if (i < 1600) {
      clsVal = cls_8[i];
      objVal = obj_8[i];
      bboxArray = bbox_8;
      kpsArray = kps_8;
      bboxBase = i * 4;
      kpsBase = i * 10;
    } else if (i < 2000) {
      const idx = i - 1600;
      clsVal = cls_16[idx];
      objVal = obj_16[idx];
      bboxArray = bbox_16;
      kpsArray = kps_16;
      bboxBase = idx * 4;
      kpsBase = idx * 10;
    } else {
      const idx = i - 2000;
      clsVal = cls_32[idx];
      objVal = obj_32[idx];
      bboxArray = bbox_32;
      kpsArray = kps_32;
      bboxBase = idx * 4;
      kpsBase = idx * 10;
    }

    // Some exports emit cls/obj logits, others emit probabilities in [0,1].
    // Detect and decode adaptively from actual runtime tensor values.
    const clsProb = clsObjAlreadyProbability ? clsVal : sigmoid(clsVal);
    const objProb = clsObjAlreadyProbability ? objVal : sigmoid(objVal);
    const score = clsProb * objProb;
    if (shouldLogScoreDistribution && i < 50) {
      const scoreSigmoid = sigmoid(clsVal) * sigmoid(objVal);
      scoreFirst50.push(score);
      scoreSigmoidFirst50.push(scoreSigmoid);
    }

    if (score > maxConfidence) {
      maxConfidence = score;
      maxConfidenceAnchorIndex = i;
    }

    for (const threshold of FORENSIC_THRESHOLDS) {
      if (score > threshold) {
        thresholdSweepCounts[String(threshold)]++;
      }
    }

    if (score > CONFIDENCE_THRESHOLD) {
      postThresholdCount++;
      // Decode bbox
      const cx = anchor.x + bboxArray[bboxBase] * anchor.scale;
      const cy = anchor.y + bboxArray[bboxBase + 1] * anchor.scale;
      const w = Math.exp(bboxArray[bboxBase + 2]) * anchor.scale;
      const h = Math.exp(bboxArray[bboxBase + 3]) * anchor.scale;
      
      const bbox = {
        x: cx - w / 2,
        y: cy - h / 2,
        w,
        h
      };

      // Decode landmarks
      const landmarks: FaceLandmarks = {
        rightEye: { 
          x: anchor.x + kpsArray[kpsBase] * anchor.scale,
          y: anchor.y + kpsArray[kpsBase + 1] * anchor.scale 
        },
        leftEye: { 
          x: anchor.x + kpsArray[kpsBase + 2] * anchor.scale,
          y: anchor.y + kpsArray[kpsBase + 3] * anchor.scale 
        },
        nose: { 
          x: anchor.x + kpsArray[kpsBase + 4] * anchor.scale,
          y: anchor.y + kpsArray[kpsBase + 5] * anchor.scale 
        },
        rightMouth: { 
          x: anchor.x + kpsArray[kpsBase + 6] * anchor.scale,
          y: anchor.y + kpsArray[kpsBase + 7] * anchor.scale 
        },
        leftMouth: { 
          x: anchor.x + kpsArray[kpsBase + 8] * anchor.scale,
          y: anchor.y + kpsArray[kpsBase + 9] * anchor.scale 
        }
      };

      detections.push({
        bbox,
        confidence: score,
        landmarks,
        isCentered: checkIsCentered(bbox)
      });
    }
  }

  const postNms = nms(detections);
  if (shouldLogScoreDistribution && scoreFirst50.length > 0) {
    globalRef.__yunetConfidenceDistributionLogged = true;
    const scoreMin = Math.min(...scoreFirst50);
    const scoreMax = Math.max(...scoreFirst50);
    const scoreMean = scoreFirst50.reduce((sum, val) => sum + val, 0) / scoreFirst50.length;
    const scoreSigmoidMin = Math.min(...scoreSigmoidFirst50);
    const scoreSigmoidMax = Math.max(...scoreSigmoidFirst50);
    const scoreSigmoidMean =
      scoreSigmoidFirst50.reduce((sum, val) => sum + val, 0) / scoreSigmoidFirst50.length;
    console.log(
      '[DEBUG_AUDIT] SCORE_DIST_FIRST50_ADAPTIVE: min=' +
        scoreMin +
        ' max=' +
        scoreMax +
        ' mean=' +
        scoreMean
    );
    console.log(
      '[DEBUG_AUDIT] SCORE_DIST_FIRST50_SIGMOID: min=' +
        scoreSigmoidMin +
        ' max=' +
        scoreSigmoidMax +
        ' mean=' +
        scoreSigmoidMean
    );
  }

  return {
    detections: postNms,
    stats: {
      rawOutputCount: anchors.length,
      postThresholdCount,
      postNmsCount: postNms.length,
      maxConfidence,
      maxConfidenceAnchorIndex,
      thresholdSweepCounts,
    },
  };
}

/**
 * Bilinear resize from an RGB ArrayBuffer to a 320x320 Float32Array.
 * Runs inside a worklet — no external native plugin required.
 *
 * VisionCamera v5 removed the old FrameProcessorPlugin API that
 * vision-camera-resize-plugin relied on. This function replaces it
 * with pure JS math inside the worklet thread.
 */
function resizeRGBToFloat32(
  srcBuffer: ArrayBuffer,
  srcWidth: number,
  srcHeight: number,
  dstWidth: number,
  dstHeight: number,
  orientation: string
): Float32Array {
  'worklet';
  const src = new Uint8Array(srcBuffer);
  const dst = new Float32Array(dstWidth * dstHeight * 3);

  // Auto-detect bytes-per-pixel from actual buffer size.
  // VisionCamera on Android returns RGBA (4 BPP) even when pixelFormat='rgb'.
  const totalPixels = srcWidth * srcHeight;
  const bytesPerPixel = Math.round(src.length / totalPixels); // 3=RGB, 4=RGBA

  const globalRef2 = global as any;
  if (!globalRef2.__resizeLogOnce) {
    globalRef2.__resizeLogOnce = true;
    console.log('[RESIZE_DBG] srcLen=' + src.length + ' totalPixels=' + totalPixels + ' bytesPerPixel=' + bytesPerPixel + ' orientation=' + orientation);
  }

  for (let y = 0; y < dstHeight; y++) {
    const yNorm = y / dstHeight;
    for (let x = 0; x < dstWidth; x++) {
      const xNorm = x / dstWidth;

      let srcXNorm = xNorm;
      let srcYNorm = yNorm;

      if (orientation === 'right' || orientation === 'landscape-right') {
        // 90 degrees CW rotation
        srcXNorm = yNorm;
        srcYNorm = 1 - xNorm;
      } else if (orientation === 'left' || orientation === 'landscape-left') {
        // 270 degrees CW (90 degrees CCW) rotation
        srcXNorm = 1 - yNorm;
        srcYNorm = xNorm;
      } else if (orientation === 'down' || orientation === 'portrait-upside-down') {
        // 180 degrees rotation
        srcXNorm = 1 - xNorm;
        srcYNorm = 1 - yNorm;
      }

      const srcX = Math.min(Math.floor(srcXNorm * srcWidth), srcWidth - 1);
      const srcY = Math.min(Math.floor(srcYNorm * srcHeight), srcHeight - 1);

      const srcIdx = (srcY * srcWidth + srcX) * bytesPerPixel;
      const dstIdx = (y * dstWidth + x) * 3;

      // Swapping Red & Blue to feed BGR channel order to YuNet (OpenCV format)
      dst[dstIdx] = src[srcIdx + 2];     // B
      dst[dstIdx + 1] = src[srcIdx + 1]; // G
      dst[dstIdx + 2] = src[srcIdx];     // R
    }
  }

  return dst;
}

export class YuNetService {
  /**
   * Hook to initialize the model and frame processor.
   * @param onDetection Callback fired on the JS thread when detections are ready.
   */
  static useYuNetDetection(onDetection: (result: DetectionResult) => void) {
    const globalRef = global as any;
    if (!globalRef.__yunetModelLoadStarted) {
      globalRef.__yunetModelLoadStarted = true;
      console.log('[DEBUG_AUDIT] MODEL_LOAD_START');
    }

    // 1. Load the model with hardware acceleration fallback
    const plugin = useTensorflowModel(
      require('../../../assets/models/face_detection_yunet_fp32.tflite'),
      // @ts-ignore Fast-TFLite types for delegates can be strict
      Platform.OS === 'ios' ? ['core-ml'] : ['android-gpu', 'nnapi']
    );
    const boxedModel = useMemo(
      () => (plugin.state === 'loaded' && plugin.model ? NitroModules.box(plugin.model) : undefined),
      [plugin.state, plugin.model]
    );

    if (plugin.state === 'loaded' && globalRef.__yunetModelLoadState !== 'loaded') {
      globalRef.__yunetModelLoadState = 'loaded';
      console.log('[DEBUG_AUDIT] MODEL_LOAD_SUCCESS');
    } else if (plugin.state === 'error' && globalRef.__yunetModelLoadState !== 'error') {
      globalRef.__yunetModelLoadState = 'error';
      console.log('[DEBUG_AUDIT] MODEL_LOAD_FAIL: ' + (plugin.error?.message || 'unknown'));
    }

    // 2. Callback wrapper to run on JS thread
    const handleResult = useMemo(() => {
      return (result: DetectionResult) => {
        'worklet';
        scheduleOnRN(onDetection, result);
      };
    }, [onDetection]);

    // 4. Create the frame processor
    const frameOutput = useFrameOutput({
      pixelFormat: 'rgb',
      onFrame: (frame: Frame) => {
        'worklet';
        if (boxedModel == null) {
          frame.dispose();
          return;
        }

        const model = boxedModel.unbox();

        const globalFrameRef = global as any;
        if (!globalFrameRef.__throttleState) {
          globalFrameRef.__throttleState = {
            lastInferenceTime: 0,
            lastBridgeTime: 0,
            lastFaceCount: -1,
            lastCentered: false,
            lastFaceX: -1,
            lastFaceY: -1,
            lastCaptureState: CAPTURE_STATE.NO_FACE as string,
          };
        }
        const throttleState = globalFrameRef.__throttleState;

        const now = Date.now ? Date.now() : 0;

        // 1. Throttle Inference to 8 FPS (125ms per frame)
        if (now - throttleState.lastInferenceTime < 125) {
          frame.dispose();
          return;
        }
        throttleState.lastInferenceTime = now;

        const startTime = now;

        // === DEBUG: Log frame dimensions ===
        const fw = frame.width;
        const fh = frame.height;

        console.log('[DEBUG_AUDIT] FRAME_RECEIVED: true');
        console.log('[DEBUG_AUDIT] FRAME_WIDTH: ' + fw);
        console.log('[DEBUG_AUDIT] FRAME_HEIGHT: ' + fh);
        console.log('[DEBUG_AUDIT] FRAME_FORMAT: ' + frame.pixelFormat);
        console.log('[DEBUG_AUDIT] FRAME_ROTATION: ' + frame.orientation);

        let detections: FaceDetection[] = [];
        let inferenceTimeMs = 0;

        try {
          // Resize camera frame to 320x320 RGB for the model
          const pixelBuffer = frame.getPixelBuffer();
          console.log('[DEBUG_AUDIT] BUFFER_TYPE: ' + (pixelBuffer ? 'ArrayBuffer' : 'null'));
          
          console.log('[DEBUG_AUDIT] YUNET_INPUT_SHAPE: [1, 320, 320, 3]');
          const inputBuffer = resizeRGBToFloat32(
            pixelBuffer,
            fw,
            fh,
            320,
            320,
            frame.orientation
          );
          let inputMin = Number.POSITIVE_INFINITY;
          let inputMax = Number.NEGATIVE_INFINITY;
          let inputSum = 0;
          for (let i = 0; i < inputBuffer.length; i++) {
            const value = inputBuffer[i];
            if (value < inputMin) inputMin = value;
            if (value > inputMax) inputMax = value;
            inputSum += value;
          }
          console.log('[DEBUG_AUDIT] INPUT_TENSOR_STATS: min=' + inputMin + ' max=' + inputMax + ' mean=' + inputSum / inputBuffer.length);
          if (!globalFrameRef.__yunetInputLayoutLogged) {
            globalFrameRef.__yunetInputLayoutLogged = true;
            console.log('[DEBUG_AUDIT] INPUT_LAYOUT_SENT: NHWC_FLAT');
            console.log('[DEBUG_AUDIT] INPUT_CHANNEL_ORDER_SENT: RGB');
            console.log('[DEBUG_AUDIT] INPUT_NORMALIZATION_SENT: 0_TO_255_FLOAT32');
          }

          // Run inference synchronously
          console.log('[DEBUG_AUDIT] INFERENCE_START');
          const outputs = model.runSync([inputBuffer.buffer as ArrayBuffer]);
          console.log('[DEBUG_AUDIT] INFERENCE_SUCCESS');

          // Decode the 12 FPN output tensors
          const decoded = decodeDetections(outputs as ArrayBuffer[]);
          detections = decoded.detections;
          console.log('[DEBUG_AUDIT] RAW_OUTPUT_COUNT: ' + decoded.stats.rawOutputCount);
          console.log('[DEBUG_AUDIT] POST_THRESHOLD_COUNT: ' + decoded.stats.postThresholdCount);
          console.log('[DEBUG_AUDIT] POST_NMS_COUNT: ' + decoded.stats.postNmsCount);
          console.log('[DEBUG_AUDIT] THRESHOLD_COUNT_0.1: ' + decoded.stats.thresholdSweepCounts['0.1']);
          console.log('[DEBUG_AUDIT] THRESHOLD_COUNT_0.05: ' + decoded.stats.thresholdSweepCounts['0.05']);
          console.log('[DEBUG_AUDIT] THRESHOLD_COUNT_0.01: ' + decoded.stats.thresholdSweepCounts['0.01']);
          console.log('[DEBUG_AUDIT] TOP_CONFIDENCE: ' + decoded.stats.maxConfidence + ' anchorIndex=' + decoded.stats.maxConfidenceAnchorIndex);
          console.log('[DEBUG_AUDIT] FACE_COUNT: ' + detections.length);

          inferenceTimeMs = (Date.now ? Date.now() : 0) - startTime;
        } catch (e: any) {
          const stackPreview = (e?.stack || 'none')
            .split('\n')
            .slice(0, STACK_TRACE_PREVIEW_LINES)
            .join(' | ');
          console.log(
            '[DEBUG_AUDIT] INFERENCE_FAIL: ' +
              (e?.message || String(e)) +
              ' stack=' +
              stackPreview
          );
          detections = [];
        }

        // Find the largest face
        let largestFace = null;
        let maxArea = 0;
        for (const det of detections) {
          const area = det.bbox.w * det.bbox.h;
          if (area > maxArea) {
            maxArea = area;
            largestFace = det;
          }
        }

        const result: DetectionResult = {
          faceCount: detections.length,
          detections,
          largestFace,
          inferenceTimeMs,
        };

        // 2. Bridge Traffic Throttling
        const currentFaceCount = result.faceCount;
        const currentCentered = result.largestFace?.isCentered ?? false;
        const currentX = result.largestFace?.bbox.x ?? -1;
        const currentY = result.largestFace?.bbox.y ?? -1;
        
        let shouldUpdateJS = false;
        
        if (currentFaceCount !== throttleState.lastFaceCount) shouldUpdateJS = true;
        if (currentCentered !== throttleState.lastCentered) shouldUpdateJS = true;
        
        // Significant movement (>10 pixels)
        if (Math.abs(currentX - throttleState.lastFaceX) > 10 || Math.abs(currentY - throttleState.lastFaceY) > 10) {
          shouldUpdateJS = true;
        }

        // Heartbeat every 500ms even if no change
        if (now - throttleState.lastBridgeTime > 500) {
          shouldUpdateJS = true;
        }

        if (shouldUpdateJS) {
          throttleState.lastFaceCount = currentFaceCount;
          throttleState.lastCentered = currentCentered;
          throttleState.lastFaceX = currentX;
          throttleState.lastFaceY = currentY;
          throttleState.lastBridgeTime = now;
          
          handleResult(result);
        }

        let captureState: string = CAPTURE_STATE.NO_FACE;
        if (result.faceCount > 0 && !currentCentered) {
          captureState = CAPTURE_STATE.FACE_NOT_CENTERED;
        } else if (result.faceCount > 0 && currentCentered) {
          captureState = CAPTURE_STATE.READY_TO_CAPTURE;
        }
        if (captureState !== throttleState.lastCaptureState) {
          throttleState.lastCaptureState = captureState;
          console.log('[DEBUG_AUDIT] CAPTURE_STATE: ' + captureState);
          console.log('[DEBUG_AUDIT] IS_CENTERED: ' + currentCentered);
        }

        // Always dispose frame after processing
        frame.dispose();
      }
    });

    return {
      modelLoaded: plugin.state === 'loaded',
      modelError: plugin.state === 'error' ? plugin.error : undefined,
      frameOutput,
    };
  }
}
