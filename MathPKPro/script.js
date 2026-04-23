const STORAGE_KEY = 'math_pk_pro_v2';

let appData = {
    settings: {
        useHp: true,
        rushMode: false,
        wrongTolerance: 1,
        questionCount: 5,
        answerCount: 6,
        fontSize: 1.0,
        volume: 0.5,
        enableShake: true
    },
    stats: {
        p1Wins: 0,
        p2Wins: 0
    }
};

const screens = document.querySelectorAll('.screen');

let gameState = {
    layout: 'parallel', // 'parallel' | 'face-to-face'
    category: 0, // 0-5
    gameInterval: null,
    gameGlobalQuestionIndex: 0,
    ended: false,
    p1: {},
    p2: {}
};

const sounds = {
    correct: new Audio('https://actions.google.com/sounds/v1/alarms/beep_short.ogg'),
    wrong: new Audio('https://actions.google.com/sounds/v1/cartoon/cartoon_boing.ogg'),
    tick: new Audio('https://actions.google.com/sounds/v1/alarms/beep_short.ogg'),
    victory: new Audio('https://actions.google.com/sounds/v1/cartoon/cartoon_boing.ogg')
};

function playSound(type) {
    let s = sounds[type];
    if(s) {
        s.volume = appData.settings.volume;
        s.currentTime = 0;
        s.play().catch(e => console.log('Audio error:', e));
    }
}

function init() {
    loadData();
    updateMainMenuStats();
    setupSettingsUI();
    applyFontSize();
}

function loadData() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
        let loaded = JSON.parse(saved);
        // 保留預設值相容
        appData.settings = {...appData.settings, ...loaded.settings};
        appData.stats = {...appData.stats, ...loaded.stats};
    }
}

function saveData() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(appData));
}

function applyFontSize() {
    document.documentElement.style.fontSize = `${16 * appData.settings.fontSize}px`;
}

function showScreen(screenId) {
    screens.forEach(s => s.classList.remove('active'));
    document.getElementById(screenId).classList.add('active');
}

function updateMainMenuStats() {
    document.getElementById('p1Wins').innerText = appData.stats.p1Wins;
    document.getElementById('p2Wins').innerText = appData.stats.p2Wins;
}

function setupSettingsUI() {
    document.getElementById('setUseHp').checked = appData.settings.useHp;
    document.getElementById('setRushMode').checked = appData.settings.rushMode;
    
    document.getElementById('setWrongTol').value = appData.settings.wrongTolerance;
    document.getElementById('valWrongTol').innerText = appData.settings.wrongTolerance;
    
    document.getElementById('setQCount').value = appData.settings.questionCount;
    document.getElementById('valQCount').innerText = appData.settings.questionCount;
    
    document.getElementById('setAnsCount').value = appData.settings.answerCount;
    document.getElementById('valAnsCount').innerText = appData.settings.answerCount;

    document.getElementById('setFontSize').value = appData.settings.fontSize;
    document.getElementById('valFontSize').innerText = appData.settings.fontSize;

    document.getElementById('setWrongTol').addEventListener('input', (e) => {
        document.getElementById('valWrongTol').innerText = e.target.value;
    });
    document.getElementById('setQCount').addEventListener('input', (e) => {
        document.getElementById('valQCount').innerText = e.target.value;
    });
    document.getElementById('setAnsCount').addEventListener('input', (e) => {
        document.getElementById('valAnsCount').innerText = e.target.value;
    });
    document.getElementById('setFontSize').addEventListener('input', (e) => {
        document.getElementById('valFontSize').innerText = parseFloat(e.target.value).toFixed(1);
    });
}

function saveSettingsAndReturn() {
    appData.settings.useHp = document.getElementById('setUseHp').checked;
    appData.settings.rushMode = document.getElementById('setRushMode').checked;
    appData.settings.wrongTolerance = parseInt(document.getElementById('setWrongTol').value);
    appData.settings.questionCount = parseInt(document.getElementById('setQCount').value);
    appData.settings.answerCount = parseInt(document.getElementById('setAnsCount').value);
    appData.settings.fontSize = parseFloat(document.getElementById('setFontSize').value);
    
    saveData();
    applyFontSize();
    showScreen('mainMenu');
}

function resetStats() {
    if(confirm("確定要重置所有戰績與設定嗎？")) {
        localStorage.removeItem(STORAGE_KEY);
        location.reload();
    }
}

// 流程控制
function returnToHome() {
    if(gameState.gameInterval) {
        clearInterval(gameState.gameInterval);
        gameState.gameInterval = null;
    }
    showScreen('mainMenu');
}

function goToCategory(layout) {
    gameState.layout = layout;
    showScreen('categoryScreen');
}

function setupReadyPhase(categoryIndex) {
    gameState.category = categoryIndex;
    
    // 初始化玩家狀態
    gameState.p1 = createPlayerState();
    gameState.p2 = createPlayerState();
    
    // 設定版面
    const arenaLayout = document.getElementById('arenaLayout');
    if (gameState.layout === 'face-to-face') {
        arenaLayout.classList.add('face-to-face');
        arenaLayout.classList.remove('parallel');
        document.getElementById('p1Area').classList.add('player-left');
        document.getElementById('p2Area').classList.add('player-right');
    } else {
        arenaLayout.classList.remove('face-to-face');
        arenaLayout.classList.add('parallel');
        document.getElementById('p1Area').classList.remove('player-left');
        document.getElementById('p2Area').classList.remove('player-right');
    }

    // HP 顯示開關
    document.getElementById('p1HpContainer').style.display = appData.settings.useHp ? 'flex' : 'none';
    document.getElementById('p2HpContainer').style.display = appData.settings.useHp ? 'flex' : 'none';
    
    // Ready Button 重置
    resetReadyBtn('p1');
    resetReadyBtn('p2');

    // 清空題目與進度
    updateProgressUI('p1');
    updateProgressUI('p2');
    if(appData.settings.useHp) {
        updateHpUI('p1');
        updateHpUI('p2');
    }

    showScreen('battleArena');
}

function createPlayerState() {
    return {
        ready: false,
        hp: 100,
        combo: 0,
        correctCount: 0,
        wrongCount: 0,
        questionsDone: 0,
        currentQuestion: null,
        wrongList: [], // { q: text, expected: ans, provided: userAns }
        currentWrongAttempts: 0,
        finished: false
    };
}

function resetReadyBtn(player) {
    const overlay = document.getElementById(`${player}ReadyOverlay`);
    const btn = document.getElementById(`${player}GoBtn`);
    overlay.style.display = 'flex';
    btn.innerText = 'GO!';
    btn.classList.remove('is-ready');
}

function setReady(player) {
    gameState[player].ready = true;
    const btn = document.getElementById(`${player}GoBtn`);
    btn.innerText = 'READY';
    btn.classList.add('is-ready');

    if(gameState.p1.ready && gameState.p2.ready) {
        startGame();
    }
}

function startGame() {
    gameState.ended = false;
    gameState.gameGlobalQuestionIndex = 0;
    document.getElementById('p1ReadyOverlay').style.display = 'none';
    document.getElementById('p2ReadyOverlay').style.display = 'none';

    // 生成題目
    if (appData.settings.rushMode) {
        generateSharedQuestion();
    } else {
        generateNextQuestion('p1');
        generateNextQuestion('p2');
    }

    // 若有血條則啟動計時扣血
    if(appData.settings.useHp) {
        gameState.gameInterval = setInterval(() => {
            if(!gameState.ended) {
                if(!gameState.p1.finished) gameState.p1.hp -= 1;
                if(!gameState.p2.finished) gameState.p2.hp -= 1;
                
                updateHpUI('p1');
                updateHpUI('p2');
                checkGlobalGameOver();
            }
        }, 1000);
    }
}

function checkGlobalGameOver() {
    if(gameState.ended) return;
    
    // 檢查有人血盡，或是兩人都完成題數
    let hpEnd = false;
    let finishEnd = false;

    if (appData.settings.useHp) {
        if(gameState.p1.hp <= 0 || gameState.p2.hp <= 0) hpEnd = true;
    }

    if(gameState.p1.finished && gameState.p2.finished) {
        finishEnd = true;
    }

    if (hpEnd || finishEnd) {
        gameState.ended = true;
        if(gameState.gameInterval) {
            clearInterval(gameState.gameInterval);
            gameState.gameInterval = null;
        }
        endGame();
    }
}

// 產生題目
function generateQuestion() {
    let a, b, answer, text;
    // 0: 10+ | 1: 10- | 2: 10+- | 3: 20+ | 4: 20- | 5: 20+-
    let cat = gameState.category;
    let isPlus;

    if (cat === 2) {
        isPlus = Math.random() > 0.5;
        cat = isPlus ? 0 : 1;
    } else if (cat === 5) {
        isPlus = Math.random() > 0.5;
        cat = isPlus ? 3 : 4;
    } else {
        isPlus = (cat === 0 || cat === 3);
    }

    switch(cat) {
        case 0: // 10以內的加法 (A+B=C, C<=10)
            answer = Math.floor(Math.random() * 11); // 0~10
            a = Math.floor(Math.random() * (answer + 1)); // 0~answer
            b = answer - a;
            text = `${a} + ${b} = ?`;
            break;
        case 1: // 10以內的減法 (A-B=C, C<=10)
            a = Math.floor(Math.random() * 11); // 0~10
            b = Math.floor(Math.random() * (a + 1)); // 0~A
            answer = a - b;
            text = `${a} - ${b} = ?`;
            break;
        case 3: // 20以內的加法 (A+B=C, C:11~18, A/B:2~9)
            answer = Math.floor(Math.random() * 8) + 11; // 11~18
            let maxAForPlus = Math.min(9, answer - 2); 
            let minAForPlus = Math.max(2, answer - 9);
            a = Math.floor(Math.random() * (maxAForPlus - minAForPlus + 1)) + minAForPlus;
            b = answer - a;
            text = `${a} + ${b} = ?`;
            break;
        case 4: // 20以內的減法 (A-B=C, C:2~9, A:11~18, B:2~9)
            // 先找 A 跟 B，再來算 C
            a = Math.floor(Math.random() * 8) + 11; // 11~18
            let maxBForMinus = Math.min(9, a - 2); // 確保 C >= 2 (A-B>=2 -> B<=A-2)
            let minBForMinus = Math.max(2, a - 9); // 確保 C <= 9 (A-B<=9 -> B>=A-9)
            if (minBForMinus > maxBForMinus) {
                // backstop fallback
                b = Math.floor(Math.random() * 8) + 2;
                a = b + Math.floor(Math.random() * 8) + 2; 
            } else {
                b = Math.floor(Math.random() * (maxBForMinus - minBForMinus + 1)) + minBForMinus;
            }
            answer = a - b;
            text = `${a} - ${b} = ?`;
            break;
    }
    return { text, answer, catType: cat };
}

function generateSharedQuestion() {
    if(gameState.ended) return;
    if(gameState.gameGlobalQuestionIndex >= appData.settings.questionCount) {
        gameState.p1.finished = true;
        gameState.p2.finished = true;
        document.getElementById(`p1Question`).innerText = "完成！等待結算...";
        document.getElementById(`p1Options`).innerHTML = '';
        document.getElementById(`p2Question`).innerText = "完成！等待結算...";
        document.getElementById(`p2Options`).innerHTML = '';
        checkGlobalGameOver();
        return;
    }

    gameState.p1.currentWrongAttempts = 0;
    gameState.p2.currentWrongAttempts = 0;

    let qBase = generateQuestion();
    
    // 生成這題的所有選項
    let options = [qBase.answer];
    let maxLimit = 10, minLimit = 0;
    if (qBase.catType === 0 || qBase.catType === 1) { maxLimit = 10; minLimit = 0; }
    else if (qBase.catType === 3) { maxLimit = 18; minLimit = 11; }
    else if (qBase.catType === 4) { maxLimit = 9; minLimit = 2; }

    while(options.length < appData.settings.answerCount) {
        let wrg = Math.floor(Math.random() * (maxLimit - minLimit + 1)) + minLimit;
        if(wrg !== qBase.answer && !options.includes(wrg)) options.push(wrg);
        if(options.length >= (maxLimit - minLimit + 1)) break; 
    }
    while(options.length < appData.settings.answerCount) {
        let randExt = Math.floor(Math.random() * 20); 
        if(!options.includes(randExt)) options.push(randExt);
    }
    options.sort(() => Math.random() - 0.5);
    
    gameState.p1.currentQuestion = { text: qBase.text, answer: qBase.answer };
    gameState.p2.currentQuestion = { text: qBase.text, answer: qBase.answer };
    
    ['p1', 'p2'].forEach(player => {
        document.getElementById(`${player}Question`).innerText = qBase.text;
        let optsContainer = document.getElementById(`${player}Options`);
        optsContainer.innerHTML = '';
        options.forEach(opt => {
            let btn = document.createElement('button');
            btn.className = 'option-btn';
            btn.innerText = opt;
            btn.onclick = (e) => handleAnswer(player, opt, e.target);
            optsContainer.appendChild(btn);
        });
    });
}

function generateNextQuestion(player) {
    if(gameState.ended) return;
    let state = gameState[player];
    
    if(state.questionsDone >= appData.settings.questionCount) {
        state.finished = true;
        document.getElementById(`${player}Question`).innerText = "完成！等待結算...";
        document.getElementById(`${player}Options`).innerHTML = '';
        checkGlobalGameOver();
        return;
    }

    state.currentWrongAttempts = 0;
    let qBase = generateQuestion();
    
    // 生成選項，須符合題目 C 的規範
    let options = [qBase.answer];
    let maxLimit = 10;
    let minLimit = 0;
    if (qBase.catType === 0 || qBase.catType === 1) {
        maxLimit = 10;
        minLimit = 0;
    } else if (qBase.catType === 3) {
        maxLimit = 18;
        minLimit = 11;
    } else if (qBase.catType === 4) {
        maxLimit = 9;
        minLimit = 2;
    }

    while(options.length < appData.settings.answerCount) {
        let wrg = Math.floor(Math.random() * (maxLimit - minLimit + 1)) + minLimit;
        if(wrg !== qBase.answer && !options.includes(wrg)) {
            options.push(wrg);
        }
        if(options.length >= (maxLimit - minLimit + 1)) {
            break; 
        }
    }
    while(options.length < appData.settings.answerCount) {
        let randExt = Math.floor(Math.random() * 20); 
        if(!options.includes(randExt)) options.push(randExt);
    }

    options.sort(() => Math.random() - 0.5);
    
    state.currentQuestion = { text: qBase.text, answer: qBase.answer };
    document.getElementById(`${player}Question`).innerText = qBase.text;
    
    let optsContainer = document.getElementById(`${player}Options`);
    optsContainer.innerHTML = '';
    options.forEach(opt => {
        let btn = document.createElement('button');
        btn.className = 'option-btn';
        btn.innerText = opt;
        btn.onclick = (e) => handleAnswer(player, opt, e.target);
        optsContainer.appendChild(btn);
    });
}

function handleAnswer(player, selectedOpt, btnElement) {
    if(gameState.ended) return;
    let state = gameState[player];
    let opponent = player === 'p1' ? 'p2' : 'p1';
    
    if(state.finished || !state.currentQuestion) return;

    if (selectedOpt === state.currentQuestion.answer) {
        // Correct
        playSound('correct');
        state.correctCount++;
        state.questionsDone++;
        
        // HP Mode: Damage
        if(appData.settings.useHp) {
            state.combo++;
            let dmg = 10;
            if(state.combo >= 3) dmg += (state.combo - 2);
            gameState[opponent].hp -= dmg;
            updateHpUI(opponent);
            triggerShake(opponent);
        }

        updateProgressUI(player);
        state.currentQuestion = null;
        
        if (appData.settings.rushMode) {
            gameState.p1.questionsDone++; // 同步進度
            if(player === 'p2') gameState.p1.questionsDone--; // 校正
            gameState.p2.questionsDone = gameState.p1.questionsDone;
            gameState.gameGlobalQuestionIndex++;
            updateProgressUI('p1');
            updateProgressUI('p2');
            gameState.p1.currentQuestion = null;
            gameState.p2.currentQuestion = null;
            setTimeout(() => generateSharedQuestion(), 150);
        } else {
            setTimeout(() => generateNextQuestion(player), 150);
        }

    } else {
        // Wrong
        playSound('wrong');
        btnElement.classList.add('wrong');
        btnElement.onclick = null;
        
        state.combo = 0;
        state.currentWrongAttempts++;
        
        if(appData.settings.useHp) {
            state.hp -= 5;
            updateHpUI(player);
        }

        let maxTol = appData.settings.wrongTolerance;
        if(state.currentWrongAttempts <= maxTol) {
            // First/nth wrong -> record it, let them choose again
            state.wrongList.push({
                q: state.currentQuestion.text,
                expected: state.currentQuestion.answer,
                provided: selectedOpt
            });
        } else {
            // Reached tolerance limit -> move to next
            state.wrongCount++;
            state.questionsDone++;
            updateProgressUI(player);
            state.currentQuestion = null;
            
            if (appData.settings.rushMode) {
                 gameState.p1.questionsDone++; // 同步進度
                 if(player === 'p2') gameState.p1.questionsDone--; // 校正
                 gameState.p2.questionsDone = gameState.p1.questionsDone;
                 gameState.gameGlobalQuestionIndex++;
                 updateProgressUI('p1');
                 updateProgressUI('p2');
                 gameState.p1.currentQuestion = null;
                 gameState.p2.currentQuestion = null;
                 setTimeout(() => generateSharedQuestion(), 400);
            } else {
                 setTimeout(() => generateNextQuestion(player), 400);
            }
        }
    }
}

// UI 輔助
function updateProgressUI(player) {
    let qDone = gameState[player].questionsDone;
    let qTotal = appData.settings.questionCount;
    document.getElementById(`${player}Progress`).innerText = `題數 ${qDone} / ${qTotal}`;
}

function updateHpUI(player) {
    const hp = gameState[player].hp;
    const bar = document.getElementById(`${player}HpBar`);
    const txt = document.getElementById(`${player}HpText`);
    
    let percentage = (hp / 100) * 100;
    if (percentage < 0) percentage = 0;
    
    bar.style.width = `${percentage}%`;
    txt.innerText = `${Math.max(0, Math.floor(hp))} / 100`;
    
    if(percentage < 20) {
        bar.classList.add('low');
    } else {
        bar.classList.remove('low');
    }
}

function triggerShake(player) {
    if(!appData.settings.enableShake) return;
    let targetArea = document.getElementById(`${player}Area`);
    targetArea.classList.add('shake');
    setTimeout(() => {
        targetArea.classList.remove('shake');
    }, 500);
}

// 結算
function endGame() {
    playSound('victory');
    let p1Win = false;
    let p2Win = false;
    let isDraw = false;
    let p1 = gameState.p1;
    let p2 = gameState.p2;

    // 基本勝負判定：先看 HP (如果有用且死掉)，不然看答對數
    if(appData.settings.useHp && (p1.hp <= 0 || p2.hp <= 0)) {
        if(p1.hp <= 0 && p2.hp <= 0) isDraw = true;
        else if (p2.hp <= 0) p1Win = true;
        else p2Win = true;
    } else {
        // 比正確數
        if (p1.correctCount > p2.correctCount) p1Win = true;
        else if (p2.correctCount > p1.correctCount) p2Win = true;
        else isDraw = true;
    }

    if(p1Win) { appData.stats.p1Wins++; }
    if(p2Win) { appData.stats.p2Wins++; }

    saveData();
    updateMainMenuStats();

    // 設定 Result Layout 的佈局視角
    const resultLayout = document.getElementById('resultLayout');
    const p1ResArea = document.getElementById('p1ResultArea');
    const p2ResArea = document.getElementById('p2ResultArea');

    if (gameState.layout === 'face-to-face') {
        resultLayout.classList.add('face-to-face');
        resultLayout.classList.remove('parallel');
        p1ResArea.classList.add('player-left');
        p2ResArea.classList.add('player-right');
    } else {
        resultLayout.classList.remove('face-to-face');
        resultLayout.classList.add('parallel');
        p1ResArea.classList.remove('player-left');
        p2ResArea.classList.remove('player-right');
    }

    // 填寫勝利標籤
    document.getElementById('p1WinLabel').innerText = isDraw ? "平手！" : (p1Win ? "🎊 勝利！" : "❌ 失敗");
    document.getElementById('p2WinLabel').innerText = isDraw ? "平手！" : (p2Win ? "🎊 勝利！" : "❌ 失敗");

    // 填寫剩餘 HP
    if(appData.settings.useHp) {
        document.getElementById('p1HpResult').innerText = `剩餘血量: ${Math.max(0, p1.hp)}`;
        document.getElementById('p2HpResult').innerText = `剩餘血量: ${Math.max(0, p2.hp)}`;
    } else {
        document.getElementById('p1HpResult').innerText = "";
        document.getElementById('p2HpResult').innerText = "";
    }

    // 基本統計
    document.getElementById('p1Corrects').innerText = p1.correctCount;
    document.getElementById('p1Wrongs').innerText = p1.wrongList.length; 
    renderWrongList('p1WrongList', p1.wrongList);

    document.getElementById('p2Corrects').innerText = p2.correctCount;
    document.getElementById('p2Wrongs').innerText = p2.wrongList.length;
    renderWrongList('p2WrongList', p2.wrongList);

    showScreen('resultScreen');
}

function renderWrongList(elementId, list) {
    const el = document.getElementById(elementId);
    el.innerHTML = '';
    if(list.length === 0) {
        el.innerHTML = '<div class="wrong-item" style="color:var(--success)">全對！</div>';
        return;
    }
    list.forEach(item => {
        let div = document.createElement('div');
        div.className = 'wrong-item';
        div.innerText = `${item.q} 正解:${item.expected}, 但選了:${item.provided}`;
        el.appendChild(div);
    });
}

window.onload = init;
