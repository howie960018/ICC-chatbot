const { generateChatResponse } = require('./openaiService');
const { getDialogueState } = require('./dialogueService');

async function analyzeDialogue(res) {
  const dialogueState = getDialogueState();
  const conversationHistory = dialogueState.history.map(entry => 
    `${entry.role}: ${entry.content}`
  ).join('\n');

  let prompt = '';

  if (dialogueState.technique === '我訊息') {
    prompt = generateIMessagePrompt(conversationHistory);
  } else if (dialogueState.technique === '三明治溝通法') {
    prompt = generateSandwichPrompt(conversationHistory);
  } else if (dialogueState.technique === '綜合溝通技巧') {
    prompt = generateComprehensivePrompt(conversationHistory);
  } else {
    prompt = generateDefaultPrompt(conversationHistory);
  }

  try {
    const analysis = await generateChatResponse([{ 
      role: "user", 
      content: prompt 
    }]);
    
    res.json({ analysis, completed: true });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'An error occurred while analyzing the dialogue.' });
  }
}

function generateIMessagePrompt(conversationHistory) {
  return ` 分析整段對話，針對導師的回應，用繁體中文分析是否正確使用了 我訊息 技巧(不用對家長給出分析建議)，給導師以下格式的分析，不用對家長給出分析建議，根據評量標準給予導師整段對話的表現等第、整體回饋與修正建議：
    
    我訊息分析：
    1. 具體描述對方行為：
    2. 說出自己主觀感受：
    3. 表達自己觀點立場：
    4. 提出未來改善作法：
    評量結果：
    整體回饋：
    修正建議：

    評分標準建議：
    優秀 (90-100 分)：全面展現「我訊息」溝通法，與家長互動自然且積極。
    良好 (80-89 分)：整體表現佳，但部分細節可強化。
    普通 (70-79 分)：基本達標，但溝通技巧需進一步優化。
    待改進 (60-69 分)：表現有不足，需加強多個溝通面向。
    不足 (60 分以下)：未能有效運用「我訊息」溝通法，溝通失敗或家長反感。
    
    對話歷史：
    ${conversationHistory}`;
}

function generateSandwichPrompt(conversationHistory) {
  return `分析整段對話，針對導師的回應，用繁體中文分析是否正確使用了 三明治溝通法 技巧(不用對家長給出分析建議)，三明治溝通法的參考評分標準:
    優秀 (90-100 分)：全面展現三明治溝通法，與家長互動極佳。
    良好 (80-89 分)：整體表現佳，有少許細節可改進。
    普通 (70-79 分)：基本達標，但需強化部分技巧。
    待改進 (60-69 分)：表現不夠完善，需多項改善。
    不足 (60 分以下)：未能有效運用三明治溝通法，溝通失敗。

    三明治溝通法分析：
    1. 第一層麵包（正向回饋）：
    2. 夾心部分（建設性批評或回饋）：
    3. 第二層麵包（再度正向回饋）：
   
    評量結果：
    整體回饋：
    修正建議：
    
    對話歷史：
    ${conversationHistory}`;
}

function generateComprehensivePrompt(conversationHistory) {
  return `用繁體中文分析整段對話，針對導師的回應，請根據積極傾聽、同理心、清晰表達、雙向溝通與解決問題導向這五項指標進行評估，並給出導師以下格式的分析，不用對家長給出分析建議：
    
    對話分析：
    1. 積極傾聽：
    2. 同理心：
    3. 清晰表達：
    4. 雙向溝通：
    5. 解決問題導向：
    修正建議：
    
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