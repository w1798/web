const FULL_30 = "1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30";

let state = {
    settings: { 
        autoDate: true, theme: 'soft', gridCols: 5, studentCols: 7, 
        studentList: FULL_30, sizeDetail: 95, sizeReport: 70, sizeTotal: 70,
        sortOrder: 'desc',
        quickTasks: "國習,數習,生字,圈詞",
        studentFontSize: 18,
        appendMode: false,
        dateOffset: 1,
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
    if(layoutSel) for(let i=1; i<=10; i++) layoutSel.add(new Option(`${i} 個`, i));
 
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
        dateOffsetSel.add(new Option("+3 天(大後天)", 3));
        dateOffsetSel.add(new Option("+2 天(後天)", 2));
        dateOffsetSel.add(new Option("+1 天 (明天)", 1));
        dateOffsetSel.add(new Option("0 天 (今天)", 0));
        dateOffsetSel.value = state.settings.dateOffset || 1;
    }

    const sizes = [95, 90, 80, 70, 60, 50, 40, 30];
    document.querySelectorAll('.size-sel').forEach(sel => {
        sizes.forEach(s => sel.add(new Option(`${s}%`, s)));
    });
}

function loadData() {
    const saved = localStorage.getItem('MarkIt');
    if (saved) state = JSON.parse(saved);
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

// 渲染日期快捷標籤 (含星期)
function renderDateQuickSelect() {
    const container = document.getElementById('dateQuickSelect');
    if (!container) return;
    container.innerHTML = '';
    
    const baseOffset = parseInt(state.settings.dateOffset || 0);
    const dayNames = ["日", "一", "二", "三", "四", "五", "六"];
    
    // 生成 前後兩天 + 當天，共五個
    for (let i = baseOffset - 2; i <= baseOffset + 2; i++) {
        const d = new Date();
        d.setDate(d.getDate() + i);
        const mmdd = (d.getMonth() + 1).toString().padStart(2, '0') + d.getDate().toString().padStart(2, '0');
        const dayName = dayNames[d.getDay()];
        const label = `${mmdd}(${dayName})`;
        
        const btn = document.createElement('button');
        btn.className = 'tag-btn';
        // 預設日期(當天偏移量)使用主色調
        btn.style.background = (i === baseOffset) ? 'var(--primary)' : '#888';
        btn.innerText = label;
        btn.onclick = () => {
	    const input = document.getElementById('assignmentNameInput');
	    const datePattern = /^\d{4}\([\u4e00-\u9fa5]\)/;

            // 如果開頭已經是日期格式(4位數字)，替換掉；否則插入最前面
            if (datePattern.test(input.value)) {
                input.value = input.value.replace(datePattern, label);
            } else {
                input.value = label + input.value;
            }
            moveCursorToEnd(input);
        };
        container.appendChild(btn);
    }
}

// 整合後的 openAddModal
function openAddModal() {
    const input = document.getElementById('assignmentNameInput');
    input.value = state.settings.autoDate ? getOffsetDateStr() : "";
    initQuickTags();
    renderDateQuickSelect(); // 確保呼叫此處來顯示日期標籤
    openModal('addAssignmentModal');
    setTimeout(() => { moveCursorToEnd(input); }, 200);
}

function moveCursorToEnd(el) {
    el.focus();
    const len = el.value.length;
    el.setSelectionRange(len, len);
}

function getOffsetDateStr() {
    const d = new Date();
    const offset = parseInt(state.settings.dateOffset || 0);
    d.setDate(d.getDate() + offset);
    
    const mm = (d.getMonth() + 1).toString().padStart(2, '0');
    const dd = d.getDate().toString().padStart(2, '0');
    const dayNames = ["日", "一", "二", "三", "四", "五", "六"];
    const dayName = dayNames[d.getDay()];
    
    return `${mm}${dd}(${dayName})`; // 回傳格式如 0119(一)
}

function fillTaskName(task) {
    const input = document.getElementById('assignmentNameInput');
    let currentVal = input.value.trim();
    
    if (state.settings.appendMode && currentVal !== "") {
        // 累加模式：直接加在後面
        input.value = currentVal + task;
    } else {
        // 非累加模式：
        // 1. 檢查目前輸入框開頭是否已經有日期格式 0000(X)
        const datePattern = /^\d{4}\([\u4e00-\u9fa5]\)/;
        const match = currentVal.match(datePattern);
        
        if (state.settings.autoDate) {
            if (match) {
                // 如果目前輸入框已經有日期（可能是使用者點選上方日期標籤選的），保留該日期並接上任務
                input.value = match[0] + task;
            } else {
                // 如果完全沒日期，才使用系統計算的預設日期
                input.value = getOffsetDateStr() + task;
            }
        } else {
            // 不自動加日期模式
            input.value = task;
        }
    }
    moveCursorToEnd(input);
}
function applySettings() {
    const s = state.settings;
    document.body.setAttribute('data-theme', s.theme);
    document.documentElement.style.setProperty('--grid-cols', s.gridCols);
    document.documentElement.style.setProperty('--student-cols', s.studentCols);
    document.documentElement.style.setProperty('--student-font-size', (s.studentFontSize || 18) + 'px');
    
    if(document.getElementById('detailModalContent')) 
        document.getElementById('detailModalContent').style.width = (s.sizeDetail || 50) + '%';
    if(document.getElementById('reportModalContent')) 
        document.getElementById('reportModalContent').style.width = (s.sizeReport || 70) + '%';
    if(document.getElementById('totalModalContent')) 
        document.getElementById('totalModalContent').style.width = (s.sizeTotal || 70) + '%';
}

function saveSettings() {
    const s = state.settings;
    s.autoDate = document.getElementById('autoDate').checked;
    s.appendMode = document.getElementById('appendModeSetting').checked;
    s.gridCols = parseInt(document.getElementById('layoutSelect').value);
    s.studentCols = parseInt(document.getElementById('studentColsSelect').value);
    s.theme = document.getElementById('themeSelect').value;
    s.sortOrder = document.getElementById('sortOrderSelect').value;
    s.sizeDetail = parseInt(document.getElementById('sizeDetail').value);
    s.sizeReport = parseInt(document.getElementById('sizeReport').value);
    s.sizeTotal = parseInt(document.getElementById('sizeTotal').value);
    s.quickTasks = document.getElementById('quickTasksConfig').value.trim();
    s.studentList = document.getElementById('studentListConfig').value.trim() || FULL_30;
    s.studentFontSize = parseInt(document.getElementById('studentFontSizeSelect').value);
    s.dateOffset = parseInt(document.getElementById('dateOffsetSelect').value);
    s.binId = document.getElementById('binId').value.trim();
    s.apiKey = document.getElementById('apiKey').value.trim();
    
    saveData();
    applySettings();
    closeModal('settingsModal');
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
    const sorted = getSortedList();
    sorted.forEach(item => {
        const undone = totalCount - item.doneList.length;
        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = `<h3>${item.name}</h3><p style="font-weight:bold; margin-top:5px; color:var(--primary)">${undone > 0 ? undone + ' 人未交' : '✅ 已完成'}</p>`;
        card.onclick = () => openDetail(item.id);
        container.appendChild(card);
    });
}

function parseList(input) {
    // 支援換行與逗號分隔
    return input.split(/[\n,]/).map(s => s.trim()).filter(s => s);
}

function openModal(id) {
    const modal = document.getElementById(id);
    if (!modal) return;
    modal.style.display = 'block'; 
    if(id === 'settingsModal') {
        const s = state.settings;
        // 進入設定頁時，將儲存的逗號字串轉回換行顯示
        document.getElementById('studentListConfig').value = s.studentList.split(',').join('\n');
        document.getElementById('quickTasksConfig').value = s.quickTasks.split(',').join('\n');
        
        document.getElementById('autoDate').checked = s.autoDate;
        document.getElementById('appendModeSetting').checked = s.appendMode || false;
        document.getElementById('themeSelect').value = s.theme;
        document.getElementById('layoutSelect').value = s.gridCols;
        document.getElementById('studentColsSelect').value = s.studentCols || 7;
        document.getElementById('sortOrderSelect').value = s.sortOrder || 'desc';
        document.getElementById('sizeDetail').value = s.sizeDetail || 50;
        document.getElementById('sizeReport').value = s.sizeReport || 70;
        document.getElementById('sizeTotal').value = s.sizeTotal || 70;
        document.getElementById('studentFontSizeSelect').value = s.studentFontSize || 18;
        document.getElementById('dateOffsetSelect').value = s.dateOffset || 1;
        document.getElementById('binId').value = s.binId || '';
        document.getElementById('apiKey').value = s.apiKey || '';
    }
}

function closeModal(id) { 
    const modal = document.getElementById(id);
    if(modal) modal.style.display = 'none'; 
    renderAssignments(); 
}

function openDetail(id) {
    const work = state.assignments.find(a => a.id === id);
    if(!work) return;
    document.getElementById('detailTitle').innerText = work.name;
    const grid = document.getElementById('studentGrid'); grid.innerHTML = '';
    parseList(state.settings.studentList).forEach(n => {
        const div = document.createElement('div');
        div.className = `student-item ${work.doneList.includes(n) ? 'done' : ''}`;
        div.innerText = n;

        div.onmousedown = () => { isDragging = true; toggleStudent(n, div, work); };
        div.onmouseenter = () => { if (isDragging) toggleStudent(n, div, work); };
        grid.appendChild(div);
    });
    window.onmouseup = () => isDragging = false;
    document.getElementById('deleteBtn').onclick = () => { 
        if(confirm("確定刪除此任務？")) { state.assignments = state.assignments.filter(a => a.id !== id); saveData(); closeModal('detailModal'); } 
    };
    openModal('detailModal');
}

function toggleStudent(n, el, work) {
    if (!work.doneList.includes(n)) { work.doneList.push(n); el.classList.add('done'); }
    else { work.doneList = work.doneList.filter(x => x !== n); el.classList.remove('done'); }
    saveDataQuietly();
}

function openReportModal() {
    const select = document.getElementById('reportStudentSelect');
    if(!select) return;
    const names = parseList(state.settings.studentList);
    select.innerHTML = names.map(s => `<option value="${s}">${s}</option>`).join('');
    generateStudentReport();
    openModal('studentReportModal');
}

function generateStudentReport() {
    const num = document.getElementById('reportStudentSelect').value;
    const sorted = getSortedList();
    const undone = sorted.filter(a => !a.doneList.includes(num));
    document.getElementById('reportResult').innerHTML = undone.length 
        ? undone.map(a => `<div class="report-link" onclick="closeModal('studentReportModal'); openDetail(${a.id})">${a.name}</div>`).join('')
        : `<p style="text-align:center; font-size:1.2rem; margin-top:20px;">✅ 該生已完成所有任務！</p>`;
}

function openTotalListModal() {
    const sorted = getSortedList();
    const container = document.getElementById('totalListContent');
    const studentList = parseList(state.settings.studentList);
    const totalStudentCount = studentList.length;
    
    const unfinishedAssignments = sorted.filter(a => a.doneList.length < totalStudentCount);

    if (unfinishedAssignments.length === 0) {
        container.innerHTML = `<div class="all-done-msg">✨ 任務都完成！ ✨</div>`;
    } else {
        container.innerHTML = unfinishedAssignments.map(a => {
            const undone = studentList.filter(s => !a.doneList.includes(s));
            return `<div style="padding:10px; border-bottom:1px solid #eee">
                <span class="clickable-task" onclick="closeModal('totalListModal'); openDetail(${a.id})">${a.name}</span>: 
                <span>${undone.join(', ') || '無'}</span>
            </div>`;
        }).join('');
    }
    openModal('totalListModal');
}

function copyTotalList() {
    const content = document.getElementById('totalListContent');
    if (content.querySelector('.all-done-msg')) return;
    const text = content.innerText;
    navigator.clipboard.writeText(text).then(() => alert("名單已複製！"));
}

function exportData() {
    const d = new Date();
    const dateStr = (d.getMonth() + 1).toString().padStart(2, '0') + d.getDate().toString().padStart(2, '0');
    const blob = new Blob([JSON.stringify(state)], {type: "application/json"});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `Markit_${dateStr}.json`;
    a.click();
}

function addAssignment() {
    const name = document.getElementById('assignmentNameInput').value.trim();
    if (!name) return;
    state.assignments.push({ id: Date.now(), name, doneList: [] });
    saveData(); closeModal('addAssignmentModal');
}

function cleanFinishedAssignments() {
    const totalCount = parseList(state.settings.studentList).length;
    const finishedCount = state.assignments.filter(a => a.doneList.length >= totalCount).length;
    if (finishedCount === 0) return alert("目前沒有已完成的任務。");
    if (confirm(`確定刪除 ${finishedCount} 個已完成任務？`)) {
        state.assignments = state.assignments.filter(a => a.doneList.length < totalCount);
        saveData();
        closeModal('settingsModal');
    }
}


// 新增：重置快速標籤功能
function resetQuickTasks() {
    if(confirm("確定要將快速標籤恢復為預設值嗎？")) {
        const defaultTasks = "國習,數習,生字,圈詞";
        document.getElementById('quickTasksConfig').value = defaultTasks.split(',').join('\n');
    }
}

// 新增：重置座號名單功能
function resetStudentList() {
    if(confirm("確定要將名單恢復為 1-30 號嗎？")) {
        document.getElementById('studentListConfig').value = FULL_30.split(',').join('\n');
    }
}


async function uploadToCloud() {
    const { binId, apiKey } = state.settings;
    if (!binId || !apiKey) return alert("請先在「設定」中填寫 https://jsonbin.io 的 Bin ID 與 API Key");
    
    if (!confirm("確定要將【本地資料】上傳至雲端嗎？\n注意：這會覆蓋雲端的資料。")) return;

    // 1. 深拷貝 state 避免影響本地運作
    const uploadData = JSON.parse(JSON.stringify(state));
    // 2. 移除副本中的 ID 與 Key
    delete uploadData.settings.binId;
    delete uploadData.settings.apiKey;

    try {
        const response = await fetch(`https://api.jsonbin.io/v3/b/${binId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'X-Access-Key': apiKey
            },
            body: JSON.stringify(uploadData) // 上傳排除後的版本
        });

        if (response.ok) {
            alert("雲端同步成功！");
        } else {
            const err = await response.json();
            alert("上傳失敗：" + (err.message || "請檢查設定"));
        }
    } catch (e) {
        alert("網路連線錯誤：" + e.message);
    }
}

async function downloadFromCloud() {
    const { binId, apiKey } = state.settings;
    if (!binId || !apiKey) return alert("請先在「設定」中填寫 https://jsonbin.io 的 Bin ID 與 API Key");

    if (!confirm("確定從雲端下載資料嗎？\n這將覆蓋現在的所有資料。")) return;

    try {
        const response = await fetch(`https://api.jsonbin.io/v3/b/${binId}/latest`, {
            method: 'GET',
            headers: { 'X-Access-Key': apiKey }
        });

        if (response.ok) {
            const resData = await response.json();
            const cloudState = resData.record;
            
            // 將雲端下載的內容覆蓋到 state，但強制保留目前的 API 資訊
            state = cloudState;
            state.settings.binId = binId;
            state.settings.apiKey = apiKey;

            saveData();
            alert("雲端下載完成！");
            location.reload();
        } else {
            alert("下載失敗，請檢查 Bin ID 與 API Key。");
        }
    } catch (e) {
        alert("網路連線錯誤：" + e.message);
    }
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
