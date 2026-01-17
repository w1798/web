const themes = [
    { name: "柔和藍", bg: "#f0f4f8", accent: "#3b82f6" },
    { name: "森林綠", bg: "#f1f8f1", accent: "#22c55e" },
    { name: "夕陽橘", bg: "#fff7ed", accent: "#f97316" },
    { name: "薰衣草紫", bg: "#f5f3ff", accent: "#8b5cf6" },
    { name: "玫瑰粉", bg: "#fff1f2", accent: "#f43f5e" },
    { name: "午夜藍", bg: "#1e293b", accent: "#38bdf8", text: "#383afc" },
    { name: "薄荷涼", bg: "#ecfdf5", accent: "#10b981" },
    { name: "檸檬黃", bg: "#fefce8", accent: "#eab308" },
    { name: "大地色", bg: "#fafaf9", accent: "#78716c" },
    { name: "櫻草紅", bg: "#fef2f2", accent: "#dc2626" },
    { name: "深海綠", bg: "#f0fdfa", accent: "#0d9488" },
    { name: "葡萄紫", bg: "#faf5ff", accent: "#9333ea" },
    { name: "灰金屬", bg: "#f8fafc", accent: "#475569" },
    { name: "櫻花粉", bg: "#fdf2f8", accent: "#db2777" },
    { name: "高雅灰", bg: "#f3f4f6", accent: "#374151" }
];

const defaultConfig = {
    grade: "1", 
    wordCount: "100", 
    students: "姓名1\n姓名2\n姓名3\n姓名4\n姓名5\n姓名6\n姓名7\n姓名8\n姓名9\n姓名10\n姓名11\n姓名12\n姓名13\n姓名14\n姓名15\n姓名16\n姓名17\n姓名18\n姓名19\n姓名20\n姓名21\n姓名22\n姓名23\n姓名24\n姓名25\n姓名26\n姓名27\n姓名28\n姓名29\n姓名30",
    traitsRaw: "班級幹部類\n班長\n副班長\n風紀\n學藝\n衛生長\n國語小老師\n數學小老師\n品學兼優類\n才德兼備\n勤學篤行\n嚴於律己\n尊師重道\n慎思明辨\n知行合一\n進退有度\n謙遜自持\n恪守本分\n潛力待發類\n深藏不露\n大器晚成\n韜光養晦\n靜觀其變\n厚積薄發\n蓄勢待發\n後發先至\n不鳴則已\n沉潛剛克\n活躍社交類\n左右逢源\n樂群敬業\n談吐不凡\n妙語如珠\n熱情洋溢\n應對得體\n廣結善緣\n幽默風趣\n靈活變通\n創意無限類\n別出心裁\n獨具匠心\n標新立異\n天馬行空\n奇思妙想\n不拘一格\n推陳出新\n自出機杼\n匠心獨運\n穩扎穩打類\n腳踏實地\n按部就班\n循序漸進\n一絲不苟\n兢兢業業\n穩健踏實\n步步為營\n實事求是\n專心致志\n領導魅力類\n遠見卓識\n知人善任\n決策果斷\n統籌全局\n以身作則\n公正無私\n膽識過人\n運籌帷幄\n高瞻遠矚\n藝術表達類\n才華橫溢\n情感豐沛\n觀察入微\n風格獨特\n表現力強\n審美獨到\n敏感細膩\n意境深遠\n妙筆生花\n邏輯分析類\n條理清晰\n推理嚴密\n分析透徹\n思維縝密\n客觀冷靜\n洞見癥結\n辯才無礙\n明察秋毫\n抽絲剝繭\n運動健將類\n體魄強健\n身手敏捷\n協調自如\n爆發力強\n意志堅定\n團隊合作\n反應迅速\n耐力過人\n追求卓越\n同理心強類\n將心比心\n善解人意\n體貼入微\n關懷備至\n寬厚仁慈\n樂於助人\n雪中送炭\n感同身受\n設身處地\n獨立自主類\n自立自強\n自給自足\n獨當一面\n特立獨行\n自我驅動\n目標明確\n自學成才\n冷靜沉著\n獨立思考\n團隊協作類\n同心協力\n分工合作\n配合無間\n群策群力\n和衷共濟\n攜手並進\n齊心合力\n眾志成城\n相輔相成\n好奇探索類\n追根究底\n求知若渴\n學而不厭\n勇於嘗試\n開拓進取\n挑戰未知\n舉一反三\n好學不倦\n格物致知\n務實執行類\n實事求是\n腳踏實地\n言行一致\n雷厲風行\n立竿見影\n注重實效\n勤勉懇切\n埋頭苦幹\n使命必達\n多才多藝類\n文武雙全\n才藝兼備\n博學多才\n多才多藝\n能文能武\n動靜皆宜\n融會貫通\n學以致用\n全知全能",

    tones: "正向\n溫暖\n鼓勵\n關懷\n期許\n肯定\n真誠\n包容\n感性\n讚賞\n活潑\n俏皮\n親切",
    prePrompt: "我是一名專業的導師，",
    promptTemplate: "請給{grade}年級的{name}寫一段期末的話。希望從學生的特質{traits}出發，用{tone}的語氣來描述，內容長度約{wordCount}字。",
    fontSize: "1.4",
    themeIdx: 0, gridCount: 7, traitCols: 4, lastTones: []
};

let config = JSON.parse(localStorage.getItem('eval_v6_config')) || { ...defaultConfig };
let studentStates = JSON.parse(localStorage.getItem('eval_v6_states')) || {}; 
let activeStudent = null;

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
    fsSelect.innerHTML = ''; // 清空
    [0.8, 1.0, 1.2, 1.4, 1.6, 1.8, 2.0, 2.2, 2.4, 2.6, 2.8, 3.0].forEach(v => {
        // 使用 String(v) 確保值對應正確
        const opt = new Option(v + 'x', String(v.toFixed(1))); 
        fsSelect.add(opt);
    });

    loadConfigToUI();


    applyFontSize(config.fontSize || "1.0");
    applyTheme(config.themeIdx);
    renderStudentGrid();
}

// 套用字體的函式
function applyFontSize(size) {
    // 透過 CSS 變數控制
    document.documentElement.style.setProperty('--trait-font-scale', size + 'rem');
    config.fontSize = size;
}

function applyTheme(idx) {
    const t = themes[idx];
    document.documentElement.style.setProperty('--primary-bg', t.bg);
    document.documentElement.style.setProperty('--accent-color', t.accent);
    document.documentElement.style.setProperty('--text-color', t.text || '#1e293b');
    config.themeIdx = idx;
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
    document.getElementById('fontSizeSet').value = config.fontSize || "1.0";

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
    saveToLocal(); renderStudentGrid(); closeSettings();
    config.fontSize = document.getElementById('fontSizeSet').value;
    applyFontSize(config.fontSize); // 立即套用
    saveToLocal(); renderStudentGrid(); closeSettings();
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

// 在 openStudentModal 函式內尋找並替換此段落
lines.forEach(line => {
    const trimmed = line.trim();
    if (!trimmed) return; // 跳過空行

    // 規則 1：判別最後一個字為「類」的當作類別開頭
    if (trimmed.endsWith("類")) {
        currentGroup = document.createElement('div');
        currentGroup.className = 'trait-box';
        currentGroup.innerHTML = `<div class="trait-title">${trimmed}</div>`;
        picker.appendChild(currentGroup);
    } 
    // 規則 2：其他的內容不論字數，皆視為該類別下的特質
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
    let result = (config.prePrompt ? config.prePrompt + "\n\n" : "");
    selectedNames.forEach(name => {
        const data = studentStates[name];
        let p = config.promptTemplate
            .replace(/{grade}/g, config.grade).replace(/{name}/g, name)
            .replace(/{tone}/g, data.tones.join('、')).replace(/{traits}/g, data.traits.join('、'))
            .replace(/{wordCount}/g, config.wordCount);
        result += p + "\n";
    });
    document.getElementById('outputText').innerText = result;
    document.getElementById('output-area').style.display = 'block';
    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
}

function renderStudentGrid() {
    const container = document.getElementById('studentContainer');
    container.innerHTML = '';
    container.style.gridTemplateColumns = `repeat(${config.gridCount}, 1fr)`;
    const names = config.students.split('\n').filter(n => n.trim() !== "");
    names.forEach(name => {
        const div = document.createElement('div');
        div.className = 'student-card' + (studentStates[name] ? ' selected' : '');
        div.innerText = name;
        div.onclick = () => openStudentModal(name);
        container.appendChild(div);
    });
}

function saveToLocal() {
    localStorage.setItem('eval_v6_config', JSON.stringify(config));
    localStorage.setItem('eval_v6_states', JSON.stringify(studentStates));
}

function resetField(id) {
    if(!confirm("重置此項？")) return;
    if(id === 'traitsSet') document.getElementById(id).value = defaultConfig.traitsRaw;
    if(id === 'promptTemplateSet') document.getElementById(id).value = defaultConfig.promptTemplate;
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

// 監聽滾動事件，超過 300px 才顯示按鈕
window.onscroll = function() {
    const btn = document.getElementById("backToTop");
    if (document.body.scrollTop > 300 || document.documentElement.scrollTop > 300) {
        btn.style.display = "block";
    } else {
        btn.style.display = "none";
    }
};

// 回到頂端函式
function scrollToTop() {
    window.scrollTo({
        top: 0,
        behavior: 'smooth' // 平滑滾動
    });
}

// --- 視覺編輯器全域暫存資料 ---
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

        // --- 類別拖曳邏輯 ---
        box.ondragstart = (e) => {
            e.stopPropagation();
            box.classList.add('dragging');
            e.dataTransfer.setData('text/type', 'category');
            e.dataTransfer.setData('text/index', cIdx);
        };
        box.ondragover = (e) => e.preventDefault();
        box.ondrop = (e) => {
            e.preventDefault();
            const type = e.dataTransfer.getData('text/type');
            const fromIdx = parseInt(e.dataTransfer.getData('text/index'));
            
            if (type === 'category' && fromIdx !== cIdx) {
                const movedItem = tempTraitsData.splice(fromIdx, 1)[0];
                tempTraitsData.splice(cIdx, 0, movedItem);
                renderVisualEditor();
            } else if (type === 'trait') {
                const fromCatIdx = parseInt(e.dataTransfer.getData('text/fromCat'));
                const traitIdx = parseInt(e.dataTransfer.getData('text/traitIdx'));
                const movedTrait = tempTraitsData[fromCatIdx].items.splice(traitIdx, 1)[0];
                tempTraitsData[cIdx].items.push(movedTrait);
                renderVisualEditor();
            }
        };
        box.ondragend = () => box.classList.remove('dragging');

        // --- 介面渲染 ---
        box.innerHTML = `
            <div class="v-cat-header">
                <span class="v-cat-title">${cat.category}</span>
                <span style="cursor:pointer" onclick="deleteCategory(${cIdx})">🗑️</span>
            </div>
            <div class="v-item-list"></div>
            <div class="v-add-group">
                <input type="text" 
                       placeholder="新增特質或類別" 
                       id="v-input-${cIdx}"
                       onkeydown="if(event.key==='Enter') addTraitVisual(${cIdx})">
                <button class="btn-main btn-sm" style="padding:2px 10px" onclick="addTraitVisual(${cIdx})">+</button>
            </div>
        `;

        const itemList = box.querySelector('.v-item-list');
// 在 renderVisualEditor 函式內
cat.items.forEach((item, tIdx) => {
    const itemDiv = document.createElement('div');
    itemDiv.className = 'v-trait-item';
    itemDiv.draggable = true;
    itemDiv.innerHTML = `<span>${item}</span><span class="v-trait-del" onclick="deleteTraitVisual(${cIdx}, ${tIdx})">×</span>`;
    
    // 修改 1: 讓特質項目也能接收放置事件，以記錄目標位置
    itemDiv.ondragover = (e) => {
        e.preventDefault();
        e.stopPropagation();
        itemDiv.style.borderTop = "2px solid var(--accent-color)"; // 視覺提示：插入在此處上方
    };
    
    itemDiv.ondragleave = () => {
        itemDiv.style.borderTop = ""; // 移除提示
    };

    itemDiv.ondragstart = (e) => {
        e.stopPropagation();
        e.dataTransfer.setData('text/type', 'trait');
        e.dataTransfer.setData('text/fromCat', cIdx);
        e.dataTransfer.setData('text/traitIdx', tIdx);
    };

    // 修改 2: 在特質上放下時，執行插入動作
    itemDiv.ondrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        itemDiv.style.borderTop = "";
        
        const type = e.dataTransfer.getData('text/type');
        if (type === 'trait') {
            const fromCatIdx = parseInt(e.dataTransfer.getData('text/fromCat'));
            const fromTraitIdx = parseInt(e.dataTransfer.getData('text/traitIdx'));
            
            // 取出移動的項目
            const movedTrait = tempTraitsData[fromCatIdx].items.splice(fromTraitIdx, 1)[0];
            
            // 插入到當前類別 (cIdx) 的指定位置 (tIdx)
            tempTraitsData[cIdx].items.splice(tIdx, 0, movedTrait);
            
            renderVisualEditor();
        }
    };
    
    itemList.appendChild(itemDiv);
});
        container.appendChild(box);
    });
}

// 核心功能：新增
function addTraitVisual(cIdx) {
    const input = document.getElementById(`v-input-${cIdx}`);
    const val = input.value.trim();
    if (!val) return;

    if (val.endsWith("類")) {
        // 在該模組之後插入
        tempTraitsData.splice(cIdx + 1, 0, { category: val, items: [] });
        renderVisualEditor();
        // 自動聚焦到新生成的類別輸入框
        setTimeout(() => {
            const nextInput = document.getElementById(`v-input-${cIdx + 1}`);
            if(nextInput) nextInput.focus();
        }, 50);
    } else {
        tempTraitsData[cIdx].items.push(val);
        renderVisualEditor();
        // 保持在原輸入框繼續輸入下一個特質
        const sameInput = document.getElementById(`v-input-${cIdx}`);
        if(sameInput) sameInput.focus();
    }
}

// 核心功能：刪除（加入確認）
function deleteCategory(cIdx) {
    if (confirm(`確定要刪除「${tempTraitsData[cIdx].category}」及其所有特質嗎？`)) {
        tempTraitsData.splice(cIdx, 1);
        renderVisualEditor();
    }
}

function deleteTraitVisual(cIdx, tIdx) {
    const traitName = tempTraitsData[cIdx].items[tIdx];
    if (confirm(`確定要刪除特質「${traitName}」嗎？`)) {
        tempTraitsData[cIdx].items.splice(tIdx, 1);
        renderVisualEditor();
    }
}

// 最終寫入
function saveVisualTraits() {
    let output = "";
    tempTraitsData.forEach(cat => {
        output += cat.category + "\n";
        cat.items.forEach(item => {
            output += item + "\n";
        });
    });
    document.getElementById('traitsSet').value = output.trim();
    closeVisualModal();
}

init();
