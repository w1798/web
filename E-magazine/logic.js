/**
 * E-magazine Logic Layer
 * 負責處理資料運算、格式轉換與本地存儲
 */

const E_MAG_STORAGE_KEY = 'e_magazine_app_data';

const Logic = {
    STORAGE_KEY: E_MAG_STORAGE_KEY,

    // 集中管理文選排版的預設值
    PoetryDefaults: {
        fontSizeTitle: 18,
        fontSizeAuthor: 12,
        fontSizeContent: 16,
        authorSpaces: 60,
        enablePageBreak: true,
        emptyLineBetweenParagraphs: true,
        spacingEssay: 1.5,
        spacingPoetry: 1.5,
        spacingReview: 1.5,
        poetryTeacher: '指導 許美麗 師'
    },

    initData() {
        const saved = localStorage.getItem(this.STORAGE_KEY);
        // 合併基礎資料與文選預設值
        const baseDefaults = {
            classInfo: '305',
            teacherName: '許美麗',
            studentNames: '',
            batchNos: '',
            workTitles: '',
            modeOption: 'C',
            modeB_Prefix: '生活花絮',
            modeB_Digits: 3,
            modeB_Count: 10,
            sortOrder: 'time_asc',
            manualInput: '',
            nameTemplate: '{class}-{no}-{student}-{work}-指導老師-{teacher}',
            ...this.PoetryDefaults
        };
        if (!saved) return baseDefaults;
        try {
            const parsed = JSON.parse(saved);
            return { ...baseDefaults, ...parsed };
        } catch (e) { return baseDefaults; }
    },

    saveData(data) {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
    },

    resetData() {
        localStorage.removeItem(this.STORAGE_KEY);
        return this.initData();
    },

    padNumber(num, size) {
        let s = num + "";
        while (s.length < size) s = "0" + s;
        return s;
    },

    processModeB(prefix, count, digits) {
        const results = [];
        for (let i = 1; i <= count; i++) {
            results.push(`${prefix}${this.padNumber(i, digits)}`);
        }
        return results;
    },

    getStudentMap(rawText) {
        const lines = rawText.split('\n');
        const map = {};
        lines.forEach((name, index) => {
            const rollNo = index + 1;
            const trimmedName = name.trim();
            if (trimmedName) map[rollNo] = trimmedName;
        });
        return map;
    },

    applyTemplate(template, vars) {
        return template
            .replace(/\{class\}/g,   vars.class || '')
            .replace(/\{no\}/g,      vars.no || '')
            .replace(/\{student\}/g, vars.student || '')
            .replace(/\{work\}/g,    vars.work || '')
            .replace(/\{teacher\}/g, vars.teacher || '');
    },

    generateFinalFilenames(config) {
        const { classInfo, teacherName, studentNames, workTitles, batchNos, nameTemplate } = config;
        const template = nameTemplate || '{class}-{no}-{student}-{work}-指導老師-{teacher}';
        const studentMap = this.getStudentMap(studentNames);
        const noEntries = (batchNos || '').split('\n').map(s => s.trim()).filter(s => s !== '');
        const titles = (workTitles || '').split('\n').map(t => t.trim()).filter(t => t !== '');
        
        if (noEntries.length === 0) {
            return Object.keys(studentMap).map((noNum) => {
                const no = parseInt(noNum);
                const student = studentMap[no] || '未知';
                const work = titles.length === 1 ? titles[0] : (titles[no-1] || '作品');
                return this.applyTemplate(template, { class: classInfo, no: this.padNumber(no, 2), student, work, teacher: teacherName });
            });
        }

        const finalResults = [];
        noEntries.forEach((noStr, index) => {
            const multiNos = (noStr || "").split(/[,,，]/).map(s => s.trim()).filter(s => s !== '');
            const work = titles.length === 1 ? titles[0] : (titles[index] || (titles[titles.length-1] || '作品'));
            multiNos.forEach(noNum => {
                const no = parseInt(noNum);
                const student = studentMap[no] || '請在最左邊「學生姓名」輸入資料';
                finalResults.push(this.applyTemplate(template, { class: classInfo, no: this.padNumber(no, 2), student, work, teacher: teacherName }));
            });
        });
        return finalResults;
    },

    generateRenameBat(results, mode, classInfo, sortOrder) {
        const UNDO = `undo_還原.bat`;
        let batContent = `@echo off\r\n`;
        batContent += `chcp 65001 >nul\r\n`;
        batContent += `setlocal enabledelayedexpansion\r\n`;
        batContent += `set "UNDO=${UNDO}"\r\n`;
        
        batContent += `if not exist "!UNDO!" goto :START_RENAME\r\n`;
        batContent += `echo.\r\n`;
        batContent += `echo [錯誤] 偵測到 "!UNDO!" 已存在！\r\n`;
        batContent += `echo.\r\n`;
        batContent += `echo 按任意鍵結束...\r\n`;
        batContent += `pause >nul\r\n`;
        batContent += `exit /b\r\n`;
        batContent += `:START_RENAME\r\n\r\n`;

        batContent += `echo @echo off > !UNDO!\r\n`;
        batContent += `echo chcp 65001 ^>nul >> !UNDO!\r\n`;
        
        const dirOrderMap = { time_asc: '/od', time_desc: '/o-d', name_asc: '/on', name_desc: '/o-n' };
        const dirCmd = `dir /b ${dirOrderMap[sortOrder] || '/od'}`;
        
        batContent += `set "i=0"\r\n`;
        batContent += `for /f "delims=" %%f in ('${dirCmd}') do (\r\n`;
        batContent += `    set "skip=0"\r\n`;
        batContent += `    if "%%f"=="run_rename.bat" set "skip=1"\r\n`;
        batContent += `    if "%%f"=="!UNDO!" set "skip=1"\r\n`;
        batContent += `    if "!skip!"=="0" (\r\n`;
        batContent += `        set /a "i+=1"\r\n`;
        results.forEach((newName, index) => {
            batContent += `        if "!i!"=="${index + 1}" (\r\n`;
            batContent += `            set "ext=%%~xf"\r\n`;
            batContent += `            echo ren "${newName}!ext!" "%%f" >> !UNDO!\r\n`;
            batContent += `            ren "%%f" "${newName}!ext!"\r\n`;
            batContent += `        )\r\n`;
        });
        batContent += `    )\r\n`;
        batContent += `)\r\n`;
        batContent += `echo.\r\n`;
        batContent += `echo 改名完成！\r\n`;
        batContent += `pause\r\n`;

        const blob = new Blob([batContent], { type: 'text/plain' });
        window.saveAs(blob, 'run_rename.bat');
    },

    generatePoetryWord(content, teacher, originalFilename, spaceCount, config) {
        // 確保數值型別正確，避免字串運算誤差
        const fontSizeTitle = Number(config.fontSizeTitle) || 18;
        const fontSizeAuthor = Number(config.fontSizeAuthor) || 12;
        const fontSizeContent = Number(config.fontSizeContent) || 16;
        const enablePageBreak = !!config.enablePageBreak;
        const spacingEssay = Number(config.spacingEssay) || 1.5;
        const spacingPoetry = Number(config.spacingPoetry) || 1.5;
        const spacingReview = Number(config.spacingReview) || 1.5;
        const emptyLineBetweenParagraphs = config.emptyLineBetweenParagraphs !== undefined ? !!config.emptyLineBetweenParagraphs : true;

        const { Document, Packer, Paragraph, TextRun, AlignmentType, PageBreak } = window.docx;
        const FONT_NAME = "標楷體";
        const priority = { "作文": 1, "童詩": 2, "心得": 3 };

        // 1. 初步切割並封裝物件
        const allLines = content.split('\n').map(l => l.trim());
        const extractedWorks = [];
        let currentTypeMarker = "作文";
        
        for (let i = 0; i < allLines.length; i++) {
            const line = allLines[i];
            
            // 偵測隱藏類型標記
            if (line.startsWith("[類型:")) {
                const match = line.match(/\[類型:\s*(.+?)\]/);
                if (match) currentTypeMarker = match[1];
                continue;
            }

            // 以學號 (4位數字) 為錨點
            if (/^\d{4}$/.test(line) && i > 0) {
                const workObj = {
                    type: currentTypeMarker,
                    title: allLines[i-1],
                    id: line,
                    name: allLines[i+1] || "",
                    teacher: (allLines[i+2] && allLines[i+2] !== "") ? allLines[i+2] : (teacher || ""),
                    contentLines: []
                };

                // 收集內文 (僅保留非空行，後續由系統加空行)
                let j = i + 3;
                while (j < allLines.length) {
                    if (allLines[j+1] && /^\d{4}$/.test(allLines[j+1])) break;
                    if (allLines[j] !== "" && !allLines[j].startsWith("[類型:")) {
                        workObj.contentLines.push(allLines[j]);
                    }
                    j++;
                }
                extractedWorks.push(workObj);
                i = j - 1;
            }
        }

        // 2. 排序 (類別 -> 學號)
        extractedWorks.sort((a, b) => {
            const pA = priority[a.type] || 99;
            const pB = priority[b.type] || 99;
            if (pA !== pB) return pA - pB;
            return parseInt(a.id) - parseInt(b.id);
        });

        // 3. 渲染 Word
        const children = [];
        extractedWorks.forEach((work, idx) => {
            // 分頁處理
            if (idx > 0 && enablePageBreak) {
                children.push(new Paragraph({ children: [new PageBreak()] }));
            }

            // --- 智慧型類別與倍率精準判定 ---
            let finalType = work.type; // 預設使用 [類型:] 標記

            // 若標題包含關鍵字，則進行覆寫（以標題為準，符合行政直覺）
            const t = work.title;
            if (t.includes("詩")) finalType = "童詩";
            else if (t.includes("心得") || t.includes("讀後")) finalType = "心得";
            else if (t.includes("作文")) finalType = "作文";

            // 取得對應倍率
            let multiplier = 1.5; // 安全預設值
            if (finalType === "作文") multiplier = spacingEssay;
            else if (finalType === "童詩") multiplier = spacingPoetry;
            else if (finalType === "心得") multiplier = spacingReview;

            // 固定行高(Exact)計算：字體 * 倍率 * 20 (單位為 twips)
            const exactLineHeight = Math.round(fontSizeContent * multiplier * 20);

            // A. 題目 (加粗置中)
            children.push(new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { before: 400, after: 400 },
                children: [ new TextRun({ text: work.title, size: fontSizeTitle * 2, bold: true, font: FONT_NAME }) ]
            }));

            // B. 作者資訊 (右移指定空格數)
            const authorSpacesText = " ".repeat(Math.max(0, spaceCount));
            [work.id, work.name, work.teacher].forEach(text => {
                children.push(new Paragraph({
                    alignment: AlignmentType.LEFT,
                    children: [ new TextRun({ text: authorSpacesText + text, size: fontSizeAuthor * 2, font: FONT_NAME }) ]
                }));
            });

            // C. 內文前的固定間隙
            children.push(new Paragraph({ spacing: { line: exactLineHeight, lineRule: 'exact' } }));

            // D. 內文渲染
            work.contentLines.forEach((textLine, lIdx) => {
                const isLast = lIdx === work.contentLines.length - 1;
                
                // 輸出一段正文
                children.push(new Paragraph({
                    indent: { firstLine: 480 },
                    spacing: { line: exactLineHeight, lineRule: 'exact' },
                    children: [ new TextRun({ text: textLine, size: fontSizeContent * 2, font: FONT_NAME }) ]
                }));

                // 如果開啟「自然段空一列」，且不是最後一段，則插入一個物理空白段落
                if (emptyLineBetweenParagraphs && !isLast) {
                    children.push(new Paragraph({
                        spacing: { line: exactLineHeight, lineRule: 'exact' }
                    }));
                }
            });
        });

        // 4. 下載
        const doc = new Document({ sections: [{ children }] });
        Packer.toBlob(doc).then(blob => {
            const baseName = originalFilename ? originalFilename.replace(/\.[^/.]+$/, "") : '文選合輯';
            window.saveAs(blob, `${baseName}_排版完成.docx`);
        });
    },


    async processGoogleFormZip(file) {
        if (!window.JSZip || !file) return null;
        const zip = await window.JSZip.loadAsync(file);
        const csvFile = Object.values(zip.files).find(f => f.name.toLowerCase().endsWith('.csv'));
        if (!csvFile) return null;
        const rawCsv = await csvFile.async("string");
        return this.parseGoogleCsv(rawCsv);
    },

    parseGoogleCsv(csvText) {
        const rows = [];
        let currentRow = [];
        let currentField = '';
        let inQuote = false;

        for (let i = 0; i < csvText.length; i++) {
            const char = csvText[i];
            const nextChar = csvText[i + 1];

            if (inQuote) {
                if (char === '"' && nextChar === '"') {
                    currentField += '"';
                    i++;
                } else if (char === '"') {
                    inQuote = false;
                } else {
                    currentField += char;
                }
            } else {
                if (char === '"') {
                    inQuote = true;
                } else if (char === ',') {
                    currentRow.push(currentField);
                    currentField = '';
                } else if (char === '\n' || char === '\r') {
                    if (char === '\r' && nextChar === '\n') i++; 
                    currentRow.push(currentField);
                    rows.push(currentRow);
                    currentRow = [];
                    currentField = '';
                } else {
                    currentField += char;
                }
            }
        }
        if (currentField || currentRow.length > 0) {
            currentRow.push(currentField);
            rows.push(currentRow);
        }

        if (rows.length < 2) return "";

        const headers = rows[0].map(h => (h || "").trim());
        const dataRows = rows.slice(1);
        const findIdx = (key) => headers.findIndex(h => (h||"").split(/[\s,，\(\（]/)[0] === key);
        
        const idx = {
            type: findIdx("類型"),
            title: findIdx("題目"),
            name: findIdx("姓名"),
            id: findIdx("學號"),
            content: findIdx("內容")
        };

        const priority = { "作文": 1, "童詩": 2, "心得": 3 };
        const records = dataRows.map(r => ({
            type: (r[idx.type] || "作文").trim(),
            title: (r[idx.title] || "").trim(),
            name: (r[idx.name] || "").trim(),
            id: (r[idx.id] || "").trim(),
            content: (r[idx.content] || "").trim()
        }))
        .filter(r => r.content !== "" || r.title !== "")
        .sort((a, b) => (priority[a.type] || 99) - (priority[b.type] || 99));

        let output = "";
        records.forEach(r => {
            output += `[類型: ${r.type}]\n`; // 加入隱藏標記供後續辨識
            output += `${r.title || "無題目"}\n`;
            output += `${r.id || "0000"}\n`;
            output += `${r.name || "無姓名"}\n\n`; 
            output += `${r.content}\n\n\n`; 
        });
        return output;
    }
};

window.EMagLogic = Logic;
