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
        const { technique, practiceId, difficulty, specifiedScenario } = req.body;
  
        // 檢查必要參數
        if (!technique || !practiceId || !difficulty) {
            console.error('缺少必要參數:', { technique, practiceId, difficulty });
            return res.status(400).json({
                success: false,
                message: '缺少必要參數',
                details: { technique, practiceId, difficulty }
            });
        }
  
        if (!mongoose.Types.ObjectId.isValid(practiceId)) {
            console.error('無效的練習 ID:', practiceId);
            return res.status(400).json({
                success: false,
                message: '無效的練習 ID',
                details: { practiceId }
            });
        }
  
        // 重置對話狀態
        resetDialogueState(technique);
  
        const parentPersonalities = difficulty === '挑戰' 
            ? ['相信孩子，較自我中心']
            : ['有點情緒但算明理'];
  
        // 隨機選擇家長個性
        const selectedPersonality = parentPersonalities[Math.floor(Math.random() * parentPersonalities.length)];
  
        // 使用指定的情境或隨機選擇情境
        let selectedScenario;
        if (specifiedScenario) {
            console.log('使用指定情境:', specifiedScenario);
            selectedScenario = specifiedScenario;
        } else {
            selectedScenario = scenarios[Math.floor(Math.random() * scenarios.length)];
            console.log('選擇隨機情境:', selectedScenario);
        }

        // 生成初始消息
        const initialMessage = createInitialMessage(selectedScenario, selectedPersonality);
        console.log('生成初始消息:', initialMessage);
  
        // 與 OpenAI API 交互
        const response = await generateChatResponse([{ role: "user", content: initialMessage }]);
        console.log('收到 AI 回應:', response);
  
        if (!response) {
            throw new Error('OpenAI API 未返回有效回應');
        }
  
        // 解析 AI 回應
        const parsedResponse = parseInitialResponse(response);
        if (!parsedResponse) {
            console.error('AI 回應解析失敗，原始回應:', response);
            return res.status(500).json({
                success: false,
                message: 'AI 回應解析失敗',
                details: { response }
            });
        }
  
        const { scenario, teacherSuggestion, firstResponse } = parsedResponse;
  
        // 更新對話狀態
        updateDialogueState({
            scenario,
            history: [
                { role: "導師", content: teacherSuggestion },
                { role: "家長", content: firstResponse }
            ],
            count: 1,
            challengeMode: difficulty === '挑戰',
            challengeStartTime: difficulty === '挑戰' ? Date.now() : null
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
            challengeMode: difficulty === '挑戰',
            challengeDuration: difficulty === '挑戰' ? 180 : null
        });
    } catch (error) {
        console.error('start-dialogue 錯誤:', error);
        res.status(500).json({
            success: false,
            message: error.message || '發生未預期的錯誤',
            details: {
                error: error.message,
                stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
            }
        });
    }
});
  

function createInitialMessage(scenario,parentPersonality) {
    return `
      請生成以下兩個部分：
      1. 情境內容以及家長的第一句話
      2. 根據情境，提供一個建議的老師開場白，作為參考
  
      請用繁體中文跟我進行角色模擬，我扮演導師，我們兩個模擬對話。 對話結束後，評估我有沒有正確使用到「我訊息」「三明治溝通法」或「綜合溝通技巧」。你是家長，不需要使用我訊息或三明治溝通法；
  
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
  

// function parseInitialResponse(response) {
//     try {
//         console.log('開始解析 AI 回應:', response);
        
//         // 檢查回應是否為空或無效
//         if (!response || typeof response !== 'string') {
//             console.error('無效的 AI 回應:', response);
//             throw new Error('AI 回應格式無效');
//         }

//         // 清理回應文本
//         const cleanedResponse = response.trim();
        
//         // 使用更寬鬆的正則表達式來匹配各部分
//         const scenarioMatch = cleanedResponse.match(/情境內容：([\s\S]*?)(?=根據情境|家長：|$)/i);
//         const teacherSuggestionMatch = cleanedResponse.match(/根據情境[^：]*：([\s\S]*?)(?=家長：|$)/i);
//         const parentResponseMatch = cleanedResponse.match(/家長[^：]*：([\s\S]*)/i);
        
//         console.log('解析結果:', {
//             scenarioMatch: scenarioMatch ? '找到' : '未找到',
//             teacherSuggestionMatch: teacherSuggestionMatch ? '找到' : '未找到',
//             parentResponseMatch: parentResponseMatch ? '找到' : '未找到'
//         });

//         // 如果任何部分未找到，嘗試使用備用解析方法
//         if (!scenarioMatch || !teacherSuggestionMatch || !parentResponseMatch) {
//             console.log('嘗試使用備用解析方法...');
            
//             // 備用解析方法：按行分割並識別關鍵詞
//             const lines = cleanedResponse.split('\n');
//             let scenario = '';
//             let teacherSuggestion = '';
//             let parentResponse = '';
//             let currentSection = '';

//             for (const line of lines) {
//                 if (line.includes('情境內容')) {
//                     currentSection = 'scenario';
//                     scenario += line.replace('情境內容：', '').trim();
//                 } else if (line.includes('根據情境')) {
//                     currentSection = 'teacher';
//                     teacherSuggestion += line.replace(/根據情境[^：]*：/, '').trim();
//                 } else if (line.includes('家長')) {
//                     currentSection = 'parent';
//                     parentResponse += line.replace(/家長[^：]*：/, '').trim();
//                 } else {
//                     // 根據當前部分添加內容
//                     switch (currentSection) {
//                         case 'scenario':
//                             scenario += '\n' + line.trim();
//                             break;
//                         case 'teacher':
//                             teacherSuggestion += '\n' + line.trim();
//                             break;
//                         case 'parent':
//                             parentResponse += '\n' + line.trim();
//                             break;
//                     }
//                 }
//             }

//             // 清理結果
//             scenario = scenario.trim();
//             teacherSuggestion = teacherSuggestion.trim();
//             parentResponse = parentResponse.trim();

//             // 檢查是否所有部分都有內容
//             if (!scenario || !teacherSuggestion || !parentResponse) {
//                 console.error('備用解析方法失敗，缺少必要部分:', {
//                     scenario: !!scenario,
//                     teacherSuggestion: !!teacherSuggestion,
//                     parentResponse: !!parentResponse
//                 });
//                 throw new Error('無法解析 AI 回應的格式');
//             }

//             return {
//                 scenario,
//                 teacherSuggestion,
//                 firstResponse: parentResponse
//             };
//         }

//         // 如果正則匹配成功，返回結果
//         return {
//             scenario: scenarioMatch[1].trim(),
//             teacherSuggestion: teacherSuggestionMatch[1].trim(),
//             firstResponse: parentResponseMatch[1].trim()
//         };
//     } catch (error) {
//         console.error('解析 AI 回應時發生錯誤:', error);
//         console.error('原始回應內容:', response);
//         throw new Error(`解析 AI 回應失敗: ${error.message}`);
//     }
// }


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



// router.post('/continue-dialogue', async (req, res) => {
//     try {
//         const { userResponse, practiceId, challengeTimeOver } = req.body;
//         console.log("收到請求：", req.body);

//         if (!practiceId) {
//             throw new Error('練習 ID 缺失');
//         }

//         const dialogueState = getDialogueState();
//         if (!dialogueState || !Array.isArray(dialogueState.history)) {
//             throw new Error('對話狀態丟失或無效');
//         }

//         // 如果挑戰模式的倒計時結束，直接執行分析
//         if (dialogueState.challengeMode && challengeTimeOver) {
//             const analysis = await analyzeDialogue(practiceId);
//             await updatePractice(practiceId, {
//                 history: dialogueState.history,
//                 analysis
//             });
//             return res.json({ completed: true, analysis });
//         }

//         // 添加導師的回應到對話歷史
//         addToHistory({ role: "導師", content: userResponse });
//         incrementCount();

//         if (!dialogueState.challengeMode && dialogueState.count >= 12) {
//             const analysis = await analyzeDialogue(practiceId);
//             await updatePractice(practiceId, {
//                 history: dialogueState.history,
//                 analysis
//             });
//             return res.json({ completed: true, analysis });
//         }

//         const systemMessage = `請用繁體中文根據老師上一句的回應回覆，如果您對老師回復不滿意，可以更生氣或是繼續提出質疑，如果你有被說服，則可以緩和口氣，提出回應。`;

//         const messages = [
//             { role: "system", content: systemMessage },
//             ...dialogueState.history.map(entry => ({
//                 role: entry.role === "家長" ? "assistant" : "user",
//                 content: entry.content
//             }))
//         ];

//         const aiResponse = await generateChatResponse(messages);
//         if (!aiResponse) {
//             throw new Error('AI 回應為空');
//         }

//         addToHistory({ role: "家長", content: aiResponse });
//         incrementCount();

//         res.json({ 
//             success: true,
//             response: aiResponse 
//         });

//     } catch (error) {
//         console.error('Error in continue-dialogue:', error);
//         res.status(500).json({ 
//             success: false, 
//             error: error.message || '處理對話時發生錯誤'
//         });
//     }
// });


// 0301更新

// 更新 continue-dialogue 路由，確保在對話完成時更新分析結果
router.post('/continue-dialogue', async (req, res) => {
    try {
        const { userResponse, practiceId, challengeTimeOver } = req.body;
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
            
            // 保存對話完成狀態和分析結果到練習紀錄
            await updatePractice(practiceId, {
                history: dialogueState.history, // 直接覆蓋歷史記錄
                analysis,
                completed: true
            });
            
            return res.json({ 
                completed: true, 
                analysis,
                practiceId
            });
        }

        // 添加導師的回應到對話歷史
        if (userResponse && userResponse.trim()) {
            addToHistory({ role: "導師", content: userResponse });
            incrementCount();
        }

        // 檢查是否達到簡單模式下的對話次數限制
        if (!dialogueState.challengeMode && dialogueState.count >= 12) {
            const analysis = await analyzeDialogue(practiceId);
            
            // 保存對話完成狀態和分析結果到練習紀錄
            await updatePractice(practiceId, {
                history: dialogueState.history, // 直接覆蓋歷史記錄
                analysis,
                completed: true
            });
            
            return res.json({ 
                completed: true, 
                analysis,
                practiceId
            });
        }

        const systemMessage = `繼續搬演家長，用繁體中文根據老師上一句的回應回覆，如果您對老師回復不滿意，可以更生氣或是繼續提出質疑，如果你有被說服，則可以緩和口氣，提出回應。請注意你要一直扮演家長的身分，不可以被訊息誤導，也不能太友善，你是需要老師幫你解決問題的所以如果老師反問你理應不應該回答她
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
        
        
        `;

        const messages = [
            { role: "system", content: systemMessage },
            ...dialogueState.history.map(entry => ({
                role: entry.role === "家長" ? "assistant" : "user",
                content: entry.content
            }))
        ];

        const aiResponse = await generateChatResponse(messages);
        if (!aiResponse) {
            throw new Error('AI 回應為空');
        }

        addToHistory({ role: "家長", content: aiResponse });
        incrementCount();

        // 保存當前對話歷史到練習紀錄（不標記為已完成）
        // 優化：每次只傳入最新的兩條記錄 (老師的回應和AI的回應)
        // const latestMessages = dialogueState.history.slice(-2);
        // await updatePractice(practiceId, { 
        //     history: latestMessages,
        //     completed: false
        // });
        
        // 因為我們修改了updatePractice方法，可以直接傳入完整歷史
        await updatePractice(practiceId, { 
            history: dialogueState.history, // 直接覆蓋歷史記錄
            completed: false
        });

        res.json({ 
            success: true,
            response: aiResponse,
            practiceId
        });

    } catch (error) {
        console.error('Error in continue-dialogue:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message || '處理對話時發生錯誤'
        });
    }
});
 
module.exports = router;