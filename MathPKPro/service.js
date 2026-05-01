/**
 * Math PK Pro - Service Logic (Data, Settings, QR)
 */

const STORAGE_KEY = 'math_pk_pro_v2';

let appData = {
    settings: {
        useHp: true,
        rushMode: false,
        wrongTolerance: 1,
        timePerQuestion: 0, 
        maxHp: 200,         
        questionCount: 10,
        answerCount: 6,
        fontSize: 1,
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


function loadData() {
    const urlParams = new URLSearchParams(window.location.search);
    const sharedData = urlParams.get('s');
    
    if (sharedData) {
        const decoded = decodeSettings(sharedData);
        if (decoded) {
            appData.settings = {...appData.settings, ...decoded};
            if (decoded.layout) gameState.layout = decoded.layout;
            if (decoded.category !== undefined) gameState.category = decoded.category;
            if (urlParams.get('lock') === '1' || urlParams.get('l') === '1') {
                appData.isLocked = true;
            }
        }
    }

    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && !sharedData) { 
        try {
            let loaded = JSON.parse(saved);
            if (loaded && loaded.settings) appData.settings = {...appData.settings, ...loaded.settings};
            if (loaded && loaded.stats) appData.stats = {...appData.stats, ...loaded.stats};
        } catch(e) { console.error("JSON 解析失敗", e); }
    }

    if (urlParams.get('l') === '1') appData.isLocked = true;
    if (appData.settings.c !== undefined) gameState.category = appData.settings.c;
    
    let fs = parseFloat(appData.settings.fontSize) || 1.0;
    appData.settings.fontSize = parseFloat(fs.toFixed(1));
    appData.settings.maxHp = parseInt(appData.settings.maxHp) || 100;
    appData.settings.questionCount = parseInt(appData.settings.questionCount) || 10;
}

function saveData() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(appData));
}

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
    } catch(e) { return null; }
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
    const qrModal = document.getElementById('qrModal');
    qrModal.style.display = 'flex';
    document.getElementById('qrcode').innerHTML = "";
    setTimeout(() => {
        new QRCode(document.getElementById("qrcode"), {
            text: url, width: 300, height: 300, colorDark : "#000000", colorLight : "#ffffff", correctLevel : QRCode.CorrectLevel.H
        });
    }, 100);
    document.getElementById('shareUrlText').innerText = url;
}

function generateLockedQR() {
    const dataToShare = {
        useHp: appData.settings.useHp, rushMode: appData.settings.rushMode, wrongTolerance: appData.settings.wrongTolerance,
        timePerQuestion: appData.settings.timePerQuestion, maxHp: appData.settings.maxHp, questionCount: appData.settings.questionCount,
        answerCount: appData.settings.answerCount, fontSize: appData.settings.fontSize, enableShake: appData.settings.enableShake,
        enableSound: appData.settings.enableSound, layout: appData.settings.layout, moleInterval: appData.settings.moleInterval
    };
    const b64 = encodeSettings(dataToShare, gameState.category);
    const url = window.location.origin + window.location.pathname + "?s=" + b64 + "&l=1";
    const qrModal = document.getElementById('qrModal');
    qrModal.querySelector('h3').innerText = "產生限定練習碼";
    qrModal.style.display = 'flex';
    document.getElementById('qrcode').innerHTML = "";
    setTimeout(() => {
        new QRCode(document.getElementById("qrcode"), {
            text: url, width: 300, height: 300, colorDark : "#e91e63", colorLight : "#ffffff", correctLevel : QRCode.CorrectLevel.H
        });
    }, 100);
    document.getElementById('shareUrlText').innerText = url;
}

function resetStats() {
    if(confirm("確定要重置所有戰績與設定嗎？")) {
        localStorage.removeItem(STORAGE_KEY);
        location.reload();
    }
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

