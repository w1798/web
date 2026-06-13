/**
 * E-magazine Logic Layer
 * 負責處理資料運算、格式轉換與本地存儲
 */

const E_MAG_STORAGE_KEY = 'e_magazine_app_data';

const DefaultData = {
    classInfo: '305',
    teacherName: '許美麗',
    poetryTeacher: '', // 童詩版指導老師預設值
    studentNames: '', // 一行一位
    batchSeats: '',   // 一行一個座號
    workTitles: '',    // 一行一個或單一作品名稱
    modeOption: 'C',   // A, B, C
    modeB_Prefix: '生活花絮',
    modeB_Digits: 3,
    manualInput: ''
};

const Logic = {
    // 初始化資料：合併預設值與本地存儲
    initData() {
        const saved = localStorage.getItem(E_MAG_STORAGE_KEY);
        if (!saved) return { ...DefaultData };
        try {
            const parsed = JSON.parse(saved);
            return { ...DefaultData, ...parsed };
        } catch (e) {
            return { ...DefaultData };
        }
    },

    // 儲存資料
    saveData(data) {
        localStorage.setItem(E_MAG_STORAGE_KEY, JSON.stringify(data));
    },

    // 重置資料
    resetData() {
        localStorage.removeItem(E_MAG_STORAGE_KEY);
        return { ...DefaultData };
    },

    // 格式化數字 (如 1 -> 01)
    padNumber(num, size) {
        let s = num + "";
        while (s.length < size) s = "0" + s;
        return s;
    },

    // 模式 B：流水號處理
    processModeB(prefix, count, digits) {
        const results = [];
        for (let i = 1; i <= count; i++) {
            results.push(`${prefix}${this.padNumber(i, digits)}`);
        }
        return results;
    },

    // 模式 C：處理學生名單 (建立 座號 -> 姓名的對照表)
    getStudentMap(rawText) {
        const lines = rawText.split('\n');
        const map = {};
        lines.forEach((name, index) => {
            const seat = index + 1;
            const trimmedName = name.trim();
            if (trimmedName) {
                map[seat] = trimmedName;
            }
        });
        return map;
    },

    // 產生最終檔名格式：<班級>-<座號1>_<座號2>-<姓名1>_<姓名2>-<作品名稱>-指導老師-<老師姓名>
    generateFinalFilenames(config) {
        const { classInfo, teacherName, studentNames, workTitles, batchSeats } = config;
        
        const studentMap = this.getStudentMap(studentNames);
        // 分行處理，每一行代表一個作品（可能有多個學生）
        const seatEntries = (batchSeats || '').split('\n').map(s => s.trim()).filter(s => s !== '');
        const titles = (workTitles || '').split('\n').map(t => t.trim()).filter(t => t !== '');
        
        // 如果座號列表為空，則改為處理所有學生（一人一個檔名）
        if (seatEntries.length === 0) {
            return Object.keys(studentMap).map((seatNum, index) => {
                const seatPad = this.padNumber(seatNum, 2);
                const name = studentMap[seatNum];
                const title = titles.length === 1 ? titles[0] : (titles[index] || '未具名作品');
                return `${classInfo}-${seatPad}-${name}-${title}-指導老師-${teacherName}`;
            });
        }

        return seatEntries.map((line, index) => {
            // 解析一行內的多部座號，支援逗號、空格或底線分隔
            const seatsInLine = line.split(/[,\s_]+/).map(s => s.trim()).filter(s => s !== '');
            
            const seatPads = [];
            const names = [];
            
            seatsInLine.forEach(s => {
                const seatNum = parseInt(s);
                if (!isNaN(seatNum)) {
                    seatPads.push(this.padNumber(seatNum, 2));
                    names.push(studentMap[seatNum] || '未知姓名');
                }
            });

            const combinedSeats = seatPads.join('_');
            const combinedNames = names.join('_');
            const title = titles.length === 1 ? titles[0] : (titles[index] || '未具名作品');
            
            return `${classInfo}-${combinedSeats}-${combinedNames}-${title}-指導老師-${teacherName}`;
        });
    },

    // 下載文字檔
    downloadTxt(filename, content) {
        const element = document.createElement('a');
        element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(content));
        element.setAttribute('download', filename);
        element.style.display = 'none';
        document.body.appendChild(element);
        element.click();
        document.body.removeChild(element);
    },

    // 產生改名批次檔 (.bat) - 移植自 b.html
    generateRenameBat(lines) {
        if (lines.length === 0) return;

        let batContent = `@echo off\r\n`;
        batContent += `:: 重新用乾淨模式呼叫自身，斬斷迴圈雜訊\r\n`;
        batContent += `if "%~1"==":main" goto :main\r\n`;
        batContent += `cmd /c "%~f0" :main\r\n`;
        batContent += `pause >nul\r\n`;
        batContent += `goto :eof\r\n\r\n`;

        batContent += `:main\r\n`;
        batContent += `chcp 65001 >nul\r\n`;
        batContent += `setlocal enabledelayedexpansion\r\n\r\n`;
        
        batContent += `echo @echo off > undo_rename.bat\r\n`;
        batContent += `echo if "%%~1"==":main" goto :main >> undo_rename.bat\r\n`;
        batContent += `echo cmd /c "%%~f0" :main >> undo_rename.bat\r\n`;
        batContent += `echo pause ^>nul >> undo_rename.bat\r\n`;
        batContent += `echo goto :eof >> undo_rename.bat\r\n\r\n`;
        batContent += `echo :main >> undo_rename.bat\r\n`;
        batContent += `echo chcp 65001 ^>nul >> undo_rename.bat\r\n\r\n`;

        lines.forEach((name, index) => {
            let safeName = name.replace(/([&|<>^])/g, '^$1');
            batContent += `set "name_${index + 1}=${safeName}"\r\n`;
        });

        batContent += `\r\nset "idx=1"\r\n`;
        batContent += `for /f "delims=" %%F in ('dir /b /o:d *.*') do (\r\n`;
        batContent += `    if /i "%%~xF" NEQ ".bat" (\r\n`;
        batContent += `        set "current_idx=!idx!"\r\n`;
        batContent += `        for /f "delims=" %%A in ("!current_idx!") do (\r\n`;
        batContent += `            if defined name_%%A (\r\n`;
        batContent += `                set "newname=!name_%%A!"\r\n`;
        batContent += `                echo [%%F] 已變更為 [!newname!%%~xF]\r\n`;
        batContent += `                echo echo [!newname!%%~xF] 已還原為 [%%~nxF] >> undo_rename.bat\r\n`;
        batContent += `                echo ren "!newname!%%~xF" "%%~nxF" ^>nul 2^>^&1 >> undo_rename.bat\r\n`;
        batContent += `                ren "%%F" "!newname!%%~xF"\r\n`;
        batContent += `            )\r\n`;
        batContent += `        )\r\n`;
        batContent += `        set /a idx+=1\r\n`;
        batContent += `    )\r\n`;
        batContent += `)\r\n\r\n`;

        batContent += `echo echo.\r\n`;
        batContent += `echo echo 修改完畢。按任意鍵結束...\r\n`;
        batContent += `echo echo. >> undo_rename.bat\r\n`;
        batContent += `echo echo 還原完畢。按任意鍵結束... >> undo_rename.bat\r\n`;

        const bom = new Uint8Array([0xEF, 0xBB, 0xBF]);
        const blob = new Blob([bom, batContent], { type: 'text/plain;charset=utf-8' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'run_rename.bat';
        link.click();
        URL.revokeObjectURL(link.href);
    },

    // 童詩 Word 格式化處理 - 移植自 a.html
    generatePoetryWord(rawText, defaultTeacher = '') {
        if (!rawText.trim()) return;

        const { Document, Packer, Paragraph, TextRun, AlignmentType } = docx;
        const FONT_NAME = "標楷體";
        const FONT_SIZE = 24;      
        const LINE_SPACING = 360;  
        const MARGIN_2CM = 1134;   
        const space65 = " ".repeat(65);

        const originalLines = rawText.split('\n').map(line => line.trim());
        const isClassNumber = (s) => /^\d+$/.test(s); 

        const lineTags = new Array(originalLines.length).fill(0);

        for (let i = 0; i < originalLines.length; i++) {
            if (isClassNumber(originalLines[i])) {
                lineTags[i] = 2; // 學號
                if (i - 1 >= 0) lineTags[i - 1] = 1; // 題目
                let next1 = i + 1;
                if (next1 < originalLines.length && originalLines[next1] !== "") lineTags[next1] = 3; // 學生
                let next2 = i + 2;
                if (next2 < originalLines.length && originalLines[next2] !== "") lineTags[next2] = 4; // 指導老師
            }
        }

        const poems = [];
        let currentPoem = null;
        for (let i = 0; i < originalLines.length; i++) {
            let text = originalLines[i];
            let tag = lineTags[i];
            if (tag === 1) {
                if (currentPoem) poems.push(currentPoem);
                currentPoem = { title: text, classNum: "", author: "", teacher: "", lines: [] };
                continue;
            }
            if (!currentPoem) currentPoem = { title: "", classNum: "", author: "", teacher: "", lines: [] };
            if (tag === 2) currentPoem.classNum = text;
            else if (tag === 3) currentPoem.author = text;
            else if (tag === 4) currentPoem.teacher = text;
            else {
                currentPoem.lines.push(text);
            }
        }
        if (currentPoem) poems.push(currentPoem);

        const docParagraphs = [];
        poems.forEach((poem, pIdx) => {
            if (!poem.title && !poem.classNum && !poem.author && !poem.teacher && poem.lines.length === 0) return;
            
            // 補充預設指導老師
            if (!poem.teacher && defaultTeacher) {
                poem.teacher = `指導 ${defaultTeacher} 老師`;
            }

            if (poem.title) {
                docParagraphs.push(new Paragraph({
                    alignment: AlignmentType.CENTER,
                    spacing: { line: LINE_SPACING, before: pIdx === 0 ? 120 : 480, after: 120 },
                    children: [new TextRun({ text: poem.title, font: FONT_NAME, size: FONT_SIZE, bold: true })]
                }));
            }
            [poem.classNum, poem.author, poem.teacher].forEach(infoText => {
                if (infoText) {
                    docParagraphs.push(new Paragraph({
                        alignment: AlignmentType.LEFT,
                        children: [new TextRun({ text: space65 + infoText, font: FONT_NAME, size: FONT_SIZE })]
                    }));
                }
            });
            docParagraphs.push(new Paragraph({ spacing: { line: LINE_SPACING } }));
            let bodyLines = poem.lines;
            while(bodyLines.length > 0 && bodyLines[0] === "") bodyLines.shift();
            while(bodyLines.length > 0 && bodyLines[bodyLines.length - 1] === "") bodyLines.pop();
            bodyLines.forEach(line => {
                if (line === "") {
                    docParagraphs.push(new Paragraph({ spacing: { line: LINE_SPACING } }));
                } else {
                    docParagraphs.push(new Paragraph({
                        alignment: AlignmentType.LEFT,
                        spacing: { line: LINE_SPACING, before: 60, after: 60 },
                        children: [new TextRun({ text: "  " + line.replace(/^[  ]+/, ""), font: FONT_NAME, size: FONT_SIZE })]
                    }));
                }
            });
        });

        const doc = new Document({
            sections: [{
                properties: { page: { margin: { top: MARGIN_2CM, bottom: MARGIN_2CM, left: MARGIN_2CM, right: MARGIN_2CM } } },
                children: docParagraphs
            }]
        });

        Packer.toBlob(doc).then(blob => window.saveAs(blob, "精準規格排版_童詩合輯.docx"));
    }
};

window.EMagLogic = Logic;
