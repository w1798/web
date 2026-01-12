const FULL_30 = "1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30";

let state = {
    settings: { 
        autoDate: true, theme: 'soft', gridCols: 5, studentCols: 7, 
        studentList: FULL_30, sizeDetail: 50, sizeReport: 70, sizeTotal: 70,
        sortOrder: 'desc' // 預設新到舊
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
    for(let i=1; i<=10; i++) layoutSel.add(new Option(`${i} 個`, i));
    const sizes = [95, 90, 80, 70, 60, 50];
    document.querySelectorAll('.size-sel').forEach(sel => {
        sizes.forEach(s => sel.add(new Option(`${s}%`, s)));
    });
}

function openModal(id) { 
    document.getElementById(id).style.display = 'block'; 
    if(id === 'settingsModal') {
        const s = state.settings;
        document.getElementById('studentListConfig').value = s.studentList;
        document.getElementById('autoDate').checked = s.autoDate;
        document.getElementById('themeSelect').value = s.theme;
        document.getElementById('layoutSelect').value = s.gridCols;
        document.getElementById('studentColsSelect').value = s.studentCols || 7;
        document.getElementById('sizeDetail').value = s.sizeDetail || 50;
        document.getElementById('sizeReport').value = s.sizeReport || 70;
        document.getElementById('sizeTotal').value = s.sizeTotal || 70;
        document.getElementById('sortOrderSelect').value = s.sortOrder || 'desc';
    }
}

function closeModal(id) { document.getElementById(id).style.display = 'none'; renderAssignments(); }

function saveSettings() {
    const s = state.settings;
    s.autoDate = document.getElementById('autoDate').checked;
    s.gridCols = parseInt(document.getElementById('layoutSelect').value);
    s.studentCols = parseInt(document.getElementById('studentColsSelect').value);
    s.theme = document.getElementById('themeSelect').value;
    s.sizeDetail = parseInt(document.getElementById('sizeDetail').value);
    s.sizeReport = parseInt(document.getElementById('sizeReport').value);
    s.sizeTotal = parseInt(document.getElementById('sizeTotal').value);
    s.sortOrder = document.getElementById('sortOrderSelect').value;
    let listInput = document.getElementById('studentListConfig').value.trim();
    s.studentList = listInput || FULL_30;
    saveData();
    applySettings();
    closeModal('settingsModal');
}

function applySettings() {
    const s = state.settings;
    document.body.setAttribute('data-theme', s.theme);
    document.documentElement.style.setProperty('--grid-cols', s.gridCols);
    document.documentElement.style.setProperty('--student-cols', s.studentCols);
    document.getElementById('detailModalContent').style.width = (s.sizeDetail || 50) + '%';
    document.getElementById('reportModalContent').style.width = (s.sizeReport || 70) + '%';
    document.getElementById('totalModalContent').style.width = (s.sizeTotal || 70) + '%';
}

function getSortedAssignments() {
    const list = [...state.assignments];
    return state.settings.sortOrder === 'desc' ? list.reverse() : list;
}

function renderAssignments() {
    const container = document.getElementById('assignmentContainer');
    container.innerHTML = '';
    applySettings();
    const totalCount = state.settings.studentList.split(',').length;
    const sorted = getSortedAssignments();
    
    sorted.forEach(item => {
        const undone = totalCount - item.doneList.length;
        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = `<h3>${item.name}</h3><p style="color:var(--primary); font-weight:bold; margin-top:5px;">${undone > 0 ? undone + ' 人未交' : '✅ 已完成'}</p>`;
        card.onclick = () => openDetail(item.id);
        container.appendChild(card);
    });
}

function openDetail(id) {
    const work = state.assignments.find(a => a.id === id);
    if(!work) return;
    document.getElementById('detailTitle').innerText = work.name;
    const grid = document.getElementById('studentGrid');
    grid.innerHTML = '';
    const students = state.settings.studentList.split(',').map(s => s.trim()).filter(s => s !== "");
    students.forEach(num => {
        const div = document.createElement('div');
        div.className = `student-item ${work.doneList.includes(num) ? 'done' : ''}`;
        div.innerText = num;
        div.onmousedown = () => { isDragging = true; toggleStudent(num, div, work); };
        div.onmouseenter = () => { if (isDragging) toggleStudent(num, div, work); };
        grid.appendChild(div);
    });
    window.onmouseup = () => isDragging = false;
    document.getElementById('deleteBtn').onclick = () => {
        if(confirm("確定刪除此作業？")) { state.assignments = state.assignments.filter(a => a.id !== id); saveData(); closeModal('detailModal'); }
    };
    openModal('detailModal');
}

function toggleStudent(num, el, work) {
    if (!work.doneList.includes(num)) { work.doneList.push(num); el.classList.add('done'); }
    else { work.doneList = work.doneList.filter(n => n !== num); el.classList.remove('done'); }
    saveDataQuietly();
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

function copyTotalList() {
    const content = document.getElementById('totalListContent').innerText;
    if(!content.trim()) return alert("名單為空");
    navigator.clipboard.writeText(content).then(() => alert("總名單已複製到剪貼簿！"));
}

function openTotalListModal() {
    const sorted = getSortedAssignments();
    document.getElementById('totalListContent').innerHTML = sorted.map(a => {
        const undone = state.settings.studentList.split(',').map(s => s.trim()).filter(s => !a.doneList.includes(s));
        return `<div style="padding:12px; border-bottom:1px solid #eee">
            <span class="report-link" onclick="closeModal('totalListModal'); openDetail(${a.id})">${a.name}</span>: 
            <span style="font-size:1.3rem;">${undone.join(', ') || '無'}</span>
        </div>`;
    }).join('');
    openModal('totalListModal');
}

function openReportModal() {
    const select = document.getElementById('reportStudentSelect');
    select.innerHTML = state.settings.studentList.split(',').map(s => `<option value="${s.trim()}">${s.trim()}</option>`).join('');
    generateStudentReport();
    openModal('studentReportModal');
}

function generateStudentReport() {
    const num = document.getElementById('reportStudentSelect').value;
    const sorted = getSortedAssignments();
    const undone = sorted.filter(a => !a.doneList.includes(num));
    document.getElementById('reportResult').innerHTML = undone.length 
        ? undone.map(a => `<span class="report-link" onclick="quickMarkAndOpen(${a.id})">${a.name}</span>`).join(' ')
        : `<p style="text-align:center; font-size:1.5rem; margin-top:20px;">✅ 該生已完成所有作業！</p>`;
}

function quickMarkAndOpen(assignmentId) {
    closeModal('studentReportModal');
    openDetail(assignmentId);
}

function saveData() { localStorage.setItem('MarkIt_V17', JSON.stringify(state)); renderAssignments(); }
function saveDataQuietly() { localStorage.setItem('MarkIt_V17', JSON.stringify(state)); }

function loadData() {
    const saved = localStorage.getItem('MarkIt_V17');
    if (saved) state = JSON.parse(saved);
    applySettings();
    renderAssignments();
}

function openAddModal() {
    const input = document.getElementById('assignmentNameInput');
    if (state.settings.autoDate) {
        const d = new Date();
        const dateStr = (d.getMonth() + 1).toString().padStart(2, '0') + d.getDate().toString().padStart(2, '0');
        input.value = dateStr + " ";
    } else { input.value = ""; }
    openModal('addAssignmentModal');
    setTimeout(() => { input.focus(); const len = input.value.length; input.setSelectionRange(len, len); }, 200);
}

function addAssignment() {
    const name = document.getElementById('assignmentNameInput').value;
    if (!name.trim()) return;
    state.assignments.push({ id: Date.now(), name, doneList: [] });
    saveData();
    closeModal('addAssignmentModal');
}

function triggerImport() { document.getElementById('importInput').click(); }
function importData(e) {
    const reader = new FileReader();
    reader.onload = (ev) => { state = JSON.parse(ev.target.result); saveData(); location.reload(); };
    reader.readAsText(e.target.files[0]);
}

function resetSystem() { if(confirm("確定重置系統？")) { localStorage.removeItem('MarkIt_V17'); location.reload(); } }

function cleanFinishedAssignments() {
    const totalCount = state.settings.studentList.split(',').length;
    const finished = state.assignments.filter(a => a.doneList.length === totalCount);
    if (finished.length === 0) return alert("目前沒有已完成作業。");
    if (confirm(`確定刪除 ${finished.length} 個已完成作業？`)) {
        state.assignments = state.assignments.filter(a => a.doneList.length !== totalCount);
        saveData();
    }
}
