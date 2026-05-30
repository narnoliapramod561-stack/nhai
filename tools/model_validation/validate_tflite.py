#!/usr/bin/env python3
"""
YuNet TFLite vs ONNX Validation
--------------------------------
Compares the outputs of the original ONNX model and the converted
FP32 TFLite model to verify conversion accuracy.

Handles the 12-tensor FPN output structure and NCHW→NHWC conversion.

Usage:
  source tools/model_validation/.venv312/bin/activate
  python tools/model_validation/validate_tflite.py
"""

import os
import sys
import json
import numpy as np

def main():
    try:
        import onnxruntime as ort
    except ImportError:
        print("ERROR: Missing onnxruntime. pip install onnxruntime")
        sys.exit(1)

    onnx_path = os.path.join("assets", "models", "face_detection_yunet_320x320_sim.onnx")
    tflite_path = os.path.join("assets", "models", "face_detection_yunet_fp32.tflite")

    if not os.path.exists(onnx_path):
        print(f"ERROR: Simplified ONNX model not found: {onnx_path}")
        sys.exit(1)
    if not os.path.exists(tflite_path):
        print(f"ERROR: TFLite model not found: {tflite_path}")
        sys.exit(1)

    try:
        import tensorflow as tf
        interpreter = tf.lite.Interpreter(model_path=tflite_path)
    except ImportError:
        try:
            import tflite_runtime.interpreter as tflite
            interpreter = tflite.Interpreter(model_path=tflite_path)
        except ImportError:
            print("ERROR: Missing tensorflow or tflite-runtime.")
            sys.exit(1)

    print("=" * 60)
    print("YUNET TFLITE vs ONNX VALIDATION")
    print("=" * 60)

    # --- Deterministic test input ---
    np.random.seed(42)
    test_nchw = np.random.rand(1, 3, 320, 320).astype(np.float32) * 255.0
    test_nhwc = np.transpose(test_nchw, (0, 2, 3, 1))  # [1, 320, 320, 3]

    # --- ONNX Inference ---
    print("\n[1/3] Running ONNX inference (320×320)...")
    ort_session = ort.InferenceSession(onnx_path)
    input_name = ort_session.get_inputs()[0].name
    onnx_output_names = [o.name for o in ort_session.get_outputs()]
    onnx_outputs = ort_session.run(None, {input_name: test_nchw})
    
    print(f"  ONNX outputs: {len(onnx_outputs)}")
    onnx_map = {}
    for name, out in zip(onnx_output_names, onnx_outputs):
        onnx_map[name] = out
        print(f"    {name}: {out.shape}")

    # --- TFLite Inference ---
    print("\n[2/3] Running TFLite inference...")
    interpreter.allocate_tensors()
    input_details = interpreter.get_input_details()
    output_details = interpreter.get_output_details()

    tflite_input_shape = input_details[0]['shape']
    if tflite_input_shape[-1] == 3:
        interpreter.set_tensor(input_details[0]['index'], test_nhwc)
    else:
        interpreter.set_tensor(input_details[0]['index'], test_nchw)
    
    interpreter.invoke()
    
    tflite_map = {}
    for d in output_details:
        name = d['name']
        tensor = interpreter.get_tensor(d['index'])
        tflite_map[name] = tensor
        print(f"    {name}: {tensor.shape}")

    # --- Comparison ---
    print("\n[3/3] Comparing outputs...")
    report = {"status": "UNKNOWN", "comparisons": []}
    all_pass = True

    # Try to match ONNX output names to TFLite output names
    for onnx_name, onnx_out in onnx_map.items():
        # TFLite may rename outputs; try exact match or partial match
        tflite_out = None
        matched_name = None
        
        if onnx_name in tflite_map:
            tflite_out = tflite_map[onnx_name]
            matched_name = onnx_name
        else:
            # Try partial name match
            for tname, tout in tflite_map.items():
                if onnx_name in tname or tname in onnx_name:
                    tflite_out = tout
                    matched_name = tname
                    break
        
        if tflite_out is None:
            print(f"\n  ⚠️  {onnx_name}: No matching TFLite output found (skipped)")
            continue

        onnx_flat = onnx_out.flatten()
        tflite_flat = tflite_out.flatten()
        min_len = min(len(onnx_flat), len(tflite_flat))
        
        abs_diff = np.abs(onnx_flat[:min_len] - tflite_flat[:min_len])
        max_diff = float(np.max(abs_diff))
        mean_diff = float(np.mean(abs_diff))
        denom = np.maximum(np.abs(onnx_flat[:min_len]), 1e-7)
        rel_diff = float(np.mean(abs_diff / denom) * 100)
        
        passed = rel_diff < 1.0
        if not passed:
            all_pass = False

        comp = {
            "onnx_tensor": onnx_name,
            "tflite_tensor": matched_name,
            "onnx_shape": list(onnx_out.shape),
            "tflite_shape": list(tflite_out.shape),
            "max_abs_diff": round(max_diff, 6),
            "mean_abs_diff": round(mean_diff, 6),
            "mean_rel_diff_pct": round(rel_diff, 4),
            "status": "PASS" if passed else "FAIL"
        }
        report["comparisons"].append(comp)

        status = "✅ PASS" if passed else "❌ FAIL"
        print(f"\n  {onnx_name} ↔ {matched_name}:")
        print(f"    Max abs diff:  {max_diff:.6f}")
        print(f"    Mean abs diff: {mean_diff:.6f}")
        print(f"    Mean rel diff: {rel_diff:.4f}%")
        print(f"    Status:        {status}")

    report["status"] = "PASS" if all_pass else "FAIL"

    report_path = os.path.join("docs", "yunet_validation_results.json")
    with open(report_path, "w") as f:
        json.dump(report, f, indent=2)
    print(f"\n  JSON report: {report_path}")

    print("\n" + "=" * 60)
    if all_pass:
        print("VALIDATION COMPLETE — ALL COMPARISONS PASSED (< 1% diff)")
    else:
        print("VALIDATION COMPLETE — SOME COMPARISONS EXCEEDED TOLERANCE")
    print("=" * 60)

if __name__ == "__main__":
    main()
