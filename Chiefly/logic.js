/**
 * Chiefly - 核心邏輯層 (Logic Layer)
 * 負責數據處理、隨機分配演算法與持久化儲存。
 */

const STORAGE_KEY = 'everyone_is_leader_data';

// 預設範本
const DEFAULT_STATE = {
    settings: {
        jobsText: "班長, 2\n副班長: 2\n冷氣長* 3\n風紀股長\n衛生股長\n學藝股長\n體育股長\n資訊長\n環保檢查員\n圖書管理員",
        studentsText: Array.from({ length: 30 }, (_, i) => (i + 1).toString().padStart(2, '0')).join('\n')
    },
    activeJobs: [], // 解析後的職位列表 { id, name, maxQuota }
    assignments: {} // 職位分配結果 { jobId: [studentName, ...] }
};

const ChieflyLogic = {
    /**
     * 初始化資料：讀取儲存空間或載入範本
     */
    initState() {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (!saved) {
            const state = { ...DEFAULT_STATE };
            state.activeJobs = this.parseJobs(state.settings.jobsText);
            state.assignments = state.activeJobs.reduce((acc, job) => ({ ...acc, [job.id]: [] }), {});
            return state;
        }
        
        try {
            const parsed = JSON.parse(saved);
            // 規則 #7: 確保與預設範本合併，保持向後相容
            const state = {
                ...DEFAULT_STATE,
                ...parsed,
                settings: { ...DEFAULT_STATE.settings, ...parsed.settings }
            };
            // 如果 activeJobs 為空但有文字設定，則自動補上（針對首次載入優化）
            if ((!state.activeJobs || state.activeJobs.length === 0) && state.settings.jobsText) {
                state.activeJobs = this.parseJobs(state.settings.jobsText);
            }
            return state;
        } catch (e) {
            console.error("Failed to parse saved data", e);
            const state = { ...DEFAULT_STATE };
            state.activeJobs = this.parseJobs(state.settings.jobsText);
            return state;
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
     * 解析職務文字
     * 支援: 班長, 2 | 副班長: 2 | 冷氣長* 3
     */
    parseJobs(text) {
        return text.split('\n')
            .map(line => line.trim())
            .filter(line => line.length > 0)
            .map((line, index) => {
                // 使用正則表達式解析名稱與數字
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

    /**
     * Fisher-Yates 洗牌演算法
     */
    shuffle(array) {
        const newArr = [...array];
        for (let i = newArr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
        }
        return newArr;
    },

    /**
     * 智慧隨機分配
     */
    smartAllocate(jobs, students) {
        let shuffledStudents = this.shuffle(students);
        let assignments = {};
        jobs.forEach(job => assignments[job.id] = []);

        // 計算總名額
        let totalQuota = jobs.reduce((sum, job) => sum + job.maxQuota, 0);
        
        // 如果名額不足且學生還有多，平均增加名額 (規則需求)
        let tempJobs = JSON.parse(JSON.stringify(jobs));
        if (tempJobs.length === 0) return assignments; // 防錯處理

        if (totalQuota < students.length) {
            let diff = students.length - totalQuota;
            for (let i = 0; i < diff; i++) {
                tempJobs[i % tempJobs.length].maxQuota += 1;
            }
        }

        // 建立分配池
        let pool = [];
        tempJobs.forEach(job => {
            for (let i = 0; i < job.maxQuota; i++) {
                pool.push(job.id);
            }
        });

        // 洗牌名額池以增加隨機性
        pool = this.shuffle(pool);

        // 分配
        shuffledStudents.forEach((student, index) => {
            if (pool[index]) {
                assignments[pool[index]].push(student);
            }
        });

        return assignments;
    }
};

window.ChieflyLogic = ChieflyLogic;
