import mongoose from 'mongoose';

export const initMongoConnection = async () => {
  try {
    const connectionString = `mongodb+srv://${process.env.MONGODB_USER}:${process.env.MONGODB_PASSWORD}@${process.env.MONGODB_URL}/${process.env.MONGODB_DB}?retryWrites=true&w=majority`;
    await mongoose.connect(connectionString);
    console.log('Mongo connection successfully established!');
  } catch (err) {
    console.error('Mongo connection error:', err.message);
    process.exit(1);
  }
};