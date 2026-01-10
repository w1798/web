/**
 * Puti-AI 學生期末評語提示詞生成器 V8.2
 */

// 預設資料
const defaultTraits = [
    { category: "品學兼優型", items: ["才德兼備", "勤學篤行", "嚴於律己", "尊師重道", "慎思明辨", "知行合一", "進退有度", "謙遜自持", "恪守本分", "惜時如金", "精益求精", "誠信正直", "樂善好施", "觸類旁通", "堪為表率"] },
    { category: "潛力待發型", items: ["大器晚成", "韜光養晦", "靜觀其變", "厚積薄發", "蓄勢待發", "後發先至", "不鳴則已", "沉潛剛克", "伺機而動", "穩紮穩打", "深藏若虛", "引而不發", "待時而動", "後來居上", "一鳴驚人"] },
    { category: "活躍社交型", items: ["樂群敬業", "談吐不凡", "妙語如珠", "熱情洋溢", "應對得體", "廣結善緣", "幽默風趣", "靈活變通", "助人為樂", "開朗大方", "號召有力", "適應力強", "感染力強", "人際圓融", "進退合宜"] },
    { category: "創意無限型", items: ["別出心裁", "獨具匠心", "標新立異", "天馬行空", "奇思妙想", "不拘一格", "推陳出新", "自出機杼", "匠心獨運", "超凡脫俗", "與眾不同", "突破常規", "另闢蹊徑", "巧奪天工", "出人意表"] },
    { category: "穩扎穩打型", items: ["腳踏實地", "按部就班", "循序漸進", "一絲不苟", "兢兢業業", "穩健踏實", "步步為營", "實事求是", "專心致志", "持之以恆", "細心謹慎", "條理分明", "量力而行", "務實求真", "鍥而不捨"] },
    { category: "領導魅力型", items: ["遠見卓識", "知人善任", "決策果斷", "統籌全局", "以身作則", "公正無私", "膽識過人", "運籌帷幄", "高瞻遠矚", "顧全大局", "指揮若定", "臨危不亂", "德才兼備", "眾望所歸", "領袖群倫"] },
    { category: "藝術表達型", items: ["才華橫溢", "情感豐沛", "觀察入微", "風格獨特", "表現力強", "審美獨到", "敏感細膩", "意境深遠", "形神兼備", "聲情並茂", "繪聲繪色", "活靈活現", "文采斐然", "妙筆生花", "栩栩如生"] },
    { category: "邏輯分析型", items: ["條理清晰", "推理嚴密", "分析透徹", "思維縝密", "客觀冷靜", "洞見癥結", "辯才無礙", "明察秋毫", "抽絲剝繭", "層次分明", "有理有據", "邏輯嚴謹", "證據確鑿", "實證求真", "追本溯源"] },
    { category: "運動健將型", items: ["體魄強健", "身手敏捷", "協調自如", "爆發力強", "意志堅定", "團隊合作", "反應迅速", "耐力過人", "遵守規則", "追求卓越", "刻苦訓練", "勝不驕躁", "敗不氣餒", "動靜得宜", "競技精神"] },
    { category: "同理心強型", items: ["將心比心", "善解人意", "體貼入微", "關懷備至", "慈悲為懷", "寬厚仁慈", "樂於助人", "雪中送炭", "濟弱扶傾", "感同身受", "溫情脈脈", "細緻周到", "設身處地", "推己及人", "仁心仁術"] },
    { category: "獨立自主型", items: ["自立自強", "自給自足", "獨當一面", "特立獨行", "自我驅動", "目標明確", "自學成才", "不隨流俗", "冷靜沉著", "內省自覺", "主動進取", "自律甚嚴", "獨立思考", "自力更生", "自成一格"] },
    { category: "團隊協作型", items: ["同心協力", "分工合作", "配合無間", "群策群力", "和衷共濟", "攜手並進", "互助互惠", "取長補短", "齊心合力", "同舟共濟", "協力同心", "眾志成城", "團結一致", "相輔相成", "共存共榮"] },
    { category: "好奇探索型", items: ["追根究底", "求知若渴", "學而不厭", "勇於嘗試", "開拓進取", "標新探奇", "實事求是", "實驗精神", "挑戰未知", "廣泛涉獵", "觸類旁通", "舉一反三", "好學不倦", "格物致知", "明辨篤行"] },
    { category: "務實執行型", items: ["實事求是", "腳踏實地", "言行一致", "說到做到", "雷厲風行", "立竿見影", "注重實效", "勤勉懇切", "任勞任怨", "埋頭苦幹", "專注目標", "效率至上", "結果導向", "使命必達", "克盡厥職"] },
    { category: "多才多藝型", items: ["文武雙全", "才藝兼備", "博學多才", "多才多藝", "學貫中西", "通才達識", "能文能武", "動靜皆宜", "左右開弓", "兼容並蓄", "融會貫通", "學以致用", "一專多能", "觸類旁通", "全知全能"] }
];


const DEFAULT_TEMPLATE = "請為{grade}年級的學生{name}，以正向、溫暖、鼓勵的語氣，根據學生特質{{traits}}，生成{wordCount}字的期末評語";

let traitsData = JSON.parse(JSON.stringify(defaultTraits));
let selectedStudents = new Set();
let selectedTraits = new Set();
let studentsData = [];
let generatedPrompts = [];

// --- 初始化 ---
document.addEventListener('DOMContentLoaded', () => {
    loadFromLocalStorage();
    initializeTraitButtons();
    setupEventListeners();
});

function getPastelColor(index) {
    const hue = (index * 137.5) % 360;
    return `hsl(${hue}, 70%, 92%)`;
}

function initializeTraitButtons() {
    const container = document.querySelector('.traits-section');
    const groups = container.querySelectorAll('.trait-group:not(.custom)');
    groups.forEach(g => g.remove());
    const customSection = container.querySelector('.trait-group.custom');

    traitsData.forEach((group, groupIndex) => {
        const groupDiv = document.createElement('div');
        groupDiv.className = 'trait-group';
        groupDiv.style.backgroundColor = getPastelColor(groupIndex);
        groupDiv.style.border = `1px solid ${getPastelColor(groupIndex).replace('92%', '80%')}`;

        const h3 = document.createElement('h3');
        h3.textContent = group.category;
        const delBtn = document.createElement('span');
        delBtn.textContent = ' (刪除此類別)';
        delBtn.style.cssText = "font-size:12px; color:#cc4444; cursor:pointer; margin-left:10px;";
        delBtn.onclick = () => removeCategory(groupIndex);
        h3.appendChild(delBtn);
        
        const btnContainer = document.createElement('div');
        btnContainer.className = 'buttons';
group.items.forEach((trait, tIdx) => {
            const btn = document.createElement('button');
            btn.className = 'trait-button';
            // 檢查是否已被選取，若是則加上選取樣式
            if (selectedTraits.has(trait)) btn.classList.add('selected');
            
            // 建立文字標籤，避免與垃圾桶重疊
            const textSpan = document.createElement('span');
            textSpan.textContent = trait;
            btn.appendChild(textSpan);

            // 建立垃圾桶
            const x = document.createElement('span');
            x.innerHTML = 'X'; 
            x.className = 'delete-trait-bin'; 
            x.title = "刪除此詞彙"; 
            x.onclick = (e) => { 
                e.stopPropagation(); // 防止觸發按鈕的選取事件
                removeTrait(groupIndex, tIdx); 
            };
            btn.appendChild(x);

            // 修正：補上點選變色邏輯
            btn.onclick = () => toggleTrait(btn, trait);

            // 修正：將按鈕放進容器
            btnContainer.appendChild(btn); 
        });
        groupDiv.appendChild(h3);
        groupDiv.appendChild(btnContainer);
        container.insertBefore(groupDiv, customSection);
    });
}

function setupEventListeners() {
    // 學生確定按鈕與提示
    document.getElementById('generateButtons').onclick = () => {
        generateStudentButtons();
        document.getElementById('stepHint').style.display = 'inline';
    };

document.getElementById('resetTemplate').onclick = resetTemplate;
    document.getElementById('generate').onclick = generatePrompt;
    document.getElementById('copy').onclick = copyPrompt;
    document.getElementById('openAI').onclick = openAIWebsite;
    document.getElementById('reset').onclick = confirmReset;
    document.getElementById('addCustomTraits').onclick = addCustomTraits;
    document.getElementById('clearCustomTraits').onclick = clearAllTraitsData;
    document.getElementById('exportTraits').onclick = exportTraitsJSON;
    document.getElementById('importTraits').onclick = () => document.getElementById('traitFileInput').click();
    document.getElementById('traitFileInput').onchange = importTraitsJSON;
    document.getElementById('resetConfig').onclick = resetFullSystem;

    document.getElementById('customTraitInput').addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.key === 'Enter') addCustomTraits();
    });
    
    // 範本變動時自動儲存
    document.getElementById('promptTemplate').onchange = saveToLocalStorage;
}


function resetTemplate() {
    if (confirm('確定要將「提示詞範本」恢復成原始預設值嗎？')) {
        // DEFAULT_TEMPLATE 是您程式碼最上方定義好的常數
        document.getElementById('promptTemplate').value = DEFAULT_TEMPLATE;
        saveToLocalStorage(); // 儲存變更
	
    }
}


function resetFullSystem() {
    if (confirm('確定要將系統恢復成原始預設值嗎？')) {
        localStorage.removeItem('puti_ai_v8_config');
        location.reload();
    }
}

// --- 核心功能 ---
function generateStudentButtons() {
    const names = document.getElementById('studentNames').value.split('\n').map(n => n.trim()).filter(n => n);
    studentsData = names.map((name, index) => ({ id: String(index + 1).padStart(2, '0'), name: name }));
    const container = document.getElementById('studentButtons');
    container.innerHTML = '';
    studentsData.forEach(student => {
        const btn = document.createElement('button');
        btn.className = 'student-button';
        btn.textContent = `${student.id}.${student.name}`;
        btn.onclick = () => toggleStudent(btn, student);
        container.appendChild(btn);
    });
}

function toggleStudent(btn, student) {
    const key = `${student.id}.${student.name}`;
    if (selectedStudents.has(key)) { selectedStudents.delete(key); btn.classList.remove('selected'); }
    else { selectedStudents.add(key); btn.classList.add('selected'); }
}

function toggleTrait(btn, trait) {
    if (selectedTraits.has(trait)) { selectedTraits.delete(trait); btn.classList.remove('selected'); }
    else { selectedTraits.add(trait); btn.classList.add('selected'); }
}

function addCustomTraits() {
    const input = document.getElementById('customTraitInput');
    const lines = input.value.split('\n').map(l => l.trim()).filter(l => l);
    if (lines.length === 0) return;
    let curr = traitsData.length - 1;
    lines.forEach(text => {
        if (text.length >= 5) { traitsData.push({ category: text, items: [] }); curr = traitsData.length - 1; }
        else {
            if (curr < 0) { traitsData.push({ category: "其他", items: [text] }); curr = 0; }
            else if (!traitsData[curr].items.includes(text)) traitsData[curr].items.push(text);
        }
    });
    input.value = '';
    saveToLocalStorage();
    initializeTraitButtons();
}

function removeCategory(idx) {
    if (confirm('刪除類別？')) { traitsData.splice(idx, 1); saveToLocalStorage(); initializeTraitButtons(); }
}

function removeTrait(gIdx, tIdx) {
    const traitName = traitsData[gIdx].items[tIdx];
    // 增加確認視窗
    if (confirm(`確定要刪除適性詞「${traitName}」嗎？`)) {
        const r = traitsData[gIdx].items.splice(tIdx, 1);
        selectedTraits.delete(r[0]);
        saveToLocalStorage();
        initializeTraitButtons();
    }
}

function clearAllTraitsData() {
    if (confirm('清空原來和自訂義所有類別和適性詞？')) { traitsData = []; saveToLocalStorage(); initializeTraitButtons(); }
}

function generatePrompt() {
    if (selectedStudents.size === 0 || selectedTraits.size === 0) { alert('請選擇學生和特質！'); return; }
    
    const grade = document.getElementById('grade').value;
    const wordCount = document.getElementById('wordCount').value;
    const traitsStr = Array.from(selectedTraits).join('、');
    const template = document.getElementById('promptTemplate').value;
    
    Array.from(selectedStudents).forEach(student => {
        // 使用正則表達式取代範本標籤
        let finalPrompt = template
            .replace('{grade}', grade)
            .replace('{name}', student)
            .replace('{wordCount}', wordCount)
            .replace('{traits}', traitsStr);
            
        generatedPrompts.push({ studentId: student.split('.')[0], prompt: finalPrompt });
    });

    generatedPrompts.sort((a, b) => a.studentId.localeCompare(b.studentId));
    document.getElementById('promptPreview').textContent = generatedPrompts.map(p => p.prompt).join('\n\n');
    
    saveToLocalStorage();
    selectedStudents.forEach(s => {
        document.querySelectorAll('.student-button').forEach(btn => { if(btn.textContent === s) btn.style.display = 'none'; });
    });
    selectedTraits.clear();
    document.querySelectorAll('.trait-button').forEach(b => b.classList.remove('selected'));
    selectedStudents.clear();
}

function copyPrompt() {
    const t = document.getElementById('promptPreview').textContent;
    if (t) navigator.clipboard.writeText(t).then(() => alert('已複製！'));
}

function openAIWebsite() { window.open('https://student.magicschool.ai/s/join?joinCode=GYDRVQ', '_blank'); }

function confirmReset() {
    if (confirm('重置提示詞？')) {
        document.getElementById('promptPreview').textContent = '';
        document.querySelectorAll('.student-button').forEach(b => { b.style.display = 'inline-block'; b.classList.remove('selected'); });
        selectedStudents.clear();
        generatedPrompts = [];
        saveToLocalStorage();
    }
}

// --- 檔案功能 ---
function exportTraitsJSON() {
    const data = {
        traits: traitsData,
        template: document.getElementById('promptTemplate').value
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `puti_config_${new Date().toISOString().slice(0,10)}.json`;
    a.click();
}

function importTraitsJSON(event) {
    const file = event.target.files[0];
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const imported = JSON.parse(e.target.result);
            if (confirm('覆蓋現有設定？')) {
                // 相容舊版與新版 JSON 格式
                if (Array.isArray(imported)) {
                    traitsData = imported;
                } else {
                    traitsData = imported.traits || [];
                    if (imported.template) document.getElementById('promptTemplate').value = imported.template;
                }
                saveToLocalStorage();
                initializeTraitButtons();
            }
        } catch (err) { alert('格式錯誤'); }
    };
    reader.readAsText(file);
}

// --- 儲存管理 ---
function saveToLocalStorage() {
    const appState = {
        grade: document.getElementById('grade').value,
        wordCount: document.getElementById('wordCount').value,
        studentsData: studentsData,
        generatedPrompts: generatedPrompts,
        traitsData: traitsData,
        promptTemplate: document.getElementById('promptTemplate').value
    };
    localStorage.setItem('puti_ai_v8_config', JSON.stringify(appState));
}

function loadFromLocalStorage() {
    const saved = localStorage.getItem('puti_ai_v8_config');
    if (saved) {
        const state = JSON.parse(saved);
        document.getElementById('grade').value = state.grade || "";
        document.getElementById('wordCount').value = state.wordCount || 100;
        document.getElementById('promptTemplate').value = state.promptTemplate || DEFAULT_TEMPLATE;
        if (state.traitsData) traitsData = state.traitsData;
        if (state.studentsData) {
            studentsData = state.studentsData;
            document.getElementById('studentNames').value = studentsData.map(s => s.name).join('\n');
            generateStudentButtons();
        }
        if (state.generatedPrompts) {
            generatedPrompts = state.generatedPrompts;
            document.getElementById('promptPreview').textContent = generatedPrompts.map(p => p.prompt).join('\n\n');
        }
    }
}
