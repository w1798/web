/**
 * Math PK Pro - UI and Animation Logic
 */

const screens = document.querySelectorAll('.screen');

const sounds = {
    correct: new Audio('https://actions.google.com/sounds/v1/alarms/beep_short.ogg'),
    wrong: new Audio('https://actions.google.com/sounds/v1/cartoon/cartoon_boing.ogg'),
    tick: new Audio('https://actions.google.com/sounds/v1/alarms/beep_short.ogg'),
    victory: new Audio('https://actions.google.com/sounds/v1/cartoon/cartoon_boing.ogg')
};

function playSound(type) {
    if(!appData.settings.enableSound) return;
    let s = sounds[type];
    if(s) {
        s.volume = appData.settings.volume;
        s.currentTime = 0;
        s.play().catch(e => {});
    }
}

function showScreen(screenId) {
    screens.forEach(s => s.classList.remove('active'));
    document.getElementById(screenId).classList.add('active');
    document.body.className = `screen-${screenId}`;
}

function applyFontSize() {
    let size = parseFloat(appData.settings.fontSize) || 1.0;
    document.documentElement.style.setProperty('--answer-multiplier', size);
}

function updateMainMenuStats() {
    document.getElementById('p1Wins').innerText = appData.stats.p1Wins;
    document.getElementById('p2Wins').innerText = appData.stats.p2Wins;
}

function setupSettingsUI() {
    const s = appData.settings;
    document.getElementById('setUseHp').checked = s.useHp;
    document.getElementById('setRushMode').checked = s.rushMode;
    document.getElementById('setEnableShake').checked = s.enableShake;
    document.getElementById('setEnableSound').checked = s.enableSound;
    document.getElementById('setWrongTol').value = s.wrongTolerance;
    document.getElementById('valWrongTol').innerText = s.wrongTolerance;
    document.getElementById('setTimeLimit').value = s.timePerQuestion;
    document.getElementById('valTimeLimit').innerText = s.timePerQuestion === 0 ? "無" : s.timePerQuestion + "秒";
    document.getElementById('setMaxHp').value = s.maxHp;
    document.getElementById('valMaxHp').innerText = s.maxHp;
    document.getElementById('setQCount').value = s.questionCount;
    document.getElementById('valQCount').innerText = s.questionCount;
    document.getElementById('setAnsCount').value = s.answerCount;
    document.getElementById('valAnsCount').innerText = s.answerCount;
    document.getElementById('setFontSize').value = s.fontSize;
    updateFontSizeLabel(parseFloat(s.fontSize));
    if (document.getElementById('setMole')) document.getElementById('setMole').value = s.moleInterval || 0;

    // Listeners
    ['WrongTol', 'MaxHp', 'QCount', 'AnsCount'].forEach(id => {
        document.getElementById(`set${id}`).onchange = (e) => { document.getElementById(`val${id}`).innerText = e.target.value; };
    });
    document.getElementById('setTimeLimit').onchange = (e) => {
        const val = e.target.value;
        document.getElementById('valTimeLimit').innerText = val === "0" ? "無" : val + "秒";
    };
    document.getElementById('setFontSize').onchange = (e) => updateFontSizeLabel(parseFloat(e.target.value));
}

function updateFontSizeLabel(val) {
    let label = val <= 0.8 ? "小" : (val >= 1.5 ? "大" : "中");
    document.getElementById('valFontSizeLabel').innerText = label;
}

function updateHpUI(player) {
    const hp = gameState[player].hp;
    const max = appData.settings.maxHp;
    let percentage = (hp / max) * 100;
    if (percentage < 0) percentage = 0;
    
    const bar = document.getElementById(`${player}HpBar`);
    bar.style.width = `${percentage}%`;
    document.getElementById(`${player}HpText`).innerText = `${Math.max(0, Math.floor(hp))} / ${max}`;
    
    if(percentage < 20) bar.classList.add('low');
    else bar.classList.remove('low');

    if(hp <= 0 && !gameState[player].finished) {
        gameState[player].finished = true;
        document.getElementById(`${player}QuestionText`).innerText = "HP 歸零！等待結算...";
        document.getElementById(`${player}Options`).innerHTML = '';
        checkGlobalGameOver();
    }
}

function updateProgressUI(player) {
    document.getElementById(`${player}Progress`).innerText = `題數 ${gameState[player].questionsDone} / ${appData.settings.questionCount}`;
}

function showDamage(player, amount) {
    const container = document.getElementById(`${player}HpContainer`);
    if(!container) return;
    const pop = document.createElement('div');
    pop.className = 'damage-pop';
    pop.innerText = amount;
    container.appendChild(pop);
    setTimeout(() => { if(pop.parentNode) pop.parentNode.removeChild(pop); }, 800);
}

function triggerShake(player) {
    if(!appData.settings.enableShake) return;
    let area = document.getElementById(`${player}Area`);
    area.classList.add('shake', 'hit');
    setTimeout(() => area.classList.remove('shake', 'hit'), 500);
}

function resetReadyBtn(player) {
    const overlay = document.getElementById(`${player}ReadyOverlay`);
    const btn = document.getElementById(`${player}GoBtn`);
    overlay.style.display = 'flex';
    btn.innerText = 'GO!';
    btn.classList.remove('is-ready');
}

function closeQRModal() {
    document.getElementById('qrModal').style.display = 'none';
}

function renderWrongList(elementId, list) {
    const el = document.getElementById(elementId);
    el.innerHTML = list.length === 0 ? '<div class="wrong-item" style="color:var(--success)">全對！</div>' : '';
    list.forEach(item => {
        let div = document.createElement('div');
        div.className = 'wrong-item';
        div.innerText = `${item.q} 正解:${item.expected}, 但選了:${item.provided}`;
        el.appendChild(div);
    });
}
