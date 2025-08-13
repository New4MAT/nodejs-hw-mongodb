import { v2 as cloudinary } from 'cloudinary';
import pino from 'pino';

const logger = pino();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

export const uploadImage = async (filePath) => {
  try {
    const result = await cloudinary.uploader.upload(filePath, {
      folder: 'contacts',
      use_filename: true,
      unique_filename: false,
      overwrite: true,
    });
    return result.secure_url;
  } catch (error) {
    logger.error('Cloudinary upload error:', error);
    throw new Error('Failed to upload image to Cloudinary');
  }
};

export const deleteImage = async (publicId) => {
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (error) {
    logger.error('Cloudinary delete error:', error);
    throw new Error('Failed to delete image from Cloudinary');
  }
};
