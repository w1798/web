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
        pushOp(ACT.STU_AWD, opData);
    });
    saveData(); 
    if (typeof createPointAnimation === 'function') createPointAnimation(pt, count); 
    if (typeof renderStudents === 'function') renderStudents(); 
    if (currentView === 'groups' && typeof renderGroups === 'function') renderGroups();
    lastActionLogIds = newIds; 
    showUndoToast(`${pt > 0 ? '+' : ''}${pt} 給予 ${count} 位學生`);
    if(isMultiSelectMode && typeof toggleMultiSelectMode === 'function') toggleMultiSelectMode();
    setTimeout(() => {
        closeModal(document.getElementById('studentProfileModal'));
        closeModal(document.getElementById('groupDetailModal'));
    }, 400);
};

const awardTreasure = (treasureId, qty, silent = false) => {
    const td = treasureDefs.find(t => t.id === treasureId);
    if (!td) return [];
    let newIds = [];
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
        newIds.push(logId);
        pushOp(ACT.STU_AWD, { s: sid, lb: logLabel, p: 0, l: logId, is: 1, ti: treasureId, tq: qty });
    });
    saveData();
    if (!silent) {
        if (typeof renderStudentTreasures === 'function') renderStudentTreasures();
        if (typeof renderStudents === 'function') renderStudents();
        if (typeof createPointAnimation === 'function') createPointAnimation(qty, awardContextIds.length);
        lastActionLogIds = newIds;
        showUndoToast(`${qty > 0 ? '+' : ''}${qty} ${td.lb} 給予 ${awardContextIds.length} 位學生`);
    }
    return newIds;
};

const undoAction = () => {
    if (!lastActionLogIds.length) return;
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
    const toast = document.getElementById('undoToast'); if(toast) toast.classList.add('hidden');
    if (typeof renderStudents === 'function') renderStudents(); 
    if (currentView === 'groups' && typeof renderGroups === 'function') renderGroups();
};

const openAwardModal = (ids, title, groupId = null) => {
    awardContextIds = ids;
    currentGroupIdForAward = groupId;
    pendingTreasures = {};
    if(ids.length === 1) currentProfileId = ids[0]; 
    const header = document.getElementById('currentProfileName'); if(header) header.textContent = title;
    
    // 恢復上次的 UI 狀態 (避免 F5 重整後看起來回到預設)
    const uiState = safeLoad('CD_CustomUIState', null);
    if (uiState) {
        const temp = document.getElementById('customAwardTempName'); if(temp) temp.value = uiState.temp || '';
        const sel = document.getElementById('customAwardLabel'); if(sel) sel.value = uiState.l || '兌換點數';
    }
    
    // 當開啟彈窗時，觸發自訂分頁載入以確保 UI 反映最新的 customPrefs 狀態
    const cSel = document.getElementById('customAwardLabel');
    if (cSel && cSel.options.length > 0) {
        cSel.dispatchEvent(new Event('change'));
    }
    
    const profileModal = document.querySelector('.profile-modal');
    if(profileModal) profileModal.classList.toggle('modal-large', !!groupId);
    const editBtn = document.getElementById('editProfileBtn');
    const editGroupBtn = document.getElementById('editGroupProfileBtn');
    if(editBtn) editBtn.classList.toggle('hidden', !!groupId);
    if(editGroupBtn) {
        editGroupBtn.classList.toggle('hidden', !groupId);
        editGroupBtn.onclick = () => { closeModal(document.getElementById('studentProfileModal')); openManageGroupModal(groupId); };
    }
    
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
    if (typeof switchProfileTab === 'function') switchProfileTab('award'); 
    openModal(document.getElementById('studentProfileModal')); 
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
    currentGroupIdForAward = g.id; 
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

const toggleMultiSelectMode = () => {
    isMultiSelectMode = !isMultiSelectMode;
    selectedStudentIds.length = 0;
    selectedGroupIds.clear();
    const bar = document.getElementById('multiSelectBar'); if(bar) bar.classList.toggle('hidden', !isMultiSelectMode);
    const btn = document.getElementById('toggleMultiSelectBtn'); if(btn) btn.classList.toggle('active', isMultiSelectMode);
    const fbtn = document.getElementById('floatingMultiSelectBtn'); 
    if(fbtn) {
        if (isMultiSelectMode) {
            fbtn.classList.add('hidden');
        } else {
            // 如果解除多選且剛好在底部，則重新顯示 (觸發滾動偵測)
            window.dispatchEvent(new Event('scroll'));
        }
    }
    const countEl = document.getElementById('multiSelectCount'); if(countEl) countEl.textContent = `已選擇 0 位學生`;
    if (typeof renderStudents === 'function') renderStudents();
    if (currentView === 'groups' && typeof renderGroups === 'function') renderGroups();
};

const toggleStudentSelection = (id) => { 
    if (selectedStudentIds.includes(id)) {
        selectedStudentIds = selectedStudentIds.filter(x => x !== id);
    } else {
        selectedStudentIds.push(id);
    }
    const el = document.getElementById('multiSelectCount'); if(el) el.textContent = `已選擇 ${selectedStudentIds.length} 位學生`; 
    if (typeof renderStudents === 'function') renderStudents(); 
};

const showUndoToast = (m) => { 
    const el = document.getElementById('undoMessage'); if(el) el.textContent = m; 
    const toast = document.getElementById('undoToast'); if(toast) toast.classList.remove('hidden'); 
    if(undoTimeout) clearTimeout(undoTimeout); 
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
    }
    logs = logs.filter(x => x.id != id); 
    pushOp(ACT.STU_AWD_REV, id);
    saveData(); 
    if (typeof renderHistory === 'function') renderHistory(); 
    if (typeof renderStudents === 'function') renderStudents(); 
    if(currentView === 'groups' && typeof renderGroups === 'function') renderGroups(); 
    if(!document.getElementById('reportsModal').classList.contains('hidden') && typeof renderReports === 'function') renderReports(); 
};

const scrollToReportLogs = () => {
    const el = document.getElementById('reportActivityTitle');
    if(el) el.scrollIntoView({ behavior: 'smooth' });
};
