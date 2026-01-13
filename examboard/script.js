/**
 * 考試看板系統 script.js
 */

const DEFAULT_STATE = {
    total: 25, 
    absent: 0,
    theme: 'default',
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
            "考卷記得寫上班級姓名座號", 
            "身體有問題或東西掉了，請舉手問老師", 
            "先寫會的題目，寫錯字要擦乾淨", 
            "耐心、細心、小心", 
            "考卷有問題等出題老師來了再問", 
            "不要轉頭、玩東西，寫完多檢查", 
            "寫完請檢查或趴下休息"
        ], 
        break: [
            "等監考老師點完再離開座位下課", 
            "利用下課準備下個科目與文具用品", 
            "提早上廁所喝水", 
            "桌面淨空"
        ] 
    },
    showReminders: true
};

let state;
let tempState;
const audioPlayers = {}; 

function init() {
    const saved = localStorage.getItem('examBoardState');
    state = saved ? JSON.parse(saved) : JSON.parse(JSON.stringify(DEFAULT_STATE));
    
    if (state.showReminders === undefined) state.showReminders = true;
    if (state.theme === undefined) state.theme = 'default';

    populateNumberOptions('inputTotal', 55);
    populateNumberOptions('inputAbsent', 20);
    
    applyTheme(state.theme);
    syncUI();
    updateReminderUI(); 

    setInterval(updateTime, 1000);
    setInterval(updateReminderUI, 6000);
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
                    <select onchange="state.schedule[${idx}].subject = this.value; saveToLocal(); renderSchedule();" 
                            style="font-size: 1.6rem; font-weight: 900; border: none; background: #f1f5f9; border-radius: 8px; cursor:pointer; color: var(--primary);">
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
        state = JSON.parse(e.target.result); 
        applyTheme(state.theme || 'default');
        saveToLocal(); 
        syncUI(); 
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
