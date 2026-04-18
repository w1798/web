let gridRows = 5;
let gridCols = 6;
let seatingData = []; // gridRows x gridCols
let groups = []; 
let groupIdCounter = 1;
let allStudents = Array.from({length: 30}, (_, i) => (i + 1).toString().padStart(2, '0'));

document.addEventListener('DOMContentLoaded', () => {
    initApp();
});

function initApp() {
    loadFromLocalStorage();
    initGridData();
    renderStudentList();
    renderGrid();
    setupEventListeners();
}

function loadFromLocalStorage() {
    const saved = localStorage.getItem('classSeatPlannerData');
    if (saved) {
        try {
            const data = JSON.parse(saved);
            gridRows = data.gridRows || 5;
            gridCols = data.gridCols || 6;
            seatingData = data.seatingData || [];
            groups = data.groups || [];
            groupIdCounter = data.groupIdCounter || 1;
            allStudents = data.allStudents || Array.from({length: 30}, (_, i) => (i + 1).toString().padStart(2, '0'));
        } catch (e) {
            console.error("Failed to load local storage", e);
        }
    }
}

function saveToLocalStorage() {
    const data = {
        gridRows,
        gridCols,
        seatingData,
        groups,
        allStudents,
        groupIdCounter
    };
    localStorage.setItem('classSeatPlannerData', JSON.stringify(data));
}

function initGridData() {
    // Preserve existing if resizing
    const newData = Array(gridRows).fill(null).map(() => Array(gridCols).fill(null));
    if (seatingData.length > 0) {
        for (let r = 0; r < Math.min(gridRows, seatingData.length); r++) {
            for (let c = 0; c < Math.min(gridCols, seatingData[0].length); c++) {
                newData[r][c] = seatingData[r][c];
            }
        }
    }
    seatingData = newData;
}

function renderStudentList() {
    renderListToContainer(document.getElementById('student-list'));
    renderListToContainer(document.getElementById('student-list-modal'), true);
}

function renderListToContainer(container, isMini = false) {
    if (!container) return;
    container.innerHTML = '';
    const placedStudents = getPlacedStudents();
    
    for (let id of allStudents) {
        if (!isMini && placedStudents.includes(id)) continue;

        const div = document.createElement('div');
        div.className = 'student-item';
        if (isMini) div.classList.add('mini');
        div.style.position = 'relative'; 
        div.textContent = id;
        div.draggable = true;
        div.dataset.id = id;
        
        div.addEventListener('dragstart', handleDragStart);
        div.addEventListener('dragend', handleDragEnd);

        if (!isMini) {
            const delBtn = document.createElement('span');
            delBtn.innerHTML = '&times;';
            delBtn.style.cssText = 'position:absolute; top:-5px; right:-2px; background:rgba(239, 68, 68, 0.8); color:white; border-radius:50%; width:16px; height:16px; font-size:12px; line-height:16px; text-align:center; cursor:pointer; opacity:0; transition:opacity 0.2s';
            div.appendChild(delBtn);
            div.addEventListener('mouseenter', () => delBtn.style.opacity = '1');
            div.addEventListener('mouseleave', () => delBtn.style.opacity = '0');
            delBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (confirm(`確定要從名單中刪除學生 ${id} 嗎？`)) {
                    allStudents = allStudents.filter(s => s !== id);
                    groups.forEach(g => {
                        g.members = g.members.filter(m => m !== id);
                    });
                    saveToLocalStorage();
                    renderStudentList();
                    renderGroups();
                }
            });
        }
        
        container.appendChild(div);
    }
}

function getPlacedStudents() {
    const placed = [];
    for(let r=0; r<gridRows; r++){
        for(let c=0; c<gridCols; c++){
            if(seatingData[r][c] && seatingData[r][c] !== 'disabled') {
                placed.push(seatingData[r][c]);
            }
        }
    }
    // Also remove placed students that are no longer in allStudents
    return placed;
}

function renderGrid() {
    const gridContainer = document.getElementById('seating-grid');
    gridContainer.style.gridTemplateColumns = `repeat(${gridCols}, 1fr)`;
    gridContainer.style.gridTemplateRows = `repeat(${gridRows}, 1fr)`;
    gridContainer.innerHTML = '';
    
    for (let row = 0; row < gridRows; row++) {
        for (let col = 0; col < gridCols; col++) {
            const cell = document.createElement('div');
            cell.className = 'seat-cell';
            cell.dataset.row = row;
            cell.dataset.col = col;
            
            const state = seatingData[row][col];
            if (state === 'disabled') {
                cell.classList.add('disabled');
            } else if (state !== null) {
                // If the student was deleted from allStudents, let's keep them seated until clear, but ideally we remove them.
                if(!allStudents.includes(state)) {
                    seatingData[row][col] = null;
                    cell.innerHTML = '';
                } else {
                    cell.classList.add('filled');
                    cell.textContent = state;
                    cell.draggable = true;
                    cell.dataset.id = state;
                    cell.addEventListener('dragstart', handleDragStart);
                    cell.addEventListener('dragend', handleDragEnd);
                }
            }
            
            cell.addEventListener('click', handleCellClick);
            cell.addEventListener('dragover', handleDragOver);
            cell.addEventListener('dragleave', handleDragLeave);
            cell.addEventListener('drop', handleDrop);

            gridContainer.appendChild(cell);
        }
    }
}

function handleCellClick(e) {
    const row = parseInt(this.dataset.row);
    const col = parseInt(this.dataset.col);
    const currentState = seatingData[row][col];
    
    if (currentState && currentState !== 'disabled') {
        return; 
    }
    
    if (currentState === 'disabled') {
        seatingData[row][col] = null;
    } else {
        seatingData[row][col] = 'disabled';
    }
    renderGrid();
}

let draggedStudentId = null;
let draggedFromRow = null;
let draggedFromCol = null;

function handleDragStart(e) {
    draggedStudentId = this.dataset.id;
    this.classList.add('dragged');
    
    if (this.classList.contains('seat-cell')) {
        draggedFromRow = parseInt(this.dataset.row);
        draggedFromCol = parseInt(this.dataset.col);
    } else {
        draggedFromRow = null;
        draggedFromCol = null;
    }
    showConstraintsForStudent(draggedStudentId);
}

function handleDragEnd(e) {
    this.classList.remove('dragged');
    draggedStudentId = null;
    draggedFromRow = null;
    draggedFromCol = null;
    clearConstraintsUI();
}

function handleDragOver(e) {
    e.preventDefault();
    const row = parseInt(this.dataset.row);
    const col = parseInt(this.dataset.col);
    if (seatingData[row][col] === 'disabled') return;
    if (draggedStudentId && !isValidSeat(draggedStudentId, row, col)) return;
    this.classList.add('drag-over');
}

function handleDragLeave(e) {
    this.classList.remove('drag-over');
}

function handleDrop(e) {
    e.preventDefault();
    this.classList.remove('drag-over');
    
    const targetRow = parseInt(this.dataset.row);
    const targetCol = parseInt(this.dataset.col);
    
    if (seatingData[targetRow][targetCol] === 'disabled') return;
    if (!isValidSeat(draggedStudentId, targetRow, targetCol)) return;
    
    const targetStudentId = seatingData[targetRow][targetCol];
    
    if (draggedFromRow !== null && draggedFromCol !== null) {
        seatingData[draggedFromRow][draggedFromCol] = targetStudentId || null;
    } 
    
    clearConstraintsUI();
    seatingData[targetRow][targetCol] = draggedStudentId;
    
    saveToLocalStorage();
    renderGrid();
    renderStudentList();
}

function clearConstraintsUI() {
    const cells = document.querySelectorAll('.seat-cell');
    cells.forEach(el => el.classList.remove('restricted'));
}

function showConstraintsForStudent(studentId) {
    clearConstraintsUI();
    for (let r = 0; r < gridRows; r++) {
        for (let c = 0; c < gridCols; c++) {
            if (seatingData[r][c] === 'disabled') continue;
            if (!isValidSeat(studentId, r, c)) {
                const cell = document.querySelector(`.seat-cell[data-row="${r}"][data-col="${c}"]`);
                if(cell) cell.classList.add('restricted');
            }
        }
    }
}

function setupEventListeners() {
    const clearAction = () => {
        if (confirm('確定要清除所有已安排的座位嗎？')) {
            for(let r=0; r<gridRows; r++) {
                for(let c=0; c<gridCols; c++) {
                    if(seatingData[r][c] !== 'disabled') {
                        seatingData[r][c] = null;
                    }
                }
            }
            saveToLocalStorage();
            renderGrid();
            renderStudentList();
        }
    };

    document.getElementById('btn-clear-sidebar').addEventListener('click', clearAction);

    const studentListContainer = document.getElementById('student-list');
    studentListContainer.addEventListener('dragover', (e) => {
        e.preventDefault(); 
    });
    studentListContainer.addEventListener('drop', (e) => {
        e.preventDefault();
        if (draggedFromRow !== null && draggedFromCol !== null) {
            seatingData[draggedFromRow][draggedFromCol] = null;
            saveToLocalStorage();
            renderGrid();
            renderStudentList();
        }
    });

    document.getElementById('btn-sequential-sidebar').addEventListener('click', handleSequentialPlacement);
    document.getElementById('btn-random-sidebar').addEventListener('click', handleRandomPlacement);
    document.getElementById('btn-add-group').addEventListener('click', handleAddGroup);
    document.getElementById('btn-clear-groups').addEventListener('click', () => {
        if(confirm('確定要清除所有排位規則嗎？')) {
            groups = [];
            saveToLocalStorage();
            renderGroups();
        }
    });

    document.getElementById('btn-reset-all').addEventListener('click', () => {
        if(confirm('警告：確定要重置系統嗎？這將刪除所有數據並恢復預設值。')) {
            localStorage.removeItem('classSeatPlannerData');
            location.reload();
        }
    });

    // Main Config Modal Control
    const configModal = document.getElementById('config-modal');
    document.getElementById('btn-open-config').addEventListener('click', () => {
        configModal.style.display = 'block'; // Changed to block for center scroll
        document.body.classList.add('modal-open');
        renderStudentList(); 
    });
    document.getElementById('btn-close-config').addEventListener('click', () => {
        configModal.style.display = 'none';
        document.body.classList.remove('modal-open');
    });

    const groupMembersInput = document.getElementById('group-members');
    groupMembersInput.addEventListener('dragover', (e) => {
        e.preventDefault();
        groupMembersInput.classList.add('drag-over');
    });
    groupMembersInput.addEventListener('dragleave', () => {
        groupMembersInput.classList.remove('drag-over');
    });
    groupMembersInput.addEventListener('drop', (e) => {
        e.preventDefault();
        groupMembersInput.classList.remove('drag-over');
        if (draggedStudentId) {
            let currentVal = groupMembersInput.value.trim();
            let newId = draggedStudentId;
            // Pad if single digit
            if (/^\d+$/.test(newId) && newId.length === 1) {
                newId = newId.padStart(2, '0');
            }
            
            if (currentVal) {
                const existing = currentVal.split(/[,\s]+/).map(v => v.trim());
                if (!existing.includes(newId)) {
                    groupMembersInput.value = currentVal + ', ' + newId;
                }
            } else {
                groupMembersInput.value = newId;
            }
        }
    });

    // Modal Control
    const modal = document.getElementById('student-modal');
    const modalTextarea = document.getElementById('modal-student-textarea');
    
    document.getElementById('btn-open-student-modal-from-config').addEventListener('click', () => {
        modalTextarea.value = allStudents.join('\n');
        modal.style.display = 'block';
        document.body.classList.add('modal-open');
    });

    document.getElementById('btn-modal-cancel').addEventListener('click', () => {
        modal.style.display = 'none';
        if (configModal.style.display === 'none') {
            document.body.classList.remove('modal-open');
        }
    });

    document.getElementById('btn-modal-save').addEventListener('click', () => {
        const lines = modalTextarea.value.split('\n').map(v => v.trim()).filter(v => v !== '');
        allStudents = lines;
        // Clean up groups that might have members no longer in allStudents
        groups.forEach(g => {
            g.members = g.members.filter(m => allStudents.includes(m));
        });
        groups = groups.filter(g => g.members.length >= 2);
        
        saveToLocalStorage();
        modal.style.display = 'none';
        if (configModal.style.display === 'none') {
            document.body.classList.remove('modal-open');
        }
        renderStudentList();
        renderGrid();
        renderGroups();
    });

    // New resize button
    document.getElementById('btn-resize').addEventListener('click', () => {
        const rows = parseInt(document.getElementById('grid-rows').value);
        const cols = parseInt(document.getElementById('grid-cols').value);
        if (rows >= 1 && rows <= 7 && cols >= 1 && cols <= 7) {
            gridRows = rows;
            gridCols = cols;
            initGridData();
            saveToLocalStorage();
            renderGrid();
            renderStudentList();
            configModal.style.display = 'none'; 
            document.body.classList.remove('modal-open');
        } else {
            alert('網格尺寸必須在 1~7 之間');
        }
    });
}

function handleSequentialPlacement() {
    let unplaced = getUnplacedStudents();
    if (unplaced.length === 0) return;
    
    // maintain the original order from allStudents
    const orderedUnplaced = allStudents.filter(id => unplaced.includes(id));

    let studentIndex = 0;
    // Sequential: from right column (col=gridCols-1) to left column (col=0)
    // Front row (row=0) to back row (row=gridRows-1)
    for (let c = gridCols - 1; c >= 0; c--) {
        for (let r = 0; r < gridRows; r++) {
            if (studentIndex >= orderedUnplaced.length) break;
            
            if (seatingData[r][c] === null) {
                const sId = orderedUnplaced[studentIndex];
                if (isValidSeat(sId, r, c)) {
                    seatingData[r][c] = sId;
                    studentIndex++;
                }
            }
        }
    }
    
    renderGrid();
    renderStudentList();
    saveToLocalStorage();
}

function handleRandomPlacement() {
    let unplaced = getUnplacedStudents();
    if (unplaced.length === 0) return;
    
    const availableSeats = [];
    for(let r = 0; r < gridRows; r++) {
        for(let c = 0; c < gridCols; c++) {
            if (seatingData[r][c] === null) {
                availableSeats.push({r, c});
            }
        }
    }

    if (availableSeats.length < unplaced.length) {
        alert('位子不夠，請調整不可坐人的網格或增加位子！');
        return;
    }

    function backtrack(studentIndex) {
        if (studentIndex === unplaced.length) return true;
        
        const sId = unplaced[studentIndex];
        availableSeats.sort(() => Math.random() - 0.5);
        
        for (let i = 0; i < availableSeats.length; i++) {
            const seat = availableSeats[i];
            if (seatingData[seat.r][seat.c] === null && isValidSeat(sId, seat.r, seat.c)) {
                seatingData[seat.r][seat.c] = sId;
                if (backtrack(studentIndex + 1)) {
                    return true;
                }
                seatingData[seat.r][seat.c] = null;
            }
        }
        return false;
    }

    unplaced.sort(() => Math.random() - 0.5);
    
    const success = backtrack(0);
    if (!success) {
        alert('無法找到符合避讓條件的隨機座位安排，請減少群組限制或重試。');
    }
    
    renderGrid();
    renderStudentList();
}

function handleAddGroup() {
    const input = document.getElementById('group-members');
    const mode = document.getElementById('group-mode').value;
    const rawVal = input.value.trim();
    if (!rawVal) return;

    // Supports custom names now + auto padding for digits
    const mems = rawVal.split(/[,\s]+/).map(v => {
        v = v.trim();
        // If it's a number and less than 10, pad with 0
        if (/^\d+$/.test(v) && v.length === 1) {
            return v.padStart(2, '0');
        }
        return v;
    }).filter(v => v !== '');
    
    const validMems = mems.filter(v => allStudents.includes(v));
    
    if (validMems.length < 2) {
        alert('一個群組至少需要兩個有效的學生！');
        return;
    }

    const newGroup = {
        id: groupIdCounter++,
        members: validMems,
        mode: mode
    };
    groups.push(newGroup);
    
    saveToLocalStorage();
    input.value = '';
    renderGroups();
}

function renderGroups() {
    const container = document.getElementById('active-groups');
    container.innerHTML = '';
    
    groups.forEach(g => {
        const div = document.createElement('div');
        div.className = 'group-tag';
        const mText = g.members.join(', ');
        const modeTexts = {
            'left_right': '左右相鄰',
            'front_back': '前後相鄰',
            'cross': '小十字',
            'grid': '九宮格'
        };
        const modeText = modeTexts[g.mode];
        
        div.innerHTML = `
            <span>[${modeText}] ${mText}</span>
            <span class="remove-btn" data-id="${g.id}">×</span>
        `;
        
        div.querySelector('.remove-btn').addEventListener('click', function() {
            if(confirm('確定要刪除這條避讓規則嗎？')) {
                groups = groups.filter(xg => xg.id !== g.id);
                saveToLocalStorage();
                renderGroups();
            }
        });
        
        container.appendChild(div);
    });
}

function getUnplacedStudents() {
    const placed = getPlacedStudents();
    return allStudents.filter(s => !placed.includes(s));
}

function isValidSeat(studentId, row, col) {
    for (const group of groups) {
        if (!group.members.includes(studentId)) continue;
        
        for (let r = 0; r < gridRows; r++) {
            for (let c = 0; c < gridCols; c++) {
                const seatStudent = seatingData[r][c];
                if (seatStudent && seatStudent !== 'disabled' && seatStudent !== studentId && group.members.includes(seatStudent)) {
                    
                    const rDiff = Math.abs(r - row);
                    const cDiff = Math.abs(c - col);
                    
                    if (group.mode === 'cross') {
                        if (rDiff + cDiff <= 1) return false;
                    } else if (group.mode === 'grid') {
                        if (rDiff <= 1 && cDiff <= 1) return false;
                    } else if (group.mode === 'left_right') {
                        if (rDiff === 0 && cDiff === 1) return false;
                    } else if (group.mode === 'front_back') {
                        if (rDiff === 1 && cDiff === 0) return false;
                    }
                }
            }
        }
    }
    return true;
}
