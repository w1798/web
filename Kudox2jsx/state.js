/**
 * ClassKudox - State & Data Management
 */

// --- Constants ---
const defaultItems = {
    pos: [
        { id: 'p1', lb: '幫助他人', vl: 1, ic: '🤝' },
        { id: 'p2', lb: '專心上課', vl: 1, ic: '🎯' },
        { id: 'p3', lb: '踴躍參與', vl: 1, ic: '🙋' },
        { id: 'p4', lb: '努力學習', vl: 1, ic: '💪' },
    ],
    neg: [
        { id: 'n1', lb: '不專心', vl: -1, ic: '📵' },
        { id: 'n2', lb: '上課講話', vl: -1, ic: '🗣️' },
        { id: 'n3', lb: '未帶學用品', vl: -1, ic: '🤷' },
    ]
};

const DEFAULT_SETTINGS = { ftS: 16, col: 10, gCol: 5, iCol: 5, itmS: 0, eS: 0, sCH: 0, gCH: 0, lRet: 0, avS: 0, sAv: 1, sTR: 1, cGV: 25, cGH: 25, iGV: 15, iGH: 15, sBkup: 1 };

const ACT = {
    STU_AWD: 1,
    STU_AWD_REV: 2,
    ITEM_UPD: 3,
    STU_UPD: 4,
    ITEM_DEL: 5,
    STU_DEL: 6,
    GRP_UPD: 7,
    GRP_DEL: 8,
    CLS_REN: 10,
    CLS_ARC: 11,
    CLS_DEL: 12,
    CLS_NEW: 13,
    TR_DEF_UPD: 14,
    TR_DEF_DEL: 15,
    LOG_CLR: 16,
    SET_PT_ITEMS: 17,
    SYS_RESET: 18,
    SET_CUSTOM_ITEMS: 19,
    SET_AVATAR_STYLE: 20
};

// --- Global State Variables ---
let classes = safeLoad('CD_Cls', []);
let sysOps = JSON.parse(localStorage.getItem('CD_SysOps') || '[]');
let currentClassId = localStorage.getItem('CD_cCId');
let cloudBinId = localStorage.getItem('BId') || '';
let cloudApiKey = localStorage.getItem('Key') || '';
let autoSyncInterval = parseInt(localStorage.getItem('aSyn')) || 0;
let localSyncVersion = localStorage.getItem('sVer') || '000000';

let students = [], groups = [], logs = [], pointItems = null, settings = null, ops = [], mSyn = 30;
let idleSeconds = 0;
let customItems = [];
let customPrefs = {};
let giftSettings = { gInt: 0, gStep: 0, gAmt: 10, gIgn: 1 };
let treasureDefs = [];

// 使用全域變數確保 Vanilla 與 React 讀取同一個值
window.currentView = 'students';
window.isMultiSelectMode = false;

// 為了保持舊代碼兼容性，建立引用
let currentView = window.currentView;
let isMultiSelectMode = window.isMultiSelectMode;

// 建立一個特殊的同步函式，確保區域變數與全域一致
const syncGlobalToLocal = () => {
    currentView = window.currentView;
    isMultiSelectMode = window.isMultiSelectMode;
    selectedStudentIds = window.selectedStudentIds;
};
window.syncGlobalToLocal = syncGlobalToLocal;

let selectedStudentIds = [];
window.selectedStudentIds = selectedStudentIds;
let selectedGroupIds = new Set();
window.selectedGroupIds = selectedGroupIds;

// 將核心資料變數也掛到 window 上，讓 React Context 能讀取
const exposeToWindow = () => {
    window.students = students;
    window.groups = groups;
    window.logs = logs;
    window.pointItems = pointItems;
    window.settings = settings;
    window.classes = classes;
    window.currentClassId = currentClassId;
    window.customItems = customItems;
    window.treasureDefs = treasureDefs;
};
// Object.defineProperty(selectedStudentIds, 'size', { get() { return this.length; } }); // 移除此行，改用 length
selectedStudentIds.has = function(id) { return this.includes(id); };
selectedStudentIds.add = function(id) { if(!this.includes(id)) this.push(id); };
selectedStudentIds.delete = function(id) { const i = this.indexOf(id); if (i > -1) { this.splice(i, 1); return true; } return false; };
selectedStudentIds.clear = function() { this.length = 0; };
selectedStudentIds.toArray = function() { return this.slice(); };

let isDirty = 0, isSyncing = false, autoSyncTimer = null; 
let awardContextIds = [], currentProfileId = null, editingGroupId = null, currentGroupIdForAward = null, editingPointItemId = null, editingPointItemCat = null, lastActionLogIds = [], undoTimeout = null, lastUndoMessage = "", currentSort = 'score';

const hideUndoToast = () => {
    if (undoTimeout) clearTimeout(undoTimeout);
    if (window._hideUndoToastUI) window._hideUndoToastUI();
};
let currentReportView = 'points';
let currentReportPage = 1;
let pendingTreasures = {};

// --- Logic functions ---

const getSmartSyncInterval = () => {
    const m = idleSeconds / 60;
    if (m < 30) return 600;
    if (m < 120) return 3600;
    if (m < 360) return 7200;
    return 14400;
};

// --- Global Helpers ---
const L = (...args) => console.log(`[${new Date().toLocaleTimeString('zh-TW', {hour12:false})}]`, ...args);
const LE = (...args) => console.error(`[${new Date().toLocaleTimeString('zh-TW', {hour12:false})}]`, ...args);

const setDirty = (v) => {
    const old = isDirty;
    isDirty = v;
    localStorage.setItem('drty', String(v));
    
    if (v === 1) {
        const wasZero = (idleSeconds >= 1); // 判斷是否原本就在閒置
        idleSeconds = 0;
        // 只有當原本是乾淨狀態變髒，或者剛從閒置恢復時，才輸出日誌，避免重複輸出
        if (old === 0 || wasZero) {
            mSyn = getSmartSyncInterval();
            L(`[CloudSync] 智慧同步啟動：閒置 0.0 分鐘，頻率為每 ${mSyn} 秒一次。`);
        }
    } else if (v === 3) {
        // v=3 通常是定時器倒數觸發，不用重複輸出啟動日誌，除非需要追蹤頻率變化
        mSyn = getSmartSyncInterval();
    }
    
    if (typeof updateSyncStatus === 'function') updateSyncStatus();
    
    if (old === 0 && v === 1) {
        if (autoSyncInterval > 0 && cloudBinId && cloudApiKey) {
            L('[CloudSync] 狀態從 0 轉 1，預約 1 秒後同步...');
            setTimeout(() => { if (isDirty === 1 && typeof checkCloudSyncState === 'function') checkCloudSyncState(); }, 1000);
        }
    }
};

const saveData = (skipDirty = false) => {
    if(!currentClassId) return;
    localStorage.setItem('CD_Cls', JSON.stringify(classes));
    localStorage.setItem('CD_cCId', currentClassId || '');
    localStorage.setItem('BId', cloudBinId);
    localStorage.setItem('Key', cloudApiKey);
    localStorage.setItem('aSyn', String(autoSyncInterval));
    localStorage.setItem('sVer', String(localSyncVersion));
    localStorage.setItem(`CD_${currentClassId}_Stus`, JSON.stringify(students));
    localStorage.setItem(`CD_${currentClassId}_Gs`, JSON.stringify(groups));
    localStorage.setItem(`CD_${currentClassId}_Ls`, JSON.stringify(logs));
    localStorage.setItem(`CD_${currentClassId}_itm`, JSON.stringify(pointItems));
    localStorage.setItem(`CD_${currentClassId}_cItm`, JSON.stringify(customItems));
    
    // 移除過於激進的垃圾回收，以避免暫時輸入的「新增項目」名稱之偏好（正負號/排名勾選）在存檔時被誤刪
    /*
    Object.keys(customPrefs).forEach(k => {
        if (k !== '兌換點數' && !customItems.includes(k)) {
            delete customPrefs[k];
        }
    });
    */
    localStorage.setItem(`CD_${currentClassId}_cPref`, JSON.stringify(customPrefs));
    localStorage.setItem(`CD_${currentClassId}_gSet`, JSON.stringify(giftSettings));
    localStorage.setItem(`CD_${currentClassId}_tDef`, JSON.stringify(treasureDefs));
    localStorage.setItem(`CD_${currentClassId}_set`, JSON.stringify(settings));
    localStorage.setItem(`CD_${currentClassId}_Ops`, JSON.stringify(ops));
    localStorage.setItem('CD_SysOps', JSON.stringify(sysOps));
    
    if (!skipDirty) { 
        const hasCloud = !!(cloudBinId && cloudApiKey);
        setDirty(hasCloud ? 1 : 0);
    } else {
        if (typeof updateSyncStatus === 'function') updateSyncStatus();
    }
};

const loadClassData = () => {
    if(!currentClassId) return;
    students = safeLoad(`CD_${currentClassId}_Stus`, []);
    groups = safeLoad(`CD_${currentClassId}_Gs`, []);
    logs = safeLoad(`CD_${currentClassId}_Ls`, []);
    pointItems = safeLoad(`CD_${currentClassId}_itm`, JSON.parse(JSON.stringify(defaultItems)));
    customItems = safeLoad(`CD_${currentClassId}_cItm`, []);
    customPrefs = safeLoad(`CD_${currentClassId}_cPref`, {});
    giftSettings = safeLoad(`CD_${currentClassId}_gSet`, { gInt: 0, gStep: 0, gIgn: 1 });
    treasureDefs = safeLoad(`CD_${currentClassId}_tDef`, []);
    ops = safeLoad(`CD_${currentClassId}_Ops`, []);

    students.forEach(s => { if (!s.tr) s.tr = {}; });

    if (students.length > 0 && students[0].cP === undefined) {
        students.forEach(s => { s.cP = 0; s.iP = 0; });
        logs.forEach(l => { const s = students.find(x => x.id === l.sID); if(s) { if(l.iSum === 1) s.iP+=l.pt; else s.cP+=l.pt; } });
        saveData(true);
    }

    settings = safeLoad(`CD_${currentClassId}_set`, DEFAULT_SETTINGS);
    exposeToWindow();
};

const performLogRetention = () => {
    if (!settings || !settings.lRet) return;
    const retMonths = parseInt(settings.lRet);
    if (retMonths === 0) return;
    const threshold = Date.now() - retMonths * 30 * 24 * 60 * 60 * 1000;
    let dirty = false;
    classes.forEach(c => {
        const lKey = `CD_${c.id}_Ls`, sKey = `CD_${c.id}_Stus`, oKey = `CD_${c.id}_Ops`;
        let cLogs = JSON.parse(localStorage.getItem(lKey) || '[]');
        if (cLogs.length === 0) return;
        let cStudents = JSON.parse(localStorage.getItem(sKey) || '[]');
        const oLen = cLogs.length; cLogs = cLogs.filter(l => {
            const ts = (typeof l.TS === 'number') ? l.TS : StampTool.decode(l.TS).getTime();
            return ts >= threshold;
        });
        // 刪除大於 7 天的 Ops (防僵屍)
        let cOps = JSON.parse(localStorage.getItem(oKey) || '[]');
        const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
        cOps = cOps.filter(o => {
            const t = (typeof o.t === 'number') ? o.t : StampTool.decode(o.t).getTime();
            return t >= sevenDaysAgo;
        });
        localStorage.setItem(oKey, JSON.stringify(cOps));

        if (cLogs.length !== oLen) {
            localStorage.setItem(lKey, JSON.stringify(cLogs));
            if (c.id === currentClassId) { logs = cLogs; } 
            dirty = true;
        }
    });
    if (dirty) {
        if (cloudBinId && cloudApiKey) { isDirty = 1; localStorage.setItem('drty', '1'); if(typeof updateSyncStatus === 'function') updateSyncStatus(); if(typeof performCloudUpload === 'function') performCloudUpload(); }
        L('[System] 完成過期紀錄清理與瘦身');
    }

    // 2. Ops Retention
    const now = Date.now();
    const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
    const oneDayAgo = now - 24 * 60 * 60 * 1000;
    const isCloudMode = !!(cloudBinId && cloudApiKey);

    const oLen = ops.length;
    const cutoff = isCloudMode ? sevenDaysAgo : oneDayAgo;
    
    ops = ops.filter(o => {
        const t = (typeof o.t === 'number') ? o.t : StampTool.decode(o.t).getTime();
        return t > cutoff;
    });

    if (ops.length !== oLen) {
        saveData(true);
        L(`[System] ${isCloudMode ? '雲端模式' : '非雲端模式'}：已清理 ${oLen - ops.length} 筆過期 Ops (保留 ${isCloudMode ? '7 天' : '1 天'})`);
    }
};

const sanitizeAndCleanDatabase = () => {
    let dirtySystem = false;
    const K_MAP_FIXED = {
        'cdData_classes': 'CD_Cls',
        'cdData_currentClassId': 'CD_cCId',
        'cdData_cloudBinId': 'BId',
        'cdData_cloudApiKey': 'Key',
        'cdData_autoSyncInterval': 'aSyn',
        'cdData_syncVersion': 'sVer',
        'cdData_isDirty': 'drty'
    };
    const S_STYLE_MAP = { 'fun-emoji':'fe', 'bottts':'bot', 'avataaars':'ava', 'adventurer':'adv', 'lorelei':'lor' };
    const FT_MAP = { 'small':'14', 'medium':'16', 'large':'20' };

    const extractSeed = (url) => {
        if (!url || !url.startsWith('http')) return url;
        try {
            const u = new URL(url);
            return u.searchParams.get('seed') || url;
        } catch(e) { return url; }
    };

    for (const [oldK, newK] of Object.entries(K_MAP_FIXED)) {
        const val = localStorage.getItem(oldK);
        if (val !== null) {
            localStorage.setItem(newK, val);
            localStorage.removeItem(oldK);
            dirtySystem = true;
        }
    }

    const keys = Object.keys(localStorage);
    keys.forEach(k => {
        if (!k.startsWith('cdData_')) return;
        const parts = k.split('_');
        if (parts.length < 3) return;
        const cId = parts[1];
        const type = parts[2];
        const suffixMap = { 'students':'Stus', 'groups':'Gs', 'logs':'Ls', 'items':'itm', 'settings':'set', 'meta':'meta' };
        const typeAlias = suffixMap[type] || type;
        const newK = `CD_${cId}_${typeAlias}`;
        
        try {
            const rawVal = localStorage.getItem(k);
            if (!rawVal) return;
            let data = JSON.parse(rawVal);
            let changed = (newK !== k);

            if (type === 'students' && Array.isArray(data)) {
                data = data.map(s => {
                    const aS = S_STYLE_MAP[s.aS || s.avatarStyle] || s.aS || s.avatarStyle || 'fe';
                    const cP = s.cP !== undefined ? s.cP : (s.currentPoints || 0);
                    const iP = s.iP !== undefined ? s.iP : (s.ignorePoints || 0);
                    const aU = extractSeed(s.aU || s.avatarUrl);
                    const res = { id: String(s.name !== undefined ? s.name : s.id), aS, cP, iP };
                    if (aU) res.aU = aU;
                    return res;
                });
                changed = true;
            } else if (type === 'groups' && Array.isArray(data)) {
                data = data.map(g => ({ id: String(g.name || g.id), sIds: g.sIds || g.studentIds || [] }));
                changed = true;
            } else if (type === 'logs' && Array.isArray(data)) {
                data = data.map(l => {
                    const res = { id: l.id, sID: l.sID || l.studentId, iID: l.iID || l.itemId, lb: l.lb || l.label, pt: Number(l.pt !== undefined ? l.pt : (l.points || 0)), TS: l.TS || l.timestamp };
                    if (l.iSum === 1 || l.ignoreTotal === true) res.iSum = 1;
                    return res;
                });
                changed = true;
            } else if (type === 'items' && data) {
                const cleanI = { pos: [], neg: [] };
                const process = (arr) => (arr||[]).map(x => {
                    const r = { id: x.id, lb: x.lb || x.label, vl: Number(x.vl !== undefined ? x.vl : x.value), ic: x.ic || x.icon };
                    if (x.iSum === 1 || x.ignoreTotal === true) r.iSum = 1;
                    return r;
                });
                cleanI.pos = process(data.pos || data.positive);
                cleanI.neg = process(data.neg || data.needsWork);
                data = cleanI;
                changed = true;
            } else if (type === 'settings' && data) {
                data = {
                    ftS: FT_MAP[data.ftS || data.fontSize] || data.ftS || data.fontSize || 16,
                    col: Number(data.col !== undefined ? data.col : (data.columns || 10)),
                    gCol: Number(data.gCol !== undefined ? data.gCol : (data.groupColumns || 5)),
                    iCol: Number(data.iCol !== undefined ? data.iCol : (data.itemColumns || 5)),
                    itmS: Number(data.itmS !== undefined ? data.itmS : 0),
                    eS: (data.eS !== undefined ? (data.eS ? 1 : 0) : (data.enableSound ? 1 : 0)),
                    sCH: Number(data.sCH !== undefined ? data.sCH : (data.studentCardHeight || 0)),
                    gCH: Number(data.gCH !== undefined ? data.gCH : (data.groupCardHeight || 0)),
                    lRet: Number(data.lRet !== undefined ? data.lRet : (data.logRetention || 0)),
                    avS: Number(data.avS !== undefined ? data.avS : 0),
                    sAv: Number(data.sAv !== undefined ? data.sAv : 1),
                    sTR: Number(data.sTR !== undefined ? data.sTR : 1),
                    cGV: Number(data.cGV !== undefined ? data.cGV : 25),
                    cGH: Number(data.cGH !== undefined ? data.cGH : 25),
                    iGV: Number(data.iGV !== undefined ? data.iGV : 15),
                    iGH: Number(data.iGH !== undefined ? data.iGH : 15)
                };
                changed = true;
            }

            if (changed) {
                localStorage.setItem(newK, JSON.stringify(data));
                if (newK !== k) localStorage.removeItem(k);
                dirtySystem = true;
            }
        } catch(e) { console.error(`[System] 精簡化遷移失敗 (${k}):`, e); }
    });

    Object.keys(localStorage).forEach(k => {
        if (k.startsWith('cdData_')) {
            localStorage.removeItem(k);
            dirtySystem = true;
        }
    });

    if (dirtySystem) {
        L('[System] 全面精簡化完成，所有 Key 已轉移至 CD_ 前綴');
        if (cloudBinId && cloudApiKey) {
            isDirty = 1; localStorage.setItem('drty', '1');
            if (typeof updateSyncStatus === 'function') updateSyncStatus();
        }
    }
};

// --- Expose State to Window for Isolated React Components (Babel/Webpack) ---
Object.defineProperty(window, 'students', { get: () => students });
Object.defineProperty(window, 'groups', { get: () => groups });
Object.defineProperty(window, 'logs', { get: () => logs });
Object.defineProperty(window, 'pointItems', { get: () => pointItems });
Object.defineProperty(window, 'settings', { get: () => settings });
Object.defineProperty(window, 'classes', { get: () => classes });
Object.defineProperty(window, 'currentClassId', { get: () => currentClassId });
Object.defineProperty(window, 'currentView', { get: () => currentView });
Object.defineProperty(window, 'isMultiSelectMode', { get: () => isMultiSelectMode, set: (v) => { isMultiSelectMode = v; } });
Object.defineProperty(window, 'selectedStudentIds', { get: () => selectedStudentIds, set: (v) => { selectedStudentIds = v; } });
Object.defineProperty(window, 'selectedGroupIds', { get: () => selectedGroupIds, set: (v) => { selectedGroupIds = v; } });
Object.defineProperty(window, 'giftSettings', { get: () => giftSettings });
Object.defineProperty(window, 'treasureDefs', { get: () => treasureDefs });
Object.defineProperty(window, 'customItems', { get: () => customItems });
Object.defineProperty(window, 'customPrefs', { get: () => customPrefs });
Object.defineProperty(window, 'cloudBinId', { get: () => cloudBinId });
Object.defineProperty(window, 'cloudApiKey', { get: () => cloudApiKey });
Object.defineProperty(window, 'isSyncing', { get: () => isSyncing });
Object.defineProperty(window, 'localSyncVersion', { get: () => localSyncVersion });
Object.defineProperty(window, 'currentProfileId', { get: () => currentProfileId, set: (v) => { currentProfileId = v; } });
Object.defineProperty(window, 'editingGroupId', { get: () => editingGroupId, set: (v) => { editingGroupId = v; } });
Object.defineProperty(window, 'awardContextIds', { get: () => awardContextIds, set: (v) => { awardContextIds = v; } });
Object.defineProperty(window, 'currentGroupIdForAward', { get: () => currentGroupIdForAward, set: (v) => { currentGroupIdForAward = v; } });
Object.defineProperty(window, 'currentReportPage', { get: () => currentReportPage, set: (v) => { currentReportPage = v; } });

window.saveData = saveData;
window.setDirty = setDirty;
window.loadClassData = loadClassData;
