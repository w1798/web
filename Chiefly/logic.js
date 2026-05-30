const STORAGE_KEY = 'everyone_is_leader_data';

// 單一工作表預設內容範本
const DEFAULT_SHEET_CONTENT = {
    settings: {
        jobsText: "班長\n副班長\n冷氣長\n風紀股長,2\n衛生股長\n學藝股長\n體育股長\n資訊長\n環保檢查員\n圖書管理員",
        studentsText: Array.from({ length: 30 }, (_, i) => (i + 1).toString().padStart(2, '0')).join('\n')
    },
    activeJobs: [], 
    assignments: {},
    hiddenJobIds: [],
    gridCols: 6,
    // 字體大小與模式設定
    jobTitleSize: 1.2,
    tagSize: 1.25,
    assignmentTagSize: 0.85,
    isMultiSelect: true
};

const ChieflyLogic = {
    STORAGE_KEY,
    /**
     * 初始化資料：支援舊版資料遷移 (Rule #7)
     */
    initState() {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (!saved) {
            const firstSheet = { ...DEFAULT_SHEET_CONTENT, id: 'sheet_' + Date.now(), name: '預設工作表' };
            firstSheet.activeJobs = this.parseJobs(firstSheet.settings.jobsText);
            return {
                currentSheetId: firstSheet.id,
                sheets: [firstSheet]
            };
        }
        
        try {
            const parsed = JSON.parse(saved);
            
            // 判斷是否為舊版單表格式
            if (parsed.settings && !parsed.sheets) {
                const migratedSheet = {
                    ...DEFAULT_SHEET_CONTENT,
                    ...parsed,
                    id: 'sheet_migrated',
                    name: '舊版工作表'
                };
                return {
                    currentSheetId: migratedSheet.id,
                    sheets: [migratedSheet]
                };
            }

            // 新版多表格式
            const state = {
                currentSheetId: parsed.currentSheetId || '',
                sheets: parsed.sheets || []
            };

            // 安全性檢查：確保至少有一個工作表
            if (state.sheets.length === 0) {
                const firstSheet = { ...DEFAULT_SHEET_CONTENT, id: 'sheet_' + Date.now(), name: '預設工作表' };
                firstSheet.activeJobs = this.parseJobs(firstSheet.settings.jobsText);
                state.sheets.push(firstSheet);
                state.currentSheetId = firstSheet.id;
            } else if (!state.currentSheetId || !state.sheets.find(s => s.id === state.currentSheetId)) {
                state.currentSheetId = state.sheets[0].id;
            }

            return state;
        } catch (e) {
            console.error("Failed to parse saved data", e);
            const firstSheet = { ...DEFAULT_SHEET_CONTENT, id: 'sheet_err_' + Date.now(), name: '修復後工作表' };
            return { currentSheetId: firstSheet.id, sheets: [firstSheet] };
        }
    },

    /**
     * 儲存資料
     */
    saveState(state) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    },

    /**
     * 重置資料 (規則 #8)
     */
    resetStorage() {
        localStorage.removeItem(STORAGE_KEY);
        location.reload();
    },

    /**
     * 壓縮並匯出資料 (支援 GZIP)
     */
    async exportData(state) {
        const jsonString = JSON.stringify(state, null, 4); // 易閱讀縮排
        try {
            // 優先嘗試使用原生 CompressionStream
            if (typeof CompressionStream !== 'undefined') {
                const stream = new Blob([jsonString]).stream().pipeThrough(new CompressionStream('gzip'));
                const response = new Response(stream);
                return await response.arrayBuffer();
            } else if (window.pako) {
                // 退而求其次使用 pako
                const compressed = window.pako.gzip(jsonString);
                return compressed.buffer;
            }
        } catch (err) {
            console.error("Export failed", err);
            // 降級處理：若失敗則回傳字串的 ArrayBuffer
            return new TextEncoder().encode(jsonString).buffer;
        }
    },

    /**
     * 解析匯入資料 (支援 GZIP ArrayBuffer 或 Base64)
     */
    async importData(input) {
        let buffer;
        if (typeof input === 'string') {
            buffer = this.fromBase64(input);
        } else {
            buffer = input;
        }

        const uint8 = new Uint8Array(buffer);
        const isGzip = uint8[0] === 0x1f && uint8[1] === 0x8b;
        
        let jsonString = "";
        if (isGzip) {
            if (typeof DecompressionStream !== 'undefined') {
                const stream = new Blob([buffer]).stream().pipeThrough(new DecompressionStream('gzip'));
                jsonString = await new Response(stream).text();
            } else if (window.pako) {
                jsonString = window.pako.ungzip(uint8, { to: 'string' });
            } else {
                throw new Error("此環境不支援 GZIP，請使用現代瀏覽器");
            }
        } else {
            jsonString = new TextDecoder().decode(uint8);
        }

        try {
            return JSON.parse(jsonString);
        } catch (err) {
            throw new Error("JSON 解析失敗: " + err.message);
        }
    },

    toBase64(buffer) {
        let binary = '';
        const bytes = new Uint8Array(buffer);
        for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
        return btoa(binary);
    },

    fromBase64(base64) {
        const binary = atob(base64);
        const len = binary.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i);
        return bytes.buffer;
    },

    /**
     * 解析職務文字
     */
    parseJobs(text) {
        return text.split('\n')
            .map(line => line.trim())
            .filter(line => line.length > 0)
            .map((line, index) => {
                const match = line.match(/^(.+?)(?:[,:*]\s*(\d+))?$/);
                if (match) {
                    return {
                        id: `job_${Date.now()}_${index}`,
                        name: match[1].trim(),
                        maxQuota: parseInt(match[2] || "1", 10)
                    };
                }
                return { id: `job_${Date.now()}_${index}`, name: line, maxQuota: 1 };
            });
    },

    /**
     * 解析學生文字
     */
    parseStudents(text) {
        return text.split('\n')
            .map(line => line.trim())
            .filter(line => line.length > 0);
    },

    shuffle(array) {
        const newArr = [...array];
        for (let i = newArr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
        }
        return newArr;
    },

    /**
     * 智慧隨機分配 (支援保留現有分配)
     * @param {Array} jobs - 職位清單
 * @param {Array} students - 所有學生的名單
 * @param {Object} currentAssignments - 目前已有的分配 { jobId: [studentName, ...] }
     */
    smartAllocate(jobs, students, currentAssignments = {}) {
        // 1. 找出尚未分配的學生
        const allAssigned = Object.values(currentAssignments).flat();
        const unassignedStudents = students.filter(s => !allAssigned.includes(s));
        
        let shuffledUnassigned = this.shuffle(unassignedStudents);
        let assignments = JSON.parse(JSON.stringify(currentAssignments));
        
        // 確保每個職位在結果中都有 key
        jobs.forEach(job => {
            if (!assignments[job.id]) assignments[job.id] = [];
        });

        // 2. 計算剩餘名額
        // 先計算總剩餘名額
        let totalRemainingQuota = jobs.reduce((sum, job) => {
            const assignedCount = (assignments[job.id] || []).length;
            return sum + Math.max(0, job.maxQuota - assignedCount);
        }, 0);
        
        // 3. 如果剩餘名額不足以容納未分配學生，則擴展剩餘名額
        let tempJobs = jobs.map(job => {
            const assignedCount = (assignments[job.id] || []).length;
            return { ...job, remaining: Math.max(0, job.maxQuota - assignedCount) };
        });

        if (totalRemainingQuota < shuffledUnassigned.length) {
            let diff = shuffledUnassigned.length - totalRemainingQuota;
            // 優先擴展可見職位的名額
            for (let i = 0; i < diff; i++) {
                tempJobs[i % tempJobs.length].remaining += 1;
            }
        }

        // 4. 建立名額池
        let pool = [];
        tempJobs.forEach(job => {
            for (let i = 0; i < job.remaining; i++) {
                pool.push(job.id);
            }
        });

        // 洗牌池子
        pool = this.shuffle(pool);

        // 5. 分配未分配學生
        shuffledUnassigned.forEach((student, index) => {
            if (pool[index]) {
                assignments[pool[index]].push(student);
            }
        });

        return assignments;
    },

    /**
     * 產生 Word 檔 (利用 HTML 轉換技巧)
     */
    generateWordDoc(sheet) {
        const jobs = sheet.activeJobs.filter(j => !sheet.hiddenJobIds.includes(j.id));
        const gridCols = sheet.gridCols || 6;
        
        let html = `
            <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
            <head><meta charset='utf-8'><title>${sheet.name}</title>
            <style>
                table { border-collapse: collapse; width: 100%; border: 1px solid black; table-layout: fixed; }
                th, td { border: 1px solid black; padding: 10px; text-align: center; vertical-align: top; word-wrap: break-word; }
                .job-name { font-weight: bold; background-color: #f2f2f2; font-size: 14pt; }
                .students { font-size: 12pt; }
                h1 { text-align: center; font-family: "Microsoft JhengHei", "PMingLiU", sans-serif; }
            </style>
            </head>
            <body>
                <h1>各司其職 分配表 - ${sheet.name}</h1>
                <table>
        `;

        // 依照網格列數分組
        for (let i = 0; i < jobs.length; i += gridCols) {
            const rowJobs = jobs.slice(i, i + gridCols);
            
            // 第一排：職稱
            html += "<tr>";
            rowJobs.forEach(job => {
                html += `<td class="job-name">${job.name}</td>`;
            });
            // 補齊剩餘空格
            for (let j = rowJobs.length; j < gridCols; j++) html += "<td></td>";
            html += "</tr>";

            // 第二排：分配學生
            html += "<tr>";
            rowJobs.forEach(job => {
                const students = (sheet.assignments[job.id] || []).join(", ");
                html += `<td class="students">${students}</td>`;
            });
            for (let j = rowJobs.length; j < gridCols; j++) html += "<td></td>";
            html += "</tr>";
            
            // 空行分隔感
            html += "<tr style='height: 15px;'><td colspan='" + gridCols + "' style='border:none;'></td></tr>";
        }

        html += `
                </table>
            </body>
            </html>
        `;

        const blob = new Blob(['\ufeff', html], { type: 'application/msword' });
        return blob;
    }
};

window.ChieflyLogic = ChieflyLogic;
