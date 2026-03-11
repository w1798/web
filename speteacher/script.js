let state = { mode: '', config: {}, time: 0, timer: null, data: {} };
const actions = ['分心', '扭動', '離座', '出聲', '玩物品'];

function setMode(mode) {
    state.mode = mode;
    document.getElementById('screen-home').classList.add('hidden');
    document.getElementById('screen-settings').classList.remove('hidden');
    if (mode === 'double') document.getElementById('stuB').classList.remove('hidden');
}

function startObservation() {
    // 1. 取得設定資訊並存入狀態
    state.config = {
        stuA: document.getElementById('stuA').value || '學生 A',
        stuB: document.getElementById('stuB').value || '學生 B'
    };

    // 2. 切換畫面顯示
    document.getElementById('screen-settings').classList.add('hidden');
    document.getElementById('screen-observe').classList.remove('hidden');

    // 3. 生成觀察介面 (根據模式)
    const container = document.getElementById('actionButtons');
    container.innerHTML = ''; // 清空舊內容

    if (state.mode === 'double') {
        // 雙人模式：使用 flexbox 左右排列
        container.innerHTML = `
            <div class="observe-grid">
                <div class="student-col" id="col-A">
                    <h3>${state.config.stuA}</h3>
                    <div id="btns-A"></div>
                </div>
                <div class="student-col" id="col-B">
                    <h3>${state.config.stuB}</h3>
                    <div id="btns-B"></div>
                </div>
            </div>
        `;
        // 為兩位學生分別建立行為按鈕
        ['A', 'B'].forEach(studentKey => {
            const btnContainer = document.getElementById(`btns-${studentKey}`);
            actions.forEach(action => {
                btnContainer.innerHTML += `
                    <div class="counter-row">
                        <span>${action}</span>
                        <span id="val-${studentKey}-${action}" class="count-num">0</span>
                        <button onclick="addCount('${studentKey}', '${action}')">+1</button>
                    </div>`;
            });
        });
    } else {
        // 單人模式：單一列表
        actions.forEach(action => {
            container.innerHTML += `
                <div class="counter-row">
                    <span>${action}</span>
                    <span id="val-A-${action}" class="count-num">0</span>
                    <button onclick="addCount('A', '${action}')">+1</button>
                </div>`;
        });
    }

    // 4. 啟動計時器
    state.time = 0;
    if (state.timer) clearInterval(state.timer); // 避免重複啟動
    state.timer = setInterval(() => {
        state.time++;
        let m = Math.floor(state.time / 60).toString().padStart(2, '0');
        let s = (state.time % 60).toString().padStart(2, '0');
        document.getElementById('timerDisplay').innerText = `總時間: ${m}:${s}`;
    }, 1000);
}

// 輔助函式：處理數字增加
function addCount(student, action) {
    let key = `${student}-${action}`;
    state.data[key] = (state.data[key] || 0) + 1;
    document.getElementById(`val-${student}-${action}`).innerText = state.data[key];
}

function finishObservation() {
    clearInterval(state.timer);
    document.getElementById('screen-observe').classList.add('hidden');
    document.getElementById('screen-report').classList.remove('hidden');
    renderReport();
}

function renderReport() {
    // 取得觀察數據的 labels 和對應的數值
    const labels = actions; // ['分心', '扭動', '離座', '出聲', '玩物品']
    
    // 整理 A 和 B 的數據陣列
    const dataA = actions.map(act => state.data[`A-${act}`] || 0);
    const dataB = actions.map(act => state.data[`B-${act}`] || 0);

    const ctx = document.getElementById('analysisChart').getContext('2d');
    
    // 如果圖表已存在，先銷毀舊圖表再重繪
    if (window.myChart) window.myChart.destroy();

    window.myChart = new Chart(ctx, {
        type: 'bar', // 設定為長條圖
        data: {
            labels: labels,
            datasets: [
                {
                    label: state.config.stuA || '學生 A',
                    data: dataA,
                    backgroundColor: '#4a90e2' // 藍色
                },
                {
                    label: state.config.stuB || '學生 B',
                    data: dataB,
                    backgroundColor: '#e74c3c' // 紅色
                }
            ]
        },
        options: {
            responsive: true,
            scales: {
                y: { beginAtZero: true, title: { display: true, text: '發生次數' } }
            },
            plugins: {
                title: { display: true, text: '學生行為統計比較' }
            }
        }
    });
}

function exportExcel() {
    alert("正在匯出為 CSV 格式...");
}

// 簡單的函數，點擊開始觀察時觸發
function requestFullScreen() {
    let elem = document.documentElement;
    if (elem.requestFullscreen) {
        elem.requestFullscreen();
    }
}

const STORAGE_KEY = 'attention_app_data';

// 設定介面：自訂五個項度
function saveSettings(settings) {
    localStorage.setItem('custom_dimensions', JSON.stringify(settings));
}

// 雲端邏輯
async function cloudUpload() {
    const { binId, apiKey } = getCloudConfig();
    if (!binId || !apiKey) return alert("請先至設定填寫雲端資訊");
    
    if (!confirm("確定要上傳至雲端嗎？")) return;

    const isUpstash = binId.includes('upstash.io');
    const cleanData = JSON.parse(localStorage.getItem(STORAGE_KEY));
    // 排除安全資訊
    delete cleanData.cloudConfig; 

    const url = isUpstash ? `${binId}/attention_data` : `https://api.jsonbin.io/v3/b/${binId}`;
    const options = {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json',
            [isUpstash ? 'Authorization' : 'X-Access-Key']: apiKey 
        },
        body: JSON.stringify(cleanData)
    };
    await fetch(url, options);
    alert("上傳成功");
}

function systemReset() {
    if (!confirm("確定重置系統？這將刪除所有本地資料與設定。")) return;
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem('custom_dimensions');
    location.reload();
}
