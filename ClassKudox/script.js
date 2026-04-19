/**
 * Charles Nextime Web Tools Portal - Core Logic
 * Copyright (c) 2026 Charles Nextime
 * Licensed under the GNU General Public License v3.0
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation.
 */

function initLibraries() {
    const libraries = [
        {
            url: 'https://cdnjs.cloudflare.com/ajax/libs/pako/2.1.0/pako.min.js',
            // 只有這項需要特殊條件，其餘沒寫的都會是 undefined (後面會補預設值)
            condition: typeof DecompressionStream === 'undefined'
        }
    ];

    libraries.forEach(lib => {
        // 1. 自動從 URL 提取檔名
        const fileName = new URL(lib.url).pathname.split('/').pop();

        // 2. 處理 shouldLoad 邏輯：
        // 如果 lib.condition 有定義，就用它的結果；如果沒定義(undefined)，則預設為 true
        const shouldLoad = (lib.condition !== undefined) ? lib.condition : true;

        if (!shouldLoad) {
            console.log(`%c[跳過] 環境支援原生功能，不載入: ${fileName}`, 'color: #9E9E9E;');
            return;
        }

        const script = document.createElement('script');
        script.src = lib.url;
        script.async = false;

        script.onload = function() {
            console.log(`%c[成功] 外部庫已載入: ${fileName}`, 'color: #4CAF50; font-weight: bold;');
        };

        script.onerror = function() {
            const fallbackPath = `libs/${fileName}`;
            console.warn(`[失敗] 載入失敗，嘗試本地備援: ${fallbackPath}`);
            
            const fallbackScript = document.createElement('script');
            fallbackScript.src = fallbackPath;
            fallbackScript.onload = () => console.log(`%c[備援成功] 已從本地載入: ${fileName}`, 'color: #FF9800; font-weight: bold;');
            fallbackScript.onerror = () => console.error(`[重大錯誤] 本地檔案不存在: ${fallbackPath}`);

            document.head.appendChild(fallbackScript);
        };

        document.head.appendChild(script);
    });
}

// 啟動
initLibraries();

document.addEventListener('DOMContentLoaded', () => {

    // 全域圖片捕獲，避免外部 Avatar API (例如 DiceBear) 回傳 504 Timeout 時畫面產生破圖
    const fallbackSvg = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="%23e2e8f0"/><circle cx="50" cy="45" r="20" fill="%2394a3b8"/><path d="M20 100 C 20 60, 80 60, 80 100" fill="%2394a3b8"/></svg>`;
    window.addEventListener('error', function(e) {
        if (e.target.tagName && e.target.tagName.toLowerCase() === 'img') {
            if (e.target.src !== fallbackSvg) e.target.src = fallbackSvg;
        }
    }, true);

    // --- State & Settings ---
    const safeLoad = (key, template) => {
        try {
            const raw = localStorage.getItem(key);
            if (raw === null) return template;
            const parsed = JSON.parse(raw);
            if (Array.isArray(template)) return Array.isArray(parsed) ? parsed : template;
            if (typeof template === 'object' && template !== null) {
                const result = {};
                for (const k in template) {
                    result[k] = parsed.hasOwnProperty(k) ? parsed[k] : template[k];
                }
                return result;
            }
            return parsed !== null ? parsed : template;
        } catch (e) {
            console.error(`[SafeLoad] 讀取 ${key} 失敗，使用預設值`, e);
            return template;
        }
    };

    const StampTool = (() => {
        const CHARS = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
        const EPOCH = 1735689600000; // 2026-01-01 至少可以使用到 2200年(YAGNI)
        const CHAR_MAP = Object.fromEntries([...CHARS].map((c, i) => [c, i]));
        return {
            encode: (date = Date.now()) => {
                let diff = Math.floor((new Date(date).getTime() - EPOCH) / 100);
                if (diff < 0) diff = 0;
                let res = "";
                while (diff > 0) { res = CHARS[diff % 62] + res; diff = Math.floor(diff / 62); }
                return res.padStart(6, '0');
            },
            decode: (code) => {
                let diff = 0;
                for (let i = 0; i < code.length; i++) {
                    const val = CHAR_MAP[code[i]];
                    if (val !== undefined) diff = diff * 62 + val;
                }
                return new Date((diff * 100) + EPOCH);
            }
        };
    })();

    const compressJSON = async (obj, formatted = false) => {
        try {
            const str = formatted ? JSON.stringify(obj, null, 2) : JSON.stringify(obj);
            if (typeof pako !== 'undefined') {
                const compressed = pako.gzip(str);
                let binaryStr = '';
                const chunkSize = 32768; // 32KB chunks
                for (let i = 0; i < compressed.length; i += chunkSize) {
                    binaryStr += String.fromCharCode.apply(null, compressed.subarray(i, i + chunkSize));
                }
                return btoa(binaryStr);
            }
            // Fallback
            const stream = new Blob([str]).stream().pipeThrough(new CompressionStream('gzip'));
            const resp = new Response(stream);
            const buf = await resp.arrayBuffer();
            return btoa(String.fromCharCode(...new Uint8Array(buf)));
        } catch(e) { console.error('壓縮失敗', e); return null; }
    };

    const decompressJSON = async (base64) => {
        try {
            const bin = atob(base64);
            const buf = new Uint8Array(bin.length);
            for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
            
            if (typeof pako !== 'undefined') {
                const jsonString = pako.ungzip(buf, { to: 'string' });
                return JSON.parse(jsonString);
            }
            // Fallback
            const stream = new Blob([buf]).stream().pipeThrough(new DecompressionStream('gzip'));
            const resp = new Response(stream);
            return await resp.json();
        } catch(e) { console.error('解壓失敗', e); return null; }
    };

    const decompressBinary = async (arrayBuffer) => {
        try {
            if (typeof pako !== 'undefined') {
                const buf = new Uint8Array(arrayBuffer);
                const jsonString = pako.ungzip(buf, { to: 'string' });
                return JSON.parse(jsonString);
            }
            // Fallback
            const stream = new Blob([arrayBuffer]).stream().pipeThrough(new DecompressionStream('gzip'));
            const resp = new Response(stream);
            return await resp.json();
        } catch(e) { console.error('解壓縮二進位失敗', e); return null; }
    };

    /**
     * Ops Action Codes:
     * 1: LOG_CREATE, 2: LOG_DELETE, 3: ITEM_UPSERT, 5: ITEM_DELETE
     * 4: STU_UPSERT, 6: STU_DELETE, 7: GRP_UPSERT, 8: GRP_DELETE
     * 10: CLS_RENAME, 11: CLS_ARCHIVE, 12: CLS_DELETE, 13: CLS_CREATE
     */
    const pushOp = (action, data, isGlobal = false) => {
        if (!cloudBinId || !cloudApiKey || autoSyncInterval <= 0) return;
        if (isGlobal) {
            sysOps.push({ t: StampTool.encode(), a: action, d: data });
            localStorage.setItem('CD_SysOps', JSON.stringify(sysOps));
        } else {
            ops.push({ t: StampTool.encode(), a: action, d: data });
            if (currentClassId) localStorage.setItem(`CD_${currentClassId}_Ops`, JSON.stringify(ops));
        }
    };

    // --- Avatar style mapping: short code <-> DiceBear style name ---
    const AS_MAP = { fe:'fun-emoji', bot:'bottts', ava:'avataaars', adv:'adventurer', lor:'lorelei' };
    const AS_REV = Object.fromEntries(Object.entries(AS_MAP).map(([k,v])=>[v,k]));
    const getAvatarUrl = (seed, aS) => {
        const style = AS_MAP[aS] || aS || 'fun-emoji';
        return `https://api.dicebear.com/7.x/${style}/svg?seed=${encodeURIComponent(seed)}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf`;
    };

    const getRandomSeed = () => {
        const chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz!@#$%^&*()-=+.,<>;'";
        const len = Math.floor(Math.random() * 4) + 1;
        let res = '';
        for (let i = 0; i < len; i++) res += chars.charAt(Math.floor(Math.random() * chars.length));
        return res;
    };

    // --- Key Migration Map ---
    const K_MAP = {
        'cdData_classes': 'CD_Cls',
        'cdData_currentClassId': 'CD_cCId',
        'cdData_cloudBinId': 'BId',
        'cdData_cloudApiKey': 'Key',
        'cdData_autoSyncInterval': 'aSyn',
        'cdData_syncVersion': 'sVer',
        'cdData_isDirty': 'drty'
    };
    // 預先遷移全局 Key
    Object.entries(K_MAP).forEach(([o, n]) => {
        const val = localStorage.getItem(o);
        if (val !== null) {
            localStorage.setItem(n, val);
            localStorage.removeItem(o);
        }
    });

    let useGzip = 1; // 1: 壓縮上傳, 0: 直接格式化上傳 (測試用)
    let classes = safeLoad('CD_Cls', []);
    let sysOps = JSON.parse(localStorage.getItem('CD_SysOps') || '[]');
    let currentClassId = localStorage.getItem('CD_cCId');
    let cloudBinId = localStorage.getItem('BId') || '';
    let cloudApiKey = localStorage.getItem('Key') || '';
    let autoSyncInterval = parseInt(localStorage.getItem('aSyn')) || 0;
    let localSyncVersion = localStorage.getItem('sVer') || '000000';
    // 嚴格檢查版本號格式，若不符合 Base62 規範則重置 (防止出現 1 這種異常值)
    if (localSyncVersion.length > 8 || localSyncVersion.length < 5) localSyncVersion = '000000';

    const fmtVer = (v) => { 
        if (!v || v === '000000') return '000000(無版本)'; 
        try { 
            const d = StampTool.decode(v); 
            const s = `${d.getFullYear()}/${String(d.getMonth()+1).padStart(2,'0')}/${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}:${String(d.getSeconds()).padStart(2,'0')}`;
            return `${v}( ${s})`; 
        } catch(e) { return v; } 
    };

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

    if (classes.length === 0) {
        let firstClassId = '我的班級';
        classes.push({ id: firstClassId });
        currentClassId = firstClassId;
        localStorage.setItem('CD_Cls', JSON.stringify(classes));
        localStorage.setItem('CD_cCId', currentClassId);
    } else if (!currentClassId || !classes.find(c => c.id === currentClassId)) {
        currentClassId = classes[0]?.id || '';
        localStorage.setItem('CD_cCId', currentClassId);
    }

    let students = [], groups = [], logs = [], pointItems = null, settings = null, ops = [], mSyn = 300;
    let customItems = []; // 預設自訂項目名稱 (字串陣列, e.g. ['兌換點數', '分領獎品'])
    let treasureDefs = []; // 寶物定義 [{id, lb, ic}]
    const DEFAULT_SETTINGS = { ftS: 'M', col: 10, gCol: 5, iCol: 5, eS: 0, sCH: 0, gCH: 0, lRet: 0, avS: 0, sAv: 1 };

    const loadClassData = () => {
        if(!currentClassId) return;
        students = safeLoad(`CD_${currentClassId}_Stus`, []);
        groups = safeLoad(`CD_${currentClassId}_Gs`, []);
        logs = safeLoad(`CD_${currentClassId}_Ls`, []);
        pointItems = safeLoad(`CD_${currentClassId}_itm`, JSON.parse(JSON.stringify(defaultItems)));
        customItems = safeLoad(`CD_${currentClassId}_cItm`, []);
        treasureDefs = safeLoad(`CD_${currentClassId}_tDef`, []);
        ops = safeLoad(`CD_${currentClassId}_Ops`, []);

        // 初始化學生寶物欄位
        students.forEach(s => { if (!s.tr) s.tr = {}; });

        if (students.length > 0 && students[0].cP === undefined) {
            students.forEach(s => { s.cP = 0; s.iP = 0; });
            logs.forEach(l => { const s = students.find(x => x.id === l.sID); if(s) { if(l.iSum === 1) s.iP+=l.pt; else s.cP+=l.pt; } });
            saveData(true);
        }

        settings = safeLoad(`CD_${currentClassId}_set`, DEFAULT_SETTINGS);
    };

    let currentView = 'students', isMultiSelectMode = false;
    let selectedStudentIds = [];
    Object.defineProperty(selectedStudentIds, 'size', { get() { return this.length; } });
    selectedStudentIds.has = function(id) { return this.includes(id); };
    selectedStudentIds.add = function(id) { this.push(id); };
    selectedStudentIds.delete = function(id) { const i = this.indexOf(id); if (i > -1) { this.splice(i, 1); return true; } return false; };
    selectedStudentIds.clear = function() { this.length = 0; };
    selectedStudentIds.toArray = function() { return this.slice(); };
    let isDirty = Number(localStorage.getItem('drty')) || ((cloudBinId && cloudApiKey) ? 3 : 0), isSyncing = false, autoSyncTimer = null; 
    let awardContextIds = [], currentProfileId = null, editingGroupId = null, currentGroupIdForAward = null, editingPointItemId = null, editingPointItemCat = null, lastActionLogIds = [], undoTimeout = null, currentSort = 'score';
    let currentReportView = 'points'; // 'points' | 'treasure'
    let pendingTreasures = {};

    const setDirty = (v) => {
        const old = isDirty;
        isDirty = v;
        localStorage.setItem('drty', String(v));
        mSyn = 300; // 只要 isDirty 有變動，mSyn 恢復到 300
        updateSyncStatus();
        
        // 當 isDirty 從 0 變成 1 時，1秒後執行同步作業
        if (old === 0 && v === 1) {
            if (autoSyncInterval > 0 && cloudBinId && cloudApiKey) {
                console.log('[CloudSync] 狀態從 0 轉 1，預約 1 秒後同步...');
                setTimeout(() => { if (isDirty === 1) checkCloudSyncState(); }, 1000);
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
        localStorage.setItem(`CD_${currentClassId}_tDef`, JSON.stringify(treasureDefs));
        localStorage.setItem(`CD_${currentClassId}_set`, JSON.stringify(settings));
        localStorage.setItem(`CD_${currentClassId}_Ops`, JSON.stringify(ops));
        localStorage.setItem('CD_SysOps', JSON.stringify(sysOps));
        
        if (!skipDirty) { 
            const hasCloud = (cloudBinId && cloudApiKey && autoSyncInterval > 0);
            setDirty(hasCloud ? 1 : 0);
        } else {
            updateSyncStatus();
        }
    };

    const updateSyncStatus = () => {
        const el = document.getElementById('syncStatus'); if (!el) return;
        const s = [ 
            {t:'本機儲存',c:'state-0'}, 
            {t:'等待同步',c:'state-1'}, 
            {t:'同步錯誤',c:'state-2'}, 
            {t:'同步完成',c:'state-3'},
            {t:'正在同步',c:'state-4'} 
        ][isDirty] || {t:'本機儲存',c:'state-0'};
        el.textContent = s.t; el.className = 'sync-badge ' + s.c;
    };

    const applySettings = () => {
        if(!settings) return;
        const ftMap = { M:'medium', S:'small', L:'large' };
        document.body.dataset.fontSize = ftMap[settings.ftS] || settings.ftS || 'medium';
        document.documentElement.style.setProperty('--grid-cols', settings.col);
        document.documentElement.style.setProperty('--group-grid-cols', settings.gCol || 2);
        document.documentElement.style.setProperty('--item-grid-cols', settings.iCol || 3);
        document.documentElement.style.setProperty('--student-card-height', (settings.sCH || 0) + 'px');
        document.documentElement.style.setProperty('--group-card-height', (settings.gCH || 0) + 'px');
        const setVal = (id, val) => { const el = document.getElementById(id); if(el) el.value = val; };
        const setTxt = (id, val) => { const el = document.getElementById(id); if(el) el.textContent = val; };
        setVal('fontSizeSelect', settings.ftS); setVal('gridColsRange', settings.col); setTxt('gridColsLabel', settings.col);
        setVal('cardHeightRange', settings.sCH); setTxt('cardHeightLabel', settings.sCH);
        setVal('groupHeightRange', settings.gCH); setTxt('groupHeightLabel', settings.gCH);
        setVal('groupColsRange', settings.gCol || 2); setTxt('groupColsLabel', settings.gCol || 2);
        setVal('itemColsRange', settings.iCol || 3); setTxt('itemColsLabel', settings.iCol || 3);
        const ss = document.getElementById('enableSoundSetting'); if(ss) ss.checked = !!settings.eS;
        const rr = document.getElementById('logRetentionSetting'); if(rr) rr.value = settings.lRet || 0;
        
        // Avatar settings
        document.documentElement.style.setProperty('--avatar-scale', 1 + (settings.avS || 0) / 100);
        document.documentElement.style.setProperty('--avatar-display', settings.sAv === 0 ? 'none' : 'block');
        setVal('avatarSizeRange', settings.avS || 0); setTxt('avatarSizeLabel', settings.avS || 0);
        const sa = document.getElementById('showAvatarSetting'); if(sa) sa.checked = settings.sAv !== 0;

        updateSyncStatus();
    };

    // --- Core Logic Functions ---
    const openModal = (m) => m?.classList.remove('hidden');
    const closeModal = (m) => m?.classList.add('hidden');
    
    const toggleMultiSelectMode = () => {
        isMultiSelectMode = !isMultiSelectMode;
        selectedStudentIds.clear();
        const bar = document.getElementById('multiSelectBar'); if(bar) bar.classList.toggle('hidden', !isMultiSelectMode);
        const btn = document.getElementById('toggleMultiSelectBtn'); if(btn) btn.classList.toggle('active', isMultiSelectMode);
        const countEl = document.getElementById('multiSelectCount'); if(countEl) countEl.textContent = `已選擇 0 位學生`;
        renderStudents();
    };

    const switchProfileTab = (tab) => {
        document.querySelectorAll('.main-tabs .tab-btn').forEach(b => b.classList.toggle('active', b.dataset.profileTab === tab));
        const awardTab = document.getElementById('profileAwardTab'); if(awardTab) awardTab.classList.toggle('active', tab === 'award');
        const treasTab = document.getElementById('profileTreasureTab'); if(treasTab) treasTab.classList.toggle('active', tab === 'treasure');
        const histTab = document.getElementById('profileHistoryTab'); if(histTab) histTab.classList.toggle('active', tab === 'history');
        if(tab === 'history') renderHistory();
        if(tab === 'treasure') renderStudentTreasures();
    };

    const switchAwardTab = (tab) => {
        document.querySelectorAll('.sub-tabs .sub-tab-btn').forEach(b => b.classList.toggle('active', b.dataset.awardTab === tab));
        document.getElementById('positiveItems').classList.toggle('active', tab === 'positive');
        document.getElementById('needsWorkItems').classList.toggle('active', tab === 'needs-work');
        document.getElementById('customAwardArea').classList.toggle('active', tab === 'custom');
    };

    const openAwardModal = (ids, title, groupId = null) => {
        awardContextIds = ids;
        currentGroupIdForAward = groupId;
        pendingTreasures = {};
        if(ids.length === 1) currentProfileId = ids[0]; 
        const header = document.getElementById('currentProfileName'); if(header) header.textContent = title;
        
        // Load custom tab state
        const savedCustom = safeLoad('CD_CustomTemp', null);
        if (savedCustom) {
            const v = document.getElementById('customAwardValue'); if(v) v.value = savedCustom.v;
            const ign = document.getElementById('customAwardIgnore'); if(ign) ign.checked = !!savedCustom.ign;
            const sel = document.getElementById('customAwardLabel'); if(sel) sel.value = savedCustom.l || '兌換點數';
            const temp = document.getElementById('customAwardTempName'); if(temp) temp.value = savedCustom.temp || '';
        }
        const profileModal = document.querySelector('.profile-modal');
        if(profileModal) profileModal.classList.toggle('modal-large', !!groupId);
        const editBtn = document.getElementById('editProfileBtn');
        if(editBtn) editBtn.classList.toggle('hidden', !!groupId);
        
        const histTabBtn = document.getElementById('profileHistoryTabBtn');
        if(histTabBtn) histTabBtn.classList.toggle('hidden', ids.length > 1 || !!groupId);
        
        const peek = document.getElementById('groupAwardMembersPeek');
        if(groupId && peek) {
            peek.classList.remove('hidden'); peek.innerHTML = '';
            const g = groups.find(x => x.id === groupId);
            if(g) {
                g.sIds.forEach(sid => {
                    const s = students.find(x => x.id === sid); if(!s) return;
                    const total = s.cP || 0;
                    const div = document.createElement('div');
                    div.style = "display:flex; align-items:center; gap:0.5rem; padding:8px 12px; border:1.5px solid var(--primary-color); border-radius:12px; background:white; font-size:0.95rem; box-shadow: 0 4px 6px rgba(0,0,0,0.05); flex-shrink:0;";
                    div.innerHTML = `<img src="${getAvatarUrl(s.aU||s.id, s.aS)}" style="width:28px; height:28px; border-radius:50%; border:1px solid var(--border-color);">
                        <span style="font-weight:700;">${s.id} <b style="color:var(--primary-color); margin-left:4px;">(${total})</b></span>`;
                    peek.appendChild(div);
                });
            }
        } else if(peek) { peek.classList.add('hidden'); }
        switchProfileTab('award'); openModal(document.getElementById('studentProfileModal')); 
    };

    const generateAvatar = (name, style = 'fe') => getAvatarUrl(name, style);

    const toggleStudentSelection = (id) => { 
        selectedStudentIds.has(id) ? selectedStudentIds.delete(id) : selectedStudentIds.add(id); 
        const el = document.getElementById('multiSelectCount'); if(el) el.textContent = `已選擇 ${selectedStudentIds.size} 位學生`; 
        renderStudents(); 
    };

    const awardPoints = (iID, lb, pt, forcedIgnore = null) => {
        if(!awardContextIds.length) return;
        const count = awardContextIds.length;
        const now = Date.now(); 
        const tsHex = StampTool.encode(now);
        let newIds = [];
        const isIgnore = !!forcedIgnore;
        awardContextIds.forEach(sid => { 
            const logId = Math.random().toString(36).substring(2, 8); 
            const logEntry = { id: logId, sID: sid, lb, pt: Number(pt), TS: tsHex };
            if(isIgnore) logEntry.iSum = 1;
            logs.push(logEntry); 
            newIds.push(logId); 
            const s = students.find(x => x.id === sid);
            if(s) {
                if(isIgnore) s.iP = (s.iP || 0) + Number(pt);
                else s.cP = (s.cP || 0) + Number(pt);
            }
            const opData = { s: sid, lb, p: Number(pt), l: logId };
            if(isIgnore) opData.is = 1;
            pushOp(1, opData);
        });
        saveData(); createPointAnimation(pt, count); renderStudents(); if(currentView === 'groups') renderGroups();
        lastActionLogIds = newIds; showUndoToast(`${pt > 0 ? '+' : ''}${pt} 給予 ${count} 位學生`);
        if(isMultiSelectMode) toggleMultiSelectMode();
        // 確保關閉所有可能的學生彈窗或是群組彈窗後的背景
        setTimeout(() => {
            closeModal(document.getElementById('studentProfileModal'));
            closeModal(document.getElementById('groupDetailModal'));
        }, 400);
    };

    const openManageGroupModal = (groupId = null) => {
        editingGroupId = groupId;
        const title = document.getElementById('groupModalTitle');
        const nameInp = document.getElementById('groupNameInput');
        const grid = document.getElementById('groupStudentSelectionGrid'); if(!grid) return;
        grid.innerHTML = '';
        if(groupId) {
            const g = groups.find(x => x.id === groupId);
            if(title) title.textContent = '編輯群組';
            if(nameInp) nameInp.value = g.id;
            students.forEach(s => {
                const checked = g.sIds.includes(s.id);
                const total = s.cP || 0;
                grid.innerHTML += `<label class="selection-item" style="display:flex; align-items:center; gap:0.5rem; padding:8px; border:1px solid var(--border-color); border-radius:10px; background:white;">
                    <input type="checkbox" value="${s.id}" ${checked ? 'checked' : ''}>
                    <img src="${getAvatarUrl(s.aU || s.id, s.aS)}" style="width:24px; height:24px; border-radius:50%;">
                    <span style="font-size:0.9rem;">${s.id} (${total})</span>
                </label>`;
            });
            document.getElementById('deleteGroupBtn').classList.remove('hidden');
        } else {
            if(title) title.textContent = '新增群組';
            if(nameInp) nameInp.value = '';
            students.forEach(s => {
                const total = (s.cP || 0) + (s.iP || 0);
                grid.innerHTML += `<label class="selection-item" style="display:flex; align-items:center; gap:0.5rem; padding:8px; border:1px solid var(--border-color); border-radius:10px; background:white;">
                    <input type="checkbox" value="${s.id}">
                    <img src="${getAvatarUrl(s.aU || s.id, s.aS)}" style="width:24px; height:24px; border-radius:50%;">
                    <span style="font-size:0.9rem;">${s.id} (${total})</span>
                </label>`;
            });
            document.getElementById('deleteGroupBtn').classList.add('hidden');
        }
        openModal(document.getElementById('manageGroupModal'));
    };

    const openGroupDetailModal = (g) => {
        const title = document.getElementById('groupDetailTitle'); if(title) title.textContent = g.id;
        const list = document.getElementById('groupDetailStudentList'); if(list) {
            list.innerHTML = '';
            g.sIds.forEach(sid => {
                const s = students.find(x => x.id === sid); if(!s) return;
                const li = document.createElement('li'); li.innerHTML = `<img src="${getAvatarUrl(s.aU||s.id, s.aS)}" class="student-avatar small-avatar"><span>${s.id}</span>`;
                list.appendChild(li);
            });
        }
        awardContextIds = g.sIds;
        currentGroupIdForAward = g.id; // Store for award modal
        openModal(document.getElementById('groupDetailModal'));
    };

    const openEditPointItemModal = (cat, itemId) => {
        editingPointItemCat = cat; editingPointItemId = itemId;
        const modal = document.getElementById('editPointItemModal');
        const header = modal.querySelector('h2');
        const valGroup = document.getElementById('editItemValue').parentElement;
        const ignGroup = document.getElementById('editItemIgnore').parentElement;

        let item;
        if (cat === 'treasure') {
            item = treasureDefs.find(i => i.id === itemId); if(!item) return;
            header.textContent = '編輯寶物';
            valGroup.style.display = 'none';
            ignGroup.style.display = 'none';
        } else {
            item = pointItems[cat].find(i => i.id === itemId); if(!item) return;
            header.textContent = '編輯行為項目';
            valGroup.style.display = 'flex';
            ignGroup.style.display = 'flex';
            document.getElementById('editItemValue').value = item.vl;
            document.getElementById('editItemIgnore').checked = item.iSum === 1;
        }

        document.getElementById('editItemLabel').value = item.lb;
        document.getElementById('editItemIconBtn').textContent = item.ic;
        openModal(modal);
    };

    const showUndoToast = (m) => { 
        const el = document.getElementById('undoMessage'); if(el) el.textContent = m; 
        const toast = document.getElementById('undoToast'); if(toast) toast.classList.remove('hidden'); 
        if(undoTimeout) clearTimeout(undoTimeout); 
    };

    const undoAction = () => {
        if (!lastActionLogIds.length) return;
        const set = new Set(lastActionLogIds);
        logs.filter(l => set.has(l.id)).forEach(l => {
            const s = students.find(x => x.id === l.sID);
            if(s) {
                if(l.iSum === 1) s.iP = (s.iP || 0) - l.pt;
                else s.cP = (s.cP || 0) - l.pt;
            }
        });
        logs = logs.filter(l => !set.has(l.id));
        lastActionLogIds.forEach(lid => pushOp(2, lid));
        lastActionLogIds = [];
        saveData();
        const toast = document.getElementById('undoToast'); if(toast) toast.classList.add('hidden');
        renderStudents(); if(currentView === 'groups') renderGroups();
    };

    // --- Actions & Helpers ---
    const switchMainView = (v) => { 
        currentView = v; 
        document.querySelectorAll('.view-tab-btn').forEach(b => b.classList.toggle('active', b.dataset.view === v)); 
        const sGrid = document.getElementById('studentGrid'); if(sGrid) sGrid.classList.toggle('hidden', v !== 'students'); 
        const gGrid = document.getElementById('groupGrid'); if(gGrid) gGrid.classList.toggle('hidden', v !== 'groups'); 
        v === 'students' ? renderStudents() : renderGroups(); 
    };

    const renderStudents = () => {
        const grid = document.getElementById('studentGrid'); if(!grid) return; grid.innerHTML = '';
        [...students].sort((a,b) => a.id.localeCompare(b.id, 'zh-TW')).forEach(s => {
            const card = document.createElement('div'); card.className = 'student-card' + (selectedStudentIds.has(s.id) ? ' selected' : '');
            card.onclick = () => isMultiSelectMode ? toggleStudentSelection(s.id) : openAwardModal([s.id], s.id, null);
            let total = (s.cP || 0) + (s.iP || 0);
            const ptClass = 'student-points' + (total > 0 ? ' positive-total' : (total < 0 ? ' negative-total' : ''));
            card.innerHTML = `${isMultiSelectMode ? `<div class="selection-check">${selectedStudentIds.has(s.id) ? '\u2713' : ''}</div>` : ''}<div class="student-avatar-wrapper"><img src="${getAvatarUrl(s.aU||s.id, s.aS)}" class="student-avatar"><div class="${ptClass}">${total}</div></div><div class="student-name">${s.id}</div>`;
            grid.appendChild(card);
        });
    };

    const renderGroups = () => {
        const grid = document.getElementById('groupGrid'); if(!grid) return; grid.innerHTML = '';
        groups.forEach(g => {
            const card = document.createElement('div'); card.className = 'student-card group-card';
            let total = g.sIds.reduce((sum, sid) => { const s = students.find(x=>x.id===sid); return sum + (s ? ((s.cP||0) + (s.iP||0)) : 0); }, 0);
            const ptClass = 'student-points' + (total > 0 ? ' positive-total' : (total < 0 ? ' negative-total' : ''));
            // Feature 5: Visual selection state for groups in multi-select
            const allSel = isMultiSelectMode && g.sIds.length > 0 && g.sIds.every(id => selectedStudentIds.has(id));
            if (allSel) card.classList.add('selected');
            card.innerHTML = `<button class="edit-group-inline-btn">\u2699\ufe0f</button><div class="group-icon">\ud83d\udc65</div><div class="student-name">${g.id}</div><div class="group-member-count">${g.sIds.length} \u4f4d\u6210\u54e1</div><div class="${ptClass}">${total > 0 ? '+' : ''}${total}</div>`;
            card.querySelector('.edit-group-inline-btn').onclick = (e) => { e.stopPropagation(); openManageGroupModal(g.id); };
            // Feature 5: Multi-select toggles all group members
            card.onclick = () => {
                if (isMultiSelectMode) {
                    const allSelected = g.sIds.length > 0 && g.sIds.every(id => selectedStudentIds.has(id));
                    g.sIds.forEach(id => allSelected ? selectedStudentIds.delete(id) : selectedStudentIds.add(id));
                    const countEl = document.getElementById('multiSelectCount');
                    if (countEl) countEl.textContent = `\u5df2\u9078\u64c7 ${selectedStudentIds.size} \u4f4d\u5b78\u751f`;
                    renderStudents(); renderGroups();
                } else {
                    g.sIds.length ? openAwardModal(g.sIds, g.id, g.id) : alert('\u7fa4\u7d44\u5167\u6c92\u6709\u5b78\u751f');
                }
            };
            grid.appendChild(card);
        });
        const create = document.createElement('div'); create.className = 'student-card create-group-card'; create.onclick = () => openManageGroupModal();
        create.innerHTML = `<div class="student-avatar" style="background:#f1f5f9;display:flex;align-items:center;justify-content:center;font-size:2rem;color:#94a3b8">+</div><div class="student-name">\u65b0\u589e\u7fa4\u7d44</div>`;
        grid.appendChild(create);
    };

    const renderPointItems = () => {
        // 加扣點看到的
        const rGrid = (id, items, cat) => { const el = document.getElementById(id); if(!el) return; el.innerHTML = ''; items.slice().sort((a,b)=>a.lb.localeCompare(b.lb,'zh-TW')).forEach(item => { const btn = document.createElement('button'); btn.className = `point-item-btn ${cat}`; btn.innerHTML = `<div class="point-icon">${item.ic}</div><div class="point-label">${item.lb}${item.iSum===1?'<small>(不列排)</small>':''}</div><div class="point-value">${item.vl > 0 ? '+' : ''}${item.vl}</div>`; btn.onclick = () => awardPoints(item.id, item.lb, item.vl, item.iSum===1); el.appendChild(btn); }); };
        rGrid('positiveItems', pointItems.pos, 'positive'); rGrid('needsWorkItems', pointItems.neg, 'negative');
        // 設定裡看到的
        const rList = (id, items, cat) => { const el = document.getElementById(id); if(!el) return; el.innerHTML = ''; items.slice().sort((a,b)=>a.lb.localeCompare(b.lb,'zh-TW')).forEach(item => { const div = document.createElement('div'); div.className = `point-item-btn ${cat==='pos'?'positive':'negative'}`; div.onclick = () => openEditPointItemModal(cat, item.id); div.innerHTML = `<div class="point-icon">${item.ic}</div><div class="point-label">${item.lb}${item.iSum===1?'<small>(不列排)</small>':''}</div><div class="point-value">${item.vl > 0 ? '+' : ''}${item.vl}</div><button class="remove-item-btn" onclick="event.stopPropagation(); window.removePointItem('${cat}', '${item.id}')">×</button>`; el.appendChild(div); }); };
        rList('settingsPositiveList', pointItems.pos, 'pos'); rList('settingsNeedsWorkList', pointItems.neg, 'neg');
        renderCustomDropdown();
        renderTreasureSettings();
    };

    // --- 自訂項目下拉選單 (在給予點數 -> 臨時自訂 中顯示) ---
    const renderCustomDropdown = () => {
        const sel = document.getElementById('customAwardLabel'); if(!sel) return;
        sel.innerHTML = '';
        // 固定預設選項
        const defaultOpt = document.createElement('option');
        defaultOpt.value = '兌換點數'; defaultOpt.textContent = '兌換點數';
        sel.appendChild(defaultOpt);
        // 從 customItems (字串陣列) 產生選項
        customItems.forEach(name => {
            if (name === '兌換點數') return; // 避免重複
            const opt = document.createElement('option');
            opt.value = name; opt.textContent = name;
            sel.appendChild(opt);
        });
    };

    // --- 設定頁載入 textarea ---
    const loadCustomTextarea = () => {
        const ta = document.getElementById('customItemsTextarea'); if(!ta) return;
        ta.value = customItems.join('\n');
    };

    // --- 寶物設定頁渲染 ---
    const renderTreasureSettings = () => {
        const el = document.getElementById('settingsTreasureList'); if(!el) return;
        el.innerHTML = '';
        treasureDefs.slice().sort((a,b)=>a.lb.localeCompare(b.lb,'zh-TW')).forEach(item => {
            const div = document.createElement('div');
            div.className = 'point-item-btn positive';
            div.onclick = () => openEditPointItemModal('treasure', item.id);
            div.innerHTML = `<div class="point-icon">${item.ic}</div><div class="point-label">${item.lb}</div><button class="remove-item-btn" onclick="event.stopPropagation(); window.removeTreasureDef('${item.id}')">×</button>`;
            el.appendChild(div);
        });
    };

    window.removeTreasureDef = (id) => {
        if(!confirm('刪除此寶物？學生已持有的該種寶物也會清除。')) return;
        treasureDefs = treasureDefs.filter(i => i.id !== id);
        students.forEach(s => { if(s.tr) delete s.tr[id]; });
        pushOp(15, id); // Action 15: Delete Treasure Definition
        saveData(); renderPointItems();
    };

    const renderStudentTreasures = () => {
        const el = document.getElementById('studentTreasureList'); if(!el) return;
        el.innerHTML = '';
        if (!treasureDefs.length) {
            el.innerHTML = '<p style="text-align:center; color:var(--text-secondary); padding:2rem;">尚未定義寶物，請先在「系統設定 → 寶物設定」中新增寶物種類。</p>';
            return;
        }
        const ids = awardContextIds;
        const isMulti = ids.length > 1 || currentGroupIdForAward !== null;
        treasureDefs.slice().sort((a,b)=>a.lb.localeCompare(b.lb,'zh-TW')).forEach(td => {
            const card = document.createElement('div');
            card.className = 'treasure-card';
            let qtyText = '0';
            if (!isMulti) {
                const s = students.find(x => x.id === ids[0]);
                qtyText = (s && s.tr && s.tr[td.id]) ? s.tr[td.id] : 0;
            } else {
                qtyText = pendingTreasures[td.id] || 0;
            }
            card.innerHTML = `
                <div class="treasure-info">
                    <span class="treasure-icon">${td.ic}</span>
                    <span class="treasure-name">${td.lb}</span>
                </div>
                <div class="treasure-controls">
                    <button class="btn treasure-minus" data-tid="${td.id}">−</button>
                    <span class="treasure-qty ${isMulti && qtyText!==0 ? (qtyText>0?'positive-val':'negative-val') : ''}">${isMulti && qtyText>0?'+':''}${qtyText}</span>
                    <button class="btn treasure-plus" data-tid="${td.id}">+</button>
                </div>
            `;
            card.querySelector('.treasure-minus').onclick = () => {
                if(isMulti) { pendingTreasures[td.id] = (pendingTreasures[td.id]||0) - 1; renderStudentTreasures(); }
                else awardTreasure(td.id, -1);
            };
            card.querySelector('.treasure-plus').onclick = () => {
                if(isMulti) { pendingTreasures[td.id] = (pendingTreasures[td.id]||0) + 1; renderStudentTreasures(); }
                else awardTreasure(td.id, 1);
            };
            el.appendChild(card);
        });

        if (isMulti) {
            const totalPending = Object.values(pendingTreasures).reduce((a,b) => a+Math.abs(b), 0);
            const confBtn = document.createElement('button');
            confBtn.className = 'btn primary-btn';
            confBtn.style = 'width:100%; margin-top: 1rem; padding: 1rem; font-size: 1.1em; border-radius: 16px; background: linear-gradient(135deg, #10b981, #059669);';
            confBtn.innerHTML = `🎁 確定給予寶物 (${totalPending > 0 ? '已調整項目' : '尚未調整'})`;
            confBtn.disabled = totalPending === 0;
            if (totalPending === 0) { confBtn.style.opacity = '0.5'; confBtn.style.cursor = 'not-allowed'; }
            
            confBtn.onclick = () => {
                let count = 0;
                Object.entries(pendingTreasures).forEach(([tId, qty]) => {
                    if (qty !== 0) { awardTreasure(tId, qty, true); count++; }
                });
                if (count > 0) {
                    renderStudents(); if(currentView==='groups') renderGroups();
                    createPointAnimation(1, awardContextIds.length);
                    showUndoToast(`已給予 ${awardContextIds.length} 位學生寶物異動`);
                }
                pendingTreasures = {};
                if(isMultiSelectMode) toggleMultiSelectMode();
                setTimeout(() => {
                    closeModal(document.getElementById('studentProfileModal'));
                    closeModal(document.getElementById('groupDetailModal'));
                }, 400);
            };
            el.appendChild(confBtn);
        }
    };

    const awardTreasure = (treasureId, qty, silent = false) => {
        const td = treasureDefs.find(t => t.id === treasureId);
        if (!td) return;
        awardContextIds.forEach(sid => {
            const s = students.find(x => x.id === sid);
            if (!s) return;
            if (!s.tr) s.tr = {};
            s.tr[treasureId] = (s.tr[treasureId] || 0) + qty;
            
            const logId = Math.random().toString(36).substring(2, 8);
            const tsHex = StampTool.encode();
            const qtyText = qty > 0 ? `+${qty}` : `${qty}`;
            const logLabel = `${td.ic}${td.lb} ${qtyText}`;
            const logEntry = { id: logId, sID: sid, lb: logLabel, pt: 0, TS: tsHex, iSum: 1, trId: treasureId, trQty: qty };
            logs.push(logEntry);
            pushOp(1, { s: sid, lb: logLabel, p: 0, l: logId, is: 1, ti: treasureId, tq: qty });
        });
        saveData();
        if (!silent) {
            renderStudentTreasures();
            renderStudents();
            createPointAnimation(qty, awardContextIds.length);
            showUndoToast(`${qty > 0 ? '+' : ''}${qty} ${td.lb} 給予 ${awardContextIds.length} 位學生`);
        }
    };

    window.removePointItem = (cat, id) => { 
        if(!confirm('刪除此項目？')) return; 
        pointItems[cat] = pointItems[cat].filter(i => i.id !== id); 
        pushOp(5, { c: cat, id: id });
        saveData(); renderPointItems(); 
    };
    
    window.deleteLog = (id) => { 
        if(!confirm('刪除此紀錄？')) return; 
        const l = logs.find(x => x.id == id);
        if(l) {
            const s = students.find(x => x.id === l.sID);
            if(s) {
                if (l.trId && l.trQty) {
                    if (s.tr) s.tr[l.trId] = (s.tr[l.trId] || 0) - l.trQty;
                } else {
                    if(l.iSum === 1) s.iP = (s.iP || 0) - l.pt;
                    else s.cP = (s.cP || 0) - l.pt;
                }
            }
        }
        logs = logs.filter(x => x.id != id); 
        pushOp(2, id);
        saveData(); renderHistory(); renderStudents(); if(currentView === 'groups') renderGroups(); if(!document.getElementById('reportsModal').classList.contains('hidden')) window.renderReports(); 
    };
    
    const renderHistory = () => { 
        const list = document.getElementById('studentHistoryList'); if(!list) return; list.innerHTML = ''; 
        const f = logs.filter(l => l.sID === currentProfileId).sort((a,b) => {
            if (typeof a.TS === 'number' && typeof b.TS === 'number') return b.TS - a.TS;
            const sa = String(a.TS), sb = String(b.TS);
            if (sa.length !== sb.length) return sb.length - sa.length;
            return sa > sb ? -1 : (sa < sb ? 1 : 0);
        }); 
        if(!f.length) return list.innerHTML = '<li class="empty-state">無紀錄</li>'; 
        f.forEach(l => { 
            const li = document.createElement('li'); 
            const d = (typeof l.TS === 'number') ? new Date(l.TS) : StampTool.decode(l.TS);
            const isTreasure = !!l.trId;
            const rightContent = isTreasure ? `<button class="delete-log-btn" onclick="window.deleteLog('${l.id}')">🗑️</button>` : `${l.pt > 0 ? '+' : ''}${l.pt}<button class="delete-log-btn" onclick="window.deleteLog('${l.id}')">🗑️</button>`;
            li.innerHTML = `<div class="history-item-left"><span class="history-date">${d.toLocaleString()}</span><span class="history-label">${l.lb}${l.iSum === 1 && !isTreasure ? '<small>(不列排)</small>' : ''}</span></div><div class="history-item-right ${isTreasure ? '' : (l.pt > 0 ? 'positive-val' : 'negative-val')}">${rightContent}</div>`; 
            list.appendChild(li); 
        }); 
    };

    const renderClassSelector = () => {
        const classSelect = document.getElementById('classSelect'); if(!classSelect) return;
        classSelect.innerHTML = '';
        classes.filter(c => !c.arc || c.id === currentClassId).forEach(c => { const opt = document.createElement('option'); opt.value = c.id; opt.textContent = c.id + (c.arc ? ' (封存)' : ''); if(c.id === currentClassId) opt.selected = true; classSelect.appendChild(opt); });
        classSelect.onchange = async (e) => { 
            const newId = e.target.value;
            if (isDirty === 1) {
                isSyncing = true; updateSyncStatus();
                try { await performCloudUpload(); } catch(err) { console.error('切換班級前同步失敗', err); }
            }
            currentClassId = newId; localStorage.setItem('CD_cCId', currentClassId); location.reload(); 
        };
        const l = document.getElementById('classList'); if(l) { l.innerHTML = ''; classes.forEach(c => {
            const li = document.createElement('li'); li.innerHTML = `<span style="${c.arc?'text-decoration:line-through;color:#94a3b8;':''}">${c.id}</span><div style="display:flex;gap:0.4rem;"><button class="rename-class-btn btn secondary-btn small-btn">✏️ 修改名稱</button><button class="archive-btn btn small-btn">${c.arc?'解封存':'封存'}</button><button class="del-class-btn btn negative-btn small-btn">🗑️</button></div>`;
            li.querySelector('.rename-class-btn').onclick = () => {
                const newName = prompt('請輸入新的班級名稱：', c.id);
                const n = newName?.trim();
                if (n && n !== c.id) {
                    if (classes.some(x => x.id === n)) return alert('班級名稱已存在');
                    ['Stus','Gs','Ls','itm','set','meta'].forEach(suffix => {
                        const val = localStorage.getItem(`CD_${c.id}_${suffix}`);
                        if(val) { localStorage.setItem(`CD_${n}_${suffix}`, val); localStorage.removeItem(`CD_${c.id}_${suffix}`); }
                    });
                    if (currentClassId === c.id) { currentClassId = n; localStorage.setItem('CD_cCId', n); }
                    const oldId = c.id;
                    c.id = n; 
                    pushOp(10, { old: oldId, new: n }, true); // Action 10: Rename Class
                    saveData(); renderClassSelector();
                }
            };
            li.querySelector('.archive-btn').onclick = () => { 
                c.arc = !c.arc; 
                pushOp(11, { id: c.id, arc: c.arc }, true); // Action 11: Archive Class
                saveData(); renderClassSelector(); 
            };
            li.querySelector('.del-class-btn').onclick = () => { 
                if(confirm('刪除？')) { 
                    ['Stus','Gs','Ls','itm','cItm','tDef','set','Ops'].forEach(suffix => {
                        localStorage.removeItem(`CD_${c.id}_${suffix}`);
                    });
                    classes = classes.filter(x=>x.id!==c.id); 
                    if(currentClassId===c.id) { 
                        currentClassId=classes[0]?.id || ''; 
                        localStorage.setItem('CD_cCId', currentClassId); 
                        loadClassData();
                    }
                    pushOp(12, { id: c.id }, true); // Action 12: Delete Class
                    saveData(); 
                    renderClassSelector(); 
                    renderStudents();
                    renderPointItems();
                    if(currentView === 'groups') renderGroups();
                } 
            };
            l.appendChild(li);
        }); }
        const cs = document.getElementById('copyFromClassSelect'); if(cs) { cs.innerHTML = '<option value="">不複製 (空白)</option>'; classes.forEach(c => { const opt = document.createElement('option'); opt.value = c.id; opt.textContent = c.id; cs.appendChild(opt); }); }
        const sm = document.getElementById('syncFromClassSelect'); if(sm) { sm.innerHTML = '<option value="">請選擇來源班級...</option>'; classes.filter(c => c.id !== currentClassId).forEach(c => { const opt = document.createElement('option'); opt.value = c.id; opt.textContent = c.id; sm.appendChild(opt); }); }
    };

    // --- Sync Logic ---
    const getFullBackupData = (includeOps = false) => { 
        const b = {}; 
        // 取得有效班級清單，轉為 Set 方便比對
        const validClassIds = new Set(classes.map(c => c.id));
        
        for (let i = localStorage.length - 1; i >= 0; i--) { 
            const k = localStorage.key(i); 
            if (!k.startsWith('CD_')) continue;
            
            // 分析此 key 是否為班級專屬附屬資料，格式 CD_[ClassID]_[Suffix]
            const match = k.match(/^CD_(.+)_(Stus|Gs|Ls|itm|cItm|tDef|set|Ops|meta)$/);
            if (match) {
                const cid = match[1];
                if (!validClassIds.has(cid)) {
                    // 如果這筆資料不屬於任何現存的班級，代表是已被刪除的殭屍資料 (Zombie Data)
                    console.log(`[System] 清除殭屍資料: ${k}`);
                    localStorage.removeItem(k);
                    continue; // 已經清除了，直接跳過不加入備份
                }
            }

            // 雲端同步時排除特定的 Key 與 Ops，且根據使用者要求排除顯示設定 (_set) 確保跨裝置風格獨立
            const isCloudExclusion = (!includeOps && (k === 'BId' || k === 'Key' || k.endsWith('_Ops') || k.endsWith('_set')));
            if (!isCloudExclusion) { 
                try { b[k] = JSON.parse(localStorage.getItem(k)); } catch(e) { b[k] = localStorage.getItem(k); } 
            } 
        } 
        b.sVer = localSyncVersion; 
        return b; 
    };
    const restoreFromBackup = (data, reload = true) => {
        // 1. 先清理所有舊有的 CD_ 鍵，避免已被另一端刪除的班級資料變成殭屍 (Zombie data) 回捲
        // 但保留本機未同步的 Ops 紀錄
        for (let i = localStorage.length - 1; i >= 0; i--) {
            const k = localStorage.key(i);
            if (k.startsWith('CD_') && !k.endsWith('_Ops') && !k.endsWith('_set')) {
                localStorage.removeItem(k);
            }
        }

        // 2. 寫入從雲端來的最新資料
        Object.keys(data).forEach(k => { localStorage.setItem(k, typeof data[k] === 'string' ? data[k] : JSON.stringify(data[k])); });
        // 保護本地同步設定不被覆蓋
        localStorage.setItem('BId', cloudBinId); 
        localStorage.setItem('Key', cloudApiKey); 
        localStorage.setItem('aSyn', String(autoSyncInterval));
        if (reload) location.reload();
        else { 
            localSyncVersion = data.sVer || data.syncVersion || '000000';
            // sVer 已由 Object.keys loop 自動寫入 localStorage
            // 重要：重新載入全域班級變數，防止記憶體舊資料在 saveData 時覆蓋新雲端設定
            classes = safeLoad('CD_Cls', []);
            currentClassId = localStorage.getItem('CD_cCId');
            loadClassData(); 
            isDirty = 3; 
            applySettings(); 
            renderStudents(); 
            if(currentView === 'groups') renderGroups(); 
            renderPointItems(); 
            renderClassSelector(); 
            updateSyncStatus(); 
            console.log(`[System] 已還原版本 ${localSyncVersion}，且不重整頁面`);
        }
    };
    // Removed mergeLocalIntoCloud as we do full overwrites

    const performCloudUpload = async () => {
        if (!cloudBinId || !cloudApiKey) return;
        updateSyncStatus(); 
        try {
            const newVer = StampTool.encode();
            const oldVer = localSyncVersion;
            localSyncVersion = newVer; // 先更新，使壓縮資料內的 sVer 已是新版本
            console.log(`[CloudSync連線] 準備同步上傳新版本: ${fmtVer(newVer)}，本地舊版本: ${fmtVer(oldVer)}`);
            const toPush = getFullBackupData(false); // b.sVer 已是 newVer
            const compressed = await compressJSON(toPush);
            const isUpstash = cloudBinId.includes('upstash.io');
            const putUrl = isUpstash ? (cloudBinId.startsWith('http') ? `${cloudBinId}/SET/classKudox_backup` : cloudBinId) : (cloudBinId.startsWith('http') ? cloudBinId : `https://api.jsonbin.io/v3/b/${cloudBinId}`);
            const h = isUpstash ? {'Authorization':`Bearer ${cloudApiKey}`, 'Content-Type':'application/json'} : {'X-Access-Key':cloudApiKey, 'Content-Type':'application/json'};
            // 直接上傳壓縮字串，不再包者 {v, d}
            const resp = await fetch(putUrl, { method:'PUT', headers:h, body:JSON.stringify({ d: compressed }) });
            if (resp.ok) { 
                console.log(`[CloudSync] 同步成功 (版本: ${newVer}, 時間: ${new Date().toLocaleString()})`);
                localStorage.setItem('sVer', localSyncVersion);
                // 上傳成功 = 雲端已包含所有 Ops 效果，清空 Ops
                ops = [];
                sysOps = [];
                localStorage.setItem(`CD_${currentClassId}_Ops`, '[]');
                localStorage.setItem('CD_SysOps', '[]');
                console.log(`[CloudSync] Ops 已清空 (同步完成狀態)`);
                setDirty(3);
            } else {
                localSyncVersion = oldVer; // 上傳失敗恢復舊版本
                throw new Error('雲端寫入失敗');
            }
        } catch(e) { console.error('[CloudSync] 上傳錯誤:', e); setDirty(2); }
    };
    
    const performCloudDownload = async (manual = false) => {
        if (!cloudBinId || !cloudApiKey) return;
        isSyncing = true; setDirty(4); 
        try {
            const isUpstash = cloudBinId.includes('upstash.io'), h = isUpstash?{'Authorization':`Bearer ${cloudApiKey}`}:{'X-Access-Key':cloudApiKey};
            const url = isUpstash ? (cloudBinId.startsWith('http') ? `${cloudBinId}/GET/classKudox_backup` : cloudBinId) : (cloudBinId.startsWith('http') ? cloudBinId : `https://api.jsonbin.io/v3/b/${cloudBinId}/latest?t=${Date.now()}`);
            
            const resp = await fetch(url, { headers: h });
            if (resp.ok) {
                const r = await resp.json();
                const raw = isUpstash ? r.result : (r.record || r);
                const cloudData = await parseCloudData(raw);
                if (cloudData) {
                    restoreFromBackup(cloudData, true); // true 代表會 reload 頁面
                    if(manual) alert('從雲端下載並還原成功');
                } else {
                    throw new Error('解析雲端數據失敗');
                }
            } else {
                throw new Error('雲端讀取失敗');
            }
        } catch(e) { 
            console.error('[CloudSync] 下載錯誤:', e); 
            setDirty(2); 
            if(manual) alert('下載失敗: ' + e.message);
        } finally {
            isSyncing = false;
        }
    };

    const parseCloudData = async (raw) => {
        let data = null;
        try {
            if (typeof raw === 'string') {
                const tr = raw.trim();
                // 新格式：直接是壓縮字串
                if (tr.length > 50 && !tr.startsWith('{')) data = await decompressJSON(tr);
                else if (tr.startsWith('{')) {
                    const parsed = JSON.parse(tr);
                    // 舊格式相容：{v, d} 包裝
                    if (parsed.d && typeof parsed.d === 'string') data = await decompressJSON(parsed.d);
                    else data = parsed;
                }
            } else if (typeof raw === 'object' && raw !== null) {
                if (raw.d && typeof raw.d === 'string') data = await decompressJSON(raw.d);
                else data = raw;
            }
            if (data) {
                if (!data.sVer) data.sVer = data.v || data.syncVersion || '000000';
            }
        } catch(e) { console.error('[CloudSync] 解析失敗:', e); }
        return data;
    };

    const checkCloudSyncState = async () => {
        if (isSyncing || !cloudBinId || !cloudApiKey) return;
        isSyncing = true; setDirty(4); 

        console.log(`[CloudSync連線] Step 1 開始預檢及下載雲端版本...`);
        try {
            const isUpstash = cloudBinId.includes('upstash.io'), h = isUpstash?{'Authorization':`Bearer ${cloudApiKey}`}:{'X-Access-Key':cloudApiKey};
            const url = isUpstash ? (cloudBinId.startsWith('http') ? `${cloudBinId}/GET/classKudox_backup` : cloudBinId) : (cloudBinId.startsWith('http') ? cloudBinId : `https://api.jsonbin.io/v3/b/${cloudBinId}/latest?t=${Date.now()}`);
            
            const resp = await fetch(url, { headers: h });
            if (resp.ok) {
                const r = await resp.json();
                const raw = isUpstash ? r.result : (r.record || r);
                const cloudData = await parseCloudData(raw);
                if (!cloudData) throw new Error('解析雲端數據失敗');

                const cloudVer = cloudData.sVer || '000000';
                console.log(`[CloudSync] Step 1 取得雲端版本: ${fmtVer(cloudVer)}`);
                
                const vComp = localSyncVersion.localeCompare(cloudVer);
                let label = '一致';
                if (vComp < 0) label = '本地為舊';
                else if (vComp > 0) label = '本地較新';
                console.log(`[CloudSync] Step 2 本地版本: ${fmtVer(localSyncVersion)} (${label}), 雲端版本: ${fmtVer(cloudVer)}`);

                if (vComp < 0) {
                    console.log(`[CloudSync] Step 4 執行還原、清理重複 Ops 並重播...`);
                    const cL = cloudData[`CD_${currentClassId}_Ls`] || [];
                    const oldLen = ops.length;
                    const oldClassId = currentClassId;

                    // 把過濾過、需要重播的 ops 暫存起來，避免被 loadClassData 覆寫
                    let pendingOps = ops.filter(o => {
                        if (o.a === 1) return !cL.some(l => l.id === o.d.l); 
                        if (o.a === 2) return cL.some(l => l.id === o.d); // 如果雲端還有這筆 log，則代表在地端刪除後雲端還沒同步，需要重播刪除
                        return o.t >= cloudVer; 
                    });
                    
                    // 全域 ops 也要過濾
                    let pendingSysOps = sysOps.filter(o => o.t >= cloudVer);

                    if (pendingOps.length < ops.length) console.log(`[CloudSync] Step 4 清理重複或過期 Ops: ${ops.length} -> ${pendingOps.length}`);

                    restoreFromBackup(cloudData, false);
                    localSyncVersion = cloudVer; 
                    
                    if (currentClassId === oldClassId) {
                        ops = pendingOps; // 把剛剛過濾好的 ops 蓋回記憶體
                        if (pendingSysOps.length > 0 || ops.length > 0) {
                            console.log(`[CloudSync] Step 4 執行殘留 Ops 還原 (Sys: ${pendingSysOps.length}, Class: ${ops.length})...`);
                            let modified = false;

                            // 1. 先重播全域 Ops (班級結構)
                            pendingSysOps.forEach(o => {
                                if (o.a === 10) { // Rename Class
                                    const c = classes.find(x => x.id === o.d.old);
                                    if (c) c.id = o.d.new;
                                } else if (o.a === 11) { // Archive Class
                                    const c = classes.find(x => x.id === o.d.id);
                                    if (c) c.arc = o.d.arc;
                                } else if (o.a === 12) { // Delete Class
                                    classes = classes.filter(x => x.id !== o.d.id);
                                } else if (o.a === 13) { // Create Class
                                    if (!classes.some(x => x.id === o.d.id)) classes.push(o.d);
                                }
                                modified = true;
                            });

                            // 2. 再重播班級 Ops
                            ops.forEach(o => {
                                if (o.a === 1) { // 重新套用加扣點
                                    const sid = o.d.s;
                                    const s = students.find(x => x.id === sid);
                                    if (s) {
                                        if (o.d.is === 1 && !o.d.ti) s.iP = (s.iP || 0) + o.d.p;
                                        else if (!o.d.ti) s.cP = (s.cP || 0) + o.d.p;
                                        logs.push({ id: o.d.l, sID: sid, lb: o.d.lb, pt: o.d.p, TS: o.t, iSum: o.d.is === 1 ? 1 : undefined, trId: o.d.ti, trQty: o.d.tq });
                                        if (o.d.ti && o.d.tq) {
                                            if (!s.tr) s.tr = {};
                                            s.tr[o.d.ti] = (s.tr[o.d.ti] || 0) + o.d.tq;
                                        }
                                        modified = true;
                                    }
                                } else if (o.a === 2) { // 刪除紀錄
                                    const logIdx = logs.findIndex(l => l.id === o.d);
                                    if (logIdx > -1) {
                                        const l = logs[logIdx];
                                        const s = students.find(x => x.id === l.sID);
                                        if (s) {
                                            if (l.trId && l.trQty) {
                                                if (s.tr) s.tr[l.trId] = (s.tr[l.trId] || 0) - l.trQty;
                                            } else {
                                                if (l.iSum === 1) s.iP = (s.iP || 0) - l.pt;
                                                else s.cP = (s.cP || 0) - l.pt;
                                            }
                                        }
                                        logs.splice(logIdx, 1);
                                        modified = true;
                                    }
                                } else if (o.a === 3) { // 行為項目新增/修改
                                    const cat = o.d.c;
                                    const target = pointItems[cat];
                                    if (target) {
                                        const idx = target.findIndex(i => i.id === o.d.i.id);
                                        if (idx > -1) target[idx] = o.d.i;
                                        else target.push(o.d.i);
                                        modified = true;
                                    }
                                } else if (o.a === 4) { // 學生新增/修改
                                    const idx = students.findIndex(s => s.id === o.d.id);
                                    if (idx > -1) students[idx] = o.d;
                                    else students.push(o.d);
                                    modified = true;
                                } else if (o.a === 5) { // 行為項目刪除
                                    const cat = o.d.c;
                                    if (pointItems[cat]) {
                                        pointItems[cat] = pointItems[cat].filter(i => i.id !== o.d.id);
                                        modified = true;
                                    }
                                } else if (o.a === 6) { // 學生刪除
                                    students = students.filter(s => s.id !== o.d);
                                    logs = logs.filter(l => l.sID !== o.d);
                                    modified = true;
                                } else if (o.a === 7) { // 群組新增/修改
                                    const idx = groups.findIndex(g => g.id === o.d.id);
                                    if (idx > -1) groups[idx] = o.d;
                                    else groups.push(o.d);
                                    modified = true;
                                } else if (o.a === 8) { // 群組刪除
                                    groups = groups.filter(g => g.id !== o.d);
                                    modified = true;
                                } else if (o.a === 14) { // 寶物項目新增/修改
                                    const idx = treasureDefs.findIndex(i => i.id === o.d.id);
                                    if (idx > -1) treasureDefs[idx] = o.d;
                                    else treasureDefs.push(o.d);
                                    modified = true;
                                } else if (o.a === 15) { // 寶物項目刪除
                                    treasureDefs = treasureDefs.filter(i => i.id !== o.d);
                                    students.forEach(s => { if(s.tr) delete s.tr[o.d]; });
                                    modified = true;
                                }
                            });
                            
                            if (modified) {
                                sysOps = pendingSysOps;
                                saveData(); 
                                renderStudents();
                                if(currentView === 'groups') renderGroups();
                            } else {
                                sysOps = pendingSysOps;
                                localStorage.setItem('CD_SysOps', JSON.stringify(sysOps));
                                localStorage.setItem(`CD_${currentClassId}_Ops`, JSON.stringify(ops));
                            }
                        } else {
                            localStorage.setItem(`CD_${currentClassId}_Ops`, '[]');
                        }
                    } else if (pendingOps.length > 0) {
                        // 如果同步後目前班級不一樣了，純粹將這包殘留 Ops 原樣保存至原先班級
                        localStorage.setItem(`CD_${oldClassId}_Ops`, JSON.stringify(pendingOps));
                    }

                    await performCloudUpload();
                } else if (isDirty === 1 || isDirty === 4 || vComp > 0) {
                    console.log(`[CloudSync] Step 3 執行覆蓋同步上傳...`);
                    await performCloudUpload();
                } else {
                    setDirty(3); // 無變動且版本一致
                }
            } else throw new Error('預檢連線失敗');
        } catch (e) { 
            console.error("[CloudSync] 預檢報錯:", e); setDirty(2);
        } finally {
            isSyncing = false; 
        }
    };

    // --- Reports System ---
    const getReportsTimeRange = () => {
        const v = document.getElementById('timeRangeFilter')?.value || 'all'; if(v === 'all') return null;
        let s = new Date(), e = new Date(); s.setHours(0,0,0,0); e.setHours(23,59,59,999);
        if(v === 'today') return { start:s.getTime(), end:e.getTime() };
        if(v === 'week') { s.setDate(s.getDate() - (s.getDay()||7) + 1); e.setDate(s.getDate() + 6); return { start:s.getTime(), end:e.getTime() }; }
        if(v === 'month') { s.setDate(1); e.setMonth(e.getMonth()+1); e.setDate(0); return { start:s.getTime(), end:e.getTime() }; }
        if(v === 'custom') { const sval = document.getElementById('startDateFilter')?.value, evalStr = document.getElementById('endDateFilter')?.value; if(sval && evalStr) return { start:new Date(sval).getTime(), end:new Date(evalStr).getTime() }; }
        return null;
    };

    const renderPieChart = (logs) => {
        const pie = document.getElementById('reportPieChart'), legend = document.getElementById('reportPieLegend'); if(!pie || !legend) return; pie.innerHTML = ''; legend.innerHTML = ''; if(!logs.length) { pie.style.background = '#e2e8f0'; return; }
        const stats = {}; let total = 0; logs.forEach(l => { stats[l.lb] = (stats[l.lb] || 0) + 1; total++; });
        const labels = Object.keys(stats).sort((a,b)=>stats[b]-stats[a]); const colors = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#06b6d4', '#8b5cf6'];
        let cum = 0, parts = []; labels.forEach((l, i) => { const p = (stats[l]/total)*100; const c = colors[i % colors.length]; parts.push(`${c} ${cum}% ${cum+p}%`); cum += p; legend.innerHTML += `<div class="legend-item"><div class="legend-color" style="background:${c}"></div><span>${l}: ${stats[l]}</span></div>`; });
        pie.style.background = `conic-gradient(${parts.join(', ')})`;
    };

    window.scrollToReportLogs = () => {
        const el = document.getElementById('reportActivityTitle');
        if(el) el.scrollIntoView({ behavior: 'smooth' });
    };

    window.renderReports = () => {
        if (currentReportView === 'treasure') return renderTreasureReports();
        const list = document.getElementById('reportsList'); if(!list) return; list.innerHTML = '';
        const range = getReportsTimeRange();
        let data = students.map(s => {
            let pts = logs.filter(l => l.sID === s.id).reduce((sum, l) => {
                const ts = (typeof l.TS === 'number') ? l.TS : StampTool.decode(l.TS).getTime();
                if (range && (ts < range.start || ts > range.end)) return sum;
                return sum + (l.iSum === 1 ? 0 : l.pt);
            }, 0);
            return { ...s, pts };
        });
        if (currentSort === 'name') data.sort((a,b) => a.id.localeCompare(b.id, 'zh-TW')); else data.sort((a,b) => b.pts - a.pts);
        data.forEach((s, idx) => {
            const li = document.createElement('li'); li.className = 'report-item' + (currentProfileId === s.id ? ' active' : '');
            li.onclick = () => { 
                currentProfileId = s.id; 
                document.getElementById('resetReportFilterBtn')?.classList.remove('hidden');
                document.getElementById('reportActivityTitle').textContent = s.id + ' 的紀錄'; 
                window.renderReports(); 
                window.scrollToReportLogs();
            };
            li.innerHTML = `<div class="report-item-left"><span class="report-rank">#${idx+1}</span><img src="${getAvatarUrl(s.aU||s.id, s.aS)}" class="report-avatar"><span class="report-name">${s.id}</span></div><div class="report-item-right ${s.pts > 0 ? 'positive-val' : 'negative-val'}">${s.pts > 0 ? '+' : ''}${s.pts}</div>`;
            list.appendChild(li);
        });
        const alist = document.getElementById('reportActivityList'); if(alist) {
            alist.innerHTML = '';
            let f = logs.filter(log => { 
                const ts = (typeof log.TS === 'number') ? log.TS : StampTool.decode(log.TS).getTime();
                if(range && (ts < range.start || ts > range.end)) return false; 
                if(currentProfileId && log.sID !== currentProfileId) return false; 
                return true; 
            }).sort((a,b) => {
                if (typeof a.TS === 'number' && typeof b.TS === 'number') return b.TS - a.TS;
                const sa = String(a.TS), sb = String(b.TS);
                if (sa.length === sb.length) return sb.localeCompare(sa);
                return sb.length - sa.length;
            });
            f.slice(0,50).forEach(log => {
                const s = students.find(x => x.id === log.sID);
                const d = (typeof log.TS === 'number') ? new Date(log.TS) : StampTool.decode(log.TS);
                const isTreasure = !!log.trId;
                const rightContent = isTreasure ? `<button class="delete-log-btn" onclick="window.deleteLog('${log.id}')">🗑️</button>` : `${log.pt > 0 ? '+' : ''}${log.pt}<button class="delete-log-btn" onclick="window.deleteLog('${log.id}')">🗑️</button>`;
                const li = document.createElement('li'); li.innerHTML = `<div class="history-item-left"><span class="history-date">${d.toLocaleString()} • ${s?s.id:'未知'}</span><span class="history-label">${log.lb}${log.iSum === 1 && !isTreasure ? '<small>(不列排)</small>' : ''}</span></div><div class="history-item-right ${isTreasure ? '' : (log.pt > 0 ? 'positive-val' : 'negative-val')}">${rightContent}</div>`;
                alist.appendChild(li);
            });
            renderPieChart(f);
        }
    };

    // --- 寶物報表 ---
    const renderTreasureReports = () => {
        const list = document.getElementById('reportsList'); if(!list) return; list.innerHTML = '';
        if (!treasureDefs.length) {
            list.innerHTML = '<li style="text-align:center; color:var(--text-secondary); padding:2rem;">尚未定義寶物。</li>';
            return;
        }
        let data = students.map(s => {
            const totalTr = treasureDefs.reduce((sum, td) => sum + ((s.tr && s.tr[td.id]) || 0), 0);
            return { ...s, totalTr };
        });
        if (currentSort === 'name') data.sort((a,b) => a.id.localeCompare(b.id, 'zh-TW')); else data.sort((a,b) => b.totalTr - a.totalTr);
        data.forEach((s, idx) => {
            const li = document.createElement('li'); li.className = 'report-item' + (currentProfileId === s.id ? ' active' : '');
            li.onclick = () => { 
                currentProfileId = s.id; 
                document.getElementById('resetReportFilterBtn')?.classList.remove('hidden');
                document.getElementById('reportActivityTitle').textContent = s.id + ' 的寶物'; 
                window.renderReports(); 
                window.scrollToReportLogs();
            };
            // 顯示每種寶物數量
            let trDetail = treasureDefs.map(td => {
                const qty = (s.tr && s.tr[td.id]) || 0;
                return qty !== 0 ? `${td.ic}${qty}` : '';
            }).filter(Boolean).join(' ');
            if (!trDetail) trDetail = '<span style="color:var(--text-secondary);font-size:0.85em;">無寶物</span>';
            li.innerHTML = `<div class="report-item-left"><span class="report-rank">#${idx+1}</span><img src="${getAvatarUrl(s.aU||s.id, s.aS)}" class="report-avatar"><span class="report-name">${s.id}</span></div><div class="report-item-right" style="font-size:0.9em;">${trDetail}</div>`;
            list.appendChild(li);
        });
        // 右側顯示寶物紀錄
        const alist = document.getElementById('reportActivityList'); if(alist) {
            alist.innerHTML = '';
            const range = getReportsTimeRange();
            let f = logs.filter(log => {
                if (!log.trId) return false; // 只顯示寶物相關紀錄
                const ts = (typeof log.TS === 'number') ? log.TS : StampTool.decode(log.TS).getTime();
                if(range && (ts < range.start || ts > range.end)) return false;
                if(currentProfileId && log.sID !== currentProfileId) return false;
                return true;
            }).sort((a,b) => {
                const sa = String(a.TS), sb = String(b.TS);
                if (sa.length !== sb.length) return sb.length - sa.length;
                return sa > sb ? -1 : (sa < sb ? 1 : 0);
            });
            f.slice(0,50).forEach(log => {
                const s = students.find(x => x.id === log.sID);
                const d = (typeof log.TS === 'number') ? new Date(log.TS) : StampTool.decode(log.TS);
                // 這裡不用再手動串 qtyText 了，因為 log.lb 就已經包含了
                const li = document.createElement('li'); li.innerHTML = `<div class="history-item-left"><span class="history-date">${d.toLocaleString()} • ${s?s.id:'未知'}</span><span class="history-label">${log.lb}</span></div><div class="history-item-right"><button class="delete-log-btn" onclick="window.deleteLog('${log.id}')">🗑️</button></div>`;
                alist.appendChild(li);
            });
            // 寶物模式下不畫圓餅圖
            const pie = document.getElementById('reportPieChart'); if(pie) pie.style.background = '#e2e8f0';
            const legend = document.getElementById('reportPieLegend'); if(legend) legend.innerHTML = '';
        }
    };
    
    const showClassSummary = () => {
        const content = document.getElementById('classSummaryContent'); if(!content) return;
        content.innerHTML = '';
        
        // 使用與報表相同的時間範圍邏輯計算點數
        const range = getReportsTimeRange();
        let data = students.map(s => {
            let pts = logs.filter(l => l.sID === s.id).reduce((sum, l) => {
                const ts = (typeof l.TS === 'number') ? l.TS : StampTool.decode(l.TS).getTime();
                if (range && (ts < range.start || ts > range.end)) return sum;
                return sum + (l.iSum === 1 ? 0 : l.pt);
            }, 0);
            return { ...s, pts };
        });
        
        // 使用目前報表的排序方式 (姓名或點數)
        if (currentSort === 'name') {
            data.sort((a,b) => a.id.localeCompare(b.id, 'zh-TW'));
        } else {
            data.sort((a,b) => b.pts - a.pts);
        }
        
        data.forEach((s, idx) => {
            const box = document.createElement('div');
            box.className = 'summary-box';
            box.onclick = () => openStudentSummaryDetail(s.id);
            
            const isNeg = s.pts < 0;
            const ptsText = s.pts > 0 ? `+${s.pts}` : s.pts;
            box.innerHTML = `
                <div class="summary-seq">${idx + 1}</div>
                <div class="summary-name">${s.id}</div>
                <div class="summary-points ${isNeg ? 'negative' : ''}">${ptsText}</div>
            `;
            content.appendChild(box);
        });
        
        openModal(document.getElementById('classSummaryModal'));
    };

    // Feature 2: Aggregated student summary detail within time range
    const openStudentSummaryDetail = (id) => {
        const range = getReportsTimeRange();
        const studentLogs = logs.filter(l => {
            if (l.sID !== id) return false;
            if (l.iSum === 1) return false;
            const ts = typeof l.TS === 'number' ? l.TS : StampTool.decode(l.TS).getTime();
            if (range && (ts < range.start || ts > range.end)) return false;
            return true;
        });
        const agg = {};
        studentLogs.forEach(l => { agg[l.lb] = (agg[l.lb] || 0) + l.pt; });
        
        const grid = document.getElementById('summaryDetailGrid');
        const titleEl = document.getElementById('summaryDetailStudentName');
        const totalEl = document.getElementById('summaryDetailTotal');
        if (!grid || !titleEl || !totalEl) return;
        
        titleEl.textContent = id + ' \u7684\u9ede\u6578\u6458\u8981';
        
        const total = Object.values(agg).reduce((s, v) => s + v, 0);
        totalEl.textContent = total > 0 ? `\u7e3d\u8a08\uff1a+${total}` : `\u7e3d\u8a08\uff1a${total}`;
        totalEl.style.color = total > 0 ? 'var(--positive-color)' : (total < 0 ? 'var(--negative-color)' : 'var(--text-secondary)');
        
        grid.innerHTML = '';
        const entries = Object.entries(agg).sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]));
        if (!entries.length) {
            grid.innerHTML = `<p style="grid-column:1/-1; text-align:center; color:var(--text-secondary); padding:1rem;">\u6b64\u6642\u9593\u7bc4\u570d\u5167\u7121\u9ede\u6578\u8a18\u9304</p>`;
        } else {
            entries.forEach(([lb, pts]) => {
                const card = document.createElement('div');
                card.className = `summary-detail-card ${pts > 0 ? 'positive' : 'negative'}`;
                card.innerHTML = `<div class="detail-label">${lb}</div><div class="detail-pts">${pts > 0 ? '+' : ''}${pts}</div>`;
                grid.appendChild(card);
            });
        }
        openModal(document.getElementById('classSummaryStudentDetailModal'));
    };

    // Removed migrateToNameIds()

    const performLogRetention = () => {
        if (!settings || !settings.logRetention) return;
        const retMonths = parseInt(settings.logRetention);
        if (retMonths === 0) return;
        const threshold = Date.now() - retMonths * 30 * 24 * 60 * 60 * 1000;
        let dirty = false;
        classes.forEach(c => {
            const lKey = `CD_${c.id}_Ls`, sKey = `CD_${c.id}_Stus`;
            let cLogs = JSON.parse(localStorage.getItem(lKey) || '[]');
            if (cLogs.length === 0) return;
            let cStudents = JSON.parse(localStorage.getItem(sKey) || '[]');
            const oLen = cLogs.length; cLogs = cLogs.filter(l => {
                const ts = (typeof l.TS === 'number') ? l.TS : StampTool.decode(l.TS).getTime();
                return ts >= threshold;
            });
            // 刪除大於 7 天的 Ops
            let cOps = JSON.parse(localStorage.getItem(oKey) || '[]');
            const sevenDaysHex = StampTool.encode(Date.now() - 7 * 24 * 60 * 60 * 1000);
            cOps = cOps.filter(o => o.t >= sevenDaysHex);
            localStorage.setItem(oKey, JSON.stringify(cOps));

            if (cLogs.length !== oLen) {
                localStorage.setItem(lKey, JSON.stringify(cLogs));
                if (c.id === currentClassId) { logs = cLogs; } 
                dirty = true;
            }
        });
        if (dirty) {
            if (cloudBinId && cloudApiKey) { isDirty = 1; localStorage.setItem('drty', '1'); updateSyncStatus(); performCloudUpload(); }
            console.log('[System] 完成過期紀錄清理與瘦身');
        }
        // 清理超過 7 天的防僵屍 Ops
        const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
        const oLen = ops.length;
        ops = ops.filter(o => o.t > sevenDaysAgo);
        if (ops.length !== oLen) { saveData(true); console.log(`[System] 已清理 ${oLen - ops.length} 筆過期 Ops`); }
    };

    const sanitizeAndCleanDatabase = () => {
        let dirtySystem = false;
        const K_MAP = {
            'cdData_classes': 'CD_Cls',
            'cdData_currentClassId': 'CD_cCId',
            'cdData_cloudBinId': 'BId',
            'cdData_cloudApiKey': 'Key',
            'cdData_autoSyncInterval': 'aSyn',
            'cdData_syncVersion': 'sVer',
            'cdData_isDirty': 'drty'
        };
        const S_STYLE_MAP = { 'fun-emoji':'fe', 'bottts':'bot', 'avataaars':'ava', 'adventurer':'adv', 'lorelei':'lor' };
        const FT_MAP = { 'small':'S', 'medium':'M', 'large':'L' };

        const extractSeed = (url) => {
            if (!url || !url.startsWith('http')) return url;
            try {
                const u = new URL(url);
                return u.searchParams.get('seed') || url;
            } catch(e) { return url; }
        };

        // 1. Migrate Global Keys (已移至開頭，此處保留以防萬一或用於深層屬性清理)
        for (const [oldK, newK] of Object.entries(K_MAP)) {
            const val = localStorage.getItem(oldK);
            if (val !== null) {
                localStorage.setItem(newK, val);
                localStorage.removeItem(oldK);
                dirtySystem = true;
            }
        }


        // 2. Migrate Class-specific Keys
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
                        ftS: FT_MAP[data.ftS || data.fontSize] || data.ftS || data.fontSize || 'M',
                        col: Number(data.col !== undefined ? data.col : (data.columns || 10)),
                        gCol: Number(data.gCol !== undefined ? data.gCol : (data.groupColumns || 5)),
                        iCol: Number(data.iCol !== undefined ? data.iCol : (data.itemColumns || 5)),
                        eS: (data.eS !== undefined ? (data.eS ? 1 : 0) : (data.enableSound ? 1 : 0)),
                        sCH: Number(data.sCH !== undefined ? data.sCH : (data.studentCardHeight || 0)),
                        gCH: Number(data.gCH !== undefined ? data.gCH : (data.groupCardHeight || 0)),
                        lRet: Number(data.lRet !== undefined ? data.lRet : (data.logRetention || 0))
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

        // 3. Final cleanup of any lingering cdData_
        Object.keys(localStorage).forEach(k => {
            if (k.startsWith('cdData_')) {
                localStorage.removeItem(k);
                dirtySystem = true;
            }
        });

        if (dirtySystem) {
            console.log('[System] 全面精簡化完成，所有 Key 已轉移至 CD_ 前綴');
            if (cloudBinId && cloudApiKey) {
                isDirty = 1; localStorage.setItem('drty', '1');
                updateSyncStatus();
            }
        }
    };

    // --- Boot & Event Wiring ---
    const bootSequence = async () => {
        const wire = (id, fn) => { const el = document.getElementById(id); if(el) el.onclick = fn; };
        
        // --- 第一階段：優先綁定 UI 事件 ---
        // 確保系統設定與基本彈窗按鈕優先工作，即使資料讀取報錯，使用者仍能開啟設定重置
        wire('settingsBtn', () => { 
            try {
                const sz = document.getElementById('jsonSizeEst'); 
                if(sz) sz.textContent = `(約 ${(JSON.stringify(getFullBackupData(false)).length / 1024).toFixed(1)} KB)`; 
            } catch(e) {}
            openModal(document.getElementById('settingsModal')); applySettings(); renderPointItems(); 
        });
        wire('manageClassesBtn', () => { renderClassSelector(); openModal(document.getElementById('manageClassesModal')); });
        wire('reportsBtn', () => { 
            currentProfileId = null; 
            const filter = document.getElementById('timeRangeFilter');
            if(filter) filter.value = 'today'; // 預設今天
            window.renderReports(); 
            openModal(document.getElementById('reportsModal')); 
        });
        wire('resetReportFilterBtn', () => { currentProfileId = null; document.getElementById('resetReportFilterBtn')?.classList.add('hidden'); document.getElementById('reportActivityTitle').textContent = '全班最近紀錄'; window.renderReports(); });
        wire('undoActionBtn', undoAction);
        wire('toggleMultiSelectBtn', toggleMultiSelectMode);
        wire('addStudentBtn', () => openModal(document.getElementById('addStudentModal')));
        
        document.querySelectorAll('.view-tab-btn').forEach(b => b.onclick = () => switchMainView(b.dataset.view));
        document.querySelectorAll('.close-modal-btn, .cancel-btn, .settings-close, .profile-close, .add-close, .edit-student-close, .classes-close, .group-close, .group-detail-close, .reports-close, .summary-close').forEach(b => b.onclick = () => closeModal(b.closest('.modal-overlay')));
        wire('rankingTitle', showClassSummary);
        
        wire('cancelMultiBtn', toggleMultiSelectMode);
        wire('selectAllBtn', () => { if(selectedStudentIds.size === students.length) selectedStudentIds.clear(); else students.forEach(s => selectedStudentIds.add(s.id)); document.getElementById('multiSelectCount').textContent = `已選擇 ${selectedStudentIds.size} 位學生`; renderStudents(); });
        wire('multiAwardBtn', () => { if(!selectedStudentIds.size) return alert('請選擇學生'); openAwardModal(selectedStudentIds.toArray(), `已選 ${selectedStudentIds.size} 位`, null); });
        
        const wireSlider = (id, labelId, sk) => { const el = document.getElementById(id); if(el) el.oninput = (e) => { settings[sk] = parseInt(e.target.value); document.getElementById(labelId).textContent = e.target.value; applySettings(); saveData(); }; };
        wireSlider('gridColsRange', 'gridColsLabel', 'col'); wireSlider('cardHeightRange', 'cardHeightLabel', 'sCH'); wireSlider('groupHeightRange', 'groupHeightLabel', 'gCH'); wireSlider('groupColsRange', 'groupColsLabel', 'gCol'); wireSlider('itemColsRange', 'itemColsLabel', 'iCol');
        wireSlider('avatarSizeRange', 'avatarSizeLabel', 'avS');
        
        const fsSel = document.getElementById('fontSizeSelect'); if(fsSel) fsSel.onchange = (e) => { settings.ftS = e.target.value; applySettings(); saveData(); };
        const sSel = document.getElementById('enableSoundSetting'); if(sSel) sSel.onchange = (e) => { settings.eS = e.target.checked ? 1 : 0; saveData(); };
        const saSel = document.getElementById('showAvatarSetting'); if(saSel) saSel.onchange = (e) => { settings.sAv = e.target.checked ? 1 : 0; applySettings(); saveData(); };
        const retSel = document.getElementById('logRetentionSetting'); if(retSel) retSel.onchange = (e) => { settings.lRet = parseInt(e.target.value); applySettings(); saveData(); performLogRetention(); };

        // Save Custom Award state whenever it changes
        const saveCustState = () => {
            const v = document.getElementById('customAwardValue');
            const ign = document.getElementById('customAwardIgnore');
            const sel = document.getElementById('customAwardLabel');
            const temp = document.getElementById('customAwardTempName');
            localStorage.setItem('CD_CustomTemp', JSON.stringify({ v: v?v.value:-10, ign: ign?ign.checked:true, l: sel?sel.value:'兌換點數', temp: temp?temp.value:'' }));
        };
        ['customAwardValue','customAwardIgnore','customAwardLabel','customAwardTempName'].forEach(id => {
            const el = document.getElementById(id); 
            if (el) el.addEventListener('change', saveCustState);
            if (el && (el.tagName === 'INPUT')) el.addEventListener('input', saveCustState);
        });

        // --- 第二階段：資料載入與渲染 ---
        try {
            console.log('[System] 啟動資料載入與渲染流程...');
            sanitizeAndCleanDatabase();
            loadClassData(); 
            applySettings(); 
            renderStudents(); 
            renderPointItems(); 
            renderClassSelector();
            
            // 定時器與啟動預檢由 startSyncTimer 統一管理，此處不重複呼叫
            performLogRetention();
        } catch (err) {
            console.error('[Critical Error] 系統載入失敗，但 UI 功能已嘗試載入:', err);
            alert('系統載入資料時發生錯誤，您可在「系統設定」->「危險區域」中嘗試重設系統。');
        }

        wire('editProfileBtn', () => { const s = students.find(x => x.id === currentProfileId); if(!s) return; document.getElementById('editStudentName').value = s.id; document.getElementById('editStudentAvatarStyle').value = s.aS || 'fe'; document.getElementById('editStudentAvatarPreview').src = getAvatarUrl(s.aU || s.id, s.aS); closeModal(document.getElementById('studentProfileModal')); openModal(document.getElementById('editStudentModal')); });
        
        wire('applyClassAvatarBtn', () => { 
            const style = document.getElementById('classAvatarStyle').value;
            if(confirm('確定要將全班學生的頭像風格都換成這個嗎？')) {
                students.forEach(s => {
                    s.aS = style;
                    pushOp(4, s); // Sync each updated student 
                });
                saveData(); renderStudents(); alert('全班頭像已更新！');
            }
        });

        wire('saveEditStudentBtn', () => { 
            const nameInp = document.getElementById('editStudentName'); const s = students.find(x => x.id === currentProfileId);
            if(s && nameInp.value.trim()) { 
                const newName = nameInp.value.trim();
                const newStyle = document.getElementById('editStudentAvatarStyle').value;
                if(newName !== s.id && students.some(x => x.id === newName)) return alert('姓名已存在');
                if(newName !== s.id) {
                    logs.filter(l => l.sID === s.id).forEach(l => l.sID = newName);
                    groups.forEach(g => { const idx = g.sIds.indexOf(s.id); if(idx>-1) g.sIds[idx] = newName; });
                    if(currentProfileId === s.id) currentProfileId = newName;
                    if(selectedStudentIds.has(s.id)) { selectedStudentIds.delete(s.id); selectedStudentIds.add(newName); }
                    s.id = newName;
                }
                s.aS = newStyle; 
                pushOp(4, s); // Action 4: Update Student
                saveData(); renderStudents(); closeModal(document.getElementById('editStudentModal')); 
            } else if(!nameInp.value.trim()) alert('請輸入姓名');
        });
        wire('deleteStudentBtn', () => { if(confirm('刪除？')) { 
            pushOp(6, currentProfileId); // Action 6: Delete Student
            students = students.filter(x => x.id !== currentProfileId); logs = logs.filter(x => x.sID !== currentProfileId); saveData(); renderStudents(); closeModal(document.getElementById('editStudentModal')); 
        } });
        wire('saveStudentBtn', () => { 
            const i = document.getElementById('newStudentName'); if(!i.value.trim()) return; 
            i.value.split('\n').forEach(n => { 
                const name = n.trim(); if(name) {
                    if(students.some(s => s.id === name)) { console.warn('跳過重複姓名:', name); return; }
                    const newStu = { id: name, cP: 0, iP: 0, aS: 'fe', aU: getRandomSeed(), tr: {} };
                    students.push(newStu);
                    pushOp(4, newStu); // Action 4: Add Student 
                }
            }); 
            saveData(); renderStudents(); i.value = ''; closeModal(document.getElementById('addStudentModal')); 
        });
        
        wire('saveGroupBtn', () => { 
            const i = document.getElementById('groupNameInput'); const name = i.value.trim(); if(!name) return alert('請輸入名稱'); 
            const sids = Array.from(document.querySelectorAll('#groupStudentSelectionGrid input:checked')).map(cb => cb.value); 
            if(!sids.length) return alert('請選擇成員'); 
            let g;
            if(editingGroupId) { 
                if(editingGroupId !== name && groups.some(x=>x.id===name)) return alert('群組名稱已存在'); 
                g = groups.find(x=>x.id===editingGroupId); g.id = name; g.sIds = sids; 
            } else { 
                if(groups.some(x=>x.id===name)) return alert('群組名稱已存在'); 
                g = { id: name, sIds: sids };
                groups.push(g); 
            } 
            pushOp(7, g); // Action 7: Add/Update Group
            saveData(); renderGroups(); closeModal(document.getElementById('manageGroupModal')); 
        });
        wire('deleteGroupBtn', () => { if(confirm('刪除群組？')) { 
            pushOp(8, editingGroupId); // Action 8: Delete Group
            groups = groups.filter(x => x.id !== editingGroupId); saveData(); renderGroups(); closeModal(document.getElementById('manageGroupModal')); 
        } });
        wire('groupAwardPointsBtn', () => { 
            if(!awardContextIds.length) return; 
            openAwardModal(awardContextIds, document.getElementById('groupDetailTitle').textContent, currentGroupIdForAward); 
            closeModal(document.getElementById('groupDetailModal')); 
        });
        wire('editGroupDetailBtn', () => { const g = groups.find(x => x.sIds.every(sid => awardContextIds.includes(sid)) && x.sIds.length === awardContextIds.length); if(g) openManageGroupModal(g.id); closeModal(document.getElementById('groupDetailModal')); });

        wire('saveCustomAwardBtn', () => { 
            const sel = document.getElementById('customAwardLabel'); 
            const tempInp = document.getElementById('customAwardTempName');
            let l = sel ? sel.value : '自訂項目'; 
            if (tempInp && tempInp.value.trim()) {
                l = tempInp.value.trim();
                if (!customItems.includes(l)) {
                    customItems.push(l);
                    saveData();
                    if (typeof renderCustomDropdown === 'function') renderCustomDropdown();
                }
                tempInp.value = '';
            }
            const v = parseInt(document.getElementById('customAwardValue').value) || 0; 
            const ign = document.getElementById('customAwardIgnore').checked; 
            awardPoints('custom', l, v, ign); 
        });
        
        document.querySelectorAll('.tab-btn').forEach(b => b.onclick = () => switchProfileTab(b.dataset.profileTab));
        document.querySelectorAll('.sub-tab-btn').forEach(b => b.onclick = () => switchAwardTab(b.dataset.awardTab));
        document.querySelectorAll('.settings-tab-btn').forEach(b => b.onclick = () => { 
            document.querySelectorAll('.settings-tab-btn').forEach(x => x.classList.remove('active')); 
            b.classList.add('active'); 
            document.querySelectorAll('.settings-tab-content').forEach(x => x.classList.remove('active')); 
            const target = 'settings' + b.dataset.settingsTab.charAt(0).toUpperCase() + b.dataset.settingsTab.slice(1) + 'Tab';
            const el = document.getElementById(target); if(el) el.classList.add('active');
            if (b.dataset.settingsTab === 'custom') loadCustomTextarea();
        });
        document.querySelectorAll('.sort-btn').forEach(b => b.onclick = () => { currentSort = b.dataset.sort; document.querySelectorAll('.sort-btn').forEach(x => x.classList.remove('active')); b.classList.add('active'); window.renderReports(); });
        document.querySelectorAll('.report-view-btn').forEach(b => b.onclick = () => { currentReportView = b.dataset.reportView; document.querySelectorAll('.report-view-btn').forEach(x => x.classList.remove('active')); b.classList.add('active'); window.renderReports(); });
        
        // --- 自訂項目儲存 ---
        wire('saveCustomItemsBtn', () => { 
            const ta = document.getElementById('customItemsTextarea'); if(!ta) return;
            customItems = ta.value.split('\n').map(s => s.trim()).filter(Boolean);
            saveData(); renderPointItems(); alert('已儲存自訂項目');
        });

        // --- 寶物新增 ---
        wire('addTreasureBtn', () => { 
            const l = document.getElementById('newTreasureLabel'); const i = document.getElementById('newTreasureIconBtn'); if(!l.value.trim()) return; 
            const itemId = Math.random().toString(36).substring(2, 8);
            const item = { id: itemId, lb: l.value.trim(), ic: i.textContent };
            treasureDefs.push(item); 
            pushOp(14, item); // Action 14: Add/Update Treasure Definition
            saveData(); renderPointItems(); l.value = ''; 
        });

        wire('addPositiveBtn', () => { 
            const l = document.getElementById('newPositiveLabel'); const v = document.getElementById('newPositiveValue'); const i = document.getElementById('newPositiveIconBtn'); const ign = document.getElementById('newPositiveIgnore'); if(!l.value.trim()) return; 
            let val = isNaN(parseInt(v.value)) ? 1 : parseInt(v.value);
            if (val < 0) val = 0;
            if (pointItems.pos.some(x => x.lb === l.value.trim() && x.vl === val)) return alert('項目名稱與數數已存在，請勿重複新增');
            const itemId = Math.random().toString(36).substring(2, 8);
            const item = { id: itemId, lb: l.value.trim(), vl: val, ic: i.textContent };
            if (ign.checked) item.iSum = 1;
            pointItems.pos.push(item); 
            pushOp(3, { c: 'pos', i: item });
            saveData(); renderPointItems(); l.value = ''; v.value = '1'; 
        });
        wire('addNeedsWorkBtn', () => { 
            const l = document.getElementById('newNeedsWorkLabel'); const v = document.getElementById('newNeedsWorkValue'); const i = document.getElementById('newNeedsWorkIconBtn'); const ign = document.getElementById('newNeedsWorkIgnore'); if(!l.value.trim()) return; 
            let val = isNaN(parseInt(v.value)) ? -1 : parseInt(v.value);
            if (val > 0) val = 0;
            if (pointItems.neg.some(x => x.lb === l.value.trim() && x.vl === val)) return alert('項目名稱與數數已存在，請勿重複新增');
            const itemId = Math.random().toString(36).substring(2, 8);
            const item = { id: itemId, lb: l.value.trim(), vl: val, ic: i.textContent };
            if (ign.checked) item.iSum = 1;
            pointItems.neg.push(item); 
            pushOp(3, { c: 'neg', i: item });
            saveData(); renderPointItems(); l.value = ''; v.value = '-1'; 
        });
        
        wire('saveEditItemBtn', () => {
            if(!editingPointItemId || !editingPointItemCat) return;
            const l = document.getElementById('editItemLabel').value.trim();
            const ic = document.getElementById('editItemIconBtn').textContent;
            
            if (editingPointItemCat === 'treasure') {
                const item = treasureDefs.find(i => i.id === editingPointItemId);
                if (item) {
                    item.lb = l; item.ic = ic;
                    pushOp(14, item); // Action 14: Add/Update Treasure Definition
                    saveData(); renderPointItems(); 
                    if (!document.getElementById('studentDetailModal').classList.contains('hidden')) {
                         if (typeof renderStudentTreasures === 'function') renderStudentTreasures();
                    }
                    closeModal(document.getElementById('editPointItemModal'));
                }
            } else {
                const v = parseInt(document.getElementById('editItemValue').value) || 0;
                const item = pointItems[editingPointItemCat].find(i => i.id === editingPointItemId);
                if(item) {
                    item.lb = l; item.vl = v; item.ic = ic;
                    if(document.getElementById('editItemIgnore').checked) item.iSum = 1; else delete item.iSum;
                    pushOp(3, { c: editingPointItemCat, i: item });
                    saveData(); renderPointItems(); closeModal(document.getElementById('editPointItemModal'));
                }
            }
        });

        wire('createClassBtn', () => { 
            const nInp = document.getElementById('newClassName');
            const n = nInp.value.trim(); if(!n) return; 
            if(classes.some(c => c.id === n)) return alert('班級名稱已存在');
            
            // 預設為系統預設項目 (而非純空白)
            let items = JSON.parse(JSON.stringify(defaultItems));
            let s = [], g = [];
            
            const src = document.getElementById('copyFromClassSelect').value; 
            const copyItems = document.getElementById('copyItemsCheckbox').checked;
            const copyStudents = document.getElementById('copyStudentsCheckbox').checked;

            if (src) { 
                console.log(`[System] 建立新班級 "${n}"，來源班級: "${src}"`);
                if (copyItems) {
                    const siValue = localStorage.getItem(`CD_${src}_itm`);
                    const si = siValue ? JSON.parse(siValue) : null;
                    if (si) {
                        items.pos = (si.pos||[]).sort((a,b)=>a.lb.localeCompare(b.lb, 'zh-TW')).map(x => ({...x, id: Math.random().toString(36).substring(2, 8)}));
                        items.neg = (si.neg||[]).sort((a,b)=>a.lb.localeCompare(b.lb, 'zh-TW')).map(x => ({...x, id: Math.random().toString(36).substring(2, 8)}));
                        console.log(`[System] 已複製行為項目: 優點 ${items.pos.length}, 待改進 ${items.neg.length}`);
                    }
                }
                // 如果 src 存在但 copyItems 為 false，則保持 items 為原本初始化的 defaultItems
                
                if (copyStudents) { 
                    const oldS = JSON.parse(localStorage.getItem(`CD_${src}_Stus`) || '[]'); 
                    s = oldS.map(x => ({ 
                        id: x.id, cP: 0, iP: 0, aS: 'fe', 
                        aU: getRandomSeed() 
                    })); 
                    g = JSON.parse(localStorage.getItem(`CD_${src}_Gs`) || '[]'); 
                    console.log(`[System] 已複製學生名單: ${s.length} 位`);
                } 
            } else {
                console.log(`[System] 建立全新空白班級: "${n}" (使用系統預設項目)`);
            }
            


            const newClass = { id: n };
            classes.push(newClass); 
            pushOp(13, newClass, true); // Action 13: Create Class
            
            students = s;
            pointItems = items;
            groups = g;
            logs = []; 
            currentClassId = n; 
            saveData(); 
            // 由於已經手動更新了全域變數，此處不需要再 loadClassData 否則會從硬碟重新讀取一次
            
            renderStudents(); 
            renderPointItems();
            renderClassSelector(); 
            nInp.value = ''; 
            closeModal(document.getElementById('manageClassesModal'));
            alert(`班級「${n}」已建立${src?'並複製完成':'(純空白)'}`);
        });
        
        wire('syncStatus', () => performCloudUpload(true));
        
        wire('cloudUploadBtn', () => performCloudUpload(true));
        wire('cloudDownloadBtn', () => { if(confirm('會覆蓋本地資料，確定？')) performCloudDownload(true); });
        
        const binInp = document.getElementById('cloudBinId'); if(binInp) { binInp.value = cloudBinId; binInp.onchange = (e) => { cloudBinId = e.target.value; saveData(); startSyncTimer(); }; }
        const keyInp = document.getElementById('cloudApiKey'); if(keyInp) { keyInp.value = cloudApiKey; keyInp.onchange = (e) => { cloudApiKey = e.target.value; saveData(); startSyncTimer(); }; }
        const ivInp = document.getElementById('autoSyncInterval'); if(ivInp) { ivInp.value = autoSyncInterval; ivInp.onchange = (e) => { autoSyncInterval = parseInt(e.target.value); saveData(); startSyncTimer(); }; }

        wire('resetCloudBinId', () => { if(confirm('重置 URL 或 ID？')) { document.getElementById('cloudBinId').value = ''; cloudBinId = ''; saveData(); } });
        wire('resetCloudApiKey', () => { if(confirm('重置 Key？')) { document.getElementById('cloudApiKey').value = ''; cloudApiKey = ''; saveData(); } });
        wire('confirmSyncBehaviorsBtn', () => {
            const src = document.getElementById('syncFromClassSelect').value;
            if(!src) return alert('請選擇來源班級');
            if(confirm('這將會覆蓋目前班級的行為設定，確定嗎？')) {
                const siVal = localStorage.getItem(`CD_${src}_itm`);
                const si = siVal ? JSON.parse(siVal) : null;
                if(si) {
                    pointItems.pos = [...(si.pos||[])].sort((a,b)=>a.lb.localeCompare(b.lb, 'zh-TW')).map((x, i) => ({...x, id: 'p'+(i+1)}));
                    pointItems.neg = [...(si.neg||[])].sort((a,b)=>a.lb.localeCompare(b.lb, 'zh-TW')).map((x, i) => ({...x, id: 'n'+(i+1)}));
                    saveData(); renderPointItems(); alert('行為項目已成功覆蓋綁定！');
                }
            }
        });

        wire('copyPointsBtn', () => {
            const range = getReportsTimeRange();
            let data = students.map(s => {
                let pts = logs.filter(l => l.sID === s.id).reduce((sum, l) => {
                    const ts = (typeof l.TS === 'number') ? l.TS : StampTool.decode(l.TS).getTime();
                    if (range && (ts < range.start || ts > range.end)) return sum;
                    return sum + (l.iSum === 1 ? 0 : l.pt);
                }, 0);
                return { name: s.id, pts };
            });
            if (currentSort === 'name') data.sort((a,b) => a.name.localeCompare(b.name, 'zh-TW')); 
            else data.sort((a,b) => b.pts - a.pts);

            const text = data.map(d => `${d.pts}`).join('\n');
            navigator.clipboard.writeText(text).then(() => alert('已按目前排序複製點數'));
        });

        wire('copyNamesBtn', () => {
            const range = getReportsTimeRange();
            let data = students.map(s => {
                let pts = logs.filter(l => l.sID === s.id).reduce((sum, l) => {
                    const ts = (typeof l.TS === 'number') ? l.TS : StampTool.decode(l.TS).getTime();
                    if (range && (ts < range.start || ts > range.end)) return sum;
                    return sum + (l.iSum === 1 ? 0 : l.pt);
                }, 0);
                return { name: s.id, pts };
            });
            if (currentSort === 'name') data.sort((a,b) => a.name.localeCompare(b.name, 'zh-TW')); 
            else data.sort((a,b) => b.pts - a.pts);

            const text = data.map(d => `${d.name}`).join('\n');
            navigator.clipboard.writeText(text).then(() => alert('已按目前排序複製姓名'));
        });

        wire('exportCsvBtn', () => {
            const range = getReportsTimeRange();
            // 矩陣式報表規畫
            const filteredLogs = logs.filter(l => {
                const ts = (typeof l.TS === 'number') ? l.TS : StampTool.decode(l.TS).getTime();
                if (range && (ts < range.start || ts > range.end)) return false;
                if (l.iSum === 1) return false; 
                return true;
            });
            const validItems = [...new Set(filteredLogs.map(l => l.lb))].sort();
            let csv = '\uFEFF姓名/項目,總點數,' + validItems.join(',') + '\n';
            
            students.forEach(s => {
                const sLogs = filteredLogs.filter(l => l.sID === s.id);
                if (sLogs.length === 0) return;
                const total = sLogs.reduce((acc, l) => acc + l.pt, 0);
                let row = `"${s.id}",${total}`;
                validItems.forEach(itm => {
                    const sum = sLogs.filter(l => l.lb === itm).reduce((acc, l) => acc + l.pt, 0);
                    row += `,${sum}`;
                });
                csv += row + '\n';
            });
            
            const b = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = `report_${new Date().toLocaleDateString()}.csv`; a.click();
        });

        const rRange = document.getElementById('timeRangeFilter'); if(rRange) {
            rRange.onchange = () => {
                const cu = document.getElementById('customDateContainer'); if(cu) cu.classList.toggle('hidden', rRange.value !== 'custom');
                window.renderReports();
            };
        }
        const sD = document.getElementById('startDateFilter'); if(sD) sD.onchange = window.renderReports;
        const eD = document.getElementById('endDateFilter'); if(eD) eD.onchange = window.renderReports;

        wire('exportJsonBtn', async () => { 
            const b = getFullBackupData(true); 
            const compressed = await compressJSON(b, true);
            if (!compressed) return alert('匯出壓縮失敗');
            const raw = atob(compressed);
            const bytes = new Uint8Array(raw.length);
            for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
            const blo = new Blob([bytes], {type:'application/gzip'}); 
            const a = document.createElement('a'); 
            a.href = URL.createObjectURL(blo); 
            a.download = `ClassKudox_${new Date().toLocaleDateString().replace(/\//g,'')}.json.gz`; 
            a.click(); 
        });
        wire('importJsonBtn', () => document.getElementById('importJsonFile')?.click());
        const iFile = document.getElementById('importJsonFile'); 
        if(iFile) {
            iFile.accept = ".json,.gz";
            iFile.onchange = (e) => { 
                const f = e.target.files[0]; 
                if(!f) return; 
                if (f.name.endsWith('.gz')) {
                    const r = new FileReader(); 
                    r.onload = async (ev) => { 
                        try { 
                            const parsed = await decompressBinary(ev.target.result);
                            if(parsed) restoreFromBackup(parsed);
                            else alert('解壓縮失敗');
                        } catch(err) { alert('匯入失敗'); } 
                    }; 
                    r.readAsArrayBuffer(f);
                } else {
                    const r = new FileReader(); 
                    r.onload = (ev) => { 
                        try { restoreFromBackup(JSON.parse(ev.target.result)); } 
                        catch(err) { alert('匯入失敗'); } 
                    }; 
                    r.readAsText(f); 
                }
            };
        }
        
        wire('resetAllClassesPointsBtn', () => { 
            if(confirm('重置「所有班級」學生的點數與紀錄？此動作無法復原。')) { 
                classes.forEach(c => {
                    localStorage.setItem(`CD_${c.id}_Ls`, '[]');
                    const stus = JSON.parse(localStorage.getItem(`CD_${c.id}_Stus`) || '[]');
                    stus.forEach(s => { s.cP = 0; s.iP = 0; });
                    localStorage.setItem(`CD_${c.id}_Stus`, JSON.stringify(stus));
                });
                logs = []; students.forEach(s => { s.cP = 0; s.iP = 0; });
                saveData(); renderStudents(); if(currentView === 'groups') renderGroups(); alert('已重置所有班級點數');
            } 
        });
        wire('resetCurrentClassPointsBtn', () => { 
            if(confirm(`重置目前班級「${currentClassId}」學生的點數與紀錄？`)) { 
                logs = []; students.forEach(s => { s.cP = 0; s.iP = 0; });
                saveData(); renderStudents(); if(currentView === 'groups') renderGroups(); alert('已重置目前班級點數');
            } 
        });
        wire('resetSystemBtn', () => { if(confirm('重置系統？資料將消失。')) { localStorage.clear(); location.reload(); } });

        const icons = [
          '⭐', '🤝', '🎯', '🙋', '💪', '📚', '🎨', '⚽', '🧹', '♻️', '📢', '⌛', '📵', '🗣️', '🤷', '😡', '😴', '🎮', '🍕', '🍎',
          '🌈', '🔥', '💧', '⚡', '🏆', '💎', '🎁', '🚀', '🐱', '🐶', '🦄', '🍀', '💡', '🔔', '🖊️', '🔍', '📱', '💻', '⏰', '📅',
          '🎉', '🎈', '🎂', '🍦', '🍩', '🍪', '🍫', '🍭', '🍔', '🍟', '🥗', '🍓', '🍒', '🍉', '🍍', '🍇', '🍋', '🥭', '🦒', '🦓',
          '🐼', '🐨', '🦁', '🐯', '🐸', '🐢', '🦋', '🐝', '🐙', '🦀', '🐬', '🐳', '🦜', '🦉', '🕊️', '🦢', '🦩', '🍁', '🌸', '🌻',
          '🌞', '🌙', '☁️', '🏖️', '⛰️', '⛺', '🚗', '🚲', '🛸', '🛰️', '🎸', '🎬', '🎤', '🎲', '🧩', '🧸', '🧶', '🧦', '👑', '🧤',
          '👓', '🕶️', '👒', '🎒', '💼', '👜', '🌂', '💍', '💄', '👟', '👞', '🥊', '🏀', '🏈', '⚾', '🎾', '🏐', '🏉', '🎱', '🏓',
          '🏸', '🏒', '🏹', '🎣', '🛹', '🛼', '🚜', '🚛', '🚑', '🚒', '🛶', '🚢', '🚆', '🎠', '🎡', '運', '⛲', '🏙️', '🏰', '🗽',
          '🗿', '⛩️', '🌋', '🏠', '🏦', '🏭', '🎪', '🎭', '🧵', '🪡', '🧺', '🧻', '🛁', '🧼', '🗝️', '🧬', '🔭', '🔬', '🕯️', '📌',
          '📎', '🔒', '🔧', '🔨', '🔩', '⚙️', '⚓', '🛒', '🛍️', '🏮', '🎐', '🎏', '🎊', '🎎', '🎑', '🎍', '🍶', '🍵', '🍣', '🍱',
          '🍘', '🍛', '🍜', '🍝', '🍲', '🍿', '🥤', '🍮', '🍰', '🧁', '🍨', '🍧', '🍦', '🍩', '🍪', '🍫', '🍭', '🍮', '🍯', '🍷',
          '🍹', '🍺', '🍻', '🥂', '🥃', '🥤', '🧃', '🧉', '🧊', '🥢', '🍽️', '🍴', '🥄', '🔪', '🏺', '🌍', '🌎', '🌏', '🌐', '🗺️',
          '🗾', '🧭', '🏔️', '⛰️', '🌋', '🗻', '🏕️', '🏖️', '🏜️', '🏝️', '🏞️', '🏟️', '🏛️', '🏗️', '🧱', '🏘️', '🏚️', '🏠', '🏡', '🏢',
          '🏣', '🏤', '🏥', '🏦', '🏨', '🏩', '🏪', '🏫', '🏬', '🏭', '🏯', '🏰', '💒', '🗼', '🗽', '⛩️', '🕌', '🕍', '🕋', '⛪',
          '🛕', '🌅', '🌄', '🌇', '🌆', '🌃', '🌌', '🌉', '🌁', '⌚', '📱', '📲', '💻', '⌨️', '🖱️', '🖲️', '🕹️', '🗜️', '💽', '💾',
          '💿', '📀', '📼', '📷', '📸', '📹', '🎥', '📽️', '🎞️', '📞', '☎️', '📟', '📠', '📺', '📻', '🎙️', '🎚️', '🎛️', '🧭', '⏱️'
        ];
        const iGrid = document.getElementById('iconPickerGrid'); if(iGrid) {
            icons.forEach(ico => {
                const b = document.createElement('button'); b.className = 'icon-picker-btn'; b.textContent = ico;
                b.onclick = () => { if(currentIconTarget) { currentIconTarget.textContent = ico; closeModal(document.getElementById('iconPickerModal')); } };
                iGrid.appendChild(b);
            });
        }
        let currentIconTarget = null;
        document.querySelectorAll('.icon-select-btn').forEach(b => b.onclick = () => { currentIconTarget = b; openModal(document.getElementById('iconPickerModal')); });
        
        wire('openAvatarPickerBtn', () => {
            const grid = document.getElementById('avatarPickerGrid'); if(!grid) return; grid.innerHTML = '';
            for(let i=0; i<30; i++) {
                const seed = 's'+i; const style = document.getElementById('editStudentAvatarStyle').value;
                const url = getAvatarUrl(seed, style);
                const img = document.createElement('img'); img.src = url; img.className = 'avatar-picker-item';
                img.onclick = () => { 
                    document.getElementById('editStudentAvatarPreview').src = url; 
                    const s = students.find(x=>x.id===currentProfileId); if(s) s.aU = seed; 
                    closeModal(document.getElementById('avatarPickerModal')); 
                };
                grid.appendChild(img);
            }
            openModal(document.getElementById('avatarPickerModal'));
        });
        wire('randomizeAvatarBtn', () => { 
            const seed = getRandomSeed(); const style = document.getElementById('editStudentAvatarStyle').value;
            const url = getAvatarUrl(seed, style); 
            document.getElementById('editStudentAvatarPreview').src = url; 
            const s = students.find(x=>x.id===currentProfileId); if(s) s.aU = seed; 
        });

        const startSyncTimer = () => {
            if (window.checkTimer) clearInterval(window.checkTimer);
            if (autoSyncTimer) clearInterval(autoSyncTimer);
            if (!cloudBinId || !cloudApiKey) return;
            
            console.log(`[CloudSync] 定時器啟動，頻率: ${autoSyncInterval}秒`);
            
            window.checkTimer = setInterval(() => {
                if (isSyncing) return;
                if (isDirty === 3) {
                    mSyn--;
                    if (mSyn <= 0) {
                        mSyn = 300;
                        console.log('[CloudSync] 閒置滿 300 秒，執行強制同步預檢...');
                        checkCloudSyncState();
                    }
                }
            }, 1000);

            if (autoSyncInterval > 0) {
                autoSyncTimer = setInterval(() => {
                    if (isDirty === 1 && !isSyncing) checkCloudSyncState();
                }, Math.max(autoSyncInterval, 15) * 1000);
            }

            setTimeout(() => { if (!isSyncing) checkCloudSyncState(); }, 1500);
        };

        startSyncTimer();
    };

    const createPointAnimation = (pts, count) => { for(let i=0; i<Math.min(count, 5); i++) { const el = document.createElement('div'); el.className = 'point-animation'; el.textContent = `${pts>0?'+':''}${pts}`; el.style.color = pts>0?'var(--positive-color)':'var(--negative-color)'; el.style.left = (50+Math.random()*10-5)+'%'; el.style.top = (40+Math.random()*10-5)+'%'; document.body.appendChild(el); setTimeout(() => el.remove(), 1000); } };

    // --- Start ---
    bootSequence();
});
