/**
 * Charles Nextime Web Tools Portal - Core Logic
 * * Copyright (c) 2026 Charles Nextime
 * Licensed under the GNU General Public License v3.0
 * * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation.
 */

let lastFocusedInput = null;
let history = [];
const in1 = document.getElementById('inputArea');
const in2 = document.getElementById('inputArea2');
const out = document.getElementById('outputArea');

function clearOutputIfInputChanged() {
    if (out.value !== "") {
        saveHistory();
        out.value = "";
        updateStats();
    }
}

in1.addEventListener('input', () => { updateStats(); clearOutputIfInputChanged(); });
in2.addEventListener('input', () => { updateStats(); clearOutputIfInputChanged(); });

// 監聽全域點擊，記錄最後一個被點選的輸入框
document.addEventListener('focusin', (e) => {
    if (e.target.tagName === 'INPUT' && e.target.type === 'text') {
        lastFocusedInput = e.target;
    }
});

function saveHistory() { history.push(out.value); if (history.length > 30) history.shift(); }

function undo() { if (history.length > 0) { out.value = history.pop(); updateStats(); } }

function resetTools() {
    ['joinChar','splitChar','filterText','prefix','suffix','regFind','regRep','delChar'].forEach(id => document.getElementById(id).value = '');
    ['numPad','headCount','tailCount'].forEach(id => document.getElementById(id).value = (id==='numPad'?'1':'0'));
}

function updateStats() {
    const s = (el) => `| 字:${el.value.length} 行:${el.value.split('\n').filter(x=>x.trim()).length}`;
    document.getElementById('stat1').innerText = s(in1);
    document.getElementById('stat2').innerText = s(in2);
    document.getElementById('statOut').innerText = s(out);
}

async function pasteTo(id) { 
    if (!navigator.clipboard) {
        alert("瀏覽器安全性限制：貼上功能僅支援 localhost 或 HTTPS 環境。請使用 Ctrl+V 手動貼上。");
        return;
    }
    try { 
        document.getElementById(id).value = await navigator.clipboard.readText(); 
        if (id === 'inputArea' || id === 'inputArea2') clearOutputIfInputChanged();
        updateStats(); 
    } catch(e) { alert("貼上失敗，請手動貼上"); } 
}

function clearArea(id) { 
    if (id === 'inputArea' || id === 'inputArea2') {
        document.getElementById(id).value = '';
        clearOutputIfInputChanged();
    } else {
        saveHistory();
        document.getElementById(id).value = '';
    }
    updateStats(); 
}

function copyOut() {
    const text = out.value;
    if (!text) return;

    // 現代 Clipboard API
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(() => {
            showToast('已複製到剪貼簿！');
        });
        return;
    }

    // 降級備援方案 (傳統方法)
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.position = "fixed";
    textArea.style.left = "-9999px";
    textArea.style.top = "0";
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try {
        const successful = document.execCommand('copy');
        if (successful) showToast('已複製！(備援模式)');
        else alert('複製失敗，請手動複製');
    } catch (err) {
        alert('複製失敗，請手動複製');
    }
    document.body.removeChild(textArea);
}

function showToast(msg) {
    const toast = document.createElement('div');
    toast.innerText = msg;
    Object.assign(toast.style, {
        position: 'fixed', bottom: '300px', left: '50%', transform: 'translateX(-50%)',
        background: 'rgba(0, 0, 0, 0.8)', color: '#fff', padding: '10px 20px',
        borderRadius: '20px', zIndex: '10000', fontSize: '20px', transition: 'opacity 0.5s ease'
    });
    document.body.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 500);
    }, 1000);
}

function downloadTxt() {
    const blob = new Blob([out.value], {type: 'text/plain'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = `Result_${new Date().getTime()}.txt`; a.click();
}

function dualProcess(type) {
    saveHistory();
    let lines1 = in1.value.split(/\r?\n/);
    let lines2 = in2.value.split(/\r?\n/);
    let res = [];
    if (type === 'join') {
        let max = Math.max(lines1.length, lines2.length);
        for(let i=0; i<max; i++) res.push((lines1[i] || "") + (lines2[i] || ""));
    } else if (type === 'interleave') {
        let max = Math.max(lines1.length, lines2.length);
        for(let i=0; i<max; i++) {
            if(i < lines1.length) res.push(lines1[i]);
            if(i < lines2.length) res.push(lines2[i]);
        }
    } else if (type === 'compare') {
        let s1 = new Set(lines1.filter(x => x.trim()));
        let s2 = new Set(lines2.filter(x => x.trim()));
        let common = [...s1].filter(x => s2.has(x));
        let only1 = [...s1].filter(x => !s2.has(x));
        let only2 = [...s2].filter(x => !s1.has(x));
        res = ["【共同擁有】", ...common, "", "【只有資1有】", ...only1, "", "【只有資2有】", ...only2];
    }
    out.value = res.join('\n');
    updateStats();
}


function insertSym(sym) {
    if (lastFocusedInput) {
        // 在目前游標位置插入文字，而不是直接覆蓋整個輸入框
        const start = lastFocusedInput.selectionStart;
        const end = lastFocusedInput.selectionEnd;
        const text = lastFocusedInput.value;
        lastFocusedInput.value = text.slice(0, start) + sym + text.slice(end);
        
        // 插入後將游標移至新插入文字的後面
        lastFocusedInput.focus();
        const newPos = start + sym.length;
        lastFocusedInput.setSelectionRange(newPos, newPos);
    } else {
        showToast('請先點選下面的功能輸入框');
    }
}

function handleEscape(str) {
    if (!str) return str;
    return str
        .replace(/\\\\t/g, '___TEMP_T___') 
        .replace(/\\t/g, '\t')            
        .replace(/\\n/g, '\n')            
        .replace(/___TEMP_T___/g, '\\t');  
}

function process(type) {
    saveHistory();
    let text = out.value.trim() !== "" ? out.value : in1.value;
    if (!text) return;
    let lines = text.split(/\r?\n/);
    switch(type) {
        case 'noEng': text = text.replace(/[a-zA-Z]/g, ''); break;
        case 'noNum': text = text.replace(/[0-9]/g, ''); break;
        case 'noSym': text = text.replace(/[^a-zA-Z0-9\s\u4e00-\u9fa5]/gi, ''); break;
        case 'noHTML': text = text.replace(/<\/?[^>]+(>|$)/g, ""); break;
        case 'noEmptyLine': text = lines.filter(l => l.trim() !== '').join('\n'); break;
        case 'addEmptyLine': text = lines.join('\n\n'); break;
        case 'trimSpace': text = lines.map(l => l.trim()).join('\n'); break;
        case 'indent': text = lines.map(l => '    ' + l).join('\n'); break;
        case 'outdent': text = lines.map(l => l.replace(/^    |^  |^\t/, '')).join('\n'); break;
        case 'sort': text = lines.sort((a,b) => a.localeCompare(b, 'zh-Hant')).join('\n'); break;
        case 'shuffle': text = lines.sort(() => Math.random() - 0.5).join('\n'); break;
        case 'upper': text = text.toUpperCase(); break;
        case 'lower': text = text.toLowerCase(); break;
        case 'capitalize': text = lines.map(l => l.charAt(0).toUpperCase() + l.slice(1)).join('\n'); break;
        case 'findDup':
            let c = {}; lines.forEach(l => { if(l.trim()) c[l] = (c[l]||0)+1 });
            text = Object.keys(c).filter(k => c[k]>1).join('\n'); break;
        case 'sliceKeep':
            let hK = parseInt(document.getElementById('headCount').value), tK = parseInt(document.getElementById('tailCount').value);
            text = lines.map(l => l.substring(0, hK) + l.substring(l.length - tK)).join('\n'); break;
        case 'sliceDel':
            let hD = parseInt(document.getElementById('headCount').value), tD = parseInt(document.getElementById('tailCount').value);
            text = lines.map(l => l.substring(hD, l.length - tD)).join('\n'); break;
        case 'autoNum':
            let pad = parseInt(document.getElementById('numPad').value);
            text = lines.map((l, i) => (i + 1).toString().padStart(pad, '0') + l).join('\n'); break;


        case 'join': 
            text = lines.join(handleEscape(document.getElementById('joinChar').value)); break;
        case 'split': 
            text = text.split(handleEscape(document.getElementById('splitChar').value)).join('\n'); break;
        case 'regex': 
            let re = new RegExp(handleEscape(document.getElementById('regFind').value), 'g');
            text = text.replace(re, handleEscape(document.getElementById('regRep').value)); break;
        case 'addEdge': 
            let p = handleEscape(document.getElementById('prefix').value);
            let s = handleEscape(document.getElementById('suffix').value);
            text = lines.map(l => p + l + s).join('\n'); break;
        case 'delete':
            text = text.split(handleEscape(document.getElementById('delChar').value)).join(''); break;
        case 'keepLine': 
            let kf = handleEscape(document.getElementById('filterText').value);
            text = lines.filter(l => l.includes(kf)).join('\n'); break;
        case 'delLine': 
            let df = handleEscape(document.getElementById('filterText').value);
            text = lines.filter(l => !l.includes(df)).join('\n'); break;
            
            
        case 'smartFormat':
            out.value = universalSmartFormat(out.value.trim() !== "" ? out.value : in1.value);
            updateStats();
            return;
    }
    out.value = text;
    updateStats();
}

function universalSmartFormat(text) {
    if (!text.trim()) return "";
    let mode = "json";
    try { JSON.parse(text); mode = "json"; } catch (e) {
        if (text.includes('{') || text.includes(';') || text.includes('.')) mode = "css";
        else return text;
    }
    const lines = text.trim().split('\n');
    const isSingleLine = lines.length <= 1;

    if (mode === "json") {
        try {
            const obj = JSON.parse(text);
            if (isSingleLine) return JSON.stringify(obj, null, 4);
            if (lines[0].trim() === '{') {
                return JSON.stringify(obj, null, 2).replace(/\{\s*\n\s*([\s\S]*?)\n\s*\}/g, (m, content) => `{ ${content.replace(/\s+/g, ' ').trim()} }`);
            }
            return JSON.stringify(obj);
        } catch (e) { return text; }
    } 
    
    if (mode === "css") {
        const isCssSemi = text.includes('{ ') && text.includes(' }');
        if (isSingleLine) {
            let formatted = text.replace(/\s+/g, ' ').replace(/\{\s*/g, '{\n').replace(/;\s*/g, ';\n').replace(/\s*\}\s*/g, '\n}\n');
            formatted = formatted.replace(/;\n\s*(\/\*[\s\S]*?\*\/)/g, '; $1\n').replace(/\*\/\s*/g, '*/\n');
            let depth = 0;
            let resultLines = formatted.split('\n').map(line => {
                const trimmed = line.trim();
                if (!trimmed) return null;
                if (trimmed.startsWith('}')) depth = Math.max(0, depth - 1);
                const currentIndent = '    '.repeat(depth);
                let res;
                if (depth === 0 && ((trimmed.includes('{') && !trimmed.includes(':')) || trimmed.startsWith('@') || (trimmed.startsWith('/*') && !trimmed.includes(':')) || trimmed === '}')) {
                    res = trimmed; 
                } else { res = currentIndent + trimmed; }
                if (trimmed.endsWith('{')) depth++;
                return res;
            }).filter(line => line !== null);
            return resultLines.join('\n').replace(/^\}/gm, '}\n\n').replace(/\n{3,}/g, '\n\n').trim();
        } else if (!isCssSemi) {
            return text.replace(/\s*\n\s*/g, ' ').replace(/\s*\{\s*/g, ' { ').replace(/\s*;\s*/g, '; ').replace(/\s*\}\s*/g, ' }\n').trim();
        } else {
            return text.replace(/\s*\n\s*/g, '').replace(/\s+/g, ' ').trim();
        }
    }
}

function scrollArea(id, pos) {
    const el = document.getElementById(id);
    el.scrollTop = (pos === 'top') ? 0 : el.scrollHeight;
}

function toggleFullScreen() {
    const box = document.querySelector('.box-50');
    const btn = document.getElementById('fullBtn');
    const isFull = box.classList.toggle('fullscreen-mode');
    document.querySelectorAll('header, footer, .box-25').forEach(el => el.classList.toggle('hidden', isFull));
    if (isFull) {
        btn.innerText = "✕ 退出全屏";
        btn.classList.add('btn-exit-full');
        document.getElementById('outputArea').focus();
    } else {
        btn.innerText = "⛶ 全屏";
        btn.classList.remove('btn-exit-full');
    }
}

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && document.querySelector('.fullscreen-mode')) toggleFullScreen();
});

function toggleTheme() {
    const isLight = document.body.classList.toggle('light-theme');
    document.getElementById('themeBtn').innerText = isLight ? "🌙深色模式" : "☀️淺色模式";
    localStorage.setItem('theme', isLight ? 'light' : 'dark');
}

function initSelects() {
    const populate = (id, min, max) => {
        const el = document.getElementById(id);
        if (!el) return;
        let html = '';
        for (let i = min; i <= max; i++) {
            html += `<option value="${i}">${i}</option>`;
        }
        el.innerHTML = html;
    };
    populate('headCount', 0, 9);
    populate('tailCount', 0, 9);
    populate('numPad', 1, 9);
}

window.onload = () => { 
    initSelects();
    if (localStorage.getItem('theme') === 'light') toggleTheme(); 
};
