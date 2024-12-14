// app.js

const os = require('os');
console.log('CPU 信息:', os.cpus());
console.log('總內存:', (os.totalmem() / 1024 / 1024 / 1024).toFixed(2), 'GB');
console.log('可用內存:', (os.freemem() / 1024 / 1024 / 1024).toFixed(2), 'GB');
console.log('伺服器運行時間:', (os.uptime() / 3600).toFixed(2), '小時');
console.log('主機名稱:', os.hostname());
console.log('平台:', os.platform());

const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const config = require('./config/config');
const { recordingsDir } = require('./config/multerConfig');
const { cleanupOldRecordings } = require('./utils/fileUtils');
const audioRoutes = require('./routes/audioRoutes.js');
const dialogueRoutes = require('./routes/dialogueRoutes');
const pageRoutes = require('./routes/pageRoutes');
const { connectDB } = require('./services/dbService');
const app = express();

const authMiddleware = require('./middleware/auth');
const authRoutes = require('./routes/authRoutes');

// Middleware
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/recordings', express.static(recordingsDir));


// 認證路由 (不需要驗證)
app.use('/api/auth', authRoutes);

// Routes
app.use('/', pageRoutes);
app.use('/api/audio', authMiddleware, audioRoutes);
app.use('/api/dialogue', authMiddleware, dialogueRoutes);

// Cleanup old recordings periodically
setInterval(() => {
  cleanupOldRecordings(recordingsDir, config.recordingsConfig.maxAge);
}, config.recordingsConfig.cleanupInterval);

const practiceRoutes = require('./routes/practiceRoutes');
app.use('/api/practice', authMiddleware, practiceRoutes);


// 基本錯誤處理
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    success: false, 
    message: '伺服器錯誤',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// 啟動服務器
async function startServer() {
  try {
    // 連接資料庫
    const dbConnected = await connectDB();
    if (!dbConnected) {
      throw new Error('資料庫連接失敗');
    }

    // 啟動服務器
    app.listen(config.port, () => {
      console.log(`Server running on port ${config.port}`);
    });
  } catch (error) {
    console.error('Server startup failed:', error);
    process.exit(1);
  }
}

startServer();

module.exports = app;