/**
 * Charles Nextime Web Tools Portal - Core Logic
 * Copyright (c) 2026 Charles Nextime
 * Licensed under the GNU General Public License v3.0
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation.
 */

let appData = {
    fontSize: 16,
    cloudConfig: { binId: '', apiKey: '' },
    settings: { includeKeywords: '_', excludeKeywords: 'A0', minusKeywords: '-' },
    students: []
};

// 頁面載入初始化
document.addEventListener('DOMContentLoaded', () => {
    const saved = localStorage.getItem('classDojoAppData');
    if (saved) {
        appData = JSON.parse(saved);
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
    if (!file) return alert("請選取 CSV 檔案");
    
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

function renderTable() {
    document.getElementById('resultTable').style.display = 'table';
    document.getElementById('tableBody').innerHTML = appData.students.map((s, idx) => `
        <tr onclick="showIndividualDetail(${idx})">
            <td>${s.name}</td>
            <td><strong>${s.sum}</strong></td>
        </tr>
    `).join('');
}

// 姓名/分數排序功能
window.sortToggle = true;
function sortTable(colIdx) {
    window.sortToggle = !window.sortToggle;
    const dir = window.sortToggle ? 1 : -1;
    appData.students.sort((a, b) => colIdx === 0 ? (a.numId - b.numId)*dir : (a.sum - b.sum)*dir);
    renderTable();
}

// 顯示個人詳情 (改為 5 欄格狀)
function showIndividualDetail(idx) {
    const s = appData.students[idx];
    document.getElementById('detailTitle').innerText = `${s.name} - 詳細得分 (總計: ${s.sum})`;
    
    // 使用 detail-grid 容器與 detail-card 格子
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

// 顯示全班總覽
function showSummary() {
    if (!appData.students.length) return alert("尚無資料");
    document.getElementById('summaryContent').innerHTML = appData.students.map((s, i) => `
        <div class="summary-box">
            <span>#${i+1} ${s.name}</span>
            <span style="color:var(--primary); font-weight:bold">${s.sum}</span>
        </div>
    `).join('');
    toggleModal('summaryModal', true);
}

// 設定視窗管理
function toggleModal(id, show) {
    document.getElementById(id).style.display = show ? 'flex' : 'none';
    if(show && id === 'settingsModal') {
        document.getElementById('setFontSize').value = appData.fontSize;
        document.getElementById('setInc').value = appData.settings.includeKeywords;
        document.getElementById('setExc').value = appData.settings.excludeKeywords;
        document.getElementById('setMin').value = appData.settings.minusKeywords;
        document.getElementById('setBinId').value = appData.cloudConfig.binId;
        document.getElementById('setApiKey').value = appData.cloudConfig.apiKey;
    }
}

function saveSettings() {
    appData.fontSize = parseInt(document.getElementById('setFontSize').value) || 16;
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

// 雲端同步邏輯 (自動判斷 Upstash 或 JSONBin)
async function cloudAction(action) {
    const { binId, apiKey } = appData.cloudConfig;
    if (!binId || !apiKey) return alert("⚠️ 請先在『設定』填寫雲端資訊！");
    const isUpstash = binId.includes('upstash.io');
    
    try {
        if (action === 'upload') {
            const payload = { ...appData }; delete payload.cloudConfig;
            if (isUpstash) {
                await fetch(binId, { method: 'POST', headers: { 'Authorization': `Bearer ${apiKey}` }, body: JSON.stringify(["SET", "classdojo_backup", JSON.stringify(payload)]) });
            } else {
                await fetch(`https://api.jsonbin.io/v3/b/${binId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json', 'X-Access-Key': apiKey }, body: JSON.stringify(payload) });
            }
            alert("✅ 上傳成功");
        } else {
            let data;
            if (isUpstash) {
                const res = await fetch(`${binId}/get/classdojo_backup`, { headers: { 'Authorization': `Bearer ${apiKey}` } });
                const json = await res.json(); data = JSON.parse(json.result);
            } else {
                const res = await fetch(`https://api.jsonbin.io/v3/b/${binId}/latest`, { headers: { 'X-Access-Key': apiKey } });
                const json = await res.json(); data = json.record;
            }
            const currentConfig = appData.cloudConfig;
            appData = data; appData.cloudConfig = currentConfig;
            localStorage.setItem('classDojoAppData', JSON.stringify(appData));
            location.reload();
        }
    } catch (e) { alert("❌ 雲端同步失敗，請檢查網路或金鑰"); }
}

// 重置與工具
function resetAppData() {
    if(confirm("確定要重置所有資料並歸零系統嗎？")) {
        localStorage.removeItem('classDojoAppData');
        location.reload();
    }
}

function clearField(id) { document.getElementById(id).value = ''; }
function scrollToTop() { document.querySelector('.app-main').scrollTo({ top: 0, behavior: 'smooth' }); }
function copyScoresOnly() {
    if (!appData.students.length) return alert("無資料可複製");
    const text = appData.students.map(s => s.sum).join('\n');
    navigator.clipboard.writeText(text).then(() => alert("已複製分數列表"));
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