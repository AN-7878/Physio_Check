/// <reference types="vite/client" />
/**
 * Force Vite Environment Configuration for Cloudinary
 */
export const cloudinaryConfig = {
  cloudName: import.meta.env.VITE_CLOUDINARY_CLOUD_NAME,
  uploadPreset: import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET
};

console.log("Config loaded:", !!cloudinaryConfig.cloudName);
console.log("Upload Preset loaded:", !!cloudinaryConfig.uploadPreset);

// Keep these for backward compatibility if needed elsewhere
export const CLOUDINARY_CLOUD_NAME = cloudinaryConfig.cloudName;
export const CLOUDINARY_UPLOAD_PRESET = cloudinaryConfig.uploadPreset;
