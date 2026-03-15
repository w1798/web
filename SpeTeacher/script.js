/**
 * Charles Nextime Web Tools Portal - Core Logic
 * Copyright (c) 2026 Charles Nextime
 * Licensed under the GNU General Public License v3.0
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation.
 */

let state = {
    mode: '', 
    config: {
        timeMode: 'timer' // 明確定義預設值
    }, 
    time: 0, 
    timer: null,
    data: {}, 
    logs: [], 
    actions: ['分心', '扭動', '離座', '出聲', '玩物品'],
    currentView: 'view-home'
};

let myChart = null;

const STORAGE_KEY = 'attention_app_data';

// --- 初始化 (安全掛載) ---
window.onload = function() {
    // 1. 先讀取資料
    const savedState = localStorage.getItem(STORAGE_KEY);
    if (savedState) {
        try {
            state = JSON.parse(savedState);
        } catch (e) {
            console.error("解析狀態失敗", e);
        }
    }

    // 2. 強制補全結構 (確保不會出現 undefined)
    if (!state.config) state.config = { timeMode: 'timer' };
    if (!state.config.timeMode) state.config.timeMode = 'timer';

    // 3. 恢復邏輯
    if (state.startTime && !state.isFinished) {
        state.timer = setInterval(updateTimerDisplay, 1000);
        const resumeBtn = document.getElementById('btn-resume');
        if (resumeBtn) resumeBtn.classList.remove('hidden');
    }

    // 4. 使用 setTimeout 確保 DOM 渲染完畢後再設定選單值
    // 這能避開部分瀏覽器重整時，HTML 預設選取行為優先於 JS 執行順序的問題
    setTimeout(() => {
        const timeModeSelect = document.getElementById('timeMode');
        if (timeModeSelect) {
            timeModeSelect.value = state.config.timeMode;
            console.log("已同步模式為:", state.config.timeMode);
        }
    }, 100);

    // 5. 其他初始化
    const savedActions = localStorage.getItem('custom_dimensions');
    if (savedActions) state.actions = JSON.parse(savedActions);
    
    const cloud = JSON.parse(localStorage.getItem('cloud_config') || '{}');
    if(document.getElementById('cloudURL')) document.getElementById('cloudURL').value = cloud.binId || '';
    if(document.getElementById('cloudToken')) document.getElementById('cloudToken').value = cloud.apiKey || '';

    const dateEl = document.getElementById('obsDate');
    if (dateEl) dateEl.valueAsDate = new Date();
};

function saveStateToLocal() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

window.setMode = function(mode) {
    if (state.logs && state.logs.length > 0) {
        if (!confirm("系統偵測到有未完成或未匯出的觀察資料，現在開始新模式將會清除所有資料！是否確認已備份並開始新觀察？")) {
            return; // 使用者按取消，則什麼都不做
        }
    }
    
    state.data = {};
    state.logs = [];
    state.time = 0;
    state.mode = mode;
    saveStateToLocal();
    // 強制隱藏所有頁面，包含主頁
    window.hideAllViews(); 
    
    // 顯示設定頁面
    state.currentView = 'view-settings';
    const el = document.getElementById('view-settings');
    if (el) el.classList.remove('hidden');
    
    // 處理雙人輸入框顯示
    const stuB = document.getElementById('stuB');
    if (stuB) stuB.style.display = (mode === 'double') ? 'block' : 'none';
};

window.goHome = function() {
    // 移除原本的 confirm 確認視窗與 clearInterval 邏輯
    // 這樣返回主頁時，計時器會繼續在背景執行
    
    hideAllViews();
    document.getElementById('view-home').classList.remove('hidden');
    state.currentView = 'view-home';
    
    // 建議：在返回主頁時，把「繼續觀察」按鈕顯示出來
    const resumeBtn = document.getElementById('btn-resume');
    if (resumeBtn && (state.timer || state.time > 0)) {
        resumeBtn.classList.remove('hidden');
    }
};


window.resumeObservation = function() {
    if (state.mode === '') {
        alert("目前沒有進行中的觀察。");
        return;
    }
    hideAllViews();
    document.getElementById('view-observe').classList.remove('hidden');
    // 確保渲染界面
    renderObservationUI();
};


window.hideAllViews = function() {
    const views = ['view-home', 'view-settings', 'view-observe', 'view-report', 'view-config'];
    views.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.classList.add('hidden');
            // 額外保險：強制清除 inline-style 的 display
            el.style.display = ''; 
        }
    });
};

// 修正 openSettings：明確處理浮動視窗
window.openSettings = function() {
    // 這裡不要用 hideAllViews，否則會把背景視窗隱藏導致內容閃爍
    // 我們只顯示浮動視窗
    const configEl = document.getElementById('view-config');
    if (configEl) {
        configEl.classList.remove('hidden');
        
        // 載入當前設定
        const actInput = document.getElementById('customActions');
        if (actInput) actInput.value = state.actions.join('\n');
        
        const intervalInput = document.getElementById('reportInterval');
        if (intervalInput) intervalInput.value = localStorage.getItem('report_interval') || '0.5';
    }
};

window.closeSettings = function() {
    // 只隱藏設定浮動視窗
    const configEl = document.getElementById('view-config');
    if (configEl) configEl.classList.add('hidden');
};



window.fileExport = function() {
    // 1. 取得報表內容 (假設報表內容在一個 table 中)
    const table = document.querySelector('table');
    if (!table) return alert("沒有可匯出的數據！");

    let csvContent = "\ufeff"; // 加入 BOM 以解決 Excel 中文亂碼
    const rows = table.querySelectorAll('tr');

    rows.forEach(row => {
        const cols = row.querySelectorAll('th, td');
        const rowData = Array.from(cols).map(col => `"${col.innerText.replace(/"/g, '""')}"`);
        csvContent += rowData.join(',') + "\r\n";
    });

    // 2. 建立 Blob 下載連結
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    // 3. 在手機上建立隱藏的下載連結並觸發
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `觀察報告_${new Date().toLocaleDateString()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};


window.systemReset = function() {
    if(confirm("確定要執行系統重置（清除觀察紀錄與設定）嗎？")) {
        // 清除你程式中定義的所有關鍵 Key
        localStorage.removeItem('attention_app_data');      // 你的主資料 KEY
        localStorage.removeItem('custom_dimensions');     // 自訂觀察項目
        localStorage.removeItem('cloud_config');          // 雲端設定
        localStorage.removeItem('user_font_size');        // 字體大小設定
        localStorage.removeItem('report_interval');

        location.reload();
    }
};


function startObservation() {
    if (state.timer) {
        clearInterval(state.timer);
        state.timer = null;
    }
    
    // 獲取 UI 設定值
    const timeMode = document.getElementById('timeMode').value; // 獲取新增的下拉選單值

    state.config = {
        obsName: document.getElementById('obsName').value || '未填寫',
        actName: document.getElementById('actName').value || '未填寫',
        stuA: document.getElementById('stuA').value || '學生 A',
        stuB: document.getElementById('stuB').value || '學生 B',
        date: document.getElementById('obsDate').value,
        duration: parseInt(document.getElementById('duration').value),
        timeMode: timeMode // 儲存模式
    };
    
    hideAllViews();
    document.getElementById('view-observe').classList.remove('hidden');
    renderObservationUI();
    
    // --- 根據模式選擇邏輯 ---
    if (timeMode === 'realtime') {
        // 真實時間模式：不啟動自動計時器
        // 為了讓報表統計功能正常運作，我們可以啟動一個隱形的計時器來追蹤經過秒數
        state.timer = setInterval(() => {
            state.time++;
            updateTimerDisplay(); // 畫面仍會顯示經過的時間，但這只是參考
        }, 1000);
    } else {
        // 原本的計時模式
        const targetSeconds = state.config.duration * 60;

        state.timer = setInterval(() => {
            state.time++;
            
            // 檢查是否達到目標時間 (999 分鐘視為不限制)
            if (state.config.duration !== 999 && state.time >= targetSeconds) {
                clearInterval(state.timer);
                if (confirm("觀察時間已到，是否結束？")) {
                    finishObservation();
                } else {
                    // 若取消，啟動無上限計時
                    state.timer = setInterval(() => {
                        state.time++;
                        updateTimerDisplay();
                    }, 1000);
                }
                return;
            }
            updateTimerDisplay();
        }, 1000);
    }
    
    state.config.timeMode = document.getElementById('timeMode').value;
    
    state.startTime = Date.now(); // 記錄開始那一刻的時間戳
    state.isFinished = false;     // 新增一個旗標標記觀察狀態
    
    // 設定計時器，只需負責 UI 更新
    state.timer = setInterval(updateTimerDisplay, 1000);
}

function updateTimer() {
    if (!state.startTime) return;
    
    // 計算從開始到現在經過的秒數
    const elapsedSeconds = Math.floor((Date.now() - state.startTime) / 1000);
    state.time = elapsedSeconds; 
    
    updateTimerDisplay();
    saveState(); // 確保每秒自動儲存狀態到 localStorage
}


function renderObservationUI() {
    const container = document.getElementById('actionButtons');
    
    // 定義單個學生的 HTML 結構 (已移除刪除按鈕)
    const getBtnHTML = (sKey, sName) => `
        <div class="student-col">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 5px;">
                <h3 class="stu-title" style="margin:10;">${sName}</h3>
                <button onclick="addCustomEvent('${sKey}')" style="padding: 5px 10px; font-size: 1rem;">+備註</button>
            </div>
            <div class="actions-grid">
                ${state.actions.map(act => `
                    <div class="act-btn-wrapper">
                        <button class="act-btn" onclick="addCount('${sKey}', '${act}')">
                            ${act}<br><span id="val-${sKey}-${act}" class="count-badge">${state.data[sKey+'-'+act] || 0}</span>
                        </button>
                    </div>
                `).join('')}
            </div>
        </div>`;

        // 修正後的渲染邏輯，單人與雙人都有 .observe-grid 外殼
        const studentHTML = `
            <div class="observe-grid">
                ${getBtnHTML('A', state.config.stuA)}
                ${state.mode === 'double' ? getBtnHTML('B', state.config.stuB) : ''}
            </div>
        `;

    // 組合整體介面：將操作按鈕放在同一列
    container.innerHTML = `
        ${studentHTML}
        <div style="width:100%; margin-top:20px; display:flex; gap:10px;">
            <button onclick="addDynamicItem()" style="background:#28a745; flex:1; min-height:45px;">+ 新增項目</button>
            <button onclick="finishObservation()" class="btn-end" style="margin-top:0; flex:1; min-height:45px;">結束觀察並結算</button>
        </div>
        <div id="logArea" style="margin-top:20px;"></div>
    `;
    
    if (typeof updateLiveLogs === 'function') updateLiveLogs();
}

function addCount(sKey, act) {
    const key = `${sKey}-${act}`;
    state.data[key] = (state.data[key] || 0) + 1;
    
    // 決定時間字串顯示方式
    let timeLabel;
    if (state.config.timeMode === 'realtime') {
        timeLabel = new Date().toLocaleTimeString('zh-TW', { hour12: false });
    } else {
        timeLabel = document.getElementById('timerDisplay').innerText.replace('總時間: ', '').split('/')[0].trim();
    }

    state.logs.push({ 
        time: timeLabel, 
        seconds: state.time, 
        stu: sKey === 'A' ? state.config.stuA : state.config.stuB, 
        act: act 
    });
    document.getElementById(`val-${sKey}-${act}`).innerText = state.data[key];
    saveStateToLocal(); 
    updateLiveLogs();
}

function updateLiveLogs() {
    let logBox = document.getElementById('liveLogDisplay');
    if (!logBox) {
        logBox = document.createElement('div');
        logBox.id = 'liveLogDisplay';
        logBox.className = 'live-log-box';
        document.getElementById('view-observe').appendChild(logBox);
    }

    // 1. 取出最後 10 筆資料
    // 2. reverse() 讓最新的排在陣列最前面
    const recentLogs = [...state.logs].slice(-10).reverse();

    logBox.innerHTML = `
        <strong>最新紀錄 (最近 10 筆)：</strong>
        <div class="log-scroll" style="height: 150px; overflow-y: auto; border: 1px solid #ccc; padding: 5px; background: #fff;">
            ${recentLogs.map(l => `<div>[${l.time}] ${l.stu}: ${l.act}</div>`).join('')}
        </div>
    `;
}

// 修改原本的 finishObservation 函式
function finishObservation() {
    // 加入強制確認
    if (!confirm("確定要結束本次觀察並產生報表嗎？\n(結束後將進入結算頁面)")) {
        return; // 使用者按取消，保持在觀察頁面
    }
    
    clearInterval(state.timer);
    state.timer = null; // 確保計時器歸零
    
    hideAllViews();
    document.getElementById('view-report').classList.remove('hidden');
    renderFinalReport();
}

function renderFinalReport() {
    const container = document.getElementById('reportTableContainer');
    const durationMin = state.config.duration;
    
    // 從輸入框讀取值，若無則預設為 0.5 (即 30 秒)
    const storedInterval = localStorage.getItem('report_interval');
    const intervalVal = storedInterval ? parseFloat(storedInterval) : 0.5;
    const intervalSec = intervalVal * 60;
    
    let html = `<div class="report-info">觀察者：${state.config.obsName} | 活動：${state.config.actName} | 日期：${state.config.date}</div>`;
    
    const generateTable = (sKey, sName) => {
        let t = `<h3>學生：${sName}</h3><table class="segment-table"><tr><th>時間區段</th>${state.actions.map(a => `<th>${a}</th>`).join('')}</tr>`;

        for (let i = 0; i < durationMin * 60; i += intervalSec) {
            let segStart = `${Math.floor(i/60)}:${(i%60===0?'00':(i%60))}`;
            let nextI = i + intervalSec;
            let segEnd = `${Math.floor(nextI/60)}:${(nextI%60===0?'00':(nextI%60))}`;
            
            t += `<tr><td>${segStart}–${segEnd}</td>${state.actions.map(a => {
                let count = state.logs.filter(l => l.stu === sName && l.act === a && l.seconds >= i && l.seconds < nextI).length;
                return `<td>${count}</td>`;
            }).join('')}</tr>`;
        }

        t += `<tr class="total-row"><td>總計</td>${state.actions.map(a => `<td>${state.data[sKey+'-'+a] || 0}</td>`).join('')}</tr>`;
        return t + `</table>`;
    };

    html += generateTable('A', state.config.stuA);
    if (state.mode === 'double') html += generateTable('B', state.config.stuB);
    container.innerHTML = html;
    
    renderTimeline();
    renderChart();
}


function renderChart() {
    const canvas = document.getElementById('analysisChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    // 如果之前已經有圖表，先銷毀它，避免畫布疊加與報錯
    if (myChart) {
        myChart.destroy();
    }

    const datasets = [{
        label: state.config.stuA,
        data: state.actions.map(a => state.data['A-'+a] || 0),
        backgroundColor: 'rgba(74, 144, 226, 0.7)'
    }];

    if (state.mode === 'double') {
        datasets.push({
            label: state.config.stuB,
            data: state.actions.map(a => state.data['B-'+a] || 0),
            backgroundColor: 'rgba(231, 76, 60, 0.7)'
        });
    }

    myChart = new Chart(ctx, {
        type: 'bar',
        data: { 
            labels: state.actions, 
            datasets: datasets 
        },
        options: {
            responsive: true,
            scales: { y: { beginAtZero: true } }
        }
    });
}

function renderTimeline() {
    let html = `<h3>【事件行為時間軸紀錄】</h3><table class="timeline-table"><tr><th>時間</th><th>對象</th><th>行為內容</th></tr>`;
    state.logs.forEach(l => {
        html += `<tr><td>${l.time}</td><td>${l.stu}</td><td>${l.act}</td></tr>`;
    });
    document.getElementById('timelineContainer').innerHTML = html + `</table>`;
}

// 匯出完整全網頁資料
window.exportExcel = function() {
    let csv = "\uFEFF注意力觀察完整報告\n";
    csv += `觀察者,${state.config.obsName},活動,${state.config.actName},日期,${state.config.date}\n\n`;
    
    const storedInterval = localStorage.getItem('report_interval');
    const intervalVal = storedInterval ? parseFloat(storedInterval) : 0.5;
    const intervalSec = intervalVal * 60;
    const totalSec = state.config.duration * 60;

    // --- 1. 定義：產生單一學生「時段統計表」的函式 ---
    const generateStatTable = (sName) => {
        let tableStr = `【學生：${sName} 時段統計表】\n`;
        tableStr += "時間區段," + state.actions.join(",") + "\n";

        for (let i = 0; i < totalSec; i += intervalSec) {
            let segStart = `${Math.floor(i/60)}:${((i%60).toString().padStart(2, '0'))}`;
            let nextI = i + intervalSec;
            let segEnd = `${Math.floor(nextI/60)}:${((nextI%60).toString().padStart(2, '0'))}`;
            let row = [`${segStart}–${segEnd}`];

            state.actions.forEach(act => {
                let count = state.logs.filter(l => l.stu === sName && l.act === act && l.seconds >= i && l.seconds < nextI).length;
                row.push(count);
            });
            tableStr += row.join(",") + "\n";
        }
        return tableStr + "\n";
    };

    // --- 2. 定義：產生單一學生「行為時間軸紀錄」的函式 ---
    const generateTimelineTable = (sName) => {
        let timelineStr = `【學生：${sName} 行為時間軸紀錄】\n`;
        timelineStr += "時間,行為描述\n";
        
        const studentLogs = state.logs.filter(l => l.stu === sName);
        if (studentLogs.length === 0) {
            timelineStr += "(無紀錄)\n";
        } else {
            studentLogs.forEach(l => {
                timelineStr += `${l.time},${l.act}\n`;
            });
        }
        return timelineStr + "\n";
    };

    // --- 3. 開始組合 CSV 內容 ---
    
    // 輸出學生 A
    csv += generateStatTable(state.config.stuA);
    csv += generateTimelineTable(state.config.stuA);

    // 如果是雙人模式，輸出學生 B
    if (state.mode === 'double') {
        csv += "--------------------------------------------------\n\n"; // 分隔線
        csv += generateStatTable(state.config.stuB);
        csv += generateTimelineTable(state.config.stuB);
    }

    // 執行下載
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `觀察報告_${state.config.stuA}_${state.config.date}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

// 基礎功能：上傳、下載、匯入、匯出
function fileExport() {
    const data = JSON.stringify({ state, local: localStorage.getItem('custom_dimensions') });
    const blob = new Blob([data], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `backup_${new Date().getTime()}.json`;
    a.click();
}

function fileImport() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = e => {
        const reader = new FileReader();
        reader.onload = event => {
            const imported = JSON.parse(event.target.result);
            if(imported.local) localStorage.setItem('custom_dimensions', imported.local);
            alert("匯入成功，即將刷新");
            location.reload();
        };
        reader.readAsText(e.target.files[0]);
    };
    input.click();
}


// --- 雲端安全上傳 ---
window.cloudUpload = async function() {
    const cloud = JSON.parse(localStorage.getItem('cloud_config') || '{}');
    const isUpstash = cloud.binId.includes('upstash.io');

    let url = cloud.binId;
    let options = {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${cloud.apiKey}` }
    };

    if (isUpstash) {
        // Upstash Redis REST 格式：/set/key/value
        // 注意：這裡假設你把資料存在一個固定的 key 叫 "speteacher_data"
        url = `${cloud.binId}/set/speteacher_data`; 
        options.body = JSON.stringify(state);
    } else {
        // JSONBin v3 格式：確保 URL 是正確的 API 路徑
        // 確保你的 cloud.binId 包含了 https://api.jsonbin.io/v3/b/ 
        options.method = 'PUT';
        options.headers = { 'Content-Type': 'application/json', 'X-Access-Key': cloud.apiKey };
        options.body = JSON.stringify(state);
    }

    try {
        const res = await fetch(url, options);
        if (!res.ok) throw new Error(await res.text());
        alert("上傳成功");
    } catch(e) { alert("上傳失敗: " + e.message); }
};

// --- 雲端安全下載 ---
window.cloudDownload = async function() {
    const cloud = JSON.parse(localStorage.getItem('cloud_config') || '{}');
    
    // 1. 檢查設定
    if (!cloud.binId || !cloud.apiKey) {
        return alert("請先至「設定」頁面填寫 URL 與 Token/Key！");
    }

    if (!confirm("警告：下載將會覆蓋您目前的本地資料，確定繼續嗎？")) return;

    const isUpstash = cloud.binId.includes('upstash.io');
    let url = cloud.binId;
    let options = { method: 'GET' };

    // 2. 根據不同服務設定 Header 與 URL
    if (isUpstash) {
        // Upstash 的 GET 請求：通常是 /get/key_name
        url = `${cloud.binId}/get/speteacher_data`;
        options.headers = { 'Authorization': `Bearer ${cloud.apiKey}` };
    } else {
        // JSONBin 的 GET 請求：v3 API
        // 確保你的 URL 是指向 /v3/b/{binId}
        options.headers = { 'X-Access-Key': cloud.apiKey };
    }

    try {
        const res = await fetch(url, options);
        if (!res.ok) throw new Error("下載失敗，請檢查設定或連結");
        
        const result = await res.json();
        
        // 3. 解析資料 (JSONBin 的資料在 record 欄位中)
        const remoteData = isUpstash ? result.result : result.record;
        
        if (remoteData) {
            // 合併資料到 state
            Object.assign(state, remoteData);
            
            // 強制重新渲染 UI 與儲存到 LocalStorage
            localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
            alert("資料下載成功，頁面將自動重新整理。");
            location.reload();
        } else {
            alert("無法解析雲端資料格式");
        }
    } catch(e) { 
        alert("下載錯誤: " + e.message); 
        console.error(e);
    }
};




function saveGlobalSettings() {
    // 1. 儲存自訂項目
    const text = document.getElementById('customActions').value;
    state.actions = text.split('\n').filter(l => l.trim());
    localStorage.setItem('custom_dimensions', JSON.stringify(state.actions));
    
    // 2. 儲存雲端設定
    const cloud = { 
        binId: document.getElementById('cloudURL').value, 
        apiKey: document.getElementById('cloudToken').value 
    };
    localStorage.setItem('cloud_config', JSON.stringify(cloud));
    
    // 3. 儲存報表間隔
    localStorage.setItem('report_interval', document.getElementById('reportInterval').value);
    
    // --- 【關鍵修正】儲存時間模式 ---
    const timeModeSelect = document.getElementById('timeMode');
    if (timeModeSelect) {
        state.config.timeMode = timeModeSelect.value;
    }
    
    // 儲存最新的 state 到 localStorage
    saveStateToLocal();
    
    // 4. 關閉設定視窗
    closeSettings(); 
    
    // 5. 如果目前正處於觀察頁面，觸發重新渲染以反映新的設定與行為項目
    if (!document.getElementById('view-observe').classList.contains('hidden')) {
        renderObservationUI();
    }
}

function addDynamicItem() { 
    const n = prompt("新項目:"); 
    if (n && n.trim() !== "") { // 增加判斷：確保不是空字串或空白
        state.actions.push(n.trim()); 
        
        // 1. 同步到 localStorage 的自訂項目清單
        localStorage.setItem('custom_dimensions', JSON.stringify(state.actions));
        
        // 2. 同步到總狀態並保存
        saveStateToLocal(); 
        
        // 3. 重新渲染畫面
        renderObservationUI();
    } 
}


function addCustomEvent(sKey) {
    const stuName = sKey === 'A' ? state.config.stuA : state.config.stuB;
    const a = prompt(`請輸入 ${stuName} 的自訂備註:`);
    if (a) {
        state.logs.push({
            time: document.getElementById('timerDisplay').innerText.replace('總時間: ', ''),
            seconds: state.time,
            stu: stuName,
            act: a
        });
        saveStateToLocal();
        updateLiveLogs();
    }
}


function updateTimerDisplay() {
    const displayEl = document.getElementById('timerDisplay');
    if (!displayEl) return;

    // 1. 如果是「真實時間」模式且還沒開始，顯示提示
    if (state.config.timeMode === 'realtime' && !state.startTime) {
        displayEl.innerText = "總時間: 等待開始...";
        return;
    }

    // 2. 計算流逝時間：
    // 若有 startTime，則永遠計算當下與開始時間的差值
    // 若沒有 startTime (如還沒開始)，則顯示 0
    let elapsedSeconds = 0;
    if (state.startTime) {
        elapsedSeconds = Math.floor((Date.now() - state.startTime) / 1000);
        // 同步更新到 state.time 以供其他邏輯使用
        state.time = elapsedSeconds;
    }

    // 3. 格式化顯示時間
    let m = Math.floor(elapsedSeconds / 60).toString().padStart(2, '0');
    let s = (elapsedSeconds % 60).toString().padStart(2, '0');

    // 4. 處理顯示邏輯
    let displayStr = `總時間: ${m}:${s}`;

    if (state.config.timeMode === 'realtime') {
        // 真實時間模式，不顯示目標時長，直接顯示當下真實時鐘
        const now = new Date().toLocaleTimeString('zh-TW', { hour12: false });
        displayEl.innerText = `${displayStr} (真實時間: ${now})`;
    } else {
        // 計時模式，顯示目標總長
        const total = state.config.duration === 999 ? '無限' : (state.config.duration ? `${state.config.duration}:00` : '--:--');
        displayEl.innerText = `${displayStr} / ${total}`;
    }
}


function applyFontSize() {
    const size = document.getElementById('fontSize').value;
    // 直接修改 CSS 變數，整個網站的字體會連動
    document.documentElement.style.setProperty('--main-font-size', size + 'px');
    localStorage.setItem('user_font_size', size);
}

// 初始化時讀取字體設定
// 修改這一段
window.addEventListener('DOMContentLoaded', () => {
    const savedSize = localStorage.getItem('user_font_size') || '16';
    
    // 增加一個判斷，避免元素不存在時報錯
    const fontSizeInput = document.getElementById('fontSize');
    if (fontSizeInput) {
        fontSizeInput.value = savedSize;
    }
    
    // 設定字體大小
    document.documentElement.style.setProperty('--main-font-size', savedSize + 'px');
});


window.loadLastSession = function() {
    if(state.logs.length === 0) return alert("沒有歷史紀錄");
    hideAllViews();
    document.getElementById('view-report').classList.remove('hidden');
    renderFinalReport();
};


// 修改這裡：監聽 main-content 的捲動，而不是 window
document.getElementById('main-content-scroll').addEventListener('scroll', function() {
    const btn = document.getElementById('topBtn');
    // 這裡直接判斷該區塊的 scrollTop
    if (this.scrollTop > 200) {
        btn.style.display = "block";
    } else {
        btn.style.display = "none";
    }
});


function resumeObservation() {
    // 1. 重新計算 startTime 以確保時間是「連續」的
    // 假設之前已經過了 100 秒，要繼續計時，要把開始時間往回推 100 秒
    const elapsed = state.time; 
    state.startTime = Date.now() - (elapsed * 1000);
    
    // 2. 恢復狀態
    state.isFinished = false;
    
    // 3. 切換畫面並重啟計時器
    hideAllViews();
    document.getElementById('view-observe').classList.remove('hidden');
    state.timer = setInterval(updateTimerDisplay, 1000);
}
