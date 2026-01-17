const themes = [
    { name: "沉靜藍", bg: "#eff6ff", accent: "#1d4ed8" },
    { name: "焙茶棕", bg: "#fffaf3", accent: "#92400e" },
    { name: "雲朵白藍", bg: "#f8fafc", accent: "#64748b" },
    { name: "抹茶青草", bg: "#f7fee7", accent: "#65a30d" },
    { name: "莫蘭迪紫", bg: "#f8fafc", accent: "#818cf8" },
    { name: "鼠尾草綠", bg: "#f0fdf4", accent: "#16a34a" },
    { name: "灰湖綠", bg: "#f0f9ff", accent: "#0891b2" },
    { name: "丁香灰", bg: "#faf5ff", accent: "#a855f7" },
    { name: "霧霾藍", bg: "#f1f5f9", accent: "#475569" },
    { name: "燕麥奶", bg: "#fafaf9", accent: "#a8a29e" },
    { name: "暖陽杏", bg: "#fffbeb", accent: "#d97706" },
    { name: "煙燻玫瑰", bg: "#fff1f2", accent: "#be123c" },
    { name: "亞麻灰", bg: "#f9fafb", accent: "#6b7280" },
    { name: "珊瑚砂", bg: "#fff7ed", accent: "#ea580c" },
    { name: "森林深處", bg: "#f0fdf4", accent: "#166534" },
    { name: "冰川灰", bg: "#f1f5f9", accent: "#1e293b" },
    { name: "炭灰藍", bg: "#f8fafc", accent: "#334155" },
    { name: "橄欖綠", bg: "#f7fee7", accent: "#4d7c0f" },
    { name: "紫蘇灰", bg: "#fdf4ff", accent: "#701a75" },
    { name: "晨曦灰", bg: "#f9fafb", accent: "#111827" }
]

const defaultConfig = {
    grade: "1", 
    wordCount: "100", 
    students: "姓名1\n姓名2\n姓名3\n姓名4\n姓名5\n姓名6\n姓名7\n姓名8\n姓名9\n姓名10\n姓名11\n姓名12\n姓名13\n姓名14\n姓名15\n姓名16\n姓名17\n姓名18\n姓名19\n姓名20\n姓名21\n姓名22\n姓名23\n姓名24\n姓名25\n姓名26\n姓名27\n姓名28\n姓名29\n姓名30",
    traitsRaw: "班級幹部類\n班長\n副班長\n風紀\n學藝\n衛生長\n國語小老師\n數學小老師\n生活常規類\n自理有序\n作息穩定\n生活自律\n整潔到位\n守時守序\n習慣未定\n偶有鬆散\n作息不穩\n自理待練\n需再提醒\n作業態度類\n準時繳交\n用心書寫\n作業確實\n態度認真\n品質穩定\n偶有拖延\n書寫潦草\n完成不足\n需人督促\n細節待強\n學習態度類\n主動求知\n學習投入\n態度積極\n樂於嘗試\n專注認真\n被動學習\n專注不穩\n投入不足\n動機待強\n易受分心\n課堂表現類\n積極參與\n專心聆聽\n回應得宜\n表現穩定\n勇於發言\n參與不足\n發言保守\n注意力弱\n互動被動\n需多投入\n行為表現類\n守規有禮\n行止得體\n態度端正\n表現穩重\n自我約束\n偶有違規\n行為衝動\n情緒外顯\n規範待強\n需再提醒\n責任感類\n勇於承擔\n負責盡職\n使命必達\n值得信賴\n交辦到位\n責任感弱\n容易推託\n任務延宕\n依賴提醒\n自覺不足\n合作互動類\n合作順暢\n樂於配合\n溝通良好\n互動自然\n團隊意識\n配合不足\n互動保守\n溝通待強\n合作被動\n團隊意識弱\n友誼人際類\n友善體貼\n相處融洽\n關懷同學\n待人和善\n人緣良好\n表達直接\n易生誤會\n互動衝突\n情緒影響\n需學體諒\n情緒管理類\n情緒穩定\n冷靜應對\n能自調節\n表現理性\n情緒成熟\n情緒起伏\n外顯明顯\n易受影響\n調適不足\n需人安撫\n自我管理類\n自我要求\n行事自律\n目標明確\n安排得宜\n自我掌控\n自控不足\n依賴提醒\n計畫鬆散\n目標不清\n執行待強",
    tones: "正向\n溫暖\n鼓勵\n關懷\n期許\n肯定\n真誠\n包容\n感性\n讚賞\n活潑\n俏皮\n親切",
    prePrompt: "我是一名專業的導師，",
    promptTemplate: "請給{grade}年級的{name}寫一段期末的話。希望從學生的特質{traits}出發，用{tone}的語氣來描述，內容長度約{wordCount}字。",
    fontSize: "1.4",
    studentFontSize: "1.4",
    includeCatName: false,
    themeIdx: 0, gridCount: 7, traitCols: 4, lastTones: []
};

let config = JSON.parse(localStorage.getItem('eval_v6_config')) || { ...defaultConfig };
let studentStates = JSON.parse(localStorage.getItem('eval_v6_states')) || {}; 
let activeStudent = null;
let secondaryColors = []; // 儲存當前主題隨機抽取的5種輔助色

function init() {
    const gSelect = document.getElementById('gradeSet');
    for(let i=1; i<=12; i++) gSelect.add(new Option(i + '年級', i));
    const wSelect = document.getElementById('wordCountSet');
    [50, 100, 150, 200, 250, 300].forEach(v => wSelect.add(new Option(v + '字', v)));
    const tSelect = document.getElementById('themeSelect');
    themes.forEach((t, i) => tSelect.add(new Option(t.name, i)));
    const gcSelect = document.getElementById('gridCountSet');
    for(let i=3; i<=10; i++) gcSelect.add(new Option(i + '位', i));
    const tcSelect = document.getElementById('traitColSet');
    for(let i=1; i<=6; i++) tcSelect.add(new Option(i + '組', i));

    const fsSelect = document.getElementById('fontSizeSet');
    fsSelect.innerHTML = '';
    [0.8, 1.0, 1.2, 1.4, 1.6, 1.8, 2.0, 2.2, 2.4, 2.6, 2.8, 3.0].forEach(v => {
        const opt = new Option(v + 'x', String(v.toFixed(1))); 
        fsSelect.add(opt);
    });

    const sfsSelect = document.getElementById('studentFontSizeSet');
    [0.8, 1.0, 1.2, 1.4, 1.6, 1.8, 2.0, 2.2, 2.4, 2.6, 2.8, 3.0].forEach(v => {
        sfsSelect.add(new Option(v + 'x', String(v.toFixed(1))));
    });

    loadConfigToUI();
    applyTheme(config.themeIdx);
    applyFontSize(config.fontSize || "1.4", config.studentFontSize || "1.2");
    renderStudentGrid();
}

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

    // 隨機選取 5 種輔助色（排除當前主題色）
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
    document.getElementById('traitColSet').value = config.traitCols || 5;
    document.getElementById('fontSizeSet').value = config.fontSize || "1.4";
    document.getElementById('studentFontSizeSet').value = config.studentFontSize || "1.2";
    document.getElementById('includeCatNameSet').checked = config.includeCatName || false;

}

function saveSettings() {
    config.grade = document.getElementById('gradeSet').value;
    config.wordCount = document.getElementById('wordCountSet').value;
    config.students = document.getElementById('studentListSet').value;
    config.traitsRaw = document.getElementById('traitsSet').value;
    config.tones = document.getElementById('tonesSet').value;
    config.prePrompt = document.getElementById('prePromptSet').value;
    config.promptTemplate = document.getElementById('promptTemplateSet').value;
    config.gridCount = document.getElementById('gridCountSet').value;
    config.traitCols = document.getElementById('traitColSet').value;
    config.fontSize = document.getElementById('fontSizeSet').value;
    config.studentFontSize = document.getElementById('studentFontSizeSet').value;
    config.themeIdx = document.getElementById('themeSelect').value;
    config.includeCatName = document.getElementById('includeCatNameSet').checked;
    
    applyTheme(config.themeIdx);
    applyFontSize(config.fontSize, config.studentFontSize);
    saveToLocal(); renderStudentGrid(); closeSettings();
}

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
        
        // 如果未選取，給予隨機輔助色邊框增加活潑感
        if(!isSelected) {
            const randomColor = secondaryColors[index % secondaryColors.length];
//            div.style.borderColor = randomColor + "44"; // 亂數半透明邊框	
              div.style.borderColor = "color-mix(in srgb, var(--accent-color), transparent 70%)"; // 風格淡色
//           div.style.color = randomColor; // 亂數色
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
            // 標題使用隨機輔助色
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

    // 預先解析類別與特質的對照表 (Map: 特質名稱 -> 類別名稱)
    let traitToCatMap = {};
    if (config.includeCatName) {
        const lines = config.traitsRaw.split('\n');
        let currentCat = "";
        lines.forEach(line => {
            const trimmed = line.trim();
            if (trimmed.endsWith("類")) {
                currentCat = trimmed.replace("類", ""); // 去除"類"字
            } else if (trimmed && currentCat) {
                traitToCatMap[trimmed] = currentCat;
            }
        });
    }

    let result = (config.prePrompt ? config.prePrompt + "\n\n" : "");
    selectedNames.forEach(name => {
        const data = studentStates[name];
        
        // 處理特質文字
        let processedTraits = data.traits.map(t => {
            if (config.includeCatName && traitToCatMap[t]) {
                return traitToCatMap[t] + t; // 例如：生活常規 + 自理有序
            }
            return t;
        }).join('、');

        let p = config.promptTemplate
            .replace(/{grade}/g, config.grade).replace(/{name}/g, name)
            .replace(/{tone}/g, data.tones.join('、'))
            .replace(/{traits}/g, processedTraits) // 使用處理過的特質
            .replace(/{wordCount}/g, config.wordCount);
        result += p + "\n";
    });
    
    document.getElementById('outputText').innerText = result;
    document.getElementById('output-area').style.display = 'block';
    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
}

function saveToLocal() {
    localStorage.setItem('eval_v6_config', JSON.stringify(config));
    localStorage.setItem('eval_v6_states', JSON.stringify(studentStates));
}

function resetField(id) {
    if(!confirm("確定要將此項重置為預設值嗎？")) return;
    if(id === 'traitsSet') document.getElementById(id).value = defaultConfig.traitsRaw;
    if(id === 'promptTemplateSet') document.getElementById(id).value = defaultConfig.promptTemplate;
    if(id === 'studentListSet') document.getElementById(id).value = defaultConfig.students;
    if(id === 'tonesSet') document.getElementById(id).value = defaultConfig.tones;
    if(id === 'prePromptSet') document.getElementById(id).value = defaultConfig.prePrompt;
}

function openSettings() { document.getElementById('settingsModal').style.display = 'flex'; }
function closeSettings() { document.getElementById('settingsModal').style.display = 'none'; }
function closeStudentModal() { document.getElementById('studentModal').style.display = 'none'; }
function resetStudentSelection() { delete studentStates[activeStudent]; saveToLocal(); renderStudentGrid(); closeStudentModal(); }
function clearAllSelections() { if(confirm("清除所有選取？")) { studentStates = {}; saveToLocal(); renderStudentGrid(); }}
function resetSystem() { if(confirm("確定完全重置？")) { localStorage.clear(); location.reload(); }}
function copyOutput() { navigator.clipboard.writeText(document.getElementById('outputText').innerText); alert("已複製"); }
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
        const imported = JSON.parse(ev.target.result);
        config = imported.config; studentStates = imported.studentStates;
        saveToLocal(); location.reload();
    };
    reader.readAsText(e.target.files[0]);
}

window.onscroll = function() {
    const btn = document.getElementById("backToTop");
    if (document.body.scrollTop > 300 || document.documentElement.scrollTop > 300) {
        btn.style.display = "block";
    } else {
        btn.style.display = "none";
    }
};

function scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// --- 視覺編輯器 ---
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

function parseTraitsText(text) {
    const lines = text.split('\n').map(l => l.trim()).filter(l => l);
    const data = [];
    let currentCat = null;
    lines.forEach(line => {
        if (line.endsWith("類")) {
            currentCat = { category: line, items: [] };
            data.push(currentCat);
        } else if (currentCat) {
            currentCat.items.push(line);
        }
    });
    return data;
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

        // --- 類別方塊拖曳開始 ---
        box.ondragstart = (e) => {
            box.classList.add('dragging');
            e.dataTransfer.setData('text/type', 'category');
            e.dataTransfer.setData('text/index', cIdx);
        };

        box.ondragover = (e) => {
            e.preventDefault();
            // 強制設定放下的效果
            e.dataTransfer.dropEffect = "move";
            box.style.background = boxColor + "22"; 
        };

        box.ondragleave = () => {
            box.style.background = "";
        };

        box.ondrop = (e) => {
            e.preventDefault();
            e.stopPropagation(); // 阻止事件傳給底層
            box.style.background = "";
            
            const type = e.dataTransfer.getData('text/type');
            const fromIdx = parseInt(e.dataTransfer.getData('text/index'));

            // 優先處理類別交換：如果拖過來的是「類別」，不論丟在 Box 的哪裡都執行交換
            if (type === 'category') {
                if (fromIdx !== cIdx) {
                    const movedItem = tempTraitsData.splice(fromIdx, 1)[0];
                    tempTraitsData.splice(cIdx, 0, movedItem);
                    renderVisualEditor();
                }
            } 
            // 如果拖過來的是「特質」，則是移動特質到此類別的末尾
            else if (type === 'trait') {
                const fromCatIdx = parseInt(e.dataTransfer.getData('text/fromCat'));
                const traitIdx = parseInt(e.dataTransfer.getData('text/traitIdx'));
                
                // 避免在同一個類別內重複移動到末尾
                if (fromCatIdx !== cIdx) {
                    const movedTrait = tempTraitsData[fromCatIdx].items.splice(traitIdx, 1)[0];
                    tempTraitsData[cIdx].items.push(movedTrait);
                    renderVisualEditor();
                }
            }
        };

        box.ondragend = () => box.classList.remove('dragging');

        // 渲染結構
        box.innerHTML = `
            <div class="v-cat-header" style="background:${boxColor}">
                <span class="v-cat-title">${cat.category}</span>
                <span style="cursor:pointer" onclick="deleteCategory(${cIdx})">🗑️</span>
            </div>
            <div class="v-item-list"></div>
            <div class="v-add-group">
                <input type="text" placeholder="新增類別和特質" id="v-input-${cIdx}" onkeydown="if(event.key==='Enter') addTraitVisual(${cIdx})">
                <button class="btn-main btn-sm" style="background:${boxColor}" onclick="addTraitVisual(${cIdx})">+</button>
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

            // 修正特質間的排序觸發
            itemDiv.ondragover = (e) => {
                e.preventDefault();
                e.stopPropagation();
                // 只有當拖曳物也是「特質」時，才顯示排序條
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
                
                // 如果在特質上放下的是「類別」，依然執行類別交換邏輯
                if (type === 'category') {
                    const fromIdx = parseInt(e.dataTransfer.getData('text/index'));
                    if (fromIdx !== cIdx) {
                        const movedItem = tempTraitsData.splice(fromIdx, 1)[0];
                        tempTraitsData.splice(cIdx, 0, movedItem);
                        renderVisualEditor();
                    }
                } 
                // 如果是特質，執行特質排序
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
        tempTraitsData.splice(cIdx + 1, 0, { category: val, items: [] });
    } else {
        tempTraitsData[cIdx].items.push(val);
    }
    renderVisualEditor();
}

function deleteCategory(cIdx) {
    if (confirm(`確定要刪除「${tempTraitsData[cIdx].category}」嗎？`)) {
        tempTraitsData.splice(cIdx, 1);
        renderVisualEditor();
    }
}

function deleteTraitVisual(cIdx, tIdx) {
    tempTraitsData[cIdx].items.splice(tIdx, 1);
    renderVisualEditor();
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

init();
