#!/usr/bin/env python3
"""
MobileFaceNet Validation Script
Usage: python3 validate_mobilefacenet.py --model path/to/mobilefacenet.tflite
"""

import argparse
import numpy as np
import cv2
import sys

try:
    import tensorflow as tf
except ImportError:
    print("TensorFlow not installed. Run: pip install tensorflow")
    sys.exit(1)

def load_tflite_model(model_path):
    interpreter = tf.lite.Interpreter(model_path=model_path)
    interpreter.allocate_tensors()
    input_details = interpreter.get_input_details()
    output_details = interpreter.get_output_details()
    return interpreter, input_details, output_details

def preprocess_image(image_path, input_shape):
    # Expects input_shape like (1, 112, 112, 3)
    target_size = (input_shape[1], input_shape[2])
    
    if image_path == "DUMMY_FACE_A":
        # Create a dummy green face
        img = np.full((112, 112, 3), (0, 255, 0), dtype=np.uint8)
    elif image_path == "DUMMY_FACE_B":
        # Create a dummy blue face
        img = np.full((112, 112, 3), (255, 0, 0), dtype=np.uint8)
    else:
        img = cv2.imread(image_path)
        if img is None:
            raise ValueError(f"Could not read image: {image_path}")
        img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
        img = cv2.resize(img, target_size)

    # Normalize to [-1, 1] as expected by MobileFaceNet
    img_float = (img.astype(np.float32) - 127.5) / 128.0
    return np.expand_dims(img_float, axis=0)

def extract_embedding(interpreter, input_details, output_details, input_tensor):
    interpreter.set_tensor(input_details[0]['index'], input_tensor)
    interpreter.invoke()
    embedding = interpreter.get_tensor(output_details[0]['index'])[0]
    
    # L2 Normalize the embedding
    norm = np.linalg.norm(embedding)
    if norm == 0:
        return embedding
    return embedding / norm

def cosine_similarity(emb1, emb2):
    return np.dot(emb1, emb2)

def main():
    parser = argparse.ArgumentParser(description="Validate MobileFaceNet TFLite Model")
    parser.add_argument("--model", type=str, required=True, help="Path to mobilefacenet.tflite")
    parser.add_argument("--img1", type=str, default="DUMMY_FACE_A", help="Path to image 1")
    parser.add_argument("--img2", type=str, default="DUMMY_FACE_A", help="Path to image 2 (same face)")
    parser.add_argument("--img3", type=str, default="DUMMY_FACE_B", help="Path to image 3 (different face)")
    
    args = parser.parse_args()

    print(f"Loading model: {args.model}")
    interpreter, input_details, output_details = load_tflite_model(args.model)
    
    in_shape = input_details[0]['shape']
    out_shape = output_details[0]['shape']
    
    print("\n--- MODEL SIGNATURE ---")
    print(f"Input Shape: {in_shape} (Type: {input_details[0]['dtype']})")
    print(f"Output Shape: {out_shape} (Type: {output_details[0]['dtype']})")
    
    print("\n--- VALIDATION RUN ---")
    tensor1 = preprocess_image(args.img1, in_shape)
    tensor2 = preprocess_image(args.img2, in_shape)
    tensor3 = preprocess_image(args.img3, in_shape)
    
    emb1 = extract_embedding(interpreter, input_details, output_details, tensor1)
    emb2 = extract_embedding(interpreter, input_details, output_details, tensor2)
    emb3 = extract_embedding(interpreter, input_details, output_details, tensor3)
    
    sim_same = cosine_similarity(emb1, emb2)
    sim_diff = cosine_similarity(emb1, emb3)
    
    print(f"Similarity (Same Image): {sim_same:.4f} (Expected: ~1.0000)")
    print(f"Similarity (Diff Image): {sim_diff:.4f} (Expected: <0.5000)")
    
    if sim_same > 0.95 and sim_diff < sim_same:
        print("\nRESULT: PASS - Model extracts discriminative embeddings correctly.")
    else:
        print("\nRESULT: FAIL - Embeddings are not discriminative.")

if __name__ == "__main__":
    main()
