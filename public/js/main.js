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


// main.js - 錄音時間限制與進度顯示功能

// 全局變數
let recordingTimer = null; // 用於跟踪錄音時間的計時器
const MAX_RECORDING_TIME = 120;  // 最大錄音時間（秒）
let recordingProgress = 0; // 錄音進度（0-100）
let isRecordingTimeDisplay = false; // 是否顯示倒計時

// 新增進度條和倒計時元素到DOM
function addRecordingProgressElements() {
  // 檢查是否已經存在進度條元素
  if (document.getElementById('recordingProgressContainer')) {
    return;
  }

  // 創建進度條容器
  const progressContainer = document.createElement('div');
  progressContainer.id = 'recordingProgressContainer';
  progressContainer.className = 'recording-progress-container';
  progressContainer.style.display = 'none';
  
  // 創建進度條
  const progressBar = document.createElement('div');
  progressBar.id = 'recordingProgressBar';
  progressBar.className = 'recording-progress-bar';
  
  // 創建倒計時顯示
  const timerDisplay = document.createElement('div');
  timerDisplay.id = 'recordingTimerDisplay';
  timerDisplay.className = 'recording-timer-display';
  timerDisplay.textContent = `00:${MAX_RECORDING_TIME}`;
  
  // 組合元素
  progressContainer.appendChild(progressBar);
  progressContainer.appendChild(timerDisplay);
  
  // 將進度條添加到錄音控制區域之後
  const recordControls = document.querySelector('.record-controls');
  if (recordControls) {
    recordControls.parentNode.insertBefore(progressContainer, recordControls.nextSibling);
  } else {
    // 如果找不到錄音控制區域，則添加到狀態顯示區域之前
    const statusElement = document.getElementById('recordStatus');
    if (statusElement) {
      statusElement.parentNode.insertBefore(progressContainer, statusElement);
    }
  }
  // 添加樣式
  const style = document.createElement('style');
  style.textContent = `
    .recording-progress-container {
      margin: 15px 0;
      background-color: #f5f5f5;
      border-radius: 10px;
      padding: 5px;
      position: relative;
      height: 30px;
      box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.1);
    }
    
    .recording-progress-bar {
      height: 100%;
      background-color: #e93ae1;
      border-radius: 7px;
      transition: width 0.3s ease;
      width: 0%;
      position: absolute;
      left: 0;
      top: 0;
    }
    
    .recording-timer-display {
      position: absolute;
      right: 10px;
      top: 50%;
      transform: translateY(-50%);
      font-weight: bold;
      color: black;
      z-index: 10;
    }
    
    @keyframes pulse {
      0% { opacity: 1; }
      50% { opacity: 0.7; }
      100% { opacity: 1; }
    }
    
    .recording-active {
      animation: pulse 1.5s infinite;
    }
  `;
  document.head.appendChild(style);
}

// 開始錄音計時器和進度顯示
function startRecordingTimer() {
    // 重設進度和時間
    recordingProgress = 0;
    let remainingTime = MAX_RECORDING_TIME;
    
    // 顯示進度條容器
    const progressContainer = document.getElementById('recordingProgressContainer');
    const progressBar = document.getElementById('recordingProgressBar');
    const timerDisplay = document.getElementById('recordingTimerDisplay');
    
    if (progressContainer && progressBar && timerDisplay) {
      progressContainer.style.display = 'block';
      progressBar.style.width = '0%';
      progressBar.classList.add('recording-active');
      timerDisplay.textContent = formatTime(remainingTime);
    }
    
    // 啟動計時器
    recordingTimer = setInterval(() => {
      remainingTime -= 1;
      recordingProgress = ((MAX_RECORDING_TIME - remainingTime) / MAX_RECORDING_TIME) * 100;
      
      // 更新進度條和倒計時
      if (progressBar) {
        progressBar.style.width = `${recordingProgress}%`;
      }
      
      if (timerDisplay) {
        timerDisplay.textContent = formatTime(remainingTime);
        
        // 當倒計時小於10秒時，改變顏色提醒用戶
        if (remainingTime <= 10) {
          timerDisplay.style.color = 'red';
        } else {
          timerDisplay.style.color = 'black';
        }
      }
      
      // 如果錄音時間達到最大限制，自動停止錄音
      if (remainingTime <= 0) {
        if (mediaRecorder && isRecording) {
          stopRecordBtn.click(); // 自動點擊停止按鈕
        }
        clearInterval(recordingTimer);
        recordingTimer = null;
      }
    }, 1000);
  }
  
  // 停止錄音計時器和進度顯示
  function stopRecordingTimer() {
    if (recordingTimer) {
      clearInterval(recordingTimer);
      recordingTimer = null;
    }
    
    // 隱藏進度條
    const progressContainer = document.getElementById('recordingProgressContainer');
    const progressBar = document.getElementById('recordingProgressBar');
    
    if (progressContainer) {
      progressContainer.style.display = 'none';
    }
    
    if (progressBar) {
      progressBar.classList.remove('recording-active');
    }
  }
  
  // 格式化時間為 MM:SS 格式
  function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }


// 全局變數
let countdownTimer = null; 
let challengeTimer = null; // 挑戰倒計時計時器
let countdownRemaining = 300; // 倒計時剩餘時間（以秒為單位）
let mediaRecorder = null;
let audioChunks = [];
let dialogueCount = 0;
let isWaitingForSubmission = false;
let submissionTimer = null;
let currentDialogueRecordings = [];
let isRecording = false;
const maxDialogues = 12;
// const MAX_RECORDING_TIME = 120 * 1000; // 最大錄音時間，這裡設定為 120 秒
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
    <img src="/jpg/commai.png" alt="Login Page Image" class="login-image" />
        <p>使用教學：</p>
        <ul>
            <li><strong>Step 1:</strong> 選擇溝通技巧與模式：</li>
            <ul>
                <li><strong>基礎模式：</strong>最多回應 6 句。</li>
                <li><strong>挑戰模式：</strong>限時 5 分鐘回應。</li>
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



// 顯示練習詳細資訊並傳遞情境到重新練習函數
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
    
    // 清空舊內容
    dialogueDisplay.innerHTML = ''; 

    // 創建一個Set來記錄已經顯示過的對話，避免重複
    const displayedDialogues = new Set();

    // 過濾並顯示不重複的對話
    if (practice.history && Array.isArray(practice.history)) {
        practice.history.forEach((entry, index) => {
            // 創建一個唯一字符串來代表這條對話
            const dialogueKey = `${entry.role}-${entry.content.substring(0, 50)}`;
            
            // 如果這條對話已經顯示過，則跳過
            if (displayedDialogues.has(dialogueKey)) {
                return;
            }
            
            // 將此對話標記為已顯示
            displayedDialogues.add(dialogueKey);
            
            // 創建對話元素
            const messageContainer = document.createElement('div');
            messageContainer.className = 'message-container';
            
            // 每條對話的角色 (家長或導師)
            const messageHeader = document.createElement('div');
            messageHeader.className = 'message-header';
            messageHeader.innerHTML = `<strong>${entry.role === '家長' ? '👨‍👩‍👧‍👦 家長' : '👨‍🏫 導師'}:</strong>`;
            
            // 對話內容
            const messageContent = document.createElement('div');
            messageContent.className = 'message-content';
            messageContent.style.marginBottom = '20px';
            messageContent.style.paddingLeft = '20px';
            messageContent.textContent = entry.content;
            
            // 添加到對話容器
            messageContainer.appendChild(messageHeader);
            messageContainer.appendChild(messageContent);
            dialogueDisplay.appendChild(messageContainer);
        });
    }

    // 先檢查並移除任何現有的重新練習按鈕容器
    const existingRetryContainer = document.querySelector('.retry-button-container');
    if (existingRetryContainer) {
        existingRetryContainer.remove();
    }
    
    // 添加重新練習按鈕
    const retryButtonContainer = document.createElement('div');
    retryButtonContainer.className = 'retry-button-container';
    
    const retryButton = document.createElement('button');
    retryButton.textContent = '重新練習';
    retryButton.className = 'retry-main-btn';
    retryButton.addEventListener('click', async () => {
        // 確保傳遞情境到重新練習函數
        await retryPractice(practice._id, practice.scenario);
    });
    
    retryButtonContainer.appendChild(retryButton);
    
    // 添加到分析區域之後
    const analysisDisplay = document.getElementById('analysisDisplay');
    if (analysisDisplay.nextSibling) {
        analysisDisplay.parentNode.insertBefore(retryButtonContainer, analysisDisplay.nextSibling);
    } else {
        analysisDisplay.parentNode.appendChild(retryButtonContainer);
    }

    console.log('練習詳細資訊已載入'); // 測試是否正確載入
}

//0304重新練習
async function retryPractice(practiceId, scenario) {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/practice/practices/${practiceId}/retry`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error('重新練習請求失敗');
      }
      
      const data = await response.json();
      
      if (data.success && data.practice && data.practice._id) {
        // 將新練習設置為當前練習
        currentPracticeId = data.practice._id;
        localStorage.setItem('currentPracticeId', data.practice._id);
        
        // 開始新的對話練習，傳遞原始情境
        await startDialogue(data.practice._id, data.practice.scenario);
        
        // 更新練習列表
        await loadPractices();
        
        // 提示用戶
        alert('已創建重新練習！');
      } else {
        throw new Error(data.message || '創建重新練習失敗');
      }
    } catch (error) {
      console.error('重新練習失敗:', error);
      alert('重新練習失敗: ' + error.message);
    }
}

// async function loadPractices() {
//     const token = localStorage.getItem('token'); // 從 LocalStorage 獲取 Token

//     try {
//         const response = await fetch('/api/practice/practices', {
//             headers: { Authorization: `Bearer ${token}` },
//         });
//         const data = await response.json();

//         const practiceList = document.getElementById('practiceList'); // 獲取練習列表 DOM
//         practiceList.innerHTML = ''; // 清空列表

//         if (data.success && Array.isArray(data.practices) && data.practices.length > 0) {
//             data.practices.forEach(practice => {
//                 // 創建列表項目
//                 const listItem = document.createElement('li');
//                 listItem.classList.add('practice-item');
//                 listItem.setAttribute('data-practice-id', practice._id);
//                 listItem.textContent = `${practice.technique} - ${new Date(practice.createdAt).toLocaleDateString('zh-TW')}`;

//                 // 綁定點擊事件到列表項目
//                 listItem.addEventListener('click', async () => {
//                     // 取消其他項目選中樣式
//                     document.querySelectorAll('.practice-item').forEach(item => {
//                         item.classList.remove('selected');
//                     });

//                     // 標記當前項目為選中
//                     listItem.classList.add('selected');

//                     // 呼叫選取練習的邏輯
//                     await selectPractice(practice._id);
//                 });

//                 // 添加刪除按鈕
//                 const deleteButton = document.createElement('button');
//                 deleteButton.textContent = '刪除';
//                 deleteButton.classList.add('small-btn');
//                 deleteButton.addEventListener('click', async (e) => {
//                     e.stopPropagation(); // 防止點擊刪除按鈕時觸發列表項點擊事件
//                     if (confirm('確認刪除此練習紀錄？')) {
//                         await deletePractice(practice._id);
//                         await loadPractices(); // 重新加載列表
//                     }
//                 });

//                 //listItem.appendChild(deleteButton); // 添加刪除按鈕到項目
//                 practiceList.appendChild(listItem); // 將項目加入列表
//             });
//         } else {
//             practiceList.innerHTML = '<li>目前無練習記錄</li>';
//         }
//     } catch (error) {
//         console.error('載入練習失敗:', error);
//         practiceList.innerHTML = '<li class="error-message">載入練習時發生錯誤</li>';
//     }
// }


// 0304修改 displayFilteredPractices 函數，在練習項目中添加重新練習標記
function displayFilteredPractices(practices) {
    const practiceList = document.getElementById('practiceList');
    practiceList.innerHTML = '';
    
    // 增加格式檢查
    if (!Array.isArray(practices)) {
        console.error('練習資料不是陣列', practices);
        practiceList.innerHTML = '<li class="error-message">練習資料格式不正確</li>';
        return;
    }
    
    if (practices.length === 0) {
        practiceList.innerHTML = '<li class="no-practice">沒有符合條件的練習</li>';
        return;
    }
    
    try {
        // 按日期排序，最新的在前
        practices.sort((a, b) => {
            try {
                return new Date(b.createdAt) - new Date(a.createdAt);
            } catch (error) {
                return 0; // 如果日期無效，保持原順序
            }
        });
        
        practices.forEach(practice => {
            try {
                // 創建列表項目
                const listItem = document.createElement('li');
                listItem.classList.add('practice-item');
                
                // 如果是重新練習，添加標識類
                if (practice.isRetry) {
                    listItem.classList.add('retry');
                }
                
                listItem.setAttribute('data-practice-id', practice._id);
                
                // 格式化日期
                let practiceDate = '未知日期';
                try {
                    if (practice.createdAt) {
                        practiceDate = new Date(practice.createdAt).toLocaleDateString('zh-TW');
                    }
                } catch (e) {
                    console.warn('日期格式化錯誤', e);
                }
                
                // 截取情境的前20個字元，如果太長就加上省略號
                const scenarioPreview = practice.scenario 
                    ? (practice.scenario.length > 20 ? practice.scenario.substring(0, 20) + '...' : practice.scenario)
                    : '無情境';
                
                // 設置練習顯示內容：技巧 - 日期 - 情境預覽
                let titleContent = `${practice.technique || '未知技巧'} - ${practiceDate}`;
                
                // 如果是重新練習，添加標記
                if (practice.isRetry) {
                    titleContent += `<span class="retry-badge">重新練習</span>`;
                }
                
                listItem.innerHTML = `
                    <div class="practice-item-title">${titleContent}</div>
                    <div class="practice-item-scenario">${scenarioPreview}</div>
                    <div class="practice-item-badge ${practice.difficulty === '挑戰' ? 'challenge' : 'basic'}">${practice.difficulty === '挑戰' ? '挑戰' : '基礎'}</div>
                `;
                
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
                
                listItem.appendChild(deleteButton); // 添加刪除按鈕到項目
                practiceList.appendChild(listItem); // 將項目加入列表
            } catch (error) {
                console.error('處理練習項目時發生錯誤:', error, practice);
            }
        });
    } catch (error) {
        console.error('顯示練習列表時發生錯誤:', error);
        practiceList.innerHTML = '<li class="error-message">顯示練習時發生錯誤</li>';
    }
}


//0301修改
async function loadPractices() {
    const token = localStorage.getItem('token');

    try {
        const response = await fetch('/api/practice/practices', {
            headers: { Authorization: `Bearer ${token}` },
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        
        // 嘗試解析 JSON 回應
        const data = await response.json();
        console.log('API 回應數據:', data); // 調試用，查看實際數據格式

        // 獲取練習列表容器
        const practiceList = document.getElementById('practiceList');
        const practiceSearchContainer = document.getElementById('practiceSearchContainer');
        
        // 確保創建或清空搜尋容器
        if (!practiceSearchContainer) {
            // 創建搜尋和篩選容器
            const searchContainer = document.createElement('div');
            searchContainer.id = 'practiceSearchContainer';
            searchContainer.classList.add('practice-search-container');
            
            // 創建搜尋框
            const searchInput = document.createElement('input');
            searchInput.type = 'text';
            searchInput.id = 'practiceSearchInput';
            searchInput.placeholder = '搜尋練習...';
            searchInput.classList.add('practice-search-input');
            
            // 創建日期篩選下拉選單
            const dateFilter = document.createElement('select');
            dateFilter.id = 'practiceDateFilter';
            dateFilter.classList.add('practice-filter');
            
            const dateOptions = [
                { value: 'all', text: '所有日期' },
                { value: 'today', text: '今天' },
                { value: 'week', text: '本週' },
                { value: '7days', text: '超過7天' }
            ];
            
            dateOptions.forEach(option => {
                const optElement = document.createElement('option');
                optElement.value = option.value;
                optElement.textContent = option.text;
                dateFilter.appendChild(optElement);
            });
            
            // 創建技巧篩選下拉選單
            const techniqueFilter = document.createElement('select');
            techniqueFilter.id = 'practiceTechniqueFilter';
            techniqueFilter.classList.add('practice-filter');
            
            const techniqueOptions = [
                { value: 'all', text: '所有技巧' },
                { value: '我訊息', text: '我訊息' },
                { value: '三明治溝通法', text: '三明治溝通法' },
                { value: '綜合溝通技巧', text: '綜合溝通技巧' }
            ];
            
            techniqueOptions.forEach(option => {
                const optElement = document.createElement('option');
                optElement.value = option.value;
                optElement.textContent = option.text;
                techniqueFilter.appendChild(optElement);
            });
            
            // 創建難度篩選下拉選單
            const difficultyFilter = document.createElement('select');
            difficultyFilter.id = 'practiceDifficultyFilter';
            difficultyFilter.classList.add('practice-filter');
            
            const difficultyOptions = [
                { value: 'all', text: '所有模式' },
                { value: '簡單', text: '基礎模式' },
                { value: '挑戰', text: '挑戰模式' }
            ];
            
            difficultyOptions.forEach(option => {
                const optElement = document.createElement('option');
                optElement.value = option.value;
                optElement.textContent = option.text;
                difficultyFilter.appendChild(optElement);
            });
            
            // 添加事件監聽器
            searchInput.addEventListener('input', filterPractices);
            dateFilter.addEventListener('change', filterPractices);
            techniqueFilter.addEventListener('change', filterPractices);
            difficultyFilter.addEventListener('change', filterPractices);
            
            // 將所有元素添加到搜尋容器
            searchContainer.appendChild(searchInput);
            searchContainer.appendChild(dateFilter);
            searchContainer.appendChild(techniqueFilter);
            searchContainer.appendChild(difficultyFilter);
            
            // 將搜尋容器添加到練習列表前
            practiceList.parentNode.insertBefore(searchContainer, practiceList);
        }
        
        // 清空練習列表
        practiceList.innerHTML = '';

        // 處理不同的API回應格式
        let practices = [];
        if (Array.isArray(data)) {
            // 如果直接返回了數組
            practices = data;
        } else if (data.success && Array.isArray(data.practices)) {
            // 如果符合原始格式
            practices = data.practices;
        } else if (data.total !== undefined && Array.isArray(data.practices)) {
            // 如果符合新格式
            practices = data.practices;
        } else {
            console.error('未知的API回應格式', data);
            practiceList.innerHTML = '<li class="error-message">API回應格式異常</li>';
            return;
        }
        
        // 過濾已有分析結果的練習
        let analyzedPractices = practices.filter(practice => {
            // 檢查是否有分析結果 (包括空字串或null之外的任何值)
            return practice.analysis !== undefined && practice.analysis !== null && practice.analysis !== '';
        });
        
        console.log(`找到 ${analyzedPractices.length} 個有分析結果的練習`);

        if (analyzedPractices.length === 0) {
            practiceList.innerHTML = '<li class="no-practice">尚無完成的練習記錄</li>';
            
            // 顯示引導訊息
            const emptyPracticesGuide = document.getElementById('emptyPracticesGuide');
            if (emptyPracticesGuide) {
                emptyPracticesGuide.style.display = 'block';
                practiceList.style.display = 'none';
            }
            
            return;
        } else {
            // 隱藏引導訊息
            const emptyPracticesGuide = document.getElementById('emptyPracticesGuide');
            if (emptyPracticesGuide) {
                emptyPracticesGuide.style.display = 'none';
                practiceList.style.display = 'block';
            }
        }
        
        // 儲存所有練習資料到全局變數，方便篩選時使用
        window.practicesData = analyzedPractices;
        
        // 更新練習計數
        const practicesCount = document.getElementById('practicesCount');
        if (practicesCount) {
            practicesCount.textContent = `(${analyzedPractices.length})`;
        }
        
        // 初始顯示所有符合條件的練習
        displayFilteredPractices(analyzedPractices);
        
    } catch (error) {
        console.error('載入練習失敗:', error);
        const practiceList = document.getElementById('practiceList');
        practiceList.innerHTML = '<li class="error-message">載入練習時發生錯誤: ' + error.message + '</li>';
    }
}

// 根據篩選條件顯示練習
function filterPractices() {
    if (!window.practicesData) return;
    
    const searchText = document.getElementById('practiceSearchInput').value.toLowerCase();
    const dateFilter = document.getElementById('practiceDateFilter').value;
    const techniqueFilter = document.getElementById('practiceTechniqueFilter').value;
    const difficultyFilter = document.getElementById('practiceDifficultyFilter').value;
    
    // 篩選練習
    let filteredPractices = window.practicesData.filter(practice => {
        // 搜尋關鍵字篩選
        const scenarioMatch = practice.scenario && practice.scenario.toLowerCase().includes(searchText);
        const techniqueMatch = practice.technique && practice.technique.toLowerCase().includes(searchText);
        const hasSearchText = !searchText || scenarioMatch || techniqueMatch;
        
        // 日期篩選
        let passDateFilter = true;
        if (dateFilter !== 'all') {
            const practiceDate = new Date(practice.createdAt);
            const today = new Date();
            
            if (dateFilter === 'today') {
                passDateFilter = isSameDay(practiceDate, today);
            } else if (dateFilter === 'week') {
                passDateFilter = isThisWeek(practiceDate, today);
            } else if (dateFilter === '7days') {
                const sevenDaysAgo = new Date(today);
                sevenDaysAgo.setUTCDate(today.getUTCDate() - 7);
                return practiceDate < sevenDaysAgo;
            }
        }
        
        // 技巧篩選
        const passTechniqueFilter = techniqueFilter === 'all' || practice.technique === techniqueFilter;
        
        // 難度篩選
        const passDifficultyFilter = difficultyFilter === 'all' || practice.difficulty === difficultyFilter;
        
        return hasSearchText && passDateFilter && passTechniqueFilter && passDifficultyFilter;
    });
    
    // 顯示篩選後的練習
    displayFilteredPractices(filteredPractices);
}



// 修正 API 路由檢查以更好地處理回應格式問題
async function fixPracticeRoutes() {
    try {
        const response = await fetch('/api/practice/practices', {
            method: 'GET',
            headers: { 
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        
        // 檢查回應結構
        const data = await response.json();
        console.log('API 回應檢查:', data);
        
        // 根據回應格式，可能需要在伺服器端修復 API 或在前端適應不同格式
    } catch (error) {
        console.error('API 檢查失敗:', error);
    }
}


// 日期輔助函數：檢查是否為同一天
function isSameDay(date1, date2) {
    return date1.getFullYear() === date2.getFullYear() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getDate() === date2.getDate();
}

// 日期輔助函數：檢查是否在同一週
function isThisWeek(date, today) {
    const firstDayOfWeek = new Date(today);
    const day = today.getDay() || 7; // 若 today 是周日，getDay() 會返回 0
    firstDayOfWeek.setDate(today.getDate() - day + 1); // 設置為本週一
    firstDayOfWeek.setHours(0, 0, 0, 0); // 設置為當天開始時間
    
    const lastDayOfWeek = new Date(firstDayOfWeek);
    lastDayOfWeek.setDate(firstDayOfWeek.getDate() + 6); // 設置為本週日
    lastDayOfWeek.setHours(23, 59, 59, 999); // 設置為當天結束時間
    
    return date >= firstDayOfWeek && date <= lastDayOfWeek;
}

// 日期輔助函數：檢查是否在同一月
function isSameMonth(date, today) {
    return date.getFullYear() === today.getFullYear() &&
           date.getMonth() === today.getMonth();
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


// main.js 中的錄音處理部分
startRecordBtn.addEventListener('click', async () => {
    if (isWaitingForSubmission && submissionTimer) {
        clearTimeout(submissionTimer);
        submissionTimer = null;
    }

    try {
        // 確保進度條元素已添加到DOM
        addRecordingProgressElements();

        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorder = new MediaRecorder(stream);
        audioChunks = [];

        mediaRecorder.ondataavailable = (event) => {
            audioChunks.push(event.data);
        };

        // 如果是挑戰模式且倒計時尚未開始，則開始倒計時
        const difficulty = difficultySelect.value;
        if (difficulty === '挑戰' && !challengeTimer) {
            startCountdown();
        }

        mediaRecorder.onstop = async () => {
            try {
                isRecording = false;
                startRecordBtn.disabled = false;
                stopRecordBtn.disabled = true;

                // 停止錄音計時器和進度顯示
                stopRecordingTimer();

                const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
                recordStatus.textContent = '處理中...請稍候';

                if (!currentPracticeId) {
                    throw new Error('未選擇練習 ID，請先建立或選擇一個練習');
                }

                const formData = new FormData();
                formData.append('audio', audioBlob);
                formData.append('practiceId', currentPracticeId);

                const uploadResponse = await fetch('/api/audio/transcribe', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    },
                    body: formData
                });

                if (!uploadResponse.ok) {
                    throw new Error('轉錄 API 請求失敗');
                }

                const data = await uploadResponse.json();
                
                if (!data.success && data.error) {
                    throw new Error(data.error);
                }

                // 在這裡加入簡體轉繁體的處理
                let transcribedText = data.text;
                try {
                    transcribedText = await convertToTraditional(data.text);
                    console.log('轉換後的繁體文字:', transcribedText);
                } catch (conversionError) {
                    console.error('簡體轉繁體失敗:', conversionError);
                    // 如果轉換失敗，仍使用原始文字
                }

                currentAccumulatedText = `${currentAccumulatedText.trim()} ${transcribedText}`.trim();
                updateTranscriptionPreview(currentAccumulatedText);

                await loadRecordingsHistory(currentPracticeId);

                if (submissionTimer) {
                    clearTimeout(submissionTimer);
                }

                let countdown = 5;
                isWaitingForSubmission = true;

                recordStatus.textContent = `已轉錄！若需補充請繼續按下"開始錄音"，AI將再 ${countdown} 秒後回應`;

                submissionTimer = setInterval(async () => {
                    countdown--;
                    recordStatus.textContent = `已轉錄！若需補充請繼續按下"開始錄音"，AI將再 ${countdown} 秒後回應`;

                    if (countdown <= 0) {
                        clearInterval(submissionTimer);
                        submissionTimer = null;

                        if (currentAccumulatedText.trim().length > 0) {
                            await handleSubmission(currentAccumulatedText);
                        }
                        
                        currentAccumulatedText = '';
                        isWaitingForSubmission = false;
                    }
                }, 1000);

            } catch (error) {
                console.error('轉錄錯誤：', error);
                recordStatus.textContent = '發生錯誤：' + error.message;
                
                isRecording = false;
                startRecordBtn.disabled = false;
                stopRecordBtn.disabled = true;
            } finally {
                // 清理資源
                if (mediaRecorder && mediaRecorder.stream) {
                    mediaRecorder.stream.getTracks().forEach(track => track.stop());
                }
            }
        };

        mediaRecorder.start();
        isRecording = true;

        startRecordBtn.disabled = true;
        stopRecordBtn.disabled = false;
        recordStatus.textContent = '錄音中...（最多 120 秒）';

        // 開始錄音計時器和進度顯示
        startRecordingTimer();

    } catch (err) {
        console.error('麥克風存取錯誤:', err);
        recordStatus.textContent = '無法存取麥克風：' + err.message;
    }
});


const techniqueIntroductions = {
    "我訊息": `
        <h3>我訊息</h3>
        <p>
            1. 具體描述對方行為：<br>
            2. 說出自己主觀感受：<br>
            3. 表達自己觀點立場：<br>
            4. 提出未來改善作法：<br>
        </p>
    `,
    "三明治溝通法": `
        <h3>三明治溝通法</h3>
        <p>
            1. 第一層麵包（正向回饋）：<br>
            2. 夾心部分（建設性批評或回饋）：<br>
            3. 第二層麵包（再度正向回饋）：<br>
        </p>
    `,
    "綜合溝通技巧": `
        <h3>綜合溝通技巧</h3>
        <p>
            1. 情感表現：主動釋出善意，明顯展現理解與同理，語氣溫和尊重，親師關係正向發展。<br>
            2. 內容回應：回應聚焦問題核心，根據家長語意做出恰當補充與引導建立共識，展現高度情境掌握力。<br>
            3. 清晰表達：語言表達自然順暢，用詞精準恰當，結構明確，易於理解與建立信任。<br>
            4. 溝通技巧：恰當運用「我訊息」、「三明治溝通法」或其他正向溝通技巧，結構自然、效果良好。如無需使用技巧，語氣結構仍具高度專業。<br>
        </p>
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


            // 停止錄音計時器和進度顯示
            stopRecordingTimer();

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

// async function startDialogue(practiceId) {
//     if (!checkAuthStatus()) {
//         return;
//     }

//     const scenarioDisplay = document.getElementById('scenarioDisplay');
//     const dialogueDisplay = document.getElementById('dialogueDisplay');

//     scenarioDisplay.innerHTML = '';
//     dialogueDisplay.innerHTML = '';

//     enableUserInput();

//     const spinner = document.getElementById('loadingSpinner');
//     spinner.classList.add('spinner-visible');

//     try {
//         // 檢查是否有選擇溝通技巧
//         const technique = techniqueSelect.value;
//         const difficulty = difficultySelect.value;

//         dialogueCount = 0; // 重置對話計數

//         if (!technique) {
//             throw new Error('請選擇溝通技巧');
//         }

//         console.log('發送開始對話請求，參數:', {
//             technique,
//             difficulty,
//             practiceId
//         }); 

//         // 檢查是否已經有練習記錄
//         const response = await fetch('/api/dialogue/start-dialogue', {
//             method: 'POST',
//             headers: {
//                 'Content-Type': 'application/json',
//                 'Authorization': `Bearer ${localStorage.getItem('token')}`
//             },
//             body: JSON.stringify({ 
//                 technique,
//                 difficulty,
//                 practiceId
//             }),
//         });

//         if (!response.ok) {
//             const errorData = await response.json();
//             throw new Error(errorData.error || '開始對話失敗');
//         }

//         const data = await response.json();
        
//         scenarioDisplay.innerHTML = `
//             <div class="message-header">📝 情境</div>
//             <div class="message-content">${data.scenario || '無法載入情境'}</div>
//         `;

//         dialogueDisplay.innerHTML = `
//             <div class="message suggestion">
//                 <div class="message-header">💡 建議開場白</div>
//                 <div class="message-content">${data.teacherSuggestion || '無建議開場白'}</div>
//             </div>
//             <div class="message 家長">
//                 <div class="message-header" style="text-align: left">👤 家長</div>
//                 <div class="message-content">${data.response || '無回應'}</div>
//                 <div class="message-time" style="text-align: left">${new Date().toLocaleTimeString()}</div>
//             </div>
//         `;

//         // 啟動挑戰模式倒計時
//         if (difficulty === '挑戰') {
//             startCountdown();
//         }

//     } catch (error) {
//         console.error('開始對話失敗:', error);
//         alert(error.message);
//         scenarioDisplay.innerHTML = `
//             <div class="message error">
//                 <div class="message-header">❌ 錯誤</div>
//                 <div class="message-content">${error.message}</div>
//             </div>
//         `;
//     } finally {
//         // 隱藏 loading spinner
//         spinner.classList.remove('spinner-visible');
//     }
// }

// 0301更新 startDialogue 函數，確保練習完成後才添加到練習列表



// 0301處理對話結束時，更新練習列表

// 更新 startDialogue 函數，支持指定情境

// 確保 startDialogue 函數在任何地方都使用指定的情境
async function startDialogue(practiceId, specifiedScenario = null) {
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
            practiceId,
            specifiedScenario
        }); 

        const response = await fetch('/api/dialogue/start-dialogue', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({ 
                technique,
                difficulty,
                practiceId,
                specifiedScenario
            }),
        });

        if (!response.ok) {
            let errorMessage = '開始對話失敗';
            try {
                const errorData = await response.json();
                errorMessage = errorData.message || errorData.error || errorMessage;
                console.error('API 錯誤詳情:', errorData);
            } catch (e) {
                console.error('解析錯誤回應失敗:', e);
            }
            throw new Error(errorMessage);
        }

        const data = await response.json();
        
        if (!data.success) {
            throw new Error(data.message || 'API 回應失敗');
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

    } catch (error) {
        console.error('開始對話失敗:', error);
        const errorMessage = error.message || '發生未知錯誤';
        alert(`錯誤：${errorMessage}`);
        scenarioDisplay.innerHTML = `
            <div class="message error">
                <div class="message-header">❌ 錯誤</div>
                <div class="message-content">${errorMessage}</div>
            </div>
        `;
    } finally {
        spinner.classList.remove('spinner-visible');
    }
}

async function handleDialogueEnd(practiceId, analysis) {
    // 更新練習記錄
    try {
        await fetch(`/api/practice/practices/${practiceId}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({ analysis }),
        });
        
        // 重新加載練習列表
        await loadPractices();
        
        // 自動選擇剛完成的練習
        const practiceItems = document.querySelectorAll('.practice-item');
        for (const item of practiceItems) {
            if (item.getAttribute('data-practice-id') === practiceId) {
                item.click();
                break;
            }
        }
    } catch (error) {
        console.error('更新練習記錄失敗:', error);
    }
}

// 初始化
// document.addEventListener('DOMContentLoaded', async () => {

    
//     if (!checkAuthStatus()) {
//         return;
//     }

//     await loadPractices();
//     currentPracticeId = localStorage.getItem('currentPracticeId');

//     if (currentPracticeId) {
//         await loadPracticeDetails(currentPracticeId);
//         await loadRecordingsHistory(currentPracticeId);
//     }

   
// });

//0301新增
document.addEventListener('DOMContentLoaded', async () => {
    // 先診斷練習 API
    await fixPracticeRoutes();
    
    // 然後正常初始化
    if (!checkAuthStatus()) {
        return;
    }

    await loadPractices();
    currentPracticeId = localStorage.getItem('currentPracticeId');

    // 顯示空練習提示
    const practiceList = document.getElementById('practiceList');
    const emptyPracticesGuide = document.getElementById('emptyPracticesGuide');
    
    if (practiceList.children.length === 0 || practiceList.innerHTML.includes('尚無練習記錄')) {
        if (emptyPracticesGuide) {
            emptyPracticesGuide.style.display = 'block';
            practiceList.style.display = 'none';
        }
    } else {
        if (emptyPracticesGuide) {
            emptyPracticesGuide.style.display = 'none';
            practiceList.style.display = 'block';
        }
    }

    if (currentPracticeId) {
        try {
            await loadPracticeDetails(currentPracticeId);
            await loadRecordingsHistory(currentPracticeId);
        } catch (error) {
            console.error('載入練習詳情失敗:', error);
            alert('載入練習詳情失敗，請重新選擇練習');
            localStorage.removeItem('currentPracticeId');
            currentPracticeId = null;
        }
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

        recordingsList.innerHTML = data.recordings.map(recording => {
            // 檢查是否為有效的 S3 URL
            const audioUrl = recording.path;
            const formattedTime = new Date(recording.timestamp).toLocaleString('zh-TW');
            
            return `
                <li class="recording-item">
                    <div class="recording-time">${formattedTime}</div>
                    <div class="audio-player">
                        <audio controls controlsList="nodownload" crossorigin="anonymous">
                            <source src="${audioUrl}" type="audio/wav">
                            您的瀏覽器不支援音訊播放
                        </audio>
                    </div>
                    <div class="recording-text">${recording.transcription || '無轉錄文字'}</div>
                </li>
            `;
        }).join('');

    } catch (error) {
        console.error('載入錄音歷史失敗:', error);
        const recordingsList = document.getElementById('recordingsList');
        recordingsList.innerHTML = '<li class="error-message">載入錄音記錄時發生錯誤</li>';
    }
}


// async function handleSubmission(text) {
//     try {
//         const difficulty = difficultySelect.value;
        
//         isWaitingForSubmission = false;
//         clearTranscriptionPreview();
        
//         recordStatus.textContent = '正在等待 AI 回應...';
        
//         if (!text || text.trim().length === 0) {
//             throw new Error('提交的文字內容為空');
//         }

//         updateDialogueDisplay("老師", text);

//         const response = await fetch('/api/dialogue/continue-dialogue', {
//             method: 'POST',
//             headers: {
//                 'Content-Type': 'application/json',
//                 'Authorization': `Bearer ${localStorage.getItem('token')}`
//             },
//             body: JSON.stringify({
//                 userResponse: text,
//                 practiceId: currentPracticeId,
//                 challengeTimeOver: false
//             })
//         });

//         if (!response.ok) {
//             throw new Error('API 請求失敗');
//         }

//         const data = await response.json();

//         if (!data) {
//             throw new Error('無效的回應數據');
//         }

//         // 檢查回應格式
//         if (difficulty === '簡單') {
//             if (data.completed && data.analysis) {
//                 analysisContent.innerHTML = `<pre>${data.analysis}</pre>`;
//                 disableUserInput();
//             } else if (data.response) {
//                 updateDialogueDisplay("家長", data.response);
//                 if (dialogueCount >= maxDialogues) {
//                     disableUserInput();
//                     showEndDialogueMessage();
//                 } else {
//                     recordStatus.textContent = '請點擊 "開始錄音" 回應下一句內容。';
//                     enableUserInput();
//                 }
//             }
//         } else if (difficulty === '挑戰') {
//             if (data.completed && data.analysis) {
//                 analysisContent.innerHTML = `<pre>${data.analysis}</pre>`;
//                 disableUserInput();
//             } else if (data.response) {
//                 updateDialogueDisplay("家長", data.response);
//                 recordStatus.textContent = '請點擊 "開始錄音" 回應下一句內容。';
//                 enableUserInput();
//             }
//         }

//         currentAccumulatedText = '';
        
//     } catch (error) {
//         console.error('對話提交錯誤:', error);
//         recordStatus.textContent = `錯誤：${error.message}`;
//         enableUserInput();
//     }
// }

//0301 更新
async function handleSubmission(text) {
    try {
        const difficulty = difficultySelect.value;
        
        isWaitingForSubmission = false;
        clearTranscriptionPreview();
        
        recordStatus.textContent = ' AI 分析中...';
        
        if (!text || text.trim().length === 0) {
            throw new Error('提交的文字內容為空');
        }

        updateDialogueDisplay("老師", text);

        const response = await fetch('/api/dialogue/continue-dialogue', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({
                userResponse: text,
                practiceId: currentPracticeId,
                challengeTimeOver: false
            })
        });

        if (!response.ok) {
            throw new Error('API 請求失敗');
        }

        const data = await response.json();

        if (!data) {
            throw new Error('無效的回應數據');
        }

        // 檢查回應格式
        if (difficulty === '簡單') {
            if (data.completed && data.analysis) {
                analysisContent.innerHTML = `<pre>${data.analysis}</pre>`;
                disableUserInput();
                // 處理對話結束，更新練習列表
                await handleDialogueEnd(currentPracticeId, data.analysis);
            } else if (data.response) {
                updateDialogueDisplay("家長", data.response);
                if (dialogueCount >= maxDialogues) {
                    disableUserInput();
                    showEndDialogueMessage();
                } else {
                    recordStatus.textContent = '請點擊 "開始錄音" 回應下一句內容。';
                    enableUserInput();
                }
            }
        } else if (difficulty === '挑戰') {
            if (data.completed && data.analysis) {
                analysisContent.innerHTML = `<pre>${data.analysis}</pre>`;
                disableUserInput();
                // 處理對話結束，更新練習列表
                await handleDialogueEnd(currentPracticeId, data.analysis);
            } else if (data.response) {
                updateDialogueDisplay("家長", data.response);
                recordStatus.textContent = '請點擊 "開始錄音" 回應下一句內容。';
                enableUserInput();
            }
        }

        currentAccumulatedText = '';
        
    } catch (error) {
        console.error('對話提交錯誤:', error);
        recordStatus.textContent = `錯誤：${error.message}`;
        enableUserInput();
    }
}

// 0301更新挑戰模式結束邏輯函數
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
                userResponse: "", 
                practiceId: currentPracticeId,
                challengeTimeOver: true
            })
        });

        const data = await response.json();

        if (data.analysis) {
            analysisContent.innerHTML = `<pre>${data.analysis}</pre>`;
            // 處理對話結束，更新練習列表
            await handleDialogueEnd(currentPracticeId, data.analysis);
        } else {
            analysisContent.innerHTML = '<p>未獲得分析結果，請稍後再試。</p>';
        }

        showEndDialogueMessage(); // 顯示對話結束訊息
    } catch (error) {
        console.error('挑戰模式結束時發生錯誤:', error);
        recordStatus.textContent = '分析失敗，請重試';
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
    countdownRemaining = 300; // 重置倒計時
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
    countdownRemaining = 300; // 重置倒計時為初始值（5 分鐘）
    const countdownDisplay = document.getElementById('countdownDisplay');
    if (countdownDisplay) {
        countdownDisplay.textContent = '倒計時: 5:00'; // 恢復倒計時初始狀態
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

// 新增簡體轉繁體的函數
function convertToTraditional(text) {
    // 使用 OpenCC 的 API 進行轉換
    return fetch('https://api.zhconvert.org/convert', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            text: text,
            converter: 'China-to-Taiwan' // 簡體轉繁體
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            return data.text;
        }
        throw new Error('轉換失敗');
    });
}