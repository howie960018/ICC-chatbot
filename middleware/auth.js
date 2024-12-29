const authService = require('../services/authService');

function authMiddleware(req, res, next) {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ message: '請先登入' });
    }
    const decoded = authService.verifyToken(token);
    req.user = decoded;
    next();
  } catch (error) {
    console.error('Token 驗證失敗:', error.message); // 添加詳細日誌
    res.status(401).json({ message: '認證失敗，請重新登入' });
  }
}



module.exports = authMiddleware;