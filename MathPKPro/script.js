/**
 * Charles Nextime Web Tools Portal - Core Logic
 * Copyright (c) 2026 Charles Nextime
 * Licensed under the GNU General Public License v3.0
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation.
 */
 

// 負責載入多個外部套件的函式
function initLibraries() {
    const libraries = [
        {
            url: 'https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js'
        }
    ];

    libraries.forEach(lib => {
        // 1. 自動從 URL 提取檔名
        const fileName = new URL(lib.url).pathname.split('/').pop();

        // 2. 處理 shouldLoad 邏輯：
        // 如果 lib.condition 有定義，就用它的結果；如果沒定義(undefined)，則預設為 true
        const shouldLoad = (lib.condition !== undefined) ? lib.condition : true;

        if (!shouldLoad) {
            console.log(`%c[跳過] 環境支援原生功能，不載入: ${fileName}`, 'color: #9E9E9E;');
            return;
        }

        const script = document.createElement('script');
        script.src = lib.url;
        script.async = false;

        script.onload = function() {
            console.log(`%c[成功] 外部庫已載入: ${fileName}`, 'color: #4CAF50; font-weight: bold;');
        };

        script.onerror = function() {
            const fallbackPath = `libs/${fileName}`;
            console.warn(`[失敗] 載入失敗，嘗試本地備援: ${fallbackPath}`);
            
            const fallbackScript = document.createElement('script');
            fallbackScript.src = fallbackPath;
            fallbackScript.onload = () => console.log(`%c[備援成功] 已從本地載入: ${fileName}`, 'color: #FF9800; font-weight: bold;');
            fallbackScript.onerror = () => console.error(`[重大錯誤] 本地檔案不存在: ${fallbackPath}`);

            document.head.appendChild(fallbackScript);
        };

        document.head.appendChild(script);
    });
}

// 啟動
initLibraries();


const STORAGE_KEY = 'math_pk_pro_v2';

let appData = {
    settings: {
        useHp: true,
        rushMode: false,
        wrongTolerance: 1,
        timePerQuestion: 0, // 0=無, 1~10
        maxHp: 200,         // 100~500
        questionCount: 10,
        answerCount: 6,
        fontSize: 1.0,
        volume: 0.5,
        enableShake: true,
        enableSound: true,
        moleInterval: 0
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
    let intv = showTime + 1000; // 蓋牌時間永遠為 1000ms
    moleState[player].cycleCount = 0; // 重置計數

    const cycle = () => {
        let btns = Array.from(document.querySelectorAll(`#${player}Options .option-btn`));
        if (btns.length === 0) return;

        moleState[player].cycleCount++;
        let isOddCycle = (moleState[player].cycleCount % 2 !== 0);

        // 全部蓋牌
        btns.forEach(b => {
            b.classList.add('mole-hidden');
            b.innerText = '?';
        });

        let nToShow;
        if (isOddCycle) {
            nToShow = Math.floor(Math.random() * 2) + 3; // 3 或 4
        } else {
            nToShow = Math.floor(Math.random() * 4) + 1; // 1 到 4
        }
        if (nToShow > btns.length) nToShow = btns.length;

        let toShow = [];
        
        // 只要出 3 張或 4 張時，一定會有正確答案
        if (nToShow >= 3 && gameState[player].currentQuestion) {
            let correctAnswer = gameState[player].currentQuestion.answer;
            let correctBtnIdx = btns.findIndex(b => String(b.innerTextOrigin) === String(correctAnswer));
            
            if (correctBtnIdx !== -1) {
                toShow.push(btns[correctBtnIdx]);
                let remaining = btns.filter((_, i) => i !== correctBtnIdx);
                let shuffled = remaining.map(a => ({sort: Math.random(), value: a}))
                                        .sort((a, b) => a.sort - b.sort)
                                        .map(a => a.value);
                toShow = toShow.concat(shuffled.slice(0, nToShow - 1));
            } else {
                let shuffled = btns.map(a => ({sort: Math.random(), value: a}))
                                   .sort((a, b) => a.sort - b.sort)
                                   .map(a => a.value);
                toShow = shuffled.slice(0, nToShow);
            }
        } else {
            let shuffled = btns.map(a => ({sort: Math.random(), value: a}))
                               .sort((a, b) => a.sort - b.sort)
                               .map(a => a.value);
            toShow = shuffled.slice(0, nToShow);
        }

        // 翻開
        toShow.forEach(b => {
            b.classList.remove('mole-hidden');
            b.innerText = b.innerTextOrigin;
        });

        moleState[player].hideTimer = setTimeout(() => {
            btns.forEach(b => {
                b.classList.add('mole-hidden');
                b.innerText = '?';
            });
            
            // 每次蓋牌後，將按鈕實體 DOM 元素洗牌
            let optsContainer = document.getElementById(`${player}Options`);
            if (optsContainer) {
                let shuffledBtns = btns.map(a => ({sort: Math.random(), value: a}))
                                       .sort((a, b) => a.sort - b.sort)
                                       .map(a => a.value);
                shuffledBtns.forEach(b => optsContainer.appendChild(b));
            }
        }, showTime);
    };

    // 立即執行一次，然後排程
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

// 輔助洗牌函數 (Fisher-Yates)
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

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
        s.play().catch(e => console.log('Audio error:', e));
    }
}

function init() {
    loadData();
    updateMainMenuStats();
    setupSettingsUI();
    applyFontSize();

    // 檢查是否為鎖定練習模式
    if (appData.isLocked) {
        document.documentElement.classList.add('is-locked-mode');
        document.body.classList.add('is-locked-mode');
        console.log("%c[限定模式] 循環練習啟動，回首頁功能已鎖定", 'color: #f44336; font-weight: bold;');
        // 自動進入準備畫面
        setupReadyPhase(gameState.category);
    }
}

function loadData() {
    // 優先從 URL 參數讀取分享設定
    const urlParams = new URLSearchParams(window.location.search);
    const sharedData = urlParams.get('s');
    if (sharedData) {
        const decoded = decodeSettings(sharedData);
        if (decoded) {
            appData.settings = {...appData.settings, ...decoded};
            // 重要：同步類別與佈局至當前遊戲狀態，確保掃碼後立即生效
            if (decoded.layout) gameState.layout = decoded.layout;
            if (decoded.category !== undefined) gameState.category = decoded.category;

            // 檢查 URL 參數是否有鎖定標記
            if (urlParams.get('lock') === '1' || urlParams.get('l') === '1') {
                appData.isLocked = true;
            }
            console.log("已套用分享設定:", appData.settings, "鎖定狀態:", appData.isLocked, "預期佈局:", gameState.layout);
        }
    }

    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && !sharedData) { 
        try {
            let loaded = JSON.parse(saved);
            if (loaded && loaded.settings) {
                appData.settings = {...appData.settings, ...loaded.settings};
            }
            if (loaded && loaded.stats) {
                appData.stats = {...appData.stats, ...loaded.stats};
            }
        } catch(e) { console.error("JSON 解析失敗", e); }
    }

    // 檢查是否有直接的限定標記 (非分享碼情況或覆蓋)
    if (urlParams.get('l') === '1') {
        appData.isLocked = true;
    }
    
    // 如果分享碼裡有指定類別 (c)，則設定之
    if (appData.settings.c !== undefined) {
        gameState.category = appData.settings.c;
    }
    
    // 強制校正數值型態與合法性，確保與 select value ("1.0") 格式一致
    let fs = parseFloat(appData.settings.fontSize) || 1.0;
    appData.settings.fontSize = fs.toFixed(1);
    appData.settings.maxHp = parseInt(appData.settings.maxHp) || 100;
    appData.settings.questionCount = parseInt(appData.settings.questionCount) || 10;
}

function saveData() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(appData));
}

function applyFontSize() {
    let size = parseFloat(appData.settings.fontSize);
    if (isNaN(size) || size <= 0) size = 1.0;
    // 僅更新局部變數，不影響全域 root 字體
    document.documentElement.style.setProperty('--answer-multiplier', size);
}

function showScreen(screenId) {
    screens.forEach(s => s.classList.remove('active'));
    document.getElementById(screenId).classList.add('active');
    // 設定 body class 以便 CSS 依據不同畫面調整全域按鈕位置
    document.body.className = `screen-${screenId}`;
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

    document.getElementById('setTimeLimit').value = appData.settings.timePerQuestion;
    document.getElementById('valTimeLimit').innerText = appData.settings.timePerQuestion === 0 ? "無" : appData.settings.timePerQuestion + "秒";

    document.getElementById('setMaxHp').value = appData.settings.maxHp;
    document.getElementById('valMaxHp').innerText = appData.settings.maxHp;
    
    document.getElementById('setQCount').value = appData.settings.questionCount;
    document.getElementById('valQCount').innerText = appData.settings.questionCount;
    
    document.getElementById('setAnsCount').value = appData.settings.answerCount;
    document.getElementById('valAnsCount').innerText = appData.settings.answerCount;

    document.getElementById('setUseHp').checked = appData.settings.useHp;
    document.getElementById('setRushMode').checked = appData.settings.rushMode;
    document.getElementById('setEnableShake').checked = appData.settings.enableShake;
    document.getElementById('setEnableSound').checked = appData.settings.enableSound;

    document.getElementById('setFontSize').value = appData.settings.fontSize;
    updateFontSizeLabel(parseFloat(appData.settings.fontSize));

    if (document.getElementById('setMole')) {
        document.getElementById('setMole').value = appData.settings.moleInterval || 0;
    }

    // 事件監聽：改為 change 事件
    document.getElementById('setWrongTol').addEventListener('change', (e) => {
        document.getElementById('valWrongTol').innerText = e.target.value;
    });
    document.getElementById('setTimeLimit').addEventListener('change', (e) => {
        const val = e.target.value;
        document.getElementById('valTimeLimit').innerText = val === "0" ? "無" : val + "秒";
    });
    document.getElementById('setMaxHp').addEventListener('change', (e) => {
        document.getElementById('valMaxHp').innerText = e.target.value;
    });
    document.getElementById('setQCount').addEventListener('change', (e) => {
        document.getElementById('valQCount').innerText = e.target.value;
    });
    document.getElementById('setAnsCount').addEventListener('change', (e) => {
        document.getElementById('valAnsCount').innerText = e.target.value;
    });
    document.getElementById('setFontSize').addEventListener('change', (e) => {
        updateFontSizeLabel(parseFloat(e.target.value));
    });
}

function updateFontSizeLabel(val) {
    let label = "中";
    if(val <= 0.8) label = "小";
    else if(val >= 1.5) label = "大";
    document.getElementById('valFontSizeLabel').innerText = label;
}

// 透過位元操作將設定資料壓縮至極短字串
function encodeSettings(s, cat) {
    let bits = "";
    const p = (v, len) => { bits += (v||0).toString(2).padStart(len, '0'); };
    
    p(s.useHp ? 1 : 0, 1);
    p(s.rushMode ? 1 : 0, 1);
    p(s.enableShake ? 1 : 0, 1);
    p(s.enableSound ? 1 : 0, 1);
    p(s.wrongTolerance, 4);
    p(s.timePerQuestion, 6);
    p(s.maxHp, 10);
    p(s.questionCount, 7);
    p(s.answerCount, 4);
    p(Math.round((s.fontSize||1.5) * 10), 5);
    p(s.layout === 'face-to-face' ? 0 : 1, 1);
    p(cat || 0, 4);
    p(s.moleInterval || 0, 3);
    
    let bytes = [];
    for(let i=0; i<bits.length; i+=8) {
        bytes.push(parseInt(bits.substring(i, i+8).padEnd(8, '0'), 2));
    }
    return btoa(String.fromCharCode(...bytes));
}

function decodeSettings(b64) {
    try {
        let dec = atob(b64);
        if (dec.startsWith('{')) {
            let j = JSON.parse(dec);
            return {
                useHp: j.h!==undefined?j.h:j.useHp, rushMode: j.r!==undefined?j.r:j.rushMode,
                wrongTolerance: j.w!==undefined?j.w:j.wrongTolerance, timePerQuestion: j.t!==undefined?j.t:j.timePerQuestion,
                maxHp: j.m!==undefined?j.m:j.maxHp, questionCount: j.q!==undefined?j.q:j.questionCount,
                answerCount: j.a!==undefined?j.a:j.answerCount, fontSize: j.f!==undefined?j.f:j.fontSize,
                layout: j.layout!==undefined?j.layout:(j.l===0?'face-to-face':'parallel'), category: j.c, moleInterval: 0
            };
        }
        
        let bits = "";
        for(let i=0; i<dec.length; i++) bits += dec.charCodeAt(i).toString(2).padStart(8, '0');
        
        let off = 0;
        const r = (len) => { let v = parseInt(bits.substring(off, off+len), 2); off+=len; return v; };
        
        return {
            useHp: r(1)===1, rushMode: r(1)===1, enableShake: r(1)===1, enableSound: r(1)===1,
            wrongTolerance: r(4), timePerQuestion: r(6), maxHp: r(10), questionCount: r(7), answerCount: r(4), fontSize: r(5)/10,
            layout: r(1)===0?'face-to-face':'parallel', category: r(4), moleInterval: r(3)
        };
    } catch(e) {
        console.error("Decode failed:", e); return null;
    }
}

function generateQR() {
    const dataToShare = {
        useHp: appData.settings.useHp,
        rushMode: appData.settings.rushMode,
        wrongTolerance: appData.settings.wrongTolerance,
        timePerQuestion: parseInt(document.getElementById('setTimeLimit').value),
        maxHp: parseInt(document.getElementById('setMaxHp').value),
        questionCount: parseInt(document.getElementById('setQCount').value),
        answerCount: parseInt(document.getElementById('setAnsCount').value),
        fontSize: parseFloat(document.getElementById('setFontSize').value),
        enableShake: appData.settings.enableShake,
        enableSound: appData.settings.enableSound,
        layout: appData.settings.layout,
        moleInterval: document.getElementById('setMole') ? parseInt(document.getElementById('setMole').value) : 0
    };

    const b64 = encodeSettings(dataToShare);
    const url = window.location.origin + window.location.pathname + "?s=" + b64;
    
    // 顯示 Modal
    const qrModal = document.getElementById('qrModal');
    qrModal.style.display = 'flex';
    
    document.getElementById('qrcode').innerHTML = "";
    // 使用 setTimeout 確保 DOM 渲染後再產生 QR Code (解決隱藏時產生的空白問題)
    setTimeout(() => {
        new QRCode(document.getElementById("qrcode"), {
            text: url,
            width: 300,
            height: 300,
            colorDark : "#000000",
            colorLight : "#ffffff",
            correctLevel : QRCode.CorrectLevel.H // 提升至最高容錯率
        });
    }, 100);

    document.getElementById('shareUrlText').innerText = url;
}

// 產生限定模式 QR Code (包含鎖定旗標)
function generateLockedQR() {
    // 取得當前設定與題型
    const dataToShare = {
        useHp: appData.settings.useHp,
        rushMode: appData.settings.rushMode,
        wrongTolerance: appData.settings.wrongTolerance,
        timePerQuestion: appData.settings.timePerQuestion,
        maxHp: appData.settings.maxHp,
        questionCount: appData.settings.questionCount,
        answerCount: appData.settings.answerCount,
        fontSize: appData.settings.fontSize,
        enableShake: appData.settings.enableShake,
        enableSound: appData.settings.enableSound,
        layout: appData.settings.layout,
        moleInterval: appData.settings.moleInterval
    };

    const b64 = encodeSettings(dataToShare, gameState.category);
    // 附加 &l=1 參數
    const url = window.location.origin + window.location.pathname + "?s=" + b64 + "&l=1";
    
    // 顯示 Modal (復用舊有 QR 視窗)
    const qrModal = document.getElementById('qrModal');
    qrModal.querySelector('h3').innerText = "產生限定練習碼";
    qrModal.querySelector('p').innerText = "學生掃描後將鎖定在此題型循環練習：";
    qrModal.style.display = 'flex';
    
    document.getElementById('qrcode').innerHTML = "";
    setTimeout(() => {
        new QRCode(document.getElementById("qrcode"), {
            text: url,
            width: 300,
            height: 300,
            colorDark : "#e91e63", // 使用粉紅色區分限定碼
            colorLight : "#ffffff",
            correctLevel : QRCode.CorrectLevel.H
        });
    }, 100);

    document.getElementById('shareUrlText').innerText = url;
}

function closeQRModal() {
    document.getElementById('qrModal').style.display = 'none';
}

function saveSettingsAndReturn() {
    appData.settings.useHp = document.getElementById('setUseHp').checked;
    appData.settings.rushMode = document.getElementById('setRushMode').checked;
    appData.settings.enableShake = document.getElementById('setEnableShake').checked;
    appData.settings.enableSound = document.getElementById('setEnableSound').checked;

    appData.settings.wrongTolerance = parseInt(document.getElementById('setWrongTol').value);
    appData.settings.timePerQuestion = parseInt(document.getElementById('setTimeLimit').value);
    appData.settings.maxHp = parseInt(document.getElementById('setMaxHp').value);
    appData.settings.questionCount = parseInt(document.getElementById('setQCount').value);
    appData.settings.answerCount = parseInt(document.getElementById('setAnsCount').value);
    appData.settings.fontSize = parseFloat(document.getElementById('setFontSize').value);
    if (document.getElementById('setMole')) {
        appData.settings.moleInterval = parseInt(document.getElementById('setMole').value);
    }
    
    // 若為打字鼠模式，強迫限時變為無
    if (appData.settings.moleInterval > 0) {
        appData.settings.timePerQuestion = 0;
    }
    
    saveData();
    applyFontSize();
    showScreen('mainMenu');
}

function resetStats() {
    if(confirm("確定要重置所有戰績與設定嗎？")) {
        localStorage.removeItem(STORAGE_KEY);
        location.reload(); // 重新載入會觸發 init 使用硬編碼的 default
    }
}

// 流程控制
function returnToHome() {
    if (appData.isLocked) {
        alert("目前處於限定練習模式，無法返回首頁。");
        return;
    }
    if(gameState.gameInterval) {
        clearInterval(gameState.gameInterval);
        gameState.gameInterval = null;
    }
    clearAllTimers();
    document.getElementById('battleArena').classList.remove('in-ready-phase');
    showScreen('mainMenu');
}

function rePlay() {
    if(gameState.gameInterval) {
        clearInterval(gameState.gameInterval);
        gameState.gameInterval = null;
    }
    stopMoleCycle('p1');
    stopMoleCycle('p2');
    clearAllTimers();
    setupReadyPhase(gameState.category);
}

function clearAllTimers() {
    if(gameState.p1.timer) clearInterval(gameState.p1.timer);
    if(gameState.p2.timer) clearInterval(gameState.p2.timer);
    gameState.p1.timer = null;
    gameState.p2.timer = null;
    document.getElementById('p1TimerBar').style.width = '0%';
    document.getElementById('p2TimerBar').style.width = '0%';
}

function goToCategory(layout) {
    gameState.layout = layout;
    appData.settings.layout = layout; // 同步至設定，確保 QR 碼產出正確
    saveData();
    showScreen('categoryScreen');
}

function setupReadyPhase(categoryIndex) {
    gameState.category = categoryIndex;
    
    // 進入準備階段，顯示教師工具
    document.getElementById('battleArena').classList.add('in-ready-phase');
    
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
    
    // 強制重置題目與選項區，解決「HP歸零」或殘留文字在準備階段疊加的問題
    document.getElementById('p1QuestionText').innerText = "請準備";
    document.getElementById('p2QuestionText').innerText = "請準備";
    document.getElementById('p1Options').innerHTML = '';
    document.getElementById('p2Options').innerHTML = '';

    if(appData.settings.useHp) {
        updateHpUI('p1');
        updateHpUI('p2');
    }

    showScreen('battleArena');
}

function createPlayerState() {
    return {
        ready: false,
        hp: appData.settings.maxHp,
        combo: 0,
        correctCount: 0,
        wrongCount: 0,
        questionsDone: 0,
        currentQuestion: null,
        wrongList: [], // { q: text, expected: ans, provided: userAns }
        currentWrongAttempts: 0,
        finished: false,
        timer: null,
        isOvertime: false // 逾時懲罰旗標
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
    // 開始遊戲，隱藏教師工具
    document.getElementById('battleArena').classList.remove('in-ready-phase');
    
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
                // 每秒扣血速率：正常1點，逾時3點
                if(!gameState.p1.finished) {
                    let drain1 = gameState.p1.isOvertime ? 3 : 1;
                    gameState.p1.hp -= drain1;
                }
                if(!gameState.p2.finished) {
                    let drain2 = gameState.p2.isOvertime ? 3 : 1;
                    gameState.p2.hp -= drain2;
                }
                
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
    
    // 如果是血量模式，只要有人完成(不管是扣光還是答完)且另一方也完成了，或是有人血量歸零
    // 其實 hpEnd 已經在 updateHpUI 觸發 finished 了，所以這裡只要判斷 finishEnd 即可
    // 但為了保險，只要任一方 hp 歸零就直接判斷 hpEnd
    if (appData.settings.useHp) {
        if(gameState.p1.hp <= 0 || gameState.p2.hp <= 0) hpEnd = true;
    }

    if (hpEnd || finishEnd) {
        gameState.ended = true;
        if(gameState.gameInterval) {
            clearInterval(gameState.gameInterval);
            gameState.gameInterval = null;
        }
        stopMoleCycle('p1');
        stopMoleCycle('p2');
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
        case 6: // 十十乘法表 (1x1 ~ 10x10)
            a = Math.floor(Math.random() * 10) + 1;
            b = Math.floor(Math.random() * 10) + 1;
            answer = a * b;
            text = `${a} x ${b} = ?`;
            break;
        case 7: // 三數加減挑戰 (A ± B ± C = D, A,B,C,D in 0-20)
            a = Math.floor(Math.random() * 21);
            let op1 = Math.random() > 0.5 ? '+' : '-';
            let possB = [];
            for(let i=0; i<=20; i++) {
                let r = (op1 === '+') ? (a + i) : (a - i);
                if(r >= 0 && r <= 20) possB.push(i);
            }
            b = possB[Math.floor(Math.random() * possB.length)];
            let r1 = (op1 === '+') ? (a + b) : (a - b);

            let op2 = Math.random() > 0.5 ? '+' : '-';
            let possC = [];
            for(let i=0; i<=20; i++) {
                let r = (op2 === '+') ? (r1 + i) : (r1 - i);
                if(r >= 0 && r <= 20) possC.push(i);
            }
            let c = possC[Math.floor(Math.random() * possC.length)];
            answer = (op2 === '+') ? (r1 + c) : (r1 - c);
            text = `${a} ${op1} ${b} ${op2} ${c} = ?`;
            break;
        case 8: // 百位除法練習 (A ÷ B = C, C,B in 1-10)
            b = Math.floor(Math.random() * 10) + 1; // 除數 1~10
            answer = Math.floor(Math.random() * 10) + 1; // 商 1~10
            a = b * answer;
            text = `${a} ÷ ${b} = ?`;
            break;
    }
    return { text, answer, catType: cat };
}

function generateSharedQuestion() {
    if(gameState.ended) return;
    if(gameState.gameGlobalQuestionIndex >= appData.settings.questionCount) {
        gameState.p1.finished = true;
        gameState.p2.finished = true;
        document.getElementById(`p1QuestionText`).innerText = "完成！等待結算...";
        document.getElementById(`p1Options`).innerHTML = '';
        document.getElementById(`p2QuestionText`).innerText = "完成！等待結算...";
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
    else if (qBase.catType === 6) { maxLimit = 100; minLimit = 1; }

    while(options.length < appData.settings.answerCount) {
        let wrg = Math.floor(Math.random() * (maxLimit - minLimit + 1)) + minLimit;
        if(wrg !== qBase.answer && !options.includes(wrg)) options.push(wrg);
        if(options.length >= (maxLimit - minLimit + 1)) break; 
    }
    while(options.length < appData.settings.answerCount) {
        let randExt = Math.floor(Math.random() * 100); 
        if(!options.includes(randExt)) options.push(randExt);
    }
    shuffleArray(options);
    
    gameState.p1.currentQuestion = { text: qBase.text, answer: qBase.answer };
    gameState.p2.currentQuestion = { text: qBase.text, answer: qBase.answer };
    
    ['p1', 'p2'].forEach(player => {
        startQuestionTimer(player);
        document.getElementById(`${player}QuestionText`).innerText = qBase.text;
        let optsContainer = document.getElementById(`${player}Options`);
        optsContainer.innerHTML = '';
        options.forEach(opt => {
            let btn = document.createElement('button');
            btn.className = 'option-btn';
            btn.innerText = opt;
            // 使用 pointerdown 確保多點觸控同時觸發且反應即時
            btn.onpointerdown = (e) => {
                e.preventDefault();
                handleAnswer(player, opt, e.target);
            };
            optsContainer.appendChild(btn);
        });
    });
}

function startQuestionTimer(player) {
    if(gameState.p1.timer && player==='p1') clearInterval(gameState.p1.timer); // 清除舊的
    if(gameState.p2.timer && player==='p2') clearInterval(gameState.p2.timer);

    const limit = appData.settings.timePerQuestion;
    const bar = document.getElementById(`${player}TimerBar`);
    if(limit === 0) {
        bar.style.width = '0%';
        return;
    }

    let startTime = Date.now();
    let duration = limit * 1000;
    
    gameState[player].timer = setInterval(() => {
        let elapsed = Date.now() - startTime;
        let per = (elapsed / duration) * 100;
        if(per >= 100) {
            per = 100;
            clearInterval(gameState[player].timer);
            // 時間到
            handleTimeout(player);
        }
        bar.style.width = `${per}%`;
    }, 100);
}

function handleTimeout(player) {
    if(gameState.ended || gameState[player].finished) return;
    playSound('wrong');
    triggerShake(player); // 超時加入抖動
    if(appData.settings.useHp) {
        showDamage(player, -5); // 顯示扣血特效
        gameState[player].hp -= 5; // 超時扣 5 點
        if(gameState[player].hp < 0) gameState[player].hp = 0;
        updateHpUI(player);
        
        // 進入逾時懲罰狀態：加劇每秒扣血，但不換題
        gameState[player].isOvertime = true;
    } else {
        // 若非血量模式，逾時則維持原樣自動換題 (或者也可依此規則，但目前僅 HP 模式有 drain 需求)
        gameState[player].currentWrongAttempts = 999;
        handleAnswer(player, -1, null);
    }
}

function generateNextQuestion(player) {
    if(gameState.ended) return;
    let state = gameState[player];
    
    if(state.questionsDone >= appData.settings.questionCount) {
        state.finished = true;
        document.getElementById(`${player}QuestionText`).innerText = "完成！等待結算...";
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
    } else if (qBase.catType === 6) {
        maxLimit = 100;
        minLimit = 1;
    } else if (qBase.catType === 7) {
        maxLimit = 20;
        minLimit = 0;
    } else if (qBase.catType === 8) {
        maxLimit = 10;
        minLimit = 1;
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
        let randExt = Math.floor(Math.random() * 100); 
        if(!options.includes(randExt)) options.push(randExt);
    }

    shuffleArray(options);
    
    state.currentQuestion = { text: qBase.text, answer: qBase.answer };
    document.getElementById(`${player}QuestionText`).innerText = qBase.text;
    startQuestionTimer(player);
    
    let optsContainer = document.getElementById(`${player}Options`);
    optsContainer.innerHTML = '';
    options.forEach(opt => {
        let btn = document.createElement('button');
        btn.className = 'option-btn';
        btn.innerTextOrigin = opt;
        if (appData.settings.moleInterval > 0) {
            btn.classList.add('mole-hidden');
        } else {
            btn.innerText = opt;
        }
        btn.onpointerdown = (e) => {
            e.preventDefault();
            if (btn.classList.contains('mole-hidden')) return;
            handleAnswer(player, opt, e.target);
        };
        optsContainer.appendChild(btn);
    });

    if (appData.settings.moleInterval > 0) {
        startMoleCycle(player);
    }
}

function handleAnswer(player, selectedOpt, btnElement) {
    if(gameState.ended) return;
    let state = gameState[player];
    let opponent = player === 'p1' ? 'p2' : 'p1';
    
    if(state.finished || !state.currentQuestion) return;

    // 只要有作答動作就解除逾時加劇扣血
    state.isOvertime = false;

    if (selectedOpt === state.currentQuestion.answer) {
        if(state.timer) clearInterval(state.timer);
        stopMoleCycle(player);
        // Correct
        playSound('correct');
        state.correctCount++;
        
        // HP Mode: Damage
        if(appData.settings.useHp) {
            state.combo++;
            let dmg = 10;
            if(state.combo >= 3) dmg += (state.combo - 2);
            showDamage(opponent, -dmg); // 對手顯示受傷數值
            gameState[opponent].hp -= dmg;
            if(gameState[opponent].hp < 0) gameState[opponent].hp = 0;
            updateHpUI(opponent);
            triggerShake(opponent);
        }

        if (appData.settings.rushMode) {
            gameState.gameGlobalQuestionIndex++;
            gameState.p1.questionsDone = gameState.gameGlobalQuestionIndex;
            gameState.p2.questionsDone = gameState.gameGlobalQuestionIndex;
            updateProgressUI('p1');
            updateProgressUI('p2');
            gameState.p1.currentQuestion = null;
            gameState.p2.currentQuestion = null;
            setTimeout(() => generateSharedQuestion(), 150);
        } else {
            state.questionsDone++;
            updateProgressUI(player);
            state.currentQuestion = null;
            setTimeout(() => generateNextQuestion(player), 150);
        }

    } else {
        // Wrong
        playSound('wrong');
        if (appData.settings.moleInterval === 0) {
            btnElement.classList.add('wrong');
            btnElement.onclick = null;
        }
        
        state.combo = 0;
        state.currentWrongAttempts++;
        
        if(appData.settings.useHp) {
            showDamage(player, -5); // 自己顯示扣血數值
            state.hp -= 5;
            updateHpUI(player);
            triggerShake(player); // 答錯也要抖動
        }

        // 只要答錯就紀錄 (不管有沒有換題)
        state.wrongList.push({
            q: state.currentQuestion.text,
            expected: state.currentQuestion.answer,
            provided: selectedOpt === -1 ? "超時" : selectedOpt
        });

        let maxTol = appData.settings.wrongTolerance;
        if(state.currentWrongAttempts > maxTol) {
            // Reached tolerance limit -> move to next
            if(state.timer) clearInterval(state.timer);
            state.wrongCount++;
            
            if (appData.settings.rushMode) {
                 gameState.gameGlobalQuestionIndex++;
                 gameState.p1.questionsDone = gameState.gameGlobalQuestionIndex;
                 gameState.p2.questionsDone = gameState.gameGlobalQuestionIndex;
                 updateProgressUI('p1');
                 updateProgressUI('p2');
                 gameState.p1.currentQuestion = null;
                 gameState.p2.currentQuestion = null;
                 setTimeout(() => generateSharedQuestion(), 400);
            } else {
                 state.questionsDone++;
                 updateProgressUI(player);
                 state.currentQuestion = null;
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
    
    const max = appData.settings.maxHp;
    let percentage = (hp / max) * 100;
    if (percentage < 0) percentage = 0;
    
    bar.style.width = `${percentage}%`;
    txt.innerText = `${Math.max(0, Math.floor(hp))} / ${max}`;
    
    if(percentage < 20) {
        bar.classList.add('low');
    } else {
        bar.classList.remove('low');
    }

    // 血量變 0 時，該方結束，等待結算
    if(hp <= 0 && !gameState[player].finished) {
        gameState[player].finished = true;
        document.getElementById(`${player}QuestionText`).innerText = "HP 歸零！等待結算...";
        document.getElementById(`${player}Options`).innerHTML = '';
        checkGlobalGameOver();
    }
}

function showDamage(player, amount) {
    const container = document.getElementById(`${player}HpContainer`);
    if(!container) return;
    
    const pop = document.createElement('div');
    pop.className = 'damage-pop';
    pop.innerText = amount;
    
    container.appendChild(pop);
    
    // 動畫結束後移除
    setTimeout(() => {
        if(pop.parentNode) pop.parentNode.removeChild(pop);
    }, 800);
}

function triggerShake(player) {
    if(!appData.settings.enableShake) return;
    let targetArea = document.getElementById(`${player}Area`);
    targetArea.classList.add('shake');
    targetArea.classList.add('hit'); // 紅光效果
    setTimeout(() => {
        targetArea.classList.remove('shake');
        targetArea.classList.remove('hit');
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

    // 基本勝負判定：血量模式無條件比較 HP，否則看答對數
    if(appData.settings.useHp) {
        if(p1.hp === p2.hp) isDraw = true;
        else if (p1.hp > p2.hp) p1Win = true;
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
    document.getElementById('p1WinLabel').innerText = isDraw ? "平手！" : (p1Win ? "🎊 勝利！" : "再努力");
    document.getElementById('p2WinLabel').innerText = isDraw ? "平手！" : (p2Win ? "🎊 勝利！" : "再努力");

    // 填寫剩餘 HP
    if(appData.settings.useHp) {
        document.getElementById('p1HpResult').innerText = `HP: ${Math.max(0, p1.hp)}`;
        document.getElementById('p2HpResult').innerText = `HP: ${Math.max(0, p2.hp)}`;
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
