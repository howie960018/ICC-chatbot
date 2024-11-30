const express = require('express');
const router = express.Router();
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
    res.status(201).json({ success: true, practice });
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

// 更新練習
router.patch('/practices/:id', async (req, res) => {
  try {
    const userId = req.user.id;
    const practiceId = req.params.id;
    const updatedPractice = await updatePractice(userId, practiceId, req.body);
    res.json({ success: true, practice: updatedPractice });
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

module.exports = router;
