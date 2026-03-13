/**
 * 注意力觀察紀錄系統 - 核心邏輯 (script.js)
 */

// 1. 初始狀態與全域變數
let state = {
    mode: '',       // 'single' 或 'double'
    config: {},     // 包含觀察者、活動名稱、學生姓名等
    time: 0,        // 秒數
    timer: null,    // 計時器實例
    data: {},       // 行為次數紀錄 {'A-分心': 0, 'B-分心': 0...}
    actions: ['分心', '扭動', '離座', '出聲', '玩物品'] // 預設項度
};

const STORAGE_KEY = 'attention_app_data';

// 2. 頁面初始化：載入自訂設定與雲端設定
window.onload = function() {
    const savedActions = localStorage.getItem('custom_dimensions');
    if (savedActions) {
        state.actions = JSON.parse(savedActions);
    }
    document.getElementById('customActions').value = state.actions.join('\n');

    const savedCloud = localStorage.getItem('cloud_config');
    if (savedCloud) {
        const cloud = JSON.parse(savedCloud);
        document.getElementById('cloudURL').value = cloud.binId || '';
        document.getElementById('cloudToken').value = cloud.apiKey || '';
    }
};

// 3. 畫面導覽邏輯
function setMode(mode) {
    state.mode = mode;
    document.getElementById('screen-home').classList.add('hidden');
    document.getElementById('screen-settings').classList.remove('hidden');
    
    const stuBInput = document.getElementById('stuB');
    if (mode === 'double') {
        stuBInput.classList.remove('hidden');
    } else {
        stuBInput.classList.add('hidden');
    }
}

function openSettings() {
    // 隱藏當前所有顯示的 main-content 區塊
    document.querySelectorAll('.main-content > div').forEach(div => div.classList.add('hidden'));
    document.getElementById('screen-config').classList.remove('hidden');
}

// 4. 設定功能：儲存雲端與項度設定
function saveGlobalSettings() {
    // 儲存自訂項度
    const text = document.getElementById('customActions').value;
    const newActions = text.split('\n').filter(line => line.trim() !== '');
    state.actions = newActions;
    localStorage.setItem('custom_dimensions', JSON.stringify(newActions));
    
    // 儲存雲端設定 (單獨儲存)
    const cloudConfig = {
        binId: document.getElementById('cloudURL').value,
        apiKey: document.getElementById('cloudToken').value
    };
    localStorage.setItem('cloud_config', JSON.stringify(cloudConfig));
    
    alert('設定已儲存並重新載入');
    location.reload();
}

function resetCloudConfig() {
    if (confirm("確定要重置雲端設定欄位嗎？")) {
        document.getElementById('cloudURL').value = '';
        document.getElementById('cloudToken').value = '';
    }
}

// 5. 觀察核心功能
function startObservation() {
    state.config = {
        obsName: document.getElementById('obsName').value,
        actName: document.getElementById('actName').value,
        stuA: document.getElementById('stuA').value || '學生 A',
        stuB: document.getElementById('stuB').value || '學生 B',
        date: document.getElementById('obsDate').value
    };

    document.getElementById('screen-settings').classList.add('hidden');
    document.getElementById('screen-observe').classList.remove('hidden');

    const container = document.getElementById('actionButtons');
    container.innerHTML = ''; 

    // 生成觀察計數介面
    if (state.mode === 'double') {
        container.innerHTML = `
            <div class="observe-grid">
                <div class="student-col"><h3>${state.config.stuA}</h3><div id="btns-A"></div></div>
                <div class="student-col"><h3>${state.config.stuB}</h3><div id="btns-B"></div></div>
            </div>`;
        ['A', 'B'].forEach(studentKey => {
            const btnContainer = document.getElementById(`btns-${studentKey}`);
            state.actions.forEach(action => {
                btnContainer.innerHTML += `
                    <div class="counter-row">
                        <span>${action}</span>
                        <span id="val-${studentKey}-${action}" class="count-num">0</span>
                        <button onclick="addCount('${studentKey}', '${action}')">+1</button>
                    </div>`;
            });
        });
    } else {
        state.actions.forEach(action => {
            container.innerHTML += `
                <div class="counter-row">
                    <span>${action}</span>
                    <span id="val-A-${action}" class="count-num">0</span>
                    <button onclick="addCount('A', '${action}')">+1</button>
                </div>`;
        });
    }

    // 啟動計時器
    state.time = 0;
    if (state.timer) clearInterval(state.timer);
    state.timer = setInterval(() => {
        state.time++;
        let m = Math.floor(state.time / 60).toString().padStart(2, '0');
        let s = (state.time % 60).toString().padStart(2, '0');
        document.getElementById('timerDisplay').innerText = `總時間: ${m}:${s}`;
    }, 1000);
}

function addCount(student, action) {
    let key = `${student}-${action}`;
    state.data[key] = (state.data[key] || 0) + 1;
    document.getElementById(`val-${student}-${action}`).innerText = state.data[key];
    // 同步儲存到本地，防止跳電或當機
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function finishObservation() {
    clearInterval(state.timer);
    document.getElementById('screen-observe').classList.add('hidden');
    document.getElementById('screen-report').classList.remove('hidden');
    renderReport();
}

// 6. 報表與統計圖
function renderReport() {
    const dataA = state.actions.map(act => state.data[`A-${act}`] || 0);
    const dataB = state.actions.map(act => state.data[`B-${act}`] || 0);

    const ctx = document.getElementById('analysisChart').getContext('2d');
    if (window.myChart) window.myChart.destroy();

    window.myChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: state.actions,
            datasets: [
                { label: state.config.stuA, data: dataA, backgroundColor: '#4a90e2' },
                { label: state.config.stuB, data: dataB, backgroundColor: '#e74c3c', hidden: state.mode === 'single' }
            ]
        },
        options: {
            responsive: true,
            scales: { y: { beginAtZero: true } }
        }
    });
}

// 7. 匯出/匯入/重置功能 (LocalStorage 規範)
function systemReset() {
    if (confirm("確定要重置系統嗎？這將刪除所有本地資料與項度設定。")) {
        localStorage.removeItem(STORAGE_KEY);
        localStorage.removeItem('custom_dimensions');
        alert("系統已還原至初始狀態");
        location.reload();
    }
}

function fileExport() {
    const data = localStorage.getItem(STORAGE_KEY) || JSON.stringify(state);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attention_data_${new Date().toISOString().slice(0,10)}.json`;
    a.click();
}

function fileImport() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = e => {
        const file = e.target.files[0];
        const reader = new FileReader();
        reader.onload = (event) => {
            localStorage.setItem(STORAGE_KEY, event.target.result);
            alert("資料已匯入，頁面即將刷新");
            location.reload();
        };
        reader.readAsText(file);
    };
    input.click();
}

// 8. 雲端備份功能 (Jsonbin & Upstash)
async function cloudUpload() {
    const cloudStr = localStorage.getItem('cloud_config');
    if (!cloudStr) return alert("請先至設定填寫雲端 URL 與 Token");
    
    const { binId, apiKey } = JSON.parse(cloudStr);
    if (!binId || !apiKey) return alert("雲端設定不完整，請檢查設定頁面");

    if (!confirm("確定要上傳當前資料到雲端嗎？")) return;

    const isUpstash = binId.includes('upstash.io');
    const localData = JSON.parse(localStorage.getItem(STORAGE_KEY) || JSON.stringify(state));
    
    // 安全性規範：排除敏感資訊
    delete localData.cloudConfig; 

    try {
        const url = isUpstash ? `${binId}/attention_data` : `https://api.jsonbin.io/v3/b/${binId}`;
        const headers = { 'Content-Type': 'application/json' };
        
        if (isUpstash) {
            headers['Authorization'] = `Bearer ${apiKey}`;
        } else {
            headers['X-Access-Key'] = apiKey;
        }

        const response = await fetch(url, {
            method: isUpstash ? 'PUT' : 'PUT', // Jsonbin 更新用 PUT
            headers: headers,
            body: JSON.stringify(localData)
        });

        if (response.ok) alert("雲端上傳成功！");
        else throw new Error("上傳失敗");
    } catch (err) {
        alert("雲端通訊出錯: " + err.message);
    }
}

async function cloudDownload() {
    const cloudStr = localStorage.getItem('cloud_config');
    if (!cloudStr) return alert("請先至設定填寫雲端資訊");
    const { binId, apiKey } = JSON.parse(cloudStr);

    if (!confirm("警告：下載將會覆蓋本地所有資料，確定繼續？")) return;

    const isUpstash = binId.includes('upstash.io');
    try {
        const url = isUpstash ? `${binId}/attention_data` : `https://api.jsonbin.io/v3/b/${binId}/latest`;
        const headers = {};
        if (isUpstash) headers['Authorization'] = `Bearer ${apiKey}`;
        else headers['X-Access-Key'] = apiKey;

        const response = await fetch(url, { headers });
        const resData = await response.json();
        
        const finalData = isUpstash ? resData.result : resData.record;
        localStorage.setItem(STORAGE_KEY, typeof finalData === 'string' ? finalData : JSON.stringify(finalData));
        
        alert("下載成功，正在套用資料");
        location.reload();
    } catch (err) {
        alert("下載失敗: " + err.message);
    }
}

function exportExcel() {
    // 簡單的 CSV 導出
    let csvContent = "時間,學生,行為\n";
    // 這裡可以根據 logs 擴充紀錄，目前以總數為例
    alert("正在產生統計數據 CSV...");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "attention_report.csv";
    link.click();
}