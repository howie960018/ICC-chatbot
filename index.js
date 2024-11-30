const express = require('express');
const bodyParser = require('body-parser');
const OpenAI = require("openai");
const dotenv = require('dotenv');
const path = require('path');
const multer = require('multer');
const fs = require('fs');

dotenv.config();

// 確保 recordings 目錄存在
const recordingsDir = path.join(__dirname, 'recordings');
if (!fs.existsSync(recordingsDir)) {
  fs.mkdirSync(recordingsDir);
}

// 配置 multer 存儲
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, recordingsDir);
  },
  filename: function (req, file, cb) {
    const timestamp = Date.now();
    cb(null, `recording-${timestamp}.wav`);
  }
});

const upload = multer({ storage: storage });

const app = express();
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));
// 提供對 recordings 目錄的訪問
app.use('/recordings', express.static(recordingsDir));

const openai = new OpenAI({
  apiKey: process.env.API_KEY,
});

// 初始化對話狀態
let dialogueState = {
  count: 0,
  history: [],
  technique: '',
  scenario: '',
  recordings: []
};

// 定期清理舊的錄音文件
function cleanupOldRecordings() {
  const maxAge = 7 * 24 * 60 * 60 * 1000; // 7天
  const now = Date.now();

  fs.readdir(recordingsDir, (err, files) => {
    if (err) {
      console.error('讀取recordings目錄失敗:', err);
      return;
    }

    files.forEach(file => {
      const filePath = path.join(recordingsDir, file);
      fs.stat(filePath, (err, stats) => {
        if (err) {
          console.error('獲取文件信息失敗:', err);
          return;
        }

        if (now - stats.mtimeMs > maxAge) {
          fs.unlink(filePath, err => {
            if (err) {
              console.error('刪除舊錄音文件失敗:', err);
            }
          });
        }
      });
    });
  });
}

// 每天執行一次清理
setInterval(cleanupOldRecordings, 24 * 60 * 60 * 1000);

// 路由處理
app.get('/test', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'test.html'));
});

app.post('/transcribe', upload.single('audio'), async (req, res) => {
  try {
    if (!req.file) {
      throw new Error('沒有收到音頻文件');
    }

    try {
      const transcription = await openai.audio.transcriptions.create({
        file: fs.createReadStream(req.file.path),
        model: "whisper-1",
        language: "zh"
      });

      // 只保存文件名，不保存完整路徑
      dialogueState.recordings.push({
        timestamp: Date.now(),
        path: req.file.filename,  // 使用 filename 而不是完整路徑
        transcription: transcription.text
      });

      res.json({ text: transcription.text });

    } catch (error) {
      console.error('OpenAI API 錯誤:', error);
      res.status(500).json({ error: 'Audio transcription failed' });
    }

  } catch (error) {
    console.error('處理錯誤:', error);
    res.status(500).json({ error: error.message });
  }
});

// 添加日誌來查看獲取錄音記錄的請求
app.get('/recordings', (req, res) => {
  console.log('返回錄音記錄:', dialogueState.recordings);
  res.json(dialogueState.recordings);
});

// 添加一個路由來檢查文件是否存在
app.get('/check-recording/:filename', (req, res) => {
  const filePath = path.join(recordingsDir, req.params.filename);
  const exists = fs.existsSync(filePath);
  res.json({
    filename: req.params.filename,
    exists: exists,
    fullPath: filePath
  });
});




// 開始對話
app.post('/start-dialogue', async (req, res) => {
  const { technique } = req.body;
  dialogueState = {
    count: 0,
    history: [],
    technique: technique,
    scenario: '',
    recordings: []
  };

  try {
    const chatCompletion = await openai.chat.completions.create({
      messages: [{ 
        role: "user", 
        content: ` 
          請你跟我進行角色模擬，我扮演導師，我們兩個模擬對話。 對話結束後，請你評估我有沒有正確使用到「我訊息」或「三明治溝通法」 。 你是家長，不需要使用我訊息或三明治溝通法；但你等下模擬親師溝通的情境與問題，盡量讓我比較容易可以發揮"${dialogueState.technique}" 溝通方式導向的情境與回應，
                先生成一個情境，這個情境是要考驗老師的溝通技巧。你可以選擇要扮演1.能同理老師作法的明理家長 或是 2.想要了解原因，有點情緒但還算明理的家長 或是 3.比較相信孩子，較自我中心，雖情緒高漲，但還能溝通的家長 或是 4.完全無法接受他人觀點或建議，只想找情緒出口的家長。(四選一)
                生成的情境參考(不限定以下18種 可以做更多延伸或調整)：
1. 作業缺交情境
小華最近一個月內經常未按時繳交作業，老師多次提醒和鼓勵他，但情況依舊沒有改善，甚至繳交的作業量越來越少。因此老師希望與家長溝通，了解是否有家庭因素影響他的學習習慣，並一起協助他養成規律完成作業的習慣。
________________________________________
2. 說謊情境
小美在學校經常對老師和同學撒謊，例如她謊稱已完成作業或否認與同學的爭執。老師曾多次單獨與小美談話，強調誠實的重要性，試圖導正小美的偏差行為，但效果不佳。老師希望與家長聯繫，了解小美是否在家中也有類似行為，並共同協助她改變說謊習慣。
________________________________________
3. 偷竊情境
小明在學校發生了多次未經同學同意擅自拿取同學文具或搶同學零食的事件。直到被其他親眼目睹同學向老師告發小明才願意承認。老師已經與他討論過這些行為的不當性與老師的擔憂，但小明仍然沒有改變。因此決定與家長聯繫，了解小明的行為背後是否有家庭或心理方面的問題。
________________________________________
4. 同學衝突情境
小東在學校因情緒控管不佳，較以自我為中心的個性，已多次與同學發生肢體衝突，以動手當作處理問題的方式，每次衝突後，老師都與他談過並試圖教導他如何解決人際矛盾，但他仍然難以控制自己的情緒。老師擔心衝突會影響小東的同學關係，決定與家長討論，看看能否找到更有效的策略來幫助小東學會更好的衝突解決方式。
________________________________________
5. 言語霸凌情境
小婷經常用侮辱性語言欺負同學，特別針對一些比較內向的學生。老師已經幾次提醒小婷，也通過班級活動討論過尊重他人的重要性，但小婷的態度並沒有顯著改變。老師擔心這樣的行為會對受害同學造成長期影響，因此決定與家長聯繫，共同尋求解決方案。
________________________________________
6. 性別身體界線情境
小宏多次在學校不當觸碰異性同學，造成同學的不舒服，老師已經多次提醒他並與他談話，強調尊重他人身體界線的重要性。但小宏依然以此為惡作劇的方式，偶爾會重複類似行為。老師決定與家長聯繫，希望家長能夠從家庭中給予更多輔導。
________________________________________
7. 生活常規情境
小涵經過申請帶手機到學校，依規定放學後才能將手機拿出來聯繫使用。但小涵經常在課堂上偷偷使用手機，老師多次提醒，並暫時保管手機，放學歸還，但她依然沒有改變這一行為。老師發現小涵在課堂上的專注度越來越低、精神狀況不佳，學習成績也受到影響，因此決定與家長聯繫，了解是否能夠改善這一情況。
________________________________________
8. 上課遲到情境
小強連續多週每天都遲到，老師已經幾次提醒他提早準備，但小強表示是媽媽爬不起來，又不肯讓他自己去上學。但老師透過與同學側面的了解，小強經常半夜1、2點還在打遊戲，因此老師想要了解真實的狀況，以及與家長討論溝通，探討如何幫助小強改變遲到習慣。
________________________________________
9. 講髒話情境
小凡經常在課堂上或課間對同學講髒話，老師已經多次對他進行教育，但小凡的言語習慣依然沒有顯著改善，常常嚷嚷著我爸爸也都會說阿。老師擔心這樣的行為會對其他同學產生負面影響，於是決定與家長討論如何更有效地引導小凡改善言語習慣。
________________________________________
10. 傳清涼照片情境
小芸最近在班級群組裡傳了一些不適合年齡的清涼照片，老師已經多次警告她不應該在網絡上傳播這些內容，並且與她討論了網絡安全和尊重他人的重要性。然而，小芸的行為沒有改變，老師決定與家長聯繫，希望能夠在家庭中進行更多的網絡使用教育。
________________________________________
11. 在群組公開批評同學情境
小雄在班級LINE群組裡公開批評同學，使用了一些貶低的語言，例如下賤、低能等。老師已經與他談話，解釋這樣的行為會對他人的情感造成傷害，並進行了法治教育，但小雄並未改善。老師擔心這樣的行為會持續對班級氣氛造成影響，於是決定與家長聯繫，共同尋求改善方案。
________________________________________
12. 上課分心情境
小雪經常在課堂上分心，老師曾經試過調整座位、走動到她面前、邀請回答問題等方式，但她在課堂上的注意力仍然無法集中。老師感覺這樣的情況已經影響到她的學習進度，因此決定與家長溝通，了解是否在家中也有類似情況，並一起找出解決方案。
________________________________________
13. 威脅同學情境
小勇經常向同學借錢，威脅同學若不借錢，就要鼓動其他同學不跟他玩，且借錢也沒有還過。老師已經慎重私下與小勇教導這樣的行為涉及法律問題，並在班上適時地進行法治教育，但小勇的行為並未有所改善。老師決定與家長聯繫，了解是否在家中也有相關情況。
________________________________________
15. 課堂講話干擾情境
小瑋經常在課堂上與隔壁同學講話，干擾其他同學的學習，老師多次提醒他保持安靜，並試圖通過座位調整來改善，但問題依舊存在。老師感到無法有效解決此問題，決定與家長聯繫，希望家長能提供更多幫助。
________________________________________
16. 私自翻動他人物品情境
某天老師回到教室時，發現桌上的資料夾被翻過，裡面的評分表掉在地上。老師調查後，發現是小俊趁下課時打開抽屜，好奇地翻看老師的私人物品。當老師詢問他為什麼要這麼做時，小俊笑著說：「我只是想看看老師平常都在做什麼。」其他同學也抱怨：「他之前還翻過我們的鉛筆盒！」老師擔心這樣的行為侵犯隱私，並且與他人相處也產生衝突，因此決定聯繫家長，希望能提供更多幫助。 ________________________________________
17. 在考試中作弊情境
數學小考時，小安用課本墊在桌下假裝專心答題，實則趁老師不注意時偷偷翻閱答案。其他同學反映，小安考試前曾在群組裡說：「這次考試超難，但我有方法搞定！」當老師發現作弊並沒收考卷時，小安當場大喊：「不就看一下而已，有必要這麼嚴重嗎？」考試結束後，他還在班上散佈：「老師超愛針對我！」老師針對此項行為與小安溝通過程，發現小安很在意成績，但無法認知到自己的作法錯誤，決定與家長聯繫，希望從家長處了解小安在家的情形，已掌握資訊幫助小安改善行為狀況。________________________________________
18. 情緒困擾或壓力過大
小芸最近在課堂上經常發呆，有時甚至突然哭泣，但當老師關心時，她總是說：「沒事，不要問。」、「沉默拒絕表達」同學們反映她常一個人坐在角落，不願與人互動。導師擔心她可能遭遇家庭或同儕問題，但無法確定原因，因此想聯繫父母親確認孩子在家中的狀況，適度的提供小芸協助。________________________________________

  請說出對導師的第一句話。請按照以下格式回覆：

          情境內容：
          [描述情境]

          家長：
          [家長的第一句話]`
      }],
      model: "gpt-4o-mini",
    });
    const response = chatCompletion.choices[0].message.content.trim();
    
    const [scenarioPart, parentResponse] = response.split('家長：');
    
    dialogueState.scenario = scenarioPart.replace('情境內容：', '').trim();
    dialogueState.history.push({ role: "家長", content: parentResponse.trim() });
    dialogueState.count++;
    
    res.json({ 
      scenario: dialogueState.scenario, 
      response: parentResponse.trim() 
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'An error occurred while processing your request.' });
  }
});

// 繼續對話
app.post('/continue-dialogue', async (req, res) => {
  const { userResponse } = req.body;
  dialogueState.history.push({ role: "導師", content: userResponse });
  dialogueState.count++;

  if (dialogueState.count >= 6) {
    return analyzeDialogue(res);
  }

  try {
    const chatCompletion = await openai.chat.completions.create({
      messages: [
        { role: "system", content: "請根據老師上一句的回應回覆，繼續保持情緒激動及不客氣，如果您對老師回復不滿意，可以更生氣 或是繼續提出質疑，如果你有被說服，則可以緩和口氣，提出回應。" },
        ...dialogueState.history.map(entry => ({ 
          role: entry.role === "家長" ? "assistant" : "user", 
          content: entry.content 
        }))
      ],
      model: "gpt-4o-mini",
    });
    const response = chatCompletion.choices[0].message.content.trim();
    dialogueState.history.push({ role: "家長", content: response });
    dialogueState.count++;
    res.json({ response });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'An error occurred while processing your request.' });
  }
});

// 分析對話
async function analyzeDialogue(res) {
  const conversationHistory = dialogueState.history.map(entry => 
    `${entry.role}: ${entry.content}`
  ).join('\n');

  let prompt = '';

  if (dialogueState.technique === '我訊息') {
    prompt = ` 分析整段對話，針對導師的回應，分析是否正確使用了 我訊息 技巧(不用對家長給出分析建議)，給導師以下格式的分析，不用對家長給出分析建議，根據評量標準給予導師整段對話的表現等第、整體回饋與修正建議：
    
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
  } else if (dialogueState.technique === '三明治溝通法') {
    prompt = `分析整段對話，針對導師的回應，分析是否正確使用了 三明治溝通法 技巧(不用對家長給出分析建議)，三明治溝通法的參考評分標準:
    優秀 (90-100 分)：全面展現三明治溝通法，與家長互動極佳。
    良好 (80-89 分)：整體表現佳，有少許細節可改進。
    普通 (70-79 分)：基本達標，但需強化部分技巧。
    待改進 (60-69 分)：表現不夠完善，需多項改善。
    不足 (60 分以下)：未能有效運用三明治溝通法，溝通失敗。並給導師以下格式的分析，不用對家長給出分析建議，並根據評量規準給予導師整段對話的表現等第、整體回饋與修正建議 
。

    三明治溝通法分析：
    1. 第一層麵包（正向回饋）：
    2. 夾心部分（建設性批評或回饋）：
    3. 第二層麵包（再度正向回饋）：
   
    評量結果：
    整體回饋：
    修正建議：
    

    對話歷史：
    ${conversationHistory}`;
  } else if (dialogueState.technique === '綜合溝通技巧') {
    prompt = `分析整段對話，針對導師的回應，請根據積極傾聽、同理心、清晰表達、雙向溝通與解決問題導向這五項指標進行評估，並給出導師以下格式的分析，不用對家長給出分析建議：
    
    對話分析：
    1. 積極傾聽：
    2. 同理心：
    3. 清晰表達：
    4. 雙向溝通：
    5. 解決問題導向：
    修正建議：
    
    對話歷史：
    ${conversationHistory}`;
  } else {
    prompt = `分析整段對話，針對導師的回應，指出導師的表現以及如何改進。不用分析家長的，請開始分析：
    
    對話歷史：
    ${conversationHistory}`;
  }

  try {
    const chatCompletion = await openai.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "gpt-4o-mini",
    });
    const analysis = chatCompletion.choices[0].message.content.trim();
    res.json({ analysis, completed: true });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'An error occurred while analyzing the dialogue.' });
  }
}

const PORT = process.env.PORT || 3036;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});