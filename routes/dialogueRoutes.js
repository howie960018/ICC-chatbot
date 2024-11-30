const express = require('express');
const router = express.Router();
const { generateChatResponse } = require('../services/openaiService');
const {
  resetDialogueState,
  updateDialogueState,
  getDialogueState,
  getCurrentRecordings,
  resetCurrentRecordings
} = require('../services/dialogueService');
const scenarios = require('../data/scenarios');

const {
  addToHistory,
  incrementCount
} = require('../services/dialogueService');
const { analyzeDialogue } = require('../services/analysisService');


router.post('/start-dialogue', async (req, res) => {
    try {
      console.log('Starting new dialogue session'); // 加入除錯日誌
      
      const { technique } = req.body;
      if (!technique) {
        throw new Error('Technique not specified');
      }
      
      resetDialogueState(technique);
      
      // 確保 scenarios 陣列不為空
      if (!scenarios || scenarios.length === 0) {
        throw new Error('No scenarios available');
      }
      
      const randomScenario = scenarios[Math.floor(Math.random() * scenarios.length)];
      console.log('Selected scenario:', randomScenario); // 加入除錯日誌
      
      const initialMessage = createInitialMessage(randomScenario);
      console.log('Created initial message:', initialMessage); // 加入除錯日誌
      
      const response = await generateChatResponse([{
        role: "user",
        content: initialMessage
      }]);
      
      console.log('Received AI response:', response); // 加入除錯日誌
      
      const parsedResponse = parseInitialResponse(response);
      if (!parsedResponse) {
        throw new Error('Failed to parse AI response');
      }
      
      const { scenario, teacherSuggestion, firstResponse } = parsedResponse;
      
      // 更新對話狀態
      updateDialogueState({
        scenario,
        history: [{ role: "家長", content: firstResponse }],
        count: 1
      });
      
      res.json({
        success: true,
        scenario,
        teacherSuggestion,
        response: firstResponse
      });
      
    } catch (error) {
      console.error('Error in start-dialogue:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'An error occurred while starting the dialogue'
      });
    }
  });

// 輔助函數
function createInitialMessage(scenario) {
  return `
    請生成以下兩個部分：
    1. 情境內容以及家長的第一句話
    2. 根據情境，提供一個建議的老師開場白，作為參考

    請用繁體中文跟我進行角色模擬，我扮演導師，我們兩個模擬對話。 對話結束後，評估我有沒有正確使用到「我訊息」或「三明治溝通法」。你是家長，不需要使用我訊息或三明治溝通法；

    情境內容：
    ${scenario}

    你可以選擇扮演：
    1. 能同理老師的明理家長，
    2. 有點情緒但算明理的家長，
    3. 相信孩子，較自我中心，但還能溝通的家長，
    4. 完全無法接受他人觀點或建議，只想找情緒出口的家長。（四選一）

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
    const { userResponse } = req.body;
    const dialogueState = getDialogueState();
    
    addToHistory({ role: "導師", content: userResponse });
    incrementCount();

    if (dialogueState.count >= 6) {
      return await analyzeDialogue(res);
    }

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

    const response = await generateChatResponse(messages);
    
    addToHistory({ role: "家長", content: response });
    incrementCount();
    
    res.json({ response });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
});
// Export the router
module.exports = router;