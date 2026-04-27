/**
 * Math PK Pro - Main Core Logic
 */

let gameState = {
    layout: 'parallel',
    category: 0,
    gameInterval: null,
    gameGlobalQuestionIndex: 0,
    ended: false,
    p1: { timer: null },
    p2: { timer: null }
};

let moleState = {
    p1: { timer: null, hideTimer: null, cycleCount: 0 },
    p2: { timer: null, hideTimer: null, cycleCount: 0 }
};

function startMoleCycle(player) {
    stopMoleCycle(player);
    if (!appData.settings.moleInterval) return;

    let showMap = { 1: 500, 2: 750, 3: 1000, 4: 1500 };
    let showTime = showMap[appData.settings.moleInterval] || 500;
    let intv = showTime + 1000;
    moleState[player].cycleCount = 0;

    const cycle = () => {
        let btns = Array.from(document.querySelectorAll(`#${player}Options .option-btn`));
        if (btns.length === 0) return;

        moleState[player].cycleCount++;
        let isOddCycle = (moleState[player].cycleCount % 2 !== 0);

        btns.forEach(b => { b.classList.add('mole-hidden'); b.innerText = '?'; });

        let nToShow = isOddCycle ? Math.floor(Math.random() * 2) + 3 : Math.floor(Math.random() * 4) + 1;
        if (nToShow > btns.length) nToShow = btns.length;

        let toShow = [];
        if (nToShow >= 3 && gameState[player].currentQuestion) {
            let correct = gameState[player].currentQuestion.answer;
            let idx = btns.findIndex(b => String(b.innerTextOrigin) === String(correct));
            if (idx !== -1) {
                toShow.push(btns[idx]);
                let remaining = btns.filter((_, i) => i !== idx);
                shuffleArray(remaining);
                toShow = toShow.concat(remaining.slice(0, nToShow - 1));
            } else {
                let shuffled = [...btns]; shuffleArray(shuffled); toShow = shuffled.slice(0, nToShow);
            }
        } else {
            let shuffled = [...btns]; shuffleArray(shuffled); toShow = shuffled.slice(0, nToShow);
        }

        toShow.forEach(b => { b.classList.remove('mole-hidden'); b.innerText = b.innerTextOrigin; });

        moleState[player].hideTimer = setTimeout(() => {
            btns.forEach(b => { b.classList.add('mole-hidden'); b.innerText = '?'; });
            let optsContainer = document.getElementById(`${player}Options`);
            if (optsContainer) {
                let shuffled = [...btns]; shuffleArray(shuffled);
                shuffled.forEach(b => optsContainer.appendChild(b));
            }
        }, showTime);
    };

    cycle();
    moleState[player].timer = setInterval(cycle, intv);
}

function stopMoleCycle(player) {
    if (moleState[player]) {
        if (moleState[player].timer) clearInterval(moleState[player].timer);
        if (moleState[player].hideTimer) clearTimeout(moleState[player].hideTimer);
        moleState[player].timer = null;
        moleState[player].hideTimer = null;
    }
}

function startQuestionTimer(player) {
    if(gameState[player].timer) clearInterval(gameState[player].timer);
    const limit = appData.settings.timePerQuestion;
    const bar = document.getElementById(`${player}TimerBar`);
    if(limit === 0) { bar.style.width = '0%'; return; }

    let startTime = Date.now();
    let duration = limit * 1000;
    gameState[player].timer = setInterval(() => {
        let elapsed = Date.now() - startTime;
        let per = (elapsed / duration) * 100;
        if(per >= 100) { per = 100; clearInterval(gameState[player].timer); handleTimeout(player); }
        bar.style.width = `${per}%`;
    }, 100);
}

function handleTimeout(player) {
    if(gameState.ended || gameState[player].finished) return;
    playSound('wrong');
    triggerShake(player);
    stopMoleCycle(player); // 補足超時停止舊循環
    if(appData.settings.useHp) {
        showDamage(player, -5);
        gameState[player].hp -= 5;
        if(gameState[player].hp < 0) gameState[player].hp = 0;
        updateHpUI(player);
        gameState[player].isOvertime = true;
    } else {
        gameState[player].currentWrongAttempts = 999;
        handleAnswer(player, -1, null);
    }
}

function handleAnswer(player, selectedOpt, btnElement) {
    if(gameState.ended) return;
    let state = gameState[player];
    let opponent = player === 'p1' ? 'p2' : 'p1';
    if(state.finished || !state.currentQuestion) return;
    state.isOvertime = false;

    if (selectedOpt === state.currentQuestion.answer) {
        if(state.timer) clearInterval(state.timer);
        stopMoleCycle(player);
        if (btnElement) btnElement.classList.add('correct');
        playSound('correct');
        state.correctCount++;
        
        if(appData.settings.useHp) {
            state.combo++;
            let dmg = 10 + (state.combo >= 3 ? (state.combo - 2) : 0);
            showDamage(opponent, -dmg);
            gameState[opponent].hp -= dmg;
            if(gameState[opponent].hp < 0) gameState[opponent].hp = 0;
            updateHpUI(opponent);
            triggerShake(opponent);
        }

        if (appData.settings.rushMode) {
            gameState.gameGlobalQuestionIndex++;
            gameState.p1.questionsDone = gameState.p2.questionsDone = gameState.gameGlobalQuestionIndex;
            updateProgressUI('p1'); updateProgressUI('p2');
            gameState.p1.currentQuestion = gameState.p2.currentQuestion = null;
            setTimeout(() => generateSharedQuestion(), 150);
        } else {
            state.questionsDone++;
            updateProgressUI(player);
            state.currentQuestion = null;
            setTimeout(() => generateNextQuestion(player), 150);
        }
    } else {
        playSound('wrong');
        if (appData.settings.moleInterval === 0 && btnElement) {
            btnElement.classList.add('wrong');
            btnElement.onclick = null;
        }
        state.combo = 0;
        state.currentWrongAttempts++;
        if(appData.settings.useHp) {
            showDamage(player, -5);
            state.hp -= 5; updateHpUI(player); triggerShake(player);
        }
        state.wrongList.push({ q: state.currentQuestion.text, expected: state.currentQuestion.answer, provided: selectedOpt === -1 ? "超時" : selectedOpt });

        if(state.currentWrongAttempts > appData.settings.wrongTolerance) {
            if(state.timer) clearInterval(state.timer);
            stopMoleCycle(player); // 補上停止打地鼠循環
            state.wrongCount++;
            if (appData.settings.rushMode) {
                gameState.gameGlobalQuestionIndex++;
                gameState.p1.questionsDone = gameState.p2.questionsDone = gameState.gameGlobalQuestionIndex;
                updateProgressUI('p1'); updateProgressUI('p2');
                gameState.p1.currentQuestion = gameState.p2.currentQuestion = null;
                setTimeout(() => generateSharedQuestion(), 400);
            } else {
                state.questionsDone++; updateProgressUI(player);
                state.currentQuestion = null;
                setTimeout(() => generateNextQuestion(player), 400);
            }
        }
    }
}

function setReady(player) {
    gameState[player].ready = true;
    const btn = document.getElementById(`${player}GoBtn`);
    btn.innerText = 'READY'; btn.classList.add('is-ready');
    if(gameState.p1.ready && gameState.p2.ready) startGame();
}

function startGame() {
    document.getElementById('battleArena').classList.remove('in-ready-phase');
    gameState.ended = false;
    gameState.gameGlobalQuestionIndex = 0;
    document.getElementById('p1ReadyOverlay').style.display = 'none';
    document.getElementById('p2ReadyOverlay').style.display = 'none';

    if (appData.settings.rushMode) generateSharedQuestion();
    else { generateNextQuestion('p1'); generateNextQuestion('p2'); }

    if(appData.settings.useHp) {
        gameState.gameInterval = setInterval(() => {
            if(!gameState.ended) {
                if(!gameState.p1.finished) gameState.p1.hp -= (gameState.p1.isOvertime ? 3 : 1);
                if(!gameState.p2.finished) gameState.p2.hp -= (gameState.p2.isOvertime ? 3 : 1);
                updateHpUI('p1'); updateHpUI('p2');
                checkGlobalGameOver();
            }
        }, 1000);
    }
}

function checkGlobalGameOver() {
    if(gameState.ended) return;
    let hpEnd = appData.settings.useHp && (gameState.p1.hp <= 0 || gameState.p2.hp <= 0);
    let finishEnd = gameState.p1.finished && gameState.p2.finished;
    if (hpEnd || finishEnd) {
        gameState.ended = true;
        if(gameState.gameInterval) { clearInterval(gameState.gameInterval); gameState.gameInterval = null; }
        stopMoleCycle('p1'); stopMoleCycle('p2');
        endGame();
    }
}

function endGame() {
    playSound('victory');
    let p1Win = false, p2Win = false, isDraw = false;
    let p1 = gameState.p1, p2 = gameState.p2;

    if(appData.settings.useHp) {
        if(p1.hp === p2.hp) isDraw = true; else if (p1.hp > p2.hp) p1Win = true; else p2Win = true;
    } else {
        if (p1.correctCount > p2.correctCount) p1Win = true; else if (p2.correctCount > p1.correctCount) p2Win = true; else isDraw = true;
    }
    if(p1Win) appData.stats.p1Wins++;
    if(p2Win) appData.stats.p2Wins++;
    saveData(); updateMainMenuStats();

    const rl = document.getElementById('resultLayout');
    if (gameState.layout === 'face-to-face') {
        rl.classList.add('face-to-face'); rl.classList.remove('parallel');
        document.getElementById('p1ResultArea').classList.add('player-left');
        document.getElementById('p2ResultArea').classList.add('player-right');
    } else {
        rl.classList.remove('face-to-face'); rl.classList.add('parallel');
        document.getElementById('p1ResultArea').classList.remove('player-left');
        document.getElementById('p2ResultArea').classList.remove('player-right');
    }

    document.getElementById('p1WinLabel').innerText = isDraw ? "平手！" : (p1Win ? "🎊 勝利！" : "再努力");
    document.getElementById('p2WinLabel').innerText = isDraw ? "平手！" : (p2Win ? "🎊 勝利！" : "再努力");
    document.getElementById('p1HpResult').innerText = appData.settings.useHp ? `HP: ${Math.max(0, p1.hp)}` : "";
    document.getElementById('p2HpResult').innerText = appData.settings.useHp ? `HP: ${Math.max(0, p2.hp)}` : "";
    document.getElementById('p1Corrects').innerText = p1.correctCount;
    document.getElementById('p1Wrongs').innerText = p1.wrongList.length; 
    renderWrongList('p1WrongList', p1.wrongList);
    document.getElementById('p2Corrects').innerText = p2.correctCount;
    document.getElementById('p2Wrongs').innerText = p2.wrongList.length;
    renderWrongList('p2WrongList', p2.wrongList);

    showScreen('resultScreen');
}

function returnToHome() {
    if (appData.isLocked) { alert("目前處於限定練習模式，無法返回首頁。"); return; }
    if (!gameState.ended && document.getElementById('battleArena').classList.contains('active')) {
        if(!confirm("遊戲正在進行中，確定要返回首頁嗎？")) return;
    }
    if(gameState.gameInterval) { clearInterval(gameState.gameInterval); gameState.gameInterval = null; }
    stopMoleCycle('p1'); stopMoleCycle('p2'); // 補足返回首頁時停止所有循環
    clearAllTimers();
    document.getElementById('battleArena').classList.remove('in-ready-phase');
    showScreen('mainMenu');
}

function rePlay() {
    if(gameState.gameInterval) { clearInterval(gameState.gameInterval); gameState.gameInterval = null; }
    stopMoleCycle('p1'); stopMoleCycle('p2'); clearAllTimers();
    setupReadyPhase(gameState.category);
}

function clearAllTimers() {
    if(gameState.p1.timer) clearInterval(gameState.p1.timer);
    if(gameState.p2.timer) clearInterval(gameState.p2.timer);
    gameState.p1.timer = gameState.p2.timer = null;
    document.getElementById('p1TimerBar').style.width = document.getElementById('p2TimerBar').style.width = '0%';
}

function goToCategory(layout) {
    gameState.layout = layout; appData.settings.layout = layout;
    saveData(); showScreen('categoryScreen');
}

function setupReadyPhase(categoryIndex) {
    gameState.category = categoryIndex;
    document.getElementById('battleArena').classList.add('in-ready-phase');
    gameState.p1 = createPlayerState(); gameState.p2 = createPlayerState();
    
    const al = document.getElementById('arenaLayout');
    if (gameState.layout === 'face-to-face') {
        al.classList.add('face-to-face'); al.classList.remove('parallel');
        document.getElementById('p1Area').classList.add('player-left');
        document.getElementById('p2Area').classList.add('player-right');
    } else {
        al.classList.remove('face-to-face'); al.classList.add('parallel');
        document.getElementById('p1Area').classList.remove('player-left');
        document.getElementById('p2Area').classList.remove('player-right');
    }

    document.getElementById('p1HpContainer').style.display = document.getElementById('p2HpContainer').style.display = appData.settings.useHp ? 'flex' : 'none';
    resetReadyBtn('p1'); resetReadyBtn('p2');
    updateProgressUI('p1'); updateProgressUI('p2');
    document.getElementById('p1QuestionText').innerText = document.getElementById('p2QuestionText').innerText = "請準備";
    document.getElementById('p1Options').innerHTML = document.getElementById('p2Options').innerHTML = '';

    if(appData.settings.useHp) { updateHpUI('p1'); updateHpUI('p2'); }

    Object.values(sounds).forEach(s => {
        s.volume = 0; let p = s.play();
        if(p !== undefined) p.then(() => { s.pause(); s.currentTime = 0; s.volume = appData.settings.volume; }).catch(e => {});
    });

    showScreen('battleArena');
}

function createPlayerState() {
    return { ready: false, hp: appData.settings.maxHp, combo: 0, correctCount: 0, wrongCount: 0, questionsDone: 0, currentQuestion: null, wrongList: [], currentWrongAttempts: 0, finished: false, timer: null, isOvertime: false };
}

function init() {
    loadData(); updateMainMenuStats(); setupSettingsUI(); applyFontSize();
    if (appData.isLocked) setupReadyPhase(gameState.category);
}

window.onload = init;
