/**
 * Charles Nextime Web Tools Portal - Core Logic
 * Copyright (c) 2026 Charles Nextime
 * Licensed under the GNU General Public License v3.0
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation.
 */

 // 負責載入外部套件的函式
function initLibrary() {
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
    
    script.onerror = function() {
        console.warn("外部庫載入失敗，嘗試本地載入...");
        const fallback = document.createElement('script');
        fallback.src = 'xlsx.full.min.js';
        document.head.appendChild(fallback);
    };
    
    document.head.appendChild(script);
}

// 執行載入
initLibrary();


// 1. 更新後的欄位清單
let fieldList = [
    "年班", "座號", "姓名", "性別", "國籍", 
    "戶籍地址-縣市區里", "戶籍地址-其他", "戶籍電話1", "戶籍電話2", 
    "聯絡地址-縣市區里", "聯絡地址-其他", "聯絡電話1", "聯絡電話2", 
    "監護人", "監護人聯絡電話1", "監護人聯絡電話2", "監護人公司電話", "監護人行動電話", "監護人聯絡地址-縣市區里", "監護人聯絡地址-其他", 
    "父親姓名", "父親聯絡電話1", "父親聯絡電話2", "父親公司電話", "父親行動電話", 
    "母親姓名", "母親聯絡電話1", "母親聯絡電話2", "母親公司電話", "母親行動電話", 
    "出生日期", "身分證字號", "學號"
];

// 2. 預設輸出設定邏輯
let outputConfig = fieldList.map(f => {
    // 簡化顯示名稱
    let customName = f.replace("出生日期", "生日")
                      .replace("地址-縣市區里", "區里")
                      .replace("地址-其他", "地址");

    // 預設哪些要進備註 (包含性別、地址、身分證、生日、公司電話等)
    const noteKeywords = ["性別", "地址-其他", "生日", "身分證", "學號", "電話"];
    let isNote = noteKeywords.some(key => f.includes(key));

    return {
        original: f,
        custom: customName,
        isNote: isNote
    };
});

// --- 以下 Modal 控制與批次操作保持不變 ---

function openModal(id) {
    if(id === 'fieldModal') document.getElementById('rawFieldInput').value = fieldList.join('\n');
    if(id === 'outputModal') renderOutputTable();
    document.getElementById(id).style.display = 'block';
}

function closeModal(id) { document.getElementById(id).style.display = 'none'; }

function renderOutputTable() {
    const body = document.getElementById('outputSettingBody');
    body.innerHTML = outputConfig.map((item, i) => `
        <tr>
            <td>${item.original}</td>
            <td><input type="text" id="cust_${i}" value="${item.custom}" placeholder="${item.original}"></td>
            <td style="text-align:center;"><input type="checkbox" id="note_${i}" ${item.isNote ? 'checked' : ''}></td>
        </tr>
    `).join('');
}

function batchAction(type) {
    outputConfig.forEach((item, i) => {
        if(type === 'resetName') document.getElementById(`cust_${i}`).value = item.original;
        if(type === 'selectAllNote') document.getElementById(`note_${i}`).checked = true;
        if(type === 'resetNote') document.getElementById(`note_${i}`).checked = false;
    });
}

function saveFields() {
    fieldList = document.getElementById('rawFieldInput').value.split('\n').map(s => s.trim()).filter(s => s !== "");
    outputConfig = fieldList.map(f => {
        const old = outputConfig.find(o => o.original === f);
        return old ? old : { original: f, custom: f, isNote: false };
    });
    closeModal('fieldModal');
}

function saveOutputSettings() {
    outputConfig.forEach((item, i) => {
        let val = document.getElementById(`cust_${i}`).value.trim();
        item.custom = (val === "") ? item.original : val;
        item.isNote = document.getElementById(`note_${i}`).checked;
    });
    closeModal('outputModal');
}

function exportConfig() {
    const blob = new Blob([JSON.stringify({fieldList, outputConfig}, null, 2)], {type: "application/json"});
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "contact_config.json";
    a.click();
}

function importConfig(e) {
    const reader = new FileReader();
    reader.onload = (event) => {
        const data = JSON.parse(event.target.result);
        fieldList = data.fieldList;
        outputConfig = data.outputConfig;
        alert("匯入成功！");
    };
    reader.readAsText(e.target.files[0]);
}

// --- Excel 處理邏輯 (包含您要求的優先順序與電話欄位更新) ---

document.getElementById('fileInput').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (!file) return;
    document.getElementById('fileNameDisplay').textContent = "處理中：" + file.name;
    
    const reader = new FileReader();
    reader.onload = function(event) {
        try {
            const data = new Uint8Array(event.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const rows = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { header: 1 });
            processLogic(rows);
            document.getElementById('fileNameDisplay').textContent = "✅ 已完成：" + file.name;
        } catch (err) {
            console.error(err);
            alert("錯誤：" + err.message);
            document.getElementById('fileNameDisplay').textContent = "❌ 失敗";
        } finally {
            e.target.value = ""; 
        }
    };
    reader.readAsArrayBuffer(file);
});

// 新增日期轉換工具函式
function formatExcelDate(val) {
    if (!val) return "";
    // 如果是數字（Excel 的日期序列值，例如 41886）
    if (!isNaN(val) && val.toString().length >= 4 && val.toString().length <= 6) {
        const date = XLSX.SSF.parse_date_code(val);
        return `${date.y}/${date.m}/${date.d}`;
    }
    return val; // 如果已經是字串格式則直接回傳
}

// 新增：智慧挑選最優電話函式
function pickBestPhone(row, fields, getValFunc) {
    let allPhones = fields.map(f => getValFunc(row, f).replace(/[^\d]/g, ""));
    
    // 1. 優先尋找手機格式 (09 開頭 10 碼，或 9 開頭 9 碼)
    for (let p of allPhones) {
        if (!p) continue;
        // 情況 A: 標準 09 開頭
        if (p.startsWith("09") && p.length === 10) return p;
        // 情況 B: 漏掉 0 的 9 開頭手機 (9xxxxxxxx 共 9 碼)
        if (p.startsWith("9") && p.length === 9) return "0" + p;
    }
    
    // 2. 如果沒手機，回傳第一個有值的號碼 (可能是市話)
    return allPhones.find(p => p !== "") || "";
}

function processLogic(rows) {
    const fullHeaders = ["Name", "Given Name", "Additional Name", "Family Name", "Yomi Name", "Given Name Yomi", "Additional Name Yomi", "Family Name Yomi", "Name Prefix", "Name Suffix", "Initials", "Nickname", "Short Name", "Maiden Name", "Birthday", "Gender", "Location", "Billing Information", "Directory Server", "Mileage", "Occupation", "Hobby", "Sensitivity", "Priority", "Subject", "Notes", "Group Membership", "Phone 1 - Type", "Phone 1 - Value"];
    
    const headerRowIdx = rows.findIndex(r => r && (r.includes("姓名") || r.includes("座號")));
    if (headerRowIdx === -1) throw new Error("找不到表頭列，請確認 Excel 內容。");

    const excelHeaders = rows[headerRowIdx];
    const dataRows = rows.slice(headerRowIdx + 1);

    const getVal = (row, originalHeader) => {
        const idx = excelHeaders.indexOf(originalHeader);
        let val = (idx !== -1 && row[idx] !== undefined) ? row[idx].toString().trim() : "";
        if (originalHeader.includes("日期") || originalHeader.includes("生日")) {
            val = formatExcelDate(val);
        }
        return val;
    };

    let outputRows = [fullHeaders];

    dataRows.forEach(row => {
        if (!row || row.length === 0) return;
        const name = getVal(row, "姓名");
        const sn = getVal(row, "座號");
        if (!name) return;

        const guardName = getVal(row, "監護人");
        const fatherName = getVal(row, "父親姓名");
        const motherName = getVal(row, "母親姓名");

        // --- 智慧抓取電話：優先找手機，手機沒有才找聯絡電話 ---
        const fPhoneRaw = pickBestPhone(row, ["父親行動電話", "父親聯絡電話1", "父親聯絡電話2"], getVal);
        const mPhoneRaw = pickBestPhone(row, ["母親行動電話", "母親聯絡電話1", "母親聯絡電話2"], getVal);
        const gPhoneRaw = pickBestPhone(row, ["監護人行動電話", "監護人聯絡電話1", "監護人聯絡電話2"], getVal);

        // 收集備註資料 (過濾重複與過濾父母電話)
        let notesArr = [];
        let usedValues = new Set(); 

        outputConfig.forEach(conf => {
            if (conf.isNote) {
                let val = getVal(row, conf.original);
                if (val) {
                    let isPhoneField = conf.original.includes("電話") || conf.original.includes("行動");
                    let cleanVal = isPhoneField ? val.replace(/[^\d]/g, "") : val;
                    
                    // 特殊處理：如果是 9 開頭的手機號碼，比對前也要補 0
                    if (isPhoneField && cleanVal.startsWith("9") && cleanVal.length === 9) cleanVal = "0" + cleanVal;

                    if (!usedValues.has(val)) {
                        if (isPhoneField) {
                            // 備註內的電話若跟最終選定的爸媽電話一樣，就不顯示
                            if (cleanVal !== fPhoneRaw && cleanVal !== mPhoneRaw) {
                                notesArr.push(`${conf.custom}:${val}`);
                                usedValues.add(val);
                            }
                        } else {
                            notesArr.push(`${conf.custom}:${val}`);
                            usedValues.add(val);
                        }
                    }
                }
            }
        });
        const fullNote = notesArr.join("\n");

        const contacts = [];
        let targetType = "";

        const guardIsFather = (guardName && fatherName && guardName === fatherName);
        const guardIsMother = (guardName && motherName && guardName === motherName);
        const guardIsOther = (guardName && !guardIsFather && !guardIsMother);

        // 建立聯絡人候選清單
        if (gPhoneRaw && guardIsOther) contacts.push({ type: 'guard', label: `監護人(${guardName})`, phone: gPhoneRaw });
        if (mPhoneRaw && motherName) contacts.push({ type: 'mother', label: `媽媽(${motherName})`, phone: mPhoneRaw });
        if (fPhoneRaw && fatherName) contacts.push({ type: 'father', label: `爸爸(${fatherName})`, phone: fPhoneRaw });

        // 優先順序掛 * 號
        if (guardIsFather && fPhoneRaw) targetType = 'father';
        else if (guardIsMother && mPhoneRaw) targetType = 'mother';
        else if (guardIsOther && gPhoneRaw) targetType = 'guard';
        else if (mPhoneRaw && motherName) targetType = 'mother';
        else if (fPhoneRaw && fatherName) targetType = 'father';

        contacts.forEach((c) => {
            let finalPhone = c.phone;
            // 如果不是手機且不是 0 開頭，補區碼 03
            if (finalPhone && !finalPhone.startsWith("0") && finalPhone.length <= 8) {
                finalPhone = "03" + finalPhone;
            }

            const isTarget = (c.type === targetType);
            const star = isTarget ? "*" : "";
            
            let rowData = new Array(29).fill("");
            rowData[0] = `${sn}${star}${name}${c.label}`; 
            rowData[25] = isTarget ? fullNote : ""; 
            rowData[26] = "* My Contacts ::: 4學生和家長";
            rowData[27] = "Mobile";
            rowData[28] = finalPhone;
            outputRows.push(rowData);
        });
    });

    const csvContent = "\uFEFF" + outputRows.map(e => e.map(cell => `"${cell.replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "ok.csv";
    link.click();
}