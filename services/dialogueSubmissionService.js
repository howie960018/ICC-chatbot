const { generateChatResponse } = require('./openaiService');
const { 
  getDialogueState, 
  addToHistory, 
  incrementCount,
  resetCurrentRecordings 
} = require('./dialogueService');
const { analyzeDialogue } = require('./analysisService');



async function handleDialogueSubmission(transcription) {
    try {
        console.log('Starting dialogue submission with:', transcription); // 用於調試
        
        const dialogueState = getDialogueState();
        
        // 檢查輸入
        if (!transcription || !transcription.trim()) {
            throw new Error('Invalid transcription content');
        }
        
        // 添加教師回應到歷史
        addToHistory({ role: "導師", content: transcription });
        incrementCount();

        // 檢查是否需要分析
        if (dialogueState.count >= 6) {
            console.log('Dialogue complete, performing analysis'); // 用於調試
            const analysis = await analyzeDialogue();
            return {
                completed: true,
                analysis: analysis
            };
        }

        // 準備 AI 回應
        const messages = [
            { 
                role: "system", 
                content: "請用繁體中文根據老師上一句的回應回覆，繼續保持情緒激動及不客氣，如果您對老師回復不滿意，可以更生氣 或是繼續提出質疑，如果你有被說服，則可以緩和口氣，提出回應。" 
            },
            ...dialogueState.history.map(entry => ({ 
                role: entry.role === "家長" ? "assistant" : "user", 
                content: entry.content 
            }))
        ];

        console.log('Preparing AI response with messages:', messages); // 用於調試

        // 獲取 AI 回應
        const response = await generateChatResponse(messages);
        
        if (!response) {
            throw new Error('Failed to get AI response');
        }

        // 添加 AI 回應到歷史
        addToHistory({ role: "家長", content: response });
        incrementCount();

        // 重置當前錄音
        resetCurrentRecordings();

        console.log('Dialogue submission completed successfully'); // 用於調試
        
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