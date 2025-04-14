const OpenAI = require('openai');
const config = require('../config/config');
const AWS = require('aws-sdk');
const fs = require('fs');
const path = require('path');
const OpenCC = require('opencc-js');

// 建立簡體轉繁體轉換器
const converter = OpenCC.Converter({ from: 'cn', to: 'tw' });

const openai = new OpenAI({
  apiKey: config.openaiApiKey,
});

// 初始化 S3 客戶端
const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION
});

async function transcribeAudio(fileUrl) {
  try {
    console.log('開始下載音頻文件...', fileUrl);
    
    // 從 URL 獲取 bucket 和 key
    const urlParts = new URL(fileUrl);
    const key = urlParts.pathname.substring(1);
    const bucket = urlParts.hostname.split('.')[0];

    // 創建臨時目錄（如果不存在）
    const tempDir = path.join(process.cwd(), 'temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir);
    }

    // 創建臨時文件路徑
    const tempFilePath = path.join(tempDir, `temp-${Date.now()}.wav`);

    // 使用 S3 SDK 下載文件
    const fileData = await s3.getObject({
      Bucket: bucket,
      Key: key
    }).promise();

    // 將文件數據寫入臨時文件
    fs.writeFileSync(tempFilePath, fileData.Body);

    console.log('開始進行音頻轉錄...');

    // 創建文件流
    const fileStream = fs.createReadStream(tempFilePath);

    // 使用 OpenAI API 進行轉錄
    const transcription = await openai.audio.transcriptions.create({
      file: fileStream,
      model: "whisper-1",
      language: "zh"
    });

    // 刪除臨時文件
    fs.unlinkSync(tempFilePath);

    // 將轉錄文字轉換為繁體中文
    const traditionalText = converter(transcription.text);
    console.log('原始轉錄文字:', transcription.text);
    console.log('轉換後繁體文字:', traditionalText);

    return traditionalText;

  } catch (error) {
    console.error('音頻轉錄失敗:', error);
    throw error;
  }
}

async function generateChatResponse(messages) {
  try {
      console.log('Sending request to OpenAI:', messages);
      
      const chatCompletion = await openai.chat.completions.create({
          messages,
          model: "gpt-4o-mini", 
          temperature: 0.7,
          max_tokens: 1000
      });

      if (!chatCompletion?.choices?.[0]?.message?.content) {
          throw new Error('Invalid response format from OpenAI');
      }
      
      const response = chatCompletion.choices[0].message.content.trim();
      console.log('OpenAI response:', response);
      return response;
      
  } catch (error) {
      console.error('OpenAI Chat API Error:', error);
      throw new Error(error.message || 'AI 回應生成失敗');
  }
}

module.exports = {
  transcribeAudio,
  generateChatResponse: async (messages) => {
    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: messages,
        temperature: 0.7,
        max_tokens: 1000
      });

      // 確保回應也轉換為繁體中文
      const response = completion.choices[0].message.content;
      return converter(response);
    } catch (error) {
      console.error('生成回應失敗:', error);
      throw error;
    }
  }
};