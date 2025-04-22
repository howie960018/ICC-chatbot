const { generateChatResponse } = require('./openaiService');
const { getDialogueState } = require('./dialogueService');
const { updatePractice } = require('../services/practiceService'); // 引入練習更新服務

/**
 * 分析對話並將結果保存到練習紀錄
 * @param {String} practiceId 練習的 ID
 * @returns {String} 分析結果
 */
async function analyzeDialogue(practiceId) {

  const dialogueState = getDialogueState();

  if (!practiceId || !dialogueState || !dialogueState.history) {
      throw new Error('無效的練習 ID 或對話狀態');
  }

  const limitedHistory = dialogueState.history.slice(-15);
  const conversationHistory = limitedHistory.map(entry => `${entry.role}: ${entry.content}`).join('\n');
  const prompt = generatePrompt(dialogueState.technique, conversationHistory);

  try {

      const analysis = await generateChatResponse([{ role: "user", content: prompt }]);
      await updatePractice(practiceId, { analysis });
      return analysis;

  } catch (error) {

      console.error('Error during analysis:', error.message || error);
      throw new Error('分析過程中發生錯誤，請稍後重試');

  }
}

/**
 * 根據溝通技巧生成分析提示
 * @param {String} technique 溝通技巧名稱
 * @param {String} conversationHistory 對話歷史文本
 * @returns {String} 生成的分析提示
 */
function generatePrompt(technique, conversationHistory) {
  switch (technique) {
    case '我訊息':
      return generateIMessagePrompt(conversationHistory);
    case '三明治溝通法':
      return generateSandwichPrompt(conversationHistory);
    case '綜合溝通技巧':
      return generateComprehensivePrompt(conversationHistory);
    default:
      return generateDefaultPrompt(conversationHistory);
  }
}

/**
 * 我訊息的分析提示模板
 */
function generateIMessagePrompt(conversationHistory) {
  return `分析整段對話，針對導師的回應，評估是否正確使用了「我訊息」溝通技巧，並依照A至D的評分標準給予評分與詳細回饋。請不要分析家長的回應，僅針對導師的溝通表現進行評估。

    評分標準：
    A 等級 (優秀)：
    - A+：精準且流暢地運用「我訊息」四要素，語氣自然、情緒真誠，改善建議具體可行，與家長建立高信任關係。
    - A：能完整呈現「我訊息」技巧，語句清楚具說服力，與家長互動正向且有信任。
    - A-：大致掌握「我訊息」的要素，表達自然，但個別句向略顯籠統或語氣可再修飾，整體仍屬優秀表現。

    B 等級 (良好)：
    - B+：有意識使用「我訊息」，能清楚表達立場與感受，僅在細節（如描述具體行為或改善建議）略嫌不足。
    - B：展現「我訊息」主要結構，語句基本清楚，部分表達略顯含糊，互動品質良好。
    - B-：能有意識使用「我訊息」，語氣親切但略顯生硬，感受或改善建議描述不足。

    C 等級 (普通)：
    - C+：部分展現「我訊息」，能描述行為或立場，但情緒表達或改善建議略顯不足。
    - C：能使用「我訊息」的部分語句，但泛泛而談或句向過於簡略，清楚度與一致性不足。
    - C-：語句尚可理解，但未見「我訊息」基本結構，溝通效果有限。

    D 等級 (待改進)：
    - D+：嘗試進行回應溝通，但語句帶有情緒與模糊評價，無法明確表達自我與觀點。
    - D：回應中未見「我訊息」結構，語句造成防衛或對立。
    - D-：語句情緒強烈、責怪或否定家長或孩子觀點，導致未能建立有效溝通。

    特別注意：
    1. 如果導師的回應包含無關內容（如"請不吝點贊"等），應該大幅降低評分
    2. 如果導師完全偏離主題，應該給予較低的評分
    3. 如果導師能夠適當地回應並引導對話回到主題，可以給予較高的評分
    4. 評分應該完全基於導師的實際回應，不考慮任何建議開場白

    請依照以下格式提供分析結果：

    評分等第：[A+/A/A-/B+/B/B-/C+/C/C-/D+/D/D-]

    整體回饋：
    [簡要描述導師整體溝通表現與成效]

    我訊息分析：
    1. 具體描述對方行為：[分析導師如何描述學生行為，是否具體明確]
    2. 說出自己主觀感受：[分析導師是否清晰表達自己的情緒或感受]
    3. 表達自己觀點立場：[分析導師是否明確表達自己的觀點或期待]
    4. 提出未來改善作法：[分析導師是否提出具體可行的解決方案或建議]

    具體修正建議：
    [提供3-5點具體改進建議，幫助導師更有效運用「我訊息」技巧]

    對話歷史：
    ${conversationHistory}`;
}

function generateSandwichPrompt(conversationHistory) {
  return `分析整段對話，針對導師的回應，用繁體中文分析是否正確使用了三明治溝通法技巧(不用對家長給出分析建議)，給導師以下格式的分析，根據評量標準給予導師整段對話的表現等第、整體回饋與修正建議：

    三明治溝通法的參考評分標準:  
    評分等第：
    A 等：
    - A+：三層結構完整自然，語氣溫和真誠，內容具體深刻，常帶有合作語句。
    - A：三層結構清楚，語氣得體、邏輯順暢，有效促進親師理解與正向合作。
    - A-：三層皆有，但其中一層稍弱，語氣或內容略顯普通，仍具良好溝通品質。

    B 等：
    - B+：三層基本具備，語句清楚但略生硬，內容偏表面，正向語與建議可再強化。
    - B：三層結構有，但表現較表面，語氣普通，缺乏個人化或具體建議。
    - B-：結構略不平衡，有一層幾乎略過，語氣略顯命令或緊張。

    C 等：
    - C+：僅有兩層明顯出現，語氣尚可但內容略顯割裂，缺乏清楚邏輯。
    - C：三層皆有但語句模糊、邏輯不清，缺乏溝通策略意識。
    - C-：語句雖可理解，但三層結構不穩，情緒與邏輯銜接弱，溝通效果有限。

    D 等：
    - D+：幾乎只剩建議或批評，正向語缺乏，語氣偏命令或防衛。
    - D：未見三層結構，內容以問題或批評為主，親師關係疏離。
    - D-：用詞尖銳、責備性強，無正向語句，易引發家長反感或對立。

    評分：[填寫等第，如A+、B-等]

    整體回饋：
    [提供對導師溝通表現的整體評價]

    三明治溝通法分析：
    1. 第一層麵包（正向回饋）：
    [分析導師如何開始對話，給予家長哪些正向回饋]

    2. 夾心部分（建設性批評或回饋）：
    [分析導師如何提出問題或顧慮，表達方式是否得體有效]

    3. 第二層麵包（再度正向回饋）：
    [分析導師如何結束對話，給予哪些正面鼓勵或展望]

    具體修正建議：
    [提供3-5點具體改進建議，幫助導師更有效運用三明治溝通法]

    
    對話歷史：
    ${conversationHistory}`;
}

function generateComprehensivePrompt(conversationHistory) {
  return `用繁體中文分析整段對話，針對導師的回應，請根據以下四項指標進行評估，並給出導師以下格式的分析：

    評分標準：

    1. 情感表現：
    - A（優秀）：主動釋出善意，明顯展現理解與同理，語氣溫和尊重，親師關係正向發展。
    - B（良好）：願意溝通，語氣基本溫和，有部分回應展現理解但深度稍弱。
    - C（普通）：有回應但語氣偏制式，情緒語句或理解語句較少，親師互動效果一般。
    - D（待改進）：缺乏同理語句，語氣冷漠或緊張，易引起家長防衛或誤會。

    2. 內容回應：
    - A（優秀）：回應聚焦問題核心，根據家長語意做出恰當補充與引導建立共識，展現高度情境掌握力。
    - B（良好）：回應與情境相關，能釐清部分問題並提出合理立場與觀點，但尚未與家長建立共識。
    - C（普通）：有基本理解問題，但易停留在表層陳述，缺乏深入回應與引導。
    - D（待改進）：內容偏離重點，無法有效處理情境問題，易造成家長混淆或失落。

    3. 清晰表達：
    - A（優秀）：語言表達自然順暢，用詞精準恰當，結構明確，易於理解與建立信任。
    - B（良好）：多數語句清楚，用詞尚稱恰當，僅個別語意略顯模糊。
    - C（普通）：表達略顯籠統或用詞重複，有理解門檻或可能引起誤解。
    - D（待改進）：語句結構混亂、用詞不當或含糊，使家長無法理解教師意圖。

    4. 溝通技巧：
    - A（優秀）：恰當運用「我訊息」、「三明治溝通法」或其他正向溝通技巧，結構自然、效果良好。如無需使用技巧，語氣結構仍具高度專業。
    - B（良好）：有意識使用溝通技巧，結構清楚但稍顯制式，或僅使用部分技巧要素。如屬一般對話但語句得體，也可列入此級。
    - C（普通）：使用技巧較不穩定，語句與技巧搭配生硬。如為需技巧場景卻未使用，評為此級。
    - D（待改進）：缺乏技巧意識，或使用方式錯誤，導致效果反向或溝通失敗。

    注意：評語將根據情境是否適合技巧運用而彈性處理：若屬事務性對話，未使用技巧不會扣分；若屬敏感或需引導場景，則會依技巧使用與否給予相對等級。

    評分：
    情感表現：[A/B/C/D]
    內容回應：[A/B/C/D]
    清晰表達：[A/B/C/D]
    溝通技巧：[A/B/C/D]

    整體回饋：
    [提供對導師溝通表現的整體評價，包含優點和可改進之處]

    對話分析：
    1. 情感表現：
    [分析導師如何展現理解、同理和尊重，語氣是否適當]

    2. 內容回應：
    [分析導師回應的相關性、深度與是否能引導建立共識]

    3. 清晰表達：
    [分析導師的語言表達是否清晰、用詞是否精準、結構是否明確]

    4. 溝通技巧：
    [分析導師是否恰當運用溝通技巧，效果如何]

    具體修正建議：
    [提供3-5點具體改進建議，幫助導師提升溝通效果]

    
    對話歷史：
    ${conversationHistory}`;
}

function generateDefaultPrompt(conversationHistory) {
  return `分析整段對話，針對導師的回應，指出導師的表現以及如何改進。不用分析家長的，請開始分析：
    
    對話歷史：
    ${conversationHistory}`;
}

module.exports = {
  analyzeDialogue
};