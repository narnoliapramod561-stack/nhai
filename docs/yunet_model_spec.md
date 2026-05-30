# YuNet Model Specification

## Model Identity

| Field | Value |
|---|---|
| **Model Name** | `face_detection_yunet_2023mar.onnx` |
| **Version** | 2023-03 (latest stable) |
| **Architecture** | Anchor-free face detector, MobileNet backbone + FPN |
| **Parameters** | 75,856 |
| **License** | MIT |
| **Source** | [OpenCV Zoo](https://huggingface.co/opencv/face_detection_yunet) |
| **File Size** | 232,589 bytes (227.1 KB) |

---

## 1. Input Tensor

| Field | Value |
|---|---|
| **Name** | `input` |
| **Shape** | `[1, 3, 640, 640]` (NCHW) |
| **Data Type** | Float32 |
| **Channel Order** | BGR |
| **Value Range** | 0–255 (no normalization required) |

### Preprocessing Steps
1. Resize input image to **640×640** pixels (or a custom size if model is rebuilt with onnxsim)
2. Convert from RGB to **BGR** channel order
3. Convert pixel values to **Float32** (keep 0–255 range, do NOT normalize to 0–1)
4. Reshape to **NCHW** format: `[1, 3, H, W]`

> **Note:** For mobile deployment at 320×320, the model must be reshaped via `onnxsim` with `input_shapes={"input": [1, 3, 320, 320]}` before TFLite conversion. The FPN anchor counts will adjust proportionally (1600/400/100 instead of 6400/1600/400).

---

## 2. Output Tensors (Raw FPN)

The model outputs **12 raw Feature Pyramid Network tensors** at 3 scales (8×, 16×, 32×).

### At native 640×640 input:

| Tensor Name | Shape | Description |
|---|---|---|
| `cls_8` | `[1, 6400, 1]` | Classification scores (scale 8×) |
| `cls_16` | `[1, 1600, 1]` | Classification scores (scale 16×) |
| `cls_32` | `[1, 400, 1]` | Classification scores (scale 32×) |
| `obj_8` | `[1, 6400, 1]` | Objectness scores (scale 8×) |
| `obj_16` | `[1, 1600, 1]` | Objectness scores (scale 16×) |
| `obj_32` | `[1, 400, 1]` | Objectness scores (scale 32×) |
| `bbox_8` | `[1, 6400, 4]` | Bounding box deltas (scale 8×) |
| `bbox_16` | `[1, 1600, 4]` | Bounding box deltas (scale 16×) |
| `bbox_32` | `[1, 400, 4]` | Bounding box deltas (scale 32×) |
| `kps_8` | `[1, 6400, 10]` | Keypoint deltas (scale 8×) |
| `kps_16` | `[1, 1600, 10]` | Keypoint deltas (scale 16×) |
| `kps_32` | `[1, 400, 10]` | Keypoint deltas (scale 32×) |

**Anchor counts per scale:**
- Scale 8×: `(H/8) × (W/8)` → 6400 at 640×640, **1600 at 320×320**
- Scale 16×: `(H/16) × (W/16)` → 1600 at 640×640, **400 at 320×320**
- Scale 32×: `(H/32) × (W/32)` → 400 at 640×640, **100 at 320×320**

---

## 3. Landmark Format

Each keypoint tensor (`kps_*`) contains **10 values per anchor** representing 5 facial landmarks:

| Landmark | Indices |
|---|---|
| Right Eye | 0–1 |
| Left Eye | 2–3 |
| Nose Tip | 4–5 |
| Right Mouth Corner | 6–7 |
| Left Mouth Corner | 8–9 |

Values are **deltas relative to anchor positions** — they must be decoded using the anchor grid before use.

---

## 4. Confidence Score Format

Final detection confidence = `sigmoid(cls) × sigmoid(obj)`

- `cls_*`: Raw classification logit → apply sigmoid
- `obj_*`: Raw objectness logit → apply sigmoid
- **Recommended threshold**: 0.6–0.9 (tunable)
- For biometric attendance: **0.7** recommended

---

## 5. Required Postprocessing

### Step 1: Generate Anchor Grid
For each FPN scale (8, 16, 32), generate a grid of anchor positions:
```
For scale s, anchors at [(x * s + s/2, y * s + s/2)] for each grid cell
```

### Step 2: Decode Predictions
- **Bounding boxes**: `bbox_decoded = anchor_center + bbox_delta * scale`
- **Keypoints**: `kps_decoded = anchor_center + kps_delta * scale`
- **Confidence**: `score = sigmoid(cls) * sigmoid(obj)`

### Step 3: Confidence Filtering
Filter detections where `score < threshold` (e.g., 0.7).

### Step 4: Non-Maximum Suppression (NMS)
- **IoU Threshold**: 0.3–0.5
- Keep detection with highest confidence per overlapping region

### Step 5: Coordinate Scaling
Output coordinates are relative to input size. To map to original frame:
```
scale_x = original_width / input_width
scale_y = original_height / input_height
```

### Step 6: Final Detection Format (after postprocessing)
Each detection becomes a **15-element vector**:
`[bbox_x, bbox_y, bbox_w, bbox_h, re_x, re_y, le_x, le_y, nose_x, nose_y, rm_x, rm_y, lm_x, lm_y, confidence]`
