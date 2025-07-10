import mongoose from 'mongoose';
import pino from 'pino';

const logger = pino();

export const initMongoConnection = async () => {
  try {
    const connectionString = `mongodb+srv://${process.env.MONGODB_USER}:${process.env.MONGODB_PASSWORD}@${process.env.MONGODB_URL}/${process.env.MONGODB_DB}?retryWrites=true&w=majority`;

    await mongoose.connect(connectionString, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });

    logger.info('Database connection successful');
  } catch (err) {
    logger.error('Database connection error:', err);
    process.exit(1);
  }
};
