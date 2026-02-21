/// <reference types="vite/client" />
/**
 * Cloudinary configuration for unsigned video uploads
 * Set these env vars in .env.local (Vite uses VITE_ prefix)
 */
export const CLOUDINARY_CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME ?? '';
export const CLOUDINARY_UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET ?? '';