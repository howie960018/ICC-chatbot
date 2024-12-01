const express = require('express');
const router = express.Router();
const fs = require('fs');
const { upload } = require('../config/multerConfig'); // 匯入上傳設定
const { transcribeAudio } = require('../services/openaiService'); // 匯入 OpenAI API 服務
const { addRecording, getDialogueState } = require('../services/dialogueService'); // 匯入對話狀態管理
const { updatePractice } = require('../services/practiceService'); // 匯入練習服務
const User = require('../models/User'); 

/**
 * POST /transcribe
 * 上傳音頻並進行轉錄，同步保存到練習紀錄。
 */
router.post('/transcribe', upload.single('audio'), async (req, res) => {
  
  try {
    if (!req.file || !req.body.practiceId) {
      throw new Error('Audio file or practiceId missing');
    }

    console.log('收到音頻文件:', req.file);
    console.log('練習 ID:', req.body.practiceId);

    const transcription = await transcribeAudio(fs.createReadStream(req.file.path));
    console.log('轉錄結果:', transcription);

    const newRecording = {
      timestamp: Date.now(),
      path: req.file.filename,
      transcription
    };

    // 查詢使用者和練習
    const user = await User.findOne({ 'practices._id': req.body.practiceId });
    if (!user) {
      throw new Error('User or Practice not found');
    }

    // 找到目標練習
    const practice = user.practices.id(req.body.practiceId);
    if (!practice) {
      throw new Error('Practice not found in user document');
    }

    // 檢查是否已有相同的錄音
    const isDuplicate = practice.recordings.some(r => r.path === newRecording.path);
    if (!isDuplicate) {
      practice.recordings.push(newRecording); // 僅新增新錄音
      await user.save(); // 保存更新
      console.log('新錄音已保存:', newRecording);
    } else {
      console.warn('錄音已存在，未重複保存:', newRecording.path);
    }

    res.json({ text: transcription });
  } catch (error) {
    console.error('處理音頻時發生錯誤:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /recordings
 * 獲取當前對話的錄音歷史。
 */
router.get('/recordings', async (req, res) => {
  try {
      const { practiceId } = req.query;
      const user = await User.findOne({ 'practices._id': practiceId });
      const practice = user.practices.id(practiceId);
      
      const formattedRecordings = (practice.recordings || []).map(recording => ({
          timestamp: recording.timestamp,
          path: `/recordings/${recording.path}`, // 修改為正確的靜態文件路徑
          transcription: recording.transcription || ''
      }));

      res.json({ success: true, recordings: formattedRecordings });
  } catch (error) {
      res.status(500).json({ error: error.message });
  }
});


module.exports = router;
