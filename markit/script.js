/**
 * Charles Nextime Web Tools Portal - Core Logic
 * * Copyright (c) 2026 Charles Nextime
 * Licensed under the GNU General Public License v3.0
 * * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation.
 */

const FULL_30 = "1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30";

const DEFAULT_LABELS = {
    1: "淺藍(完成)", 2: "亮橘(請假)", 3: "深紫紅", 4: "深紫色", 5: "灰色", 6: "綠色",
    7: "磚紅色", 8: "寶藍色", 9: "芥末黃", 10: "棕色", 11: "粉紅色", 12: "青綠色"
};

let state = {
    settings: { 
        autoDate: true, theme: 'soft', gridCols: 5, studentCols: 7, 
        studentList: FULL_30, sizeDetail: 95, sizeReport: 70, sizeTotal: 70,
        sortOrder: 'desc',
        quickTasks: "國習,數習,生字,圈詞",
        studentFontSize: 18,
        appendMode: false,
        dateOffset: 1,
        statusCount: 1,
        statusLabels: { ...DEFAULT_LABELS },
        binId: '',
        apiKey: ''
    },
    assignments: []
};

let isDragging = false;

window.onload = () => {
    initSelectors();
    loadData();
};

function initSelectors() {
    const layoutSel = document.getElementById('layoutSelect');
    if(layoutSel) {
        layoutSel.innerHTML = '';
        for(let i=1; i<=10; i++) layoutSel.add(new Option(`${i} 個`, i));
    }
 
    const fontSel = document.getElementById('studentFontSizeSelect');
    if (fontSel) {
        fontSel.innerHTML = '';
        let i = 14;
        while (i <= 150) {
            fontSel.add(new Option(`${i} px`, i));
            if (i < 30) { i += 2; } else { i += 4; }
        }
    }
   
    const dateOffsetSel = document.getElementById('dateOffsetSelect');
    if (dateOffsetSel) {
        dateOffsetSel.innerHTML = '';
        dateOffsetSel.add(new Option("+3 天(大後天)", 3));
        dateOffsetSel.add(new Option("+2 天(後天)", 2));
        dateOffsetSel.add(new Option("+1 天 (明天)", 1));
        dateOffsetSel.add(new Option("0 天 (今天)", 0));
    }

    const statusSel = document.getElementById('statusCountSelect');
    if(statusSel) {
        statusSel.innerHTML = '';
        for(let i=1; i<=12; i++) {
            const label = state.settings.statusLabels[i] || `顏色 ${i}`;
            statusSel.add(new Option(`${i} 色 (至${label.split(' ')[0]})`, i));
        }
    }

    const sizes = [95, 90, 80, 70, 60, 50, 40, 30];
    document.querySelectorAll('.size-sel').forEach(sel => {
        sel.innerHTML = '';
        sizes.forEach(s => sel.add(new Option(`${s}%`, s)));
    });

    // 初始化後，同步 state 到 UI
    syncSettingsToUI();
}

function syncSettingsToUI() {
    const s = state.settings;
    
    const setters = {
        'autoDate': (el) => el.checked = !!s.autoDate,
        'appendModeSetting': (el) => el.checked = !!s.appendMode,
        'layoutSelect': (el) => el.value = s.gridCols || 5,
        'studentColsSelect': (el) => el.value = s.studentCols || 7,
        'themeSelect': (el) => el.value = s.theme || 'soft',
        'sortOrderSelect': (el) => el.value = s.sortOrder || 'desc',
        'sizeDetail': (el) => el.value = s.sizeDetail || 95,
        'sizeReport': (el) => el.value = s.sizeReport || 70,
        'sizeTotal': (el) => el.value = s.sizeTotal || 70,
        'statusCountSelect': (el) => el.value = s.statusCount || 1,
        'studentFontSizeSelect': (el) => el.value = s.studentFontSize || 18,
        'dateOffsetSelect': (el) => el.value = s.dateOffset || 1,
        'quickTasksConfig': (el) => el.value = (s.quickTasks || "").split(',').join('\n'),
        'studentListConfig': (el) => el.value = (s.studentList || "").split(',').join('\n'),
        'cloudBinId': (el) => el.value = s.binId || '',
        'cloudApiKey': (el) => el.value = s.apiKey || ''
    };

    for (const [id, setter] of Object.entries(setters)) {
        const el = document.getElementById(id);
        if (el) setter(el);
    }
}

function loadData() {
    const saved = localStorage.getItem('MarkIt');
    if (saved) {
        try {
            const parsed = JSON.parse(saved);
            state.settings = { ...state.settings, ...parsed.settings };
            state.assignments = parsed.assignments || [];
            
            for (let i = 1; i <= 12; i++) {
                if (!state.settings.statusLabels[i]) {
                    state.settings.statusLabels[i] = DEFAULT_LABELS[i];
                }
            }
        } catch(e) { console.error("Data Parse Error", e); }
    }
    
    syncSettingsToUI();
    applySettings();
    renderAssignments();
}

function initQuickTags() {
    const container = document.getElementById('quickTags');
    if(!container) return;
    container.innerHTML = '';
    const tasks = parseList(state.settings.quickTasks);
    tasks.forEach(task => {
        const btn = document.createElement('button');
        btn.className = 'tag-btn';
        btn.innerText = task;
        btn.onclick = () => fillTaskName(task);
        container.appendChild(btn);
    });
}

function renderDateQuickSelect() {
    const container = document.getElementById('dateQuickSelect');
    if (!container) return;
    container.innerHTML = '';
    const baseOffset = parseInt(state.settings.dateOffset || 0);
    const dayNames = ["日", "一", "二", "三", "四", "五", "六"];
    for (let i = baseOffset - 2; i <= baseOffset + 2; i++) {
        const d = new Date();
        d.setDate(d.getDate() + i);
        const mmdd = (d.getMonth() + 1).toString().padStart(2, '0') + d.getDate().toString().padStart(2, '0');
        const label = `${mmdd}(${dayNames[d.getDay()]})`;
        const btn = document.createElement('button');
        btn.className = 'tag-btn';
        btn.style.background = (i === baseOffset) ? 'var(--primary)' : '#888';
        btn.innerText = label;
        btn.onclick = () => {
            const input = document.getElementById('assignmentNameInput');
            const datePattern = /^\d{4}\([\u4e00-\u9fa5]\)/;
            input.value = datePattern.test(input.value) ? input.value.replace(datePattern, label) : label + input.value;
            moveCursorToEnd(input);
        };
        container.appendChild(btn);
    }
}

function openAddModal() {
    const input = document.getElementById('assignmentNameInput');
    if(input) input.value = state.settings.autoDate ? getOffsetDateStr() : "";
    initQuickTags();
    renderDateQuickSelect();
    openModal('addAssignmentModal');
    if(input) setTimeout(() => { moveCursorToEnd(input); }, 200);
}

function moveCursorToEnd(el) {
    el.focus();
    const len = el.value.length;
    el.setSelectionRange(len, len);
}

function getOffsetDateStr() {
    const d = new Date();
    d.setDate(d.getDate() + parseInt(state.settings.dateOffset || 0));
    const mm = (d.getMonth() + 1).toString().padStart(2, '0');
    const dd = d.getDate().toString().padStart(2, '0');
    return `${mm}${dd}(${["日", "一", "二", "三", "四", "五", "六"][d.getDay()]})`;
}

function fillTaskName(task) {
    const input = document.getElementById('assignmentNameInput');
    if(!input) return;
    let currentVal = input.value.trim();
    if (state.settings.appendMode && currentVal !== "") {
        input.value = currentVal + task;
    } else {
        const datePattern = /^\d{4}\([\u4e00-\u9fa5]\)/;
        const match = currentVal.match(datePattern);
        input.value = (state.settings.autoDate ? (match ? match[0] : getOffsetDateStr()) : "") + task;
    }
    moveCursorToEnd(input);
}

function applySettings() {
    const s = state.settings;
    document.body.setAttribute('data-theme', s.theme);
    document.documentElement.style.setProperty('--grid-cols', s.gridCols);
    document.documentElement.style.setProperty('--student-cols', s.studentCols);
    document.documentElement.style.setProperty('--student-font-size', (s.studentFontSize || 18) + 'px');
    const setW = (id, val) => { const el = document.getElementById(id); if(el) el.style.width = (val || 70) + '%'; };
    setW('detailModalContent', s.sizeDetail);
    setW('reportModalContent', s.sizeReport);
    setW('totalModalContent', s.sizeTotal);
}

function saveSettings() {
    const s = state.settings;
    // 使用「安全讀取」防止 null 報錯
    const getV = (id) => document.getElementById(id) ? document.getElementById(id).value : null;
    const getC = (id) => document.getElementById(id) ? document.getElementById(id).checked : false;

    s.autoDate = getC('autoDate');
    s.appendMode = getC('appendModeSetting');
    
    if(getV('layoutSelect')) s.gridCols = parseInt(getV('layoutSelect'));
    if(getV('studentColsSelect')) s.studentCols = parseInt(getV('studentColsSelect'));
    if(getV('themeSelect')) s.theme = getV('themeSelect');
    if(getV('sortOrderSelect')) s.sortOrder = getV('sortOrderSelect');
    
    s.sizeDetail = parseInt(getV('sizeDetail') || 95);
    s.sizeReport = parseInt(getV('sizeReport') || 70);
    s.sizeTotal = parseInt(getV('sizeTotal') || 70);
    s.statusCount = parseInt(getV('statusCountSelect') || 1);
    s.studentFontSize = parseInt(getV('studentFontSizeSelect') || 18);
    s.dateOffset = parseInt(getV('dateOffsetSelect') || 1);
    
    if(document.getElementById('quickTasksConfig'))
        s.quickTasks = parseList(document.getElementById('quickTasksConfig').value).join(',');
    if(document.getElementById('studentListConfig'))
        s.studentList = parseList(document.getElementById('studentListConfig').value).join(',');
    
    if(document.getElementById('cloudBinId')) s.binId = getV('cloudBinId').trim();
    if(document.getElementById('cloudApiKey')) s.apiKey = getV('cloudApiKey').trim();

    for(let i = 1; i <= 12; i++) {
        const input = document.getElementById(`statusLabel_${i}`);
        if(input) s.statusLabels[i] = input.value.trim();
    }

    saveData();
    applySettings();
    closeModal('settingsModal');
    initSelectors(); 
}

function getSortedList() {
    return state.settings.sortOrder === 'desc' ? [...state.assignments].reverse() : [...state.assignments];
}

function renderAssignments() {
    const container = document.getElementById('assignmentContainer');
    if(!container) return;
    container.innerHTML = '';
    if (state.assignments.length === 0) {
        container.innerHTML = `<div class="empty-hint">請先「新增任務」開始使用！</div>`;
        return;
    }
    const totalCount = parseList(state.settings.studentList).length;
    getSortedList().forEach(item => {
        const undone = totalCount - item.doneList.length;
        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = `<h3>${item.name}</h3><p style="font-weight:bold; margin-top:5px; color:var(--primary)">${undone > 0 ? undone + ' 人未交' : '✅ 已完成'}</p>`;
        card.onclick = () => openDetail(item.id);
        container.appendChild(card);
    });
}

function parseList(input) {
    if(!input) return [];
    return input.split(/[\n,]/).map(s => s.trim()).filter(s => s);
}

function openModal(id) {
    const modal = document.getElementById(id);
    if (!modal) return;
    modal.style.display = 'block'; 
    if(id === 'settingsModal') {
        const labelContainer = document.getElementById('statusLabelInputs');
        if (labelContainer) {
            labelContainer.innerHTML = '';
            for(let i = 1; i <= 12; i++) {
                const row = document.createElement('div');
                row.style = 'display:flex; align-items:center; gap:10px; margin-bottom:5px;';
                row.innerHTML = `<span class="status-dot status-${i}" style="width:12px; height:12px; border-radius:50%; display:inline-block;"></span> 
                    <input type="text" id="statusLabel_${i}" value="${state.settings.statusLabels[i] || ""}" 
                    style="flex:1; padding:4px; border:1px solid #ccc; border-radius:4px;">`;
                labelContainer.appendChild(row);
            }
        }
    }
}

function closeModal(id) { 
    const modal = document.getElementById(id);
    if(modal) modal.style.display = 'none'; 
    renderAssignments(); 
}

function renderTotalListContent() {
    const filterEl = document.getElementById('totalFilter');
    const body = document.getElementById('totalListDynamicBody');
    if (!filterEl || !body) return;
    const filterType = filterEl.value;
    const studentList = parseList(state.settings.studentList);
    body.innerHTML = getSortedList().map(a => {
        let targets = [];
        if (filterType === 'undone') {
            targets = studentList.filter(s => !a.doneList.some(item => (typeof item === 'object' ? item.id === s : item === s)));
        } else {
            const statusNum = parseInt(filterType);
            targets = a.doneList.filter(item => (typeof item === 'object' ? item.status === statusNum : statusNum === 1)).map(item => (typeof item === 'object' ? item.id : item));
        }
        return `<div style="padding:10px; border-bottom:1px solid #eee"><span class="clickable-task" onclick="closeModal('totalListModal'); openDetail(${a.id})">${a.name}</span>: <span>${targets.join(', ') || '<span style="color:#ccc">無</span>'}</span></div>`;
    }).join('') || '<div style="text-align:center; color:#888; padding:20px;">目前無名單</div>';
}

function toggleStudent(n, el, work) {
    // 1. 從 localStorage 同步最新狀態，避免多視窗操作時資料被覆蓋
    const saved = localStorage.getItem('MarkIt');
    if (saved) {
        const latest = JSON.parse(saved);
        const latestWork = latest.assignments.find(a => a.id === work.id);
        if (latestWork) { 
            work.doneList = latestWork.doneList; 
            state.assignments = latest.assignments; 
        }
    }

    // 2. 獲取目前設定的最高色數 (例如您設定的 12)
    const maxStatus = parseInt(state.settings.statusCount || 1);
    
    // 3. 尋找該學生是否已經在已完成清單中
    const idx = work.doneList.findIndex(item => (typeof item === 'object' ? item.id === n : item === n));

    if (idx === -1) {
        // 情況 A：目前是空白狀態 -> 切換到第 1 色
        work.doneList.push({ id: n, status: 1 });
    } else {
        // 獲取當前狀態數值
        let currStatus = typeof work.doneList[idx] === 'object' ? work.doneList[idx].status : 1;
        
        if (currStatus < maxStatus) {
            // 情況 B：還沒到達最高色數 -> 切換到下一色
            work.doneList[idx] = { id: n, status: currStatus + 1 };
        } else {
            // 情況 C：已經是最後一色 -> 從清單移除，變回空白
            work.doneList.splice(idx, 1);
        }
    }

    // 4. 更新該學生方格的 CSS UI
    updateStudentUI(n, el, work);

    // 5. 靜默儲存到 localStorage
    saveDataQuietly(); 
}

function updateStudentUI(n, el, work) {
    // 找出該學生的紀錄
    const record = work.doneList.find(item => (typeof item === 'object' ? item.id === n : item === n));
    
    // 【重點】清除所有可能的狀態 class
    // 使用正則表達式或 startsWith 確保 status-7 ~ status-12 都能被移除
    Array.from(el.classList).forEach(className => {
        if (className.startsWith('status-') || className === 'done') {
            el.classList.remove(className);
        }
    });
    
    // 如果有紀錄，就加上新的 class；如果沒有紀錄 (已被 splice)，這裡就不會執行，方格變回空白
    if (record) {
        const status = typeof record === 'object' ? record.status : 1;
        el.classList.add(`status-${status}`);
        
        // 為了相容您原本的 CSS，如果是第 1 色，額外補上 .done
        if (status === 1) el.classList.add('done');
    }
}

function openReportModal() {
    const select = document.getElementById('reportStudentSelect');
    const filter = document.getElementById('reportFilter');
    if(!select || !filter) return;
    select.innerHTML = parseList(state.settings.studentList).map(s => `<option value="${s}">${s}</option>`).join('');
    let filterHtml = `<option value="undone">未完成</option>`;
    for(let i=1; i<=parseInt(state.settings.statusCount || 1); i++) filterHtml += `<option value="${i}">${state.settings.statusLabels[i]}</option>`;
    filter.innerHTML = filterHtml;
    generateStudentReport();
    openModal('studentReportModal');
}

function generateStudentReport() {
    const num = document.getElementById('reportStudentSelect').value;
    const type = document.getElementById('reportFilter').value;
    let list = getSortedList().filter(a => {
        if (type === 'undone') return !a.doneList.some(item => (typeof item === 'object' ? item.id === num : item === num));
        return a.doneList.some(item => (typeof item === 'object' ? (item.id === num && item.status === parseInt(type)) : (num === item && parseInt(type) === 1)));
    });
    const container = document.getElementById('reportResult');
    container.innerHTML = list.length > 0 ? list.map(a => `<div class="report-link" onclick="closeModal('studentReportModal'); openDetail(${a.id})">${a.name}</div>`).join('') : `<p style="text-align:center; color:#888;">無資料。</p>`;
}

function openDetail(id) {
    const work = state.assignments.find(a => a.id === id);
    if(!work) return;
    
    // 1. 設定標題
    document.getElementById('detailTitle').innerText = work.name;

    // 2. 新增：動態生成顏色圖例 (Legend)
    const legendContainer = document.getElementById('statusLegend');
    if (legendContainer) {
        legendContainer.innerHTML = '';
        const maxStatus = parseInt(state.settings.statusCount || 1);
        
        for (let i = 1; i <= maxStatus; i++) {
            // 取得完整標籤，例如 "湖水藍 (完成)"
            const fullLabel = state.settings.statusLabels[i] || `狀態${i}`;

            // 移除之前的 .split(' ')[0]，直接顯示 fullLabel
            legendContainer.innerHTML += `
                <span class="legend-item">
                    <span class="status-dot status-${i}"></span>
                    <span class="legend-text status-text-${i}">
                        ${i}.${fullLabel}
                    </span>
                </span>`;
        }
    }

    // 3. 渲染學生方格
    const grid = document.getElementById('studentGrid'); 
    grid.innerHTML = '';
    parseList(state.settings.studentList).forEach(n => {
        const div = document.createElement('div');
        div.className = `student-item`;
        div.innerText = n;
        updateStudentUI(n, div, work);

        div.onmousedown = () => { isDragging = true; toggleStudent(n, div, work); };
        div.onmouseenter = () => { if (isDragging) toggleStudent(n, div, work); };
        grid.appendChild(div);
    });

    window.onmouseup = () => isDragging = false;
    
    document.getElementById('deleteBtn').onclick = () => { 
        if(confirm("確定刪除此任務？")) { 
            state.assignments = state.assignments.filter(a => a.id !== id); 
            saveData(); 
            closeModal('detailModal'); 
        } 
    };
    openModal('detailModal');
}

function openTotalListModal() {
    const container = document.getElementById('totalListContent');
    if (!container) return;
    let html = `<div style="margin-bottom:10px;">篩選：<select id="totalFilter" onchange="renderTotalListContent()"><option value="undone">未完成</option>`;
    for(let i=1; i<=parseInt(state.settings.statusCount || 1); i++) html += `<option value="${i}">${state.settings.statusLabels[i]}</option>`;
    html += `</select></div><div id="totalListDynamicBody"></div>`;
    container.innerHTML = html;
    renderTotalListContent(); openModal('totalListModal');
}

function copyTotalList() {
    navigator.clipboard.writeText(document.getElementById('totalListDynamicBody').innerText).then(() => alert("已複製！"));
}

function exportData() {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(state)], {type: "application/json"}));
    a.download = `Markit_Backup.json`; a.click();
}

function addAssignment() {
    const name = document.getElementById('assignmentNameInput').value.trim();
    if (!name) return;
    state.assignments.push({ id: Date.now(), name, doneList: [] });
    saveData(); closeModal('addAssignmentModal');
}

function cleanFinishedAssignments() {
    const total = parseList(state.settings.studentList).length;
    const fin = state.assignments.filter(a => a.doneList.length >= total);
    if (fin.length === 0) return alert("沒已完成的任務。");
    if (confirm(`刪除 ${fin.length} 個已完成任務？`)) {
        state.assignments = state.assignments.filter(a => a.doneList.length < total);
        saveData(); closeModal('settingsModal');
    }
}

function resetQuickTasks() { if(confirm("恢復預設快速標籤？")) document.getElementById('quickTasksConfig').value = "國習\n數習\n生字\n圈詞"; }
function resetStudentList() { if(confirm("恢復預設名單？")) document.getElementById('studentListConfig').value = FULL_30.split(',').join('\n'); }
function resetBinField(id) { if(confirm("確定清除？")) document.getElementById(id).value = ''; }

async function cloudSync(method = 'UPLOAD') {
    const { binId, apiKey } = state.settings;
    if (!binId || !apiKey) return alert("請先填寫雲端設定");
    try {
        if (method === 'UPLOAD') {
            const uploadData = JSON.parse(JSON.stringify(state));
            delete uploadData.settings.binId; delete uploadData.settings.apiKey;
            let res = await fetch(`https://api.jsonbin.io/v3/b/${binId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json', 'X-Access-Key': apiKey }, body: JSON.stringify(uploadData) });
            if (res.ok) alert("✅ 備份成功！");
        } else {
            let res = await fetch(`https://api.jsonbin.io/v3/b/${binId}/latest`, { headers: { 'X-Access-Key': apiKey } });
            let data = (await res.json()).record;
            if (data) { state = Object.assign({}, state, data); state.settings.binId = binId; state.settings.apiKey = apiKey; saveData(); location.reload(); }
        }
    } catch (e) { alert("⚠️ 錯誤：" + e.message); }
}

function saveData() { localStorage.setItem('MarkIt', JSON.stringify(state)); renderAssignments(); }
function saveDataQuietly() { localStorage.setItem('MarkIt', JSON.stringify(state)); }
function triggerImport() { document.getElementById('importInput').click(); }
function importData(e) {
    const reader = new FileReader();
    reader.onload = (ev) => { state = JSON.parse(ev.target.result); saveData(); location.reload(); };
    reader.readAsText(e.target.files[0]);
}
function resetSystem() { if(confirm("確定重置系統？")) { localStorage.removeItem('MarkIt'); location.reload(); } }

window.addEventListener('storage', (event) => {
    if (event.key === 'MarkIt' && event.newValue) {
        try {
            // 1. 立即同步 B 視窗記憶體中的 state
            state = JSON.parse(event.newValue);

            // 2. 更新首頁卡片
            renderAssignments();

            // 3. 更新目前開啟的詳細視窗
            const detailModal = document.getElementById('detailModal');
            if (detailModal && detailModal.style.display === 'block') {
                const currentTitle = document.getElementById('detailTitle').innerText;
                // 從剛更新的 state 中找任務
                const currentWork = state.assignments.find(a => a.name === currentTitle);
                
                if (currentWork) {
                    const grid = document.getElementById('studentGrid');
                    const items = grid.querySelectorAll('.student-item');
                    const studentList = parseList(state.settings.studentList);

                    items.forEach((div, index) => {
                        const studentName = studentList[index];
                        // 強制執行一次 UI 刷新
                        updateStudentUI(studentName, div, currentWork);
                    });
                }
            }
            applySettings();
        } catch (e) { console.error(e); }
    }
});
