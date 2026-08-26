/**
 * Charles Nextime Web Tools Portal - Core Logic
 * Copyright (c) 2026 Charles Nextime
 * Licensed under the GNU General Public License v3.0
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation.
 */

 
// --- 1. 定義儲存鍵名與預設值 ---
const KEY_SCHEDULE = 'SCHOOL_SCHEDULE_ALL_DATA';
const KEY_SETTINGS = 'SCHOOL_SCHEDULE_SUBJECT_MAP';

const DEFAULT_SUBJECT_MAP = { 
    '解題':'解', '數學':'數', '國語':'國', '自然':'自', '體育':'體', '視':'美',
    '多元':'多', '英語':'英', '社會':'社', '專題':'專', '健康':'健',
    '綜合':'綜', '聽':'音', '創客':'資', '本土':'本', 
    'BOOK':'閱', '文學':'文', '暢遊':'英', '生活':'生', '國際':'英'
};

let allProcessedData = []; 
let subjectMap = { ...DEFAULT_SUBJECT_MAP };

// --- 2. 基礎輔助函數 (關鍵修正：補回被遺漏的函數) ---

function cleanName(name) {
    if (!name) return '';
    return name.replace(/老師/g, '').trim();
}

function simplifySubject(text) {
    if (!text || text === '—') return '—';
    for (let key in subjectMap) {
        if (text.toUpperCase().includes(key.toUpperCase())) return subjectMap[key];
    }
    return text;
}

function isSubject(text) {
    const keys = Object.keys(subjectMap);
    return keys.some(k => text.includes(k)) || Object.values(subjectMap).includes(text);
}

// --- 3. 頁面初始化與儲存邏輯 ---
window.onload = () => {
    // 1. 處理科目設定：以預設為底，疊加使用者設定
    const savedSettings = localStorage.getItem(KEY_SETTINGS);
    if (savedSettings) {
        const parsedSettings = JSON.parse(savedSettings);
        // 使用者設定 ({'國語':'國'}) 會覆蓋 DEFAULT 中的同名鍵，
        // 但 DEFAULT 中有的、使用者沒改過的，會被保留。
        subjectMap = { ...DEFAULT_SUBJECT_MAP, ...parsedSettings };
    }

    // 2. 處理課表資料：維持原狀或根據需求決定是否合併
    const savedSchedule = localStorage.getItem(KEY_SCHEDULE);
    if (savedSchedule) {
        allProcessedData = JSON.parse(savedSchedule);
        renderIntegratedTables();
    }
};

function autoSaveSchedule() {
    localStorage.setItem(KEY_SCHEDULE, JSON.stringify(allProcessedData));
}
function autoSaveSettings() {
    localStorage.setItem(KEY_SETTINGS, JSON.stringify(subjectMap));
}

// --- 4. 核心解析邏輯 ---

document.getElementById('fileInput').onchange = async (e) => {
    const files = Array.from(e.target.files);
    for (const file of files) { await handleFile(file); }
    autoSaveSchedule();
    renderIntegratedTables();
    e.target.value = '';
};

async function handleFile(file) {
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.convertToHtml({ arrayBuffer: arrayBuffer });
    const doc = new DOMParser().parseFromString(result.value, 'text/html');
    const table = doc.querySelector('table');
    if (!table) return;
    const rows = Array.from(table.querySelectorAll('tr'));

    const teacherMap = {};
    let isScanningTeachers = false;

    for (let row of rows) {
        let rowText = row.innerText.replace(/\s+/g, '');
        if (rowText.includes('任課教師')) { isScanningTeachers = true; continue; }
        if (isScanningTeachers && (rowText.includes('時間') || rowText.includes('08：'))) isScanningTeachers = false;

        if (isScanningTeachers || rowText.includes('導師')) {
            let cells = Array.from(row.querySelectorAll('td, th')).map(c => c.innerText.replace(/\s+/g, '').trim());
            let tIndex = cells.findIndex(c => c.includes('導師'));
            if (tIndex !== -1 && cells[tIndex + 1]) teacherMap['導師姓名'] = cleanName(cells[tIndex + 1]);

            for(let i = 0; i < cells.length - 1; i++) {
                let item1 = cells[i], item2 = cells[i+1];
                if (isSubject(item1) && !isSubject(item2) && item2.length >= 2) {
                    teacherMap[simplifySubject(item1)] = cleanName(item2);
                }
            }
        }
    }

    const baseIndex = rows.findIndex(r => r.innerText.includes('08：40'));
    const startIndex = Math.max(0, baseIndex); 
    // 1. 抓取檔名中的數字序列 (例如 512 會抓到 "512")
    const match = file.name.match(/(\d+)/);
    let classNum = "";

    if (match) {
        // 2. 取最後兩位數 (例如 512 取出 "12", 501 取出 "01")
        let fullNum = match[0];
        let lastTwo = fullNum.slice(-2);
        
        // 3. 轉為數字再轉回字串，這會自動省略開頭的 0 (例如 "01" 變 "1")
        classNum = parseInt(lastTwo, 10).toString();
    } 

    let scheduleData = [];
    let lessonIndex = 0;

    for (let i = startIndex; i < rows.length; i++) {
        const cells = Array.from(rows[i].querySelectorAll('td, th'));
        if (cells.length >= 6) {
            let rawData = cells.slice(2, 7).map(c => c.innerText.replace(/\s+/g, '').trim());
            while(rawData.length < 5) rawData.splice(2, 0, '—');
            
            let processedRow = rawData.map(s => {
                if (s === '—' || s === '') return '—';
                let simplified = simplifySubject(s);
                if (simplified === s && !Object.values(subjectMap).includes(simplified)) return '—';
                return s; 
            });

            if (lessonIndex === 4) processedRow[2] = '—';
            scheduleData.push(processedRow);
            lessonIndex++;
        }
        if (lessonIndex === 7) break;
    }
    allProcessedData.push({ scheduleData, teacherMap, classNum });
}

// --- 5. 渲染邏輯 ---

function renderIntegratedTables() {
    let tableHeader = '<thead><tr><th>節次</th><th>週一</th><th>週二</th><th>週三</th><th>週四</th><th>週五</th></tr></thead><tbody>';
    
    const generateTable = (title, isTutor) => {
        let summaryHtml = allProcessedData.map(d => {
            let cnt = 0;
            for (let s = 0; s < 7; s++) for (let d2 = 0; d2 < 5; d2++) {
                let r = d.scheduleData[s][d2]; if (r === '—') continue;
                let t = d.teacherMap[simplifySubject(r)], h = d.teacherMap['導師姓名'] || '';
                let isTC = !t || t.includes(h) || t.includes('導師');
                if (isTutor ? isTC : !isTC) cnt++;
            }
            return `${d.classNum}班${cnt}節`;
        }).join('　');
        let html = `<h3 style="display:inline;">${title}</h3><span style="margin-left:15px; font-size:15px; color:#555; font-weight:normal; vertical-align:middle;">${summaryHtml}</span><table border="1" style="border-collapse: collapse; text-align: center; width: 100%; clear:both;">` + tableHeader;
        for (let s = 0; s < 7; s++) {
            let rowStyle = (s === 3) ? 'style="border-bottom: 3px solid black;"' : '';
            html += `<tr ${rowStyle}><td>第${s + 1}節</td>`;
            for (let d = 0; d < 5; d++) {
                let cellContent = "";
                allProcessedData.forEach(dataObj => {
                    let rawSubject = dataObj.scheduleData[s][d];
                    if (rawSubject === '—') return;
                    let subKey = simplifySubject(rawSubject);
                    let teacherName = dataObj.teacherMap[subKey];
                    let homeroomTeacher = dataObj.teacherMap['導師姓名'] || "";
                    let isTutorClass = (!teacherName || (homeroomTeacher !== "" && teacherName.includes(homeroomTeacher)) || teacherName.includes("導師"));

                    if ((isTutor && isTutorClass) || (!isTutor && !isTutorClass)) {
                        cellContent += dataObj.classNum + subKey + " ";
                    }
                });
                html += `<td>${cellContent.trim()}</td>`;
            }
            html += '</tr>';
        }
        return html + '</tbody></table>';
    };
    document.getElementById('scheduleOutput').innerHTML = generateTable('導師課表', true) + '<br>' + generateTable('科任課表', false);
}

// --- 6. 功能選單：設定、匯出入、重置 ---

function openSettings() {
    const text = Object.entries(subjectMap).map(([k, v]) => `${k} ${v}`).join('\n');
    document.getElementById('subjectMapInput').value = text;
    document.getElementById('settingsModal').style.display = 'block';
}

function closeSettings() { document.getElementById('settingsModal').style.display = 'none'; }

function resetScheduleOnly() {
    if (confirm("確定要清除產出的課表嗎？（您的科目縮寫設定將被保留）")) {
        allProcessedData = [];
        localStorage.removeItem(KEY_SCHEDULE);
        document.getElementById('scheduleOutput').innerHTML = "";
    }
}

function resetSettingsOnly() {
    if (confirm("確定要將科目縮寫設定恢復成預設值嗎？")) {
        subjectMap = { ...DEFAULT_SUBJECT_MAP };
        localStorage.removeItem(KEY_SETTINGS);
        const text = Object.entries(subjectMap).map(([k, v]) => `${k} ${v}`).join('\n');
        document.getElementById('subjectMapInput').value = text;
        if (allProcessedData.length > 0) renderIntegratedTables();
    }
}

function saveSettings() {
    const text = document.getElementById('subjectMapInput').value.trim();
    const newMap = {};
    text.split('\n').forEach(line => {
        const parts = line.trim().split(/\s+/);
        if (parts.length >= 2) newMap[parts[0]] = parts[1];
    });
    subjectMap = newMap;
    autoSaveSettings();
    alert('設定已儲存！');
    closeSettings();
    if (allProcessedData.length > 0) renderIntegratedTables();
}

function exportData() {
    if (allProcessedData.length === 0) return alert("無資料可匯出");
    const data = { subjectMap, allProcessedData };
    const blob = new Blob([JSON.stringify(data, null, 2)], {type: "application/json"});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `課表備份_${new Date().getTime()}.json`;
    a.click();
}

document.getElementById('importFile').onchange = function(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(event) {
        try {
            const imported = JSON.parse(event.target.result);
            if (imported.subjectMap) {
                subjectMap = { ...subjectMap, ...imported.subjectMap };
                autoSaveSettings();
            }
            if (imported.allProcessedData) {
                allProcessedData = [...allProcessedData, ...imported.allProcessedData];
                autoSaveSchedule();
            }
            renderIntegratedTables();
            alert("匯入成功！");
        } catch (e) { alert("檔案格式不符。"); }
    };
    reader.readAsText(file);
};
