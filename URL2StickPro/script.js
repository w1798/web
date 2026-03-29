


// 負責載入多個外部套件的函式
function initLibraries() {
    const libs = [
        {
            name: 'docx',
            url: 'https://unpkg.com/docx@8.2.2/build/index.umd.js',
            fallback: 'libs/index.umd.js' // 本地備援路徑
        },
        {
            name: 'FileSaver',
            url: 'https://cdnjs.cloudflare.com/ajax/libs/FileSaver.js/2.0.5/FileSaver.min.js',
            fallback: 'libs/FileSaver.min.js'
        },
        {
            name: 'QRCode',
            url: 'https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js',
            fallback: 'libs/qrcode.min.js'
        }
    ];

    libs.forEach(lib => {
        const script = document.createElement('script');
        script.src = lib.url;
        script.async = false; // 確保按順序執行或穩定載入

        script.onerror = function() {
            console.warn(`${lib.name} 外部庫載入失敗，嘗試本地載入...`);
            const fallbackScript = document.createElement('script');
            fallbackScript.src = lib.fallback;
            document.head.appendChild(fallbackScript);
        };

        document.head.appendChild(script);
    });
}

// 執行載入
initLibraries();



const STORAGE_KEY = 'QR_LABELS_CONFIG_V3';

document.addEventListener('DOMContentLoaded', () => {
    const hSel = document.getElementById('h_cut');
    const vSel = document.getElementById('v_cut');
    for(let i=1; i<=15; i++){
        hSel.add(new Option(i, i));
        vSel.add(new Option(i, i));
    }
    
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
        const config = JSON.parse(saved);
        Object.keys(config).forEach(id => {
            const el = document.getElementById(id);
            if (el) el.value = config[id];
        });
    } else {
        hSel.value = 4; vSel.value = 5;
    }
});

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
        localStorage.setItem(STORAGE_KEY, e.target.result);
        location.reload();
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
        status.innerText = "正在生成文件中...";
        
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
        status.innerText = "下載成功！";
    } catch (err) {
        status.innerText = "錯誤: " + err.message;
        console.error(err);
    }
}