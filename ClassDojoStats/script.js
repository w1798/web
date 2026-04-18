/**
 * Charles Nextime Web Tools Portal - Core Logic
 * Copyright (c) 2026 Charles Nextime
 * Licensed under the GNU General Public License v3.0
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation.
 */
 
 

// 負責載入多個外部套件的函式
function initLibraries() {
    const libUrls = [
        'https://cdnjs.cloudflare.com/ajax/libs/PapaParse/5.3.2/papaparse.min.js'
    ];

    libUrls.forEach(url => {
        const script = document.createElement('script');
        script.src = url;
        script.async = false;

        // 從 URL 提取完整檔名 (例如: exceljs.min.js)
        const fileName = new URL(url).pathname.split('/').pop();

        // 情況 A：外部載入成功
        script.onload = function() {
            console.log(`%c[成功] 外部庫已載入: ${fileName}`, 'color: #4CAF50; font-weight: bold;');
        };

        // 情況 B：外部載入失敗，啟動備援
        script.onerror = function() {
            const fallbackPath = `libs/${fileName}`;
            console.warn(`[失敗] 外部庫載入失敗，嘗試本地載入: ${fallbackPath}`);
            
            const fallbackScript = document.createElement('script');
            fallbackScript.src = fallbackPath;
            
            // 本地載入的成功/失敗監聽（選配）
            fallbackScript.onload = () => console.log(`%c[備援成功] 已從本地載入: ${fileName}`, 'color: #FF9800; font-weight: bold;');
            fallbackScript.onerror = () => console.error(`[重大錯誤] 本地備援檔案不存在: ${fallbackPath}`);

            document.head.appendChild(fallbackScript);
        };

        document.head.appendChild(script);
    });
}

// 執行載入
initLibraries();


const DEFAULT_DATA = {
    fontSize: 20,
    showSurname: false,
    cloudConfig: { binId: '', apiKey: '' },
    settings: { includeKeywords: '_', excludeKeywords: 'A0', minusKeywords: '-' },
    students: []
};

// --- Gzip 壓縮/解壓工具 ---
const compressJSON = async (obj) => {
    const str = JSON.stringify(obj);
    const stream = new Blob([str]).stream().pipeThrough(new CompressionStream('gzip'));
    const buf = await new Response(stream).arrayBuffer();
    return btoa(String.fromCharCode(...new Uint8Array(buf)));
};

const decompressJSON = async (base64) => {
    const bin = atob(base64);
    const buf = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
    const stream = new Blob([buf]).stream().pipeThrough(new DecompressionStream('gzip'));
    return await new Response(stream).json();
};

let appData = JSON.parse(JSON.stringify(DEFAULT_DATA));


// 頁面載入初始化
document.addEventListener('DOMContentLoaded', () => {
    const saved = localStorage.getItem('classDojoAppData');
    if (saved) {
        const parsedData = JSON.parse(saved);
        
        // 【核心修正】使用展開運算子 (...) 將預設值與舊資料合併
        // 這樣如果 parsedData 缺少 showSurname，就會自動採用 DEFAULT_DATA 的值
        appData = {
            ...DEFAULT_DATA,
            ...parsedData,
            // 針對嵌套層級較深的物件也要確保合併（例如雲端設定與計算規則）
            cloudConfig: { ...DEFAULT_DATA.cloudConfig, ...parsedData.cloudConfig },
            settings: { ...DEFAULT_DATA.settings, ...parsedData.settings }
        };

        if (appData.students && appData.students.length > 0) renderTable();
    }
    applyStyles();
});

// 全域字體大小連動
function applyStyles() {
    document.documentElement.style.setProperty('--user-font-size', appData.fontSize + 'px');
}

// 執行計算並預設排序 (小排到大)
function processData() {
    const file = document.getElementById('csvFile').files[0];
    if (!file) return;
    
    const s = appData.settings;
    const incs = s.includeKeywords.split(/\s+/).filter(x=>x);
    const excs = s.excludeKeywords.split(/\s+/).filter(x=>x);
    const mins = s.minusKeywords.split(/\s+/).filter(x=>x);

    Papa.parse(file, {
        complete: (res) => {
            const headers = res.data[0];
            appData.students = res.data.slice(1).map(row => {
                if(!row[0]) return null;
                let sum = 0, details = [];
                for(let i=1; i<row.length; i++){
                    let h = headers[i]||"";
                    if(incs.some(k=>h.includes(k)) && !excs.some(k=>h.includes(k))) {
                        let v = parseFloat(row[i])||0;
                        let isMin = mins.some(k=>h.includes(k));
                        let finalV = isMin ? -v : v;
                        sum += finalV;
                        if(v !== 0) details.push({ label: h, val: finalV });
                    }
                }
                return { name: row[0], sum, numId: parseInt(row[0].match(/\d+/))||999, details };
            }).filter(x=>x);
            
            // 強制預設按號碼排序
            appData.students.sort((a,b) => a.numId - b.numId);
            renderTable();
            localStorage.setItem('classDojoAppData', JSON.stringify(appData));
        }
    });
}

function formatStudentName(fullName) {
    const hasChinese = /[\u4E00-\u9FFF]/.test(fullName);
    const parts = fullName.trim().split(/\s+/);

    if (appData.showSurname) {
        // 顯示姓氏：是
        if (hasChinese) {
            return fullName.replace(/\s+/g, ''); // 中文去掉空白，如「王小明」
        }
        return fullName; // 非中文按原值輸出，如「Wang Xiao Ming」
    } else {
        // 顯示姓氏：否
        if (parts.length > 1) {
            parts.shift(); // 移除第一個值 (姓氏)
            const nameOnly = parts.join(' ');
            return hasChinese ? nameOnly.replace(/\s+/g, '') : nameOnly; // 中文變「小明」，英文變「Xiao Ming」
        }
        return fullName; // 若只有一個詞則原樣輸出
    }
}

function renderTable() {
    document.getElementById('resultTable').style.display = 'table';
    document.getElementById('tableBody').innerHTML = appData.students.map((s, idx) => `
        <tr onclick="showIndividualDetail(${idx})">
            <td>${formatStudentName(s.name)}</td> 
            <td><strong>${s.sum}</strong></td>
        </tr>
    `).join('');
}

// 姓名/點數排序功能
window.sortToggle = true;
function sortTable(colIdx) {
    window.sortToggle = !window.sortToggle;
    const dir = window.sortToggle ? 1 : -1;
    appData.students.sort((a, b) => colIdx === 0 ? (a.numId - b.numId)*dir : (a.sum - b.sum)*dir);
    renderTable();
}

function showIndividualDetail(idx) {
    const s = appData.students[idx];
    document.getElementById('detailTitle').innerText = `${formatStudentName(s.name)} - 詳細得點 (總計: ${s.sum})`;
    
    document.getElementById('detailContent').innerHTML = s.details.map(d => `
        <div class="detail-card">
            <small style="color: #666; font-size: 0.8em;">${d.label}</small>
            <b style="color:${d.val >= 0 ? '#27ae60' : '#e74c3c'}; font-size: 1.1em;">
                ${d.val > 0 ? '+' : ''}${d.val}
            </b>
        </div>
    `).join('') || "<p>無紀錄</p>";
    
    toggleModal('detailModal', true);
}

// 顯示全班總覽 (修改後：支援點擊查看詳情)
function showSummary() {
    if (!appData.students.length) return alert("尚無資料");
    
    document.getElementById('summaryContent').innerHTML = appData.students.map((s, i) => `
        <div class="summary-box" onclick="showIndividualDetail(${i})" style="cursor: pointer;">
            <span style="color: #FFB5B5; font-size: 0.8em;">${i+1}.</span>
            <span style="color: #0000C6; font-weight:bold; font-size: calc(var(--user-font-size) * 1.6);"> ${formatStudentName(s.name)}</span>
            <span style="color:var(--primary); font-size: 1em;">${s.sum}</span>
        </div>
    `).join('');
    
    toggleModal('summaryModal', true);
}

// 設定視窗管理
function toggleModal(id, show) {
    document.getElementById(id).style.display = show ? 'flex' : 'none';
    if(show && id === 'settingsModal') {
        document.getElementById('setFontSize').value = appData.fontSize;
        document.getElementById('setShowSurname').value = appData.showSurname.toString();
        document.getElementById('setInc').value = appData.settings.includeKeywords;
        document.getElementById('setExc').value = appData.settings.excludeKeywords;
        document.getElementById('setMin').value = appData.settings.minusKeywords;
        document.getElementById('setBinId').value = appData.cloudConfig.binId;
        document.getElementById('setApiKey').value = appData.cloudConfig.apiKey;
    }
}

function saveSettings() {
    appData.fontSize = parseInt(document.getElementById('setFontSize').value) || 16;
    appData.showSurname = document.getElementById('setShowSurname').value === 'true';
    appData.settings = {
        includeKeywords: document.getElementById('setInc').value,
        excludeKeywords: document.getElementById('setExc').value,
        minusKeywords: document.getElementById('setMin').value
    };
    appData.cloudConfig = {
        binId: document.getElementById('setBinId').value,
        apiKey: document.getElementById('setApiKey').value
    };
    localStorage.setItem('classDojoAppData', JSON.stringify(appData));
    applyStyles();
    toggleModal('settingsModal', false);
}

async function cloudAction(action) {
    const { binId, apiKey } = appData.cloudConfig;
    if (!binId || !apiKey) return alert("⚠️ 請先在『設定』填寫雲端資訊！");
    
    if (action === 'upload') {
        if (!confirm("⚠️ 確定要將【本地資料】上傳至雲端嗎？\n注意：這會覆蓋雲端上的舊資料。")) return;
    } else if (action === 'download') {
        if (!confirm("⚠️ 確定要從雲端下載資料嗎？\n注意：這會覆蓋本地的所有學生與設定資料。")) return;
    }
    
    const isUpstash = binId.includes('upstash.io');
    
    try {
        if (action === 'upload') {
            const payload = { ...appData }; delete payload.cloudConfig;
            const compressed = await compressJSON(payload);
            
            if (isUpstash) {
                await fetch(binId, { method: 'POST', headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' }, body: JSON.stringify(["SET", "classdojo_backup", JSON.stringify(compressed)]) });
            } else {
                await fetch(`https://api.jsonbin.io/v3/b/${binId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json', 'X-Access-Key': apiKey }, body: JSON.stringify({ d: compressed }) });
            }
            alert("✅ 上傳成功");
        } else {
            let data;
            if (isUpstash) {
                const res = await fetch(`${binId}/get/classdojo_backup`, { headers: { 'Authorization': `Bearer ${apiKey}` } });
                const json = await res.json();
                if (json && json.result) {
                    try {
                        const raw = json.result;
                        if (typeof raw === 'string' && raw.includes('{') === false && raw.includes('[') === false) {
                            data = await decompressJSON(raw);
                        } else {
                            data = JSON.parse(raw);
                        }
                    } catch(e) {
                         data = JSON.parse(json.result);
                    }
                }
            } else {
                const res = await fetch(`https://api.jsonbin.io/v3/b/${binId}/latest`, { headers: { 'X-Access-Key': apiKey } });
                const json = await res.json(); 
                const raw = json.record;
                if (raw && typeof raw.d === 'string') {
                    try { data = await decompressJSON(raw.d); } catch(e) { data = raw; }
                } else { data = raw; }
            }


            // 在 cloudAction 的下載成功處修改：
            const currentConfig = appData.cloudConfig;
            // 同樣進行資料補齊，避免從雲端下載到舊格式的備份檔
            appData = {
                ...DEFAULT_DATA,
                ...data,
                settings: { ...DEFAULT_DATA.settings, ...data.settings }
            }; 
            appData.cloudConfig = currentConfig;

            localStorage.setItem('classDojoAppData', JSON.stringify(appData));
            location.reload();
        }
    } catch (e) { alert("❌ 雲端同步失敗，請檢查網路或金鑰"); }
}

function clearResults() {
    if(confirm("確定要清除目前的計算結果嗎？(設定將會保留)")) {
        appData.students = [];
        document.getElementById('resultTable').style.display = 'none';
        document.getElementById('tableBody').innerHTML = '';
        document.getElementById('csvFile').value = ''; // 清空檔案選取器
        localStorage.setItem('classDojoAppData', JSON.stringify(appData));
    }
}

function resetSettings() {
    if(confirm("確定要將所有設定恢復預設值嗎？")) {
        // 1. 將設定值恢復為 DEFAULT_DATA 的內容
        appData.fontSize = DEFAULT_DATA.fontSize;
        appData.settings = { ...DEFAULT_DATA.settings };
        appData.cloudConfig = { ...DEFAULT_DATA.cloudConfig };
        
        // 2. 同步到 LocalStorage
        localStorage.setItem('classDojoAppData', JSON.stringify(appData));
        
        // 3. 立即更新畫面 UI
        applyStyles();
        toggleModal('settingsModal', false);
    }
}


function clearField(id) { document.getElementById(id).value = ''; }
function scrollToTop() { document.querySelector('.app-main').scrollTo({ top: 0, behavior: 'smooth' }); }
function copyScoresOnly() {
    if (!appData.students.length) return alert("無資料可複製");
    const text = appData.students.map(s => s.sum).join('\n');
    navigator.clipboard.writeText(text).then(() => alert("已複製點數列表"));
}

function copyStudentNames() {
    if (!appData.students.length) return alert("無資料可複製");
    const text = appData.students.map(s => formatStudentName(s.name)).join('\n');
    navigator.clipboard.writeText(text).then(() => alert("已複製學生姓名列表"));
}

// 在 script.js 最下方加入此監聽器
const mainArea = document.querySelector('.app-main');
const backToTopBtn = document.getElementById('backToTop');

mainArea.addEventListener('scroll', () => {
    // 當向下捲動超過 300px 時顯示按鈕
    if (mainArea.scrollTop > 300) {
        backToTopBtn.classList.add('show');
    } else {
        backToTopBtn.classList.remove('show');
    }
});
