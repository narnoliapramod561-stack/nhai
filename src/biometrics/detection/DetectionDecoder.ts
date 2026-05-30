import { FaceDetection, FaceLandmarks } from './DetectionTypes';

const INPUT_SIZE = 320;
const IOU_THRESHOLD = 0.3;
const CONFIDENCE_THRESHOLD = 0.7;

interface Anchor {
  x: number;
  y: number;
  scale: number;
}

let _anchorsCache: Anchor[] | null = null;

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
  
  const globalRef = global as any;
  if (!globalRef.__yunetSuppressed || globalRef.__yunetSuppressed.length < detections.length) {
    globalRef.__yunetSuppressed = new Array(Math.max(100, detections.length)).fill(false);
  } else {
    globalRef.__yunetSuppressed.fill(false, 0, detections.length);
  }

  const suppressed = globalRef.__yunetSuppressed;

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

export function decodeDetections(tensors: ArrayBuffer[]): FaceDetection[] {
  'worklet';
  
  // TFLite outputs an array of ArrayBuffers (12 tensors)
  if (!tensors || tensors.length !== 12) return [];

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

    const score = sigmoid(clsVal) * sigmoid(objVal);

    if (score > CONFIDENCE_THRESHOLD) {
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

  return nms(detections);
}
