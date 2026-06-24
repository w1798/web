/**
 * Charles Nextime Web Tools Portal - Core Logic
 * Copyright (c) 2026 Charles Nextime
 * Licensed under the GNU General Public License v3.0
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation.
 */


const STORAGE_KEY = 'QR_LABELS_CONFIG_V3';


/**
 * 修改後的初始化邏輯
 */
function initApp() {
    const hSel = document.getElementById('h_cut');
    const vSel = document.getElementById('v_cut');
    
    // 確保選單存在才執行
    if (!hSel || !vSel) return;

    // 清空並重新建立 1~15 選項
    hSel.innerHTML = '';
    vSel.innerHTML = '';
    for(let i=1; i<=15; i++){
        hSel.add(new Option(i, i));
        vSel.add(new Option(i, i));
    }

    // 1. 定義預設值 (其餘代碼保持不變...)
    const DEFAULT_CONFIG = {
        h_cut: "5",
        v_cut: "6",
        orientation: "portrait",
        border_style: "no-outline-dashed",
        margin_cm: "0.2",
        layout_style: "top-down",
        v_align: "center",
        h_align: "center",
        font_size: "10",
        line_spacing: "14",
        qr_size_cm: "2.5",
        offset_dxa: "240",
        caption: "Nextime 網頁程式集",
        url: "https://w1798.github.io/web",
        subject: "支援圖文上下或左右並排\n自定尺寸、字體大小\n適配各種規格的標籤紙"
    };

    // 2. 讀取與合併設定 (其餘代碼保持不變...)
    const savedRaw = localStorage.getItem(STORAGE_KEY);
    let finalConfig = DEFAULT_CONFIG;
    if (savedRaw) {
        try {
            const savedConfig = JSON.parse(savedRaw);
            finalConfig = { ...DEFAULT_CONFIG, ...savedConfig };
        } catch (e) { console.error("解析存檔失敗"); }
    }

    // 3. 套用到 UI
    Object.keys(finalConfig).forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = finalConfig[id];
    });
}

// --- 核心修正：判斷載入時機 ---
function start() {
    initApp();
    setupBackToTop();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
} else {
    start();
}



// 自動存檔
document.addEventListener('input', () => {
    const config = {};
    document.querySelectorAll('input, select, textarea').forEach(el => {
        if(el.id && el.id !== 'importFile') config[el.id] = el.value;
    });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
});

function exportConfig() {
    const data = localStorage.getItem(STORAGE_KEY);
    const blob = new Blob([data], {type: "application/json"});
    saveAs(blob, "qr_label_config.json");
}

function importConfig(input) {
    const file = input.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const importedData = JSON.parse(e.target.result);
            
            // 建議統一與 DEFAULT_CONFIG 合併，因為它才是最完整的範本
            // 這樣即便匯入的是極舊版本的檔案，也能完美補齊新參數
            const finalMerged = { ...DEFAULT_CONFIG, ...importedData };
            
            localStorage.setItem(STORAGE_KEY, JSON.stringify(finalMerged));
            alert("匯入成功！");
            location.reload();
        } catch (err) {
            alert("匯入失敗：檔案格式不正確");
        }
    };
    reader.readAsText(file);
}

function resetConfig() {
    if(confirm("確定要重置所有設定嗎？")) {
        localStorage.removeItem(STORAGE_KEY);
        location.reload();
    }
}


async function mainProcess() {
    const { Document, Packer, Paragraph, Table, TableRow, TableCell, WidthType, ImageRun, AlignmentType, VerticalAlign, TextRun, BorderStyle, TableLayoutType } = window.docx;
    const status = document.getElementById('status');
    
    try {        
        // 1. 抓取所有介面數值
        const caption = document.getElementById('caption').value;
        let url = document.getElementById('url').value;
        const subject = document.getElementById('subject').value;
        const hCut = parseInt(document.getElementById('h_cut').value);
        const vCut = parseInt(document.getElementById('v_cut').value);
        const orientation = document.getElementById('orientation').value;
        const marginCm = parseFloat(document.getElementById('margin_cm').value);
        const bStyle = document.getElementById('border_style').value;
        const fSize = parseFloat(document.getElementById('font_size').value);
        const lineSpacingPt = parseFloat(document.getElementById('line_spacing').value);
        const qrSizeCm = parseFloat(document.getElementById('qr_size_cm').value);
        const lStyle = document.getElementById('layout_style').value;
        const vAlignInput = document.getElementById('v_align').value;
        const hAlignInput = document.getElementById('h_align').value;
        const offsetDxa = parseInt(document.getElementById('offset_dxa').value) || 0;

        // 2. 處理文字內容與對齊映射
        const lines = subject.split('\n').filter(t => t.trim() !== "");
        const vAlignMap = { "top": VerticalAlign.TOP, "center": VerticalAlign.CENTER, "bottom": VerticalAlign.BOTTOM };
        const hAlignMap = { "left": AlignmentType.LEFT, "center": AlignmentType.CENTER, "right": AlignmentType.RIGHT };
        
        // 判斷是否為左右並排模式
        const isLeft = (lStyle === 'left-right');
        const isRight = (lStyle === 'right-left');
        const isSideBySide = isLeft || isRight;

        // 3. 佈局參數計算 (1cm = 567 DXA)
        const mDxa = Math.floor(marginCm * 567);
        const pW = orientation === "landscape" ? 16838 : 11906;
        const pH = orientation === "landscape" ? 11906 : 16838;
        const uW = pW - (mDxa * 2);
        const uH = pH - (mDxa * 2) - offsetDxa; 

        const totalLabelWidthDxa = Math.floor(uW / hCut); // 單個標籤總寬
        const cH = Math.floor(uH / vCut); // 單個標籤總高

        // 左右排時，動態分配寬度
        const qrCellWidthDxa = Math.floor((qrSizeCm + 0.3) * 567); // QR碼寬度 + 0.3cm 緩衝
        const textCellWidthDxa = totalLabelWidthDxa - qrCellWidthDxa;

        // 4. QR Code 生成 (Canvas 繪製中心文字)
        if (url.length < 90) {
            const sep = url.includes('?') ? '&' : '?';
            url += sep + "padding=" + " ".repeat(90 - url.length - 9);
        }

        const qrUint8 = await new Promise((resolve) => {
            const qrBox = document.getElementById('qr-hidden');
            qrBox.innerHTML = '';
            new QRCode(qrBox, { text: url, width: 400, height: 400, correctLevel: QRCode.CorrectLevel.H });
            
            setTimeout(() => {
                const canvas = document.getElementById('canvas-buffer');
                const ctx = canvas.getContext('2d');
                canvas.width = 400; canvas.height = 400;
                ctx.fillStyle = "white"; ctx.fillRect(0,0,400,400);
                ctx.drawImage(qrBox.querySelector('canvas'), 0, 0, 400, 400);
                ctx.font = "bold 34px Arial";
                const tw = ctx.measureText(caption).width;
                ctx.fillStyle = "white"; ctx.fillRect(200 - tw/2 - 10, 185, tw + 20, 40);
                ctx.fillStyle = "black"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
                ctx.fillText(caption, 200, 205);
                const bin = atob(canvas.toDataURL("image/png").split(',')[1]);
                const arr = new Uint8Array(bin.length);
                for(let i=0; i<bin.length; i++) arr[i] = bin.charCodeAt(i);
                resolve(arr);
            }, 500);
        });

        // 5. 動態框線邏輯 (核心修正區)
        const getBorders = (r, actualColIndex, totalActualCols) => {
            const no = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
            
            // 根據選擇決定線條樣式
            let style = BorderStyle.SINGLE;
            if (bStyle.includes('dashed')) style = BorderStyle.DASHED;
            
            const ok = { style: style, size: 4, color: "000000" };
            
            let b = { top: ok, bottom: ok, left: ok, right: ok };
            
            // 處理「無線」
            if (bStyle === 'none') return { top: no, bottom: no, left: no, right: no };

            // 處理左右排模式時的內部中間線（永遠隱藏）
            if (isSideBySide) {
                if (actualColIndex % 2 === 0) b.right = no;
                else b.left = no;
            }

            // 處理「無外框」邏輯 (無論實線或虛線)
            if (bStyle.startsWith('no-outline')) {
                if (r === 0) b.top = no;
                if (r === vCut - 1) b.bottom = no;
                if (actualColIndex === 0) b.left = no;
                if (actualColIndex === totalActualCols - 1) b.right = no;
            }
            
            return b;
        };

        // 6. 建立表格內容
        const rows = [];
        const actualH = isSideBySide ? hCut * 2 : hCut;

        for (let i = 0; i < vCut; i++) {
            const cells = [];
            for (let j = 0; j < hCut; j++) {
                
                const qrImg = new ImageRun({ 
                    data: qrUint8, 
                    transformation: { width: qrSizeCm * 37.8, height: qrSizeCm * 37.8 } 
                });
                
                const lineSpacingDxa = lineSpacingPt * 20;
                // 在左右排模式下，圖案那一格設為置中，視覺效果最好
                const qrPara = new Paragraph({ alignment: isSideBySide ? AlignmentType.CENTER : hAlignMap[hAlignInput], children: [qrImg] });
                const textParas = lines.map(t => new Paragraph({
                    alignment: hAlignMap[hAlignInput],
                    spacing: { line: lineSpacingDxa, lineRule: "exact" },
                    children: [new TextRun({ text: t, size: fSize * 2, font: "微軟正黑體" })]
                }));

                if (isSideBySide) {
                    // 左右模式：建立兩個儲存格代表一個標籤
                    const qrCell = new TableCell({
                        width: { size: qrCellWidthDxa, type: WidthType.DXA },
                        verticalAlign: VerticalAlign.CENTER, // 置中
                        // 修正這裡的框線傳參
                        borders: getBorders(i, lStyle === 'left-right' ? j * 2 : j * 2 + 1, actualH),
                        children: [qrPara]
                    });

                    const textCell = new TableCell({
                        width: { size: textCellWidthDxa, type: WidthType.DXA },
                        verticalAlign: vAlignMap[vAlignInput],
                        // 修正這裡的框線傳參
                        borders: getBorders(i, lStyle === 'left-right' ? j * 2 + 1 : j * 2, actualH),
                        children: textParas.length > 0 ? textParas : [new Paragraph("")]
                    });

                    // 核心修正：依照排列模式推入儲存格
                    if (lStyle === 'left-right') {
                        cells.push(qrCell, textCell); // [圖, 字]
                    } else {
                        // 在圖在右模式下，j*2 是文字格，j*2+1 是圖案格。
                        // getBorders 內部邏輯已同步修正。
                        cells.push(textCell, qrCell); // [字, 圖]
                    }
                } else {
                    // 上下模式：單個儲存格
                    const cellContent = (lStyle === 'top-down') ? [qrPara].concat(textParas) : textParas.concat([qrPara]);
                    cells.push(new TableCell({
                        width: { size: totalLabelWidthDxa, type: WidthType.DXA },
                        verticalAlign: vAlignMap[vAlignInput],
                        borders: getBorders(i, j, actualH),
                        children: cellContent
                    }));
                }
            }
            rows.push(new TableRow({ children: cells, height: { value: cH, rule: "exact" } }));
        }

        // 7. 封裝文件
        const doc = new Document({
            compact: true,
            sections: [{
                properties: { 
                    page: { 
                        size: { width: pW, height: pH }, 
                        margin: { top: mDxa, bottom: mDxa, left: mDxa, right: mDxa } 
                    } 
                },
                children: [
                    new Table({ 
                        rows, 
                        width: { size: uW, type: WidthType.DXA }, 
                        layout: TableLayoutType.FIXED 
                    })
                ]
            }]
        });

        const blob = await Packer.toBlob(doc);
        saveAs(blob, `${caption}_標籤.docx`);
    } catch (err) {
        status.innerText = "錯誤: " + err.message;
        console.error(err);
    }
}

// 監聽轉到頂部按鈕
function setupBackToTop() {
    let btn = document.getElementById('back-to-top');
    if (!btn) {
        btn = document.createElement('button');
        btn.id = 'back-to-top';
        btn.innerHTML = '↑';
        btn.title = '回頂部';
        document.body.appendChild(btn);
        btn.onclick = () => window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    window.addEventListener('scroll', () => {
        if (window.scrollY > 200) {
            btn.classList.add('show');
        } else {
            btn.classList.remove('show');
        }
    });
}

