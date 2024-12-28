const express = require('express');
const router = express.Router();
const scenarios = require('../data/scenarios');
const mongoose = require('mongoose');
const {
  addToHistory,
  incrementCount
} = require('../services/dialogueService');
const { analyzeDialogue } = require('../services/analysisService');
const { updatePractice } = require('../services/practiceService'); // 匯入練習服務模組
const { resetDialogueState, updateDialogueState, getDialogueState } = require('../services/dialogueService'); // 匯入對話狀態管理
const { generateChatResponse } = require('../services/openaiService'); // 匯入 OpenAI API 工具

router.post('/start-dialogue', async (req, res) => {
    try {
        const { technique, practiceId, difficulty } = req.body;
  
        // 檢查必要參數
        if (!technique || !practiceId || !difficulty) {
            console.error('缺少溝通技巧或練習 ID:', { technique, practiceId });
            throw new Error('Technique or practiceId not specified');
        }
  
        if (!mongoose.Types.ObjectId.isValid(practiceId)) {
            console.error('無效的練習 ID:', practiceId);
            throw new Error('Invalid practiceId');
        }
  
        // 重置對話狀態
        resetDialogueState(technique);
  
        const parentPersonalities = difficulty === '挑戰' 
            ? ['相信孩子，較自我中心', '完全無法接受他人觀點或建議']
            : ['有點情緒但算明理'];
  
        // 隨機選擇家長個性
        const selectedPersonality = parentPersonalities[Math.floor(Math.random() * parentPersonalities.length)];
  
        // 隨機選擇情境
        const randomScenario = scenarios[Math.floor(Math.random() * scenarios.length)];
        console.log('Selected scenario:', randomScenario);
  
        // 生成初始消息
        const initialMessage = createInitialMessage(randomScenario, selectedPersonality);
        console.log('Initial message created:', initialMessage);
  
        // 與 OpenAI API 交互
        const response = await generateChatResponse([{ role: "user", content: initialMessage }]);
        console.log('AI response received:', response);
  
        // 解析 AI 回應
        const parsedResponse = parseInitialResponse(response);
        if (!parsedResponse) {
            console.error('AI 回應解析失敗，原始回應:', response);
            throw new Error('Failed to parse AI response');
        }
  
        const { scenario, teacherSuggestion, firstResponse } = parsedResponse;
  
        // 更新對話狀態
        updateDialogueState({
            scenario,
            history: [
                { role: "導師", content: teacherSuggestion }, // 教師建議
                { role: "家長", content: firstResponse }      // 初始家長回應
            ],
            count: 1,
            challengeMode: difficulty === '挑戰', // 標記挑戰模式
            challengeStartTime: difficulty === '挑戰' ? Date.now() : null // 記錄開始時間
        });
  
        // 更新練習記錄
        await updatePractice(practiceId, {
            scenario,
            teacherSuggestion,
            firstResponse
        });
  
        // 返回成功結果
        res.json({
            success: true,
            scenario,
            teacherSuggestion,
            response: firstResponse,
            challengeMode: difficulty === '挑戰', // 通知前端是否為挑戰模式
            challengeDuration: difficulty === '挑戰' ? 180 : null // 倒計時秒數（3 分鐘）
        });
    } catch (error) {
        console.error('Error in start-dialogue:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'An unexpected error occurred',
            details: error.stack
        });
    }
  });
  


// 輔助函數
function createInitialMessage(scenario,parentPersonality) {
  return `
    請生成以下兩個部分：
    1. 情境內容以及家長的第一句話
    2. 根據情境，提供一個建議的老師開場白，作為參考

    請用繁體中文跟我進行角色模擬，我扮演導師，我們兩個模擬對話。 對話結束後，評估我有沒有正確使用到「我訊息」或「三明治溝通法」。你是家長，不需要使用我訊息或三明治溝通法；

    情境內容：
    ${scenario}

    家長個性: 
    ${parentPersonality}

    你可以根據家長的個性做對應的回應

    請按照以下格式回應：

    情境內容：
    [描述情境]


    

    根據情境，老師對家長說的第一句話：
    [老師建議的開場白]

    家長：
    [第一句話]`;
}

function parseInitialResponse(response) {
    try {
      console.log('Parsing response:', response); // 加入除錯日誌
      
      const scenarioMatch = response.match(/情境內容：([\s\S]*?)(?=根據情境)/);
      const teacherSuggestionMatch = response.match(/根據情境，老師對家長說的第一句話：([\s\S]*?)(?=家長：)/);
      const parentResponseMatch = response.match(/家長：([\s\S]*)/);
      
      if (!scenarioMatch || !teacherSuggestionMatch || !parentResponseMatch) {
        console.error('Failed to parse response parts:', {
          scenarioMatch,
          teacherSuggestionMatch,
          parentResponseMatch
        });
        throw new Error('Response format not as expected');
      }
  
      return {
        scenario: scenarioMatch[1].trim(),
        teacherSuggestion: teacherSuggestionMatch[1].trim(),
        firstResponse: parentResponseMatch[1].trim()
      };
    } catch (error) {
      console.error('Error parsing initial response:', error);
      throw new Error('Failed to parse AI response');
    }
  }

  router.post('/continue-dialogue', async (req, res) => {
    try {
        const { userResponse, practiceId, challengeTimeOver  } = req.body;
        console.log("收到請求：", req.body);

        if (!practiceId) {
            throw new Error('練習 ID 缺失');
        }

        const dialogueState = getDialogueState();
        if (!dialogueState || !Array.isArray(dialogueState.history)) {
            throw new Error('對話狀態丟失或無效');
        }



        // 如果挑戰模式的倒計時結束，直接執行分析
      if (dialogueState.challengeMode && challengeTimeOver) {
        const analysis = await analyzeDialogue(practiceId);

        await updatePractice(practiceId, {
            history: dialogueState.history, // 完整對話記錄
            analysis // 分析結果
        });

        return res.json({ completed: true, analysis });
    }

        const parentPersonality = dialogueState.parentPersonality;

        // 添加導師的回應到對話歷史
        addToHistory({ role: "導師", content: userResponse });
        incrementCount();

        if (!dialogueState.challengeMode && dialogueState.count >= 6) {
            const analysis = await analyzeDialogue(practiceId);
  
            await updatePractice(practiceId, {
                history: dialogueState.history, // 完整對話記錄
                analysis // 分析結果
            });
  
            return res.json({ completed: true, analysis });
        }

        const systemMessage = `請用繁體中文根據老師上一句的回應回覆，你是一名${parentPersonality}的家長，
        如果家長個性是"完全無法接受他人觀點或建議"的家長，無論老師的回應多麼得體，請表現出以下行為：
        1. 強烈質疑老師的立場，認為老師無法理解你孩子的真正狀況。
        2. 始終堅持自己孩子無錯，並試圖將問題歸因於外部原因（如其他孩子或老師的處理方式）。
        3. 對老師的建議表現出冷漠甚至敵意，不願積極配合。
        4. 語氣可以很粗暴，不合作甚至詆毀老師。
        `;

        const messages = [
            { role: "system", content: systemMessage },
            ...dialogueState.history.map(entry => ({
                role: entry.role === "家長" ? "assistant" : "user",
                content: entry.content
            }))
        ];

        const response = await generateChatResponse(messages);
        addToHistory({ role: "家長", content: response });
        incrementCount();

        res.json({ response });
    } catch (error) {
        console.error('Error in continue-dialogue:', error.message || error);
        res.status(500).json({ error: error.message });
    }
});

 
module.exports = router;


