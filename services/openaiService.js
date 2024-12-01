const OpenAI = require('openai');
const config = require('../config/config');

const openai = new OpenAI({
  apiKey: config.openaiApiKey,
});

async function transcribeAudio(audioStream) {
  try {
    console.log('開始進行音頻轉錄...');
    const transcription = await openai.audio.transcriptions.create({
      file: audioStream,
      model: "whisper-1",
      language: "zh"
    });
    console.log('轉錄成功:', transcription.text);
    return transcription.text;
  } catch (error) {
    console.error('OpenAI API 發生錯誤:', error);
    throw new Error('轉錄失敗，請檢查音頻文件或 OpenAI 配置');
  }
}

async function generateChatResponse(messages) {
  try {
    const chatCompletion = await openai.chat.completions.create({
      messages,
      model: "gpt-4o-mini",
    });

    if (!chatCompletion.choices || !chatCompletion.choices[0]) {
        throw new Error('Invalid response from OpenAI');
      }
      
      return chatCompletion.choices[0].message.content.trim();
    
  } catch (error) {
    console.error('OpenAI Chat API Error:', error);
    throw error;
  }
}

module.exports = {
  transcribeAudio,
  generateChatResponse
};