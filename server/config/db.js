import mongoose from 'mongoose';

export async function connectDB(url) {
  try {
    await mongoose.connect(url);
    console.log('Connected to MongoDB');
  } catch (err) {
    console.error('MongoDB connection error:', err.message);
    throw err;
  }
}

export default mongoose;
