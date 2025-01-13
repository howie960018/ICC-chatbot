const os = require('os');
const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const config = require('./config/config');
const dialogueRoutes = require('./routes/dialogueRoutes');
const pageRoutes = require('./routes/pageRoutes');
const { connectDB } = require('./services/dbService');
const authMiddleware = require('./middleware/auth');
const authRoutes = require('./routes/authRoutes');
const audioRoutes = require('./routes/audioRoutes');
const AWS = require('aws-sdk');

const app = express();

// 驗證必要的環境變數
const requiredEnvVars = [
  'AWS_ACCESS_KEY_ID',
  'AWS_SECRET_ACCESS_KEY',
  'AWS_REGION',
  'S3_BUCKET_NAME'
];

requiredEnvVars.forEach(varName => {
  if (!process.env[varName]) {
    throw new Error(`環境變數 ${varName} 未設定`);
  }
});

// AWS S3 配置
const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
  params: {
    Bucket: process.env.S3_BUCKET_NAME
  }
});

// 基本中間件
app.use(bodyParser.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// CORS 設定 (如果需要)
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (req.method === 'OPTIONS') {
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH');
    return res.status(200).json({});
  }
  next();
});

// 安全性中間件
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
});

// 路由
app.use('/api/auth', authRoutes);
app.use('/', pageRoutes);
app.use('/api/audio', authMiddleware, (req, res, next) => {
  req.s3 = s3; // 將 s3 實例注入請求對象
  audioRoutes(req, res, next);
});
app.use('/api/dialogue', authMiddleware, dialogueRoutes);

// 練習相關路由
const practiceRoutes = require('./routes/practiceRoutes');
app.use('/api/practice', authMiddleware, practiceRoutes);

// 添加 favicon 處理
app.get('/favicon.ico', (req, res) => res.status(204));

// 404 處理
app.use((req, res, next) => {
  console.log('未找到路徑:', req.path); // 添加日誌來查看具體是哪個路徑找不到
  res.status(404).json({
      success: false,
      message: '找不到請求的資源',
      path: req.path
  });
});

// 錯誤處理中間件
app.use((err, req, res, next) => {
  console.error('錯誤:', {
      path: req.path,
      method: req.method,
      error: err.message
  });
  
  const status = err.status || 500;
  const response = {
      success: false,
      message: err.message || '伺服器錯誤',
  };

  if (process.env.NODE_ENV === 'development') {
      response.error = err.stack;
  }

  res.status(status).json(response);
});

// 伺服器啟動函數
async function startServer() {
  try {
    // 連接資料庫
    const dbConnected = await connectDB();
    if (!dbConnected) {
      throw new Error('資料庫連接失敗');
    }

    const port = config.port || 3000;
    //const port = 80;
    app.listen(port, () => {
      console.log(`伺服器運行在 port ${port}`);
      console.log('環境:', process.env.NODE_ENV || 'development');
    });

  } catch (error) {
    console.error('伺服器啟動失敗:', error);
    process.exit(1);
  }
}

// 優雅關閉
process.on('SIGTERM', () => {
  console.log('收到 SIGTERM 信號，準備關閉伺服器...');
  server.close(() => {
    console.log('伺服器已關閉');
    process.exit(0);
  });
});

startServer();

module.exports = app;