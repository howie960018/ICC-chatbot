// DOM 元素
const techniqueSelect = document.getElementById('techniqueSelect');
const startPracticeBtn = document.getElementById('startPracticeBtn');
const scenarioDisplay = document.getElementById('scenarioDisplay');
const dialogueDisplay = document.getElementById('dialogueDisplay');
const startRecordBtn = document.getElementById('startRecordBtn');
const stopRecordBtn = document.getElementById('stopRecordBtn');
const recordStatus = document.getElementById('recordStatus');
const analysisContent = document.getElementById('analysisContent');

// 全局變數
let mediaRecorder = null;
let audioChunks = [];
let dialogueCount = 0;
let isWaitingForSubmission = false;
let submissionTimer = null;
let currentDialogueRecordings = [];
let isRecording = false;
const maxDialogues = 6;
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


async function loadPracticeDetails(practiceId) {
    const token = localStorage.getItem('token'); // 獲取 Token
    const response = await fetch(`/api/practice/practices/${practiceId}`, {
        headers: { Authorization: `Bearer ${token}` }
    });
    const data = await response.json();

    if (data.success) {
        displayPracticeDetails(data.practice); // 顯示練習細節
    } else {
        console.error('Failed to load practice details:', data.message);
    }
}

// 顯示練習詳細資訊
function displayPracticeDetails(practice) {
    // 示例：顯示練習溝通技巧和分析結果
    const techniqueDisplay = document.getElementById('scenarioDisplay');
    techniqueDisplay.textContent = `溝通技巧：${practice.technique}`;

    const analysisContent = document.getElementById('analysisContent');
    analysisContent.textContent = practice.analysis || '尚無分析結果';

    const dialogueDisplay = document.getElementById('dialogueDisplay');
    dialogueDisplay.innerHTML = ''; // 清空舊聊天記錄

    practice.history.forEach(entry => {
        const message = document.createElement('div');
        message.textContent = `${entry.role}: ${entry.content}`;
        dialogueDisplay.appendChild(message);
    });

    console.log('練習詳細資訊已載入'); // 測試是否正確載入
}


  
  // 更新練習列表，讓每個項目存放 ID
  async function loadPractices() {
    const token = localStorage.getItem('token'); // 從本地獲取 Token
    const response = await fetch('/api/practice/practices', {
        headers: { Authorization: `Bearer ${token}` }
    });
    const data = await response.json();

    if (data.success) {
        const practiceList = document.getElementById('practiceList');
        practiceList.innerHTML = ''; // 清空舊列表

        data.practices.forEach(practice => {
            const listItem = document.createElement('li');
            listItem.textContent = `${practice.technique} - ${new Date(practice.createdAt).toLocaleString()}`;
            listItem.dataset.id = practice._id; // 儲存練習的 ID

            // 添加點擊事件載入詳細資料
            listItem.addEventListener('click', () => {
                loadPracticeDetails(practice._id);
            });

            // 創建刪除按鈕
            const deleteButton = document.createElement('button');
            deleteButton.textContent = 'X'; // 刪除按鈕文字
            deleteButton.style.marginLeft = '10px'; // 讓按鈕和文字分開一些
            deleteButton.addEventListener('click', (event) => {
                event.stopPropagation(); // 防止點擊刪除按鈕觸發列表項點擊事件
                deletePractice(practice._id); // 呼叫刪除函數
            });

            listItem.appendChild(deleteButton); // 把刪除按鈕加入到列表項目中
            practiceList.appendChild(listItem); // 把列表項目加入到列表中
        });

        console.log('練習列表已載入');
    } else {
        console.error('Failed to load practices:', data.message);
    }
}


  
  // 創建新練習
  async function createPractice() {
    const token = localStorage.getItem('token');
    const response = await fetch('/api/practice/practices', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ technique: '我訊息' }) // 預設為「我訊息」
    });
    const data = await response.json();
  
    if (data.success) {
      loadPractices(); // 重新載入練習列表
    } else {
      console.error('Failed to create practice:', data.message);
    }
  }
  
  // 頁面載入時初始化
  document.getElementById('newPracticeBtn').addEventListener('click', createPractice);
  loadPractices();

  
  async function deletePractice(practiceId) {
    const token = localStorage.getItem('token'); // 獲取 Token

    if (confirm('確認刪除此練習紀錄？')) { // 提示用戶是否確認刪除
        try {
            const response = await fetch(`/api/practice/practices/${practiceId}`, {
                method: 'DELETE',
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            const data = await response.json();

            if (data.success) {
                alert('練習紀錄已刪除');
                loadPractices(); // 刪除後重新載入練習列表
            } else {
                console.error('Failed to delete practice:', data.message);
            }
        } catch (error) {
            console.error('Error deleting practice:', error);
        }
    }
}


// 錄音功能
startRecordBtn.addEventListener('click', async () => {
    if (isWaitingForSubmission) {
        clearTimeout(submissionTimer);
    }

    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorder = new MediaRecorder(stream);
        
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
                const formData = new FormData();
                formData.append('audio', audioBlob);
        
                // 添加認證 header
                const response = await fetch('/api/audio/transcribe', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                        // 注意：這裡不要設置 'Content-Type'，因為 FormData 會自動設置
                    },
                    body: formData
                });
        
                // 處理未認證的情況
                if (response.status === 401) {
                    window.location.href = '/login';
                    return;
                }
        
                if (!response.ok) {
                    throw new Error('轉錄失敗');
                }
        
                const data = await response.json();
                const transcribedText = data.text;
                
                currentAccumulatedText = currentAccumulatedText 
                    ? currentAccumulatedText + ' ' + transcribedText 
                    : transcribedText;
                
                updateTranscriptionPreview(currentAccumulatedText);
                
                if (!isWaitingForSubmission) {
                    isWaitingForSubmission = true;
                    recordStatus.textContent = '轉錄完成！如需補充請繼續錄音，2秒後AI將回應';
                    startRecordBtn.disabled = false;
                    
                    submissionTimer = setTimeout(async () => {
                        await handleSubmission(currentAccumulatedText);
                        currentAccumulatedText = '';
                    }, 2000);
                } else {
                    clearTimeout(submissionTimer);
                    startRecordBtn.disabled = false;
                    recordStatus.textContent = '轉錄完成！如需補充請繼續錄音，2秒後AI將回應';
                    
                    submissionTimer = setTimeout(async () => {
                        await handleSubmission(currentAccumulatedText);
                        currentAccumulatedText = '';
                    }, 2000);
                }
                
                await loadRecordingsHistory();
                
            } catch (error) {
                console.error('轉錄錯誤：', error);
                
                // 根據錯誤類型顯示不同的錯誤信息
                if (error.message === '轉錄失敗') {
                    recordStatus.textContent = '轉錄失敗，請重試';
                } else {
                    recordStatus.textContent = '發生錯誤：' + error.message;
                }
                
                startRecordBtn.disabled = false;
            }
        };
        
        mediaRecorder.start();
        isRecording = true;
        audioChunks = [];
        
        startRecordBtn.disabled = true;
        stopRecordBtn.disabled = false;
        recordStatus.textContent = '錄音中...';
        audioPlayback.style.display = 'none';
    } catch (err) {
        recordStatus.textContent = '無法存取麥克風：' + err.message;
        console.error('麥克風存取錯誤:', err);
        
        isRecording = false;
        startRecordBtn.disabled = false;
        stopRecordBtn.disabled = true;
    }
});


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
        } catch (error) {
            console.error('停止錄音時發生錯誤:', error);
            recordStatus.textContent = '停止錄音時發生錯誤';
            
            isRecording = false;
            startRecordBtn.disabled = false;
            stopRecordBtn.disabled = true;
        }
    }
});

// 對話管理函數
async function startDialogue() {
    if (!checkAuthStatus()) {
        return;
    }

    try {
        const technique = techniqueSelect.value;
        if (!technique) {
            throw new Error('請選擇溝通技巧');
        }

        const response = await fetch('/api/dialogue/start-dialogue', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({ technique }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || '開始對話失敗');
        }

        const data = await response.json();
        
        if (!data.success) {
            throw new Error(data.error || '開始對話失敗');
        }

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

        // 其他初始化...
    } catch (error) {
        console.error('開始對話失敗:', error);
        scenarioDisplay.innerHTML = `
            <div class="message error">
                <div class="message-header">❌ 錯誤</div>
                <div class="message-content">${error.message}</div>
            </div>
        `;
    }
}

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
    const messageDiv = document.createElement('div');
    const speakerType = speaker.toLowerCase() === 'teacher' || speaker === '老師' ? '老師' : '家長';
    messageDiv.className = `message ${speakerType}`;
    
    const icon = speakerType === '老師' ? '👩‍🏫' : '👤';
    
    messageDiv.innerHTML = `
        <div class="message-header" style="text-align: ${speakerType === '老師' ? 'right' : 'left'}">${icon} ${speakerType}</div>
        <div class="message-content">${message}</div>
        <div class="message-time" style="text-align: ${speakerType === '老師' ? 'right' : 'left'}">${new Date().toLocaleTimeString()}</div>
    `;
    
    dialogueDisplay.appendChild(messageDiv);
    dialogueCount++;
    
    messageDiv.scrollIntoView({ behavior: 'smooth', block: 'end' });
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
startPracticeBtn.addEventListener('click', () => {
    clearAnalysis();
    startDialogue();
});

// 初始化
document.addEventListener('DOMContentLoaded', () => {
    if (!checkAuthStatus()) {
        return;
    }
    
    loadRecordingsHistory();
    addTranscriptionPreview();
    refreshAuthToken(); // 初始檢查
});

// 分析相關函數
function clearAnalysis() {
    analysisContent.innerHTML = '';
}

async function loadRecordingsHistory() {
    try {
        const response = await fetch('/api/audio/recordings', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        const recordings = await response.json();
        
        const recordingsList = document.getElementById('recordingsList');
        if (!recordingsList) {
            console.error('recordingsList element not found');
            return;
        }

        if (!Array.isArray(recordings) || recordings.length === 0) {
            recordingsList.innerHTML = '<li class="no-recordings">暫無錄音記錄</li>';
            return;
        }

        recordingsList.innerHTML = recordings
            // 按時間正序排列 (舊的在上面)
            .sort((a, b) => a.timestamp - b.timestamp) 
            .map(recording => `
                <li class="recording-item">
                    <div class="recording-time">
                        ${new Date(recording.timestamp).toLocaleString('zh-TW', {
                            year: 'numeric',
                            month: '2-digit',
                            day: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit'
                        })}
                    </div>
                    <div class="recording-text">
                        <strong>轉錄文字：</strong>
                        <p>${recording.transcription || '無轉錄文字'}</p>
                    </div>
                    <div class="recording-audio">
                        <audio controls src="/recordings/${recording.path}"></audio>
                    </div>
                </li>
            `).join('');
    } catch (error) {
        console.error('載入錄音歷史失敗:', error);
        const recordingsList = document.getElementById('recordingsList');
        recordingsList.innerHTML = '<li class="error-message">載入錄音歷史時發生錯誤</li>';
    }
}

// main.js
async function handleSubmission(text) {
    isWaitingForSubmission = false;
    recordStatus.textContent = '正在等待 AI 回應...';
    
    try {
        // 移除預覽，添加正式消息
        clearTranscriptionPreview();
        updateDialogueDisplay("老師", text);
        
        const response = await fetch('/api/dialogue/continue-dialogue', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({ userResponse: text })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        
        if (data.completed && data.analysis) {
            analysisContent.innerHTML = `<pre>${data.analysis}</pre>`;
            disableUserInput();
        } else if (data.response) {
            updateDialogueDisplay("家長", data.response);
            if (dialogueCount < maxDialogues) {
                enableUserInput();
            } else {
                disableUserInput();
                showEndDialogueMessage();
            }
        }
        
        currentAccumulatedText = '';
        recordStatus.textContent = '';
        
    } catch (error) {
        console.error('提交對話錯誤:', error);
        recordStatus.textContent = `提交對話時發生錯誤: ${error.message}`;
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