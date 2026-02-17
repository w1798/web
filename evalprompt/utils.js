/**
 * Charles Nextime Web Tools Portal - Core Logic
 * * Copyright (c) 2026 Charles Nextime
 * Licensed under the GNU General Public License v3.0
 * * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation.
 */

// 全域狀態變數
let config, studentStates, activeStudent, secondaryColors;

function saveToLocal() {
    localStorage.setItem('eval_v6_config', JSON.stringify(config));
    localStorage.setItem('eval_v6_states', JSON.stringify(studentStates));
}

function parseTraitsText(text) {
    const lines = text.split('\n').map(l => l.trim()).filter(l => l);
    const data = [];
    let currentCat = null;
    lines.forEach(line => {
        if (line.endsWith("類")) {
            currentCat = { category: line, items: [] };
            data.push(currentCat);
        } else if (currentCat) {
            currentCat.items.push(line);
        }
    });
    return data;
}

function applyFontSize(traitSize, studentSize) {
    document.documentElement.style.setProperty('--trait-font-scale', traitSize + 'rem');
    document.documentElement.style.setProperty('--student-font-scale', studentSize + 'rem');
    config.fontSize = traitSize;
    config.studentFontSize = studentSize;
}

function applyTheme(idx) {
    const t = themes[idx];
    document.documentElement.style.setProperty('--primary-bg', t.bg);
    document.documentElement.style.setProperty('--accent-color', t.accent);
    document.documentElement.style.setProperty('--text-color', t.text || '#1e293b');
    config.themeIdx = idx;

    // 隨機選取 5 種輔助色（排除當前主題色）
    const otherColors = themes.filter((_, i) => i != idx).map(item => item.accent);
    secondaryColors = otherColors.sort(() => 0.5 - Math.random()).slice(0, 18);
}

function loadConfigToUI() {
    document.getElementById('gradeSet').value = config.grade;
    document.getElementById('wordCountSet').value = config.wordCount;
    document.getElementById('studentListSet').value = config.students;
    document.getElementById('traitsSet').value = config.traitsRaw;
    document.getElementById('tonesSet').value = config.tones;
    document.getElementById('prePromptSet').value = config.prePrompt;
    document.getElementById('promptTemplateSet').value = config.promptTemplate;
    document.getElementById('themeSelect').value = config.themeIdx;
    document.getElementById('gridCountSet').value = config.gridCount;
    document.getElementById('traitColSet').value = config.traitCols || 5;
    document.getElementById('fontSizeSet').value = config.fontSize || "1.4";
    document.getElementById('studentFontSizeSet').value = config.studentFontSize || "1.2";
    document.getElementById('includeCatNameSet').checked = config.includeCatName || false;
}

function resetField(id) {
    if(!confirm("確定要將此項重置為預設值嗎？")) return;
    if(id === 'traitsSet') document.getElementById(id).value = defaultConfig.traitsRaw;
    if(id === 'promptTemplateSet') document.getElementById(id).value = defaultConfig.promptTemplate;
    if(id === 'studentListSet') document.getElementById(id).value = defaultConfig.students;
    if(id === 'tonesSet') document.getElementById(id).value = defaultConfig.tones;
    if(id === 'prePromptSet') document.getElementById(id).value = defaultConfig.prePrompt;
}

function copyOutput() { 
    navigator.clipboard.writeText(document.getElementById('outputText').innerText); 
    alert("已複製"); 
}

function exportData() {
    const data = JSON.stringify({ config, studentStates });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([data], { type: 'application/json' }));
    a.download = `EvalPrompt_${new Date().toISOString().slice(0,10)}.json`;
    a.click();
}

function importData(e) {
    const reader = new FileReader();
    reader.onload = (ev) => {
        const imported = JSON.parse(ev.target.result);
        config = imported.config; studentStates = imported.studentStates;
        saveToLocal(); location.reload();
    };
    reader.readAsText(e.target.files[0]);
}

function scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
}
