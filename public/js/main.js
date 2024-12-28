// DOM 元素
const techniqueSelect = document.getElementById('techniqueSelect');
const startPracticeBtn = document.getElementById('startPracticeBtn');
const scenarioDisplay = document.getElementById('scenarioDisplay');
const dialogueDisplay = document.getElementById('dialogueDisplay');
const startRecordBtn = document.getElementById('startRecordBtn');
const stopRecordBtn = document.getElementById('stopRecordBtn');
const recordStatus = document.getElementById('recordStatus');
const analysisContent = document.getElementById('analysisContent');
const practiceSelect = document.getElementById('select-btn');
const difficultySelect = document.getElementById('difficultySelect'); 



// 全局變數
let countdownTimer = null; 
let challengeTimer = null; // 挑戰倒計時計時器
let countdownRemaining = 180; // 倒計時剩餘時間（以秒為單位）
let mediaRecorder = null;
let audioChunks = [];
let dialogueCount = 0;
let isWaitingForSubmission = false;
let submissionTimer = null;
let currentDialogueRecordings = [];
let isRecording = false;
const maxDialogues = 12;
const MAX_RECORDING_TIME = 20 * 1000; // 最大錄音時間，這裡設定為 20 秒
let currentAccumulatedText = '';

document.addEventListener('DOMContentLoaded', () => {
    const welcomeMessage = document.getElementById('welcomeMessage');
    const username = localStorage.getItem('username');

    const startRecordBtn = document.getElementById('startRecordBtn');
    const stopRecordBtn = document.getElementById('stopRecordBtn');

        // 預設禁用錄音按鈕
        startRecordBtn.disabled = true;
        stopRecordBtn.disabled = true;

    if (username) {
        welcomeMessage.textContent = `歡迎, ${username}`;
    } else {
        // 如果未登入，跳轉回登入頁面
        window.location.href = '/login';
    }
    const scenarioDisplay = document.getElementById('scenarioDisplay');
    const dialogueDisplay = document.getElementById('dialogueDisplay');

    scenarioDisplay.innerHTML = `
    <img src="/jpg/55.png" alt="Login Page Image" class="login-image" />
        <p>使用教學：</p>
        <ul>
            <li><strong>Step 1:</strong> 選擇溝通技巧與模式：</li>
            <ul>
                <li><strong>基礎模式：</strong>最多回應 6 句。</li>
                <li><strong>挑戰模式：</strong>限時 3 分鐘回應。</li>
            </ul>
            <li><strong>Step 2:</strong> 按下「開始練習」按鈕後，練習將開始。</li>
            <li><strong>Step 3:</strong> 根據家長的回應，按下「開始錄音」進行回應，完成後按「停止錄音」。系統將轉錄並分析您的回應。</li>
        </ul>
    `;

    dialogueDisplay.innerHTML = `
        <p>對話內容將顯示在這裡。開始練習後，家長的第一句話將出現在此。</p>
    `;

    const banner = document.querySelector('.site-banner');
    let lastScrollPosition = 0;

    window.addEventListener('scroll', () => {
        const currentScrollPosition = window.pageYOffset;

        if (currentScrollPosition > lastScrollPosition) {
            // 用户向下滚动，隐藏 banner
            banner.style.transform = 'translateY(-100%)';
        } else {
            // 用户向上滚动，显示 banner
            banner.style.transform = 'translateY(0)';
        }

        lastScrollPosition = currentScrollPosition;
    });


});

document.getElementById('logoutButton').addEventListener('click', () => {
    // 清除 localStorage
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    localStorage.removeItem('currentPracticeId'); // 清理練習 ID


    

    // 跳轉回登入頁面
    window.location.href = '/login';
});


// 在檔案開頭添加
function checkAuth() {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = '/login';
        return;
    }
}

async function refreshAuthToken() {
    try {
        const response = await fetch('/api/auth/verify', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (!response.ok) {
            throw new Error('Token 驗證失敗');
        }
        
        // Token 仍然有效，不需要更新
        return true;
    } catch (error) {
        console.error('Token 驗證失敗:', error);
        // Token 無效，重導向到登入頁面
        window.location.href = '/login';
        return false;
    }
}

// 定期檢查 token
setInterval(refreshAuthToken, 5 * 60 * 1000); // 每5分鐘檢查一次

// 在選擇練習時
async function selectPractice(practiceId) {
    currentPracticeId = practiceId; // 更新當前練習 ID
    localStorage.setItem('currentPracticeId', practiceId); // 儲存到 LocalStorage
    await loadPracticeDetails(practiceId); // 加載詳細內容
    await loadRecordingsHistory(practiceId); // 加載錄音歷史
}

async function loadPracticeDetails(practiceId) {
    const token = localStorage.getItem('token');

    const response = await fetch(`/api/practice/practices/${practiceId}`, {
        headers: { Authorization: `Bearer ${token}` }
    });
    const data = await response.json();

    if (data.success) {
        displayPracticeDetails(data.practice); // 將返回的練習數據渲染到 UI

        await loadFeedbackList(practiceId); // 自動載入該練習的心得清單
    } else {
        console.error('Failed to load practice details:', data.message);
    }
}



// 顯示練習詳細資訊
function displayPracticeDetails(practice) {

    

    // 示例：顯示練習溝通技巧和分析結果
    const techniqueDisplay = document.getElementById('scenarioDisplay');

    techniqueDisplay.innerHTML = `
        <p><strong>⭐ 溝通技巧：</strong>${practice.technique}</p>
        <p><strong>模式：</strong>${practice.difficulty || '簡單'}</p>
        <p><strong>📖 情境：</strong>${practice.scenario}</p>

    `;



    analysisContent.innerHTML = '';
    if (practice.analysis) {
        // 將分析內容按段落分割
        const paragraphs = practice.analysis.split(/(?<=。)\s/); // 按句號+空格切分段落
    
        paragraphs.forEach(paragraph => {
            // 去掉 `-` 符號
            const cleanedParagraph = paragraph.replace(/[#*]/g, '').replace(/-/g, '').trim();
    
            const paragraphElement = document.createElement('p');
    
            // 特殊處理「整體回饋：」和「具體描述對方行為：」加粗
            let content = cleanedParagraph
                .replace(/整體回饋：/g, '<strong>整體回饋：</strong>')
                .replace(/具體描述對方行為：/g, '<strong>具體描述對方行為：</strong>');
    
            // 在數字前換行
            content = content.replace(/(\d+)/g, '<br>$1');
    
            // 處理子標題並換行
            const subtitleMatch = content.match(/^(.*?：)/); // 匹配「子標題：」格式
            if (subtitleMatch) {
                const subtitle = subtitleMatch[1];
                content = content.replace(subtitle, '').trim();
    
                // 在 `)` 後換行並加粗
                content = content.replace(/\)(.*?)/g, ')<br><strong>$1</strong>');
    
                // 處理數字和冒號之間的文字加粗
                content = content.replace(/(\d+\s*.*?):/g, '<strong>$1</strong>:');
    
                paragraphElement.innerHTML = `<strong>${subtitle}</strong>${content}`;
            } else {
                // 在 `)` 後換行並加粗
                content = content.replace(/\)(.*?)/g, ')<br><strong>$1</strong>');
    
                // 處理數字和冒號之間的文字加粗
                content = content.replace(/(\d+\s*.*?):/g, '<strong>$1</strong>:');
    
                paragraphElement.innerHTML = content;
            }
    
            analysisContent.appendChild(paragraphElement);
        });
    } else {
        analysisContent.textContent = '尚無分析結果';
    }
    
    const dialogueDisplay = document.getElementById('dialogueDisplay');

    
    // 美化對話記錄區域背景
    dialogueDisplay.style.backgroundColor = 'white'; // 背景色白色
    dialogueDisplay.style.border = '1px solid #ddd'; // 灰色邊框
    dialogueDisplay.style.borderRadius = '10px'; // 圓角
    dialogueDisplay.style.padding = '20px'; // 內邊距
    dialogueDisplay.style.marginTop = '20px'; // 與其他內容的間距
    dialogueDisplay.style.boxShadow = '0px 2px 5px rgba(0, 0, 0, 0.1)'; // 陰影效果
    
    // 清空舊內容並插入對話
    dialogueDisplay.innerHTML = ''; // 清空舊聊天記錄

    practice.history.forEach(entry => {
        // 每條對話的角色 (家長或導師)
        const message = document.createElement('div');
        message.innerHTML = `<strong>${entry.role === '家長' ? '👨‍👩‍👧‍👦 家長' : '👨‍🏫 導師'}:</strong>`;

        // 對話內容
        const content = document.createElement('div');
        content.style.marginBottom = '20px'; // 添加空行間距
        content.style.paddingLeft = '20px'; // 給內容留一點縮進，和角色標題分開
        content.textContent = entry.content;

        // 加入對話顯示容器
        dialogueDisplay.appendChild(message);
        dialogueDisplay.appendChild(content);
    });

    console.log('練習詳細資訊已載入'); // 測試是否正確載入
}


async function loadPractices() {
    const token = localStorage.getItem('token'); // 從 LocalStorage 獲取 Token

    try {
        const response = await fetch('/api/practice/practices', {
            headers: { Authorization: `Bearer ${token}` },
        });
        const data = await response.json();

        const practiceList = document.getElementById('practiceList'); // 獲取練習列表 DOM
        practiceList.innerHTML = ''; // 清空列表

        if (data.success && Array.isArray(data.practices) && data.practices.length > 0) {
            data.practices.forEach(practice => {
                // 創建列表項目
                const listItem = document.createElement('li');
                listItem.classList.add('practice-item');
                listItem.setAttribute('data-practice-id', practice._id);
                listItem.textContent = `${practice.technique} - ${new Date(practice.createdAt).toLocaleDateString('zh-TW')}`;

                // 綁定點擊事件到列表項目
                listItem.addEventListener('click', async () => {
                    // 取消其他項目選中樣式
                    document.querySelectorAll('.practice-item').forEach(item => {
                        item.classList.remove('selected');
                    });

                    // 標記當前項目為選中
                    listItem.classList.add('selected');

                    // 呼叫選取練習的邏輯
                    await selectPractice(practice._id);
                });

                // 添加刪除按鈕
                const deleteButton = document.createElement('button');
                deleteButton.textContent = '刪除';
                deleteButton.classList.add('small-btn');
                deleteButton.addEventListener('click', async (e) => {
                    e.stopPropagation(); // 防止點擊刪除按鈕時觸發列表項點擊事件
                    if (confirm('確認刪除此練習紀錄？')) {
                        await deletePractice(practice._id);
                        await loadPractices(); // 重新加載列表
                    }
                });

                //listItem.appendChild(deleteButton); // 添加刪除按鈕到項目
                practiceList.appendChild(listItem); // 將項目加入列表
            });
        } else {
            practiceList.innerHTML = '<li>目前無練習記錄</li>';
        }
    } catch (error) {
        console.error('載入練習失敗:', error);
        practiceList.innerHTML = '<li class="error-message">載入練習時發生錯誤</li>';
    }
}


document.getElementById('practiceList').addEventListener('click', async (event) => {
    const target = event.target;
    if (target.classList.contains('practice-item')) {
        const practiceId = target.getAttribute('data-practice-id');
        if (practiceId) {
            await selectPractice(practiceId); // 執行選取邏輯
        }
    }
});




let currentPracticeId = null; 
  // 創建新練習
  async function createPractice() {

    const technique = techniqueSelect.value;
    const difficulty = difficultySelect.value;

    if (!technique) {
        alert('請先選擇溝通技巧');
        return null;
    }

    const token = localStorage.getItem('token');

    try {

        const response = await fetch('/api/practice/practices', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({ technique, difficulty })
          });
          const data = await response.json();
          console.log('API 回應內容:', data); // 添加日誌以檢查回應
        
          if (data.success && data.practice && data.practice._id) {

            const newPracticeId = data.practice._id;
            currentPracticeId = newPracticeId;

            localStorage.setItem('currentPracticeId', newPracticeId); // 保存到localStorage
            console.log('成功建立練習，ID:', newPracticeId);

            return newPracticeId; // 明確返回新的練習ID

        } else {
            throw new Error(data.message || '建立練習失敗');
        }
        
    } catch (error) {

        console.error('API 請求失敗:', error); // 捕捉其他錯誤
        alert('API 請求失敗，請稍後重試');
        return null;
        
    }

    
}

async function deletePractice(practiceId) {
    const token = localStorage.getItem('token');

    try {
        const response = await fetch(`/api/practice/practices/${practiceId}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` }
        });
        const data = await response.json();

        if (data.success) {
            
            if (currentPracticeId === practiceId) {
                localStorage.removeItem('currentPracticeId'); // 如果刪除的是當前練習，清空選擇
                currentPracticeId = null;
            }
            location.reload(); // 刷新整個頁面
        } else {
            console.error('刪除練習失敗:', data.message);
        }
    } catch (error) {
        console.error('刪除練習時發生錯誤:', error);
    }
}



// 錄音功能
startRecordBtn.addEventListener('click', async () => {
    if (isWaitingForSubmission && submissionTimer) {
        clearTimeout(submissionTimer);
        submissionTimer = null;
    }

    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorder = new MediaRecorder(stream);
        audioChunks = [];

        mediaRecorder.ondataavailable = (event) => {
            audioChunks.push(event.data);
        };

        mediaRecorder.onstop = async () => {
            isRecording = false;
            startRecordBtn.disabled = false;
            stopRecordBtn.disabled = true;

            const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
            recordStatus.textContent = '處理中...請稍候';

            try {
                if (!currentPracticeId) {
                    throw new Error('未選擇練習 ID，請先建立或選擇一個練習');
                }

                const formData = new FormData();
                formData.append('audio', audioBlob);
                formData.append('practiceId', currentPracticeId);

                const response = await fetch('/api/audio/transcribe', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    },
                    body: formData
                });

                if (response.status === 401) {
                    window.location.href = '/login';
                    return;
                }

                if (!response.ok) {
                    throw new Error('轉錄 API 請求失敗');
                }

                const data = await response.json();
                const transcribedText = data.text;
                console.log('轉錄文字:', transcribedText);

                currentAccumulatedText = `${currentAccumulatedText.trim()} ${transcribedText}`.trim();
                updateTranscriptionPreview(currentAccumulatedText);

                await loadRecordingsHistory(currentPracticeId);

                // 清除之前的計時器
                if (submissionTimer) {
                    clearTimeout(submissionTimer);
                }

                // 設定倒計時提示
                let countdown = 5; // 倒計時秒數
                isWaitingForSubmission = true;

                recordStatus.textContent = `已轉錄！若需補充請繼續按下"開始錄音"，AI將再 ${countdown} 秒後回應`;

                submissionTimer = setInterval(async () => {
                    countdown--;
                    recordStatus.textContent = `已轉錄！若需補充請繼續按下"開始錄音"，AI將再 ${countdown} 秒後回應`;

                    if (countdown <= 0) {
                        clearInterval(submissionTimer); // 停止倒計時
                        submissionTimer = null;

                        try {
                            if (currentAccumulatedText.trim().length > 0) {
                                await handleSubmission(currentAccumulatedText);
                            }
                        } catch (error) {
                            console.error('提交處理錯誤:', error);
                            recordStatus.textContent = '處理錯誤，請重試';
                        } finally {
                            currentAccumulatedText = '';
                            isWaitingForSubmission = false;
                        }
                    }
                }, 1000); // 每秒更新倒計時提示

            } catch (error) {
                console.error('轉錄錯誤：', error);
                recordStatus.textContent = '發生錯誤：' + error.message;
            }

        };

        mediaRecorder.start();
        isRecording = true;

        startRecordBtn.disabled = true;
        stopRecordBtn.disabled = false;
        recordStatus.textContent = '錄音中...';

    } catch (err) {
        recordStatus.textContent = '無法存取麥克風：' + err.message;
        console.error('麥克風存取錯誤:', err);
    }
});


// 溝通技巧的簡短介紹
const techniqueIntroductions = {
    "我訊息": `
        <h3>我訊息</h3>
        <p>我訊息是一種強調自己感受和觀點的溝通技巧，透過清楚描述問題、表達感受和提出期待，減少指責對方的可能性。例如：「當你遲到時，我感到很擔心，因為我希望我們可以按時完成計劃。」</p>
    `,
    "三明治溝通法": `
        <h3>三明治溝通法</h3>
        <p>三明治溝通法通過「正面肯定 - 建設性回饋 - 正面鼓勵」的方式表達意見，減少對方的抗拒心理。例如：「你最近表現很棒，我想我們可以一起改進報告的格式，這樣會更完美，你有這樣的潛力！」</p>
    `,
    "綜合溝通技巧": `
        <h3>綜合溝通技巧</h3>
        <p>綜合溝通技巧包含積極傾聽、同理心、清晰表達、雙向溝通和解決問題導向，幫助建立信任和有效合作。例如：「我理解你的感受，我們一起來想想有什麼解決方案。」</p>
    `
};

// 處理點擊溝通技巧按鈕的邏輯
function selectPracticeByTechnique(technique) {
    const introDiv = document.getElementById('techniqueIntro');
    introDiv.innerHTML = techniqueIntroductions[technique];
    introDiv.style.display = "block";
    introDiv.scrollIntoView({ behavior: "smooth", block: "center" }); // 平滑滾動到介紹部分
}
function handleApiError(error, defaultMessage = '發生錯誤') {
    console.error('API 錯誤:', error);
    
    if (error.response?.status === 401) {
        // 未認證，重導向到登入頁面
        window.location.href = '/login';
        return;
    }
    
    // 其他錯誤處理
    return defaultMessage + (error.message ? `: ${error.message}` : '');
}

// 檢查認證狀態的函數
function checkAuthStatus() {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = '/login';
        return false;
    }
    return true;
}

stopRecordBtn.addEventListener('click', () => {

   


    if (!checkAuthStatus()) {
        return;
    }
    
    if (isWaitingForSubmission) {
        clearTimeout(submissionTimer);
    }

    if (mediaRecorder && isRecording) {
        try {

           

            mediaRecorder.stop();
            mediaRecorder.stream.getTracks().forEach(track => track.stop());
            isRecording = false;
            startRecordBtn.disabled = false;
            stopRecordBtn.disabled = true;
            recordStatus.textContent = '停止錄音...';

            // 清理挑戰模式的計時器和倒計時
            if (recordingTimer) {
                clearTimeout(recordingTimer);
                recordingTimer = null;
            }
            if (countdownTimer) {
                clearInterval(countdownTimer);
                countdownTimer = null;
                recordStatus.textContent = ''; // 清除倒計時顯示
            }



        } catch (error) {
            console.error('停止錄音時發生錯誤:', error);
            recordStatus.textContent = '停止錄音時發生錯誤';
            
            isRecording = false;
            startRecordBtn.disabled = false;
            stopRecordBtn.disabled = true;
        }
    }
});


// 輔助函數
function addTranscriptionPreview() {
    const previewArea = document.createElement('div');
    previewArea.id = 'previewArea';
    previewArea.className = 'preview-area';
    dialogueDisplay.parentNode.insertBefore(previewArea, dialogueDisplay.nextSibling);
}

function updateTranscriptionPreview(text) {
    // 直接在對話顯示區域添加預覽消息
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message 老師 preview';
    messageDiv.innerHTML = `
        <div class="message-header" style="text-align: right">👩‍🏫 預覽</div>
        <div class="message-content">${text}</div>
        <div class="message-time" style="text-align: right">${new Date().toLocaleTimeString()}</div>
    `;
    
    // 移除之前的預覽消息(如果有)
    const previousPreview = dialogueDisplay.querySelector('.message.preview');
    if (previousPreview) {
        previousPreview.remove();
    }
    
    dialogueDisplay.appendChild(messageDiv);
    messageDiv.scrollIntoView({ behavior: 'smooth' });
}

// 清除預覽時
function clearTranscriptionPreview() {
    const preview = dialogueDisplay.querySelector('.message.preview');
    if (preview) {
        preview.remove();
    }
}

function updateDialogueDisplay(speaker, message) {
    if (!message || !message.trim()) return;

    // 創建新的訊息元素
    const messageDiv = document.createElement('div');
    const speakerType = speaker.toLowerCase() === 'teacher' || speaker === '老師' ? '老師' : '家長';
    messageDiv.className = `message ${speakerType}`;
    
    // 設定適當的圖標和對齊方式
    const icon = speakerType === '老師' ? '👩‍🏫' : '👤';
    const alignment = speakerType === '老師' ? 'right' : 'left';
    
    // 構建訊息內容
    messageDiv.innerHTML = `
        <div class="message-header" style="text-align: ${alignment}">
            ${icon} ${speakerType}
        </div>
        <div class="message-content">${message}</div>
        <div class="message-time" style="text-align: ${alignment}">
            ${new Date().toLocaleTimeString()}
        </div>
    `;
    
    // 添加到對話顯示區域
    dialogueDisplay.appendChild(messageDiv);
    
    // 更新對話計數並滾動到最新訊息
    dialogueCount++;
    messageDiv.scrollIntoView({ behavior: 'smooth' });
}


// 用戶輸入控制
function disableUserInput() {
    if (isRecording && mediaRecorder) {
        mediaRecorder.stop();
        mediaRecorder.stream.getTracks().forEach(track => track.stop());
        isRecording = false;
    }
    startRecordBtn.disabled = true;
    stopRecordBtn.disabled = true;
}

function enableUserInput() {
    startRecordBtn.disabled = false;
    stopRecordBtn.disabled = true;
}

// 事件監聽器
startPracticeBtn.addEventListener('click', async () => {
   
    try {

         // 清空心得記錄區域
         const feedbackList = document.getElementById('feedbackList');
         feedbackList.innerHTML = '尚無心得'; // 清空內容

        clearAnalysis(); // 清空之前的分析結果
        console.log('開始建立新練習...'); // 添加日誌

        // 清理舊的倒計時器（挑戰模式下需要重新計時）
        resetCountdown();

        // 確定當前模式
        const difficulty = difficultySelect.value;
        const countdownDisplay = document.getElementById('countdownDisplay');

        // 簡單模式下隱藏倒計時
        if (difficulty === '簡單') {
            countdownDisplay.style.display = 'none';
        } else if (difficulty === '挑戰') {
            countdownDisplay.style.display = 'block'; // 挑戰模式下顯示倒計時
        }

        // 啟用「開始錄音」按鈕
        enableUserInput();

        // 先建立練習
        const practiceId = await createPractice();
        console.log('createPractice 返回的 ID:', practiceId); // 添加日誌

        if (!practiceId) {
            alert('無法建立練習，請稍後再試');
            return;
        }


        // 更新練習列表
        await loadPractices();

        currentPracticeId = practiceId;
        localStorage.setItem('currentPracticeId', practiceId);

        console.log('準備開始對話，使用練習ID:', practiceId); // 添加日誌
        await startDialogue(practiceId);

    } catch (error) {
        console.error('開始練習失敗:', error);
        alert(error.message || '發生錯誤');
    }
});

async function startDialogue(practiceId) {
    if (!checkAuthStatus()) {
        return;
    }

    const scenarioDisplay = document.getElementById('scenarioDisplay');
    const dialogueDisplay = document.getElementById('dialogueDisplay');

    scenarioDisplay.innerHTML = '';
    dialogueDisplay.innerHTML = '';

    enableUserInput();

    const spinner = document.getElementById('loadingSpinner');
    spinner.classList.add('spinner-visible');

    try {
        // 檢查是否有選擇溝通技巧
        const technique = techniqueSelect.value;
        const difficulty = difficultySelect.value;

        dialogueCount = 0; // 重置對話計數

        if (!technique) {
            throw new Error('請選擇溝通技巧');
        }

        console.log('發送開始對話請求，參數:', {
            technique,
            difficulty,
            practiceId
        }); 

        // 檢查是否已經有練習記錄
        const response = await fetch('/api/dialogue/start-dialogue', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({ 
                technique,
                difficulty,
                practiceId
            }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || '開始對話失敗');
        }

        const data = await response.json();
        
        scenarioDisplay.innerHTML = `
            <div class="message-header">📝 情境</div>
            <div class="message-content">${data.scenario || '無法載入情境'}</div>
        `;

        dialogueDisplay.innerHTML = `
            <div class="message suggestion">
                <div class="message-header">💡 建議開場白</div>
                <div class="message-content">${data.teacherSuggestion || '無建議開場白'}</div>
            </div>
            <div class="message 家長">
                <div class="message-header" style="text-align: left">👤 家長</div>
                <div class="message-content">${data.response || '無回應'}</div>
                <div class="message-time" style="text-align: left">${new Date().toLocaleTimeString()}</div>
            </div>
        `;

        // 啟動挑戰模式倒計時
        if (difficulty === '挑戰') {
            startCountdown();
        }

    } catch (error) {
        console.error('開始對話失敗:', error);
        alert(error.message);
        scenarioDisplay.innerHTML = `
            <div class="message error">
                <div class="message-header">❌ 錯誤</div>
                <div class="message-content">${error.message}</div>
            </div>
        `;
    } finally {
        // 隱藏 loading spinner
        spinner.classList.remove('spinner-visible');
    }
}


// 初始化
document.addEventListener('DOMContentLoaded', async () => {
    if (!checkAuthStatus()) {
        return;
    }

    await loadPractices();
    currentPracticeId = localStorage.getItem('currentPracticeId');



    if (currentPracticeId) {
        await loadPracticeDetails(currentPracticeId);
        await loadRecordingsHistory(currentPracticeId);
    }

   
    
});

// 分析相關函數
function clearAnalysis() {
    analysisContent.innerHTML = '';
}

async function loadRecordingsHistory(practiceId) {
    try {
        const response = await fetch(`/api/audio/recordings?practiceId=${practiceId}`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });

        const data = await response.json();
        const recordingsList = document.getElementById('recordingsList');

        if (!data.success || !Array.isArray(data.recordings)) {
            recordingsList.innerHTML = '<li class="no-recordings">暫無錄音記錄</li>';
            return;
        }

        recordingsList.innerHTML = data.recordings.map(recording => `
            <li class="recording-item">
                <div class="recording-time">${new Date(recording.timestamp).toLocaleString('zh-TW')}</div>
                <audio controls src="${recording.path}"></audio>
                <div class="recording-text">${recording.transcription || '無轉錄文字'}</div>
            </li>
        `).join('');
    } catch (error) {
        console.error('載入錄音歷史失敗:', error);
    }
}
async function handleSubmission(text) {
    try {
        const difficulty = difficultySelect.value; // 獲取當前模式（簡單或挑戰）
        
        // 1. 清除狀態
        isWaitingForSubmission = false;
        clearTranscriptionPreview(); // 清除預覽
        
        // 2. 更新狀態顯示
        recordStatus.textContent = '正在等待 AI 回應...';
        
        if (!text || text.trim().length === 0) {
            throw new Error('提交的文字內容為空');
        }

        // 3. 先顯示老師的回應
        updateDialogueDisplay("老師", text);

        // 4. 發送請求到後端
        const response = await fetch('/api/dialogue/continue-dialogue', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({
                userResponse: text,
                practiceId: currentPracticeId
            })
        });

        if (!response.ok) {
            throw new Error('API 請求失敗');
        }

        const data = await response.json();

        // 5. 根據模式處理回應
        if (difficulty === '簡單') {
            if (data.completed && data.analysis) {
                // 簡單模式下對話結束，顯示分析結果
                analysisContent.innerHTML = `<pre>${data.analysis}</pre>`;
                disableUserInput();
            } else if (data.response) {
                // 簡單模式，檢查是否達到最大對話數
                updateDialogueDisplay("家長", data.response);
                if (dialogueCount >= maxDialogues) {
                    disableUserInput();
                    showEndDialogueMessage();
                } else {
                    recordStatus.textContent = '請點擊 "開始錄音" 回應下一句內容。'; // 顯示提示
                    enableUserInput();
                }
            }
        } else if (difficulty === '挑戰') {
            // 挑戰模式無對話次數限制
            if (data.completed && data.analysis) {
                // 如果挑戰模式自動完成（倒計時結束後），顯示分析結果
                analysisContent.innerHTML = `<pre>${data.analysis}</pre>`;
                disableUserInput();
            } else if (data.response) {
                // 挑戰模式，繼續顯示家長回應
                updateDialogueDisplay("家長", data.response);
                recordStatus.textContent = '請點擊 "開始錄音" 回應下一句內容。'; // 顯示提示
                enableUserInput(); // 始終允許用戶繼續輸入
            }
        }

        // 6. 清理狀態
        currentAccumulatedText = '';
        if (!recordStatus.textContent) {
            recordStatus.textContent = ''; // 如果未設置提示，清除狀態顯示
        }

    } catch (error) {
        console.error('對話提交錯誤:', error);
        recordStatus.textContent = `錯誤：${error.message}`;
        enableUserInput(); // 發生錯誤時允許重試
    }
}


function startCountdown() {
    const countdownDisplay = document.getElementById('countdownDisplay'); // 假設有倒計時顯示的 DOM 元素

    countdownDisplay.style.display = 'block';

    challengeTimer = setInterval(() => {
        countdownRemaining -= 1;

        // 更新倒計時顯示
        const minutes = Math.floor(countdownRemaining / 60);
        const seconds = countdownRemaining % 60;
        countdownDisplay.textContent = `倒計時: ${minutes}:${seconds.toString().padStart(2, '0')}`;

        // 倒計時結束
        if (countdownRemaining <= 0) {
            clearInterval(challengeTimer);
            challengeTimer = null;

            countdownDisplay.style.display = 'none';
            handleChallengeEnd(); // 倒計時結束後處理挑戰結束邏輯
        }
    }, 1000);
}


function stopCountdown() {
    if (challengeTimer) {
        clearInterval(challengeTimer);
        challengeTimer = null;
    }
    countdownRemaining = 180; // 重置倒計時
}

  
function showEndDialogueMessage() {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message suggestion';
    messageDiv.innerHTML = `
        <div class="message-header">系統通知</div>
        <div class="message-content">對話結束，請點擊「開始練習」重新開始。</div>
    `;
    dialogueDisplay.appendChild(messageDiv);
    currentAccumulatedText = '';
}
// 新增挑戰模式結束邏輯函數
async function handleChallengeEnd() {
    try {
        disableUserInput();
        recordStatus.textContent = '挑戰模式已結束，正在分析對話...';

        // 請求後端進行分析
        const response = await fetch('/api/dialogue/continue-dialogue', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({
                userResponse:"", 
                practiceId: currentPracticeId,
                challengeTimeOver: true
            })
        });

        const data = await response.json();

        if (data.analysis) {
            analysisContent.innerHTML = `<pre>${data.analysis}</pre>`;
        } else {
            analysisContent.innerHTML = '<p>未獲得分析結果，請稍後再試。</p>';
        }

        showEndDialogueMessage(); // 顯示對話結束訊息
    } catch (error) {
        console.error('挑戰模式結束時發生錯誤:', error);
        recordStatus.textContent = '分析失敗，請重試';
    }
}

function resetCountdown() {
    if (challengeTimer) {
        clearInterval(challengeTimer);
        challengeTimer = null;
    }
    countdownRemaining = 180; // 重置倒計時為初始值（3 分鐘）
    const countdownDisplay = document.getElementById('countdownDisplay');
    if (countdownDisplay) {
        countdownDisplay.textContent = '倒計時: 3:00'; // 恢復倒計時初始狀態
    }
}

document.getElementById('submitFeedbackBtn').addEventListener('click', async () => {
    const feedbackInput = document.getElementById('feedbackInput');
    const feedbackText = feedbackInput.value.trim();
  
    if (!feedbackText) {
      alert('心得內容不可為空！');
      return;
    }
  
    const token = localStorage.getItem('token');
    const practiceId = localStorage.getItem('currentPracticeId');
  
    console.log('practiceId:', practiceId); // 確認 practiceId
    console.log('Token:', token); // 確認 Token
  
    try {
      const response = await fetch(`/api/practice/${practiceId}/feedback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ comment: feedbackText })
      });
  
      const data = await response.json();
      if (data.success) {
        feedbackInput.value = ''; // 清空輸入框
        
        loadFeedbackList(practiceId); // 重新載入心得列表
      } else {
        throw new Error(data.message || '提交心得失敗');
      }
    } catch (error) {
      console.error('提交心得失敗:', error);
      alert('提交心得失敗，請稍後再試。');
    }
  });
  

  async function loadFeedbackList(practiceId) {
    const feedbackList = document.getElementById('feedbackList');
    feedbackList.innerHTML = '<p class="no-feedback">載入中...</p>';

    const token = localStorage.getItem('token');
    try {
        const response = await fetch(`/api/practice/${practiceId}/feedback`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || '載入心得失敗');
        }

        const data = await response.json();
        if (data.success) {
            if (data.feedback.length === 0) {
                feedbackList.innerHTML = '<p class="no-feedback">目前尚無心得紀錄。</p>';
                return;
            }

            feedbackList.innerHTML = data.feedback.map(item => `
                <div class="feedback-item">
                    <div class="feedback-content">${item.comment}</div>
                    <div class="feedback-time">${new Date(item.createdAt).toLocaleString('zh-TW')}</div>
                </div>
            `).join('');
        } else {
            throw new Error(data.message || '載入心得失敗');
        }
    } catch (error) {
        console.error('載入心得失敗:', error);
        feedbackList.innerHTML = '<p class="no-feedback">載入失敗，請稍後重試。</p>';
    }
}
