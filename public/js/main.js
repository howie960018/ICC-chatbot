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
let mediaRecorder = null;
let audioChunks = [];
let dialogueCount = 0;
let isWaitingForSubmission = false;
let submissionTimer = null;
let currentDialogueRecordings = [];
let isRecording = false;
const maxDialogues = 6;
const MAX_RECORDING_TIME = 20 * 1000; // 最大錄音時間，這裡設定為 20 秒
let currentAccumulatedText = '';

document.addEventListener('DOMContentLoaded', () => {
    const welcomeMessage = document.getElementById('welcomeMessage');
    const username = localStorage.getItem('username');

    if (username) {
        welcomeMessage.textContent = `歡迎, ${username}`;
    } else {
        // 如果未登入，跳轉回登入頁面
        window.location.href = '/login';
    }
});

document.getElementById('logoutButton').addEventListener('click', () => {
    // 清除 localStorage
    localStorage.removeItem('token');
    localStorage.removeItem('username');

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
    currentPracticeId = practiceId;
    localStorage.setItem('currentPracticeId', currentPracticeId);
    
    await loadPracticeDetails(practiceId);
    await loadRecordingsHistory(practiceId);
}

async function loadPracticeDetails(practiceId) {
    const token = localStorage.getItem('token');

    const response = await fetch(`/api/practice/practices/${practiceId}`, {
        headers: { Authorization: `Bearer ${token}` }
    });
    const data = await response.json();

    if (data.success) {
        displayPracticeDetails(data.practice); // 將返回的練習數據渲染到 UI
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

            const cleanedParagraph = paragraph.replace(/[#*]/g, '').trim();
            const paragraphElement = document.createElement('p');
            paragraphElement.textContent = cleanedParagraph;
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
    const token = localStorage.getItem('token'); // 從 LocalStorage 中獲取用戶的授權 Token

    try {
        // 向後端請求練習數據
        const response = await fetch('/api/practice/practices', {
            headers: { Authorization: `Bearer ${token}` } // 添加授權標頭
        });
        const data = await response.json(); // 解析返回的 JSON 資料

        const practiceList = document.getElementById('practiceList'); // 獲取練習列表的 DOM 元素
        practiceList.innerHTML = ''; // 清空列表，準備重新加載

        if (data.success && Array.isArray(data.practices) && data.practices.length > 0) {
            data.practices.forEach(practice => {
                // 創建列表項目
                const listItem = document.createElement('li');
                listItem.textContent = `${practice.technique} - ${new Date(practice.createdAt).toLocaleDateString('zh-TW')}`;

                // 添加選取按鈕
                const selectButton = document.createElement('button');
                selectButton.textContent = '選取';
                selectButton.classList.add('select-btn'); // 添加自定義類
                selectButton.addEventListener('click', async () => {
                    await selectPractice(practice._id); // 儲存並加載當前練習
                });

                // 添加刪除按鈕
                const deleteButton = document.createElement('button');
                deleteButton.textContent = '刪除';
                deleteButton.classList.add('small-btn'); // 添加自定義類
                deleteButton.addEventListener('click', async (e) => {
                    e.stopPropagation(); // 防止點擊刪除按鈕時觸發列表項點擊事件
                    if (confirm('確認刪除此練習紀錄？')) {
                        await deletePractice(practice._id); // 刪除該練習
                        await loadPractices(); // 重新加載練習列表
                    }
                });

                // 將按鈕添加到列表項目
                listItem.appendChild(selectButton);
                listItem.appendChild(deleteButton);

                // 將列表項目添加到練習列表
                practiceList.appendChild(listItem);
            });
        } else {
            practiceList.innerHTML = '<li>目前無練習記錄</li>'; // 無練習時的提示
        }
    } catch (error) {
        console.error('載入練習失敗:', error);
        const practiceList = document.getElementById('practiceList');
        practiceList.innerHTML = '<li class="error-message">載入練習時發生錯誤</li>';
    }
}




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
            alert('練習紀錄已刪除');
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
                        // 清除之前的計時器
        if (submissionTimer) {
            clearTimeout(submissionTimer);
        }

        // 設定新的計時器
        recordStatus.textContent = '轉錄完成！如需補充請繼續錄音，5秒後AI將回應';
        isWaitingForSubmission = true;
        
        submissionTimer = setTimeout(async () => {
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
        }, 5000);

                
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
        clearAnalysis(); // 清空之前的分析結果
        console.log('開始建立新練習...'); // 添加日誌

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
        

    } catch (error) {
        console.error('開始對話失敗:', error);
        alert(error.message);
        scenarioDisplay.innerHTML = `
            <div class="message error">
                <div class="message-header">❌ 錯誤</div>
                <div class="message-content">${error.message}</div>
            </div>
        `;
    }finally {
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

    
    alert('請先選擇溝通技巧，再新增練習');
    
});

// 分析相關函數
function clearAnalysis() {
    analysisContent.innerHTML = '';
}

async function loadRecordingsHistory(practiceId) {
    try {
        // 使用傳入的 practiceId，如果沒有就使用當前的
        const targetPracticeId = practiceId || currentPracticeId;

        if (!targetPracticeId) {
            console.warn('無法載入錄音歷史：未指定練習 ID');
            return;
        }

        const response = await fetch(`/api/audio/recordings?practiceId=${targetPracticeId}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        const data = await response.json();
        const recordingsList = document.getElementById('recordingsList');

        if (!data.success || !Array.isArray(data.recordings)) {
            recordingsList.innerHTML = '<li class="no-recordings">暫無錄音記錄</li>';
            return;
        }

        const sortedRecordings = data.recordings.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

        recordingsList.innerHTML = sortedRecordings.map(recording => `
            <li class="recording-item">
                <div class="recording-time">
                    ${new Date(recording.timestamp).toLocaleString('zh-TW')}
                </div>
                <div class="recording-audio">
                    <audio controls src="${recording.path}"></audio>
                </div>
                <div class="recording-text">
                    <p>${recording.transcription || '無轉錄文字'}</p>
                </div>
            </li>
        `).join('');

    } catch (error) {
        console.error('載入錄音歷史失敗:', error);
        const recordingsList = document.getElementById('recordingsList');
        recordingsList.innerHTML = '<li class="error-message">載入錄音歷史時發生錯誤</li>';
    }
}

async function handleSubmission(text) {
    try {
        // 1. 先清除狀態
        isWaitingForSubmission = false;
        clearTranscriptionPreview();  // 清除預覽
        
        // 2. 更新狀態顯示
        recordStatus.textContent = '正在等待 AI 回應...';
        
        if (!text || text.trim().length === 0) {
            throw new Error('提交的文字內容為空');
        }

        // 3. 先顯示老師的回應 - 這是關鍵步驟
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
        
        // 5. 處理回應
        if (data.completed && data.analysis) {
            // 對話結束，顯示分析結果
            analysisContent.innerHTML = `<pre>${data.analysis}</pre>`;
            disableUserInput();
        } else if (data.response) {
            // 顯示家長回應並檢查是否需要繼續對話
            updateDialogueDisplay("家長", data.response);
            dialogueCount >= 6 ? disableUserInput() : enableUserInput();
        }

        // 6. 清理狀態
        currentAccumulatedText = '';
        recordStatus.textContent = '';
        
        // 7. 如果對話結束，顯示結束訊息
        if (dialogueCount >= 6) {
            showEndDialogueMessage();
        }

    } catch (error) {
        console.error('對話提交錯誤:', error);
        recordStatus.textContent = `錯誤：${error.message}`;
        enableUserInput();  // 發生錯誤時允許重試
    }
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