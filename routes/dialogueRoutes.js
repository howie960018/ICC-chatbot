// const express = require('express');
// const router = express.Router();
// const scenarios = require('../data/scenarios');
// const mongoose = require('mongoose');
// const {
//   addToHistory,
//   incrementCount
// } = require('../services/dialogueService');
// const { analyzeDialogue } = require('../services/analysisService');
// const { updatePractice } = require('../services/practiceService'); // 匯入練習服務模組
// const { resetDialogueState, updateDialogueState, getDialogueState } = require('../services/dialogueService'); // 匯入對話狀態管理
// const { generateChatResponse, generateSpeech } = require('../services/openaiService'); // 匯入 OpenAI API 工具和 generateSpeech
// const path = require('path');

// // ==================== 非語言數據驗證工具函數 ====================

// /**
//  * 限制數值在指定範圍內
//  * @param {Number} value 要限制的值
//  * @param {Number} min 最小值
//  * @param {Number} max 最大值
//  * @returns {Number} 限制後的值
//  */
// function clamp(value, min, max) {
//   if (typeof value !== 'number' || isNaN(value)) {
//     return min;
//   }
//   return Math.max(min, Math.min(max, value));
// }

// /**
//  * 驗證並清理非語言數據
//  * @param {Object} data 原始非語言數據
//  * @returns {Object|null} 驗證並清理後的數據,如果無效則返回 null
//  */
// function validateNonverbalData(data) {
//   if (!data || typeof data !== 'object') {
//     console.log('非語言數據為空或格式無效');
//     return null;
//   }

//   try {
//     // 基本數值驗證和清理
//     const validated = {
//       eyeContactRate: clamp(parseFloat(data.eyeContactRate) || 0, 0, 100),
//       smileRate: clamp(parseFloat(data.smileRate) || 0, 0, 100),
//       openPostureRate: clamp(parseFloat(data.openPostureRate) || 0, 0, 100),
//       gesturesUsed: Math.max(0, parseInt(data.gesturesUsed) || 0),
//       gesturesList: Array.isArray(data.gesturesList) ? data.gesturesList : [],
//       collectedAt: new Date()
//     };

//     // 保存原始統計數據(如果存在)
//     if (data.rawData) {
//       validated.rawData = {
//         eyeContact: {
//           good: parseInt(data.rawData.eyeContact?.good) || 0,
//           total: parseInt(data.rawData.eyeContact?.total) || 0
//         },
//         smile: {
//           smiling: parseInt(data.rawData.smile?.smiling) || 0,
//           total: parseInt(data.rawData.smile?.total) || 0
//         },
//         posture: {
//           open: parseInt(data.rawData.posture?.open) || 0,
//           total: parseInt(data.rawData.posture?.total) || 0
//         }
//       };
//     }

//     // 數據品質指標(如果存在)
//     if (data.dataQuality) {
//       validated.dataQuality = {
//         sampleCount: parseInt(data.dataQuality.sampleCount) || 0,
//         duration: parseFloat(data.dataQuality.duration) || 0,
//         faceDetectionRate: clamp(parseFloat(data.dataQuality.faceDetectionRate) || 0, 0, 100)
//       };
//     }

//     console.log('✅ 非語言數據驗證成功:', {
//       eyeContactRate: validated.eyeContactRate,
//       smileRate: validated.smileRate,
//       openPostureRate: validated.openPostureRate,
//       gesturesUsed: validated.gesturesUsed
//     });

//     return validated;
//   } catch (error) {
//     console.error('❌ 非語言數據驗證失敗:', error);
//     return null;
//   }
// }

// // ==================== 路由處理 ====================

// // 在 dialogueRoutes.js 中修改 start-dialogue 路由

// router.post('/start-dialogue', async (req, res) => {
//     try {
//         const { technique, practiceId, difficulty, specifiedScenario , characterVoice} = req.body;
  
//         // 檢查必要參數
//         if (!technique || !practiceId || !difficulty) {
//             console.error('缺少必要參數:', { technique, practiceId, difficulty });
//             return res.status(400).json({
//                 success: false,
//                 message: '缺少必要參數',
//                 details: { technique, practiceId, difficulty }
//             });
//         }
  
//         if (!mongoose.Types.ObjectId.isValid(practiceId)) {
//             console.error('無效的練習 ID:', practiceId);
//             return res.status(400).json({
//                 success: false,
//                 message: '無效的練習 ID',
//                 details: { practiceId }
//             });
//         }
  
//         // 重置對話狀態
//         resetDialogueState(technique);
  
//         const parentPersonalities = difficulty === '挑戰' 
//             ? ['相信孩子，較自我中心']
//             : ['有點情緒但算明理'];
  
//         // 隨機選擇家長個性
//         const selectedPersonality = parentPersonalities[Math.floor(Math.random() * parentPersonalities.length)];
  
//         // 使用指定的情境或隨機選擇情境
//         let selectedScenario;
//         if (specifiedScenario) {
//             console.log('使用指定情境:', specifiedScenario);
//             selectedScenario = specifiedScenario;
//         } else {
//             selectedScenario = scenarios[Math.floor(Math.random() * scenarios.length)];
//             console.log('選擇隨機情境:', selectedScenario);
//         }

//         // 生成初始消息
//         const initialMessage = createInitialMessage(selectedScenario, selectedPersonality);
//         console.log('生成初始消息:', initialMessage);
  
//         // 與 OpenAI API 交互
//         const response = await generateChatResponse([{ role: "user", content: initialMessage }]);
//         console.log('收到 AI 回應:', response);
  
//         if (!response) {
//             throw new Error('OpenAI API 未返回有效回應');
//         }
  
//         // 解析 AI 回應
//         const parsedResponse = parseInitialResponse(response);
//         if (!parsedResponse) {
//             console.error('AI 回應解析失敗，原始回應:', response);
//             return res.status(500).json({
//                 success: false,
//                 message: 'AI 回應解析失敗',
//                 details: { response }
//             });
//         }
  
//         const { scenario, teacherSuggestion, firstResponse } = parsedResponse;

//         // 為老師建議開場白生成語音（保留作為參考，但前端不會顯示）
//         let teacherAudioFilePath = null;
//         try {
//             const generatedPath = await generateSpeech(teacherSuggestion);
//             teacherAudioFilePath = `/audio/${path.basename(generatedPath)}`;
//             console.log('老師建議開場白語音檔案生成成功，URL:', teacherAudioFilePath);
//         } catch (error) {
//             console.error('老師建議開場白語音生成失敗:', error);
//         }

//         // 為家長的第一句話生成語音
//         let parentAudioFilePath = null;
//         try {
//             const voice = characterVoice || 'nova'; // 使用傳入的語音類型
//             const generatedPath = await generateSpeech(firstResponse, voice);
//             parentAudioFilePath = `/audio/${path.basename(generatedPath)}`;
//             console.log('家長第一句話語音檔案生成成功，使用聲音:', voice, 'URL:', parentAudioFilePath);
//         } catch (error) {
//             console.error('家長第一句話語音生成失敗:', error);
//         }
  
//         // 更新對話狀態（只保存家長的第一句話）
//         updateDialogueState({
//             scenario,
//             history: [
//                 { role: "家長", content: firstResponse }
//             ],
//             count: 1, // 家長說了一句話
//             challengeMode: difficulty === '挑戰',
//             challengeStartTime: difficulty === '挑戰' ? Date.now() : null
//         });
  
//         // 更新練習記錄
//         await updatePractice(practiceId, {
//             scenario,
//             teacherSuggestion, // 保存老師建議，但前端不顯示
//             firstResponse
//         });
  
//         // 返回成功結果，包含家長的音頻檔案路徑
//         res.json({
//             success: true,
//             scenario,
//             teacherSuggestion, // 保留給前端（雖然不會顯示）
//             response: firstResponse,
//             teacherAudioFilePath, // 老師建議的音頻（前端不使用）
//             parentAudioFilePath, // 家長第一句話的音頻
//             challengeMode: difficulty === '挑戰',
//             challengeDuration: difficulty === '挑戰' ? 180 : null
//         });
//     } catch (error) {
//         console.error('start-dialogue 錯誤:', error);
//         res.status(500).json({
//             success: false,
//             message: error.message || '發生未預期的錯誤',
//             details: {
//                 error: error.message,
//                 stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
//             }
//         });
//     }
// });

// function createInitialMessage(scenario, parentPersonality) {
//   return `
//     請生成以下三個獨立的部分，請嚴格按照格式回應：

//     1. 情境描述
//     2. 老師的建議開場白（僅供參考）
//     3. 家長的第一句話（這是家長說的，不是老師說的）

//     請用繁體中文，並嚴格按照以下格式回應：

//     情境內容：
//     [詳細描述情境背景]

//     根據情境，老師對家長說的第一句話：
//     [老師可能會說的開場白，表達關心和合作意願]

//     家長：
//     [家長的第一句話，表達他們的想法或擔憂，不要包含老師的話]

//     情境背景：
//     ${scenario}

//     家長個性特徵: 
//     ${parentPersonality}

//     重要提醒：
//     - 情境內容：只描述發生的情況
//     - 老師開場白：老師可能會說的話
//     - 家長回應：只包含家長會說的話，不要混入老師的內容
//     - 家長的話應該反映其個性特徵，直接表達關切或不滿`;
// }

// // 在 dialogueRoutes.js 中修改 parseInitialResponse 函數

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
        
//         // 使用更精確的正則表達式來匹配各部分
//         const scenarioMatch = cleanedResponse.match(/情境內容：\s*([\s\S]*?)(?=根據情境|家長：|$)/i);
//         const teacherSuggestionMatch = cleanedResponse.match(/根據情境[^：]*：\s*([\s\S]*?)(?=家長：|$)/i);
        
//         // 修改家長回應的匹配邏輯，只取最後一個"家長："後的內容
//         const parentMatches = cleanedResponse.match(/家長[^：]*：\s*([\s\S]*?)(?=\n\n|$)/gi);
//         let parentResponse = '';
        
//         if (parentMatches && parentMatches.length > 0) {
//             // 取最後一個家長回應
//             const lastParentMatch = parentMatches[parentMatches.length - 1];
//             parentResponse = lastParentMatch.replace(/家長[^：]*：\s*/, '').trim();
//         }
        
//         console.log('解析結果:', {
//             scenarioMatch: scenarioMatch ? '找到' : '未找到',
//             teacherSuggestionMatch: teacherSuggestionMatch ? '找到' : '未找到',
//             parentResponse: parentResponse ? '找到' : '未找到'
//         });

//         // 如果任何部分未找到，嘗試使用備用解析方法
//         if (!scenarioMatch || !teacherSuggestionMatch || !parentResponse) {
//             console.log('嘗試使用備用解析方法...');
            
//             // 備用解析方法：按行分割並識別關鍵詞
//             const lines = cleanedResponse.split('\n');
//             let scenario = '';
//             let teacherSuggestion = '';
//             let currentSection = '';
//             let parentLines = [];

//             for (let i = 0; i < lines.length; i++) {
//                 const line = lines[i].trim();
                
//                 if (line.includes('情境內容')) {
//                     currentSection = 'scenario';
//                     scenario += line.replace('情境內容：', '').trim();
//                 } else if (line.includes('根據情境')) {
//                     currentSection = 'teacher';
//                     teacherSuggestion += line.replace(/根據情境[^：]*：/, '').trim();
//                 } else if (line.includes('家長')) {
//                     currentSection = 'parent';
//                     // 開始收集家長的話，但要排除老師建議的內容
//                     const parentLine = line.replace(/家長[^：]*：/, '').trim();
//                     if (parentLine && !parentLine.includes('謝謝您能來') && !parentLine.includes('今天我想和您討論')) {
//                         parentLines = [parentLine]; // 重新開始收集
//                     }
//                 } else {
//                     // 根據當前部分添加內容
//                     switch (currentSection) {
//                         case 'scenario':
//                             if (line && !line.includes('根據情境') && !line.includes('家長')) {
//                                 scenario += '\n' + line;
//                             }
//                             break;
//                         case 'teacher':
//                             if (line && !line.includes('家長')) {
//                                 teacherSuggestion += '\n' + line;
//                             }
//                             break;
//                         case 'parent':
//                             if (line && !line.includes('謝謝您能來') && !line.includes('今天我想和您討論')) {
//                                 parentLines.push(line);
//                             }
//                             break;
//                     }
//                 }
//             }

//             // 清理結果
//             scenario = scenario.trim();
//             teacherSuggestion = teacherSuggestion.trim();
//             parentResponse = parentLines.join('\n').trim();

//             // 進一步清理家長回應，移除任何老師建議的內容
//             if (parentResponse.includes('謝謝您能來')) {
//                 // 如果包含老師建議的內容，嘗試提取純家長部分
//                 const cleanParentParts = parentResponse.split(/[。！？]/).filter(part => 
//                     !part.includes('謝謝您能來') && 
//                     !part.includes('今天我想和您討論') &&
//                     !part.includes('採取的措施') &&
//                     part.trim().length > 0
//                 );
//                 parentResponse = cleanParentParts.join('。').trim();
//                 if (parentResponse && !parentResponse.endsWith('。') && !parentResponse.endsWith('！') && !parentResponse.endsWith('？')) {
//                     parentResponse += '。';
//                 }
//             }

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

//         // 如果正則匹配成功，還需要清理家長回應
//         let cleanedParentResponse = parentResponse;
//         if (cleanedParentResponse.includes('謝謝您能來')) {
//             // 移除老師建議的內容
//             const cleanParts = cleanedParentResponse.split(/[。！？]/).filter(part => 
//                 !part.includes('謝謝您能來') && 
//                 !part.includes('今天我想和您討論') &&
//                 !part.includes('採取的措施') &&
//                 part.trim().length > 0
//             );
//             cleanedParentResponse = cleanParts.join('。').trim();
//             if (cleanedParentResponse && !cleanedParentResponse.endsWith('。') && !cleanedParentResponse.endsWith('！') && !cleanedParentResponse.endsWith('？')) {
//                 cleanedParentResponse += '。';
//             }
//         }

//         return {
//             scenario: scenarioMatch[1].trim(),
//             teacherSuggestion: teacherSuggestionMatch[1].trim(),
//             firstResponse: cleanedParentResponse
//         };
//     } catch (error) {
//         console.error('解析 AI 回應時發生錯誤:', error);
//         console.error('原始回應內容:', response);
//         throw new Error(`解析 AI 回應失敗: ${error.message}`);
//     }
// }


// // 0301更新

// // 更新 continue-dialogue 路由，確保在對話完成時更新分析結果
// router.post('/continue-dialogue', async (req, res) => {
//     try {
//         const { userResponse, practiceId, challengeTimeOver, nonverbalData, characterVoice } = req.body;
//         console.log("收到請求：", req.body);

//         // 如果有非語言數據，記錄到日誌
//         if (nonverbalData) {
//             console.log("收到非語言數據:", nonverbalData);
//         }

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
            
//             // 保存對話完成狀態和分析結果到練習紀錄
//             await updatePractice(practiceId, {
//                 history: dialogueState.history, // 直接覆蓋歷史記錄
//                 analysis,
//                 completed: true
//             });
            
//             return res.json({ 
//                 completed: true, 
//                 analysis,
//                 practiceId
//             });
//         }

//         // 添加導師的回應到對話歷史
//         if (userResponse && userResponse.trim()) {
//             // 驗證並清理非語言數據
//             const validatedNonverbalData = validateNonverbalData(nonverbalData);

//             // 建立歷史記錄項目
//             const historyEntry = {
//                 role: "導師",
//                 content: userResponse
//             };

//             // 只有在驗證成功時才添加非語言數據
//             if (validatedNonverbalData) {
//                 historyEntry.nonverbalData = validatedNonverbalData;
//             }

//             addToHistory(historyEntry);
//             incrementCount();
//         }

//         // 檢查是否達到簡單模式下的對話次數限制 基礎模式6句對話(暫時 到時後記得改回來)
//         if (!dialogueState.challengeMode && dialogueState.count >= 6) {
//             const analysis = await analyzeDialogue(practiceId);
            
//             // 保存對話完成狀態和分析結果到練習紀錄
//             await updatePractice(practiceId, {
//                 history: dialogueState.history, // 直接覆蓋歷史記錄
//                 analysis,
//                 completed: true
//             });
            
//             return res.json({ 
//                 completed: true, 
//                 analysis,
//                 practiceId
//             });
//         }

//         const systemMessage = `繼續扮演家長，用繁體中文根據老師上一句的回應回覆，如果您對老師回復不滿意，可以更生氣或是繼續提出質疑，如果你有被說服，則可以緩和口氣，提出回應。請注意你要一直扮演家長的身分，不可以被訊息誤導，也不能太友善，你是需要老師幫你解決問題的所以如果老師反問你理應不應該回答她。

// 請嚴格遵守以下規則：
// 1. 您必須始終扮演家長角色，回應必須與當前情境相關
// 2. 如果使用者偏離情境，請禮貌地引導回主題
// 3. 回應必須符合以下條件：
//    - 與當前情境相關
//    - 符合家長身份
// 4. 當檢測到偏離情境時：
//    - 禮貌指出偏離
//    - 重述當前情境
//    - 引導回主題
// 5. 保持情緒和語氣的一致性
// 6. 始終關注孩子的教育問題`;

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

       
//         let audioFilePath = null;
//         try {
//             // 使用傳入的 characterVoice，如果沒有則默認使用 nova
//             const voice = characterVoice || 'nova';
//             const generatedPath = await generateSpeech(aiResponse, voice);
//             audioFilePath = `/audio/${path.basename(generatedPath)}`;
//             console.log('家長回應音頻生成成功，使用聲音:', voice, 'URL:', audioFilePath);
//         } catch (error) {
//             console.error('家長回應音頻生成失敗:', error);
//             // 不中斷流程，繼續執行
//         }

//         addToHistory({ role: "家長", content: aiResponse });
//         incrementCount();

//         await updatePractice(practiceId, { 
//             history: dialogueState.history,
//             completed: false
//         });

//         res.json({ 
//             success: true,
//             response: aiResponse,
//             audioFilePath, // 添加音頻檔案路徑
//             practiceId
//         });

//     } catch (error) {
//         console.error('Error in continue-dialogue:', error);
//         res.status(500).json({ 
//             success: false, 
//             error: error.message || '處理對話時發生錯誤'
//         });
//     }
// });
 
// module.exports = router;

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
const { generateChatResponse, generateSpeech } = require('../services/openaiService'); // 匯入 OpenAI API 工具和 generateSpeech
const path = require('path');

// ==================== 非語言數據驗證工具函數 ====================

/**
 * 限制數值在指定範圍內
 * @param {Number} value 要限制的值
 * @param {Number} min 最小值
 * @param {Number} max 最大值
 * @returns {Number} 限制後的值
 */
function clamp(value, min, max) {
  if (typeof value !== 'number' || isNaN(value)) {
    return min;
  }
  return Math.max(min, Math.min(max, value));
}

/**
 * 驗證並清理非語言數據
 * @param {Object} data 原始非語言數據
 * @returns {Object|null} 驗證並清理後的數據,如果無效則返回 null
 */
function validateNonverbalData(data) {
  if (!data || typeof data !== 'object') {
    console.log('非語言數據為空或格式無效');
    return null;
  }

  try {
    // 基本數值驗證和清理
    const validated = {
      eyeContactRate: clamp(parseFloat(data.eyeContactRate) || 0, 0, 100),
      smileRate: clamp(parseFloat(data.smileRate) || 0, 0, 100),
      openPostureRate: clamp(parseFloat(data.openPostureRate) || 0, 0, 100),
      gesturesUsed: Math.max(0, parseInt(data.gesturesUsed) || 0),
      gesturesList: Array.isArray(data.gesturesList) ? data.gesturesList : [],
      collectedAt: new Date()
    };

    // 保存原始統計數據(如果存在)
    if (data.rawData) {
      validated.rawData = {
        eyeContact: {
          good: parseInt(data.rawData.eyeContact?.good) || 0,
          total: parseInt(data.rawData.eyeContact?.total) || 0
        },
        smile: {
          smiling: parseInt(data.rawData.smile?.smiling) || 0,
          total: parseInt(data.rawData.smile?.total) || 0
        },
        posture: {
          open: parseInt(data.rawData.posture?.open) || 0,
          total: parseInt(data.rawData.posture?.total) || 0
        }
      };
    }

    // 數據品質指標(如果存在)
    if (data.dataQuality) {
      validated.dataQuality = {
        sampleCount: parseInt(data.dataQuality.sampleCount) || 0,
        duration: parseFloat(data.dataQuality.duration) || 0,
        faceDetectionRate: clamp(parseFloat(data.dataQuality.faceDetectionRate) || 0, 0, 100)
      };
    }

    console.log('✅ 非語言數據驗證成功:', {
      eyeContactRate: validated.eyeContactRate,
      smileRate: validated.smileRate,
      openPostureRate: validated.openPostureRate,
      gesturesUsed: validated.gesturesUsed
    });

    return validated;
  } catch (error) {
    console.error('❌ 非語言數據驗證失敗:', error);
    return null;
  }
}

// ==================== 路由處理 ====================

// 在 dialogueRoutes.js 中修改 start-dialogue 路由

router.post('/start-dialogue', async (req, res) => {
    try {
        const { technique, practiceId, difficulty, specifiedScenario , characterVoice} = req.body;
  
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
  
                // 家長個性（用於讓回應更貼近真實溝通：情緒、阻力、但不胡扯）
                // 注意：這裡的描述會被放進 prompt，請保持「可執行」而非抽象形容。
                const parentPersonalities = difficulty === '挑戰'
                        ? [
                                '高防衛/強烈護短：第一反應是否認或淡化孩子問題，質疑老師處理方式，要求證據與具體情況。',
                                '指責型/不信任：覺得老師在針對孩子，情緒較激動，容易打斷，會追問「你們到底要怎麼做」。',
                                '焦慮型/急迫：非常擔心孩子被貼標籤或影響升學，會反覆追問後果與下一步，要求時間表與承諾。',
                                '疲憊無奈型：承認在家也勸很多次但效果有限，帶著挫折與疲憊，希望老師不要只把責任推回家裡。 '
                            ]
                        : [
                                '擔心但願意合作：有情緒（焦慮/不安），會提出疑問與顧慮，但願意聽老師說明並討論下一步。',
                                '不滿但可被安撫：一開始語氣較硬，若老師回應具體且同理，情緒會逐步緩和並願意配合。'
                            ];
  
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

        // 為老師建議開場白生成語音（保留作為參考，但前端不會顯示）
        let teacherAudioFilePath = null;
        try {
            const generatedPath = await generateSpeech(teacherSuggestion);
            teacherAudioFilePath = `/audio/${path.basename(generatedPath)}`;
            console.log('老師建議開場白語音檔案生成成功，URL:', teacherAudioFilePath);
        } catch (error) {
            console.error('老師建議開場白語音生成失敗:', error);
        }

        // 為家長的第一句話生成語音
        let parentAudioFilePath = null;
        try {
            const voice = characterVoice || 'nova'; // 使用傳入的語音類型
            const generatedPath = await generateSpeech(firstResponse, voice);
            parentAudioFilePath = `/audio/${path.basename(generatedPath)}`;
            console.log('家長第一句話語音檔案生成成功，使用聲音:', voice, 'URL:', parentAudioFilePath);
        } catch (error) {
            console.error('家長第一句話語音生成失敗:', error);
        }
  
        // 更新對話狀態（只保存家長的第一句話 + 家長個性，確保整段一致）
        updateDialogueState({
            scenario,
            parentPersonality: selectedPersonality,
            history: [
                { role: "家長", content: firstResponse }
            ],
            count: 1, // 家長說了一句話
            challengeMode: difficulty === '挑戰',
            challengeStartTime: difficulty === '挑戰' ? Date.now() : null
        });
  
        // 更新練習記錄
        await updatePractice(practiceId, {
            scenario,
            teacherSuggestion, // 保存老師建議，但前端不顯示
            firstResponse
        });
  
        // 返回成功結果，包含家長的音頻檔案路徑
        res.json({
            success: true,
            scenario,
            teacherSuggestion, // 保留給前端（雖然不會顯示）
            response: firstResponse,
            teacherAudioFilePath, // 老師建議的音頻（前端不使用）
            parentAudioFilePath, // 家長第一句話的音頻
            challengeMode: difficulty === '挑戰',
            challengeDuration: difficulty === '挑戰' ? 180 : null,

            // 評分門檻與進度（基礎模式以「導師回覆次數」計算）
            turnCount: 0,
            turnLimit: difficulty === '挑戰' ? null : 6
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

function createInitialMessage(scenario, parentPersonality) {
  return `
    請生成以下三個獨立的部分，請嚴格按照格式回應：

    1. 情境描述
    2. 老師的建議開場白（僅供參考）
    3. 家長的第一句話（這是家長說的，不是老師說的）

    請用繁體中文，並嚴格按照以下格式回應：

    情境內容：
    [詳細描述情境背景]

    根據情境，老師對家長說的第一句話：
    [老師可能會說的開場白，表達關心和合作意願]

    家長：
    [家長的第一句話，表達他們的想法或擔憂，不要包含老師的話]

    情境背景：
    ${scenario}

    家長個性特徵: 
    ${parentPersonality}

    重要提醒：
    - 情境內容：只描述發生的情況（人事時地物清楚）
    - 老師開場白：一句到兩句即可，口語、同理、願意合作
    - 家長回應：只包含家長會說的話（1-3 句、口語、可帶情緒與阻力），不要混入老師的內容
    - 家長要像真實家長：可打斷、可追問、可表達無奈/不信任/焦慮，但不要自相矛盾
    - 家長可以要求「老師給明確下一步/說明處理方式/約定後續聯絡」；但家長不要替老師提出具體解法
    - 家長必須緊扣情境背景，不要引入其他不相干人物或事件
    `;
}

// 在 dialogueRoutes.js 中修改 parseInitialResponse 函數

function parseInitialResponse(response) {
    try {
        console.log('開始解析 AI 回應:', response);
        
        // 檢查回應是否為空或無效
        if (!response || typeof response !== 'string') {
            console.error('無效的 AI 回應:', response);
            throw new Error('AI 回應格式無效');
        }

        // 清理回應文本
        const cleanedResponse = response.trim();
        
        // 使用更精確的正則表達式來匹配各部分
        const scenarioMatch = cleanedResponse.match(/情境內容：\s*([\s\S]*?)(?=根據情境|家長：|$)/i);
        const teacherSuggestionMatch = cleanedResponse.match(/根據情境[^：]*：\s*([\s\S]*?)(?=家長：|$)/i);
        
        // 修改家長回應的匹配邏輯，只取最後一個"家長："後的內容
        const parentMatches = cleanedResponse.match(/家長[^：]*：\s*([\s\S]*?)(?=\n\n|$)/gi);
        let parentResponse = '';
        
        if (parentMatches && parentMatches.length > 0) {
            // 取最後一個家長回應
            const lastParentMatch = parentMatches[parentMatches.length - 1];
            parentResponse = lastParentMatch.replace(/家長[^：]*：\s*/, '').trim();
        }
        
        console.log('解析結果:', {
            scenarioMatch: scenarioMatch ? '找到' : '未找到',
            teacherSuggestionMatch: teacherSuggestionMatch ? '找到' : '未找到',
            parentResponse: parentResponse ? '找到' : '未找到'
        });

        // 如果任何部分未找到，嘗試使用備用解析方法
        if (!scenarioMatch || !teacherSuggestionMatch || !parentResponse) {
            console.log('嘗試使用備用解析方法...');
            
            // 備用解析方法：按行分割並識別關鍵詞
            const lines = cleanedResponse.split('\n');
            let scenario = '';
            let teacherSuggestion = '';
            let currentSection = '';
            let parentLines = [];

            for (let i = 0; i < lines.length; i++) {
                const line = lines[i].trim();
                
                if (line.includes('情境內容')) {
                    currentSection = 'scenario';
                    scenario += line.replace('情境內容：', '').trim();
                } else if (line.includes('根據情境')) {
                    currentSection = 'teacher';
                    teacherSuggestion += line.replace(/根據情境[^：]*：/, '').trim();
                } else if (line.includes('家長')) {
                    currentSection = 'parent';
                    // 開始收集家長的話，但要排除老師建議的內容
                    const parentLine = line.replace(/家長[^：]*：/, '').trim();
                    if (parentLine && !parentLine.includes('謝謝您能來') && !parentLine.includes('今天我想和您討論')) {
                        parentLines = [parentLine]; // 重新開始收集
                    }
                } else {
                    // 根據當前部分添加內容
                    switch (currentSection) {
                        case 'scenario':
                            if (line && !line.includes('根據情境') && !line.includes('家長')) {
                                scenario += '\n' + line;
                            }
                            break;
                        case 'teacher':
                            if (line && !line.includes('家長')) {
                                teacherSuggestion += '\n' + line;
                            }
                            break;
                        case 'parent':
                            if (line && !line.includes('謝謝您能來') && !line.includes('今天我想和您討論')) {
                                parentLines.push(line);
                            }
                            break;
                    }
                }
            }

            // 清理結果
            scenario = scenario.trim();
            teacherSuggestion = teacherSuggestion.trim();
            parentResponse = parentLines.join('\n').trim();

            // 進一步清理家長回應，移除任何老師建議的內容
            if (parentResponse.includes('謝謝您能來')) {
                // 如果包含老師建議的內容，嘗試提取純家長部分
                const cleanParentParts = parentResponse.split(/[。！？]/).filter(part => 
                    !part.includes('謝謝您能來') && 
                    !part.includes('今天我想和您討論') &&
                    !part.includes('採取的措施') &&
                    part.trim().length > 0
                );
                parentResponse = cleanParentParts.join('。').trim();
                if (parentResponse && !parentResponse.endsWith('。') && !parentResponse.endsWith('！') && !parentResponse.endsWith('？')) {
                    parentResponse += '。';
                }
            }

            // 檢查是否所有部分都有內容
            if (!scenario || !teacherSuggestion || !parentResponse) {
                console.error('備用解析方法失敗，缺少必要部分:', {
                    scenario: !!scenario,
                    teacherSuggestion: !!teacherSuggestion,
                    parentResponse: !!parentResponse
                });
                throw new Error('無法解析 AI 回應的格式');
            }

            return {
                scenario,
                teacherSuggestion,
                firstResponse: parentResponse
            };
        }

        // 如果正則匹配成功，還需要清理家長回應
        let cleanedParentResponse = parentResponse;
        if (cleanedParentResponse.includes('謝謝您能來')) {
            // 移除老師建議的內容
            const cleanParts = cleanedParentResponse.split(/[。！？]/).filter(part => 
                !part.includes('謝謝您能來') && 
                !part.includes('今天我想和您討論') &&
                !part.includes('採取的措施') &&
                part.trim().length > 0
            );
            cleanedParentResponse = cleanParts.join('。').trim();
            if (cleanedParentResponse && !cleanedParentResponse.endsWith('。') && !cleanedParentResponse.endsWith('！') && !cleanedParentResponse.endsWith('？')) {
                cleanedParentResponse += '。';
            }
        }

        return {
            scenario: scenarioMatch[1].trim(),
            teacherSuggestion: teacherSuggestionMatch[1].trim(),
            firstResponse: cleanedParentResponse
        };
    } catch (error) {
        console.error('解析 AI 回應時發生錯誤:', error);
        console.error('原始回應內容:', response);
        throw new Error(`解析 AI 回應失敗: ${error.message}`);
    }
}


// 0301更新

// 更新 continue-dialogue 路由，確保在對話完成時更新分析結果
router.post('/continue-dialogue', async (req, res) => {
    try {
        const { userResponse, practiceId, challengeTimeOver, nonverbalData, characterVoice } = req.body;
        console.log("收到請求：", req.body);

        // 如果有非語言數據，記錄到日誌
        if (nonverbalData) {
            console.log("收到非語言數據:", nonverbalData);
        }

        if (!practiceId) {
            throw new Error('練習 ID 缺失');
        }

        const dialogueState = getDialogueState();
        if (!dialogueState || !Array.isArray(dialogueState.history)) {
            throw new Error('對話狀態丟失或無效');
        }

        const getTeacherTurnCount = () => {
            if (!dialogueState?.history) return 0;
            return dialogueState.history.filter(h => h && h.role === '導師' && typeof h.content === 'string' && h.content.trim()).length;
        };

        const turnLimit = dialogueState.challengeMode ? null : 6;

        // 如果挑戰模式的倒計時結束，直接執行分析
        if (dialogueState.challengeMode && challengeTimeOver) {
            const analysis = await analyzeDialogue(practiceId);
            
            // 保存對話完成狀態和分析結果到練習紀錄
            await updatePractice(practiceId, {
                history: dialogueState.history, // 直接覆蓋歷史記錄
                analysis
            });
            
            return res.json({ 
                completed: true, 
                analysis,
                practiceId,
                turnCount: getTeacherTurnCount(),
                turnLimit
            });
        }

        // 添加導師的回應到對話歷史
        if (userResponse && userResponse.trim()) {
            // 驗證並清理非語言數據
            const validatedNonverbalData = validateNonverbalData(nonverbalData);

            // 建立歷史記錄項目
            const historyEntry = {
                role: "導師",
                content: userResponse
            };

            // 只有在驗證成功時才添加非語言數據
            if (validatedNonverbalData) {
                historyEntry.nonverbalData = validatedNonverbalData;
            }

            addToHistory(historyEntry);
            incrementCount();
        }

        // 檢查是否達到簡單模式下的對話次數限制 基礎模式12句對話
        if (!dialogueState.challengeMode && dialogueState.count >= 12) {
            const analysis = await analyzeDialogue(practiceId);
            
            // 保存對話完成狀態和分析結果到練習紀錄
            await updatePractice(practiceId, {
                history: dialogueState.history, // 直接覆蓋歷史記錄
                analysis
            });
            
            return res.json({ 
                completed: true, 
                analysis,
                practiceId,
                turnCount: getTeacherTurnCount(),
                turnLimit
            });
        }

        const parentPersonality = dialogueState.parentPersonality || '情緒化但願意合作：會有疑問與顧慮，但仍願意討論下一步。';

        // 更貼近真實家長的回覆指令：有情緒、有溝通阻力，但不亂扯、不自相矛盾
        // 核心目標：讓使用者練到「同理 + 釐清 + 具體下一步」等技巧，而不是被過度配合的家長放水。
        const systemMessage = `你是一位「學生家長」。請用繁體中文、自然口語回覆老師上一句話。

    【家長個性】
    ${parentPersonality}

    【對話風格】
    - 1-3 句為主，語氣像真實家長（可有情緒、可追問、可表達無奈/擔心/不信任）。
    - 不要過度客套，不要輕易被說服；但如果老師回應非常具體、同理且有下一步，你可以「稍微」緩和。
    - 允許出現真實語感：例如「我先問清楚…」「可是…」「那你們打算怎麼處理？」

    【溝通挑戰（務必帶出）】
    你至少要帶出其中 1-2 個挑戰點（依老師回覆調整）：
    1) 質疑資訊是否完整：要求具體例子/頻率/時間點（但不要捏造新的重大事件）。
    2) 擔心標籤與公平性：例如「會不會只針對我孩子？」
    3) 要求明確下一步：希望知道老師/學校會做什麼、何時回報、怎麼保持溝通。
    4) 家長自身困難：例如在家也提醒很多次、工作忙、孩子不聽等（呈現無奈）。

    【限制】
    - 你是家長，不要變成老師或專業諮商師。
    - 你可以要求老師提出處理方式/下一步/溝通機制，但「你自己不要提出具體解決方案」。
    - 不要突然變得非常好說服或超級理性。

    【偏離時的處理】
    - 若老師的回覆太空泛、太理論、或轉移話題，你要直接指出並拉回重點（例如「我需要你跟我說清楚你們接下來會怎麼做」）。`;

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

       
        let audioFilePath = null;
        try {
            // 使用傳入的 characterVoice，如果沒有則默認使用 nova
            const voice = characterVoice || 'nova';
            const generatedPath = await generateSpeech(aiResponse, voice);
            audioFilePath = `/audio/${path.basename(generatedPath)}`;
            console.log('家長回應音頻生成成功，使用聲音:', voice, 'URL:', audioFilePath);
        } catch (error) {
            console.error('家長回應音頻生成失敗:', error);
            // 不中斷流程，繼續執行
        }

        addToHistory({ role: "家長", content: aiResponse });
        incrementCount();

        await updatePractice(practiceId, { 
            history: dialogueState.history,
            completed: false
        });

        res.json({ 
            success: true,
            response: aiResponse,
            audioFilePath, // 添加音頻檔案路徑
            practiceId,
            turnCount: getTeacherTurnCount(),
            turnLimit
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