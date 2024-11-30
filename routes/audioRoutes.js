const express = require('express');
const router = express.Router();
const fs = require('fs');
const { upload } = require('../config/multerConfig'); // 匯入上傳設定
const { transcribeAudio } = require('../services/openaiService'); // 匯入 OpenAI API 服務
const { addRecording, getDialogueState } = require('../services/dialogueService'); // 匯入對話狀態管理
const { updatePractice } = require('../services/practiceService'); // 匯入練習服務

/**
 * POST /transcribe
 * 上傳音頻並進行轉錄，同步保存到練習紀錄。
 */
router.post('/transcribe', upload.single('audio'), async (req, res) => {
  try {
    // 驗證音頻文件和練習 ID
    if (!req.file || !req.body.practiceId) {
      throw new Error('Audio file or practiceId missing');
    }

    // 進行音頻轉錄
    const transcription = await transcribeAudio(fs.createReadStream(req.file.path));
    const recording = {
      timestamp: Date.now(), // 記錄當前時間
      path: req.file.filename, // 保存文件路徑
      transcription // 保存轉錄結果
    };

    // 保存錄音到對話狀態
    addRecording(recording);

    // 更新練習紀錄
    await updatePractice(req.body.practiceId, {
      recordings: getDialogueState().recordings // 更新練習的錄音記錄
    });

    // 返回轉錄結果
    res.json({ text: transcription });
  } catch (error) {
    console.error('Error processing audio:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /recordings
 * 獲取當前對話的錄音歷史。
 */
router.get('/recordings', (req, res) => {
  try {
    const dialogueState = getDialogueState();
    const recordings = dialogueState.recordings || [];

    // 格式化錄音歷史數據
    const formattedRecordings = recordings.map(recording => ({
      timestamp: recording.timestamp,
      path: recording.path,
      transcription: recording.transcription || ''
    }));

    res.json(formattedRecordings);
  } catch (error) {
    console.error('Error fetching recordings:', error);
    res.status(500).json({ error: 'Failed to fetch recordings history' });
  }
});

module.exports = router;
