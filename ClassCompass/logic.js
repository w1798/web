/**
 * ClassCompass 數據邏輯層 (logic.js)
 * 負責 Excel 解析、資料格式化與持久化儲存
 */

window.ClassCompass_Logic = (function() {
    const STORAGE_KEY = 'ClassCompass_Data';
    
    // 定義各欄位的辨識關鍵字 (含別名)
    const FIELD_MAP_CONFIG = {
        name: ["學生姓名", "學生", "姓名", "學生 姓名"],
        studentId: ["學號"],
        grade: ["年級"],
        className: ["班級"],
        seat: ["座號"]
    };

    /**
     * 讀取 Excel 檔案並解析
     */
    async function parseExcel(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const data = new Uint8Array(e.target.result);
                    const workbook = XLSX.read(data, { type: 'array' });
                    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
                    const json = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });
                    
                    resolve(processRawData(json));
                } catch (err) {
                    reject(new Error('Excel 解析失敗：' + err.message));
                }
            };
            reader.onerror = () => reject(new Error('檔案讀取失敗'));
            reader.readAsArrayBuffer(file);
        });
    }

    /**
     * 自動辨識表頭並提取資料
     */
    function processRawData(rows) {
        let headerIndex = -1;
        let columnMapping = {};

        // 1. 尋找表頭列與對應欄位
        for (let i = 0; i < rows.length; i++) {
            const row = (rows[i] || []).map(cell => String(cell || '').replace(/\s+/g, '').trim());
            const mapping = {};
            let matchCount = 0;

            for (const [field, aliases] of Object.entries(FIELD_MAP_CONFIG)) {
                const idx = row.findIndex(cell => aliases.some(alias => cell.includes(alias.replace(/\s+/g, ''))));
                if (idx !== -1) {
                    mapping[field] = idx;
                    // 只有必填欄位才計入匹配總數
                    if (field !== 'studentId') matchCount++;
                }
            }

            // 必須同時包含 姓名、年級、班級、座號
            if (matchCount >= 4) {
                headerIndex = i;
                columnMapping = mapping;
                break;
            }
        }

        if (headerIndex === -1) {
            throw new Error('找不到正確的表頭。請確保 Excel 中包含：姓名、年級、班級、座號（學號可省略）。');
        }

        // 2. 提取原始學生資料
        let rawStudents = [];
        for (let i = headerIndex + 1; i < rows.length; i++) {
            const row = rows[i];
            if (!row || row.length === 0) continue;
            
            const name = String(row[columnMapping.name] || '').trim();
            const id = columnMapping.studentId !== undefined ? String(row[columnMapping.studentId] || '').trim() : '';
            const grade = parseInt(row[columnMapping.grade], 10);
            const className = parseInt(row[columnMapping.className], 10);
            const seat = parseInt(row[columnMapping.seat], 10);

            // 姓名、年級、班級、座號為必填
            if (name && !isNaN(grade) && !isNaN(className) && !isNaN(seat)) {
                rawStudents.push({ 
                    name, 
                    id: id || `G${grade}C${className}S${seat}`, // 如果沒學號，暫時生成一個
                    grade, 
                    className, 
                    seat 
                });
            }
        }

        return finalizeStudents(rawStudents);
    }

    /**
     * 計算班級代碼與班級號
     */
    function finalizeStudents(students) {
        const gradeStats = {};
        students.forEach(s => {
            if (!gradeStats[s.grade]) gradeStats[s.grade] = 0;
            gradeStats[s.grade] = Math.max(gradeStats[s.grade], s.className);
        });

        const studentData = students.map(s => {
            const classDigits = gradeStats[s.grade] >= 10 ? 2 : 1;
            const classId = `${s.grade}${String(s.className).padStart(2, '0')}`;
            const seatStr = String(s.seat).padStart(2, '0');
            const classStr = classDigits === 2 ? String(s.className).padStart(2, '0') : String(s.className);
            const classNo = `${s.grade}${classStr}${seatStr}`;

            return {
                ...s,
                studentId: s.id,
                classId,
                classNo
            };
        });

        const warnings = [];
        const seenIds = new Set();
        const seenClassNos = new Set();
        studentData.forEach(s => {
            if (s.studentId && seenIds.has(s.studentId)) {
                warnings.push(`發現重複學號：${s.studentId} (${s.name})`);
            }
            if (seenClassNos.has(s.classNo)) {
                warnings.push(`發現重複班級號：${s.classNo} (${s.name})`);
            }
            if (s.studentId) seenIds.add(s.studentId);
            seenClassNos.add(s.classNo);
        });

        return {
            students: studentData,
            warnings: [...new Set(warnings)],
            lastUpdate: new Date().toISOString()
        };
    }

    function saveData(data) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ v: 1, d: data }));
    }

    function loadData() {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return null;
        try { return JSON.parse(raw).d || null; } catch (e) { return null; }
    }

    function resetData() {
        localStorage.removeItem(STORAGE_KEY);
    }

    function searchStudents(students, query) {
        if (!query) return [];
        const keywords = query.trim().toLowerCase().split(/\s+/);
        return students.filter(s => {
            const target = `${s.name} ${s.studentId} ${s.classId} ${s.className} ${s.seat}`.toLowerCase();
            return keywords.every(kw => target.includes(kw));
        });
    }

    function findDuplicates(students) {
        const nameMap = {};
        students.forEach(s => {
            if (!nameMap[s.name]) nameMap[s.name] = [];
            nameMap[s.name].push(s);
        });
        return Object.values(nameMap).filter(list => list.length > 1).flat();
    }

    return { parseExcel, saveData, loadData, resetData, searchStudents, findDuplicates };
})();
