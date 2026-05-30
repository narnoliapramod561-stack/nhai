#!/usr/bin/env python3
"""
YuNet ONNX → FP32 TFLite Conversion Script
-------------------------------------------
Converts face_detection_yunet_2023mar.onnx to a FP32 TFLite model.

Pipeline: ONNX → onnxsim (freeze to 320×320) → onnx2tf → FP32 TFLite

Requirements (in venv):
  pip install onnx onnxsim onnx2tf tensorflow (or tensorflow-macos)

If TensorFlow is not available for your Python version, this script
will perform only the onnxsim step and output the simplified ONNX
for manual onnx2tf conversion.

Usage:
  source tools/model_validation/.venv/bin/activate
  python scripts/convert_yunet_to_tflite.py [--input-size 320]
"""

import os
import sys
import shutil
import argparse
import subprocess

def parse_args():
    parser = argparse.ArgumentParser(description="YuNet ONNX → TFLite Converter")
    parser.add_argument("--input-size", type=int, default=320,
                        help="Target input resolution (default: 320)")
    return parser.parse_args()

def step1_simplify(onnx_path, output_path, size):
    """Simplify ONNX model and freeze to target input size."""
    print(f"\n[Step 1/3] Simplifying ONNX → frozen input [{1},{3},{size},{size}]...")
    import onnx
    from onnxsim import simplify

    model = onnx.load(onnx_path)
    simplified, check = simplify(
        model,
        input_shapes={"input": [1, 3, size, size]},
    )

    if not check:
        print("  ⚠️  onnxsim validation warning (proceeding anyway)")
    else:
        print("  ✅ Simplification successful and validated.")

    onnx.save(simplified, output_path)
    
    # Verify new shapes
    for inp in simplified.graph.input:
        shape = [d.dim_value for d in inp.type.tensor_type.shape.dim]
        print(f"  Input shape: {shape}")
    for out in simplified.graph.output:
        shape = [d.dim_value for d in out.type.tensor_type.shape.dim]
        print(f"  Output {out.name}: {shape}")
    
    print(f"  Saved: {output_path} ({os.path.getsize(output_path):,} bytes)")
    return True


def step2_convert(simplified_path, output_dir, size):
    """Convert simplified ONNX to TFLite using onnx2tf CLI."""
    print(f"\n[Step 2/3] Converting ONNX → TFLite (FP32) via onnx2tf...")
    
    if shutil.which("onnx2tf") is None:
        print("  ⚠️  onnx2tf not found in PATH.")
        print("  Install: pip install onnx2tf tensorflow")
        print(f"  Then run manually:")
        print(f"    onnx2tf -i {simplified_path} -o {output_dir} -osd -ois input:1,3,{size},{size}")
        return False

    cmd = [
        "onnx2tf",
        "-i", simplified_path,
        "-o", output_dir,
        "-osd",
        "-ois", f"input:1,3,{size},{size}",
        "--non_verbose",
    ]
    
    print(f"  Running: {' '.join(cmd)}")
    result = subprocess.run(cmd, capture_output=True, text=True, timeout=300)
    
    if result.returncode != 0:
        print(f"  ❌ onnx2tf failed:")
        print(f"  STDERR: {result.stderr[:500]}")
        return False
    
    print("  ✅ onnx2tf conversion complete.")
    return True


def step3_locate(output_dir, final_path):
    """Find generated .tflite and move to final location."""
    print(f"\n[Step 3/3] Locating TFLite model...")
    
    for root, dirs, files in os.walk(output_dir):
        for f in files:
            if f.endswith(".tflite"):
                src = os.path.join(root, f)
                shutil.copy2(src, final_path)
                size = os.path.getsize(final_path)
                print(f"  ✅ Saved: {final_path} ({size:,} bytes / {size/1024:.1f} KB)")
                return True
    
    print(f"  ❌ No .tflite found in {output_dir}")
    return False


def main():
    args = parse_args()
    size = args.input_size

    base = os.path.join("assets", "models")
    onnx_path = os.path.join(base, "face_detection_yunet_2023mar.onnx")
    sim_path = os.path.join(base, f"face_detection_yunet_{size}x{size}_sim.onnx")
    tflite_dir = os.path.join(base, "tflite_output")
    final_path = os.path.join(base, "face_detection_yunet_fp32.tflite")

    if not os.path.exists(onnx_path):
        print(f"ERROR: Model not found: {onnx_path}")
        sys.exit(1)

    print("=" * 60)
    print(f"YUNET ONNX → FP32 TFLITE CONVERSION ({size}×{size})")
    print("=" * 60)

    step1_simplify(onnx_path, sim_path, size)
    
    if step2_convert(sim_path, tflite_dir, size):
        step3_locate(tflite_dir, final_path)
        
        # Generate checksum
        import hashlib
        with open(final_path, "rb") as f:
            md5 = hashlib.md5(f.read()).hexdigest()
            print(f"\n  MD5 Checksum: {md5}")
    else:
        print("\n  ℹ️  Simplified ONNX saved. Run onnx2tf manually when TF is available.")

    print("\n" + "=" * 60)
    print("CONVERSION SCRIPT COMPLETE")
    print("=" * 60)


if __name__ == "__main__":
    main()
