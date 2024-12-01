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

/**
 * POST /start-dialogue
 * 初始化一個新的對話，生成情境、教師建議，並與練習紀錄關聯。
 */
// router.post('/start-dialogue', async (req, res) => {
//   try {
//     const { technique, practiceId } = req.body; // 從請求中提取溝通技巧和練習 ID
//     if (!technique || !practiceId) {
//       // 若缺少必要參數，拋出錯誤
//       throw new Error('Technique or practiceId not specified');
//     }

//     // 重置對話狀態，並設置當前溝通技巧
//     resetDialogueState(technique);

//     // 隨機選擇一個情境
//     const randomScenario = scenarios[Math.floor(Math.random() * scenarios.length)];
//     console.log('Selected scenario:', randomScenario); // 調試用

//     // 根據情境生成初始消息
//     const initialMessage = createInitialMessage(randomScenario);
//     console.log('Initial message created:', initialMessage); // 調試用

//     // 與 OpenAI 進行交互，獲取 AI 的初始回應
//     const response = await generateChatResponse([{ role: "user", content: initialMessage }]);
//     console.log('AI response received:', response); // 調試用

//     // 將 AI 回應解析為情境細節和教師建議
//     const parsedResponse = parseInitialResponse(response);
//     if (!parsedResponse) {
//       throw new Error('Failed to parse AI response');
//     }

//     const { scenario, teacherSuggestion, firstResponse } = parsedResponse;

//     // 更新對話狀態
//     updateDialogueState({
//       scenario, // 保存情境
//       history: [{ role: "家長", content: firstResponse }], // 初始對話記錄
//       count: 1 // 對話回合計數
//     });

//     // 更新練習紀錄：保存情境與教師建議
//     await updatePractice(practiceId, { scenario, teacherSuggestion });

//     // 返回初始化成功的訊息
//     res.json({
//       success: true,
//       scenario, // 回傳情境
//       teacherSuggestion, // 回傳教師建議
//       response: firstResponse // 回傳 AI 的初始回應
//     });

//   } catch (error) {
//     // 捕捉所有錯誤，並回傳錯誤訊息
//     console.error('Error in start-dialogue:', error);
//     res.status(500).json({
//       success: false,
//       message: error.message || 'An error occurred while starting the dialogue'
//     });
//   }
// });

router.post('/start-dialogue', async (req, res) => {
  try {
      const { technique, practiceId } = req.body;

      // 檢查必要參數
      if (!technique || !practiceId) {
          console.error('缺少溝通技巧或練習 ID:', { technique, practiceId });
          throw new Error('Technique or practiceId not specified');
      }

      if (!mongoose.Types.ObjectId.isValid(practiceId)) {
          console.error('無效的練習 ID:', practiceId);
          throw new Error('Invalid practiceId');
      }

      // 重置對話狀態
      resetDialogueState(technique);

      // 隨機選擇情境
      const randomScenario = scenarios[Math.floor(Math.random() * scenarios.length)];
      console.log('Selected scenario:', randomScenario);

      // 生成初始消息
      const initialMessage = createInitialMessage(randomScenario);
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
          count: 1
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
          response: firstResponse
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
        const { userResponse, practiceId } = req.body;

        if (!practiceId) {
            throw new Error('練習 ID 缺失');
        }

        const dialogueState = getDialogueState();
        if (!dialogueState || !Array.isArray(dialogueState.history)) {
            throw new Error('對話狀態丟失或無效');
        }

        // 添加導師的回應到對話歷史
        addToHistory({ role: "導師", content: userResponse });
        incrementCount();

        if (dialogueState.count >= 6) {

            const analysis = await analyzeDialogue(practiceId);

            await updatePractice(practiceId, {
                history: dialogueState.history, // 完整對話記錄
                analysis // 分析結果
            });

            return res.json({ completed: true, analysis });
        }

        const messages = [
            { role: "system", content: "請用繁體中文..." },
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

  
// router.post('/continue-dialogue', async (req, res) => {
//   // try {
//   //   const { userResponse } = req.body;
//   //   const dialogueState = getDialogueState();
    
//   //   addToHistory({ role: "導師", content: userResponse });
//   //   incrementCount();

//   //   if (dialogueState.count >= 6) {
//   //     return await analyzeDialogue(res);
//   //   }

//   //   const messages = [
//   //     { 
//   //       role: "system", 
//   //       content: "請用繁體中文根據老師上一句的回應回覆，繼續保持情緒激動及不客氣，如果您對老師回復不滿意，可以更生氣 或是繼續提出質疑，如果你有被說服，則可以緩和口氣，提出回應。" 
//   //     },
//   //     ...dialogueState.history.map(entry => ({ 
//   //       role: entry.role === "家長" ? "assistant" : "user", 
//   //       content: entry.content 
//   //     }))
//   //   ];

//   //   const response = await generateChatResponse(messages);
    
//   //   addToHistory({ role: "家長", content: response });
//   //   incrementCount();
    
//   //   res.json({ response });
//   // } catch (error) {
//   //   console.error('Error:', error);
//   //   res.status(500).json({ error: error.message });
//   // }

//       try {

//         const { userResponse, practiceId } = req.body;

//         if (!practiceId) {
//             throw new Error('練習 ID 缺失');
//         }

//         const dialogueState = getDialogueState();

//         if (!dialogueState) {
//             throw new Error('對話狀態丟失');
//         }

//         addToHistory({ role: "導師", content: userResponse });
//         incrementCount();

//         if (dialogueState.count >= 6) {
//             const practiceId = req.body.practiceId; // 確保 practiceId 傳遞正確
//             if (!practiceId) {
//                 throw new Error('練習 ID 缺失');
//             }

//             const analysis = await analyzeDialogue(practiceId);
//             return res.json({ completed: true, analysis });
//         }

//         const messages = [
//             { role: "system", content: "請用繁體中文根據老師上一句的回應回覆，繼續保持情緒激動及不客氣，如果您對老師回復不滿意，可以更生氣 或是繼續提出質疑，如果你有被說服，則可以緩和口氣，提出回應" },
//             ...dialogueState.history.map(entry => ({
//                 role: entry.role === "家長" ? "assistant" : "user",
//                 content: entry.content
//             }))
//         ];

//         const response = await generateChatResponse(messages);
//         addToHistory({ role: "家長", content: response });
//         incrementCount();

//         res.json({ response });
//     } catch (error) {
//         console.error('Error in continue-dialogue:', error.message || error);
//         res.status(500).json({ error: error.message });

//     }
// });
// Export the router
module.exports = router;


