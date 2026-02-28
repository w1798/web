/**
 * Charles Nextime Web Tools Portal - Core Logic
 * * Copyright (c) 2026 Charles Nextime
 * Licensed under the GNU General Public License v3.0
 * * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation.
 */


// ==================== 資料結構 ====================
let stockData = {};  // { "0056": { purchases: [], dividends: [], alias: "" } }
let currentStock = '';
let isEditMode = false;

// 雲端設定 (不隨股票資料上傳)
let cloudSettings = {
    url: '',
    token: ''
};

// ==================== 初始化 / 本地儲存 ====================
function loadFromStorage() {
    const saved = localStorage.getItem('dividendManager');
    if (saved) {
        try {
            const parsed = JSON.parse(saved);
            // 分離股票資料與雲端設定
            if (parsed.stockData) {
                stockData = parsed.stockData;
                cloudSettings = parsed.cloudSettings || { url: '', token: '' };
            } else {
                // 舊版資料相容
                stockData = parsed;
                cloudSettings = { url: '', token: '' };
            }
        } catch (e) {
            stockData = {};
            cloudSettings = { url: '', token: '' };
        }
    } else {
        stockData = {};
        cloudSettings = { url: '', token: '' };
    }
    // 確保每個股票都有必要欄位
    Object.keys(stockData).forEach(code => {
        if (!stockData[code].purchases) stockData[code].purchases = [];
        if (!stockData[code].dividends) stockData[code].dividends = [];
        if (!stockData[code].alias) stockData[code].alias = '';
    });
    // 載入雲端設定到輸入框
    document.getElementById('cloudUrl').value = cloudSettings.url || '';
    document.getElementById('cloudToken').value = cloudSettings.token || '';
}

function saveToStorage() {
    // 將股票資料與雲端設定分開儲存
    const toSave = {
        stockData: stockData,
        cloudSettings: cloudSettings
    };
    localStorage.setItem('dividendManager', JSON.stringify(toSave));
}

// ==================== 解析股數 (k單位) ====================
function parseShares(input) {
    if (typeof input === 'number') return input;
    const str = String(input).trim().toLowerCase();
    if (str.includes('k')) {
        const num = parseFloat(str.replace('k', '')) || 0;
        return num * 1000;
    }
    return parseFloat(str) || 0;
}

// ==================== 解析日期 (接受多種格式) ====================
function parseDateInput(input) {
    input = input.trim();
    if (input.includes('/') || input.includes('-')) {
        let standardized = input.replace(/\//g, '-');
        const date = new Date(standardized);
        if (!isNaN(date.getTime())) {
            return date.toISOString().split('T')[0];
        }
    }
    if (input.match(/^\d{4}-\d{2}-\d{2}$/)) {
        const date = new Date(input);
        if (!isNaN(date.getTime())) return input;
    }
    return null;
}

// ==================== 計算總股數 ====================
function calculateTotalShares() {
    if (!currentStock || !stockData[currentStock]) return 0;
    let total = 0;
    stockData[currentStock].purchases.forEach(p => {
        total += parseShares(p.shares);
    });
    return total;
}

// ==================== 更新總股數顯示 ====================
function updateTotalSharesDisplay() {
    const total = calculateTotalShares();
    const displayTotal = total >= 1000 ? (total/1000).toFixed(1) + 'k' : total;
    document.getElementById('totalSharesBadge').innerText = `總股數: ${displayTotal}`;
}

// ==================== 格式化數字為千分位 ====================
function formatNumberWithCommas(x) {
    return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

// ==================== 渲染股票選單 (只顯示代號和別名) ====================
function renderStockSelect() {
    const select = document.getElementById('stockSelect');
    const currentValue = select.value;
    select.innerHTML = '<option value="">📌 選擇股票代號</option>';
    Object.keys(stockData).sort().forEach(code => {
        const option = document.createElement('option');
        option.value = code;
        const alias = stockData[code].alias ? ` (${stockData[code].alias})` : '';
        option.textContent = `${code}${alias}`;
        select.appendChild(option);
    });
    
    if (currentValue && stockData[currentValue]) {
        select.value = currentValue;
        currentStock = currentValue;
    } else {
        const firstKey = Object.keys(stockData)[0];
        if (firstKey) {
            select.value = firstKey;
            currentStock = firstKey;
        } else {
            currentStock = '';
        }
    }
    
    // 更新標題
    updateStockTitle();
    updateTotalSharesDisplay();
    renderPurchases();
    renderDividendTable();
}

// ==================== 更新股票標題 ====================
function updateStockTitle() {
    const titleSpan = document.getElementById('stockDividendTitle');
    if (!titleSpan) {
        console.warn('stockDividendTitle 元素不存在');
        return;
    }
    
    if (currentStock && stockData[currentStock]) {
        const alias = stockData[currentStock].alias ? ` (${stockData[currentStock].alias})` : '';
        titleSpan.innerText = `${currentStock}${alias} 📊 股息列表`;  // 第1點：改為「代號 股息總和」
    } else {
        titleSpan.innerText = '請「新增」股票代號';
    }
}

// ==================== 渲染購入列表 ====================
function renderPurchases() {
    const listDiv = document.getElementById('purchasesList');
    if (!currentStock || !stockData[currentStock] || stockData[currentStock].purchases.length === 0) {
        listDiv.innerHTML = '<div style="text-align:center; padding:30px; color:#888;">尚無購入紀錄</div>';
        return;
    }

    const purchases = [...stockData[currentStock].purchases].sort((a,b) => new Date(b.date) - new Date(a.date));
    let html = '';
    purchases.forEach((p, index) => {
        const shareNum = parseShares(p.shares);
        const displayShares = shareNum >= 1000 ? (shareNum/1000).toFixed(1) + 'k' : shareNum;
        html += `
            <div class="purchase-item" data-index="${index}">
                <div class="purchase-info">
                    <span class="purchase-date">${p.date}</span>
                    <span class="purchase-shares">${displayShares} 股</span>
                </div>
                <div class="purchase-actions">
                    <button class="edit-btn" onclick="editPurchase(${index})">✏️</button>
                    <button class="delete-btn" onclick="deletePurchase(${index})">🗑️</button>
                </div>
            </div>
        `;
    });
    listDiv.innerHTML = html;
    updateTotalSharesDisplay();
    renderDividendTable();
}

// ==================== 渲染股息表格 ====================
function renderDividendTable() {
    const tbody = document.getElementById('dividendTbody');
    const totalSpan = document.getElementById('totalDividend');
    const headerTotal = document.getElementById('headerTotal');
    const totalRecordsSpan = document.getElementById('totalRecords');

    if (!currentStock || !stockData[currentStock] || stockData[currentStock].dividends.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; color:#888;">尚未貼入股息資料</td></tr>';
        totalSpan.innerText = '0';
        if (headerTotal) headerTotal.innerText = '0';
        if (totalRecordsSpan) totalRecordsSpan.innerText = '0 筆配息';
        return;
    }

    const purchases = stockData[currentStock].purchases || [];
    const dividends = stockData[currentStock].dividends || [];
    const sortedDivs = [...dividends].sort((a,b) => new Date(b.payDate) - new Date(a.payDate));

    let total = 0;
    let rows = '';

    sortedDivs.forEach(div => {
        const payDate = new Date(div.payDate);
        let sharesBefore = 0;
        purchases.forEach(p => {
            if (new Date(p.date) < payDate) {
                sharesBefore += parseShares(p.shares);
            }
        });

        let dividendAmount;
        if (sharesBefore > 0) {
            dividendAmount = (sharesBefore * parseFloat(div.dividend)) - 10;
        } else {
            dividendAmount = 0;
        }
        
        total += dividendAmount;

        rows += `
            <tr>
                <td>${div.payDate}</td>
                <td>${parseFloat(div.dividend).toFixed(3)}</td>
                <td>${sharesBefore.toLocaleString()}</td>
                <td>${dividendAmount.toFixed(2)}</td>
            </tr>
        `;
    });

    tbody.innerHTML = rows;
    
    const totalRounded = Math.round(total);
    const formattedTotal = formatNumberWithCommas(totalRounded);
    totalSpan.innerText = formattedTotal;
    if (headerTotal) headerTotal.innerText = formattedTotal;
    if (totalRecordsSpan) totalRecordsSpan.innerText = `${sortedDivs.length} 筆配息`;
}

// ==================== 新增購入 ====================
document.getElementById('addPurchaseBtn').addEventListener('click', () => {
    if (!currentStock) {
        alert('請先選擇或新增股票代號');
        return;
    }
    
    const dateInput = document.getElementById('purchaseDate').value.trim();
    const sharesInput = document.getElementById('purchaseShares').value.trim();
    
    if (!dateInput || !sharesInput) {
        alert('請填寫日期和股數');
        return;
    }
    
    const formattedDate = parseDateInput(dateInput);
    if (!formattedDate) {
        alert('日期格式錯誤，請使用 YYYY/MM/DD 或 YYYY-MM-DD');
        return;
    }
    
    const sharesNum = parseShares(sharesInput);
    if (sharesNum <= 0) {
        alert('股數必須大於0');
        return;
    }

    stockData[currentStock].purchases.push({ date: formattedDate, shares: sharesNum });
    saveToStorage();
    renderPurchases();
    document.getElementById('purchaseShares').value = '';
});

// ==================== 刪除/編輯購入 ====================
window.deletePurchase = (index) => {
    if (!currentStock) return;
    if (!confirm('確定要刪除這筆購入記錄嗎？')) return;
    
    const purchases = stockData[currentStock].purchases;
    const sorted = [...purchases].sort((a,b) => new Date(b.date) - new Date(a.date));
    const itemToDelete = sorted[index];
    const originalIndex = purchases.findIndex(p => p.date === itemToDelete.date && p.shares === itemToDelete.shares);
    if (originalIndex !== -1) purchases.splice(originalIndex, 1);
    saveToStorage();
    renderPurchases();
};

window.editPurchase = (index) => {
    const purchases = stockData[currentStock].purchases;
    const sorted = [...purchases].sort((a,b) => new Date(b.date) - new Date(a.date));
    const item = sorted[index];
    const originalIndex = purchases.findIndex(p => p.date === item.date && p.shares === item.shares);
    
    document.getElementById('editIndex').value = originalIndex;
    document.getElementById('editDate').value = item.date;
    document.getElementById('editShares').value = item.shares;
    document.getElementById('editPurchaseModal').classList.add('active');
};

document.getElementById('saveEditBtn').addEventListener('click', () => {
    const idx = document.getElementById('editIndex').value;
    const newDateInput = document.getElementById('editDate').value;
    const newSharesInput = document.getElementById('editShares').value;
    
    if (!newDateInput || !newSharesInput) return;
    
    const formattedDate = parseDateInput(newDateInput);
    if (!formattedDate) {
        alert('日期格式錯誤');
        return;
    }
    
    const newShares = parseShares(newSharesInput);
    if (newShares <= 0) return;

    stockData[currentStock].purchases[idx] = { date: formattedDate, shares: newShares };
    saveToStorage();
    renderPurchases();
    document.getElementById('editPurchaseModal').classList.remove('active');
});

document.getElementById('closeEditModal').addEventListener('click', () => {
    document.getElementById('editPurchaseModal').classList.remove('active');
});

// ==================== 股票選單變更 ====================
document.getElementById('stockSelect').addEventListener('change', (e) => {
    currentStock = e.target.value;
    updateStockTitle();
    updateTotalSharesDisplay();
    renderPurchases();
    renderDividendTable();
});

// ==================== 刪除股票 ====================
document.getElementById('deleteStockBtn').addEventListener('click', () => {
    if (!currentStock) {
        alert('沒有選中的股票');
        return;
    }
    if (confirm(`確定要刪除股票 ${currentStock} 的所有資料嗎？`)) {
        delete stockData[currentStock];
        saveToStorage();
        renderStockSelect();
    }
});

// ==================== 編輯股票 (重貼配息) ====================
document.getElementById('editStockBtn').addEventListener('click', () => {
    if (!currentStock) {
        alert('沒有選中的股票');
        return;
    }
    isEditMode = true;
    document.getElementById('modalTitle').innerText = `✏️ 編輯股票 ${currentStock} - 重新貼入配息`;
    document.getElementById('newStockCode').value = currentStock;
    document.getElementById('newStockCode').disabled = true;
    document.getElementById('stockAlias').value = stockData[currentStock].alias || '';
    document.getElementById('dividendPasteArea').value = '';
    updateStockLink();
    document.getElementById('stockModal').classList.add('active');
});

// ==================== 新增股票 ====================
document.getElementById('addStockBtn').addEventListener('click', () => {
    isEditMode = false;
    document.getElementById('modalTitle').innerText = '📌 新增股票並貼入配息';
    document.getElementById('newStockCode').value = '';
    document.getElementById('newStockCode').disabled = false;
    document.getElementById('stockAlias').value = '';
    document.getElementById('dividendPasteArea').value = '';
    updateStockLink();
    document.getElementById('stockModal').classList.add('active');
});

// ==================== 股票代號輸入即時更新連結 ====================
document.getElementById('newStockCode').addEventListener('input', updateStockLink);

function updateStockLink() {
    const code = document.getElementById('newStockCode').value.trim().toUpperCase();
    const link = document.getElementById('stockLink');
    if (code) {
        link.href = `https://www.wantgoo.com/stock/etf/${code}/dividend-policy/ex-dividend`;
        link.style.display = 'inline-block';
        link.style.opacity = '1';
    } else {
        link.href = '#';
        link.style.display = 'inline-block';
        link.style.opacity = '0.5';
    }
}

document.getElementById('stockLink').addEventListener('click', (e) => {
    const code = document.getElementById('newStockCode').value.trim().toUpperCase();
    if (!code) {
        e.preventDefault(); // 阻止連結跳轉
        alert('請先輸入股票代號，才能開啟配息頁面！');
    }
});


document.getElementById('closeModal').addEventListener('click', () => {
    document.getElementById('stockModal').classList.remove('active');
});

// ==================== 解析邏輯 ====================
function parseDividendFromText(text) {
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    
    let startIndex = -1;
    for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes('填權天數')) {
            startIndex = i + 1;
            break;
        }
    }
    if (startIndex === -1) return [];

    const results = [];
    
    for (let i = startIndex; i < lines.length; i++) {
        const line = lines[i];
        if (line.includes('現金股息')) break;
        
        const parts = line.split(/\s+/);
        if (parts.length < 2) continue;
        
        let dividendIdx = 0;
        let payDateIdx = 1;
        
        const first = parts[0];
        if (!isNaN(parseInt(first)) && parseInt(first) > 2000) {
            dividendIdx = 1;
            payDateIdx = 2;
        }
        
        if (parts.length <= payDateIdx) continue;
        
        const dividend = parseFloat(parts[dividendIdx]);
        const payDate = parts[payDateIdx];
        
        if (!isNaN(dividend) && payDate.match(/^\d{4}\/\d{2}\/\d{2}$/)) {
            results.push({
                payDate: payDate,
                dividend: dividend
            });
        }
    }
    
    return results;
}

// ==================== 解析並儲存 (修正：新增後自動跳轉) ====================
document.getElementById('parseAndSaveBtn').addEventListener('click', () => {
    const code = document.getElementById('newStockCode').value.trim().toUpperCase();
    const alias = document.getElementById('stockAlias').value.trim();
    const pasteText = document.getElementById('dividendPasteArea').value;
    
    if (!code) {
        alert('請輸入股票代號');
        return;
    }
    if (!pasteText.trim()) {
        alert('請貼入配息內容');
        return;
    }
    
    const dividends = parseDividendFromText(pasteText);
    if (dividends.length === 0) {
        alert('沒有解析到任何配息記錄，請確認貼上內容格式正確');
        return;
    }
    
    if (isEditMode) {
        // 編輯模式：保留購入記錄，覆蓋配息
        if (stockData[code]) {
            stockData[code].dividends = dividends;
            if (alias) stockData[code].alias = alias;
        } else {
            stockData[code] = { purchases: [], dividends: dividends, alias: alias };
        }
    } else {
        // 新增模式：直接設定配息
        if (!stockData[code]) {
            stockData[code] = { purchases: [], dividends: dividends, alias: alias };
        } else {
            // 如果已存在，保留購入，但配息直接覆蓋
            stockData[code].dividends = dividends;
            if (alias) stockData[code].alias = alias;
        }
    }
    
    saveToStorage();
    
    // 先關閉 modal
    document.getElementById('stockModal').classList.remove('active');
    
    // === 修正：重新渲染選單，讓新的股票代號出現在選項中 ===
    const select = document.getElementById('stockSelect');
    
    // 重新建立選單選項
    select.innerHTML = '<option value="">📌 選擇股票代號</option>';
    Object.keys(stockData).sort().forEach(stockCode => {
        const option = document.createElement('option');
        option.value = stockCode;
        const stockAlias = stockData[stockCode].alias ? ` (${stockData[stockCode].alias})` : '';
        option.textContent = `${stockCode}${stockAlias}`;
        select.appendChild(option);
    });
    
    // 設定選中的值為剛新增的股票
    select.value = code;
    currentStock = code;
    
    // 更新各個顯示
    updateStockTitle();
    updateTotalSharesDisplay();
    renderPurchases();
    renderDividendTable();
    
    alert(`✅ 已儲存股票 ${code}，共 ${dividends.length} 筆配息記錄`);
});

// ==================== 快速輸入功能 ====================
document.getElementById('quickAddBtn').addEventListener('click', () => {
    if (!currentStock) {
        alert('請先選擇股票代號');
        return;
    }
    document.getElementById('quickInputArea').value = '';
    document.getElementById('quickAddModal').classList.add('active');
});

document.getElementById('closeQuickModal').addEventListener('click', () => {
    document.getElementById('quickAddModal').classList.remove('active');
});

document.getElementById('cancelQuickBtn').addEventListener('click', () => {
    document.getElementById('quickAddModal').classList.remove('active');
});

document.getElementById('saveQuickBtn').addEventListener('click', () => {
    if (!currentStock) return;
    
    const text = document.getElementById('quickInputArea').value.trim();
    if (!text) {
        alert('請貼入要輸入的內容');
        return;
    }
    
    const lines = text.split('\n');
    let addedCount = 0;
    let errorCount = 0;
    
    lines.forEach(line => {
        line = line.trim();
        if (line.length === 0) return;
        
        const parts = line.split(/\s+/);
        if (parts.length < 2) {
            errorCount++;
            return;
        }
        
        const dateInput = parts[0];
        const sharesInput = parts[1];
        
        const formattedDate = parseDateInput(dateInput);
        if (!formattedDate) {
            errorCount++;
            return;
        }
        
        const sharesNum = parseShares(sharesInput);
        if (sharesNum <= 0) {
            errorCount++;
            return;
        }
        
        stockData[currentStock].purchases.push({ date: formattedDate, shares: sharesNum });
        addedCount++;
    });
    
    if (addedCount > 0) {
        saveToStorage();
        renderPurchases();
    }
    
    document.getElementById('quickAddModal').classList.remove('active');
    alert(`✅ 成功新增 ${addedCount} 筆，失敗 ${errorCount} 筆`);
});

// ==================== 雲端備份功能 ====================
document.getElementById('cloudSettingsBtn').addEventListener('click', () => {
    document.getElementById('cloudModal').classList.add('active');
});

document.getElementById('closeCloudModal').addEventListener('click', () => {
    document.getElementById('cloudModal').classList.remove('active');
});

document.getElementById('closeCloudBtn').addEventListener('click', () => {
    document.getElementById('cloudModal').classList.remove('active');
});

// 雲端設定輸入同步
document.getElementById('cloudUrl').addEventListener('input', (e) => {
    cloudSettings.url = e.target.value;
    saveToStorage();
});

document.getElementById('cloudToken').addEventListener('input', (e) => {
    cloudSettings.token = e.target.value;
    saveToStorage();
});

// 重置按鈕
document.getElementById('resetCloudUrlBtn').addEventListener('click', () => {
    document.getElementById('cloudUrl').value = '';
    cloudSettings.url = '';
    saveToStorage();
});

document.getElementById('resetCloudTokenBtn').addEventListener('click', () => {
    document.getElementById('cloudToken').value = '';
    cloudSettings.token = '';
    saveToStorage();
});

// 上傳雲端
document.getElementById('uploadCloudBtn').addEventListener('click', async () => {
    if (!cloudSettings.url || !cloudSettings.token) {
        alert('請先完成雲端設定');
        return;
    }
    
    if (!confirm('⚠️ 確定要將本地資料上傳至雲端嗎？這會覆蓋雲端上的舊資料。請先確認雲端設定正確。')) {
        return;
    }
    
    // 準備上傳資料：只包含 stockData，排除 cloudSettings
    const uploadData = stockData;
    
    try {
        let response;
        // 簡單判斷是否為 JSONBin (ID 格式通常是字母數字組合，不含斜線)
        if (cloudSettings.url.match(/^[a-zA-Z0-9]+$/)) {
            // JSONBin.io
            response = await fetch(`https://api.jsonbin.io/v3/b/${cloudSettings.url}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Access-Key': cloudSettings.token
                },
                body: JSON.stringify(uploadData)
            });
        } else {
            // Upstash (假設 URL 結尾是 /get/... 要改為 /set/...)
            let setUrl = cloudSettings.url.replace('/get/', '/set/');
            if (!setUrl.includes('/set/')) {
                // 如果不是標準格式，嘗試直接使用原 URL 加上 /set/
                setUrl = cloudSettings.url.replace(/\/?$/, '/set/');
            }
            response = await fetch(setUrl, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${cloudSettings.token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(uploadData)
            });
        }
        
        if (response.ok) {
            alert('✅ 雲端上傳成功！');
        } else {
            alert(`❌ 上傳失敗：${response.status} ${response.statusText}`);
        }
    } catch (error) {
        alert(`❌ 上傳錯誤：${error.message}`);
    }
});

// 下載雲端
document.getElementById('downloadCloudBtn').addEventListener('click', async () => {
    if (!cloudSettings.url || !cloudSettings.token) {
        alert('請先完成雲端設定');
        return;
    }
    
    if (!confirm('⚠️ 確定要從雲端下載資料嗎？這會覆蓋本地的所有股票資料。建議先匯出備份。')) {
        return;
    }
    
    try {
        let response;
        let data;
        
        if (cloudSettings.url.match(/^[a-zA-Z0-9]+$/)) {
            // JSONBin.io
            response = await fetch(`https://api.jsonbin.io/v3/b/${cloudSettings.url}/latest`, {
                headers: {
                    'X-Access-Key': cloudSettings.token
                }
            });
            if (response.ok) {
                const json = await response.json();
                data = json.record; // JSONBin 的資料放在 record 裡
            }
        } else {
            // Upstash
            response = await fetch(cloudSettings.url, {
                headers: {
                    'Authorization': `Bearer ${cloudSettings.token}`
                }
            });
            if (response.ok) {
                data = await response.json();
                // Upstash 回傳的結果可能包在 result 裡，視實際情況調整
                if (data.result) data = data.result;
            }
        }
        
        if (response.ok && data) {
            stockData = data;
            // 確保資料格式正確
            Object.keys(stockData).forEach(code => {
                if (!stockData[code].purchases) stockData[code].purchases = [];
                if (!stockData[code].dividends) stockData[code].dividends = [];
                if (!stockData[code].alias) stockData[code].alias = '';
            });
            saveToStorage();
            renderStockSelect();
            alert('✅ 雲端下載成功！');
        } else {
            alert(`❌ 下載失敗：${response.status} ${response.statusText}`);
        }
    } catch (error) {
        alert(`❌ 下載錯誤：${error.message}`);
    }
});

// ==================== 重置功能 ====================
document.getElementById('resetDataBtn').addEventListener('click', () => {
    if (confirm('確定要重置所有資料嗎？此操作無法復原！')) {
        stockData = {};
        saveToStorage();
        renderStockSelect();
    }
});

// ==================== 匯出 JSON (包含雲端設定) ====================
document.getElementById('exportDataBtn').addEventListener('click', () => {
    // 匯出時包含雲端設定
    const toSave = {
        stockData: stockData,
        cloudSettings: cloudSettings
    };
    const dataStr = JSON.stringify(toSave, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `divvy-${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
});

// ==================== 匯入 JSON (包含雲端設定) ====================
document.getElementById('importDataBtn').addEventListener('click', () => {
    document.getElementById('importFile').click();
});

document.getElementById('importFile').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
        try {
            const imported = JSON.parse(event.target.result);
            if (typeof imported === 'object') {
                if (confirm('匯入將會覆蓋現有所有資料，確定嗎？')) {
                    // 檢查是否有雲端設定
                    if (imported.stockData) {
                        stockData = imported.stockData;
                        cloudSettings = imported.cloudSettings || { url: '', token: '' };
                    } else {
                        // 舊版格式
                        stockData = imported;
                        cloudSettings = { url: '', token: '' };
                    }
                    
                    Object.keys(stockData).forEach(code => {
                        if (!stockData[code].purchases) stockData[code].purchases = [];
                        if (!stockData[code].dividends) stockData[code].dividends = [];
                        if (!stockData[code].alias) stockData[code].alias = '';
                    });
                    
                    // 更新雲端輸入框
                    document.getElementById('cloudUrl').value = cloudSettings.url || '';
                    document.getElementById('cloudToken').value = cloudSettings.token || '';
                    
                    saveToStorage();
                    renderStockSelect();
                    alert('匯入成功！');
                }
            } else {
                alert('檔案格式錯誤');
            }
        } catch (error) {
            alert('匯入失敗：不是有效的 JSON 檔案');
        }
    };
    reader.readAsText(file);
    e.target.value = '';
});

// ==================== 回頂端功能 ====================
const backToTopButton = document.getElementById('backToTop');

window.addEventListener('scroll', () => {
    if (document.body.scrollTop > 300 || document.documentElement.scrollTop > 300) {
        backToTopButton.style.display = 'block';
    } else {
        backToTopButton.style.display = 'none';
    }
});

backToTopButton.addEventListener('click', () => {
    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
});


// ==================== 啟動 ====================
loadFromStorage();
renderStockSelect();