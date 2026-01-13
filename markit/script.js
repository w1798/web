const FULL_30 = "1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30";

let state = {
    settings: { 
        autoDate: true, theme: 'soft', gridCols: 5, studentCols: 7, 
        studentList: FULL_30, sizeDetail: 50, sizeReport: 70, sizeTotal: 70,
        sortOrder: 'desc',
        quickTasks: "國習,數習,生字,圈詞",
        appendMode: false
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
    
    const sizes = [95, 90, 80, 70, 60, 50, 40, 30];
    document.querySelectorAll('.size-sel').forEach(sel => {
        sizes.forEach(s => sel.add(new Option(`${s}%`, s)));
    });
}

function loadData() {
    const saved = localStorage.getItem('MarkIt_V17');
    if (saved) state = JSON.parse(saved);
    applySettings();
    renderAssignments();
}

function initQuickTags() {
    const container = document.getElementById('quickTags');
    if(!container) return;
    container.innerHTML = '';
    const tasks = state.settings.quickTasks.split(',').map(t => t.trim()).filter(t => t);
    tasks.forEach(task => {
        const btn = document.createElement('button');
        btn.className = 'tag-btn';
        btn.innerText = task;
        btn.onclick = () => fillTaskName(task);
        container.appendChild(btn);
    });
}

function moveCursorToEnd(el) {
    el.focus();
    const len = el.value.length;
    el.setSelectionRange(len, len);
}

function fillTaskName(task) {
    const input = document.getElementById('assignmentNameInput');
    const d = new Date();
    const dateStr = (d.getMonth() + 1).toString().padStart(2, '0') + d.getDate().toString().padStart(2, '0');
    
    let currentVal = input.value.trim();
    if (state.settings.appendMode && currentVal !== "") {
        input.value = currentVal + task;
    } else {
        input.value = state.settings.autoDate ? `${dateStr}${task}` : task;
    }
    moveCursorToEnd(input);
}

function applySettings() {
    const s = state.settings;
    document.body.setAttribute('data-theme', s.theme);
    document.documentElement.style.setProperty('--grid-cols', s.gridCols);
    document.documentElement.style.setProperty('--student-cols', s.studentCols);
    
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

    const totalCount = state.settings.studentList.split(',').length;
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

function openModal(id) {
    const modal = document.getElementById(id);
    if (!modal) return;
    modal.style.display = 'block'; 
    if(id === 'settingsModal') {
        const s = state.settings;
        document.getElementById('studentListConfig').value = s.studentList;
        document.getElementById('quickTasksConfig').value = s.quickTasks;
        document.getElementById('autoDate').checked = s.autoDate;
        document.getElementById('appendModeSetting').checked = s.appendMode || false;
        document.getElementById('themeSelect').value = s.theme;
        document.getElementById('layoutSelect').value = s.gridCols;
        document.getElementById('studentColsSelect').value = s.studentCols || 7;
        document.getElementById('sortOrderSelect').value = s.sortOrder || 'desc';
        document.getElementById('sizeDetail').value = s.sizeDetail || 50;
        document.getElementById('sizeReport').value = s.sizeReport || 70;
        document.getElementById('sizeTotal').value = s.sizeTotal || 70;
    }
}

function closeModal(id) { 
    const modal = document.getElementById(id);
    if(modal) modal.style.display = 'none'; 
    renderAssignments(); 
}

function openAddModal() {
    const input = document.getElementById('assignmentNameInput');
    const d = new Date();
    input.value = state.settings.autoDate ? (d.getMonth() + 1).toString().padStart(2, '0') + d.getDate().toString().padStart(2, '0') : "";
    initQuickTags();
    openModal('addAssignmentModal');
    setTimeout(() => { moveCursorToEnd(input); }, 200);
}

function openDetail(id) {
    const work = state.assignments.find(a => a.id === id);
    if(!work) return;
    document.getElementById('detailTitle').innerText = work.name;
    const grid = document.getElementById('studentGrid'); grid.innerHTML = '';
    state.settings.studentList.split(',').map(s => s.trim()).filter(s => s).forEach(n => {
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
    select.innerHTML = state.settings.studentList.split(',').map(s => `<option value="${s.trim()}">${s.trim()}</option>`).join('');
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
    const totalStudentCount = state.settings.studentList.split(',').map(s => s.trim()).filter(s => s).length;
    
    // 只過濾出「尚未全班完成」的任務
    const unfinishedAssignments = sorted.filter(a => a.doneList.length < totalStudentCount);

    if (unfinishedAssignments.length === 0) {
        container.innerHTML = `<div class="all-done-msg">✨ 任務都完成！ ✨</div>`;
    } else {
        container.innerHTML = unfinishedAssignments.map(a => {
            const undone = state.settings.studentList.split(',').map(s => s.trim()).filter(s => s && !a.doneList.includes(s));
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
    if (content.querySelector('.all-done-msg')) return; // 如果全完成就不執行複製
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
    const totalCount = state.settings.studentList.split(',').map(s => s.trim()).filter(s => s).length;
    const finishedCount = state.assignments.filter(a => a.doneList.length >= totalCount).length;
    if (finishedCount === 0) return alert("目前沒有已完成的任務。");
    if (confirm(`確定刪除 ${finishedCount} 個已完成任務？`)) {
        state.assignments = state.assignments.filter(a => a.doneList.length < totalCount);
        saveData();
        closeModal('settingsModal');
    }
}

function saveData() { localStorage.setItem('MarkIt_V17', JSON.stringify(state)); renderAssignments(); }
function saveDataQuietly() { localStorage.setItem('MarkIt_V17', JSON.stringify(state)); }
function triggerImport() { document.getElementById('importInput').click(); }
function importData(e) {
    const reader = new FileReader();
    reader.onload = (ev) => { state = JSON.parse(ev.target.result); saveData(); location.reload(); };
    reader.readAsText(e.target.files[0]);
}
function resetSystem() { if(confirm("確定重置系統？")) { localStorage.removeItem('MarkIt_V17'); location.reload(); } }
