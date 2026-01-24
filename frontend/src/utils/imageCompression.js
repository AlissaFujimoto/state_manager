/**
 * Image Compression Utility
 * Handles image resizing, compression, and decompression for property and profile images
 */

import pako from 'pako';

// Standard resolutions for real estate agents
// We use lower resolutions in DEV mode to speed up storage/transport
const isDev = import.meta.env.DEV;

const RESOLUTIONS = {
    property: isDev
        ? { width: 800, height: 600 }   // Lower resolution for faster dev testing
        : { width: 1920, height: 1080 }, // Full HD for production
    profile: isDev
        ? { width: 128, height: 128 }    // Small avatar for faster dev profile updates
        : { width: 512, height: 512 }      // Standard square for profile photos
};

/**
 * Resize image to fit within target dimensions while maintaining aspect ratio
 * @param {File} file - Image file to resize
 * @param {Object} targetSize - {width, height} max dimensions
 * @returns {Promise<Blob>} Resized image blob
 */
const resizeImage = (file, targetSize) => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        img.onload = () => {
            // Calculate dimensions to fit within target while maintaining aspect ratio
            let { width, height } = img;
            const aspectRatio = width / height;

            // Scale down if image is larger than target
            if (width > targetSize.width || height > targetSize.height) {
                if (width / targetSize.width > height / targetSize.height) {
                    // Width is the limiting factor
                    width = targetSize.width;
                    height = width / aspectRatio;
                } else {
                    // Height is the limiting factor
                    height = targetSize.height;
                    width = height * aspectRatio;
                }
            }

            canvas.width = width;
            canvas.height = height;

            // Draw resized image
            ctx.drawImage(img, 0, 0, width, height);

            // Convert to blob
            const quality = isDev ? 0.6 : 0.85;
            canvas.toBlob((blob) => {
                if (blob) {
                    resolve(blob);
                } else {
                    reject(new Error('Failed to create blob from canvas'));
                }
            }, 'image/jpeg', quality);
        };

        img.onerror = () => reject(new Error('Failed to load image'));
        img.src = URL.createObjectURL(file);
    });
};

/**
 * Compress image data using gzip
 * @param {Blob} blob - Image blob to compress
 * @returns {Promise<string>} Base64 encoded compressed data
 */
const compressImage = async (blob) => {
    // Convert blob to ArrayBuffer
    const arrayBuffer = await blob.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);

    // Compress using pako (gzip)
    const compressed = pako.gzip(uint8Array);

    // Convert to base64 for storage (chunk to avoid stack overflow)
    let binary = '';
    const chunkSize = 8192;
    for (let i = 0; i < compressed.length; i += chunkSize) {
        const chunk = compressed.subarray(i, Math.min(i + chunkSize, compressed.length));
        binary += String.fromCharCode.apply(null, chunk);
    }
    const base64 = btoa(binary);
    return base64;
};

/**
 * Decompress image data
 * @param {string} base64Data - Base64 encoded compressed data
 * @returns {string} Data URL for image display
 */
export const decompressImage = (base64Data) => {
    try {
        // Decode base64
        const binaryString = atob(base64Data);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }

        // Decompress using pako
        const decompressed = pako.ungzip(bytes);

        // Convert to base64 for data URL (chunk to avoid stack overflow)
        let binary = '';
        const chunkSize = 8192;
        for (let i = 0; i < decompressed.length; i += chunkSize) {
            const chunk = decompressed.subarray(i, Math.min(i + chunkSize, decompressed.length));
            binary += String.fromCharCode.apply(null, chunk);
        }
        const decompressedBase64 = btoa(binary);
        return `data:image/jpeg;base64,${decompressedBase64}`;
    } catch (error) {
        console.error('Failed to decompress image:', error);
        return null;
    }
};

/**
 * Process property image: resize and compress
 * @param {File} file - Image file to process
 * @returns {Promise<string>} Base64 encoded compressed image
 */
export const processPropertyImage = async (file) => {
    try {
        const resized = await resizeImage(file, RESOLUTIONS.property);
        const compressed = await compressImage(resized);
        return compressed;
    } catch (error) {
        console.error('Failed to process property image:', error);
        throw error;
    }
};

/**
 * Process profile photo: resize to square and compress
 * @param {File} file - Image file to process
 * @returns {Promise<string>} Base64 encoded compressed image
 */
export const processProfilePhoto = async (file) => {
    try {
        const resized = await resizeImage(file, RESOLUTIONS.profile);
        const compressed = await compressImage(resized);
        return compressed;
    } catch (error) {
        console.error('Failed to process profile photo:', error);
        throw error;
    }
};

/**
 * Check if a URL is a compressed image (base64 string without data URL prefix)
 * @param {string} url - URL or base64 string to check
 * @returns {boolean} True if it's compressed data
 */
export const isCompressedImage = (url) => {
    if (!url || typeof url !== 'string') return false;
    // Profile references need to be fetched from API, not decompressed
    if (url.startsWith('profile:')) return false;
    // Compressed images are base64 strings without the data:image prefix
    // and without http/https protocol
    return !url.startsWith('http') && !url.startsWith('data:') && !url.startsWith('blob:');
};

/**
 * Get display URL for an image (decompress if needed)
 * @param {string} url - Image URL or compressed data
 * @returns {string} Display URL
 */
export const getImageDisplayUrl = (url) => {
    if (isCompressedImage(url)) {
        return decompressImage(url);
    }
    return url;
};
