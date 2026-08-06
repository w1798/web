/**
 * ClassKudox - Actions & Business Logic
 */



const awardPoints = (iID, lb, pt, forcedIgnore = null) => {
    if(!awardContextIds.length) return;
    const count = awardContextIds.length;
    const now = Date.now(); 
    const tsHex = StampTool.encode(now);
    let newIds = [];
    const isIgnore = !!forcedIgnore;
    awardContextIds.forEach(sid => { 
        const logId = Math.random().toString(36).substring(2, 8); 
        const p = safeInt(pt);
        const logEntry = { id: logId, sID: sid, lb, pt: p, TS: tsHex };
        if(isIgnore) logEntry.iSum = 1;
        logs.push(logEntry); 
        newIds.push(logId); 
        const s = students.find(x => x.id === sid);
        if(s) {
            if(isIgnore) s.iP = (s.iP || 0) + p;
            else s.cP = (s.cP || 0) + p;
        }
        const opData = { s: sid, lb, p, l: logId };
        if(isIgnore) opData.is = 1;
        pushOp(ACT.STU_AWD, opData);
    });
    saveData(); 
    if (typeof createPointAnimation === 'function') createPointAnimation(pt, count); 
    if (typeof renderStudents === 'function') renderStudents(); 
    if (currentView === 'groups' && typeof renderGroups === 'function') renderGroups();
    lastActionLogIds = newIds; 
    if(isMultiSelectMode && typeof toggleMultiSelectMode === 'function') toggleMultiSelectMode();
    showUndoToast(`${pt > 0 ? '+' : ''}${pt} 給予 ${count} 位學生`);
};

const awardTreasure = (treasureId, qty, silent = false) => {
    const td = treasureDefs.find(t => t.id === treasureId);
    if (!td) return [];
    const q = safeInt(qty, -999999, 999999);
    if (q === 0) return [];
    let newIds = [];
    awardContextIds.forEach(sid => {
        const s = students.find(x => x.id === sid);
        if (!s) return;
        if (!s.tr) s.tr = {};
        s.tr[treasureId] = (s.tr[treasureId] || 0) + q;
        
        const logId = Math.random().toString(36).substring(2, 8);
        const tsHex = StampTool.encode();
        const qtyText = q > 0 ? `+${q}` : `${q}`;
        const logLabel = `${td.ic}${td.lb} ${qtyText}`;
        const logEntry = { id: logId, sID: sid, lb: logLabel, pt: 0, TS: tsHex, iSum: 1, trId: treasureId, trQty: q };
        logs.push(logEntry);
        newIds.push(logId);
        pushOp(ACT.STU_AWD, { s: sid, lb: logLabel, p: 0, l: logId, is: 1, ti: treasureId, tq: q });
    });
    saveData();
    if(isMultiSelectMode && typeof toggleMultiSelectMode === 'function') toggleMultiSelectMode();
    if (!silent) {
        if (window.refreshProxy) window.refreshProxy();
        if (typeof createPointAnimation === 'function') createPointAnimation(qty, awardContextIds.length);
        lastActionLogIds = newIds;
        showUndoToast(`${qty > 0 ? '+' : ''}${qty} ${td.lb} 給予 ${awardContextIds.length} 位學生`);
    }
    return newIds;
};

const undoAction = () => {
    if (!lastActionLogIds.length) return;
    if (!confirm('確定要復原上一次的操作嗎？')) return;
    const set = new Set(lastActionLogIds);
    logs.filter(l => set.has(l.id)).forEach(l => {
        const s = students.find(x => x.id === l.sID);
        if(s) {
            if (l.trId && l.trQty) {
                if (s.tr) s.tr[l.trId] = (s.tr[l.trId] || 0) - l.trQty;
            } else {
                if(l.iSum === 1) s.iP = (s.iP || 0) - l.pt;
                else s.cP = (s.cP || 0) - l.pt;
            }
        }
    });
    logs = logs.filter(l => !set.has(l.id));
    lastActionLogIds.forEach(lid => pushOp(ACT.STU_AWD_REV, lid));
    lastActionLogIds = [];
    saveData();
    hideUndoToast();
    if (typeof renderStudents === 'function') renderStudents(); 
    if (currentView === 'groups' && typeof renderGroups === 'function') renderGroups();
};

const openAwardModal = (ids, title, groupId = null) => {
    hideUndoToast();
    // 1. 同步全域 Vanilla 狀態（供 ui.js / actions.js 遺留邏輯讀取）
    awardContextIds = ids;
    currentGroupIdForAward = groupId;
    pendingTreasures = {};
    if (ids.length === 1) currentProfileId = ids[0];

    // 委派給 React 開啟彈窗（帶入 awardContext 資料）
    window._openReactAwardModal(ids, title, groupId);
};

const openManageGroupModal = (groupId = null) => {
    hideUndoToast();
    editingGroupId = groupId;
    window._openReactManageGroupModal(groupId);
};

const openGroupDetailModal = (g) => {
    awardContextIds = g.sIds;
    currentGroupIdForAward = g.id;
    window._openReactGroupDetailModal(g);
};

const openEditPointItemModal = (cat, itemId) => {
    editingPointItemCat = cat; editingPointItemId = itemId;
    window._openReactEditPointItemModal(cat, itemId);
};

const toggleMultiSelectMode = () => {
    hideUndoToast();
    isMultiSelectMode = !isMultiSelectMode;
    window.isMultiSelectMode = isMultiSelectMode;
    selectedStudentIds.length = 0;
    selectedGroupIds.clear();
    if (typeof renderStudents === 'function') renderStudents();
    if (currentView === 'groups' && typeof renderGroups === 'function') renderGroups();
};

const toggleStudentSelection = (id) => { 
    if (selectedStudentIds.includes(id)) {
        selectedStudentIds = selectedStudentIds.filter(x => x !== id);
    } else {
        selectedStudentIds.push(id);
    }
    window.selectedStudentIds = selectedStudentIds;
    if (typeof renderStudents === 'function') renderStudents(); 
};

const showUndoToast = (m) => { 
    if (isMultiSelectMode) return;
    if (m) lastUndoMessage = m;
    if(undoTimeout) clearTimeout(undoTimeout);
    if (window._showUndoToastUI) window._showUndoToastUI(lastUndoMessage);
};

window.removePointItem = (cat, id) => { 
    if(!confirm('刪除此項目？')) return; 
    pointItems[cat] = pointItems[cat].filter(i => i.id !== id); 
    pushOp(ACT.ITEM_DEL, { c: cat, id: id });
    saveData(); if (typeof renderPointItems === 'function') renderPointItems(); 
};

window.removeTreasureDef = (id) => {
    if(!confirm('刪除此寶物？學生已持有的該種寶物也會清除。')) return;
    treasureDefs = treasureDefs.filter(i => i.id !== id);
    students.forEach(s => { if(s.tr) delete s.tr[id]; });
    pushOp(ACT.TR_DEF_DEL, id); 
    saveData(); if (typeof renderPointItems === 'function') renderPointItems();
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
        delLogs.push({
            id: Math.random().toString(36).substring(2, 8),
            sID: l.sID, lb: l.lb, pt: safeInt(l.pt),
            originalTS: l.TS, deletedAt: StampTool.encode(),
            trId: l.trId, trQty: l.trQty, iSum: l.iSum
        });
        cleanupDelLogs();
    }
    logs = logs.filter(x => x.id != id); 
    pushOp(ACT.STU_AWD_REV, id);
    saveData(); 
    if (window.refreshProxy) window.refreshProxy(); 
};

const scrollToReportLogs = () => {
    if (window._scrollToReportLogsUI) window._scrollToReportLogsUI();
};

// --- Data operations for wire handlers ---

const applyClassAvatarStyle = (style) => {
    students.forEach(s => s.aS = style);
    pushOp(ACT.SET_AVATAR_STYLE, style);
    saveData();
};

const renameStudent = (oldId, newName, newStyle) => {
    const s = students.find(x => x.id === oldId);
    if (!s) return { success: false, error: '找不到學生' };
    if (!newName.trim()) return { success: false, error: '請輸入姓名' };
    if (newName !== oldId && students.some(x => x.id === newName)) return { success: false, error: '姓名已存在' };
    if (newName !== oldId) {
        logs.filter(l => l.sID === s.id).forEach(l => l.sID = newName);
        groups.forEach(g => { const idx = g.sIds.indexOf(s.id); if(idx>-1) g.sIds[idx] = newName; });
        if (currentProfileId === s.id) currentProfileId = newName;
        const selIdx = selectedStudentIds.indexOf(s.id);
        if (selIdx > -1) selectedStudentIds[selIdx] = newName;
        s.id = newName;
    }
    s.aS = newStyle;
    pushOp(ACT.STU_UPD, s);
    saveData();
    return { success: true };
};

const deleteStudent = (id) => {
    pushOp(ACT.STU_DEL, id);
    students = students.filter(x => x.id !== id);
    logs = logs.filter(x => x.sID !== id);
    saveData();
};

const addStudents = (names) => {
    names.forEach(n => {
        const name = n.trim();
        if (!name) return;
        if (students.some(s => s.id === name)) { console.warn('跳過重複姓名:', name); return; }
        const newStu = { id: name, cP: 0, iP: 0, aS: 'fe', aU: getRandomSeed(), tr: {} };
        students.push(newStu);
        pushOp(ACT.STU_UPD, newStu);
    });
    saveData();
};

const saveGroup = (name, sids, editingId) => {
    if (!name.trim()) return { success: false, error: '請輸入名稱' };
    if (!sids.length) return { success: false, error: '請選擇成員' };
    let g;
    if (editingId) {
        if (editingId !== name && groups.some(x => x.id === name)) return { success: false, error: '群組名稱已存在' };
        g = groups.find(x => x.id === editingId);
        g.id = name; g.sIds = sids;
    } else {
        if (groups.some(x => x.id === name)) return { success: false, error: '群組名稱已存在' };
        g = { id: name, sIds: sids };
        groups.push(g);
    }
    pushOp(ACT.GRP_UPD, g);
    saveData();
    return { success: true };
};

const deleteGroup = (id) => {
    pushOp(ACT.GRP_DEL, id);
    groups = groups.filter(x => x.id !== id);
    saveData();
};

const processGift = (donorId, amount, recipients, interval, step, ign) => {
    if (!recipients.length) return { success: false, error: '請選擇至少一個對象' };
    const a = safeInt(amount, 1, 999999);
    if (a <= 0) return { success: false, error: '請輸入有效數量' };
    const i = safeInt(interval, 0, 999999);
    const st = safeInt(step, 0, 999999);
    const fee = (i > 0 && st > 0) ? Math.ceil(a / i) * st : 0;
    const totalPerRecipient = a + fee;
    const totalDeduction = totalPerRecipient * recipients.length;
    const tsHex = StampTool.encode(Date.now());
    let donorLogId = null;
    const donor = students.find(s => s.id === donorId);
    if (donor) {
        donorLogId = Math.random().toString(36).substring(2, 8);
        donor.cP -= totalDeduction;
        logs.push({ id: donorLogId, sID: donor.id, lb: '贈與點數', pt: -totalDeduction, TS: tsHex, iSum: ign ? 1 : 0 });
        pushOp(ACT.STU_AWD, { s: donor.id, lb: '贈與點數', p: -totalDeduction, l: donorLogId, is: ign ? 1 : 0 });
    }
    let currentIds = [];
    recipients.forEach(rid => {
        const r = students.find(s => s.id === rid);
        if (r) {
            const logId = Math.random().toString(36).substring(2, 8);
            r.cP += a;
            logs.push({ id: logId, sID: r.id, lb: '獲得點數', pt: a, TS: tsHex, iSum: ign ? 1 : 0 });
            pushOp(ACT.STU_AWD, { s: r.id, lb: '獲得點數', p: a, l: logId, is: ign ? 1 : 0 });
            currentIds.push(logId);
        }
    });
    if (donorLogId) currentIds.push(donorLogId);
    lastActionLogIds = currentIds;
    saveData();
    return { success: true, amount: a, count: recipients.length };
};

const saveCustomItems = (items) => {
    customItems = items;
    pushOp(ACT.SET_CUSTOM_ITEMS, customItems, true);
    saveData();
};

const addPointItem = (cat, label, value, icon, ignore) => {
    if (!label.trim()) return;
    const itemId = Math.random().toString(36).substring(2, 8);
    const item = { id: itemId, lb: label.trim(), vl: safeInt(value), ic: icon };
    if (ignore) item.iSum = 1;
    pointItems[cat].push(item);
    pushOp(3, { c: cat, i: item });
    saveData();
};

const addTreasureItem = (label, icon) => {
    if (!label.trim()) return;
    const itemId = Math.random().toString(36).substring(2, 8);
    const item = { id: itemId, lb: label.trim(), ic: icon };
    treasureDefs.push(item);
    pushOp(ACT.TR_DEF_UPD, item);
    saveData();
};

const addCustomItem = (label) => {
    if (!label.trim()) return;
    if (customItems.includes(label)) return;
    customItems.push(label);
    pushOp(ACT.SET_CUSTOM_ITEMS, customItems, true);
    saveData();
};

const updateStudentAvatar = (id, aU, aS) => {
    const s = students.find(x => x.id === id);
    if (!s) return;
    s.aU = aU;
    if (aS !== undefined) s.aS = aS;
    pushOp(ACT.STU_UPD, s);
    saveData();
};

const saveEditItem = (cat, id, label, icon, value, ignore) => {
    if (cat === 'treasure') {
        const item = treasureDefs.find(i => i.id === id);
        if (item) { item.lb = label; item.ic = icon; pushOp(ACT.TR_DEF_UPD, item); saveData(); }
    } else {
        const item = pointItems[cat].find(i => i.id === id);
        if (item) {
            item.lb = label; item.vl = safeInt(value); item.ic = icon;
            if (ignore) item.iSum = 1; else delete item.iSum;
            pushOp(ACT.ITEM_UPD, { c: cat, i: item });
            saveData();
        }
    }
};

const createClass = (name, copyFrom, copyItems, copyStudents) => {
    if (!name.trim()) return { success: false, error: '請輸入班級名稱' };
    if (classes.some(c => c.id === name)) return { success: false, error: '班級名稱已存在' };
    let items = JSON.parse(JSON.stringify(defaultItems));
    let s = [], g = [];
    if (copyFrom) {
        if (copyItems) {
            const siValue = localStorage.getItem(`CD_${copyFrom}_itm`);
            const si = siValue ? JSON.parse(siValue) : null;
            if (si) {
                items.pos = (si.pos||[]).sort(sortItems).map(x => ({...x, id: Math.random().toString(36).substring(2, 8)}));
                items.neg = (si.neg||[]).sort(sortItems).map(x => ({...x, id: Math.random().toString(36).substring(2, 8)}));
            }
        }
        if (copyStudents) {
            const oldSData = JSON.parse(localStorage.getItem(`CD_${copyFrom}_Stus`) || '[]');
            s = oldSData.map(x => ({ id: x.id, cP: 0, iP: 0, aS: 'fe', aU: getRandomSeed(), tr: {} }));
            g = JSON.parse(localStorage.getItem(`CD_${copyFrom}_Gs`) || '[]');
        }
    }
    classes.push({ id: name });
    pushOp(ACT.CLS_NEW, { id: name, s, itm: items, g }, true);
    students = s; pointItems = items; groups = g; logs = []; currentClassId = name;
    saveData();
    return { success: true };
};

const classSetStudents = (clazz) => {
    if (clazz && clazz !== currentClassId) {
        students = JSON.parse(localStorage.getItem(`CD_${clazz}_Stus`) || '[]').map(x => ({ ...x, tr: x.tr || {} }));
        groups = JSON.parse(localStorage.getItem(`CD_${clazz}_Gs`) || '[]');
        logs = JSON.parse(localStorage.getItem(`CD_${clazz}_Ls`) || '[]');
        pointItems = JSON.parse(localStorage.getItem(`CD_${clazz}_itm`) || 'null');
        if (!pointItems) {
            pointItems = JSON.parse(JSON.stringify(defaultItems));
            localStorage.setItem(`CD_${clazz}_itm`, JSON.stringify(pointItems));
        }
        currentClassId = clazz;
        localStorage.setItem('CD_cCId', currentClassId);
    }
};

const syncBehaviors = (srcClass) => {
    const siVal = localStorage.getItem(`CD_${srcClass}_itm`);
    const si = siVal ? JSON.parse(siVal) : null;
    if (si) {
        pointItems.pos = [...(si.pos||[])].sort(sortItems).map((x, i) => ({...x, id: 'p'+(i+1)}));
        pointItems.neg = [...(si.neg||[])].sort(sortItems).map((x, i) => ({...x, id: 'n'+(i+1)}));
        pushOp(ACT.SET_PT_ITEMS, pointItems);
        saveData();
    }
};

const clearCurrentClassRecords = () => {
    logs = []; delLogs = []; delLogRestored = []; delLogResData = {};
    pushOp(16, null);
    saveData();
};

const clearAllClassesRecords = () => {
    classes.forEach(c => {
        localStorage.setItem(`CD_${c.id}_Ls`, '[]');
        localStorage.setItem(`CD_${c.id}_DLs`, '[]');
        localStorage.setItem(`CD_${c.id}_DL_Res`, '[]');
        localStorage.setItem(`CD_${c.id}_DL_ResData`, '{}');
    });
    logs = []; delLogs = []; delLogRestored = []; delLogResData = {};
    pushOp(18, null, true);
    saveData();
};

window.restoreDelLog = (id) => {
    const idx = delLogs.findIndex(x => x.id === id);
    if (idx === -1) return alert('找不到該筆刪除紀錄');
    const dl = delLogs[idx];
    const s = students.find(x => x.id === dl.sID);
    if (!s) return alert(`學生「${dl.sID}」已不存在於目前班級，無法還原`);
    if (!confirm(`還原此筆？\n學生：${dl.sID}\n項目：${dl.lb}${dl.pt ? (dl.pt > 0 ? '+' : '') + dl.pt : ''}${dl.trQty ? ' ×' + dl.trQty : ''}\n原時間：${StampTool.decode(dl.originalTS).toLocaleString()}`)) return;
    const p = safeInt(dl.pt);
    if (dl.trId && dl.trQty) {
        const q = safeInt(dl.trQty, -999999, 999999);
        if (s.tr) s.tr[dl.trId] = (s.tr[dl.trId] || 0) + q;
        else s.tr = { [dl.trId]: q };
    } else {
        if (dl.iSum === 1) s.iP = (s.iP || 0) + p;
        else s.cP = (s.cP || 0) + p;
    }
    const logEntry = { id: Math.random().toString(36).substring(2, 8), sID: dl.sID, lb: dl.lb, pt: p, TS: dl.originalTS };
    if (dl.iSum) logEntry.iSum = 1;
    if (dl.trId) { logEntry.trId = dl.trId; logEntry.trQty = safeInt(dl.trQty, -999999, 999999); logEntry.iSum = 1; }
    logs.push(logEntry);
    delLogs.splice(idx, 1);
    if (!delLogRestored.includes(id)) {
        delLogRestored.push(id);
        delLogResData[id] = { sID: dl.sID, lb: dl.lb, pt: p, trId: dl.trId, trQty: dl.trQty, iSum: dl.iSum, originalTS: dl.originalTS };
    }
    saveData();
    if (window.refreshProxy) window.refreshProxy();
};

window.toggleGroupSelection = (id) => {
    if (selectedGroupIds.has(id)) selectedGroupIds.delete(id);
    else selectedGroupIds.add(id);
    window.selectedGroupIds = selectedGroupIds;
};
window.setLastActionLogIds = (ids) => { lastActionLogIds = ids; };
window.saveCustomPref = (key, val) => { customPrefs[key] = val; saveData(); };
window.awardPoints = awardPoints;
window.awardTreasure = awardTreasure;
window.undoAction = undoAction;
window.openAwardModal = openAwardModal;
window.openManageGroupModal = openManageGroupModal;
window.openGroupDetailModal = openGroupDetailModal;
window.openEditPointItemModal = openEditPointItemModal;
window.toggleMultiSelectMode = toggleMultiSelectMode;
window.toggleStudentSelection = toggleStudentSelection;
window.showUndoToast = showUndoToast;
window.hideUndoToast = hideUndoToast;
window.scrollToReportLogs = scrollToReportLogs;
window.applyClassAvatarStyle = applyClassAvatarStyle;
window.renameStudent = renameStudent;
window.deleteStudent = deleteStudent;
window.addStudents = addStudents;
window.saveGroup = saveGroup;
window.deleteGroup = deleteGroup;
window.processGift = processGift;
window.saveCustomItems = saveCustomItems;
window.addPointItem = addPointItem;
window.addTreasureItem = addTreasureItem;
window.saveEditItem = saveEditItem;
window.saveGiftSettings = (s) => { if(s.gInt!==void 0) giftSettings.gInt=safeInt(s.gInt, 0, 999999); if(s.gStep!==void 0) giftSettings.gStep=safeInt(s.gStep, 0, 999999); if(s.gIgn!==void 0) giftSettings.gIgn=s.gIgn?1:0; saveData(); };
window.addCustomItem = addCustomItem;
window.updateStudentAvatar = updateStudentAvatar;
window.createClass = createClass;
window.classSetStudents = classSetStudents;
window.syncBehaviors = syncBehaviors;
window.clearCurrentClassRecords = clearCurrentClassRecords;
window.clearAllClassesRecords = clearAllClassesRecords;
