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
    const libUrls = [
        'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js'
    ];

    libUrls.forEach(url => {
        const script = document.createElement('script');
        script.src = url;
        script.async = false;

        // 從 URL 提取完整檔名 (例如: exceljs.min.js)
        const fileName = new URL(url).pathname.split('/').pop();

        // 情況 A：外部載入成功
        script.onload = function() {
            console.log(`%c[成功] 外部庫已載入: ${fileName}`, 'color: #4CAF50; font-weight: bold;');
        };

        // 情況 B：外部載入失敗，啟動備援
        script.onerror = function() {
            const fallbackPath = `libs/${fileName}`;
            console.warn(`[失敗] 外部庫載入失敗，嘗試本地載入: ${fallbackPath}`);
            
            const fallbackScript = document.createElement('script');
            fallbackScript.src = fallbackPath;
            
            // 本地載入的成功/失敗監聽（選配）
            fallbackScript.onload = () => console.log(`%c[備援成功] 已從本地載入: ${fileName}`, 'color: #FF9800; font-weight: bold;');
            fallbackScript.onerror = () => console.error(`[重大錯誤] 本地備援檔案不存在: ${fallbackPath}`);

            document.head.appendChild(fallbackScript);
        };

        document.head.appendChild(script);
    });
}

// 執行載入
initLibraries();

let exportMode = 'google'; // 預設導出模式
let groupName = "4學生和家長"; // 預設群組名稱

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
    let customName = f.replace("地址-縣市區里", "區里")
                      .replace("地址-其他", "地址");

    // 預設哪些要進備註 (包含性別、地址、身分證、生日、公司電話等)
    const noteKeywords = ["地址-其他", "生日", "身分證", "學號", "電話"];
    let isNote = noteKeywords.some(key => f.includes(key));

    return {
        original: f,
        custom: customName,
        isNote: isNote
    };
});

function renderOutputTable() {
    const body = document.getElementById('outputSettingBody');
    
    // 1. 先定義最上方的群組設定區塊 (這部分不在 table 裡面)
    let groupSettingHtml = `
        <div style="margin-bottom: 20px; padding: 15px; background: #eef2f7; border-radius: 8px; border: 1px solid #d1d9e6;">
            <strong style="color: #2c3e50;">📁 匯入群組名稱設定</strong><br>
            <small style="color: #666;">產出的聯絡人將歸類在此群組</small><br>
            <input type="text" id="groupNameInput" value="${groupName}" 
                   style="width: 100%; margin-top: 8px; padding: 10px; border: 1px solid #cbd5e0; border-radius: 5px; box-sizing: border-box;" 
                   placeholder="例如：114學年301班">
        </div>
    `;

    // 2. 定義表格結構
    let tableHtml = `
        <table style="width:100%; border-collapse: collapse;">
            <thead>
                <tr style="background:#f8f9fa; border-bottom: 2px solid #dee2e6;">
                    <th style="padding: 10px; text-align: left;">Excel 原始標題</th>
                    <th style="padding: 10px; text-align: left;">輸出自訂名稱</th>
                    <th style="padding: 10px; width:80px; text-align: center;">匯出備註</th>
                </tr>
            </thead>
            <tbody>
    `;

    // 3. 填入表格內容列
    tableHtml += outputConfig.map((item, i) => `
        <tr style="border-bottom: 1px solid #eee;">
            <td style="padding: 8px; font-size: 0.9em; color: #444;">${item.original}</td>
            <td style="padding: 8px;">
                <input type="text" id="cust_${i}" value="${item.custom}" 
                       style="width:95%; padding: 5px; border: 1px solid #ddd; border-radius: 3px;">
            </td>
            <td style="padding: 8px; text-align:center;">
                <input type="checkbox" id="note_${i}" ${item.isNote ? 'checked' : ''}>
            </td>
        </tr>
    `).join('');

    tableHtml += `</tbody></table>`;

    // 4. 最後將「群組設定」+「表格」合併放入 body
    body.innerHTML = groupSettingHtml + tableHtml;
}

// --- 以下 Modal 控制與批次操作保持不變 ---

function openModal(id) {
    if(id === 'fieldModal') document.getElementById('rawFieldInput').value = fieldList.join('\n');
    if(id === 'outputModal') renderOutputTable();
    document.getElementById(id).style.display = 'block';
}

function closeModal(id) { document.getElementById(id).style.display = 'none'; }


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
    // 儲存群組名稱
    const gInput = document.getElementById('groupNameInput');
    if (gInput) {
        groupName = gInput.value.trim() || "4學生和家長";
    }

    // 儲存欄位設定
    outputConfig.forEach((item, i) => {
        let val = document.getElementById(`cust_${i}`).value.trim();
        item.custom = (val === "") ? item.original : val;
        item.isNote = document.getElementById(`note_${i}`).checked;
    });
    closeModal('outputModal');
}

function exportConfig() {
    // 加入 groupName
    const blob = new Blob([JSON.stringify({fieldList, outputConfig, groupName}, null, 2)], {type: "application/json"});
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "GuardianContacts_config.json";
    a.click();
}

function importConfig(e) {
    const reader = new FileReader();
    reader.onload = (event) => {
        const data = JSON.parse(event.target.result);
        fieldList = data.fieldList;
        outputConfig = data.outputConfig;
        groupName = data.groupName || "4學生和家長"; // 讀取匯入的群組名
        alert("匯入成功！");
    };
    reader.readAsText(e.target.files[0]);
}

function triggerUpload(mode) {
    exportMode = mode;
    document.getElementById('fileInput').click();
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


function downloadFile(content, filename, type) {
    const blob = new Blob([content], { type: type });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
}


function processLogic(rows) {
    const fullHeaders = ["Name", "Notes", "Group Membership", "Phone 1 - Type", "Phone 1 - Value"];
    
    // --- 動態偵測標題列邏輯 ---
    const feature1 = fieldList[0]; 
    const feature2 = fieldList[1];

    const headerRowIdx = rows.findIndex(r => {
        if (!r) return false;
        const rowContent = r.join("|"); 
        return rowContent.includes(feature1) || (feature2 && rowContent.includes(feature2));
    });
    
    if (headerRowIdx === -1) {
        alert(`❌ 找不到標題列！請確認 Excel 中是否包含「${feature1}」欄位。`);
        return;
    }

    const excelHeaders = rows[headerRowIdx].map(h => h ? h.toString().trim() : "");

    // 必要欄位檢查
    const requiredFields = ["姓名", "座號", "監護人", "父親姓名", "母親姓名", "父親行動電話", "母親行動電話"];
    const missingFields = requiredFields.filter(f => !excelHeaders.includes(f));

    if (missingFields.length > 0) {
        alert(`⚠️ 轉換失敗！Excel 缺少以下必要欄位：\n\n${missingFields.join("\n")}`);
        return;
    }

    const dataRows = rows.slice(headerRowIdx + 1);

    const getVal = (row, originalHeader) => {
        const idx = excelHeaders.indexOf(originalHeader);
        let val = (idx !== -1 && row[idx] !== undefined) ? row[idx].toString().trim() : "";
        if (originalHeader.includes("日期") || originalHeader.includes("生日")) {
            val = formatExcelDate(val);
        }
        return val;
    };

    // 用於 Google 的 Array 與 用於 iCloud 的 String
    let csvRows = [fullHeaders];
    let vCardContent = "";

    dataRows.forEach(row => {
        if (!row || row.length === 0) return;
        const name = getVal(row, "姓名");
        const sn = getVal(row, "座號");
        if (!name) return;

        const guardName = getVal(row, "監護人");
        const fatherName = getVal(row, "父親姓名");
        const motherName = getVal(row, "母親姓名");

        const fPhoneRaw = pickBestPhone(row, ["父親行動電話", "父親聯絡電話1", "父親聯絡電話2"], getVal);
        const mPhoneRaw = pickBestPhone(row, ["母親行動電話", "母親聯絡電話1", "母親聯絡電話2"], getVal);
        const gPhoneRaw = pickBestPhone(row, ["監護人行動電話", "監護人聯絡電話1", "監護人聯絡電話2"], getVal);

        // 收集備註資料
        let notesArr = [];
        let usedValues = new Set(); 

        outputConfig.forEach(conf => {
            if (conf.isNote) {
                let val = getVal(row, conf.original);
                if (val) {
                    let isPhoneField = conf.original.includes("電話") || conf.original.includes("行動");
                    let cleanVal = isPhoneField ? val.replace(/[^\d]/g, "") : val;
                    if (isPhoneField && cleanVal.startsWith("9") && cleanVal.length === 9) cleanVal = "0" + cleanVal;

                    if (!usedValues.has(val)) {
                        if (isPhoneField) {
                            if (cleanVal !== fPhoneRaw && cleanVal !== mPhoneRaw && cleanVal !== gPhoneRaw) {
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

        // 1. 建立聯絡人清單
        const contacts = [];
        const guardIsFather = (guardName && fatherName && guardName === fatherName);
        const guardIsMother = (guardName && motherName && guardName === motherName);
        const guardIsOther = (guardName && !guardIsFather && !guardIsMother);

        if (gPhoneRaw && guardIsOther) contacts.push({ type: 'guard', label: `監護人(${guardName})`, phone: gPhoneRaw });
        if (mPhoneRaw && motherName) contacts.push({ type: 'mother', label: `媽媽(${motherName})`, phone: mPhoneRaw });
        if (fPhoneRaw && fatherName) contacts.push({ type: 'father', label: `爸爸(${fatherName})`, phone: fPhoneRaw });

        if (contacts.length === 0) return;

        // 2. 智慧判定主要聯絡人
        let targetIdx = -1;
        if (guardIsOther) targetIdx = contacts.findIndex(c => c.type === 'guard');
        else if (guardIsMother) targetIdx = contacts.findIndex(c => c.type === 'mother');
        else if (guardIsFather) targetIdx = contacts.findIndex(c => c.type === 'father');
        if (targetIdx === -1) targetIdx = 0;

        // 3. 根據 exportMode 產生資料
        contacts.forEach((c, index) => {
            let finalPhone = c.phone;
            if (finalPhone && !finalPhone.startsWith("0") && finalPhone.length <= 8) {
                finalPhone = "03" + finalPhone;
            }

            const isMainContact = (index === targetIdx);
            const star = isMainContact ? "*" : "";
            const displayName = `${sn}${star}${name}${c.label}`;

            if (exportMode === 'google') {
                // Google CSV 邏輯
                csvRows.push([
                    displayName,
                    isMainContact ? fullNote : "",
                    `* My Contacts ::: ${groupName}`,
                    "Mobile",
                    finalPhone
                ]);
            } else {
                // iCloud vCard 邏輯 (使用 vCard 3.0 標準)
                vCardContent += `BEGIN:VCARD\n`;
                vCardContent += `VERSION:3.0\n`;
                vCardContent += `FN:${displayName}\n`;
                vCardContent += `TEL;TYPE=CELL:${finalPhone}\n`;
                if (isMainContact && fullNote) {
                    // vCard 的備註換行符號需轉義為 \n 字串
                    vCardContent += `NOTE:${fullNote.replace(/\n/g, '\\n')}\n`;
                }
                vCardContent += `CATEGORIES:${groupName}\n`;
                vCardContent += `END:VCARD\n`;
            }
        });
    });

    // 4. 下載檔案
    if (exportMode === 'google') {
        const csvContent = "\uFEFF" + csvRows.map(e => e.map(cell => `"${cell.replace(/"/g, '""')}"`).join(",")).join("\n");
        downloadFile(csvContent, "GuardianContacts.csv", 'text/csv;charset=utf-8;');
    } else {
        downloadFile(vCardContent, "GuardianContacts.vcf", 'text/vcard;charset=utf-8;');
    }
}