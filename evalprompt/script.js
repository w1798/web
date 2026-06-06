/**
 * EvalPrompt - UI Layer
 * Handles DOM manipulation, event listeners, and user interactions.
 */

var activeStudent;

function applyFontSize(traitSize, studentSize) {
    document.documentElement.style.setProperty('--trait-font-scale', traitSize + 'rem');
    document.documentElement.style.setProperty('--student-font-scale', studentSize + 'rem');
    config.fontSize = traitSize;
    config.studentFontSize = studentSize;
}

function applyTheme(idx) {
    const t = themes[idx];
    document.documentElement.style.setProperty('--primary-bg', t.bg);
    document.documentElement.style.setProperty('--accent-color', t.accent);
    document.documentElement.style.setProperty('--text-color', t.text || '#1e293b');
    config.themeIdx = idx;

    // 隨機選取 18 種輔助色（基礎配色）
    const otherColors = themes.filter((_, i) => i != idx).map(item => item.accent);
    secondaryColors = otherColors.sort(() => 0.5 - Math.random()).slice(0, 18);
}

function loadConfigToUI() {
    document.getElementById('gradeSet').value = config.grade;
    document.getElementById('wordCountSet').value = config.wordCount;
    document.getElementById('studentListSet').value = config.students;
    document.getElementById('traitsSet').value = config.traitsRaw;
    document.getElementById('tonesSet').value = config.tones;
    document.getElementById('prePromptSet').value = config.prePrompt;
    document.getElementById('promptTemplateSet').value = config.promptTemplate;
    document.getElementById('themeSelect').value = config.themeIdx;
    document.getElementById('gridCountSet').value = config.gridCount;
    document.getElementById('traitColSet').value = config.traitCols || 4;
    document.getElementById('fontSizeSet').value = config.fontSize || "1.4";
    document.getElementById('studentFontSizeSet').value = config.studentFontSize || "1.4";
    document.getElementById('includeCatNameSet').checked = config.includeCatName || false;
}

function renderStudentGrid() {
    const container = document.getElementById('studentContainer');
    container.innerHTML = '';
    container.style.gridTemplateColumns = `repeat(${config.gridCount}, 1fr)`;
    const names = config.students.split('\n').filter(n => n.trim() !== "");
    
    names.forEach((name) => {
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
    const out = generatePromptsOutput();
    if (out.error) return alert(out.error);

    document.getElementById('outputText').innerText = out.text;
    document.getElementById('output-area').style.display = 'block';
    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
}

function openSettings() { 
    window._configBackup = JSON.stringify(config); 
    loadConfigToUI();
    document.getElementById('settingsModal').style.display = 'flex'; 
}

function closeSettings() {
    if (window._configBackup) {
        config = syncConfig(JSON.parse(window._configBackup));
        loadConfigToUI();
    }
    document.getElementById('settingsModal').style.display = 'none';
    window._configBackup = null;
}

function saveSettings() {
    config.grade = document.getElementById('gradeSet').value;
    config.wordCount = document.getElementById('wordCountSet').value;
    config.students = document.getElementById('studentListSet').value;
    config.traitsRaw = document.getElementById('traitsSet').value;
    config.tones = document.getElementById('tonesSet').value;
    config.prePrompt = document.getElementById('prePromptSet').value;
    config.promptTemplate = document.getElementById('promptTemplateSet').value;
    config.gridCount = parseInt(document.getElementById('gridCountSet').value);
    config.traitCols = parseInt(document.getElementById('traitColSet').value);
    config.themeIdx = parseInt(document.getElementById('themeSelect').value);
    config.fontSize = document.getElementById('fontSizeSet').value;
    config.studentFontSize = document.getElementById('studentFontSizeSet').value;
    config.includeCatName = document.getElementById('includeCatNameSet').checked;
    
    applyTheme(config.themeIdx);
    applyFontSize(config.fontSize, config.studentFontSize);
    saveToLocal(); 
    renderStudentGrid(); 
    window._configBackup = null; 
    document.getElementById('settingsModal').style.display = 'none';
}

// 視覺編輯器相關
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

        box.ondragover = (e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; box.style.background = boxColor + "22"; };
        box.ondragleave = () => { box.style.background = ""; };
        box.ondrop = (e) => {
            e.preventDefault(); e.stopPropagation(); box.style.background = "";
            const type = e.dataTransfer.getData('text/type');
            const fromIdx = parseInt(e.dataTransfer.getData('text/index'));
            if (type === 'category' && fromIdx !== cIdx) {
                const movedItem = tempTraitsData.splice(fromIdx, 1)[0];
                tempTraitsData.splice(cIdx, 0, movedItem);
                renderVisualEditor();
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
                <span class="v-cat-title" onclick="editCategory(${cIdx})" title="點擊修改內容">${cat.category}</span>
                <span style="cursor:pointer" onclick="deleteCategory(${cIdx})">🗑️</span>
            </div>
            <div class="v-item-list"></div>
            <div class="v-add-group">
                <input type="text" placeholder="新增特質或類別" id="v-input-${cIdx}" 
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
            itemDiv.innerHTML = `<span onclick="editTrait(${cIdx}, ${tIdx})" title="點擊修改內容">${item}</span><span class="v-trait-del" onclick="deleteTraitVisual(${cIdx}, ${tIdx})">×</span>`;
            
            itemDiv.ondragstart = (e) => {
                e.stopPropagation(); 
                e.dataTransfer.setData('text/type', 'trait');
                e.dataTransfer.setData('text/fromCat', cIdx);
                e.dataTransfer.setData('text/traitIdx', tIdx);
            };

            itemDiv.ondragover = (e) => {
                e.preventDefault(); e.stopPropagation();
                if (e.dataTransfer.types.includes('text/type')) itemDiv.style.borderTop = `3px solid ${boxColor}`;
            };
            itemDiv.ondragleave = () => { itemDiv.style.borderTop = ""; };
            itemDiv.ondrop = (e) => {
                e.preventDefault(); e.stopPropagation();
                const type = e.dataTransfer.getData('text/type');
                if (type === 'trait') {
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

function editCategory(idx) {
    const old = tempTraitsData[idx].category;
    const val = prompt("修改類別名稱 (請以「類」字結尾)：", old);
    if (updateCategoryName(idx, val)) renderVisualEditor();
}

function editTrait(cIdx, tIdx) {
    const old = tempTraitsData[cIdx].items[tIdx];
    const val = prompt("修改特質內容：", old);
    if (updateTraitName(cIdx, tIdx, val)) renderVisualEditor();
}

function addTraitVisual(cIdx) {
    const input = document.getElementById(`v-input-${cIdx}`);
    const res = addTraitLogic(cIdx, input.value.trim());
    if (res) {
        renderVisualEditor();
        setTimeout(() => {
            const nextIdx = res.type === 'category' ? res.index : cIdx;
            const target = document.getElementById(`v-input-${nextIdx}`);
            if (target) { target.focus(); target.value = ''; }
        }, 50);
    }
}

function deleteCategory(cIdx) {
    if (confirm(`確定要刪除「${tempTraitsData[cIdx].category}」嗎？`)) {
        deleteCategoryLogic(cIdx);
        renderVisualEditor();
    }
}

function deleteTraitVisual(cIdx, tIdx) {
    if (confirm(`確定要刪除特質「${tempTraitsData[cIdx].items[tIdx]}」嗎？`)) {
        deleteTraitLogic(cIdx, tIdx);
        renderVisualEditor();
        setTimeout(() => { document.getElementById(`v-input-${cIdx}`).focus(); }, 50);
    }
}

function saveVisualTraits() {
    document.getElementById('traitsSet').value = getFinalTraitsText();
    closeVisualModal();
}

function resetField(id) {
    if(!confirm("確定要將此項重置為預設值嗎？")) return;
    document.getElementById(id).value = defaultConfig[id === 'traitsSet' ? 'traitsRaw' : id.replace('Set', '')];
}

function resetSystem() {
    if (confirm("確定完全重置系統資料？")) {
        localStorage.removeItem('eval_v6_config');
        localStorage.removeItem('eval_v6_states');
        location.reload();
    }
}

function copyOutput() { 
    navigator.clipboard.writeText(document.getElementById('outputText').innerText); 
    alert("已複製"); 
}

function exportData() {
    const data = JSON.stringify({ config, studentStates });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([data], { type: 'application/json' }));
    a.download = `EvalPrompt_${new Date().toISOString().slice(0,10)}.json`;
    a.click();
}

function importData(e) {
    const reader = new FileReader();
    reader.onload = (ev) => {
        try {
            const imported = JSON.parse(ev.target.result);
            config = syncConfig(imported.config); 
            studentStates = imported.studentStates || {};
            saveToLocal(); 
            alert("資料匯入成功");
            location.reload();
        } catch (err) { alert("匯入失敗：檔案格式不正確"); }
    };
    reader.readAsText(e.target.files[0]);
}

function insertTag(tag) {
    const textarea = document.getElementById('promptTemplateSet');
    const start = textarea.selectionStart, end = textarea.selectionEnd;
    textarea.value = textarea.value.substring(0, start) + tag + textarea.value.substring(end);
    textarea.focus();
    textarea.selectionStart = textarea.selectionEnd = start + tag.length;
}

function scrollToTop() { window.scrollTo({ top: 0, behavior: 'smooth' }); }
function closeStudentModal() { document.getElementById('studentModal').style.display = 'none'; }
function resetStudentSelection() { delete studentStates[activeStudent]; saveToLocal(); renderStudentGrid(); closeStudentModal(); }
function clearAllSelections() { if(confirm("清除所有選取？")) { studentStates = {}; saveToLocal(); renderStudentGrid(); }}

function init() {
    const localData = JSON.parse(localStorage.getItem('eval_v6_config'));
    config = syncConfig(localData);
    studentStates = JSON.parse(localStorage.getItem('eval_v6_states')) || {};
    
    const gSelect = document.getElementById('gradeSet');
    for(let i=1; i<=12; i++) gSelect.add(new Option(i + '年級', i));
    const wSelect = document.getElementById('wordCountSet');
    [50, 100, 150, 200, 250, 300].forEach(v => wSelect.add(new Option(v + '字', v)));
    themes.forEach((t, i) => document.getElementById('themeSelect').add(new Option(t.name, i)));
    for(let i=3; i<=10; i++) document.getElementById('gridCountSet').add(new Option(i + '位', i));
    for(let i=1; i<=6; i++) document.getElementById('traitColSet').add(new Option(i + '組', i));

    [0.8, 1.0, 1.2, 1.4, 1.6, 1.8, 2.0, 2.2, 2.4, 2.6, 2.8, 3.0].forEach(v => {
        document.getElementById('fontSizeSet').add(new Option(v + 'x', String(v.toFixed(1))));
        document.getElementById('studentFontSizeSet').add(new Option(v + 'x', String(v.toFixed(1))));
    });

    loadConfigToUI();
    applyTheme(config.themeIdx);
    applyFontSize(config.fontSize || "1.4", config.studentFontSize || "1.4");
    renderStudentGrid();
    
    window.onscroll = function() {
        const btn = document.getElementById("backToTop");
        btn.style.display = (document.body.scrollTop > 300 || document.documentElement.scrollTop > 300) ? "block" : "none";
    };
}

init();
