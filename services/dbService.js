const mongoose = require('mongoose');
const config = require('../config/config');

async function connectDB() {
  try {
    await mongoose.connect(config.mongodb.uri);
    console.log('MongoDB connected successfully');
    
    // 監聽連接事件
    mongoose.connection.on('error', err => {
      console.error('MongoDB connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      console.log('MongoDB disconnected');
    });

    return true;
  } catch (error) {
    console.error('MongoDB connection failed:', error);
    return false;
  }
}

module.exports = { connectDB };