/**
 * Charles Nextime Web Tools Portal - Core Logic
 * Copyright (c) 2026 Charles Nextime
 * Licensed under the GNU General Public License v3.0
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation.
 */


let gridRows = 5;
let gridCols = 6;
let seatingData = []; // gridRows x gridCols
let groups = []; 
let groupIdCounter = 1;
let allStudents = Array.from({length: 30}, (_, i) => (i + 1).toString().padStart(2, '0'));
let boyCount = 15; 

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}

function initApp() {
    loadFromLocalStorage();
    initGridData();
    renderStudentList();
    renderGrid();
    renderGroups();
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
        div.addEventListener('dragover', handleListDragOver);
        div.addEventListener('drop', handleListDrop);

        // Tap-to-Place Logic
        div.addEventListener('click', () => {
            if (selectedStudentIdForPlace === id) {
                selectedStudentIdForPlace = null;
                div.classList.remove('selected-for-place');
                document.querySelectorAll('.seat-cell').forEach(c => c.classList.remove('placement-mode'));
            } else {
                // Deselect previous
                document.querySelectorAll('.student-item').forEach(i => i.classList.remove('selected-for-place'));
                selectedStudentIdForPlace = id;
                div.classList.add('selected-for-place');
                
                // Highlight valid seats
                document.querySelectorAll('.seat-cell').forEach(cell => {
                    const r = parseInt(cell.dataset.row);
                    const c = parseInt(cell.dataset.col);
                    if (seatingData[r][c] === null && isValidSeat(id, r, c, false)) {
                        cell.classList.add('placement-mode');
                    } else {
                        cell.classList.remove('placement-mode');
                    }
                });
            }
        });

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
    
    // If we have a student selected for placement
    if (selectedStudentIdForPlace) {
        if (currentState === null && isValidSeat(selectedStudentIdForPlace, row, col, false)) {
            seatingData[row][col] = selectedStudentIdForPlace;
            selectedStudentIdForPlace = null;
            saveToLocalStorage();
            renderGrid();
            renderStudentList();
            return;
        } else if (currentState === null) {
            alert('此處不符合避讓規則！');
            return;
        }
    }

    if (currentState && currentState !== 'disabled') {
        // Option: click seated student to return to list?
        if (confirm(`要將學生 ${currentState} 移回名單嗎？`)) {
            seatingData[row][col] = null;
            saveToLocalStorage();
            renderGrid();
            renderStudentList();
        }
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
let selectedStudentIdForPlace = null; // New placement state


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
    if (!isValidSeat(draggedStudentId, targetRow, targetCol, false)) return; // Don't enforce gender in drag-drop
    
    const targetStudentId = seatingData[targetRow][targetCol];
    
    if (draggedFromRow !== null && draggedFromCol !== null) {
        // Swap within grid
        seatingData[draggedFromRow][draggedFromCol] = targetStudentId || null;
    } else {
        // From list to grid: if target was filled, we don't swap back to list in a specific way here 
        // because the list rendering handles "placedStudents" exclusion.
        // But if we want to be consistent with "swap", we could do more.
        // However, the current behavior is fine for list-to-grid.
    }
    
    clearConstraintsUI();
    seatingData[targetRow][targetCol] = draggedStudentId;
    
    saveToLocalStorage();
    renderGrid();
    renderStudentList();
}

function handleListDragOver(e) {
    e.preventDefault();
    this.classList.add('drag-over');
}

function handleListDrop(e) {
    e.preventDefault();
    this.classList.remove('drag-over');
    const targetStudentId = this.dataset.id;
    
    if (!draggedStudentId || draggedStudentId === targetStudentId) return;

    if (draggedFromRow !== null && draggedFromCol !== null) {
        // From grid back to list (specifically onto another student)
        seatingData[draggedFromRow][draggedFromCol] = null;
    } else {
        // From list to list (Swap)
        const idx1 = allStudents.indexOf(draggedStudentId);
        const idx2 = allStudents.indexOf(targetStudentId);
        if (idx1 !== -1 && idx2 !== -1) {
            [allStudents[idx1], allStudents[idx2]] = [allStudents[idx2], allStudents[idx1]];
        }
    }

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
            if (!isValidSeat(studentId, r, c, false)) { // No gender check for UI masking
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

    document.getElementById('btn-gender-interleave').addEventListener('click', () => {
        boyCount = parseInt(document.getElementById('boy-count').value) || 0;
        handleGenderInterleavePlacement();
    });

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
        configModal.style.display = 'block'; 
        document.body.classList.add('modal-open');
        renderStudentList(); 
    });
    document.getElementById('btn-close-config').addEventListener('click', () => {
        configModal.style.display = 'none';
        document.body.classList.remove('modal-open');
    });

    // Student Picker Logic (New)
    const pickerModal = document.getElementById('picker-modal');
    const groupMembersInput = document.getElementById('group-members');
    let selectedPickerIds = [];

    groupMembersInput.addEventListener('click', () => {
        const currentMems = groupMembersInput.value.split(/[,\s]+/).map(v => v.trim()).filter(v => v !== '');
        selectedPickerIds = currentMems.filter(id => allStudents.includes(id));
        renderPickerGrid();
        pickerModal.style.display = 'block';
    });

    function renderPickerGrid() {
        const grid = document.getElementById('picker-student-grid');
        grid.innerHTML = '';
        allStudents.forEach(id => {
            const div = document.createElement('div');
            div.className = 'picker-item';
            if (selectedPickerIds.includes(id)) div.classList.add('selected');
            div.textContent = id;
            div.onclick = () => {
                if (selectedPickerIds.includes(id)) {
                    selectedPickerIds = selectedPickerIds.filter(x => x !== id);
                    div.classList.remove('selected');
                } else {
                    selectedPickerIds.push(id);
                    div.classList.add('selected');
                }
            };
            grid.appendChild(div);
        });
    }

    document.getElementById('btn-picker-cancel').addEventListener('click', () => {
        pickerModal.style.display = 'none';
    });
    document.getElementById('btn-picker-confirm').addEventListener('click', () => {
        groupMembersInput.value = selectedPickerIds.join(', ');
        pickerModal.style.display = 'none';
    });


    // Removed old drag-drop logic for group input as requested to use picker


    // Modal Control
    const modal = document.getElementById('student-modal');
    const modalTextarea = document.getElementById('modal-student-textarea');
    
    document.getElementById('btn-open-student-modal-from-config').addEventListener('click', () => {
        modalTextarea.value = allStudents.join('\n');
        modal.style.display = 'block';
        document.body.classList.add('modal-open');
    });

    document.getElementById('btn-modal-clear').addEventListener('click', () => {
        if (confirm('確定要清空學生名單嗎？')) {
            modalTextarea.value = '';
        }
    });

    document.getElementById('btn-modal-reset').addEventListener('click', () => {
        if (confirm('確定要恢復預設的 01~30 名單嗎？')) {
            modalTextarea.value = Array.from({length: 30}, (_, i) => (i + 1).toString().padStart(2, '0')).join('\n');
        }
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
                if (isValidSeat(sId, r, c, false)) { // No gender check
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

    let iterations = 0;
    const MAX_ITERATIONS = 50000;

    function backtrack(studentIndex) {
        iterations++;
        if (iterations > MAX_ITERATIONS) return false;
        if (studentIndex === unplaced.length) return true;
        
        const sId = unplaced[studentIndex];
        
        // Shuffle seats
        for (let i = availableSeats.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [availableSeats[i], availableSeats[j]] = [availableSeats[j], availableSeats[i]];
        }
        
        for (let i = 0; i < availableSeats.length; i++) {
            const seat = availableSeats[i];
            if (seatingData[seat.r][seat.c] === null && isValidSeat(sId, seat.r, seat.c, false)) { // No gender
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
    if (iterations > MAX_ITERATIONS) {
        alert('運算過於複雜（已達最大上限），請減少規則後重試。');
    } else if (!success) {
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

function isValidSeat(studentId, row, col, checkGender = false) {
    const isBoy = (sid) => {
        const idx = allStudents.indexOf(sid);
        return idx !== -1 && idx < boyCount;
    };

    const currentIsBoy = isBoy(studentId);

    for (let r = 0; r < gridRows; r++) {
        for (let c = 0; c < gridCols; c++) {
            const seatStudent = seatingData[r][c];
            if (seatStudent && seatStudent !== 'disabled' && seatStudent !== studentId) {
                const rDiff = Math.abs(r - row);
                const cDiff = Math.abs(c - col);
                const isAdjacentCross = (rDiff + cDiff <= 1);
                const isAdjacentGrid = (rDiff <= 1 && cDiff <= 1);

                for (const group of groups) {
                    if (group.members.includes(studentId) && group.members.includes(seatStudent)) {
                        if (group.mode === 'cross' && isAdjacentCross) return false;
                        if (group.mode === 'grid' && isAdjacentGrid) return false;
                        if (group.mode === 'left_right' && rDiff === 0 && cDiff === 1) return false;
                        if (group.mode === 'front_back' && rDiff === 1 && cDiff === 0) return false;
                    }
                }

                if (checkGender && currentIsBoy === isBoy(seatStudent)) {
                    if (isAdjacentCross) return false;
                }
            }
        }
    }
    return true;
}

function handleGenderInterleavePlacement() {
    let unplaced = getUnplacedStudents();
    if (unplaced.length === 0) return;

    const availableSeats = [];
    for(let r = 0; r < gridRows; r++) {
        for(let c = 0; c < gridCols; c++) {
            if (seatingData[r][c] === null) {
                availableSeats.push({r, c, color: (r + c) % 2});
            }
        }
    }

    if (availableSeats.length < unplaced.length) {
        alert('位子不夠，請調整！');
        return;
    }

    const isBoy = (sid) => {
        const idx = allStudents.indexOf(sid);
        return idx !== -1 && idx < boyCount;
    };

    const boys = unplaced.filter(s => isBoy(s));
    const girls = unplaced.filter(s => !isBoy(s));

    const seats0 = availableSeats.filter(s => s.color === 0);
    const seats1 = availableSeats.filter(s => s.color === 1);

    // Pick the combination that fits more students or just pick one
    // We try to match the gender with more students to the color with more seats
    const moreSeatsColor = (seats0.length >= seats1.length) ? 0 : 1;
    const moreStudentsGenderIsBoy = (boys.length >= girls.length);
    const boyTargetColor = moreStudentsGenderIsBoy ? moreSeatsColor : (1 - moreSeatsColor);

    // Shuffle seats for variation
    const shuffledAvailable = [...availableSeats].sort(() => Math.random() - 0.5);

    // We don't use full backtracking here because the user wants "fill as many as possible" 
    // and "stop when you can't". Simple greedy placement with random order usually works well 
    // for this requirement, especially if we process one gender then the other.
    
    // Shuffle gender batches
    boys.sort(() => Math.random() - 0.5);
    girls.sort(() => Math.random() - 0.5);

    let placedCount = 0;

    const placeBatch = (students, targetColor) => {
        for (const sId of students) {
            const possibleSeats = shuffledAvailable.filter(s => s.color === targetColor && seatingData[s.r][s.c] === null);
            for (const seat of possibleSeats) {
                if (isValidSeat(sId, seat.r, seat.c, true)) {
                    seatingData[seat.r][seat.c] = sId;
                    placedCount++;
                    break;
                }
            }
        }
    };

    placeBatch(boys, boyTargetColor);
    placeBatch(girls, 1 - boyTargetColor);

    if (placedCount === 0 && unplaced.length > 0) {
        alert('無法自動安置任何學生，請手動調整或減少避讓規則。');
    }
    
    renderGrid();
    renderStudentList();
    saveToLocalStorage();
}
