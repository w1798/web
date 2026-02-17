/**
 * Charles Nextime Web Tools Portal - Core Logic
 * * Copyright (c) 2026 Charles Nextime
 * Licensed under the GNU General Public License v3.0
 * * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation.
 */

function renderStudentGrid() {
    const container = document.getElementById('studentContainer');
    container.innerHTML = '';
    container.style.gridTemplateColumns = `repeat(${config.gridCount}, 1fr)`;
    const names = config.students.split('\n').filter(n => n.trim() !== "");
    
    names.forEach((name, index) => {
        const div = document.createElement('div');
        const isSelected = !!studentStates[name];
        div.className = 'student-card' + (isSelected ? ' selected' : '');
        div.innerText = name;
        
        if(!isSelected) {
            div.style.borderColor = "color-mix(in srgb, var(--accent-color), transparent 70%)";
            div.style.color = "#333333";
        } else {
            div.style.borderColor = "var(--accent-color)";
            div.style.color = "var(--text-color)";
        }

        div.onclick = () => openStudentModal(name);
        container.appendChild(div);
    });
}

function openStudentModal(name) {
    activeStudent = name;
    document.getElementById('currentStudentTitle').innerText = `請為 ${name} 選擇類別和特質`;
    document.getElementById('studentModal').style.display = 'flex';

    const picker = document.getElementById('traitsPicker');
    picker.innerHTML = '';
    picker.style.setProperty('--trait-cols', config.traitCols);
    picker.style.gridTemplateColumns = `repeat(${config.traitCols}, 1fr)`;
    
    const lines = config.traitsRaw.split('\n');
    let currentGroup = null;
    let groupIdx = 0;

    lines.forEach(line => {
        const trimmed = line.trim();
        if (!trimmed) return;

        if (trimmed.endsWith("類")) {
            currentGroup = document.createElement('div');
            currentGroup.className = 'trait-box';
            const boxColor = secondaryColors[groupIdx % secondaryColors.length];
            currentGroup.style.borderColor = boxColor;
            currentGroup.innerHTML = `<div class="trait-title" style="background:${boxColor}">${trimmed}</div>`;
            picker.appendChild(currentGroup);
            groupIdx++;
        } 
        else if (currentGroup) {
            const span = document.createElement('span');
            span.className = 'trait-item';
            span.innerText = trimmed;
            if (studentStates[name]?.traits.includes(trimmed)) span.classList.add('active');
            span.onclick = () => span.classList.toggle('active');
            currentGroup.appendChild(span);
        }
    });

    const toneDiv = document.getElementById('tonePicker');
    toneDiv.innerHTML = '';
    const toneList = config.tones.split('\n').map(t => t.trim()).filter(t => t);
    const activeTones = studentStates[name]?.tones || (config.lastTones.length ? config.lastTones : toneList.slice(0, 1));
    
    toneList.forEach(t => {
        const span = document.createElement('span');
        span.className = 'trait-item';
        span.innerText = t;
        if(activeTones.includes(t)) span.classList.add('active');
        span.onclick = () => span.classList.toggle('active');
        toneDiv.appendChild(span);
    });
}

function confirmStudentSelection() {
    const traits = Array.from(document.querySelectorAll('#traitsPicker .trait-item.active')).map(el => el.innerText);
    const tones = Array.from(document.querySelectorAll('#tonePicker .trait-item.active')).map(el => el.innerText);
    if(traits.length > 0) {
        studentStates[activeStudent] = { traits, tones };
        config.lastTones = tones;
    } else { delete studentStates[activeStudent]; }
    saveToLocal(); renderStudentGrid(); closeStudentModal();
}

function generatePrompts() {
    const selectedNames = Object.keys(studentStates);
    if(selectedNames.length === 0) return alert("請先設定學生的特質！");

    let traitToCatMap = {};
    if (config.includeCatName) {
        const lines = config.traitsRaw.split('\n');
        let currentCat = "";
        lines.forEach(line => {
            const trimmed = line.trim();
            if (trimmed.endsWith("類")) {
                currentCat = trimmed.replace("類", "");
            } else if (trimmed && currentCat) {
                traitToCatMap[trimmed] = currentCat;
            }
        });
    }

    let result = (config.prePrompt ? config.prePrompt + "\n\n" : "");
    selectedNames.forEach(name => {
        const data = studentStates[name];
        
        let processedTraits = data.traits.map(t => {
            if (config.includeCatName && traitToCatMap[t]) {
                return traitToCatMap[t] + t;
            }
            return t;
        }).join('、');

        let p = config.promptTemplate
            .replace(/{grade}/g, config.grade).replace(/{name}/g, name)
            .replace(/{tone}/g, data.tones.join('、'))
            .replace(/{traits}/g, processedTraits)
            .replace(/{wordCount}/g, config.wordCount);
        result += p + "\n";
    });
    
    document.getElementById('outputText').innerText = result;
    document.getElementById('output-area').style.display = 'block';
    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
}

function openSettings() { document.getElementById('settingsModal').style.display = 'flex'; }
function closeSettings() { document.getElementById('settingsModal').style.display = 'none'; }
function closeStudentModal() { document.getElementById('studentModal').style.display = 'none'; }
function resetStudentSelection() { delete studentStates[activeStudent]; saveToLocal(); renderStudentGrid(); closeStudentModal(); }
function clearAllSelections() { if(confirm("清除所有選取？")) { studentStates = {}; saveToLocal(); renderStudentGrid(); }}
function resetSystem() { if(confirm("確定完全重置？")) { localStorage.clear(); location.reload(); }}

// 視覺編輯器相關
let tempTraitsData = [];

function openVisualTraitsEditor() {
    const rawText = document.getElementById('traitsSet').value;
    tempTraitsData = parseTraitsText(rawText);
    renderVisualEditor();
    document.getElementById('visualTraitsModal').style.display = 'flex';
}

function closeVisualModal() {
    document.getElementById('visualTraitsModal').style.display = 'none';
}

function renderVisualEditor() {
    const container = document.getElementById('visualTraitEditor');
    container.innerHTML = '';

    tempTraitsData.forEach((cat, cIdx) => {
        const box = document.createElement('div');
        box.className = 'v-category-box';
        box.draggable = true;
        box.dataset.index = cIdx;
        
        const boxColor = secondaryColors[cIdx % secondaryColors.length];
        box.style.borderColor = boxColor;

        box.ondragstart = (e) => {
            box.classList.add('dragging');
            e.dataTransfer.setData('text/type', 'category');
            e.dataTransfer.setData('text/index', cIdx);
        };

        box.ondragover = (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = "move";
            box.style.background = boxColor + "22"; 
        };

        box.ondragleave = () => {
            box.style.background = "";
        };

        box.ondrop = (e) => {
            e.preventDefault();
            e.stopPropagation();
            box.style.background = "";
            
            const type = e.dataTransfer.getData('text/type');
            const fromIdx = parseInt(e.dataTransfer.getData('text/index'));

            if (type === 'category') {
                if (fromIdx !== cIdx) {
                    const movedItem = tempTraitsData.splice(fromIdx, 1)[0];
                    tempTraitsData.splice(cIdx, 0, movedItem);
                    renderVisualEditor();
                }
            } 
            else if (type === 'trait') {
                const fromCatIdx = parseInt(e.dataTransfer.getData('text/fromCat'));
                const traitIdx = parseInt(e.dataTransfer.getData('text/traitIdx'));
                
                if (fromCatIdx !== cIdx) {
                    const movedTrait = tempTraitsData[fromCatIdx].items.splice(traitIdx, 1)[0];
                    tempTraitsData[cIdx].items.push(movedTrait);
                    renderVisualEditor();
                }
            }
        };

        box.ondragend = () => box.classList.remove('dragging');

        box.innerHTML = `
            <div class="v-cat-header" style="background:${boxColor}">
                <span class="v-cat-title">${cat.category}</span>
                <span style="cursor:pointer" onclick="deleteCategory(${cIdx})">🗑️</span>
            </div>
            <div class="v-item-list"></div>
            <div class="v-add-group">
                <input type="text" placeholder="新增類別和特質" id="v-input-${cIdx}" 
                       onkeydown="if(event.key==='Enter') addTraitVisual(${cIdx})">
                <button class="btn-main btn-sm" style="background:${boxColor}" 
                        onclick="addTraitVisual(${cIdx})">+</button>
            </div>
        `;

        const itemList = box.querySelector('.v-item-list');
        cat.items.forEach((item, tIdx) => {
            const itemDiv = document.createElement('div');
            itemDiv.className = 'v-trait-item';
            itemDiv.draggable = true;
            itemDiv.innerHTML = `<span>${item}</span><span class="v-trait-del" onclick="deleteTraitVisual(${cIdx}, ${tIdx})">×</span>`;
            
            itemDiv.ondragstart = (e) => {
                e.stopPropagation(); 
                e.dataTransfer.setData('text/type', 'trait');
                e.dataTransfer.setData('text/fromCat', cIdx);
                e.dataTransfer.setData('text/traitIdx', tIdx);
            };

            itemDiv.ondragover = (e) => {
                e.preventDefault();
                e.stopPropagation();
                if (e.dataTransfer.types.includes('text/type')) {
                    itemDiv.style.borderTop = `3px solid ${boxColor}`;
                }
            };

            itemDiv.ondragleave = () => {
                itemDiv.style.borderTop = "";
            };

            itemDiv.ondrop = (e) => {
                e.preventDefault();
                e.stopPropagation();
                const type = e.dataTransfer.getData('text/type');
                
                if (type === 'category') {
                    const fromIdx = parseInt(e.dataTransfer.getData('text/index'));
                    if (fromIdx !== cIdx) {
                        const movedItem = tempTraitsData.splice(fromIdx, 1)[0];
                        tempTraitsData.splice(cIdx, 0, movedItem);
                        renderVisualEditor();
                    }
                } 
                else if (type === 'trait') {
                    const fromCatIdx = parseInt(e.dataTransfer.getData('text/fromCat'));
                    const fromTraitIdx = parseInt(e.dataTransfer.getData('text/traitIdx'));
                    const movedTrait = tempTraitsData[fromCatIdx].items.splice(fromTraitIdx, 1)[0];
                    tempTraitsData[cIdx].items.splice(tIdx, 0, movedTrait);
                    renderVisualEditor();
                }
            };
            itemList.appendChild(itemDiv);
        });
        container.appendChild(box);
    });
}

function addTraitVisual(cIdx) {
    const input = document.getElementById(`v-input-${cIdx}`);
    const val = input.value.trim();
    if (!val) return;
    
    if (val.endsWith("類")) {
        // 先儲存當前的輸入框值，因為 renderVisualEditor 會重新渲染
        const currentInputValue = input.value;
        
        // 在當前位置後新增一個類別
        tempTraitsData.splice(cIdx + 1, 0, { category: val, items: [] });
        renderVisualEditor();
        
        // 新增類別後，焦點移到新類別的輸入框
        // 需要找到新類別的索引（它應該是 cIdx + 1）
        setTimeout(() => {
            // 找到所有輸入框，然後找到對應的那個
            const allInputs = document.querySelectorAll('#visualTraitEditor input[type="text"]');
            if (cIdx + 1 < allInputs.length) {
                const newInput = allInputs[cIdx + 1];
                newInput.focus();
                newInput.value = ''; // 清空輸入框
            }
        }, 50);
    } else {
        // 儲存當前輸入框的值
        const currentInputValue = input.value;
        
        tempTraitsData[cIdx].items.push(val);
        renderVisualEditor();
        
        // 新增特質後，重新聚焦到同一個輸入框
        setTimeout(() => {
            // 找到所有輸入框，然後找到對應的那個
            const allInputs = document.querySelectorAll('#visualTraitEditor input[type="text"]');
            if (cIdx < allInputs.length) {
                const sameInput = allInputs[cIdx];
                sameInput.focus();
                sameInput.value = ''; // 清空輸入框
            }
        }, 50);
    }
}

function deleteCategory(cIdx) {
    if (confirm(`確定要刪除「${tempTraitsData[cIdx].category}」嗎？`)) {
        tempTraitsData.splice(cIdx, 1);
        renderVisualEditor();
    }
}

function deleteTraitVisual(cIdx, tIdx) {
    const traitName = tempTraitsData[cIdx].items[tIdx];
    if (confirm(`確定要刪除特質「${traitName}」嗎？`)) {
        tempTraitsData[cIdx].items.splice(tIdx, 1);
        
        // 重新渲染畫面
        renderVisualEditor(); 

        // 刪除後，自動將焦點移回該類別的輸入框
        setTimeout(() => {
            const targetInput = document.getElementById(`v-input-${cIdx}`);
            if (targetInput) {
                targetInput.focus();
            }
        }, 50); // 延遲 50ms 確保 DOM 已渲染完成
    }
}

function saveVisualTraits() {
    let output = "";
    tempTraitsData.forEach(cat => {
        output += cat.category + "\n";
        cat.items.forEach(item => { output += item + "\n"; });
    });
    document.getElementById('traitsSet').value = output.trim();
    closeVisualModal();
}

function insertTag(tag) {
    const textarea = document.getElementById('promptTemplateSet');
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    textarea.value = text.substring(0, start) + tag + text.substring(end);
    textarea.focus();
    textarea.selectionStart = textarea.selectionEnd = start + tag.length;
}
