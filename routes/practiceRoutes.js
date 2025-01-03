const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const mongoose = require('mongoose');
const User = require('../models/User'); // 確保引入 User 模型
const { 
  createPractice, 
  updatePractice, 
  getPractices, 
  getPracticeDetails, 
  deletePractice 
} = require('../services/practiceService');

// 獲取所有練習
router.get('/practices', async (req, res) => {
  try {
    const userId = req.user.id;
    
    const practices = await getPractices(userId);
    res.json({ success: true, practices });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 創建新練習
router.post('/practices', async (req, res) => {
  try {
    const userId = req.user.id;
    const practice = await createPractice(userId, req.body);

    if (!practice || !practice._id) {
      throw new Error('練習創建失敗：無法生成練習ID');
    }

    res.status(201).json({ success: true, practice,message: '練習創建成功' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 獲取單一練習
router.get('/practices/:id', async (req, res) => {
  try {
    const userId = req.user.id;
    const practiceId = req.params.id;
    const practice = await getPracticeDetails(userId, practiceId);
    res.json({ success: true, practice });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

const { validatePracticeUpdate } = require('../middleware/validatePractice');
// 更新練習
router.patch('/practices/:id', validatePracticeUpdate, async (req, res) => {
  try {
    const practiceId = req.params.id;
    
    // 驗證 practiceId 格式
    if (!mongoose.Types.ObjectId.isValid(practiceId)) {
      return res.status(400).json({
        success: false,
        message: '無效的練習 ID 格式'
      });
    }

    // 驗證更新資料的格式
    const updates = req.body;
    console.log('Received update data:', updates); // 調試用

    // 驗證更新資料的結構
    if (updates.history) {
      if (!Array.isArray(updates.history)) {
        return res.status(400).json({
          success: false,
          message: 'history 必須是陣列格式'
        });
      }

      // 驗證每個歷史記錄的格式
      for (const entry of updates.history) {
        if (!entry.role || !entry.content) {
          return res.status(400).json({
            success: false,
            message: '對話歷史記錄格式不正確'
          });
        }
        if (!['導師', '家長'].includes(entry.role)) {
          return res.status(400).json({
            success: false,
            message: '無效的角色類型'
          });
        }
      }
    }

    // 進行更新
    const updatedPractice = await updatePractice(practiceId, updates);

    // 回傳更新結果
    res.json({
      success: true,
      practice: updatedPractice,
      message: '練習更新成功'
    });

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 刪除練習
router.delete('/practices/:id', async (req, res) => {
  try {
    const userId = req.user.id;
    const practiceId = req.params.id;
    await deletePractice(userId, practiceId);
    res.json({ success: true, message: '練習已刪除' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/:practiceId/feedback', authMiddleware, async (req, res) => {
  try {
    const { practiceId } = req.params;
    const { comment } = req.body;

    if (!comment) {
      return res.status(400).json({ success: false, message: '回饋內容為必填' });
    }

    const user = await User.findOne({ 'practices._id': practiceId });
    if (!user) {
      return res.status(404).json({ success: false, message: '找不到該練習記錄' });
    }

    const practice = user.practices.id(practiceId);
    if (!practice) {
      return res.status(404).json({ success: false, message: '練習不存在' });
    }

    practice.feedback.push({
      userId: req.user.id,
      comment,
      createdAt: new Date()
    });

    await user.save();
    res.json({ success: true, message: '心得提交成功' });
  } catch (error) {
    console.error('提交心得失敗:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// 獲取指定練習的所有心得
router.get('/:practiceId/feedback', authMiddleware, async (req, res) => {
  try {
    const { practiceId } = req.params;

    // 確認練習 ID 格式是否有效
    if (!mongoose.Types.ObjectId.isValid(practiceId)) {
      return res.status(400).json({ success: false, message: '無效的練習 ID' });
    }

    // 查詢包含該練習的使用者
    const user = await User.findOne({ 'practices._id': practiceId }).select('practices');
    if (!user) {
      return res.status(404).json({ success: false, message: '找不到該練習記錄' });
    }

    // 從練習中提取心得記錄
    const practice = user.practices.id(practiceId);
    if (!practice) {
      return res.status(404).json({ success: false, message: '練習不存在' });
    }

    const feedback = practice.feedback || [];
    res.json({ success: true, feedback });
  } catch (error) {
    console.error('獲取心得失敗:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
