import { AlignedFace } from './PreprocessingTypes';

export class ClaheService {
  /**
   * Applies a simplified Histogram Equalization on the Y (Luma) channel.
   * This mitigates backlit faces and helmet shadows.
   * Modifies the buffer in-place to avoid GC churn.
   * 
   * @param face The 112x112 aligned face float32 buffer
   */
  static enhanceContrast(face: AlignedFace): void {
    'worklet';
    
    const buffer = face.buffer;
    const pixelCount = face.width * face.height;
    
    // We assume input buffer has pixels in [0, 255] range as extracted from resize plugin
    // If it's [0, 1], we adjust the logic. The resize plugin standard float32 is [0, 255] for rgb.
    
    const histogram = new Int32Array(256);
    const lumaBuffer = new Float32Array(pixelCount);
    
    // 1. Convert to YUV (Extract Luma) and build Histogram
    let idx = 0;
    for (let i = 0; i < pixelCount; i++) {
      const r = buffer[idx];
      const g = buffer[idx + 1];
      const b = buffer[idx + 2];
      
      // Luma (Y) calculation
      const y = 0.299 * r + 0.587 * g + 0.114 * b;
      lumaBuffer[i] = y;
      
      let yInt = Math.floor(y);
      if (yInt < 0) yInt = 0;
      if (yInt > 255) yInt = 255;
      
      histogram[yInt]++;
      idx += 3;
    }
    
    // 2. Calculate Cumulative Distribution Function (CDF)
    const cdf = new Float32Array(256);
    let cumulative = 0;
    
    // Find first non-zero histogram bin
    let minCdf = 0;
    for (let i = 0; i < 256; i++) {
      if (histogram[i] > 0) {
        minCdf = histogram[i];
        break;
      }
    }

    for (let i = 0; i < 256; i++) {
      cumulative += histogram[i];
      // Normalize CDF to [0, 1]
      cdf[i] = (cumulative - minCdf) / (pixelCount - minCdf);
      if (cdf[i] < 0) cdf[i] = 0;
      if (cdf[i] > 1) cdf[i] = 1;
    }
    
    // 3. Map back to RGB
    idx = 0;
    for (let i = 0; i < pixelCount; i++) {
      const y = lumaBuffer[i];
      let yInt = Math.floor(y);
      if (yInt < 0) yInt = 0;
      if (yInt > 255) yInt = 255;
      
      // Get equalized Luma [0, 255]
      const yEq = cdf[yInt] * 255.0;
      
      // Scale RGB values by the ratio of (new Y) / (old Y)
      const scale = y > 0.1 ? yEq / y : 1.0;
      
      buffer[idx] = Math.min(255, buffer[idx] * scale);
      buffer[idx + 1] = Math.min(255, buffer[idx + 1] * scale);
      buffer[idx + 2] = Math.min(255, buffer[idx + 2] * scale);
      
      idx += 3;
    }
  }
}
