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
    tasks: {},
    startDayType: 'monday', // 新增：可選 'monday', 'sunday', 'today'
    cardHeight: 'large', // 新增：可選 'small', 'medium', 'large'
    completionRecord: 'yesterday',
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

let tempPreviewList = []; 

function previewSchedule() {
    const startDateVal = document.getElementById('smartStartDate').value;
    const prefix = document.getElementById('smartPrefix').value.trim();
    const startNum = parseInt(document.getElementById('smartStartNum').value) || 1;
    const padding = parseInt(document.getElementById('smartPadding').value);
    const suffix = document.getElementById('smartSuffix').value;
    const countPerDay = parseInt(document.getElementById('smartCountPerDay').value) || 1;
    const totalTimes = parseInt(document.getElementById('smartTotalTimes').value) || 1;
    const intervalDays = parseInt(document.getElementById('smartIntervalDays').value) || 1;
    
    // 取得勾選的星期 (1-7)
    const allowedDays = Array.from(document.querySelectorAll('.weekDay:checked')).map(el => parseInt(el.value));
    
    if (!startDateVal || !prefix) { alert("請選擇日期與輸入唯一作業名稱"); return; }

    let currDate = new Date(startDateVal);
    let currNum = startNum;
    let successCount = 0;   // 成功排入作業的次數
    let intervalCounter = 0; // 用來處理「每隔幾天」的計數器
    
    tempPreviewList = [];

    // 迴圈直到達到使用者要求的「總共幾次」
    while (successCount < totalTimes) {
        let dateStr = currDate.toISOString().split('T')[0];
        let dayOfWeek = currDate.getDay(); 
        let dayKey = (dayOfWeek === 0) ? 7 : dayOfWeek; // 轉為 1(一) 到 7(日)

        // A. 先判斷是否為固定假日 (六日)
        if (dayOfWeek === 0 || dayOfWeek === 6) {
            tempPreviewList.push({ date: dateStr, text: "假日", isSkip: true });
        } 
        // B. 判斷是否符合使用者勾選的「派發週期」或「日」字規則
        else if (!allowedDays.includes(dayKey) || prefix.endsWith('日')) {
            tempPreviewList.push({ date: dateStr, text: "跳過 (非派發日)", isSkip: true });
        } 
        // C. 是工作日，處理「每隔幾天」邏輯
        else {
            if (intervalCounter === 0) {
                // 真正排入作業
                const formatNum = (n) => String(n).padStart(padding === 1 ? 0 : padding, '0');
                let taskText = "";
                if (countPerDay > 1) {
                    taskText = `${prefix}${formatNum(currNum)}~${formatNum(currNum + countPerDay - 1)}${suffix}`;
                    currNum += countPerDay;
                } else {
                    taskText = `${prefix}${formatNum(currNum)}${suffix}`;
                    currNum += 1;
                }

                tempPreviewList.push({ date: dateStr, text: taskText, isSkip: false });
                successCount++;
                intervalCounter = intervalDays - 1; // 設定下一次要跳過的次數
            } else {
                // 這是因為「每隔幾天」產生的間隔跳過
                tempPreviewList.push({ date: dateStr, text: "間隔跳過", isSkip: true });
                intervalCounter--;
            }
        }
        
        // 日期強迫往後推一天
        currDate.setDate(currDate.getDate() + 1);

        // 安全機制：避免無窮迴圈（例如沒勾任何日子）
        if (tempPreviewList.length > 500) break; 
    }
    renderPreview();
}


function saveData() {
    try {
        // 強制檢查：如果 tasks 還是陣列，轉為物件，否則 JSON 存不進日期 Key
        if (Array.isArray(appData.tasks)) {
            const newObj = {};
            // 如果原本陣列裡有舊資料，試著搬移（通常陣列狀態下是空的）
            appData.tasks = newObj;
        }

        // 統一儲存到 homework_v1，與 init() 保持一致
        localStorage.setItem('homework_v1', JSON.stringify(appData));
        console.log("資料已成功儲存至 homework_v1", appData.tasks);
    } catch (e) {
        console.error("儲存失敗", e);
    }
}


function renderPreview() {
    const container = document.getElementById('previewContainer');
    if (tempPreviewList.length === 0) {
        container.innerHTML = '<div style="text-align:center;color:#999;margin-top:20px;">請設定參數後按「產生預覽」</div>';
        return;
    }

    let html = '';
    tempPreviewList.forEach((item, index) => {
        const isHoliday = item.isSkip;
        // 加入 draggable 與相關事件
        html += `
            <div class="preview-item" 
                 style="display:flex; align-items:center; gap:8px; padding:5px; border-bottom:1px solid #eee; background: ${isHoliday ? '#f9f9f9' : '#fff'}; cursor: move;"
                 draggable="true"
                 ondragstart="dragPreview(event, ${index})"
                 ondragover="allowDropPreview(event)"
                 ondrop="dropPreview(event, ${index})">
                
                <b style="width:100px; font-size:0.9rem; pointer-events: none;">${item.date}</b>
                
                <input type="text" 
                       value="${item.text}" 
                       style="flex:1; padding:4px; border:1px solid #ccc; border-radius:4px; ${isHoliday ? 'color:#999; border:none; background:transparent;' : ''}"
                       onchange="tempPreviewList[index].text = this.value"
                       draggable="false"> <div style="display:flex; gap:2px; pointer-events: none;">
                    <small style="color:#666;">${getDayName(item.date)}</small>
                </div>
            </div>
        `;
    });
    container.innerHTML = html;
}


let draggedPreviewIndex = null;

// 開始拖曳時記錄索引
function dragPreview(event, index) {
    draggedPreviewIndex = index;
    event.dataTransfer.setData("text/plain", index);
    event.target.style.opacity = "0.5"; // 拖曳中的視覺效果
}

// 允許放置
function allowDropPreview(event) {
    event.preventDefault();
}

// 放下時交換內容
function dropPreview(event, targetIndex) {
    event.preventDefault();
    if (draggedPreviewIndex === null || draggedPreviewIndex === targetIndex) return;

    // 交換 tempPreviewList 中的 text 與 isSkip (保持日期不動)
    const sourceData = tempPreviewList[draggedPreviewIndex];
    const targetData = tempPreviewList[targetIndex];

    const tempText = sourceData.text;
    const tempSkip = sourceData.isSkip;

    sourceData.text = targetData.text;
    sourceData.isSkip = targetData.isSkip;

    targetData.text = tempText;
    targetData.isSkip = tempSkip;

    // 重設狀態並刷新畫面
    draggedPreviewIndex = null;
    renderPreview();
}


// 輔助：取得星期幾名稱
function getDayName(dateString) {
    const days = ['日', '一', '二', '三', '四', '五', '六'];
    return days[new Date(dateString).getDay()];
}


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
            
            return `<span class="bopo-vertical-item">
                            <span class="bopo-tone">${tone}</span>
                            <span class="bopo-chars">${bopoChars}</span>
                        </span>`;            
            
        }
        
        return bopo;
    }).join('');
}



function performAutoDelete() {
    const days = parseInt(appData.autoDeleteDays);
    if (days === 0 || Array.isArray(appData.tasks)) return; 

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    const cutoffStr = cutoffDate.toISOString().split('T')[0];

    let deleted = false;
    for (let dateKey in appData.tasks) {
        if (dateKey < cutoffStr) {
            delete appData.tasks[dateKey];
            deleted = true;
        }
    }
    
    if (deleted) {
        saveData();
        console.log(`已自動刪除過期作業`);
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

    // --- 修正點 1：處理起始日期 ---
    if (!isManual) {
        const calculatedStart = getCalculatedStartDate();
        appData.mainStartDate = calculatedStart; 
        document.getElementById('mainStartDatePicker').value = calculatedStart;
    } else {
        document.getElementById('mainStartDatePicker').value = appData.mainStartDate;
    }

    // --- 修正點 2：將物件格式的 tasks 轉換為可篩選的陣列 ---
    let taskArray = [];
    if (appData.tasks && typeof appData.tasks === 'object' && !Array.isArray(appData.tasks)) {
        // 將 { "2026-03-30": [...] } 轉為 [ {date: "2026-03-30", list: [...]}, ... ]
        taskArray = Object.keys(appData.tasks).map(date => {
            const d = new Date(date);
            return {
                date: date,
                day: "日一二三四五六"[d.getDay()],
                list: appData.tasks[date]
            };
        });
    } else {
        // 保險起見，如果還是陣列則直接使用
        taskArray = Array.isArray(appData.tasks) ? appData.tasks : [];
    }

    // 確保日期排序正確
    taskArray.sort((a, b) => a.date.localeCompare(b.date));

    // --- 修正點 3：執行篩選邏輯 ---
    const filtered = taskArray.filter(t => {
        if (t.date < appData.mainStartDate) return false;
        if (appData.weekendMode === 'sat') return t.day !== '日';
        if (appData.weekendMode === 'none') return t.day !== '六' && t.day !== '日';
        return true;
    }).slice(0, appData.mainShowCount);

    // --- 渲染 HTML ---
    mb.innerHTML = filtered.map(item => {
        const isVertical = appData.writingMode === 'vertical-rl';
        const listClass = isVertical ? 'writing-vertical' : '';
        
        const styleMap = {
            'disc': '●',
            'circle': '○',
            'square': '■',
            'hollow-square': '□',
            'diamond': '◆',
            'dash': '-',
            'decimal': '' 
        };
        
        const symbol = styleMap[appData.listStyle || 'decimal'];

        return `
            <div class="day-card">
                <h3>${item.date.split('-').slice(1).join('/')}(${item.day})</h3>
                <ul class="${listClass}">${item.list.map((t, idx) => {
                    let prefix = "";
                    if (appData.listStyle === 'decimal') {
                        prefix = isVertical ? `${idx + 1}` : `${idx + 1}.`;
                    } else {
                        prefix = symbol;
                    }
                    const fullText = prefix + t;
                    return `<li>${applyBopoTransform(fullText)}</li>`;
                }).join('')}</ul>
            </div>
        `;
    }).join('');

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


function openEdit() {
    // 修正：使用 JSON 序列化進行深拷貝，切斷與 appData.tasks 的引用關係
    const rawTasks = JSON.parse(JSON.stringify(appData.tasks || {}));
    
    // 將物件轉為陣列供編輯器使用
    tempTasks = Object.keys(rawTasks).map(date => ({
        date: date,
        day: "日一二三四五六"[new Date(date).getDay()],
        list: rawTasks[date]
    })).sort((a, b) => a.date.localeCompare(b.date));

    // 設定起點日期
    const todayStr = new Date().toISOString().split('T')[0];
    document.getElementById('editStartDatePicker').value = todayStr;

    ensureEditDaysExist(todayStr);
    renderEdit();
    document.getElementById('editModal').style.display = 'block';
}

function renderEdit() {
    const eb = document.getElementById('editBoard');
    if (!eb) return;
    
    const startD = document.getElementById('editStartDatePicker').value;
    const showCount = parseInt(appData.editShowCount) || 28;
    eb.style.gridTemplateColumns = `repeat(${appData.editCols}, 1fr)`;

    // 確保切換日期時，自動補齊
    ensureEditDaysExist(startD);

    // 篩選出顯示範圍
    let startIdx = tempTasks.findIndex(t => t.date >= startD);
    if (startIdx === -1) startIdx = 0;
    
    const displayList = tempTasks.slice(startIdx, startIdx + showCount);

    eb.innerHTML = displayList.map((item) => {
        const gIdx = tempTasks.findIndex(t => t.date === item.date); // 真實索引
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
                        ondrop="dropT(event,${gIdx},${ti})"
                        ondblclick="editTaskName(${gIdx}, ${ti})"
                        title="雙點擊可修改作業內容"
                        style="cursor: pointer;">
                        ${t} <span onclick="delT(${gIdx},${ti})" style="cursor:pointer; margin-left:5px">✕</span>
                    </li>`).join('')}
            </ul>
            <div style="display:flex; gap:2px">
                <button onclick="prepT(${gIdx})" style="flex:1">新增</button>
                <button onclick="insD(${gIdx})" style="flex:1">加一天</button>
            </div>
        </div>`;
    }).join('');
    
    if (typeof updateLastCompletionUI === 'function') {
        updateLastCompletionUI(); 
    }
}

/**
 * 雙擊修改作業內容
 * @param {number} gIdx - 在 tempTasks 中的日期索引
 * @param {number} ti - 作業在該日期列表中的索引
 */
function editTaskName(gIdx, ti) {
    const oldVal = tempTasks[gIdx].list[ti];
    const newVal = prompt("請輸入修改後的作業內容：", oldVal);

    // 檢查使用者是否有輸入新內容，且不為 null (取消)
    if (newVal !== null) {
        const trimmedVal = newVal.trim();
        if (trimmedVal !== "" && trimmedVal !== oldVal) {
            // 更新暫存資料
            tempTasks[gIdx].list[ti] = trimmedVal;
            // 重新渲染編輯畫面
            renderEdit();
            console.log(`已修改索引 ${gIdx}-${ti} 的作業為: ${trimmedVal}`);
        } else if (trimmedVal === "") {
            // 如果輸入空白，詢問是否刪除
            if (confirm("內容為空，是否要刪除此項作業？")) {
                delT(gIdx, ti);
            }
        }
    }
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
    if(dragInfo.type === 'M') {
        [tempTasks[dragInfo.idx].list, tempTasks[toMi].list] = [tempTasks[toMi].list, tempTasks[dragInfo.idx].list];
    } else {
        tempTasks[toMi].list.push(tempTasks[dragInfo.mi].list.splice(dragInfo.ti, 1)[0]);
    }
    renderEdit(); 
    updateLastCompletionUI();
    dragInfo = null;
}

function dropT(e, toMi, toTi) {
    e.stopPropagation();
    if(dragInfo && dragInfo.type === 'T') {
        [tempTasks[dragInfo.mi].list[dragInfo.ti], tempTasks[toMi].list[toTi]] = [tempTasks[toMi].list[toTi], tempTasks[dragInfo.mi].list[dragInfo.ti]];
    }
    renderEdit(); 
    updateLastCompletionUI();
    dragInfo = null;
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



function executeFullShift(startDayIdx, newTask, matchKey, oldTaskContent) {
    let dayIdx = startDayIdx;
    let taskToPush = newTask;
    let taskToBeDisplaced = oldTaskContent;

    while (dayIdx < tempTasks.length) {
        const currentList = tempTasks[dayIdx].list;
        
        // 在當天尋找跟 matchKey 匹配的作業
        const targetInDay = currentList.findIndex(t => t.startsWith(matchKey));

        if (targetInDay !== -1) {
            // 備份當天那個要被擠走的東西，供明天使用
            const nextDisplaced = currentList[targetInDay];
            
            // 把今天的新東西塞入那個位置
            currentList[targetInDay] = taskToPush;
            
            // 準備處理明天：明天要塞入的東西就是今天被擠走的東西
            taskToPush = nextDisplaced;
            
            // 跳到下一天 (需避開假日邏輯)
            dayIdx = getNextValidWorkDayIdx(dayIdx);
        } else {
            // 如果這天沒有同類型的作業，就直接把擠過來的東西加在最後面，然後結束推移
            currentList.push(taskToPush);
            break;
        }
    }
}

function getNextValidWorkDayIdx(currentIdx) {
    let nextIdx = currentIdx + 1;
    while (nextIdx < tempTasks.length) {
        const item = tempTasks[nextIdx];
        const isWeekend = (item.day === '六' || item.day === '日');
        const isManualHoliday = item.list.some(t => typeof t === 'string' && t.endsWith('日'));
        
        if (!isWeekend && !isManualHoliday) return nextIdx;
        nextIdx++;
    }
    return nextIdx;
}


// 新增作業 UI
function prepT(idx) {
    targetIdx = idx; // 記錄目前是哪一天要新增
    selectedPre.clear(); 
    selectedMain.clear();
    document.getElementById('taskFinalInput').value = '';
    renderTags(); // 渲染那些 國習、數習 等標籤
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
    const preStr = Array.from(selectedPre).join('');   
    const mainStr = Array.from(selectedMain).join(''); 
    const subStr = document.getElementById('taskFinalInput').value.trim(); 
    
    const final = (preStr + mainStr + subStr).trim();
    const matchKey = (preStr + mainStr).trim(); // 比對關鍵：前置 + 唯一作業

    if (final && targetIdx !== -1) {
        const tasksForDay = tempTasks[targetIdx].list;
        
        // 找到當天「第一個」符合前置+唯一作業的具體內容
        const existingIdx = tasksForDay.findIndex(t => 
            matchKey !== "" && typeof t === 'string' && t.startsWith(matchKey)
        );

        if (existingIdx !== -1) {
            const currentTaskContent = tasksForDay[existingIdx]; // 這是被撞到的那個作業
            
            if (currentTaskContent !== final) {
                if (confirm(`日期 ${tempTasks[targetIdx].date} 已有相同類型作業：「${currentTaskContent}」\n\n按【確定】：取代並將「${currentTaskContent}」推移至隔日\n按【取消】：直接新增但不推移`)) {
                    
                    // 關鍵修改：傳入 currentTaskContent (舊內容) 而非只傳 keyword
                    executeFullShift(targetIdx, final, matchKey, currentTaskContent);
                } else {
                    tempTasks[targetIdx].list.push(final);
                }
            }
        } else {
            tempTasks[targetIdx].list.push(final);
        }
        
        renderEdit(); 
        closeModal('taskPromptModal');
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
    appData.completionRecord = document.getElementById('completionRecordSelect').value;
    appData.listStyle = document.getElementById('listStyleSelect').value;
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
    document.getElementById('listStyleSelect').value = appData.listStyle || 'decimal';
    document.getElementById('completionRecordSelect').value = appData.completionRecord || 'yesterday';
    document.getElementById('settingsModal').style.display = 'block';
}

function saveEdit() {
    // 將 tempTasks (陣列) 轉回 appData.tasks (物件)
    const newTasksObj = {};
    tempTasks.forEach(item => {
        newTasksObj[item.date] = item.list;
    });
    appData.tasks = newTasksObj;

    // 真正的寫入 LocalStorage
    saveData(); 
    
    renderMain(true);
    closeModal('editModal');
}


// 計算最後完成紀錄 (排除含「日」項目，依序向前找)
function updateLastCompletionUI() {
    const statusDiv = document.getElementById('lastCompletionStatus');
    if (!statusDiv) return;

    // 1. 取得模式與標籤
    const mode = appData.completionRecord || 'current';
    const labels = {
        'yesterday': '昨日完成：',
        'today': '今日完成：',
        'current': '當前進度：',
        'future': '最新作業：'
    };
    const labelText = labels[mode] || "完成紀錄：";

    // 2. 決定搜尋起點日期 (searchDateStr)
    let searchDateStr;
    const todayStr = new Date().toISOString().split('T')[0];

    if (mode === 'yesterday') {
        let d = new Date();
        d.setDate(d.getDate() - 1);
        searchDateStr = d.toISOString().split('T')[0];
    } else if (mode === 'today') {
        searchDateStr = todayStr;
    } else if (mode === 'current') {
        // 以編修視窗選定的日期為基準
        searchDateStr = document.getElementById('editStartDatePicker')?.value || todayStr;
    } else if (mode === 'future') {
        // 未來模式：不設上限，從最遠的日期開始找
        searchDateStr = '9999-12-31'; 
    }

    // 3. 取得要比對的大項 (排除含「日」項目)
    let targetCategories = [];
    if (Array.isArray(appData.mainTasks)) {
        targetCategories = appData.mainTasks.filter(name => !name.includes("日"));
    }

    let finalDisplay = [];
    const dataSource = (typeof tempTasks !== 'undefined' && tempTasks.length > 0) ? tempTasks : appData.tasks;

    // 4. 執行搜尋
    targetCategories.forEach(category => {
        // 過濾出符合時間範圍的作業，並依日期由新到舊排序
        const sortedDays = dataSource
            .filter(d => d.date <= searchDateStr)
            .sort((a, b) => b.date.localeCompare(a.date));

        for (let day of sortedDays) {
            const foundTask = day.list.find(t => t.includes(category));
            if (foundTask) {
                finalDisplay.push(foundTask);
                break; 
            }
        }
    });

    // 5. 格式化渲染
    if (finalDisplay.length > 0) {
        const coloredItems = finalDisplay.map(item => `<span style="color:#EA0000; font-weight:bold;">${item}</span>`);
        const blueSeparator = `<span style="color:#0000FF; font-weight:bold; margin: 0 5px;">|</span>`;
        statusDiv.innerHTML = `<span style="color:#8600FF;">${labelText}</span> ` + coloredItems.join(blueSeparator);
    } else {
        statusDiv.innerHTML = `<span style="color:#8600FF;">${labelText}</span> <span style="color:#999; font-weight:normal;">(尚無紀錄)</span>`;
    }
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

function closeModal(id) {
    document.getElementById(id).style.display = 'none';
    if (id === 'editModal') {
        // 重新從 localStorage 載入，確保資料是最乾淨的
        const savedData = localStorage.getItem('homework_v1');
        if (savedData) {
            appData = JSON.parse(savedData);
        }
        renderMain(true); // 強制還原主頁
    }
}

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

function hasCloudConfig() {
    // 請確認這行代碼是否符合您儲存設定的方式
    // 例如：localStorage 中是否有設定雲端帳號或 Token
    return !!localStorage.getItem('cloud_token'); 
}

// --- 核心邏輯修正 ---

function hasCloudConfig() {
    // 讀取當前儲存的資料
    const savedData = localStorage.getItem('homework_v1');
    if (!savedData) return false;
    
    try {
        const data = JSON.parse(savedData);
        // 檢查 appData 裡的這兩個欄位是否有值
        return (data.binId && data.binId.trim() !== "") && 
               (data.apiKey && data.apiKey.trim() !== "");
    } catch (e) {
        return false;
    }
}

// --- 修復後的標準選單邏輯 ---

window.handleLoadAction = function(event) {
    if (event) event.stopPropagation();

    // 檢查是否有雲端設定
    if (!hasCloudConfig()) {
        // 直接觸發本地匯入 (請確認您的匯入函式名稱是 importJSON 還是 fileImport)
        document.getElementById('fileInput').click(); 
    } else {
        // 有雲端資料，顯示選單
        const loadMenu = document.getElementById("load-menu");
        const saveMenu = document.getElementById("save-menu");
        
        if (saveMenu) saveMenu.classList.remove("show"); // 關閉另一個選單
        if (loadMenu) loadMenu.classList.toggle("show"); // 切換自己
    }
}

window.handleSaveAction = function(event) {
    if (event) event.stopPropagation();

    // 檢查是否有雲端設定
    if (!hasCloudConfig()) {
        // 直接執行匯出 (請確認您的匯出函式名稱是 exportJSON)
        exportJSON();
    } else {
        // 有雲端資料，顯示選單
        const saveMenu = document.getElementById("save-menu");
        const loadMenu = document.getElementById("load-menu");
        
        if (loadMenu) loadMenu.classList.remove("show"); // 關閉另一個選單
        if (saveMenu) saveMenu.classList.toggle("show"); // 切換自己
    }
}


function openSmartModal() {
    document.getElementById('smartScheduleModal').style.display = 'block';
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('smartStartDate').value = today;

    const tagContainer = document.getElementById('smartTaskTags');
    tagContainer.innerHTML = '';
    
    // --- 修正處：過濾掉最後一個字是「日」的作業 ---
    const filteredTasks = appData.mainTasks.filter(task => !task.endsWith('日'));
    
    filteredTasks.forEach(task => {
        const span = document.createElement('span');
        span.className = 'clickable-tag';
        span.innerText = task;
        span.onclick = function() {
            Array.from(tagContainer.children).forEach(c => c.classList.remove('active'));
            this.classList.add('active');
            document.getElementById('smartPrefix').value = task;
        };
        tagContainer.appendChild(span);
    });
}

// 關閉視窗
function closeSmartModal() {
    document.getElementById('smartScheduleModal').style.display = 'none';
}


function applySchedule() {
    const validItems = tempPreviewList.filter(item => !item.isSkip);
    const prefix = document.getElementById('smartPrefix').value.trim();

    if (validItems.length === 0) return;

    // 注意：這裡不再修改 appData.tasks，只修改 tempTasks
    validItems.forEach(item => {
        const d = item.date;
        const newTaskText = item.text;

        let targetIdx = tempTasks.findIndex(t => t.date === d);
        if (targetIdx === -1) {
            const dayName = "日一二三四五六"[new Date(d).getDay()];
            tempTasks.push({ date: d, day: dayName, list: [] });
            tempTasks.sort((a, b) => a.date.localeCompare(b.date));
            targetIdx = tempTasks.findIndex(t => t.date === d);
        }

        const tasksForDay = tempTasks[targetIdx].list;
        const existingIdx = tasksForDay.findIndex(t => 
            prefix !== "" && typeof t === 'string' && t.startsWith(prefix)
        );
        

        if (existingIdx !== -1) {
            const currentTask = tasksForDay[existingIdx];
            if (currentTask === newTaskText) return; 

            // 詢問推移
            if (confirm(`日期 ${d} 已有作業：「${currentTask}」\n\n按【確定】：取代並將舊作業向後推移\n按【取消】：保留舊作業並將此作業取消`)) {
                executeFullShift(targetIdx, newTaskText, prefix);
            }
        } else {
            tempTasks[targetIdx].list.push(newTaskText);
        }
    });

    // 只刷新預覽，不呼叫 saveData()
    closeSmartModal();
    renderEdit(); 
    
    // 提示使用者尚未存檔
    console.log("智慧預排已加入暫存，請按下編修管理的『確定』以永久儲存。");
}

 
 
// 點擊空白處關閉選單 (確保點擊選單以外的地方會關閉選單)
window.onclick = function(event) {
    if (!event.target.matches('.small-btn')) {
        document.querySelectorAll('.dropdown-content').forEach(menu => {
            menu.classList.remove('show');
        });
    }
}



init();
