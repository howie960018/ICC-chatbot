const express = require('express');
const router = express.Router();
const fs = require('fs');
const { upload, recordingsDir } = require('../config/multerConfig');
const { transcribeAudio } = require('../services/openaiService');
const { addRecording, getDialogueState } = require('../services/dialogueService');

// 獲取錄音歷史的路由
router.get('/recordings', (req, res) => {
  try {
    const dialogueState = getDialogueState();
    const recordings = dialogueState.recordings || [];
    
    // 確保每個錄音都有必要的信息
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

router.post('/transcribe', upload.single('audio'), async (req, res) => {
  try {
    if (!req.file) {
      throw new Error('No audio file received');
    }

    const transcription = await transcribeAudio(
      fs.createReadStream(req.file.path)
    );

    const recording = {
      timestamp: Date.now(),
      path: req.file.filename,
      transcription
    };

    addRecording(recording);
    res.json({ text: transcription });
  } catch (error) {
    console.error('Processing error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;