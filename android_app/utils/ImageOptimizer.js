/**
 * Image Optimization Utility
 * Handles image compression, resizing, and optimization for uploads
 */

import * as ImageManipulator from 'expo-image-manipulator';
import { Platform } from 'react-native';

// Default optimization settings
const DEFAULT_OPTIONS = {
  maxWidth: 1536,
  maxHeight: 1536,
  quality: 0.8,
  format: ImageManipulator.SaveFormat.JPEG,
};

/**
 * Calculate resize dimensions maintaining aspect ratio
 */
const calculateResize = (width, height, maxWidth, maxHeight) => {
  if (width <= maxWidth && height <= maxHeight) {
    return null; // No resize needed
  }

  const ratio = Math.min(maxWidth / width, maxHeight / height);
  return {
    width: Math.round(width * ratio),
    height: Math.round(height * ratio),
  };
};

/**
 * Get image dimensions from URI
 */
const getImageDimensions = async (uri) => {
  try {
    if (Platform.OS === 'web') {
      return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => resolve({ width: img.width, height: img.height });
        img.onerror = () => resolve({ width: 0, height: 0 });
        img.src = uri;
      });
    } else {
      // For React Native, we get dimensions from picker
      return { width: 0, height: 0 };
    }
  } catch (error) {
    console.error('Failed to get image dimensions:', error);
    return { width: 0, height: 0 };
  }
};

/**
 * Optimize image for upload
 * Resizes, compresses, and converts format as needed
 * 
 * @param {string} uri - Image URI
 * @param {object} options - Optimization options
 * @param {object} metadata - Optional metadata (width, height from picker)
 * @returns {Promise<object>} Optimized image { uri, width, height, size }
 */
export const optimizeImage = async (uri, options = {}, metadata = {}) => {
  const config = { ...DEFAULT_OPTIONS, ...options };

  try {
    console.log('🖼️  Optimizing image:', uri.substring(0, 50));

    // Get image dimensions
    let { width, height } = metadata;
    if (!width || !height) {
      const dims = await getImageDimensions(uri);
      width = dims.width;
      height = dims.height;
    }

    // Calculate resize dimensions if needed
    const resize = calculateResize(width, height, config.maxWidth, config.maxHeight);

    // Build manipulation actions
    const actions = [];
    if (resize) {
      actions.push({ resize });
      console.log(`  📐 Resizing from ${width}x${height} to ${resize.width}x${resize.height}`);
    }

    // Perform optimization
    const result = await ImageManipulator.manipulateAsync(
      uri,
      actions,
      {
        compress: config.quality,
        format: config.format,
      }
    );

    console.log(`  ✅ Optimized: ${result.width}x${result.height}`);

    return {
      uri: result.uri,
      width: result.width,
      height: result.height,
      size: result.size || 0,
    };
  } catch (error) {
    console.error('❌ Image optimization failed:', error);
    // Return original if optimization fails
    return {
      uri,
      width: metadata.width || 0,
      height: metadata.height || 0,
      size: 0,
    };
  }
};

/**
 * Optimize multiple images in batch
 * Processes images concurrently with rate limiting
 * 
 * @param {Array} images - Array of { uri, width, height }
 * @param {object} options - Optimization options
 * @param {number} concurrency - Max concurrent operations
 * @returns {Promise<Array>} Array of optimized images
 */
export const optimizeImageBatch = async (images, options = {}, concurrency = 3) => {
  const results = [];
  
  for (let i = 0; i < images.length; i += concurrency) {
    const batch = images.slice(i, i + concurrency);
    const batchResults = await Promise.all(
      batch.map(img => optimizeImage(img.uri, options, img))
    );
    results.push(...batchResults);
  }

  return results;
};

/**
 * Get recommended quality based on image size
 * Larger images get more compression to reduce upload time
 */
export const getRecommendedQuality = (width, height) => {
  const pixels = width * height;
  
  if (pixels > 4000000) return 0.6; // > 4MP
  if (pixels > 2000000) return 0.7; // > 2MP
  if (pixels > 1000000) return 0.8; // > 1MP
  return 0.85; // < 1MP
};

/**
 * Validate image before optimization
 */
export const validateImage = (uri, maxSizeMB = 10) => {
  if (!uri) {
    return { valid: false, error: 'No image URI provided' };
  }

  // Check URI format
  if (!uri.startsWith('file://') && 
      !uri.startsWith('content://') && 
      !uri.startsWith('blob:') &&
      !uri.startsWith('http://') &&
      !uri.startsWith('https://')) {
    return { valid: false, error: 'Invalid image URI format' };
  }

  return { valid: true, error: null };
};

/**
 * Estimate final file size after compression
 * Rough estimation based on dimensions and quality
 */
export const estimateCompressedSize = (width, height, quality) => {
  // Rough estimation: 0.25 bytes per pixel at quality 1.0
  const baseSize = width * height * 0.25;
  return Math.round(baseSize * quality);
};

/**
 * Optimize image with progress callback
 */
export const optimizeImageWithProgress = async (uri, options = {}, onProgress = null) => {
  try {
    if (onProgress) onProgress({ stage: 'loading', progress: 0 });

    const validation = validateImage(uri);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    if (onProgress) onProgress({ stage: 'validating', progress: 20 });

    const result = await optimizeImage(uri, options);

    if (onProgress) onProgress({ stage: 'complete', progress: 100 });

    return result;
  } catch (error) {
    if (onProgress) onProgress({ stage: 'error', progress: 0, error });
    throw error;
  }
};

export default {
  optimizeImage,
  optimizeImageBatch,
  getRecommendedQuality,
  validateImage,
  estimateCompressedSize,
  optimizeImageWithProgress,
};
