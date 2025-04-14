const { generateChatResponse } = require('./openaiService');
const { 
  getDialogueState, 
  addToHistory, 
  incrementCount, 
  resetCurrentRecordings 
} = require('./dialogueService');
const { analyzeDialogue } = require('./analysisService');
const { updatePractice } = require('../services/practiceService'); // 引入更新練習的模組

/**
 * 處理對話提交邏輯
 * @param {String} transcription - 使用者的語音文字轉錄
 * @param {String} practiceId - 對應練習的 ID
 */
async function handleDialogueSubmission(transcription, practiceId) {
  try {
    console.log('Handling dialogue submission for practice:', practiceId); // 調試用

    // 獲取當前對話狀態
    const dialogueState = getDialogueState();

    // 檢查輸入是否合法
    if (!transcription || !transcription.trim()) {
      throw new Error('Invalid transcription content');
    }

    // 添加教師回應到歷史
    addToHistory({ role: "導師", content: transcription });
    incrementCount();

    // 如果對話達到結束條件，執行分析
    if (dialogueState.count >= 12) {
      console.log('Dialogue complete, performing analysis'); // 調試用
      const analysis = await analyzeDialogue();

      // 保存歷史與分析結果到練習紀錄
      await updatePractice(practiceId, { history: dialogueState.history, analysis });

      return {
        completed: true,
        analysis: analysis
      };
    }

    // 準備 AI 回應
    const messages = [
      { 
        role: "system", 
        content: `
        請用繁體中文根據老師上一句的回應回覆，如果您對老師回復不滿意，可以情緒激動及說話不客氣或是提出質疑，如果你有被說服，可以緩和口氣回應。
        請嚴格遵守以下規則：
        1. 您必須始終扮演家長角色，回應必須與當前情境相關
        2. 如果使用者偏離情境，請禮貌地引導回主題
        3. 回應必須符合以下條件：
          - 與當前情境相關
          - 符合家長身份
        4. 當檢測到偏離情境時：
          - 禮貌指出偏離
          - 重述當前情境
          - 引導回主題
        5. 保持情緒和語氣的一致性
        6. 始終關注孩子的教育問題
`
      },
      ...dialogueState.history.map(entry => ({ 
        role: entry.role === "家長" ? "assistant" : "user", 
        content: entry.content 
      }))
    ];

    console.log('Preparing AI response with messages:', messages); // 調試用

    // 獲取 AI 回應
    const response = await generateChatResponse(messages);
    if (!response) {
      throw new Error('Failed to get AI response');
    }

    // 添加 AI 回應到歷史
    addToHistory({ role: "家長", content: response });

    // 保存對話歷史到練習紀錄
    await updatePractice(practiceId, { history: dialogueState.history });

    // 重置當前錄音
    resetCurrentRecordings();

    console.log('Dialogue submission completed successfully'); // 調試用

    return {
      completed: false,
      response: response
    };

  } catch (error) {
    console.error('Error in handleDialogueSubmission:', error);
    throw error;
  }
}

module.exports = {
  handleDialogueSubmission
};