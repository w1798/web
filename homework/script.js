

const DEFAULT_VALS = {
    preTasks: ["訂簽", "簽名", "交", "發"],
    mainTasks: ["假日","國習", "生字", "圈詞", "數習", "作文", "國卷", "數卷"],
    postTasks: ["一頁", "兩頁", "一張"]
};

let appData = {
    theme: 'theme-ocean', cols: 5, mainShowCount: 7, editCols: 7, editShowCount: 28,
    direction: 'ltr', weekendMode: 'both', fsMain: 18, fsSet: 16, fsEdit: 16, autoDeleteDays: 30,
    mainStartDate: new Date().toISOString().split('T')[0], 
    tasks: [],
    startDayType: 'monday', // 新增：可選 'monday', 'sunday', 'today'
    cardHeight: 'large', // 新增：可選 'small', 'medium', 'large'
    ...DEFAULT_VALS
};


let tempTasks = [], dragInfo = null, targetIdx = -1;
let selectedPre = new Set(), selectedMain = new Set();

function init() {
    try {
        const saved = localStorage.getItem('homework_v2026');
        if (saved) appData = JSON.parse(saved);
        performAutoDelete();
        const today = new Date().toISOString().split('T')[0];
        appData.mainStartDate = today;
        document.getElementById('mainStartDatePicker').value = today;

        // 初始化下拉選單
        const fOpt = [12, 14, 16, 18, 20, 24, 28, 32, 36, 40].map(n => `<option value="${n}">${n}px</option>`).join('');
        ['fsMainSelect', 'fsSetSelect', 'fsEditSelect'].forEach(id => document.getElementById(id).innerHTML = fOpt);
        
        const ts = document.getElementById('themeSelect');
        ts.innerHTML = Object.keys(themeChineseNames).map(k => `<option value="${k}">${themeChineseNames[k]}</option>`).join('');
        
        const cs = document.getElementById('colsSelect');
        cs.innerHTML = [1,2,3,4,5,6,7].map(n => `<option value="${n}">${n}天</option>`).join('');
        
        const ecs = document.getElementById('editColsSelect');
        ecs.innerHTML = [1,2,3,4,5,6,7].map(n => `<option value="${n}">${n}天</option>`).join('');

        renderMain();
    } catch(e) { console.error(e); }
}

const themeChineseNames = { 'theme-ocean': '海洋', 'theme-forest': '森林', 'theme-sakura': '櫻花', 'theme-sunset': '夕陽', 'theme-lavender': '薰衣草', 'theme-lemon': '檸檬', 'theme-slate': '岩石', 'theme-mint': '薄荷', 'theme-rose': '玫瑰', 'theme-cocoa': '可可', 'theme-deepsea': '深海', 'theme-cream': '奶油', 'theme-grape': '葡萄', 'theme-silver': '銀白', 'theme-fire': '火焰' };

// 修改 performAutoDelete，使其回傳過濾後的陣列而不只是修改全域
function performAutoDelete() {
    const days = parseInt(appData.autoDeleteDays);
    if (days === 0) return; // 0 代表不自動刪除

    // 計算截止日期 (今天 - 設定天數)
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    const cutoffStr = cutoffDate.toISOString().split('T')[0];

    // 過濾掉舊作業
    const originalCount = appData.tasks.length;
    appData.tasks = appData.tasks.filter(t => t.date >= cutoffStr);
    
    // 如果有刪除資料，就存入 localStorage
    if (originalCount !== appData.tasks.length) {
        localStorage.setItem('homework_v2026', JSON.stringify(appData));
        console.log(`已自動刪除 ${originalCount - appData.tasks.length} 筆過期作業`);
    }
}

function getCalculatedStartDate() {
    const type = appData.startDayType;
    const today = new Date();
    const day = today.getDay(); // 0是週日, 1-6是週一至週六

    if (type === 'today') {
        return today.toISOString().split('T')[0];
    }

    let diff = 0;
    if (type === 'monday') {
        // 如果今天是週日(0)，要回溯 6 天；其他則回溯 (day - 1) 天
        diff = (day === 0) ? -6 : 1 - day;
    } else if (type === 'sunday') {
        // 回溯到週日
        diff = -day;
    }

    const targetDate = new Date(today);
    targetDate.setDate(today.getDate() + diff);
    return targetDate.toISOString().split('T')[0];
}


function renderMain() {
    document.body.className = appData.theme;

    const heightMap = { 'small': '240px', 'medium': '330px', 'large': '500px' };
    document.documentElement.style.setProperty('--card-height', heightMap[appData.cardHeight || 'large']);    

    document.documentElement.style.setProperty('--fs-main', appData.fsMain + 'px');
    document.documentElement.style.setProperty('--fs-set', appData.fsSet + 'px');
    document.documentElement.style.setProperty('--fs-edit', appData.fsEdit + 'px');
    const mb = document.getElementById('mainBoard');
    mb.style.gridTemplateColumns = `repeat(${appData.cols}, 1fr)`;
    mb.dir = appData.direction;

// --- 核心修正：自動連動起點日期 ---
    const calculatedStart = getCalculatedStartDate();
    appData.mainStartDate = calculatedStart; 
    document.getElementById('mainStartDatePicker').value = calculatedStart;

    const filtered = appData.tasks.filter(t => {
        if(t.date < appData.mainStartDate) return false;
        if(appData.weekendMode === 'sat') return t.day !== '日';
        if(appData.weekendMode === 'none') return t.day !== '六' && t.day !== '日';
        return true;
    }).slice(0, appData.mainShowCount);

    mb.innerHTML = filtered.map(item => `
        <div class="day-card">
            <h3>${item.date.split('-').slice(1).join('/')}(${item.day})</h3>
            <ul>${item.list.map(t => `<li>${t}</li>`).join('')}</ul>
        </div>
    `).join('');
}

// 編修核心函數
function openEdit() {
    tempTasks = JSON.parse(JSON.stringify(appData.tasks));
    document.getElementById('editStartDatePicker').value = new Date().toISOString().split('T')[0];
    renderEdit();
    document.getElementById('editModal').style.display = 'block';
}

function renderEdit() {
    const eb = document.getElementById('editBoard');
    if(!eb) return;
    const startD = document.getElementById('editStartDatePicker').value;
    const showCount = parseInt(appData.editShowCount) || 14;
    eb.style.gridTemplateColumns = `repeat(${appData.editCols}, 1fr)`;

    let startIdx = tempTasks.findIndex(t => t.date >= startD);
    if(startIdx === -1) startIdx = 0;
    const displayList = tempTasks.slice(startIdx, startIdx + showCount);

    eb.innerHTML = displayList.map((item, localIdx) => {
        const gIdx = startIdx + localIdx;
        const validList = (item.list || []).filter(t => t && t.trim());

	const dateParts = item.date.split('-'); // 將 2026-01-20 拆開
    	const shortDate = `${dateParts[1]}/${dateParts[2]}`; // 組合為 01/20

	return `
    <div class="edit-card" ondragover="event.preventDefault()" ondrop="dropM(${gIdx})">
        <div class="edit-header" draggable="true" ondragstart="dragM(${gIdx})">
            <div class="edit-header-title">${shortDate}(${item.day})</div>
            <span class="edit-del-btn" onclick="delDay(${gIdx})">✕</span>
        </div>



        <ul style="flex:1; overflow-y:auto; list-style:none; padding:0; margin:5px 0">
            ${validList.map((t, ti) => `<li class="task-box" draggable="true" ondragstart="dragT(event,${gIdx},${ti})" ondrop="dropT(event,${gIdx},${ti})">${t} <span onclick="delT(${gIdx},${ti})" style="cursor:pointer">✕</span></li>`).join('')}
        </ul>
        <div style="display:flex; gap:2px">
            <button onclick="prepT(${gIdx})" style="flex:1">新增</button>
            <button onclick="insD(${gIdx})" style="flex:1">加一天</button>
        </div>
    </div>`;
	}).join('');

}

function updateDateChain(startIndex) {
    for (let i = startIndex + 1; i < tempTasks.length; i++) {
        let prev = new Date(tempTasks[i-1].date);
        prev.setDate(prev.getDate() + 1);
        tempTasks[i].date = prev.toISOString().split('T')[0];
        tempTasks[i].day = "日一二三四五六"[prev.getDay()];
    }
}

function addDayAtStart() {
    const todayStr = new Date().toISOString().split('T')[0];
    let newDay;
    let targetDateStr;

    if (tempTasks.length === 0) {
        const d = new Date();
        const dayName = "日一二三四五六"[d.getDay()];
        targetDateStr = todayStr;
        newDay = { 
            date: targetDateStr, 
            day: dayName, 
            list: (dayName === '六' || dayName === '日') ? ["假日"] : [] 
        };
        tempTasks.push(newDay);
    } else {
        let firstD = new Date(tempTasks[0].date);
        firstD.setDate(firstD.getDate() - 1);
        targetDateStr = firstD.toISOString().split('T')[0];
        const dayName = "日一二三四五六"[firstD.getDay()];
        newDay = { 
            date: targetDateStr, 
            day: dayName, 
            list: (dayName === '六' || dayName === '日') ? ["假日"] : [] 
        };
        tempTasks.unshift(newDay);
    }
    
    // --- 關鍵修正：立即更新 UI 日期指標 ---
    // 1. 更新編修視窗的日期選擇器，確保畫面立即跳轉到最新加入的那天
    document.getElementById('editStartDatePicker').value = targetDateStr;
    
    // 2. 更新首頁資料起點 (這確保 renderMain 時會從這天開始顯示)
    appData.mainStartDate = targetDateStr;
    document.getElementById('mainStartDatePicker').value = targetDateStr;
    
    // 執行連動並重新渲染
    // 註：若您目前沒有定義 updateDateChainAndReorder，請改回呼叫 updateDateChain(0)
    if (typeof updateDateChainAndReorder === "function") {
        updateDateChainAndReorder(0);
    } else {
        updateDateChain(0);
    }
    
    renderEdit();
}



function addDayAtEnd() {
    let d = tempTasks.length ? new Date(tempTasks[tempTasks.length - 1].date) : new Date();
    d.setDate(d.getDate() + 1);
    let newDay = { date: d.toISOString().split('T')[0], day: "日一二三四五六"[d.getDay()], list: [] };
    if (newDay.day === '六' || newDay.day === '日') newDay.list.push("假日");
    tempTasks.push(newDay);
    renderEdit();
}




function updateDateChainAndReorder(startIndex) {
    let originalHolidays = new Set();
    let pool = [];
    // 紀錄原本資料的最末端日期
    const originalLastDate = tempTasks.length > 0 ? tempTasks[tempTasks.length - 1].date : "";

    // A. 提取資料
    for (let i = 0; i < tempTasks.length; i++) {
        const item = tempTasks[i];
        const hasHoliday = item.list.some(t => t.includes("假日"));
        if (hasHoliday) originalHolidays.add(item.date);

        if (i >= startIndex) {
            if (!hasHoliday) {
                const normalTasks = item.list.filter(t => t && t.trim() !== "");
                // 【修正點】改為放入整個陣列 (normalTasks)，如果是空的則放入 null 占位
                pool.push(normalTasks.length > 0 ? normalTasks : null);
            }
            tempTasks[i].list = []; // 清空準備重新分配
        }
    }

    // B. 重新校正日期與星期
    for (let i = Math.max(0, startIndex); i < tempTasks.length; i++) {
        if (i > 0) {
            let prev = new Date(tempTasks[i-1].date);
            prev.setDate(prev.getDate() + 1);
            tempTasks[i].date = prev.toISOString().split('T')[0];
            tempTasks[i].day = "日一二三四五六"[prev.getDay()];
        }
        
        // 假日判定
        const isNewDate = tempTasks[i].date > originalLastDate;
        if (originalHolidays.has(tempTasks[i].date) || (isNewDate && (tempTasks[i].day === '六' || tempTasks[i].day === '日'))) {
            tempTasks[i].list = ["假日"];
        }
    }

    // C. 將作業池填回非假日的格子
    let poolIdx = 0;
    for (let i = startIndex; i < tempTasks.length; i++) {
        if (tempTasks[i].list.some(t => t.includes("假日"))) continue;
        
        if (poolIdx < pool.length) {
            const tasksForThisDay = pool[poolIdx];
            // 【修正點】如果是陣列，則整捆填入
            if (tasksForThisDay !== null) {
                tempTasks[i].list = [...tasksForThisDay];
            }
            poolIdx++;
        }
    }

    // D. 處理溢出區
    while (poolIdx < pool.length) {
        let last = tempTasks[tempTasks.length - 1];
        let d = new Date(last.date);
        d.setDate(d.getDate() + 1);
        
        let newDayDate = d.toISOString().split('T')[0];
        let newDayWeek = "日一二三四五六"[d.getDay()];
        let newList = [];
        
        if (newDayWeek === '六' || newDayWeek === '日') {
            newList.push("假日");
        } else {
            const tasksForThisDay = pool[poolIdx];
            if (tasksForThisDay !== null) newList = [...tasksForThisDay];
            poolIdx++;
        }
        
        tempTasks.push({
            date: newDayDate,
            day: newDayWeek,
            list: newList
        });
    }
}





function insD(i) {
    // 1. 在選定位置插入新的一天（這會讓後面的作業原本對應的「日期索引」改變）
    let d = new Date(tempTasks[i].date); 
    d.setDate(d.getDate() + 1);
    
    // 插入新日期，初始 list 為空
    tempTasks.splice(i + 1, 0, { 
        date: d.toISOString().split('T')[0], 
        day: "日一二三四五六"[d.getDay()], 
        list: [] 
    });

    // 2. 執行修正後的推移邏輯
    updateDateChainAndReorder(i + 1); 
    renderEdit();
}





function delDay(i) {
    if(confirm("確定刪除此日？")) {
        tempTasks.splice(i, 1); // 刪除一格，長度變短
        if(tempTasks.length > 0) {
            updateDateChainAndReorder(Math.max(0, i)); // 重新分配會讓後面的功課遞補上來
        }
        renderEdit();
    }
}



function delT(mi, ti) { tempTasks[mi].list.splice(ti, 1); renderEdit(); }

// 拖曳邏輯
function dragM(idx) { dragInfo = { type: 'M', idx }; }
function dragT(e, mi, ti) { e.stopPropagation(); dragInfo = { type: 'T', mi, ti }; }
function dropM(toMi) {
    if(!dragInfo) return;
    if(dragInfo.type === 'M') [tempTasks[dragInfo.idx].list, tempTasks[toMi].list] = [tempTasks[toMi].list, tempTasks[dragInfo.idx].list];
    else tempTasks[toMi].list.push(tempTasks[dragInfo.mi].list.splice(dragInfo.ti, 1)[0]);
    renderEdit(); dragInfo = null;
}
function dropT(e, toMi, toTi) {
    e.stopPropagation();
    if(dragInfo && dragInfo.type === 'T') [tempTasks[dragInfo.mi].list[dragInfo.ti], tempTasks[toMi].list[toTi]] = [tempTasks[toMi].list[toTi], tempTasks[dragInfo.mi].list[dragInfo.ti]];
    renderEdit(); dragInfo = null;
}

// 關鍵字推移邏輯
function executeFullShift(startIdx, taskName, keyword) {
    let currentCarrier = taskName; 
    for (let i = startIdx; i < tempTasks.length; i++) {
        // 1. 遇到假日排除 (保持原有的判斷邏輯，但不再主動補假日)
        if (tempTasks[i].list.some(t => t.includes("假日"))) continue;

        let list = tempTasks[i].list;
        let foundIdx = list.findIndex(t => t && t.includes(keyword));
        
        if (foundIdx !== -1) {
            let backup = list[foundIdx];
            list[foundIdx] = currentCarrier;
            currentCarrier = backup; 
        } else if (currentCarrier && currentCarrier.trim() !== "") {
            list.push(currentCarrier);
            currentCarrier = ""; 
        }
    }
    
    // 2. 當作業推移超過目前最後一天時，自動產生新日期
    if (currentCarrier && currentCarrier.trim() !== "") {
        let lastDate = new Date(tempTasks[tempTasks.length - 1].date);
        lastDate.setDate(lastDate.getDate() + 1);
        
        let newDayDate = lastDate.toISOString().split('T')[0];
        let newDayWeek = "日一二三四五六"[lastDate.getDay()];
        let newList = [];
        
        // 只有在此時（產生新日期時）才判斷六日並自動填入「假日」
        if (newDayWeek === '六' || newDayWeek === '日') {
            newList.push("假日");
        }
        
        let newDay = {
            date: newDayDate,
            day: newDayWeek,
            list: newList
        };
        
        tempTasks.push(newDay);
        // 遞迴處理剩餘的作業
        executeFullShift(tempTasks.length - 1, currentCarrier, keyword);
    }
}



// 新增作業 UI
function prepT(idx) {
    targetIdx = idx; selectedPre.clear(); selectedMain.clear();
    document.getElementById('taskFinalInput').value = '';
    renderTags();
    document.getElementById('taskPromptModal').style.display = 'block';
}

function renderTags() {
    const draw = (id, list, set, type) => {
        document.getElementById(id).innerHTML = list.map(t => `<div class="clickable-tag ${set && set.has(t)?'active':''}" onclick="clickTag('${type}','${t}')">${t}</div>`).join('');
    };
    draw('preTags', appData.preTasks, selectedPre, 'pre');
    draw('mainTags', appData.mainTasks, selectedMain, 'main');
    draw('postTags', appData.postTasks, null, 'post');
}

function clickTag(type, val) {
    if(type==='pre') selectedPre.has(val)?selectedPre.delete(val):selectedPre.add(val);
    else if(type==='main') selectedMain.has(val)?selectedMain.delete(val):selectedMain.add(val);
    else document.getElementById('taskFinalInput').value = val;
    renderTags();
}

function confirmAddTask() {
    let final = (Array.from(selectedPre).join('') + Array.from(selectedMain).join('') + document.getElementById('taskFinalInput').value).trim();
    if(final && targetIdx !== -1) {
        const keyword = appData.mainTasks.find(k => final.includes(k));
        if(keyword) executeFullShift(targetIdx, final, keyword);
        else tempTasks[targetIdx].list.push(final);
        renderEdit(); closeModal('taskPromptModal');
    }
}

// 設定與存檔
function resetField(type) {
    if(!confirm("重置此欄位？")) return;
    if(type === 'pre') document.getElementById('preTasksText').value = DEFAULT_VALS.preTasks.join('\n');
    else if(type === 'main') document.getElementById('defaultTasksText').value = DEFAULT_VALS.mainTasks.join('\n');
    else if(type === 'post') document.getElementById('postTasksText').value = DEFAULT_VALS.postTasks.join('\n');
}

function saveSettings() {
    const d = document;
    appData.theme = d.getElementById('themeSelect').value;
    appData.cols = parseInt(d.getElementById('colsSelect').value);
    appData.mainShowCount = parseInt(d.getElementById('mainShowSelect').value);
    appData.editCols = parseInt(d.getElementById('editColsSelect').value);
    appData.editShowCount = parseInt(d.getElementById('editShowSelect').value);
    appData.fsMain = parseInt(d.getElementById('fsMainSelect').value);
    appData.fsSet = parseInt(d.getElementById('fsSetSelect').value);
    appData.fsEdit = parseInt(d.getElementById('fsEditSelect').value);
    appData.direction = d.getElementById('dirSelect').value;
    appData.weekendMode = d.getElementById('weekendSelect').value;
    appData.autoDeleteDays = parseInt(d.getElementById('autoDeleteSelect').value);
    appData.preTasks = d.getElementById('preTasksText').value.split('\n').filter(x=>x.trim());
    appData.mainTasks = d.getElementById('defaultTasksText').value.split('\n').filter(x=>x.trim());
    appData.postTasks = d.getElementById('postTasksText').value.split('\n').filter(x=>x.trim());
    appData.cardHeight = d.getElementById('cardHeightSelect').value;
    appData.startDayType = d.getElementById('startDayTypeSelect').value;
    performAutoDelete();
    localStorage.setItem('homework_v2026', JSON.stringify(appData));
    renderMain(); closeModal('settingsModal');
}

function openSettings() {
    const d = document;
    d.getElementById('themeSelect').value = appData.theme;
    d.getElementById('colsSelect').value = appData.cols;
    d.getElementById('mainShowSelect').value = appData.mainShowCount;
    d.getElementById('editColsSelect').value = appData.editCols;
    d.getElementById('editShowSelect').value = appData.editShowCount;
    d.getElementById('autoDeleteSelect').value = appData.autoDeleteDays;
    d.getElementById('fsMainSelect').value = appData.fsMain;
    d.getElementById('fsSetSelect').value = appData.fsSet;
    d.getElementById('fsEditSelect').value = appData.fsEdit;
    d.getElementById('dirSelect').value = appData.direction;
    d.getElementById('weekendSelect').value = appData.weekendMode;
    d.getElementById('preTasksText').value = appData.preTasks.join('\n');
    d.getElementById('defaultTasksText').value = appData.mainTasks.join('\n');
    d.getElementById('postTasksText').value = appData.postTasks.join('\n');
    d.getElementById('cardHeightSelect').value = appData.cardHeight || 'large';
    d.getElementById('startDayTypeSelect').value = appData.startDayType || 'monday';
    d.getElementById('settingsModal').style.display = 'block';
}

function saveEdit() { 
    // 1. 同步日期選擇器
    const editStartD = document.getElementById('editStartDatePicker').value;
    appData.mainStartDate = editStartD;
    document.getElementById('mainStartDatePicker').value = editStartD;
    
    // 2. 將編輯中的 tempTasks 同步回主資料
    appData.tasks = tempTasks; 

    // 3. 【關鍵：存檔前先清理】
    // 這樣可以確保寫入 localStorage 的資料永遠是清理過的
    performAutoDelete();
    
    // 4. 正式寫入資料庫並渲染
    localStorage.setItem('homework_v2026', JSON.stringify(appData)); 
    renderMain(); 
    closeModal('editModal'); 
}


function closeModal(id) { document.getElementById(id).style.display = 'none'; }
function updateMainStartDate() { appData.mainStartDate = document.getElementById('mainStartDatePicker').value; renderMain(); }
function resetApp() { if(confirm("完全重置資料？")) { localStorage.clear(); location.reload(); } }
function exportJSON() {
    const blob = new Blob([JSON.stringify(appData, null, 2)], {type: 'application/json'});
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = `homework_${new Date().toISOString().split('T')[0]}.json`; a.click();
}
function importJSON(e) {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = function(evt) {
        try { appData = JSON.parse(evt.target.result); localStorage.setItem('homework_v2026', JSON.stringify(appData)); renderMain(); alert("匯入成功"); }
        catch(err) { alert("格式錯誤"); }
    };
    reader.readAsText(file);
}

init();
