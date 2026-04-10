/**
 * Charles Nextime Web Tools Portal - Core Logic
 * * Copyright (c) 2026 Charles Nextime
 * Licensed under the GNU General Public License v3.0
 * * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation.
 */

const DEFAULT_STATE = {
    total: 25, 
    absent: 0,
    theme: 'default',
    cardFontSize: 'medium',
    timeFontSize: 'medium',
    swapPanels: false,
    subjects: [
        { name: '國語', specialRoom: 0 }, 
        { name: '自然', specialRoom: 0 }, 
        { name: '英語', specialRoom: 0 }, 
        { name: '數學', specialRoom: 0 }, 
        { name: '社會', specialRoom: 0 }
    ],
    schedule: [
        { id: Date.now().toString(), subject: '國語', start: '08:40', end: '09:20', audioUrl: null }
    ],
    reminders: { 
        exam: [
    "檢查考卷頁數是否完整，有無缺漏題",
    "題目至少讀兩遍，看清楚是問正確還是錯誤",
    "遇到不會的題目先跳過做記號，最後再回來寫",
    "選擇題要看清楚所有選項，不要只看到很像對的就選",
    "字體寫工整，不要讓閱卷老師猜你的字",
    "數學題計算過程要寫清楚，方便自己檢查",
    "作法或算式要對齊，才不會看錯行",
    "注意題目有沒有單位，記得寫在答案後",
    "應用題看清楚問的是剩下多少還是總共多少",
    "把握簡單的基礎題，不要在難題卡太久",
    "填充題要確認空格數與答案是否符合",
    "閱讀測驗先看問題，再回去文章找答案",
    "最後五分鐘，優先檢查最容易出錯的計算題",
    "考試期間嚴禁交談，有問題一律舉手",
    "眼睛直視自己的考卷，不要隨意張望",
    "保持安靜，收發考卷時不要發出大聲響",
    "不要擺弄手指或敲桌子，以免影響鄰座",
    "即使提早寫完，也不要發出聲音影響他人",
    "檢查時若要翻動紙張，請放輕動作",
    "遵守考場時間，不要爭取最後幾秒強行作答",
    "檢查題目有沒有漏掉沒寫，尤其是背面",
    "再次確認班級、姓名、座號是否寫對",
    "用手指著題目一題一題檢查，不要只用眼掃過",
    "檢查完畢若還有時間，閉目養神讓大腦休息"
        ], 
        break: [
    "確認桌面清理乾淨，只能留文具與規定的物品",
    "鉛筆盒裡多備幾支削好的鉛筆或備用筆芯",
    "檢查橡皮擦是否夠用，不要向同學借",
    "提早去洗手間，避免考試中途想上廁所",
    "把墊板放好，避免書寫時紙張破裂",
    "確認水瓶放在地板上，不要放桌面以免弄濕考卷",
    "拿到卷子先深呼吸三次，讓心情平復下來",
    "雖然覺得辛苦，但請堅持檢查到最後一刻",
    "告訴自己：我準備得很充分，一定沒問題",
    "若有修改答案，務必將舊的痕跡擦乾淨",
    "相信自己的直覺，除非有把握否則不輕易改答案",
    "把考試當成平常練習，保持平常心發揮",
    "考完一科就放下一科，不要急著對答案",
    "每一分都很珍貴，不到最後不輕言放棄",
    "配合監考老師指令，說停筆就立刻停筆",
    "聽清楚監考老師宣佈的作答結束時間"

        ] 
    },
    showReminders: true
};

let state;
let tempState;
const audioPlayers = {}; 

function init() {
    const saved = localStorage.getItem('examBoardState');
    let loadedData = {};
    
    try {
        // 若有存檔則解析，否則給予空物件
        loadedData = saved ? JSON.parse(saved) : {};
    } catch (e) {
        console.error("解析存檔失敗，將使用預設值回原");
    }

    // 1. 建立深拷貝的預設值基底
    const baseState = JSON.parse(JSON.stringify(DEFAULT_STATE));

    // 2. 向後相容核心：結構化合併
    state = {
        ...baseState,       // 先鋪設所有預設欄位
        ...loadedData,      // 覆蓋使用者已存的欄位
        
        // 針對巢狀物件進行「深度補完」，避免舊資料缺少新欄位
        reminders: {
            exam: (loadedData.reminders?.exam && loadedData.reminders.exam.length > 0) 
                  ? loadedData.reminders.exam 
                  : baseState.reminders.exam,
            break: (loadedData.reminders?.break && loadedData.reminders.break.length > 0) 
                   ? loadedData.reminders.break 
                   : baseState.reminders.break
        },

        // 確保 subjects 存在且為陣列 (防止舊版資料格式衝突)
        subjects: Array.isArray(loadedData.subjects) ? loadedData.subjects : baseState.subjects
    };

    // 3. 確保關鍵的 schedule 陣列不為空
    if (!Array.isArray(state.schedule) || state.schedule.length === 0) {
        state.schedule = JSON.parse(JSON.stringify(DEFAULT_STATE.schedule));
    }

    // 4. 初始化 UI 狀態
    // 注意：populateNumberOptions 建議改在 toggleModal(true) 時呼叫
    // 但若要在 init 執行，請確保 HTML 的 ID 已存在
    const inputTotal = document.getElementById('inputTotal');
    const inputAbsent = document.getElementById('inputAbsent');
    if (inputTotal && inputAbsent) {
        populateNumberOptions('inputTotal', 55);
        populateNumberOptions('inputAbsent', 20);
    }
    
    // 5. 套用設定並啟動循環
    applyTheme(state.theme || 'default');
    syncUI();
    updateReminderUI(); 

    // 啟動計時器
    setInterval(updateTime, 1000);
    setInterval(updateReminderUI, 6000);
    
    console.log("系統初始化完成，已套用向後相容邏輯");
}


function applyTheme(themeName) {
    document.body.className = ''; 
    document.body.classList.add(`theme-${themeName}`);
}

function saveToLocal() {
    localStorage.setItem('examBoardState', JSON.stringify(state));
}

function syncUI() {
    document.getElementById('totalCount').innerText = state.total;
    document.getElementById('absentCount').innerText = state.absent;
    
    // Apple specific font sizes and panel swapping layout setting
    document.body.dataset.cardFontSize = state.cardFontSize || 'medium';
    document.body.dataset.timeFontSize = state.timeFontSize || 'medium';
    
    const container = document.querySelector('.app-container');
    if (container) {
        if (state.swapPanels) {
            container.style.flexDirection = 'row-reverse';
        } else {
            // Check if it's mobile view or not; if responsive kick in, the swap should ideally handle it gracefully or be reset.
            // On desktop, default is 'row'.
            container.style.flexDirection = window.innerWidth <= 768 ? 'column' : 'row';
        }
    }
    
    const clock = document.getElementById('clockSection');
    const reminder = document.getElementById('reminderSection');
    const iconBtn = document.getElementById('toggleIcon');
    
    if (state.showReminders) {
        clock.classList.remove('full');
        reminder.style.display = 'flex';
        if (iconBtn) iconBtn.innerText = '🔽';
    } else {
        clock.classList.add('full');
        reminder.style.display = 'none';
        if (iconBtn) iconBtn.innerText = '🔼';
    }
    
    renderSchedule();
}

function updateTime() {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('zh-TW', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const timeDisplay = document.getElementById('timeDisplay');
    if (timeDisplay) timeDisplay.innerText = timeStr;

    const status = checkStatus(now);
    updateActiveCardUI(status);

    Object.keys(audioPlayers).forEach(id => {
        const a = audioPlayers[id];
        const p = document.getElementById(`prog-${id}`);
        if (a && p && a.duration) {
            p.style.width = (a.currentTime / a.duration) * 100 + '%';
        }
    });
}

function checkStatus(now) {
    const currentMin = now.getHours() * 60 + now.getMinutes();
    for (let i = 0; i < state.schedule.length; i++) {
        const s = state.schedule[i];
        if (currentMin >= timeToMin(s.start) && currentMin < timeToMin(s.end)) {
            return { type: 'exam', index: i };
        }
        if (i < state.schedule.length - 1) {
            const nextS = state.schedule[i+1];
            if (currentMin >= timeToMin(s.end) && currentMin < timeToMin(nextS.start)) {
                return { type: 'break' };
            }
        }
    }
    return { type: 'idle' };
}

function timeToMin(t) {
    if (!t) return 0;
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m;
}

function updateReminderUI() {
    if (!state.showReminders) return;
    const status = checkStatus(new Date());
    const list = (status.type === 'exam') ? state.reminders.exam : state.reminders.break;
    const displayElement = document.getElementById('reminderText');
    
    if (displayElement) {
        if (list && list.length > 0) {
            const index = Math.floor(Date.now() / 6000) % list.length;
            displayElement.innerText = list[index];
        } else {
            displayElement.innerText = "祝考試順利！";
        }
    }
}

function toggleReminders() { 
    state.showReminders = !state.showReminders; 
    saveToLocal(); 
    syncUI(); 
    if (state.showReminders) updateReminderUI();
}

function renderSchedule() {
    const container = document.getElementById('scheduleList');
    container.innerHTML = state.schedule.map((item, idx) => {
        const sub = state.subjects.find(s => s.name === item.subject) || { specialRoom: 0 };
        const isPlaying = audioPlayers[item.id] && !audioPlayers[item.id].paused;
        
        return `
            <div class="card" id="card-${idx}">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <select onchange="state.schedule[${idx}].subject = this.value; saveToLocal(); renderSchedule();" class="card-subject-select">
                        ${state.subjects.map(o => `<option value="${o.name}" ${o.name === item.subject ? 'selected' : ''}>${o.name}</option>`).join('')}
                    </select>
                    <div class="time-range-group">
                        <input type="time" class="time-range-input" value="${item.start}" oninput="state.schedule[${idx}].start = this.value; saveToLocal();"> 
                        <span style="font-size:1.3rem; font-weight:bold; margin: 0 10px; color: var(--slate-400);">~</span>
                        <input type="time" class="time-range-input" value="${item.end}" oninput="state.schedule[${idx}].end = this.value; saveToLocal();">
                    </div>
                    <button onclick="removeSession(${idx})" style="color: #ccc; border:none; background:none; cursor:pointer; font-size:1.2rem;">✕</button>
                </div>
                <div class="card-row-2">
                    <span>個別試場 ${sub.specialRoom} 人 / 實到 <span class="actual-num">${state.total - state.absent - sub.specialRoom}</span> 人</span>
                    <div class="audio-controls">
                        <button class="btn-icon" onclick="document.getElementById('file-${idx}').click()" title="上傳聽力檔">聽力📤</button>
                        <input type="file" id="file-${idx}" hidden accept="audio/*" onchange="handleAudioUpload(this, ${idx})">
                        ${item.audioUrl ? `
                            <button class="btn-icon" id="play-${item.id}" onclick="toggleAudio('${item.id}', '${item.audioUrl}')">${isPlaying ? '⏸️' : '▶️'}</button>
                            <button class="btn-icon" onclick="replayAudio('${item.id}')">🔄</button>
                            <div class="progress-container"><div class="progress-bar" id="prog-${item.id}"></div></div>
                            <button class="btn-icon" onclick="clearAudio(${idx})" style="color:var(--red); font-size:1.1rem;">✕</button>
                        ` : ''}
                    </div>
                </div>
            </div>`;
    }).join('');
}

function handleAudioUpload(input, idx) {
    if (input.files[0]) {
        const id = state.schedule[idx].id;
        
        // 修正：如果原本就有 URL，先釋放掉
        if (state.schedule[idx].audioUrl) {
            URL.revokeObjectURL(state.schedule[idx].audioUrl);
        }

        const url = URL.createObjectURL(input.files[0]);
        state.schedule[idx].audioUrl = url;
        if (audioPlayers[id]) audioPlayers[id].pause();
        audioPlayers[id] = new Audio(url);
        audioPlayers[id].onended = () => { 
            const b = document.getElementById(`play-${id}`); 
            if(b) b.innerText = '▶️'; 
        };
        saveToLocal(); 
        renderSchedule();
    }
}

function toggleAudio(id, url) {
    if (!audioPlayers[id]) {
        audioPlayers[id] = new Audio(url);
        audioPlayers[id].onended = () => { 
            const b = document.getElementById(`play-${id}`); 
            if(b) b.innerText = '▶️'; 
        };
    }
    const a = audioPlayers[id];
    const btn = document.getElementById(`play-${id}`);
    if (a.paused) {
        a.play();
        if (btn) btn.innerText = '⏸️';
    } else {
        a.pause();
        if (btn) btn.innerText = '▶️';
    }
}

function replayAudio(id) { 
    const a = audioPlayers[id]; 
    if (a) { a.currentTime = 0; a.play(); const btn = document.getElementById(`play-${id}`); if (btn) btn.innerText = '⏸️'; } 
}

function clearAudio(idx) { 
    const id = state.schedule[idx].id; 
    if (audioPlayers[id]) { audioPlayers[id].pause(); delete audioPlayers[id]; } 
    state.schedule[idx].audioUrl = null; 
    saveToLocal(); 
    renderSchedule(); 
}

function addSession() {
    const count = state.schedule.length;
    let time = count < 4 
        ? [{ start: '08:40', end: '09:20' }, { start: '09:30', end: '10:10' }, { start: '10:25', end: '11:05' }, { start: '11:15', end: '11:55' }][count] 
        : { start: state.schedule[count-1].end, end: '12:00' };
    
    state.schedule.push({ 
        id: Date.now().toString(), 
        subject: state.subjects[count % state.subjects.length]?.name || '新科目', 
        start: time.start, 
        end: time.end, 
        audioUrl: null 
    });
    saveToLocal(); 
    renderSchedule();
}

function removeSession(idx) { 
    const id = state.schedule[idx].id; 
    if (audioPlayers[id]) { audioPlayers[id].pause(); delete audioPlayers[id]; } 
    state.schedule.splice(idx, 1); 
    saveToLocal(); 
    renderSchedule(); 
}

function toggleModal(show) { 
    const m = document.getElementById('settingsModal'); 
    m.style.display = show ? 'flex' : 'none'; 
    if (show) { 
        tempState = JSON.parse(JSON.stringify(state)); 
        document.getElementById('inputTheme').value = tempState.theme;
        const fontSel = document.getElementById('inputCardFontSize');
        if(fontSel) fontSel.value = tempState.cardFontSize || 'medium';
        const timeFontSel = document.getElementById('inputTimeFontSize');
        if(timeFontSel) timeFontSel.value = tempState.timeFontSize || 'medium';
        const swapCbox = document.getElementById('inputSwapPanels');
        if(swapCbox) swapCbox.checked = !!tempState.swapPanels;
        document.getElementById('inputTotal').value = tempState.total; 
        document.getElementById('inputAbsent').value = tempState.absent; 
        document.getElementById('examReminders').value = tempState.reminders.exam.join('\n'); 
        document.getElementById('breakReminders').value = tempState.reminders.break.join('\n'); 
        renderModalSubjects(); 
    } else {
        applyTheme(state.theme);
    }
}

function saveSettingsFromModal() { 
    state.theme = document.getElementById('inputTheme').value;
    const fontSel = document.getElementById('inputCardFontSize');
    if(fontSel) state.cardFontSize = fontSel.value;
    const timeFontSel = document.getElementById('inputTimeFontSize');
    if(timeFontSel) state.timeFontSize = timeFontSel.value;
    const swapCbox = document.getElementById('inputSwapPanels');
    if(swapCbox) state.swapPanels = swapCbox.checked;
    state.total = parseInt(document.getElementById('inputTotal').value); 
    state.absent = parseInt(document.getElementById('inputAbsent').value); 
    state.subjects = tempState.subjects; 
    state.reminders.exam = document.getElementById('examReminders').value.split('\n').filter(t => t.trim()); 
    state.reminders.break = document.getElementById('breakReminders').value.split('\n').filter(t => t.trim()); 
    
    applyTheme(state.theme);
    saveToLocal(); 
    syncUI(); 
    toggleModal(false); 
}

function renderModalSubjects() { 
    document.getElementById('modalSubjectList').innerHTML = tempState.subjects.map((s, i) => `
        <div class="modal-subject-item">
            <input type="text" value="${s.name}" oninput="tempState.subjects[${i}].name=this.value" class="subject-name-input">
            <select onchange="tempState.subjects[${i}].specialRoom=parseInt(this.value)" class="short-select">
                ${Array.from({length:11}, (_,v)=>`<option value="${v}" ${v===s.specialRoom?'selected':''}>${v} 人</option>`).join('')}
            </select>
            <button onclick="tempState.subjects.splice(${i},1); renderModalSubjects()" class="btn-remove-subject">✕</button>
        </div>`).join(''); 
}

function addNewSubjectOption() { 
    tempState.subjects.push({ name: '新科目', specialRoom: 0 }); 
    renderModalSubjects(); 
}

function populateNumberOptions(id, max) { 
    const s = document.getElementById(id); 
    s.innerHTML = '';
    for(let i=0; i<=max; i++) s.add(new Option(i + ' 人', i)); 
}

function updateActiveCardUI(status) { 
    state.schedule.forEach((_, i) => { 
        const c = document.getElementById(`card-${i}`); 
        if (c) c.classList.toggle('active', (status.type === 'exam' && status.index === i)); 
    }); 
}

function exportData() {
    const data = JSON.parse(JSON.stringify(state));
    data.schedule.forEach(s => s.audioUrl = null);
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(data)], {type: "application/json"}));
    a.download = `exam_config_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
}

function importData(input) { 
    if(!input.files[0]) return; 
    const reader = new FileReader(); 
    reader.onload = (e) => { 
        try {
            const imported = JSON.parse(e.target.result);
            // 同樣套用「合併」邏輯而非直接覆蓋
            state = {
                ...JSON.parse(JSON.stringify(DEFAULT_STATE)),
                ...imported
            };
            
            applyTheme(state.theme || 'default');
            saveToLocal(); 
            syncUI();
            alert("匯入成功！");
        } catch (err) {
            alert("檔案格式錯誤，無法匯入。");
        }
    }; 
    reader.readAsText(input.files[0]); 
}

function resetAll() { 
    if(confirm("重置將恢復預設值，且無法復原，確定嗎？")) { 
        state = JSON.parse(JSON.stringify(DEFAULT_STATE)); 
        applyTheme(state.theme);
        saveToLocal(); 
        syncUI(); 
    } 
}

init();
