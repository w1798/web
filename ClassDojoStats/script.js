/**
 * Charles Nextime Web Tools Portal - Core Logic
 * Copyright (c) 2026 Charles Nextime
 * Licensed under the GNU General Public License v3.0
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation.
 */
 

const DEFAULT_DATA = {
    fontSize: 20,
    showSurname: false,
    cloudConfig: { binId: '', apiKey: '' },
    settings: { includeKeywords: '_', excludeKeywords: 'A0', minusKeywords: '-' },
    students: []
};

// --- Gzip 壓縮/解壓工具 ---
const compressJSON = async (obj, indent = 0) => {
    const str = indent ? JSON.stringify(obj, null, indent) : JSON.stringify(obj);
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

const STORAGE_KEY = 'classDojoAppData';
let appData = JSON.parse(JSON.stringify(DEFAULT_DATA));

// 立即執行載入，確保全局狀態就緒
const saved = localStorage.getItem(STORAGE_KEY);
if (saved) {
    try {
        const parsed = JSON.parse(saved);
        // 先用預設值打底，再用存檔覆蓋，最後確保嵌套物件不遺失
        appData = { ...DEFAULT_DATA, ...parsed };
        appData.cloudConfig = { ...DEFAULT_DATA.cloudConfig, ...(parsed.cloudConfig || {}) };
        appData.settings = { ...DEFAULT_DATA.settings, ...(parsed.settings || {}) };
        appData.students = parsed.students || [];
        console.log("[ClassDojo] 已載入存檔學生數:", appData.students.length);
    } catch(e) { console.error("Data load error", e); }
}

// 頁面載入後的 UI 初始化
document.addEventListener('DOMContentLoaded', () => {
    applyStyles();
    // 確保在 DOM 都準備好後再渲染
    setTimeout(() => {
        if (appData.students && appData.students.length > 0) {
            console.log("[ClassDojo] 啟動自動渲染...");
            renderTable();
        }
    }, 100);
});

function saveData() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(appData));
}

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
            saveData();
        }
    });
}

function formatStudentName(fullName) {
    if (!fullName) return "未命名";
    const hasChinese = /[\u4E00-\u9FFF]/.test(fullName);
    const parts = fullName.toString().trim().split(/\s+/);

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
    console.log("[ClassDojo] 開始渲染主表格, 學生數:", appData.students.length);
    const table = document.getElementById('resultTable');
    const body = document.getElementById('tableBody');
    const container = document.getElementById('tableContainer');
    
    if (!table || !body) {
        console.error("[ClassDojo] 找不到表格 DOM 元素！");
        return;
    }

    if (container) container.style.display = 'block';
    table.style.display = 'table';
    table.style.visibility = 'visible';
    table.style.opacity = '1';

    try {
        body.innerHTML = appData.students.map((s, idx) => {
            if (!s) return '';
            return `
                <tr onclick="showIndividualDetail(${idx})">
                    <td>${formatStudentName(s.name)}</td> 
                    <td><strong>${s.sum}</strong></td>
                </tr>
            `;
        }).join('');
        console.log("[ClassDojo] 渲染完成");
    } catch (e) {
        console.error("[ClassDojo] 渲染過程中出錯:", e);
    }
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
        binId: (document.getElementById('setBinId').value || "").trim(),
        apiKey: (document.getElementById('setApiKey').value || "").trim()
    };
    saveData();
    applyStyles();
    toggleModal('settingsModal', false);
}

async function cloudAction(action) {
    const { binId, apiKey } = appData.cloudConfig;
    if (!binId || !apiKey) return alert("⚠️ 請先在『設定』填寫雲端資訊！");
    
    const isFirebase = binId.includes('firebaseio.com');
    const isUpstash = binId.includes('upstash.io');
    if (!isFirebase && !isUpstash) return alert("⚠️ 目前僅支援 Firebase 或 Upstash！");

    if (action === 'upload') {
        if (!confirm("⚠️ 確定要將【本地資料】上傳至雲端嗎？\n注意：這會覆蓋雲端上的舊資料。")) return;
    } else if (action === 'download') {
        if (!confirm("⚠️ 確定要從雲端下載資料嗎？\n注意：這會覆蓋本地的所有學生與設定資料。")) return;
    }
    
    try {
        if (action === 'upload') {
            const payload = { ...appData }; delete payload.cloudConfig;
            const compressed = await compressJSON(payload);
            
            if (isFirebase) {
                const baseUrl = binId.replace(/\/$/, "");
                const url = `${baseUrl}/${apiKey}/classdojo_backup.json`;
                await fetch(url, { method: 'PUT', body: JSON.stringify({ d: compressed }) });
            } else if (isUpstash) {
                const baseUrl = binId.replace(/\/$/, '').replace(/\/set\/.*$/, '').replace(/\/get\/.*$/, '');
                await fetch(`${baseUrl}/set/classdojo_backup`, { method: 'POST', headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' }, body: JSON.stringify(compressed) });
            }
            alert("✅ 上傳成功");
        } else {
            let data;
            if (isFirebase) {
                const baseUrl = binId.replace(/\/$/, "");
                const url = `${baseUrl}/${apiKey}/classdojo_backup.json`;
                const res = await fetch(url);
                const json = await res.json();
                if (json && json.d) data = await decompressJSON(json.d);
            } else if (isUpstash) {
                const baseUrl = binId.replace(/\/$/, '').replace(/\/set\/.*$/, '').replace(/\/get\/.*$/, '');
                const res = await fetch(`${baseUrl}/get/classdojo_backup`, { headers: { 'Authorization': `Bearer ${apiKey}` } });
                const json = await res.json();
                if (json && json.result) {
                    const raw = json.result;
                    try {
                        data = (typeof raw === 'string' && !raw.includes('{')) ? await decompressJSON(raw) : JSON.parse(raw);
                    } catch(e) { data = JSON.parse(raw); }
                }
            }

            if (data) {
                // 下載成功：保留目前的雲端設定，其餘由雲端蓋掉
                const currentConfig = { ...appData.cloudConfig };
                appData = { 
                    ...DEFAULT_DATA, 
                    ...data, 
                    settings: { ...DEFAULT_DATA.settings, ...(data.settings || {}) },
                    cloudConfig: currentConfig
                };
                // 確保學生資料正確繼承
                if (!appData.students && data.students) appData.students = data.students;

                saveData();
                alert("✅ 下載成功，頁面將自動刷新以顯示資料");
                location.reload();
            } else {
                alert("⚠️ 雲端尚無資料");
            }
        }
    } catch (e) { alert("❌ 雲端同步失敗，請檢查網路或金鑰"); }
}

function clearResults() {
    if(confirm("確定要清除目前的計算結果嗎？(設定將會保留)")) {
        appData.students = [];
        document.getElementById('resultTable').style.display = 'none';
        document.getElementById('tableBody').innerHTML = '';
        document.getElementById('csvFile').value = ''; // 清空檔案選取器
        saveData();
    }
}

function resetSettings() {
    if(confirm("確定要將所有設定恢復預設值嗎？")) {
        // 1. 將設定值恢復為 DEFAULT_DATA 的內容
        appData.fontSize = DEFAULT_DATA.fontSize;
        appData.settings = { ...DEFAULT_DATA.settings };
        appData.cloudConfig = { ...DEFAULT_DATA.cloudConfig };
        
        // 2. 同步到 LocalStorage
        saveData();
        
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

async function exportData() {
    const payload = { ...appData }; delete payload.cloudConfig;
    const compressed = await compressJSON(payload, 2);
    const raw = atob(compressed);
    const bytes = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
    const blob = new Blob([bytes], { type: 'application/gzip' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `ClassDojo_${new Date().toISOString().slice(0,10)}.json.gz`;
    a.click();
}

function triggerImport() { document.getElementById('importFile').click(); }

async function handleImport(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (e) => {
        try {
            const stream = new Blob([e.target.result]).stream().pipeThrough(new DecompressionStream('gzip'));
            const data = await new Response(stream).json();
            if (confirm("⚠️ 確定要匯入備份嗎？這會覆蓋目前的資料。")) {
                const currentConfig = appData.cloudConfig;
                appData = { ...DEFAULT_DATA, ...data, settings: { ...DEFAULT_DATA.settings, ...data.settings } };
                appData.cloudConfig = currentConfig;
                saveData();
                location.reload();
            }
        } catch (err) { alert("❌ 匯入失敗，請確認檔案格式正確 (.json.gz)"); }
    };
    reader.readAsArrayBuffer(file);
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
