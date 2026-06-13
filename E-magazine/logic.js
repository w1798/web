/**
 * E-magazine Logic Layer
 * 負責處理資料運算、格式轉換與本地存儲
 */

const E_MAG_STORAGE_KEY = 'e_magazine_app_data';

const DefaultData = {
    classInfo: '305',
    teacherName: '許美麗',
    poetryTeacher: '指導 許美麗 師', // 作文/童詩版指導老師預設值
    studentNames: '', // 一行一位
    batchNos: '',     // 一行一個座號
    workTitles: '',    // 一行一個或單一作品名稱
    modeOption: 'C',   // A, B, C
    modeB_Prefix: '生活花絮',
    modeB_Digits: 3,
    modeB_Count: 10,
    sortOrder: 'time_asc',  // time_asc, time_desc, name_asc, name_desc
    manualInput: '',
    nameTemplate: '{class}-{no}-{student}-{work}-指導老師-{teacher}',
    authorSpaces: 60
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
            const rollNo = index + 1;
            const trimmedName = name.trim();
            if (trimmedName) {
                map[rollNo] = trimmedName;
            }
        });
        return map;
    },

    // 套用命名範本
    applyTemplate(template, vars) {
        return template
            .replace(/\{class\}/g,   vars.class || '')
            .replace(/\{no\}/g,      vars.no || '')
            .replace(/\{student\}/g, vars.student || '')
            .replace(/\{work\}/g,    vars.work || '')
            .replace(/\{teacher\}/g, vars.teacher || '');
    },

    // 產生最終檔名格式：使用自訂範本
    generateFinalFilenames(config) {
        const { classInfo, teacherName, studentNames, workTitles, batchNos, nameTemplate } = config;
        const template = nameTemplate || '{class}-{no}-{student}-{work}-指導老師-{teacher}';
        
        const studentMap = this.getStudentMap(studentNames);
        const noEntries = (batchNos || '').split('\n').map(s => s.trim()).filter(s => s !== '');
        const titles = (workTitles || '').split('\n').map(t => t.trim()).filter(t => t !== '');
        
        // 如果座號列表為空，則改為處理所有學生（一人一個檔名）
        if (noEntries.length === 0) {
            return Object.keys(studentMap).map((noNum, index) => {
                return this.applyTemplate(template, {
                    class: classInfo,
                    no: this.padNumber(noNum, 2),
                    student: studentMap[noNum],
                    work: titles.length === 1 ? titles[0] : (titles[index] || '未具名作品'),
                    teacher: teacherName
                });
            });
        }

        return noEntries.map((line, index) => {
            const nosInLine = line.split(/[,\s_]+/).map(s => s.trim()).filter(s => s !== '');
            const noPads = [];
            const names = [];
            
            nosInLine.forEach(s => {
                const noNum = parseInt(s);
                if (!isNaN(noNum)) {
                    noPads.push(this.padNumber(noNum, 2));
                    names.push(studentMap[noNum] || '未知姓名');
                }
            });

            return this.applyTemplate(template, {
                class: classInfo,
                no: noPads.join('_'),
                student: names.join('_'),
                work: titles.length === 1 ? titles[0] : (titles[index] || '未具名作品'),
                teacher: teacherName
            });
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

    // 產生改名批次檔 (.bat)
    generateRenameBat(lines, mode, classInfo, sortOrder = 'time_asc') {
        if (lines.length === 0) return;

        // 排序方式對應 dir /o 參數
        const dirOrderMap = {
            time_asc:  '/o:d',
            time_desc: '/o:-d',
            name_asc:  '/o:n',
            name_desc: '/o:-n',
        };
        const dirOrder = dirOrderMap[sortOrder] || '/o:d';

        // undo 檔名只在這裡定義一次
        const UNDO = 'undo_還原.bat';

        let batContent = `@echo off\r\n`;
        batContent += `chcp 65001 >nul\r\n`;
        batContent += `setlocal enabledelayedexpansion\r\n`;
        batContent += `set "UNDO=${UNDO}"\r\n`;
        batContent += `echo @echo off > !UNDO!\r\n`;
        batContent += `echo chcp 65001 ^>nul >> !UNDO!\r\n`;

        lines.forEach((name, index) => {
            let safeName = name.replace(/([&|<>^])/g, '^$1');
            batContent += `set "name_${index + 1}=${safeName}"\r\n`;
        });

        batContent += `set "idx=1"\r\n`;
        batContent += `for /f "delims=" %%F in ('dir /b ${dirOrder} *.*') do (\r\n`;
        batContent += `if /i "%%~xF" NEQ ".bat" (\r\n`;
        batContent += `set "current_idx=!idx!"\r\n`;
        batContent += `for /f "delims=" %%A in ("!current_idx!") do (\r\n`;
        batContent += `if defined name_%%A (\r\n`;
        batContent += `set "newname=!name_%%A!"\r\n`;
        batContent += `echo [%%F] 已變更為 [!newname!%%~xF]\r\n`;
        batContent += `echo ren "!newname!%%~xF" "%%~nxF" ^>nul >> !UNDO!\r\n`;
        batContent += `ren "%%F" "!newname!%%~xF"\r\n`;
        batContent += `set /a idx+=1\r\n`;
        batContent += `)\r\n)\r\n)\r\n)\r\n`;

        batContent += `echo echo. >> !UNDO!\r\n`;
        batContent += `echo echo 還原完畢。按任意鍵結束... >> !UNDO!\r\n`;
        batContent += `echo pause ^>nul >> !UNDO!\r\n`;
        batContent += `echo.\r\n`;
        batContent += `echo 修改完畢。按任意鍵結束...\r\n`;
        batContent += `pause >nul\r\n`;

        // 依模式決定檔名
        let batFilename = 'run_rename.bat';
        if (mode === 'A') batFilename = 'run_rename_全手動.bat';
        else if (mode === 'B') batFilename = 'run_rename_流水號.bat';
        else if (mode === 'C') batFilename = `run_rename_${classInfo || ''}格式化.bat`;

        const blob = new Blob([batContent], { type: 'text/plain;charset=utf-8' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = batFilename;
        link.click();
        URL.revokeObjectURL(link.href);
    },

    // 童詩 Word 格式化處理 - 移植自 a.html
    generatePoetryWord(rawText, defaultTeacher = '', originalFilename = '', spaceCount = 60) {
        if (!rawText.trim()) return;

        const { Document, Packer, Paragraph, TextRun, AlignmentType } = docx;
        const FONT_NAME = "標楷體";
        const FONT_SIZE = 24;      
        const LINE_SPACING = 360;  
        const MARGIN_2CM = 1134;   
        const space_r = " ".repeat(Math.max(0, spaceCount));

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
                poem.teacher = `${defaultTeacher}`;
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
                        children: [new TextRun({ text: space_r + infoText, font: FONT_NAME, size: FONT_SIZE })]
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

        Packer.toBlob(doc).then(blob => {
            const baseName = originalFilename ? originalFilename.replace(/\.docx$/i, '') : '童詩合輯';
            window.saveAs(blob, `${baseName}_完成.docx`);
        });
    }
};

window.EMagLogic = Logic;
