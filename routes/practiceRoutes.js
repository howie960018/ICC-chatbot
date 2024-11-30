// 查詢單一練習詳細資訊
const express = require('express');
const router = express.Router();
const User = require('../models/User'); 

// 1. 讀取所有練習紀錄
router.get('/practices', async (req, res) => {
  try {
    const userId = req.user.id; // 確保使用者經過認證 (需 authMiddleware)
    const user = await User.findById(userId).select('practices');
    if (!user) {
      return res.status(404).json({ success: false, message: '使用者不存在' });
    }
    res.json({ success: true, practices: user.practices });
  } catch (error) {
    console.error('Error fetching practices:', error);
    res.status(500).json({ success: false, message: '伺服器錯誤' });
  }
});

// 2. 創建新的練習紀錄
router.post('/practices', async (req, res) => {
  try {
    const userId = req.user.id; // 確保使用者經過認證 (需 authMiddleware)
    const { technique } = req.body; // 前端傳來的溝通技巧名稱

    if (!technique) {
      return res.status(400).json({ success: false, message: '溝通技巧為必填' });
    }

    const newPractice = {
      createdAt: new Date(),
      technique,
      history: [],
      recordings: [],
      analysis: ''
    };

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: '使用者不存在' });
    }

    user.practices.push(newPractice);
    await user.save();

    res.status(201).json({ success: true, practice: newPractice });
  } catch (error) {
    console.error('Error creating practice:', error);
    res.status(500).json({ success: false, message: '伺服器錯誤' });
  }
});

//讀取單一練習紀錄
router.get('/practices/:id', async (req, res) => {
    try {
        const userId = req.user.id; // 確保使用者已認證
        const practiceId = req.params.id;

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: '使用者不存在' });
        }

        const practice = user.practices.id(practiceId);
        if (!practice) {
            return res.status(404).json({ success: false, message: '練習不存在' });
        }

        res.json({ success: true, practice });
    } catch (error) {
        console.error('Error fetching practice details:', error);
        res.status(500).json({ success: false, message: '伺服器錯誤' });
    }
});

// 刪除練習
router.delete('/practices/:id', async (req, res) => {
    try {
        const userId = req.user.id; // 確保使用者已驗證
        const practiceId = req.params.id; // 獲取練習 ID

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: '使用者不存在' });
        }

        // 遍歷 practices 陣列，移除指定的練習
        const practiceIndex = user.practices.findIndex(p => p._id.toString() === practiceId);
        if (practiceIndex === -1) {
            return res.status(404).json({ success: false, message: '練習不存在' });
        }

        user.practices.splice(practiceIndex, 1); // 從 practices 陣列中移除該練習
        await user.save(); // 保存變更到資料庫

        res.json({ success: true, message: '練習已刪除' });
    } catch (error) {
        console.error('Error deleting practice:', error);
        res.status(500).json({ success: false, message: '伺服器錯誤' });
    }
});


module.exports = router;
