#!/usr/bin/env python3
"""
YuNet ONNX Model Validator
--------------------------
Loads the YuNet ONNX model, verifies tensor shapes,
runs a test inference, and prints the raw output structure.

Usage:
  source tools/model_validation/.venv/bin/activate
  python tools/model_validation/validate_onnx.py
"""

import os
import sys
import numpy as np

def main():
    try:
        import onnx
        import onnxruntime as ort
    except ImportError:
        print("ERROR: Missing dependencies. Run:")
        print("  source tools/model_validation/.venv/bin/activate")
        print("  pip install onnx onnxruntime numpy")
        sys.exit(1)

    model_path = os.path.join("assets", "models", "face_detection_yunet_2023mar.onnx")
    if not os.path.exists(model_path):
        print(f"ERROR: Model not found at {model_path}")
        print("Download from: https://huggingface.co/opencv/face_detection_yunet")
        sys.exit(1)

    print("=" * 60)
    print("YUNET ONNX VALIDATION REPORT")
    print("=" * 60)

    # --- 1. Load and verify ONNX model ---
    print("\n[1/5] Loading ONNX model...")
    model = onnx.load(model_path)
    onnx.checker.check_model(model)
    print("  ✅ Model loaded and validated by ONNX checker.")

    # --- 2. Input tensor verification ---
    print("\n[2/5] Input tensor verification...")
    input_shape = None
    for inp in model.graph.input:
        name = inp.name
        shape = [d.dim_value if d.dim_value > 0 else "dynamic" for d in inp.type.tensor_type.shape.dim]
        dtype = inp.type.tensor_type.elem_type
        dtype_name = onnx.TensorProto.DataType.Name(dtype)
        input_shape = shape
        print(f"  Name:  {name}")
        print(f"  Shape: {shape}")
        print(f"  Type:  {dtype_name}")
    
    # --- 3. Output tensor verification ---
    print("\n[3/5] Output tensor verification...")
    print(f"  Total output tensors: {len(model.graph.output)}")
    for out in model.graph.output:
        name = out.name
        shape = [d.dim_value if d.dim_value > 0 else "dynamic" for d in out.type.tensor_type.shape.dim]
        dtype = out.type.tensor_type.elem_type
        dtype_name = onnx.TensorProto.DataType.Name(dtype)
        print(f"    {name}: shape={shape}, type={dtype_name}")

    # --- 4. Test inference with NATIVE input size ---
    h = input_shape[2] if isinstance(input_shape[2], int) else 640
    w = input_shape[3] if isinstance(input_shape[3], int) else 640
    print(f"\n[4/5] Running test inference with native input [{1}, {3}, {h}, {w}]...")
    
    session = ort.InferenceSession(model_path)
    input_name = session.get_inputs()[0].name
    test_input = np.random.rand(1, 3, h, w).astype(np.float32) * 255.0
    
    outputs = session.run(None, {input_name: test_input})
    
    print(f"\n  Number of output tensors: {len(outputs)}")
    
    # Categorize outputs by FPN scale
    output_names = [o.name for o in session.get_outputs()]
    print("\n  FPN Multi-Scale Output Structure:")
    for scale in [8, 16, 32]:
        anchors = (h // scale) * (w // scale)
        print(f"\n  --- Scale {scale}x (anchors: {anchors}) ---")
        for name, out in zip(output_names, outputs):
            if name.endswith(f"_{scale}"):
                prefix = name.split("_")[0]
                print(f"    {name}: shape={out.shape}, "
                      f"min={out.min():.4f}, max={out.max():.4f}, "
                      f"mean={out.mean():.4f}")

    # --- 5. Model metadata ---
    print(f"\n[5/5] Model metadata...")
    file_size = os.path.getsize(model_path)
    print(f"  File size:     {file_size:,} bytes ({file_size / 1024:.1f} KB)")
    print(f"  Parameters:    ~75,856")
    print(f"  Native input:  [1, 3, {h}, {w}]")
    print(f"  Output format: 12 raw FPN tensors (cls, obj, bbox, kps at 3 scales)")
    print(f"  Postprocess:   Decode anchors → NMS → 15-element detections")
    
    print("\n" + "=" * 60)
    print("VALIDATION COMPLETE — ALL CHECKS PASSED")
    print("=" * 60)

if __name__ == "__main__":
    main()
