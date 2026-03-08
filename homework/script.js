/**
 * Charles Nextime Web Tools Portal - Core Logic
 * * Copyright (c) 2026 Charles Nextime
 * Licensed under the GNU General Public License v3.0
 * * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation.
 */

const DEFAULT_VALS = {
    preTasks: ["訂簽", "訂正", "簽名", "交", "發", "收"],
    mainTasks: ["國習", "生字", "圈詞", "數習", "作文", "國卷", "數卷", "閱心","假日", "評量日", "親職教育日", "校外教學日", "運動會日"],
    postTasks: ["學習單", "通知單", "一頁", "兩頁", "一張"],
    writingMode: 'horizontal-tb',
    displayMode: 'text',
    bopoMap: "國:ㄍㄨㄛˊ\n習:ㄒㄧˊ\n生:ㄕㄥ\n字:ㄗˋ\n圈:ㄑㄩㄢ\n詞:ㄘˊ\n數:ㄕㄨˋ\n作:ㄗㄨㄛˋ\n文:ㄨㄣˊ\n卷:ㄐㄩㄢˋ\n閱:ㄩㄝˋ\n心:ㄒㄧㄣ\n假:ㄐㄧㄚˋ\n日:ㄖˋ\n評:ㄆㄧㄥˊ\n量:ㄌㄧㄤˊ\n親:ㄑㄧㄣ\n職:ㄓˊ\n教:ㄐㄧㄠˋ\n育:ㄩˋ\n校:ㄒㄧㄠˋ\n外:ㄨㄞˋ\n學:ㄒㄩㄝˊ\n運:ㄩㄣˋ\n動:ㄉㄨㄥˋ\n會:ㄏㄨㄟˋ\n學:ㄒㄩㄝˊ\n習:ㄒㄧˊ\n單:ㄉㄢ\n通:ㄊㄨㄥ\n知:ㄓ\n頁:ㄧㄝˋ\n一:ㄧ\n兩:ㄌㄧㄤˇ\n張:ㄓㄤ\n訂:ㄉㄧㄥˋ\n簽:ㄑㄧㄢ\n正:ㄓㄥˋ\n名:ㄇㄧㄥˊ\n交:ㄐㄧㄠ\n發:ㄈㄚ\n收:ㄕㄡ" 
};


let appData = {
    theme: 'theme-ocean', cols: 5, mainShowCount: 7, editCols: 7, editShowCount: 28,
    direction: 'ltr', weekendMode: 'both', fsMain: 18, fsSet: 16, fsEdit: 16, autoDeleteDays: 30,
    mainStartDate: new Date().toISOString().split('T')[0], 
    tasks: [],
    startDayType: 'monday', // 新增：可選 'monday', 'sunday', 'today'
    cardHeight: 'large', // 新增：可選 'small', 'medium', 'large'
    binId: '', 
    apiKey: '',
    ...DEFAULT_VALS
};


let tempTasks = [], dragInfo = null, targetIdx = -1;
let selectedPre = new Set(), selectedMain = new Set();

function init() {
    try {
        const saved = localStorage.getItem('homework_v1');
	
	if (saved) {
            appData = JSON.parse(saved);
            // 補強：確保舊資料載入後也有這兩個欄位
            if (appData.binId === undefined) appData.binId = '';
            if (appData.apiKey === undefined) appData.apiKey = '';
        }


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


function applyBopoTransform(text) {
    if (appData.displayMode !== 'bopomofo') return text;
    
    const lines = (appData.bopoMap || "").split('\n');
    const map = {};
    lines.forEach(line => {
        const [char, bopo] = line.split(':');
        if (char && bopo) map[char.trim()] = bopo.trim();
    });

    const tones = ["ˊ", "ˇ", "ˋ", "˙"];
    const isRTL = appData.direction === 'rtl';
    const isVertical = appData.writingMode === 'vertical-rl';
    const isBopomofoMode = appData.displayMode === 'bopomofo';

    // 只在注音模式且 RTL 直書時反轉文字
    if (isBopomofoMode && isRTL && isVertical) {
        text = text.split('').reverse().join('');
    }
    
    return text.split('').map(char => {
        const bopo = map[char];
        
        if (!bopo) {
            if (isVertical) {
                return `<span class="plain-char">${char}</span>`;
            }
            return char;
        }

        if (isVertical) {
            let tone = "";
            let mainBopo = bopo;
            const lastChar = bopo.slice(-1);
            if (tones.includes(lastChar)) {
                tone = lastChar;
                mainBopo = bopo.slice(0, -1);
            }

            const bopoChars = mainBopo.split('').map(c => `<span>${c}</span>`).join('');
            
            // 注音模式下的 RTL 直書
            if (isRTL && isBopomofoMode) {
                return `<span class="bopo-vertical-item">
                            <span class="bopo-chars">${bopoChars}</span>
                            <span class="bopo-tone">${tone}</span>
                        </span>`;
            } else {
                return `<span class="bopo-vertical-item">
                            <span class="bopo-tone">${tone}</span>
                            <span class="bopo-chars">${bopoChars}</span>
                        </span>`;
            }
        }
        
        return bopo;
    }).join('');
}



// 使其回傳過濾後的陣列而不只是修改全域
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


function renderMain(isManual = false) {
    document.body.className = appData.theme;

    const heightMap = { 'small': '240px', 'medium': '330px', 'large': '500px' };
    document.documentElement.style.setProperty('--card-height', heightMap[appData.cardHeight || 'large']);    

    document.documentElement.style.setProperty('--fs-main', appData.fsMain + 'px');
    document.documentElement.style.setProperty('--fs-set', appData.fsSet + 'px');
    document.documentElement.style.setProperty('--fs-edit', appData.fsEdit + 'px');
    const mb = document.getElementById('mainBoard');
    mb.style.gridTemplateColumns = `repeat(${appData.cols}, 1fr)`;
    mb.dir = appData.direction;

// --- 修正點：只有在非手動調整時才自動計算起點 ---
    if (!isManual) {
        const calculatedStart = getCalculatedStartDate();
        appData.mainStartDate = calculatedStart; 
        document.getElementById('mainStartDatePicker').value = calculatedStart;
    } else {
        // 如果是手動選取的，確保 picker 顯示的是手動選的那天
        document.getElementById('mainStartDatePicker').value = appData.mainStartDate;
    }

    const filtered = appData.tasks.filter(t => {
        if(t.date < appData.mainStartDate) return false;
        if(appData.weekendMode === 'sat') return t.day !== '日';
        if(appData.weekendMode === 'none') return t.day !== '六' && t.day !== '日';
        return true;
    }).slice(0, appData.mainShowCount);

mb.innerHTML = filtered.map(item => {
        const isVertical = appData.writingMode === 'vertical-rl';
        const listClass = isVertical ? 'writing-vertical' : '';
        
        return `
            <div class="day-card">
                <h3>${item.date.split('-').slice(1).join('/')}(${item.day})</h3>
                <ul class="${listClass}">${item.list.map(t => 
                    // 注意：這裡直接輸出 HTML，不需要另外處理文字對齊
                    `<li>${applyBopoTransform(t)}</li>`
                ).join('')}</ul>
            </div>
        `;
    }).join('');

    
    // 應用方向
    mb.dir = appData.direction;
}


    
function ensureEditDaysExist(startDateStr) {
    // 固定只自動補 7 天，其餘交給手動按鈕
    const autoDays = 7; 
    let currentD = new Date(startDateStr);
    
    for (let i = 0; i < autoDays; i++) {
        const dateStr = currentD.toISOString().split('T')[0];
        let exist = tempTasks.find(t => t.date === dateStr);
        
        if (!exist) {
            const dayName = "日一二三四五六"[currentD.getDay()];
            tempTasks.push({
                date: dateStr,
                day: dayName,
                list: (dayName === '六' || dayName === '日') ? ["假日"] : []
            });
        }
        currentD.setDate(currentD.getDate() + 1);
    }
    // 排序確保顯示正確
    tempTasks.sort((a, b) => a.date.localeCompare(b.date));
}


// 編修核心函數
function openEdit() {
    // 1. 複製目前的資料
    tempTasks = JSON.parse(JSON.stringify(appData.tasks || []));
    
    // 2. 設定編修起始日期（預設為今天）
    const todayStr = new Date().toISOString().split('T')[0];
    const datePicker = document.getElementById('editStartDatePicker');
    if (datePicker) datePicker.value = todayStr;
    
    // 3. 【關鍵】執行自動補齊邏輯
    ensureEditDaysExist(todayStr);
    
    // 4. 渲染與顯示
    renderEdit();
    document.getElementById('editModal').style.display = 'block';
}

function renderEdit() {
    const eb = document.getElementById('editBoard');
    if (!eb) return;
    
    const startD = document.getElementById('editStartDatePicker').value;
    const showCount = parseInt(appData.editShowCount) || 28;
    eb.style.gridTemplateColumns = `repeat(${appData.editCols}, 1fr)`;

    // 確保切換日期時，如果該日期之後是空的也會自動補齊
    ensureEditDaysExist(startD);

    // 篩選出從選定日期開始的顯示範圍
    let startIdx = tempTasks.findIndex(t => t.date >= startD);
    if (startIdx === -1) startIdx = 0;
    
    const displayList = tempTasks.slice(startIdx, startIdx + showCount);

    eb.innerHTML = displayList.map((item, localIdx) => {
        const gIdx = tempTasks.findIndex(t => t.date === item.date); // 取得在 tempTasks 中的真實索引
        const validList = (item.list || []).filter(t => t && t.trim());
        const dateParts = item.date.split('-');
        const shortDate = `${dateParts[1]}/${dateParts[2]}`;

        return `
        <div class="edit-card" ondragover="event.preventDefault()" ondrop="dropM(${gIdx})">
            <div class="edit-header" draggable="true" ondragstart="dragM(${gIdx})">
                <div class="edit-header-title">${shortDate}(${item.day})</div>
                <span class="edit-del-btn" onclick="delDay(${gIdx})">✕</span>
            </div>
            <ul class="edit-task-list" style="flex:1; overflow-y:auto; list-style:none; padding:0; margin:5px 0">
                ${validList.map((t, ti) => `
                    <li class="task-box" draggable="true" 
                        ondragstart="dragT(event,${gIdx},${ti})" 
                        ondrop="dropT(event,${gIdx},${ti})">
                        ${t} <span onclick="delT(${gIdx},${ti})" style="cursor:pointer">✕</span>
                    </li>`).join('')}
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



function updateDateChainAndReorder(startIndex) {
    let pool = [];
    // 紀錄原本所有「日」結尾的作業與其日期的對應關係
    let lockedDays = {}; 
    
    // A. 提取資料：區分「固定項」與「待分配池」
    for (let i = 0; i < tempTasks.length; i++) {
        const item = tempTasks[i];
        const holidayTask = item.list.find(t => t && t.endsWith("日"));

        if (holidayTask) {
            // 如果這天有「日」結尾作業，記錄這天的日期內容，不放進 pool
            lockedDays[item.date] = holidayTask;
        }

        // 只有在操作起點之後的「普通作業」才需要重新分配
        if (i >= startIndex) {
            if (!holidayTask) {
                const normalTasks = item.list.filter(t => t && t.trim() !== "");
                pool.push(normalTasks.length > 0 ? normalTasks : null);
            }
            // 先清空，後面根據鎖定狀態或 pool 重新填入
            tempTasks[i].list = [];
        }
    }

    // B. 重新校正日期與星期，並填回「鎖定項」
    for (let i = Math.max(0, startIndex); i < tempTasks.length; i++) {
        if (i > 0) {
            let prev = new Date(tempTasks[i-1].date);
            prev.setDate(prev.getDate() + 1);
            tempTasks[i].date = prev.toISOString().split('T')[0];
            tempTasks[i].day = "日一二三四五六"[prev.getDay()];
        }
        
        const currentDate = tempTasks[i].date;
        const currentDay = tempTasks[i].day;

        // 檢查此日期是否有原本鎖定的作業
        if (lockedDays[currentDate]) {
            tempTasks[i].list = [lockedDays[currentDate]];
        } 
        // 如果是新日期且為六日，且該處無鎖定，則補預設「假日」
        else if ((currentDay === '六' || currentDay === '日') && tempTasks[i].list.length === 0) {
            tempTasks[i].list = ["假日"];
        }
    }

    // C. 將作業池填回「非鎖定」且「非假日」的格子
    let poolIdx = 0;
    for (let i = startIndex; i < tempTasks.length; i++) {
        // 如果這格已經有「日」結尾的作業（包含原本鎖定的或剛補的假日），跳過不填入作業
        if (tempTasks[i].list.some(t => t && t.endsWith("日"))) continue;
        
        if (poolIdx < pool.length) {
            const tasksForThisDay = pool[poolIdx];
            if (tasksForThisDay !== null) {
                tempTasks[i].list = [...tasksForThisDay];
            }
            poolIdx++;
        }
    }

    // D. 處理溢出區 (如果作業池還有剩，自動長出新日期)
    while (poolIdx < pool.length) {
        let last = tempTasks[tempTasks.length - 1];
        let d = new Date(last.date);
        d.setDate(d.getDate() + 1);
        
        let newDayDate = d.toISOString().split('T')[0];
        let newDayWeek = "日一二三四五六"[d.getDay()];
        let newList = [];
        
        // 檢查新日期是否剛好碰到原本記錄的鎖定日
        if (lockedDays[newDayDate]) {
            newList = [lockedDays[newDayDate]];
        } else if (newDayWeek === '六' || newDayWeek === '日') {
            newList = ["假日"];
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



// 修改 executeFullShift 函數
function executeFullShift(startIdx, taskName, keyword) {
    let currentCarrier = taskName; 
    for (let i = startIdx; i < tempTasks.length; i++) {
        // --- 修改點：遇到最後一個字為 "日" 的項目排除推移 ---
        if (tempTasks[i].list.some(t => t && t.endsWith("日"))) continue;

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
        
        if (newDayWeek === '六' || newDayWeek === '日') {
            newList.push("假日");
        }
        
        let newDay = {
            date: newDayDate,
            day: newDayWeek,
            list: newList
        };
        
        tempTasks.push(newDay);
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
    if(type==='pre') {
        selectedPre.has(val) ? selectedPre.delete(val) : selectedPre.add(val);
    } else if(type==='main') {
        selectedMain.has(val) ? selectedMain.delete(val) : selectedMain.add(val);
    } else if(type==='post') {
        // --- 修改這裡：從 = 改成 += (累加) ---
        const input = document.getElementById('taskFinalInput');
        // 如果原本已經有字，先加個空格再累加
        input.value = input.value + val; 
 
    }
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
    else if(type === 'bopo') {
        document.getElementById('bopoMap').value = DEFAULT_VALS.bopoMap;
    }
    
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
    appData.writingMode = document.getElementById('writingModeSelect').value;
    appData.displayMode = document.getElementById('displayModeSelect').value;
    appData.bopoMap = document.getElementById('bopoMap').value;
    appData.binId = d.getElementById('binId').value.trim();
    appData.apiKey = d.getElementById('apiKey').value.trim()


    performAutoDelete();
    localStorage.setItem('homework_v1', JSON.stringify(appData));
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
    document.getElementById('writingModeSelect').value = appData.writingMode || 'horizontal-tb';
    document.getElementById('displayModeSelect').value = appData.displayMode || 'text';
    d.getElementById('bopoMap').value = appData.bopoMap || DEFAULT_VALS.bopoMap;    
    document.getElementById('binId').value = appData.binId || '';
    document.getElementById('apiKey').value = appData.apiKey || '';
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
    localStorage.setItem('homework_v1', JSON.stringify(appData)); 
    renderMain(); 
    closeModal('editModal'); 
}


// 雲端同步核心：自動辨別服務商
async function cloudSync(method = 'UPLOAD') {
    const { binId, apiKey } = appData;
    if (!binId || !apiKey) return alert("請先填寫雲端設定 (URL 與 Token)");

    const isUpstash = binId.includes('upstash.io');
    const storageKey = 'homework_v1'; 

    try {
        if (method === 'UPLOAD') {
            if (!confirm("確定要將【本地資料】上傳至雲端嗎？\n注意：這會覆蓋雲端的資料。")) return;
            
            // 複製一份資料進行清理，不要影響到目前的 appData
            const uploadData = JSON.parse(JSON.stringify(appData));
            delete uploadData.binId;
            delete uploadData.apiKey;

            let response;
            if (isUpstash) {
                // Upstash: 資料必須轉成字串存入
                response = await fetch(`${binId}/set/${storageKey}`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${apiKey}` },
                    body: JSON.stringify(uploadData)
                });
            } else {
                // JSONBin
                response = await fetch(`https://api.jsonbin.io/v3/b/${binId}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Access-Key': apiKey
                    },
                    body: JSON.stringify(uploadData)
                });
            }

            if (response.ok) alert("✅ 雲端備份成功！");
            else alert("❌ 上傳失敗，請檢查 Key 權限。");

        } else if (method === 'DOWNLOAD') {
            if (!confirm("確定從雲端下載資料嗎？\n這將覆蓋現在的所有資料。")) return;

            let fetchedData = null;

            if (isUpstash) {
                const response = await fetch(`${binId}/get/${storageKey}`, {
                    headers: { 'Authorization': `Bearer ${apiKey}` }
                });
                const res = await response.json();
                
                // 關鍵：Upstash 取回後需解析 result 欄位
                if (res && res.result) {
                    try {
                        fetchedData = JSON.parse(res.result);
                    } catch (e) {
                        console.error("解析雲端 JSON 失敗", e);
                    }
                }
            } else {
                const response = await fetch(`https://api.jsonbin.io/v3/b/${binId}/latest`, {
                    headers: { 'X-Access-Key': apiKey }
                });
                const res = await response.json();
                fetchedData = res.record;
            }

            if (fetchedData && typeof fetchedData === 'object') {
                // 1. 保留目前的連線設定，避免下載後欄位變空白
                fetchedData.binId = binId;
                fetchedData.apiKey = apiKey;

                // 2. 使用結構擴展 (Spread) 確保新舊版本欄位都能補齊
                appData = { ...appData, ...fetchedData };

                // 3. 立即存入本地端並重新整理
                localStorage.setItem('homework_v1', JSON.stringify(appData));
                alert("✨ 載入成功！");
                location.reload();
            } else {
                alert("❌ 載入失敗：雲端似乎沒有資料，或資料格式不正確。");
            }
        }
    } catch (e) {
        console.error(e);
        alert("連線出錯：" + e.message);
    }
}

function closeModal(id) { document.getElementById(id).style.display = 'none'; }

// 尋找 script.js 中的 updateMainStartDate 並修改如下
function updateMainStartDate() { 
    const selectedDate = document.getElementById('mainStartDatePicker').value;
    appData.mainStartDate = selectedDate; 
    // 強制執行渲染
    renderMain(true); 
}


function resetApp() {
    if (confirm("確定要重置此專案的資料嗎？")) {
        localStorage.removeItem('homework_v1');
        
        location.reload();
    }
}

function exportJSON() {
    const blob = new Blob([JSON.stringify(appData, null, 2)], {type: 'application/json'});
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = `homework_${new Date().toISOString().split('T')[0]}.json`; a.click();
}
function importJSON(e) {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = function(evt) {
        try { appData = JSON.parse(evt.target.result); localStorage.setItem('homework_v1', JSON.stringify(appData)); renderMain(); alert("匯入成功"); }
        catch(err) { alert("格式錯誤"); }
    };
    reader.readAsText(file);
}

// 專門重置 Bin ID 或 API Key 的畫面欄位
function resetBinField(targetId) {
    if(confirm("確定要清除此欄位的內容嗎？")) {
        document.getElementById(targetId).value = '';
    }
}

init();
