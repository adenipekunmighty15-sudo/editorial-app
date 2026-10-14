const mongoose = require('mongoose');
require('dotenv').config();

mongoose.set('bufferTimeoutMS', 5000);

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 8000,
    });
    console.log('MongoDB connected');
  } catch (error) {
    console.error('MongoDB connection failed:', error.message);
    console.error(
      'The server will keep serving the site; API routes return errors until the database is reachable.'
    );
  }
};

module.exports = connectDB;
