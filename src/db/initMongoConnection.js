import mongoose from 'mongoose';
import pino from 'pino';

const logger = pino();

let isConnected = false;

export const initMongoConnection = async () => {
  if (isConnected) return;

  try {
    await mongoose.connect(
      `mongodb+srv://${process.env.MONGODB_USER}:${process.env.MONGODB_PASSWORD}@${process.env.MONGODB_URL}/${process.env.MONGODB_DB}`,
      {
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
      },
    );
    isConnected = true;
    logger.info('MongoDB successfully connected');
  } catch (error) {
    logger.error('MongoDB connection failed:', error.message);
    throw error;
  }
};
