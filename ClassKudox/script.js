document.addEventListener('DOMContentLoaded', () => {

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
        'cdData_syncVersion': 'CD_sV',
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

    let classes = safeLoad('CD_Cls', []);
    let currentClassId = localStorage.getItem('CD_cCId');
    let cloudBinId = localStorage.getItem('BId') || '';
    let cloudApiKey = localStorage.getItem('Key') || '';
    let autoSyncInterval = parseInt(localStorage.getItem('aSyn')) || 0;
    let localSyncVersion = parseInt(localStorage.getItem('CD_sV')) || 0;

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

    let students = [], groups = [], logs = [], pointItems = null, settings = null, classMeta = null;
    const DEFAULT_SETTINGS = { ftS: 'M', col: 10, gCol: 5, iCol: 5, eS: 0, sCH: 0, gCH: 0, lRet: 0 };

    const loadClassData = () => {
        if(!currentClassId) return;
        students = safeLoad(`CD_${currentClassId}_Stus`, []);
        groups = safeLoad(`CD_${currentClassId}_Gs`, []);
        logs = safeLoad(`CD_${currentClassId}_Ls`, []);
        pointItems = safeLoad(`CD_${currentClassId}_itm`, JSON.parse(JSON.stringify(defaultItems)));
        classMeta = safeLoad(`CD_${currentClassId}_meta`, { pNum: 0, nNum: 0, lNum: 0 });

        if (students.length > 0 && students[0].cP === undefined) {
            students.forEach(s => { s.cP = 0; s.iP = 0; });
            logs.forEach(l => { const s = students.find(x => x.id === l.sID); if(s) { if(l.iSum === 1) s.iP+=l.pt; else s.cP+=l.pt; } });
            saveData(true);
        }

        settings = safeLoad(`CD_${currentClassId}_set`, DEFAULT_SETTINGS);
    };

    let currentView = 'students', isMultiSelectMode = false, selectedStudentIds = new Set();
    let isDirty = Number(localStorage.getItem('drty')) || ((cloudBinId && cloudApiKey) ? 3 : 0), isSyncing = false, autoSyncTimer = null; 
    let awardContextIds = [], currentProfileId = null, editingGroupId = null, currentGroupIdForAward = null, editingPointItemId = null, editingPointItemCat = null, lastActionLogIds = [], undoTimeout = null, currentSort = 'score';

    const saveData = (skipDirty = false) => {
        if(!currentClassId) return;
        localStorage.setItem('CD_Cls', JSON.stringify(classes));
        localStorage.setItem('CD_cCId', currentClassId || '');
        localStorage.setItem('BId', cloudBinId);
        localStorage.setItem('Key', cloudApiKey);
        localStorage.setItem('aSyn', String(autoSyncInterval));
        localStorage.setItem('CD_sV', String(localSyncVersion));
        localStorage.setItem(`CD_${currentClassId}_Stus`, JSON.stringify(students));
        localStorage.setItem(`CD_${currentClassId}_Gs`, JSON.stringify(groups));
        localStorage.setItem(`CD_${currentClassId}_Ls`, JSON.stringify(logs));
        localStorage.setItem(`CD_${currentClassId}_itm`, JSON.stringify(pointItems));
        localStorage.setItem(`CD_${currentClassId}_set`, JSON.stringify(settings));
        localStorage.setItem(`CD_${currentClassId}_meta`, JSON.stringify(classMeta));
        if (!skipDirty) { isDirty = (cloudBinId && cloudApiKey) ? 1 : 0; }
        localStorage.setItem('drty', String(isDirty));
        updateSyncStatus();
    };

    const updateSyncStatus = () => {
        const el = document.getElementById('syncStatus'); if (!el) return;
        const s = [ {t:'本機儲存',c:'state-0'}, {t:'等待同步',c:'state-1'}, {t:'同步錯誤',c:'state-2'}, {t:'同步完成',c:'state-3'} ][isDirty] || {t:'本機儲存',c:'state-0'};
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
        const histTab = document.getElementById('profileHistoryTab'); if(histTab) histTab.classList.toggle('active', tab === 'history');
        if(tab === 'history') renderHistory();
    };

    const switchAwardTab = (tab) => {
        document.querySelectorAll('.sub-tabs .sub-tab-btn').forEach(b => b.classList.toggle('active', b.dataset.awardTab === tab));
        document.getElementById('positiveItems').classList.toggle('active', tab === 'positive');
        document.getElementById('needsWorkItems').classList.toggle('active', tab === 'needs-work');
        document.getElementById('customAwardArea').classList.toggle('active', tab === 'custom');
    };

    const openAwardModal = (ids, title, groupId = null) => {
        awardContextIds = ids;
        if(ids.length === 1) currentProfileId = ids[0]; 
        const header = document.getElementById('currentProfileName'); if(header) header.textContent = title;
        const profileModal = document.querySelector('.profile-modal');
        if(profileModal) profileModal.classList.toggle('modal-large', !!groupId);
        const mainTabs = document.querySelector('.profile-modal .main-tabs');
        if(mainTabs) mainTabs.classList.toggle('hidden', !!groupId);
        const editBtn = document.getElementById('editProfileBtn');
        if(editBtn) editBtn.classList.toggle('hidden', !!groupId);
        
        const histTabBtn = document.getElementById('profileHistoryTabBtn');
        if(histTabBtn) histTabBtn.classList.toggle('hidden', ids.length > 1);
        
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
        const now = Date.now(); let newIds = [];
        const isIgnore = !!forcedIgnore;
        awardContextIds.forEach(sid => { 
            classMeta.lNum = (classMeta.lNum || 0) + 1;
            const logId = 'L' + classMeta.lNum; 
            const logEntry = { id: logId, sID: sid, iID, lb, pt: Number(pt), TS: now };
            if(isIgnore) logEntry.iSum = 1;
            logs.push(logEntry); 
            newIds.push(logId); 
            const s = students.find(x => x.id === sid);
            if(s) {
                if(isIgnore) s.iP = (s.iP || 0) + Number(pt);
                else s.cP = (s.cP || 0) + Number(pt);
            }
        });
        saveData(); createPointAnimation(pt, awardContextIds.length); renderStudents(); if(currentView === 'groups') renderGroups();
        lastActionLogIds = newIds; showUndoToast(`${pt > 0 ? '+' : ''}${pt} 給予 ${awardContextIds.length} 位學生`);
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
                    <img src="${s.aU || generateAvatar(s.id, s.aS)}" style="width:24px; height:24px; border-radius:50%;">
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
                    <img src="${s.aU || generateAvatar(s.id, s.aS)}" style="width:24px; height:24px; border-radius:50%;">
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
        const item = pointItems[cat].find(i => i.id === itemId); if(!item) return;
        document.getElementById('editItemLabel').value = item.lb;
        document.getElementById('editItemValue').value = item.vl;
        document.getElementById('editItemIconBtn').textContent = item.ic;
        document.getElementById('editItemIgnore').checked = item.iSum === 1;
        openModal(document.getElementById('editPointItemModal'));
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
            card.innerHTML = `${isMultiSelectMode ? `<div class="selection-check">${selectedStudentIds.has(s.id) ? '✓' : ''}</div>` : ''}<div class="student-avatar-wrapper"><img src="${getAvatarUrl(s.aU||s.id, s.aS)}" class="student-avatar"><div class="${ptClass}">${total}</div></div><div class="student-name">${s.id}</div>`;
            grid.appendChild(card);
        });
    };

    const renderGroups = () => {
        const grid = document.getElementById('groupGrid'); if(!grid) return; grid.innerHTML = '';
        groups.forEach(g => {
            const card = document.createElement('div'); card.className = 'student-card group-card';
            let total = g.sIds.reduce((sum, sid) => { const s = students.find(x=>x.id===sid); return sum + (s ? ((s.cP||0) + (s.iP||0)) : 0); }, 0);
            const ptClass = 'student-points' + (total > 0 ? ' positive-total' : (total < 0 ? ' negative-total' : ''));
            card.innerHTML = `<button class="edit-group-inline-btn">⚙️</button><div class="group-icon">👥</div><div class="student-name">${g.id}</div><div class="group-member-count">${g.sIds.length} 位成員</div><div class="${ptClass}">${total > 0 ? '+' : ''}${total}</div>`;
            card.querySelector('.edit-group-inline-btn').onclick = (e) => { e.stopPropagation(); openManageGroupModal(g.id); };
            card.onclick = () => g.sIds.length ? openAwardModal(g.sIds, g.id, g.id) : alert('群組內沒有學生');
            grid.appendChild(card);
        });
        const create = document.createElement('div'); create.className = 'student-card create-group-card'; create.onclick = () => openManageGroupModal();
        create.innerHTML = `<div class="student-avatar" style="background:#f1f5f9;display:flex;align-items:center;justify-content:center;font-size:2rem;color:#94a3b8">+</div><div class="student-name">新增群組</div>`;
        grid.appendChild(create);
    };

    const renderPointItems = () => {
        const rGrid = (id, items, cat) => { const el = document.getElementById(id); if(!el) return; el.innerHTML = ''; items.slice().sort((a,b)=>a.lb.localeCompare(b.lb,'zh-TW')).forEach(item => { const btn = document.createElement('button'); btn.className = `point-item-btn ${cat}`; btn.innerHTML = `<div class="point-icon">${item.ic}</div><div class="point-label">${item.lb}${item.iSum===1?' (不計分)':''}</div><div class="point-value">${item.vl > 0 ? '+' : ''}${item.vl}</div>`; btn.onclick = () => awardPoints(item.id, item.lb, item.vl, item.iSum===1); el.appendChild(btn); }); };
        rGrid('positiveItems', pointItems.pos, 'positive'); rGrid('needsWorkItems', pointItems.neg, 'negative');
        const rList = (id, items, cat) => { const el = document.getElementById(id); if(!el) return; el.innerHTML = ''; items.slice().sort((a,b)=>a.lb.localeCompare(b.lb,'zh-TW')).forEach(item => { const div = document.createElement('div'); div.className = `point-item-btn ${cat==='pos'?'positive':'negative'}`; div.onclick = () => openEditPointItemModal(cat, item.id); div.innerHTML = `<div class="point-icon">${item.ic}</div><div class="point-label">${item.lb}${item.iSum===1?' <small>(不計分)</small>':''}</div><div class="point-value">${item.vl > 0 ? '+' : ''}${item.vl}</div><button class="remove-item-btn" onclick="event.stopPropagation(); window.removePointItem('${cat}', '${item.id}')">×</button>`; el.appendChild(div); }); };
        rList('settingsPositiveList', pointItems.pos, 'pos'); rList('settingsNeedsWorkList', pointItems.neg, 'neg');
    };

    window.removePointItem = (cat, id) => { if(!confirm('刪除此項目？')) return; pointItems[cat] = pointItems[cat].filter(i => i.id !== id); saveData(); renderPointItems(); };
    
    window.deleteLog = (id) => { 
        if(!confirm('刪除此紀錄？')) return; 
        const l = logs.find(x => x.id == id);
        if(l) {
            const s = students.find(x => x.id === l.sID);
            if(s) {
                if(l.iSum === 1) s.iP = (s.iP || 0) - l.pt;
                else s.cP = (s.cP || 0) - l.pt;
            }
        }
        logs = logs.filter(x => x.id != id); 
        saveData(); renderHistory(); renderStudents(); if(currentView === 'groups') renderGroups(); if(!document.getElementById('reportsModal').classList.contains('hidden')) window.renderReports(); 
    };
    
    const renderHistory = () => { 
        const list = document.getElementById('studentHistoryList'); if(!list) return; list.innerHTML = ''; 
        const f = logs.filter(l => l.sID === currentProfileId).sort((a,b)=>b.TS-a.TS); 
        if(!f.length) return list.innerHTML = '<li class="empty-state">無紀錄</li>'; 
        f.forEach(l => { 
            const li = document.createElement('li'); 
            li.innerHTML = `<div class="history-item-left"><span class="history-date">${new Date(l.TS).toLocaleString()}</span><span class="history-label">${l.lb}${l.iSum === 1 ? ' <small>(不計分)</small>' : ''}</span></div><div class="history-item-right ${l.pt > 0 ? 'positive-val' : 'negative-val'}">${l.pt > 0 ? '+' : ''}${l.pt}<button class="delete-log-btn" onclick="window.deleteLog('${l.id}')">🗑️</button></div>`; 
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
                    c.id = n; saveData(); renderClassSelector();
                }
            };
            li.querySelector('.archive-btn').onclick = () => { c.arc = !c.arc; saveData(); renderClassSelector(); };
            li.querySelector('.del-class-btn').onclick = () => { 
                if(confirm('刪除？')) { 
                    ['Stus','Gs','Ls','itm','set','meta'].forEach(suffix => {
                        localStorage.removeItem(`CD_${c.id}_${suffix}`);
                    });
                    classes = classes.filter(x=>x.id!==c.id); 
                    if(currentClassId===c.id) { 
                        currentClassId=classes[0]?.id || ''; 
                        localStorage.setItem('CD_cCId', currentClassId); 
                        loadClassData();
                    }
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
    const getFullBackupData = () => { 
        const b = {}; 
        for (let i = 0; i < localStorage.length; i++) { 
            const k = localStorage.key(i); 
            if (k.startsWith('CD_') || k === 'BId' || k === 'Key' || k === 'aSyn' || k === 'drty') { 
                try { b[k] = JSON.parse(localStorage.getItem(k)); } catch(e) { b[k] = localStorage.getItem(k); } 
            } 
        } 
        b.sVer = localSyncVersion || 0; 
        return b; 
    };
    const restoreFromBackup = (data, reload = true) => {
        Object.keys(data).forEach(k => { localStorage.setItem(k, typeof data[k] === 'string' ? data[k] : JSON.stringify(data[k])); });
        // 保護本地同步設定不被覆蓋
        localStorage.setItem('BId', cloudBinId); 
        localStorage.setItem('Key', cloudApiKey); 
        localStorage.setItem('aSyn', String(autoSyncInterval));
        if (reload) location.reload();
        else { 
            localSyncVersion = data.sVer || data.syncVersion || 0;
            localStorage.setItem('CD_sV', String(localSyncVersion));
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

    const performCloudUpload = async (isManual = false) => {
        if (!cloudBinId || !cloudApiKey || isSyncing) return;
        if (isManual && !confirm('確定上傳至雲端？')) return;
        if (!isManual && isDirty !== 1) return;
        isSyncing = true; updateSyncStatus();
        console.log('[CloudSync] 開始執行上傳同步流程...');
        try {
            const isUpstash = cloudBinId.includes('upstash.io'), h = isUpstash?{'Authorization':`Bearer ${cloudApiKey}`}:{'X-Access-Key':cloudApiKey};
            const url = isUpstash ? (cloudBinId.startsWith('http') ? `${cloudBinId}/GET/classKudox_backup` : cloudBinId) : (cloudBinId.startsWith('http') ? cloudBinId : `https://api.jsonbin.io/v3/b/${cloudBinId}/latest`);
            console.log('[CloudSync] 獲取雲端最新數據:', url);
            const getResp = await fetch(url, { headers: h });
            let cloudData = null; if (getResp.ok) { let r = await getResp.json(); cloudData = isUpstash?r.result:(r.record||r); if(typeof cloudData === 'string') cloudData = JSON.parse(cloudData); }
            const cloudVer = cloudData?.sVer || cloudData?.syncVersion || 0;
            console.log('[CloudSync] 雲端版本:', cloudVer, '本地版本:', localSyncVersion);
            if (!isManual && cloudVer !== 0 && cloudVer !== localSyncVersion) {
                console.log(`[CloudSync] 雲端版本 (${cloudVer}) 不同，自動背景下載覆蓋...`);
                await performCloudDownload(false); return;
            }
            let toPush = getFullBackupData();
            const newVer = Date.now(); toPush.sVer = newVer;
            const putUrl = isUpstash ? (cloudBinId.startsWith('http') ? `${cloudBinId}/SET/classKudox_backup` : cloudBinId) : (cloudBinId.startsWith('http') ? cloudBinId : `https://api.jsonbin.io/v3/b/${cloudBinId}`);
            console.log('[CloudSync] 推送數據至雲端:', putUrl);
            const putResp = await fetch(putUrl, { method: isUpstash?'POST':'PUT', headers: isUpstash?h:{...h,'Content-Type':'application/json'}, body: JSON.stringify(toPush) });
            if (putResp.ok) { 
                console.log(`[CloudSync] 同步成功，新版本: ${newVer} (${new Date(newVer).toTimeString().split(' ')[0]})`);
                if (cloudVer !== 0 && cloudVer !== localSyncVersion) restoreFromBackup(toPush, false); 
                else { localSyncVersion = newVer; localStorage.setItem('cdData_syncVersion', String(newVer)); isDirty = 3; updateSyncStatus(); } 
            } else { throw new Error('雲端寫入失敗'); }
        } catch(e) { console.error('[CloudSync] 錯誤:', e); isDirty = 2; updateSyncStatus(); } finally { isSyncing = false; }
    };

    const performCloudDownload = async (isManual = false) => {
        if(!cloudBinId || !cloudApiKey) return isManual ? alert('請先設定雲端') : null;
        console.log(`[CloudSync] ${isManual ? '手動' : '背景'}下載中...`);
        try {
            const isUpstash = cloudBinId.includes('upstash.io');
            const url = isUpstash ? (cloudBinId.startsWith('http') ? `${cloudBinId}/GET/classKudox_backup` : cloudBinId) : (cloudBinId.startsWith('http') ? cloudBinId : `https://api.jsonbin.io/v3/b/${cloudBinId}/latest`);
            const resp = await fetch(url, { headers: isUpstash ? {'Authorization':`Bearer ${cloudApiKey}`} : {'X-Access-Key':cloudApiKey} });
            if(resp.ok) { 
                let r = await resp.json(); let cloudData = isUpstash ? r.result : (r.record || r); if(typeof cloudData === 'string') cloudData = JSON.parse(cloudData);
                console.log('[CloudSync] 下載成功，執行還原...');
                restoreFromBackup(cloudData, isManual); // 手動才重整
            } else throw new Error('下載失敗');
        } catch(e) { console.error('[CloudSync] 下載錯誤:', e); if(isManual) alert(e.message); }
    };

    const checkCloudSyncState = async () => {
        if (!cloudBinId || !cloudApiKey) return;
        try {
            const isUpstash = cloudBinId.includes('upstash.io'), h = isUpstash?{'Authorization':`Bearer ${cloudApiKey}`}:{'X-Access-Key':cloudApiKey};
            const url = isUpstash ? (cloudBinId.startsWith('http') ? `${cloudBinId}/GET/classKudox_backup` : cloudBinId) : (cloudBinId.startsWith('http') ? cloudBinId : `https://api.jsonbin.io/v3/b/${cloudBinId}/latest`);
            const getResp = await fetch(url, { headers: h });
            if (getResp.ok) { 
                let r = await getResp.json(); let cloudData = isUpstash?r.result:(r.record||r); if(typeof cloudData === 'string') cloudData = JSON.parse(cloudData);
                const cloudVer = cloudData?.sVer || cloudData?.syncVersion || 0;
                console.log('[CloudSync] 預檢版本: 雲端', cloudVer, '本地', localSyncVersion);
                if (cloudVer !== 0 && cloudVer !== localSyncVersion) {
                    console.log(`[CloudSync] 預檢版本不同 (${cloudVer} vs ${localSyncVersion})，自動下載覆蓋...`);
                    await performCloudDownload();
                }
            }
        } catch(e) { console.error('[CloudSync] 預檢失敗:', e); }
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
        const list = document.getElementById('reportsList'); if(!list) return; list.innerHTML = '';
        const range = getReportsTimeRange();
        let data = students.map(s => {
            let pts = logs.filter(l => l.sID === s.id).reduce((sum, l) => {
                if (range && (l.TS < range.start || l.TS > range.end)) return sum;
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
            let f = logs.filter(log => { if(range && (log.TS < range.start || log.TS > range.end)) return false; if(currentProfileId && log.sID !== currentProfileId) return false; return true; }).sort((a,b)=>b.TS-a.TS);
            f.slice(0,50).forEach(log => {
                const s = students.find(x => x.id === log.sID);
                const li = document.createElement('li'); li.innerHTML = `<div class="history-item-left"><span class="history-date">${new Date(log.TS).toLocaleString()} • ${s?s.id:'未知'}</span><span class="history-label">${log.lb}${log.iSum === 1 ? ' <small>(不計分)</small>' : ''}</span></div><div class="history-item-right ${log.pt > 0 ? 'positive-val' : 'negative-val'}">${log.pt > 0 ? '+' : ''}${log.pt}<button class="delete-log-btn" onclick="window.deleteLog('${log.id}')">🗑️</button></div>`;
                alist.appendChild(li);
            });
            renderPieChart(f);
        }
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
            const oLen = cLogs.length; cLogs = cLogs.filter(l => l.TS >= threshold);
            if (cLogs.length !== oLen) {
                localStorage.setItem(lKey, JSON.stringify(cLogs));
                if (c.id === currentClassId) { logs = cLogs; } 
                dirty = true;
            }
        });
        if (dirty) {
            if (cloudBinId && cloudApiKey) { isDirty = 1; localStorage.setItem('cdData_isDirty', '1'); updateSyncStatus(); performCloudUpload(); }
            console.log('[System] 完成過期紀錄清理與瘦身');
        }
    };

    const sanitizeAndCleanDatabase = () => {
        let dirtySystem = false;
        const K_MAP = {
            'cdData_classes': 'CD_Cls',
            'cdData_currentClassId': 'CD_cCId',
            'cdData_cloudBinId': 'BId',
            'cdData_cloudApiKey': 'Key',
            'cdData_autoSyncInterval': 'aSyn',
            'cdData_syncVersion': 'CD_sV',
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
                if(sz) sz.textContent = `(約 ${(JSON.stringify(getFullBackupData()).length / 1024).toFixed(1)} KB)`; 
            } catch(e) {}
            openModal(document.getElementById('settingsModal')); applySettings(); renderPointItems(); 
        });
        wire('manageClassesBtn', () => { renderClassSelector(); openModal(document.getElementById('manageClassesModal')); });
        wire('reportsBtn', () => { currentProfileId = null; window.renderReports(); openModal(document.getElementById('reportsModal')); });
        wire('resetReportFilterBtn', () => { currentProfileId = null; document.getElementById('resetReportFilterBtn')?.classList.add('hidden'); document.getElementById('reportActivityTitle').textContent = '全班最近紀錄'; window.renderReports(); });
        wire('undoActionBtn', undoAction);
        wire('toggleMultiSelectBtn', toggleMultiSelectMode);
        wire('addStudentBtn', () => openModal(document.getElementById('addStudentModal')));
        
        document.querySelectorAll('.view-tab-btn').forEach(b => b.onclick = () => switchMainView(b.dataset.view));
        document.querySelectorAll('.close-modal-btn, .cancel-btn, .settings-close, .profile-close, .add-close, .edit-student-close, .classes-close, .group-close, .group-detail-close, .reports-close').forEach(b => b.onclick = () => closeModal(b.closest('.modal-overlay')));
        
        wire('cancelMultiBtn', toggleMultiSelectMode);
        wire('selectAllBtn', () => { if(selectedStudentIds.size === students.length) selectedStudentIds.clear(); else students.forEach(s => selectedStudentIds.add(s.id)); document.getElementById('multiSelectCount').textContent = `已選擇 ${selectedStudentIds.size} 位學生`; renderStudents(); });
        wire('multiAwardBtn', () => { if(!selectedStudentIds.size) return alert('請選擇學生'); openAwardModal(Array.from(selectedStudentIds), `已選 ${selectedStudentIds.size} 位`, null); });
        
        const wireSlider = (id, labelId, sk) => { const el = document.getElementById(id); if(el) el.oninput = (e) => { settings[sk] = parseInt(e.target.value); document.getElementById(labelId).textContent = e.target.value; applySettings(); saveData(); }; };
        wireSlider('gridColsRange', 'gridColsLabel', 'col'); wireSlider('cardHeightRange', 'cardHeightLabel', 'sCH'); wireSlider('groupHeightRange', 'groupHeightLabel', 'gCH'); wireSlider('groupColsRange', 'groupColsLabel', 'gCol'); wireSlider('itemColsRange', 'itemColsLabel', 'iCol');
        
        const fsSel = document.getElementById('fontSizeSelect'); if(fsSel) fsSel.onchange = (e) => { settings.ftS = e.target.value; applySettings(); saveData(); };
        const sSel = document.getElementById('enableSoundSetting'); if(sSel) sSel.onchange = (e) => { settings.eS = e.target.checked ? 1 : 0; saveData(); };
        const retSel = document.getElementById('logRetentionSetting'); if(retSel) retSel.onchange = (e) => { settings.lRet = parseInt(e.target.value); applySettings(); saveData(); performLogRetention(); };

        // --- 第二階段：資料載入與渲染 ---
        try {
            console.log('[System] 啟動資料載入與渲染流程...');
            sanitizeAndCleanDatabase();
            loadClassData(); 
            applySettings(); 
            renderStudents(); 
            renderPointItems(); 
            renderClassSelector();
            
            // 只有設定了自動同步頻率才在啟動時預載雲端資料
            if (autoSyncInterval > 0) checkCloudSyncState();
            performLogRetention();
        } catch (err) {
            console.error('[Critical Error] 系統載入失敗，但 UI 功能已嘗試載入:', err);
            alert('系統載入資料時發生錯誤，您可在「系統設定」->「危險區域」中嘗試重設系統。');
        }

        wire('editProfileBtn', () => { const s = students.find(x => x.id === currentProfileId); if(!s) return; document.getElementById('editStudentName').value = s.id; document.getElementById('editStudentAvatarStyle').value = s.aS || 'fe'; document.getElementById('editStudentAvatarPreview').src = getAvatarUrl(s.aU || s.id, s.aS); closeModal(document.getElementById('studentProfileModal')); openModal(document.getElementById('editStudentModal')); });
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
                // s.aU 已經在隨機或挑選時更新為 seed，若沒點過則保持原樣（可能是舊的或 null）
                saveData(); renderStudents(); closeModal(document.getElementById('editStudentModal')); 
            } else if(!nameInp.value.trim()) alert('請輸入姓名');
        });
        wire('deleteStudentBtn', () => { if(confirm('刪除？')) { students = students.filter(x => x.id !== currentProfileId); logs = logs.filter(x => x.sID !== currentProfileId); saveData(); renderStudents(); closeModal(document.getElementById('editStudentModal')); } });
        wire('saveStudentBtn', () => { 
            const i = document.getElementById('newStudentName'); if(!i.value.trim()) return; 
            i.value.split('\n').forEach(n => { 
                const name = n.trim(); if(name) {
                    if(students.some(s => s.id === name)) { console.warn('跳過重複姓名:', name); return; }
                    students.push({ id: name, cP: 0, iP: 0, aS: 'fe', aU: getRandomSeed() }); 
                }
            }); 
            saveData(); renderStudents(); i.value = ''; closeModal(document.getElementById('addStudentModal')); 
        });
        
        wire('saveGroupBtn', () => { const i = document.getElementById('groupNameInput'); const name = i.value.trim(); if(!name) return alert('請輸入名稱'); const sids = Array.from(document.querySelectorAll('#groupStudentSelectionGrid input:checked')).map(cb => cb.value); if(!sids.length) return alert('請選擇成員'); if(editingGroupId) { if(editingGroupId !== name && groups.some(x=>x.id===name)) return alert('群組名稱已存在'); const g = groups.find(x=>x.id===editingGroupId); g.id = name; g.sIds = sids; } else { if(groups.some(x=>x.id===name)) return alert('群組名稱已存在'); groups.push({ id: name, sIds: sids }); } saveData(); renderGroups(); closeModal(document.getElementById('manageGroupModal')); });
        wire('deleteGroupBtn', () => { if(confirm('刪除群組？')) { groups = groups.filter(x => x.id !== editingGroupId); saveData(); renderGroups(); closeModal(document.getElementById('manageGroupModal')); } });
        wire('groupAwardPointsBtn', () => { 
            if(!awardContextIds.length) return; 
            openAwardModal(awardContextIds, document.getElementById('groupDetailTitle').textContent, currentGroupIdForAward); 
            closeModal(document.getElementById('groupDetailModal')); 
        });
        wire('editGroupDetailBtn', () => { const g = groups.find(x => x.sIds.every(sid => awardContextIds.includes(sid)) && x.sIds.length === awardContextIds.length); if(g) openManageGroupModal(g.id); closeModal(document.getElementById('groupDetailModal')); });

        wire('saveCustomAwardBtn', () => { const l = document.getElementById('customAwardLabel').value.trim() || '自訂項目'; const v = parseInt(document.getElementById('customAwardValue').value) || 0; const ign = document.getElementById('customAwardIgnore').checked; awardPoints('custom', l, v, ign); });
        
        document.querySelectorAll('.tab-btn').forEach(b => b.onclick = () => switchProfileTab(b.dataset.profileTab));
        document.querySelectorAll('.sub-tab-btn').forEach(b => b.onclick = () => switchAwardTab(b.dataset.awardTab));
        document.querySelectorAll('.settings-tab-btn').forEach(b => b.onclick = () => { 
            document.querySelectorAll('.settings-tab-btn').forEach(x => x.classList.remove('active')); 
            b.classList.add('active'); 
            document.querySelectorAll('.settings-tab-content').forEach(x => x.classList.remove('active')); 
            const target = 'settings' + b.dataset.settingsTab.charAt(0).toUpperCase() + b.dataset.settingsTab.slice(1) + 'Tab';
            const el = document.getElementById(target); if(el) el.classList.add('active');
        });
        document.querySelectorAll('.sort-btn').forEach(b => b.onclick = () => { currentSort = b.dataset.sort; document.querySelectorAll('.sort-btn').forEach(x => x.classList.remove('active')); b.classList.add('active'); window.renderReports(); });
        
        wire('addPositiveBtn', () => { 
            const l = document.getElementById('newPositiveLabel'); const v = document.getElementById('newPositiveValue'); const i = document.getElementById('newPositiveIconBtn'); const ign = document.getElementById('newPositiveIgnore'); if(!l.value.trim()) return; 
            let val = isNaN(parseInt(v.value)) ? 1 : parseInt(v.value);
            if (val < 0) val = 0; // 最低 0 分
            if (pointItems.pos.some(x => x.lb === l.value.trim() && x.vl === val)) return alert('項目名稱與分數已存在，請勿重複新增');
            classMeta.pNum = (classMeta.pNum || 0) + 1;
            const item = { id: 'p'+classMeta.pNum, lb: l.value.trim(), vl: val, ic: i.textContent };
            if (ign.checked) item.iSum = 1;
            pointItems.pos.push(item); saveData(); renderPointItems(); l.value = ''; v.value = '1'; 
        });
        wire('addNeedsWorkBtn', () => { 
            const l = document.getElementById('newNeedsWorkLabel'); const v = document.getElementById('newNeedsWorkValue'); const i = document.getElementById('newNeedsWorkIconBtn'); const ign = document.getElementById('newNeedsWorkIgnore'); if(!l.value.trim()) return; 
            let val = isNaN(parseInt(v.value)) ? -1 : parseInt(v.value);
            if (val > 0) val = 0; // 最高 0 分
            if (pointItems.neg.some(x => x.lb === l.value.trim() && x.vl === val)) return alert('項目名稱與分數已存在，請勿重複新增');
            classMeta.nNum = (classMeta.nNum || 0) + 1;
            const item = { id: 'n'+classMeta.nNum, lb: l.value.trim(), vl: val, ic: i.textContent };
            if (ign.checked) item.iSum = 1;
            pointItems.neg.push(item); saveData(); renderPointItems(); l.value = ''; v.value = '-1'; 
        });
        
        wire('saveEditItemBtn', () => {
            if(!editingPointItemId || !editingPointItemCat) return;
            const l = document.getElementById('editItemLabel').value.trim();
            const v = parseInt(document.getElementById('editItemValue').value) || 0;
            const item = pointItems[editingPointItemCat].find(i => i.id === editingPointItemId);
            if(item) {
                item.lb = l; item.vl = v; item.ic = document.getElementById('editItemIconBtn').textContent;
                if(document.getElementById('editItemIgnore').checked) item.iSum = 1; else delete item.iSum;
                saveData(); renderPointItems(); closeModal(document.getElementById('editPointItemModal'));
            }
        });

        wire('createClassBtn', () => { 
            const nInp = document.getElementById('newClassName');
            const n = nInp.value.trim(); if(!n) return; 
            if(classes.some(c => c.id === n)) return alert('班級名稱已存在');
            
            // 預設為系統預設項目 (而非純空白)
            let items = JSON.parse(JSON.stringify(defaultItems));
            let s = [], g = [];
            let cm = { 
                pNum: items.pos.length, 
                nNum: items.neg.length, 
                lNum: 0 
            };
            
            const src = document.getElementById('copyFromClassSelect').value; 
            const copyItems = document.getElementById('copyItemsCheckbox').checked;
            const copyStudents = document.getElementById('copyStudentsCheckbox').checked;

            if (src) { 
                console.log(`[System] 建立新班級 "${n}"，來源班級: "${src}"`);
                if (copyItems) {
                    const siValue = localStorage.getItem(`CD_${src}_itm`);
                    const si = siValue ? JSON.parse(siValue) : null;
                    if (si) {
                        items.pos = (si.pos||[]).sort((a,b)=>a.lb.localeCompare(b.lb, 'zh-TW')).map((x, i) => ({...x, id: 'p'+(i+1)}));
                        items.neg = (si.neg||[]).sort((a,b)=>a.lb.localeCompare(b.lb, 'zh-TW')).map((x, i) => ({...x, id: 'n'+(i+1)}));
                        cm.pNum = items.pos.length;
                        cm.nNum = items.neg.length;
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
            
            // 確保計數器與當前 items 長度同步
            cm.pNum = items.pos.length;
            cm.nNum = items.neg.length;

            classes.push({ id: n }); 
            
            // 重點：在切換 ID 與 saveData 之前，必須先更新全域狀態指標，否則 saveData 會把舊班級資料存入新 Key 中
            students = s;
            pointItems = items;
            groups = g;
            classMeta = cm;
            logs = []; // 新班級紀錄必為空
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
        
        const binInp = document.getElementById('cloudBinId'); if(binInp) { binInp.value = cloudBinId; binInp.onchange = (e) => { cloudBinId = e.target.value; saveData(); if (autoSyncInterval > 0) checkCloudSyncState(); }; }
        const keyInp = document.getElementById('cloudApiKey'); if(keyInp) { keyInp.value = cloudApiKey; keyInp.onchange = (e) => { cloudApiKey = e.target.value; saveData(); if (autoSyncInterval > 0) checkCloudSyncState(); }; }
        const ivInp = document.getElementById('autoSyncInterval'); if(ivInp) { ivInp.value = autoSyncInterval; ivInp.onchange = (e) => { autoSyncInterval = parseInt(e.target.value); saveData(); }; }

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
                    classMeta.pNum = Math.max(30, ...pointItems.pos.map(x => parseInt(x.id.substring(1))||0));
                    classMeta.nNum = Math.max(30, ...pointItems.neg.map(x => parseInt(x.id.substring(1))||0));
                    saveData(); renderPointItems(); alert('行為項目已成功覆蓋綁定！');
                }
            }
        });

        wire('copyPointsBtn', () => {
            const range = getReportsTimeRange();
            let data = students.map(s => {
                let pts = logs.filter(l => l.sID === s.id).reduce((sum, l) => {
                    if (range && (l.TS < range.start || l.TS > range.end)) return sum;
                    return sum + (l.iSum === 1 ? 0 : l.pt);
                }, 0);
                return { name: s.id, pts };
            });
            if (currentSort === 'name') data.sort((a,b) => a.name.localeCompare(b.name, 'zh-TW')); 
            else data.sort((a,b) => b.pts - a.pts);

            const text = data.map(d => `${d.pts}`).join('\n');
            navigator.clipboard.writeText(text).then(() => alert('已按目前排序複製點數'));
        });

        wire('exportCsvBtn', () => {
            const range = getReportsTimeRange();
            let csv = '\uFEFF姓名,項目,點數,時間\n';
            logs.filter(l => {
                if (range && (l.TS < range.start || l.TS > range.end)) return false;
                if (currentProfileId && l.sID !== currentProfileId) return false;
                return true;
            }).forEach(l => {
                const s = students.find(x => x.id === l.sID);
                csv += `"${s?s.id:'未知'}","${l.lb}",${l.pt},"${new Date(l.TS).toLocaleString()}"\n`;
            });
            const b = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = 'report.csv'; a.click();
        });

        const rRange = document.getElementById('timeRangeFilter'); if(rRange) {
            rRange.onchange = () => {
                const cu = document.getElementById('customDateContainer'); if(cu) cu.classList.toggle('hidden', rRange.value !== 'custom');
                window.renderReports();
            };
        }
        const sD = document.getElementById('startDateFilter'); if(sD) sD.onchange = window.renderReports;
        const eD = document.getElementById('endDateFilter'); if(eD) eD.onchange = window.renderReports;

        wire('exportJsonBtn', () => { const b = getFullBackupData(); const blo = new Blob([JSON.stringify(b, null, 2)], {type:'application/json'}); const a = document.createElement('a'); a.href = URL.createObjectURL(blo); a.download = 'ClassKudox.json'; a.click(); });
        wire('importJsonBtn', () => document.getElementById('importJsonFile')?.click());
        const iFile = document.getElementById('importJsonFile'); if(iFile) iFile.onchange = (e) => { const f = e.target.files[0]; if(!f) return; const r = new FileReader(); r.onload = (ev) => { try { restoreFromBackup(JSON.parse(ev.target.result)); } catch(err) { alert('失敗'); } }; r.readAsText(f); };
        
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

        if(autoSyncInterval > 0) setInterval(performCloudUpload, Math.max(autoSyncInterval, 15) * 1000);
    };

    const createPointAnimation = (pts, count) => { for(let i=0; i<Math.min(count, 5); i++) { const el = document.createElement('div'); el.className = 'point-animation'; el.textContent = `${pts>0?'+':''}${pts}`; el.style.color = pts>0?'var(--positive-color)':'var(--negative-color)'; el.style.left = (50+Math.random()*10-5)+'%'; el.style.top = (40+Math.random()*10-5)+'%'; document.body.appendChild(el); setTimeout(() => el.remove(), 1000); } };

    // --- Start ---
    bootSequence();
});
