import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

// Отримання абсолютних шляхів
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Завантаження змінних оточення
import dotenv from 'dotenv';
dotenv.config({ path: path.join(__dirname, '../../.env') });

// Конфігурація Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

export const uploadImage = async (filePath) => {
  try {
    console.log('☁️ Starting Cloudinary upload for file:', filePath);

    // Перевірка файлу
    const stats = await fs.stat(filePath);
    console.log('📁 File stats:', {
      size: stats.size,
      isFile: stats.isFile(),
      modified: stats.mtime,
    });

    if (!stats.isFile()) throw new Error('Path is not a file');
    if (stats.size === 0) throw new Error('File is empty');
    if (stats.size > 10 * 1024 * 1024)
      throw new Error('File exceeds 10MB limit');

    // Налаштування завантаження
    const uploadOptions = {
      folder: 'contacts',
      use_filename: true,
      unique_filename: false,
      overwrite: true,
      timeout: 30000,
    };

    console.log('🔄 Uploading to Cloudinary with options:', uploadOptions);

    // Завантаження файлу
    const result = await cloudinary.uploader.upload(filePath, uploadOptions);

    console.log('✅ Cloudinary upload successful:', {
      public_id: result.public_id,
      url: result.secure_url,
      format: result.format,
      size: result.bytes,
    });

    // Очищення тимчасового файлу
    try {
      await fs.unlink(filePath);
      console.log('✅ Temporary file deleted:', filePath);
    } catch (unlinkError) {
      console.warn('⚠️ Failed to delete temporary file:', unlinkError.message);
    }

    return result.secure_url;
  } catch (error) {
    console.error('❌ Cloudinary upload failed:', error.message);
    console.error('Error details:', error);

    // Спроба очистити файл при помилці
    if (filePath) {
      try {
        await fs.unlink(filePath);
        console.log('✅ Temporary file cleaned up after error');
      } catch (unlinkError) {
        console.warn('⚠️ Cleanup failed:', unlinkError.message);
      }
    }

    throw new Error(`Upload failed: ${error.message}`);
  }
};

// Перевірка підключення при старті
(async () => {
  try {
    console.log('🔍 Checking Cloudinary connection...');
    const result = await cloudinary.api.ping();
    console.log('✅ Cloudinary connection verified:', result);
  } catch (error) {
    console.error('❌ Cloudinary connection check failed:', error.message);
  }
})();
