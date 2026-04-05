document.addEventListener('DOMContentLoaded', () => {

    // --- State & Settings ---
    let classes = JSON.parse(localStorage.getItem('cdData_classes')) || [];
    let currentClassId = localStorage.getItem('cdData_currentClassId');
    let deletedClassIds = JSON.parse(localStorage.getItem('cdData_deletedClassIds')) || [];
    let cloudBinId = localStorage.getItem('cdData_cloudBinId') || '';
    let cloudApiKey = localStorage.getItem('cdData_cloudApiKey') || '';
    let autoSyncInterval = parseInt(localStorage.getItem('cdData_autoSyncInterval')) || 0;
    let localSyncVersion = parseInt(localStorage.getItem('cdData_syncVersion')) || 0;

    const defaultItems = {
        positive: [
            { id: 'p1', label: '幫助他人', value: 1, icon: '🤝', ignoreTotal: false },
            { id: 'p2', label: '專心上課', value: 1, icon: '🎯', ignoreTotal: false },
            { id: 'p3', label: '踴躍參與', value: 1, icon: '🙋', ignoreTotal: false },
            { id: 'p4', label: '努力學習', value: 1, icon: '💪', ignoreTotal: false },
        ],
        needsWork: [
            { id: 'n1', label: '不專心', value: -1, icon: '📵', ignoreTotal: false },
            { id: 'n2', label: '上課講話', value: -1, icon: '🗣️', ignoreTotal: false },
            { id: 'n3', label: '未帶學用品', value: -1, icon: '🤷', ignoreTotal: false },
        ]
    };

    if (classes.length === 0) {
        let firstClassId = 'class_' + Date.now();
        classes.push({ id: firstClassId, name: '我的班級' });
        currentClassId = firstClassId;
        localStorage.setItem('cdData_classes', JSON.stringify(classes));
        localStorage.setItem('cdData_currentClassId', currentClassId);
    } else if (!currentClassId || !classes.find(c => c.id === currentClassId)) {
        currentClassId = classes[0]?.id || '';
        localStorage.setItem('cdData_currentClassId', currentClassId);
    }

    let students = [], groups = [], logs = [], pointItems = null, settings = null;
    const DEFAULT_SETTINGS = { fontSize: 'medium', columns: 5, groupColumns: 2, itemColumns: 3, enableSound: false, studentCardHeight: 0, groupCardHeight: 0 };

    const loadClassData = () => {
        if(!currentClassId) return;
        students = JSON.parse(localStorage.getItem(`cdData_${currentClassId}_students`)) || [];
        groups = JSON.parse(localStorage.getItem(`cdData_${currentClassId}_groups`)) || [];
        logs = JSON.parse(localStorage.getItem(`cdData_${currentClassId}_logs`)) || [];
        const storedItems = JSON.parse(localStorage.getItem(`cdData_${currentClassId}_items`));
        pointItems = storedItems || JSON.parse(JSON.stringify(defaultItems));
        const storedSettings = JSON.parse(localStorage.getItem(`cdData_${currentClassId}_settings`)) || {};
        const { cloudBinId: _b, cloudApiKey: _k, autoSyncInterval: _a, ...cleaned } = storedSettings;
        settings = Object.assign({}, DEFAULT_SETTINGS, cleaned);
    };

    let currentView = 'students', isMultiSelectMode = false, selectedStudentIds = new Set();
    let isDirty = Number(localStorage.getItem('cdData_isDirty')) || ((cloudBinId && cloudApiKey) ? 3 : 0), isSyncing = false, autoSyncTimer = null; 
    let awardContextIds = [], currentProfileId = null, editingGroupId = null, currentGroupIdForAward = null, editingPointItemId = null, editingPointItemCat = null, lastActionLogIds = [], undoTimeout = null, currentSort = 'score';

    const saveData = (skipDirty = false) => {
        if(!currentClassId) return;
        localStorage.setItem('cdData_classes', JSON.stringify(classes));
        localStorage.setItem('cdData_currentClassId', currentClassId || '');
        localStorage.setItem('cdData_deletedClassIds', JSON.stringify(deletedClassIds));
        localStorage.setItem('cdData_cloudBinId', cloudBinId);
        localStorage.setItem('cdData_cloudApiKey', cloudApiKey);
        localStorage.setItem('cdData_autoSyncInterval', String(autoSyncInterval));
        localStorage.setItem('cdData_syncVersion', String(localSyncVersion));
        localStorage.setItem(`cdData_${currentClassId}_students`, JSON.stringify(students));
        localStorage.setItem(`cdData_${currentClassId}_groups`, JSON.stringify(groups));
        localStorage.setItem(`cdData_${currentClassId}_logs`, JSON.stringify(logs));
        localStorage.setItem(`cdData_${currentClassId}_items`, JSON.stringify(pointItems));
        localStorage.setItem(`cdData_${currentClassId}_settings`, JSON.stringify(settings));
        if (!skipDirty) { isDirty = (cloudBinId && cloudApiKey) ? 1 : 0; }
        localStorage.setItem('cdData_isDirty', String(isDirty));
        updateSyncStatus();
    };

    const updateSyncStatus = () => {
        const el = document.getElementById('syncStatus'); if (!el) return;
        const s = [ {t:'本機儲存',c:'state-0'}, {t:'等待同步',c:'state-1'}, {t:'同步錯誤',c:'state-2'}, {t:'同步完成',c:'state-3'} ][isDirty] || {t:'本機儲存',c:'state-0'};
        el.textContent = s.t; el.className = 'sync-badge ' + s.c;
    };

    const applySettings = () => {
        if(!settings) return;
        document.body.dataset.fontSize = settings.fontSize;
        document.documentElement.style.setProperty('--grid-cols', settings.columns);
        document.documentElement.style.setProperty('--group-grid-cols', settings.groupColumns || 2);
        document.documentElement.style.setProperty('--item-grid-cols', settings.itemColumns || 3);
        document.documentElement.style.setProperty('--student-card-height', (settings.studentCardHeight || 0) + 'px');
        document.documentElement.style.setProperty('--group-card-height', (settings.groupCardHeight || 0) + 'px');
        const setVal = (id, val) => { const el = document.getElementById(id); if(el) el.value = val; };
        const setTxt = (id, val) => { const el = document.getElementById(id); if(el) el.textContent = val; };
        setVal('fontSizeSelect', settings.fontSize); setVal('gridColsRange', settings.columns); setTxt('gridColsLabel', settings.columns);
        setVal('cardHeightRange', settings.studentCardHeight); setTxt('cardHeightLabel', settings.studentCardHeight);
        setVal('groupHeightRange', settings.groupCardHeight); setTxt('groupHeightLabel', settings.groupCardHeight);
        setVal('groupColsRange', settings.groupColumns || 2); setTxt('groupColsLabel', settings.groupColumns || 2);
        setVal('itemColsRange', settings.itemColumns || 3); setTxt('itemColsLabel', settings.itemColumns || 3);
        const ss = document.getElementById('enableSoundSetting'); if(ss) ss.checked = settings.enableSound;
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
                g.studentIds.forEach(sid => {
                    const s = students.find(x => x.id === sid); if(!s) return;
                    const total = logs.filter(l => l.studentId === s.id).reduce((sum, l) => sum + l.points, 0);
                    const div = document.createElement('div');
                    div.style = "display:flex; align-items:center; gap:0.5rem; padding:8px 12px; border:1.5px solid var(--primary-color); border-radius:12px; background:white; font-size:0.95rem; box-shadow: 0 4px 6px rgba(0,0,0,0.05); flex-shrink:0;";
                    div.innerHTML = `<img src="${s.avatarUrl || generateAvatar(s.name, s.avatarStyle)}" style="width:28px; height:28px; border-radius:50%; border:1px solid var(--border-color);">
                        <span style="font-weight:700;">${s.name} <b style="color:var(--primary-color); margin-left:4px;">(${total})</b></span>`;
                    peek.appendChild(div);
                });
            }
        } else if(peek) { peek.classList.add('hidden'); }
        switchProfileTab('award'); openModal(document.getElementById('studentProfileModal')); 
    };

    const generateAvatar = (name, style = 'fun-emoji') => `https://api.dicebear.com/7.x/${style}/svg?seed=${encodeURIComponent(name)}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf`;

    const toggleStudentSelection = (id) => { 
        selectedStudentIds.has(id) ? selectedStudentIds.delete(id) : selectedStudentIds.add(id); 
        const el = document.getElementById('multiSelectCount'); if(el) el.textContent = `已選擇 ${selectedStudentIds.size} 位學生`; 
        renderStudents(); 
    };

    const awardPoints = (itemId, label, points, forcedIgnore = null) => {
        if(!awardContextIds.length) return;
        const now = Date.now(); let newIds = [];
        awardContextIds.forEach(sid => { const logId = now + Math.random(); logs.push({ id: logId, studentId: sid, itemId, label, points: Number(points), timestamp: now, ignoreTotal: !!forcedIgnore }); newIds.push(logId); });
        saveData(); createPointAnimation(points, awardContextIds.length); renderStudents(); if(currentView === 'groups') renderGroups();
        lastActionLogIds = newIds; showUndoToast(`${points > 0 ? '+' : ''}${points} 給予 ${awardContextIds.length} 位學生`);
        if(isMultiSelectMode) toggleMultiSelectMode();
        setTimeout(() => closeModal(document.getElementById('studentProfileModal')), 400);
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
            if(nameInp) nameInp.value = g.name;
            students.forEach(s => {
                const checked = g.studentIds.includes(s.id);
                const total = logs.filter(l => l.studentId === s.id).reduce((sum, l) => sum + l.points, 0);
                grid.innerHTML += `<label class="selection-item" style="display:flex; align-items:center; gap:0.5rem; padding:8px; border:1px solid var(--border-color); border-radius:10px; background:white;">
                    <input type="checkbox" value="${s.id}" ${checked ? 'checked' : ''}>
                    <img src="${s.avatarUrl || generateAvatar(s.name, s.avatarStyle)}" style="width:24px; height:24px; border-radius:50%;">
                    <span style="font-size:0.9rem;">${s.name} (${total})</span>
                </label>`;
            });
            document.getElementById('deleteGroupBtn').classList.remove('hidden');
        } else {
            if(title) title.textContent = '新增群組';
            if(nameInp) nameInp.value = '';
            students.forEach(s => {
                const total = logs.filter(l => l.studentId === s.id).reduce((sum, l) => sum + l.points, 0);
                grid.innerHTML += `<label class="selection-item" style="display:flex; align-items:center; gap:0.5rem; padding:8px; border:1px solid var(--border-color); border-radius:10px; background:white;">
                    <input type="checkbox" value="${s.id}">
                    <img src="${s.avatarUrl || generateAvatar(s.name, s.avatarStyle)}" style="width:24px; height:24px; border-radius:50%;">
                    <span style="font-size:0.9rem;">${s.name} (${total})</span>
                </label>`;
            });
            document.getElementById('deleteGroupBtn').classList.add('hidden');
        }
        openModal(document.getElementById('manageGroupModal'));
    };

    const openGroupDetailModal = (g) => {
        const title = document.getElementById('groupDetailTitle'); if(title) title.textContent = g.name;
        const list = document.getElementById('groupDetailStudentList'); if(list) {
            list.innerHTML = '';
            g.studentIds.forEach(sid => {
                const s = students.find(x => x.id === sid); if(!s) return;
                const li = document.createElement('li'); li.innerHTML = `<img src="${s.avatarUrl || generateAvatar(s.name, s.avatarStyle)}" class="student-avatar small-avatar"><span>${s.name}</span>`;
                list.appendChild(li);
            });
        }
        awardContextIds = g.studentIds;
        currentGroupIdForAward = g.id; // Store for award modal
        openModal(document.getElementById('groupDetailModal'));
    };

    const openEditPointItemModal = (cat, itemId) => {
        editingPointItemCat = cat; editingPointItemId = itemId;
        const item = pointItems[cat].find(i => i.id === itemId); if(!item) return;
        document.getElementById('editItemLabel').value = item.label;
        document.getElementById('editItemValue').value = item.value;
        document.getElementById('editItemIconBtn').textContent = item.icon;
        document.getElementById('editItemIgnore').checked = !!item.ignoreTotal;
        openModal(document.getElementById('editPointItemModal'));
    };

    const showUndoToast = (m) => { 
        const el = document.getElementById('undoMessage'); if(el) el.textContent = m; 
        const toast = document.getElementById('undoToast'); if(toast) toast.classList.remove('hidden'); 
        if(undoTimeout) clearTimeout(undoTimeout); 
        // 依照使用者要求，不自動消失：undoTimeout = setTimeout(() => { const t = document.getElementById('undoToast'); if(t) t.classList.add('hidden'); }, 5000); 
    };

    const undoAction = () => {
        if (!lastActionLogIds.length) return;
        const set = new Set(lastActionLogIds);
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
        [...students].sort((a,b) => a.name.localeCompare(b.name, 'zh-TW')).forEach(s => {
            const card = document.createElement('div'); card.className = 'student-card' + (selectedStudentIds.has(s.id) ? ' selected' : '');
            card.onclick = () => isMultiSelectMode ? toggleStudentSelection(s.id) : openAwardModal([s.id], s.name, null);
            let total = logs.filter(l => l.studentId === s.id).reduce((sum, l) => sum + l.points, 0);
            const ptClass = 'student-points' + (total > 0 ? ' positive-total' : (total < 0 ? ' negative-total' : ''));
            card.innerHTML = `${isMultiSelectMode ? `<div class="selection-check">${selectedStudentIds.has(s.id) ? '✓' : ''}</div>` : ''}<div class="student-avatar-wrapper"><img src="${s.avatarUrl || generateAvatar(s.name, s.avatarStyle)}" class="student-avatar"><div class="${ptClass}">${total}</div></div><div class="student-name">${s.name}</div>`;
            grid.appendChild(card);
        });
    };

    const renderGroups = () => {
        const grid = document.getElementById('groupGrid'); if(!grid) return; grid.innerHTML = '';
        groups.forEach(g => {
            const card = document.createElement('div'); card.className = 'student-card group-card';
            let total = g.studentIds.reduce((sum, sid) => sum + logs.filter(l => l.studentId === sid).reduce((s, log) => s + log.points, 0), 0);
            const ptClass = 'student-points' + (total > 0 ? ' positive-total' : (total < 0 ? ' negative-total' : ''));
            card.innerHTML = `<button class="edit-group-inline-btn">⚙️</button><div class="group-icon">👥</div><div class="student-name">${g.name}</div><div class="group-member-count">${g.studentIds.length} 位成員</div><div class="${ptClass}">${total > 0 ? '+' : ''}${total}</div>`;
            card.querySelector('.edit-group-inline-btn').onclick = (e) => { e.stopPropagation(); openManageGroupModal(g.id); };
            card.onclick = () => g.studentIds.length ? openAwardModal(g.studentIds, g.name, g.id) : alert('群組內沒有學生');
            grid.appendChild(card);
        });
        const create = document.createElement('div'); create.className = 'student-card create-group-card'; create.onclick = () => openManageGroupModal();
        create.innerHTML = `<div class="student-avatar" style="background:#f1f5f9;display:flex;align-items:center;justify-content:center;font-size:2rem;color:#94a3b8">+</div><div class="student-name">新增群組</div>`;
        grid.appendChild(create);
    };

    const renderPointItems = () => {
        const rGrid = (id, items, cat) => { const el = document.getElementById(id); if(!el) return; el.innerHTML = ''; items.slice().sort((a,b)=>a.label.localeCompare(b.label,'zh-TW')).forEach(item => { const btn = document.createElement('button'); btn.className = `point-item-btn ${cat}`; btn.innerHTML = `<div class="point-icon">${item.icon}</div><div class="point-label">${item.label}</div><div class="point-value">${item.value > 0 ? '+' : ''}${item.value}</div>`; btn.onclick = () => awardPoints(item.id, item.label, item.value, item.ignoreTotal); el.appendChild(btn); }); };
        rGrid('positiveItems', pointItems.positive, 'positive'); rGrid('needsWorkItems', pointItems.needsWork, 'negative');
        const rList = (id, items, cat) => { const el = document.getElementById(id); if(!el) return; el.innerHTML = ''; items.slice().sort((a,b)=>a.label.localeCompare(b.label,'zh-TW')).forEach(item => { const div = document.createElement('div'); div.className = `point-item-btn ${cat==='positive'?'positive':'negative'}`; div.onclick = () => openEditPointItemModal(cat, item.id); div.innerHTML = `<div class="point-icon">${item.icon}</div><div class="point-label">${item.label}</div><div class="point-value">${item.value > 0 ? '+' : ''}${item.value}</div><button class="remove-item-btn" onclick="event.stopPropagation(); window.removePointItem('${cat}', '${item.id}')">×</button>`; el.appendChild(div); }); };
        rList('settingsPositiveList', pointItems.positive, 'positive'); rList('settingsNeedsWorkList', pointItems.needsWork, 'needsWork');
    };

    window.removePointItem = (cat, id) => { if(!confirm('刪除此項目？')) return; pointItems[cat] = pointItems[cat].filter(i => i.id !== id); saveData(); renderPointItems(); };
    
    window.deleteLog = (id) => { if(!confirm('刪除此紀錄？')) return; logs = logs.filter(l => l.id != id); saveData(); renderHistory(); renderStudents(); if(currentView === 'groups') renderGroups(); if(!document.getElementById('reportsModal').classList.contains('hidden')) window.renderReports(); };
    
    const renderHistory = () => { 
        const list = document.getElementById('studentHistoryList'); if(!list) return; list.innerHTML = ''; 
        const f = logs.filter(l => l.studentId === currentProfileId).sort((a,b)=>b.timestamp-a.timestamp); 
        if(!f.length) return list.innerHTML = '<li class="empty-state">無紀錄</li>'; 
        f.forEach(l => { 
            const li = document.createElement('li'); 
            li.innerHTML = `<div class="history-item-left"><span class="history-date">${new Date(l.timestamp).toLocaleString()}</span><span class="history-label">${l.label}</span></div><div class="history-item-right ${l.points > 0 ? 'positive-val' : 'negative-val'}">${l.points > 0 ? '+' : ''}${l.points}<button class="delete-log-btn" onclick="window.deleteLog(${l.id})">🗑️</button></div>`; 
            list.appendChild(li); 
        }); 
    };

    const renderClassSelector = () => {
        const classSelect = document.getElementById('classSelect'); if(!classSelect) return;
        classSelect.innerHTML = '';
        classes.filter(c => !c.isArchived || c.id === currentClassId).forEach(c => { const opt = document.createElement('option'); opt.value = c.id; opt.textContent = c.name + (c.isArchived ? ' (封存)' : ''); if(c.id === currentClassId) opt.selected = true; classSelect.appendChild(opt); });
        classSelect.onchange = async (e) => { 
            const newId = e.target.value;
            if (isDirty === 1) {
                isSyncing = true; updateSyncStatus();
                try { await performCloudUpload(); } catch(err) { console.error('切換班級前同步失敗', err); }
            }
            currentClassId = newId; localStorage.setItem('cdData_currentClassId', currentClassId); location.reload(); 
        };
        const l = document.getElementById('classList'); if(l) { l.innerHTML = ''; classes.forEach(c => {
            const li = document.createElement('li'); li.innerHTML = `<span style="${c.isArchived?'text-decoration:line-through;color:#94a3b8;':''}">${c.name}</span><div style="display:flex;gap:0.4rem;"><button class="rename-class-btn btn secondary-btn small-btn">✏️ 修改名稱</button><button class="archive-btn btn small-btn">${c.isArchived?'解封存':'封存'}</button><button class="del-class-btn btn negative-btn small-btn">🗑️</button></div>`;
            li.querySelector('.rename-class-btn').onclick = () => {
                const newName = prompt('請輸入新的班級名稱：', c.name);
                if (newName && newName.trim() && newName.trim() !== c.name) {
                    if (classes.some(x => x.name === newName.trim())) return alert('班級名稱已存在');
                    c.name = newName.trim();
                    saveData();
                    renderClassSelector();
                }
            };
            li.querySelector('.archive-btn').onclick = () => { c.isArchived = !c.isArchived; saveData(); renderClassSelector(); };
            li.querySelector('.del-class-btn').onclick = () => { if(confirm('刪除？')) { classes = classes.filter(x=>x.id!==c.id); if(currentClassId===c.id) currentClassId=classes[0]?.id || ''; saveData(); location.reload(); } };
            l.appendChild(li);
        }); }
        const cs = document.getElementById('copyFromClassSelect'); if(cs) { cs.innerHTML = '<option value="">不複製 (空白)</option>'; classes.forEach(c => { const opt = document.createElement('option'); opt.value = c.id; opt.textContent = c.name; cs.appendChild(opt); }); }
    };

    // --- Sync Logic ---
    const getFullBackupData = () => { const b = {}; for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k.startsWith('cdData_') && k !== 'cdData_cloudBinId' && k !== 'cdData_cloudApiKey' && k !== 'cdData_syncVersion') { try { b[k] = JSON.parse(localStorage.getItem(k)); } catch(e) { b[k] = localStorage.getItem(k); } } } b.syncVersion = localSyncVersion; return b; };
    const restoreFromBackup = (data, reload = true) => {
        const bin = cloudBinId, key = cloudApiKey, iv = autoSyncInterval;
        Object.keys(data).forEach(k => { if(k.startsWith('cdData_')) {
            localStorage.setItem(k, typeof data[k] === 'string' ? data[k] : JSON.stringify(data[k]));
        } });
        localStorage.setItem('cdData_cloudBinId', bin); localStorage.setItem('cdData_cloudApiKey', key); localStorage.setItem('cdData_autoSyncInterval', String(iv));
        if (data.syncVersion) { localSyncVersion = data.syncVersion; localStorage.setItem('cdData_syncVersion', String(localSyncVersion)); }
        if (reload) location.reload();
        else { 
            loadClassData(); 
            if (data.syncVersion) { localSyncVersion = data.syncVersion; localStorage.setItem('cdData_syncVersion', String(localSyncVersion)); }
            isDirty = 3; applySettings(); renderStudents(); if(currentView === 'groups') renderGroups(); renderPointItems(); renderClassSelector(); updateSyncStatus();
        }
    };
    const mergeLocalIntoCloud = (cloud) => {
        const merged = { ...cloud };
        for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i); if (!k.startsWith('cdData_') || k === 'cdData_cloudBinId' || k === 'cdData_cloudApiKey' || k === 'cdData_syncVersion') continue;
            let lv; try { lv = JSON.parse(localStorage.getItem(k)); } catch(e) { lv = localStorage.getItem(k); }
            const cv = cloud[k];
            if (k === 'cdData_classes' && Array.isArray(lv) && Array.isArray(cv)) {
                const m = new Map(); cv.forEach(c => m.set(c.name, c));
                lv.forEach(l => { if (!m.has(l.name)) m.set(l.name, l); });
                merged[k] = Array.from(m.values());
            } else if (k === 'cdData_deletedClassIds' && Array.isArray(lv) && Array.isArray(cv)) {
                merged[k] = Array.from(new Set([...lv, ...cv]));
            } else if ((k.includes('_students') || k.includes('_groups')) && Array.isArray(lv) && Array.isArray(cv)) {
                const m = new Map(); cv.forEach(c => m.set(String(c.id), c));
                lv.forEach(l => { const ext = m.get(String(l.id)); if (!ext || (l.lastUpdated || 0) > (ext.lastUpdated || 0)) m.set(String(l.id), l); });
                merged[k] = Array.from(m.values());
            } else if (k.includes('_items') && lv && cv) {
                const mi = { positive: new Map(), needsWork: new Map() };
                ['positive', 'needsWork'].forEach(cat => { if(cv[cat]) cv[cat].forEach(c => mi[cat].set(String(c.id), c)); if(lv[cat]) lv[cat].forEach(l => { const ext = mi[cat].get(String(l.id)); if(!ext || (l.lastUpdated || 0) > (ext.lastUpdated || 0)) mi[cat].set(String(l.id), l); }); });
                merged[k] = { positive: Array.from(mi.positive.values()), needsWork: Array.from(mi.needsWork.values()) };
            } else if (k.includes('_logs') && Array.isArray(lv) && Array.isArray(cv)) {
                const lm = new Map(); cv.forEach(c => lm.set(String(c.id), c)); lv.forEach(l => lm.set(String(l.id), l)); merged[k] = Array.from(lm.values());
            } else { merged[k] = lv; }
        }
        return merged;
    };

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
            const cloudVer = cloudData?.syncVersion || 0;
            console.log('[CloudSync] 雲端版本:', cloudVer, '本地版本:', localSyncVersion);
            if (!isManual && cloudVer !== 0 && cloudVer !== localSyncVersion) {
                console.log(`[CloudSync] 雲端版本 (${cloudVer}) 不同，自動下載覆蓋...`);
                await performCloudDownload(); return;
            }
            let toPush = getFullBackupData();
            const newVer = Date.now(); toPush.syncVersion = newVer;
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

    const performCloudDownload = async () => {
        if(!cloudBinId || !cloudApiKey) return alert('請先設定雲端');
        console.log('[CloudSync] 手動下載中...');
        try {
            const isUpstash = cloudBinId.includes('upstash.io');
            const url = isUpstash ? (cloudBinId.startsWith('http') ? `${cloudBinId}/GET/classKudox_backup` : cloudBinId) : (cloudBinId.startsWith('http') ? cloudBinId : `https://api.jsonbin.io/v3/b/${cloudBinId}/latest`);
            const resp = await fetch(url, { headers: isUpstash ? {'Authorization':`Bearer ${cloudApiKey}`} : {'X-Access-Key':cloudApiKey} });
            if(resp.ok) { 
                let r = await resp.json(); let cloudData = isUpstash ? r.result : (r.record || r); if(typeof cloudData === 'string') cloudData = JSON.parse(cloudData);
                console.log('[CloudSync] 下載成功，執行還原...');
                restoreFromBackup(cloudData); 
            } else throw new Error('下載失敗');
        } catch(e) { console.error('[CloudSync] 下載錯誤:', e); alert(e.message); }
    };

    const checkCloudSyncState = async () => {
        if (!cloudBinId || !cloudApiKey) return;
        try {
            const isUpstash = cloudBinId.includes('upstash.io'), h = isUpstash?{'Authorization':`Bearer ${cloudApiKey}`}:{'X-Access-Key':cloudApiKey};
            const url = isUpstash ? (cloudBinId.startsWith('http') ? `${cloudBinId}/GET/classKudox_backup` : cloudBinId) : (cloudBinId.startsWith('http') ? cloudBinId : `https://api.jsonbin.io/v3/b/${cloudBinId}/latest`);
            const getResp = await fetch(url, { headers: h });
            if (getResp.ok) { 
                let r = await getResp.json(); let cloudData = isUpstash?r.result:(r.record||r); if(typeof cloudData === 'string') cloudData = JSON.parse(cloudData);
                const cloudVer = cloudData?.syncVersion || 0;
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
        const stats = {}; let total = 0; logs.forEach(l => { stats[l.label] = (stats[l.label] || 0) + 1; total++; });
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
            let pts = logs.filter(l => l.studentId === s.id).reduce((sum, l) => {
                if (range && (l.timestamp < range.start || l.timestamp > range.end)) return sum;
                return sum + (l.ignoreTotal ? 0 : l.points);
            }, 0);
            return { ...s, pts };
        });
        if (currentSort === 'name') data.sort((a,b) => a.name.localeCompare(b.name, 'zh-TW')); else data.sort((a,b) => b.pts - a.pts);
        data.forEach((s, idx) => {
            const li = document.createElement('li'); li.className = 'report-item' + (currentProfileId === s.id ? ' active' : '');
            li.onclick = () => { 
                currentProfileId = s.id; 
                document.getElementById('resetReportFilterBtn')?.classList.remove('hidden');
                document.getElementById('reportActivityTitle').textContent = s.name + ' 的紀錄'; 
                window.renderReports(); 
                window.scrollToReportLogs();
            };
            li.innerHTML = `<div class="report-item-left"><span class="report-rank">#${idx+1}</span><img src="${s.avatarUrl || generateAvatar(s.name, s.avatarStyle)}" class="report-avatar"><span class="report-name">${s.name}</span></div><div class="report-item-right ${s.pts > 0 ? 'positive-val' : 'negative-val'}">${s.pts > 0 ? '+' : ''}${s.pts}</div>`;
            list.appendChild(li);
        });
        const alist = document.getElementById('reportActivityList'); if(alist) {
            alist.innerHTML = '';
            let f = logs.filter(log => { if(range && (log.timestamp < range.start || log.timestamp > range.end)) return false; if(currentProfileId && log.studentId !== currentProfileId) return false; return true; }).sort((a,b)=>b.timestamp-a.timestamp);
            f.slice(0,50).forEach(log => {
                const s = students.find(x => x.id === log.studentId);
                const li = document.createElement('li'); li.innerHTML = `<div class="history-item-left"><span class="history-date">${new Date(log.timestamp).toLocaleString()} • ${s?s.name:'未知'}</span><span class="history-label">${log.label}</span></div><div class="history-item-right ${log.points > 0 ? 'positive-val' : 'negative-val'}">${log.points > 0 ? '+' : ''}${log.points}<button class="delete-log-btn" onclick="window.deleteLog(${log.id})">🗑️</button></div>`;
                alist.appendChild(li);
            });
            renderPieChart(f);
        }
    };

    const migrateToNameIds = () => {
        let changed = false;
        classes.forEach(c => {
            const nameId = 'class_' + encodeURIComponent(c.name);
            if (c.id !== nameId) {
                console.log(`[Migration] 遷移班級 ID: ${c.id} -> ${nameId}`);
                ['students', 'groups', 'logs', 'items', 'settings'].forEach(suffix => {
                    const oldKey = `cdData_${c.id}_${suffix}`, newKey = `cdData_${nameId}_${suffix}`;
                    const val = localStorage.getItem(oldKey);
                    if (val) { localStorage.setItem(newKey, val); localStorage.removeItem(oldKey); }
                });
                if (currentClassId === c.id) { currentClassId = nameId; localStorage.setItem('cdData_currentClassId', currentClassId); }
                c.id = nameId; changed = true;
            }
        });
        if (changed) saveData(true);
    };

    // --- Boot & Event Wiring ---
    const bootSequence = () => {
        migrateToNameIds(); loadClassData(); applySettings(); renderStudents(); renderPointItems(); renderClassSelector(); checkCloudSyncState();
        const wire = (id, fn) => { const el = document.getElementById(id); if(el) el.onclick = fn; };
        
        wire('settingsBtn', () => { openModal(document.getElementById('settingsModal')); applySettings(); renderPointItems(); });
        wire('reportsBtn', () => { currentProfileId = null; window.renderReports(); openModal(document.getElementById('reportsModal')); });
        wire('manageClassesBtn', () => { renderClassSelector(); openModal(document.getElementById('manageClassesModal')); });
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
        wireSlider('gridColsRange', 'gridColsLabel', 'columns'); wireSlider('cardHeightRange', 'cardHeightLabel', 'studentCardHeight'); wireSlider('groupHeightRange', 'groupHeightLabel', 'groupCardHeight'); wireSlider('groupColsRange', 'groupColsLabel', 'groupColumns'); wireSlider('itemColsRange', 'itemColsLabel', 'itemColumns');
        
        const fsSel = document.getElementById('fontSizeSelect'); if(fsSel) fsSel.onchange = (e) => { settings.fontSize = e.target.value; applySettings(); saveData(); };
        const sSel = document.getElementById('enableSoundSetting'); if(sSel) sSel.onchange = (e) => { settings.enableSound = e.target.checked; saveData(); };

        wire('editProfileBtn', () => { const s = students.find(x => x.id === currentProfileId); if(!s) return; document.getElementById('editStudentName').value = s.name; document.getElementById('editStudentAvatarStyle').value = s.avatarStyle || 'fun-emoji'; document.getElementById('editStudentAvatarPreview').src = s.avatarUrl || generateAvatar(s.name, s.avatarStyle); closeModal(document.getElementById('studentProfileModal')); openModal(document.getElementById('editStudentModal')); });
        wire('saveEditStudentBtn', () => { 
            const nameInp = document.getElementById('editStudentName'); const s = students.find(x => x.id === currentProfileId);
            if(s && nameInp.value.trim()) { 
                const newName = nameInp.value.trim();
                if(newName !== s.name && students.some(x => x.name === newName)) return alert('姓名已存在');
                s.name = newName; 
                s.avatarStyle = document.getElementById('editStudentAvatarStyle').value; 
                s.avatarUrl = document.getElementById('editStudentAvatarPreview').src; 
                s.lastUpdated = Date.now(); saveData(); renderStudents(); closeModal(document.getElementById('editStudentModal')); 
            } else if(!nameInp.value.trim()) alert('請輸入姓名');
        });
        wire('deleteStudentBtn', () => { if(confirm('刪除？')) { students = students.filter(x => x.id !== currentProfileId); logs = logs.filter(x => x.studentId !== currentProfileId); saveData(); renderStudents(); closeModal(document.getElementById('editStudentModal')); } });
        wire('saveStudentBtn', () => { 
            const i = document.getElementById('newStudentName'); if(!i.value.trim()) return; 
            i.value.split('\n').forEach(n => { 
                const name = n.trim(); if(name) {
                    if(students.some(s => s.name === name)) { console.warn('跳過重複姓名:', name); return; }
                    students.push({ id: 's'+Date.now()+Math.random(), name, lastUpdated:Date.now() }); 
                }
            }); 
            saveData(); renderStudents(); i.value = ''; closeModal(document.getElementById('addStudentModal')); 
        });
        
        wire('saveGroupBtn', () => { const i = document.getElementById('groupNameInput'); const name = i.value.trim(); if(!name) return alert('請輸入名稱'); const sids = Array.from(document.querySelectorAll('#groupStudentSelectionGrid input:checked')).map(cb => cb.value); if(!sids.length) return alert('請選擇成員'); if(editingGroupId) { const g = groups.find(x=>x.id===editingGroupId); g.name = name; g.studentIds = sids; g.lastUpdated = Date.now(); } else { groups.push({ id: 'g'+Date.now(), name, studentIds: sids, lastUpdated: Date.now() }); } saveData(); renderGroups(); closeModal(document.getElementById('manageGroupModal')); });
        wire('deleteGroupBtn', () => { if(confirm('刪除群組？')) { groups = groups.filter(x => x.id !== editingGroupId); saveData(); renderGroups(); closeModal(document.getElementById('manageGroupModal')); } });
        wire('groupAwardPointsBtn', () => { 
            if(!awardContextIds.length) return; 
            openAwardModal(awardContextIds, document.getElementById('groupDetailTitle').textContent, currentGroupIdForAward); 
            closeModal(document.getElementById('groupDetailModal')); 
        });
        wire('editGroupDetailBtn', () => { const g = groups.find(x => x.studentIds.every(sid => awardContextIds.includes(sid)) && x.studentIds.length === awardContextIds.length); if(g) openManageGroupModal(g.id); closeModal(document.getElementById('groupDetailModal')); });

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
            const val = isNaN(parseInt(v.value)) ? 1 : parseInt(v.value);
            if (pointItems.positive.some(x => x.label === l.value.trim() && x.value === val)) return alert('項目名稱與分數已存在，請勿重複新增');
            pointItems.positive.push({ id: 'p'+Date.now(), label: l.value.trim(), value: val, icon: i.textContent, ignoreTotal: ign.checked, lastUpdated: Date.now() }); saveData(); renderPointItems(); l.value = ''; v.value = '1'; 
        });
        wire('addNeedsWorkBtn', () => { 
            const l = document.getElementById('newNeedsWorkLabel'); const v = document.getElementById('newNeedsWorkValue'); const i = document.getElementById('newNeedsWorkIconBtn'); const ign = document.getElementById('newNeedsWorkIgnore'); if(!l.value.trim()) return; 
            const val = isNaN(parseInt(v.value)) ? -1 : parseInt(v.value);
            if (pointItems.needsWork.some(x => x.label === l.value.trim() && x.value === val)) return alert('項目名稱與分數已存在，請勿重複新增');
            pointItems.needsWork.push({ id: 'n'+Date.now(), label: l.value.trim(), value: val, icon: i.textContent, ignoreTotal: ign.checked, lastUpdated: Date.now() }); saveData(); renderPointItems(); l.value = ''; v.value = '-1'; 
        });
        
        wire('saveEditItemBtn', () => {
            if(!editingPointItemId || !editingPointItemCat) return;
            const l = document.getElementById('editItemLabel').value.trim();
            const v = parseInt(document.getElementById('editItemValue').value) || 0;
            const item = pointItems[editingPointItemCat].find(i => i.id === editingPointItemId);
            if(item) {
                item.label = l; item.value = v; item.icon = document.getElementById('editItemIconBtn').textContent;
                item.ignoreTotal = document.getElementById('editItemIgnore').checked;
                item.lastUpdated = Date.now(); saveData(); renderPointItems(); closeModal(document.getElementById('editPointItemModal'));
            }
        });

        wire('createClassBtn', () => { 
            const n = document.getElementById('newClassName').value.trim(); if(!n) return; 
            if(classes.some(c => c.name === n)) return alert('班級名稱已存在');
            const id = 'class_' + encodeURIComponent(n); // Use name-based ID
            let items = JSON.parse(JSON.stringify(defaultItems)), s = [], g = []; 
            const src = document.getElementById('copyFromClassSelect').value; 
            if(src) { 
                if(document.getElementById('copyItemsCheckbox').checked) {
                    const si = JSON.parse(localStorage.getItem(`cdData_${src}_items`));
                    if(si) items = si;
                }
                if(document.getElementById('copyStudentsCheckbox').checked) { s = JSON.parse(localStorage.getItem(`cdData_${src}_students`) || '[]'); g = JSON.parse(localStorage.getItem(`cdData_${src}_groups`) || '[]'); } 
            } 
            classes.push({ id, name: n }); 
            localStorage.setItem(`cdData_${id}_items`, JSON.stringify(items)); 
            localStorage.setItem(`cdData_${id}_students`, JSON.stringify(s.map(x=>({...x,lastUpdated:Date.now()})))); 
            localStorage.setItem(`cdData_${id}_groups`, JSON.stringify(g.map(x=>({...x,lastUpdated:Date.now()})))); 
            saveData(); renderClassSelector(); document.getElementById('newClassName').value = ''; closeModal(document.getElementById('manageClassesModal'));
        });
        
        wire('syncStatus', () => performCloudUpload(true));
        
        wire('cloudUploadBtn', () => performCloudUpload(true));
        wire('cloudDownloadBtn', () => { if(confirm('會覆蓋本地資料，確定？')) performCloudDownload(); });
        
        const binInp = document.getElementById('cloudBinId'); if(binInp) { binInp.value = cloudBinId; binInp.onchange = (e) => { cloudBinId = e.target.value; saveData(); checkCloudSyncState(); }; }
        const keyInp = document.getElementById('cloudApiKey'); if(keyInp) { keyInp.value = cloudApiKey; keyInp.onchange = (e) => { cloudApiKey = e.target.value; saveData(); checkCloudSyncState(); }; }
        const ivInp = document.getElementById('autoSyncInterval'); if(ivInp) { ivInp.value = autoSyncInterval; ivInp.onchange = (e) => { autoSyncInterval = parseInt(e.target.value); saveData(); }; }

        wire('copyPointsBtn', () => {
            const range = getReportsTimeRange();
            let data = students.map(s => {
                let pts = logs.filter(l => l.studentId === s.id).reduce((sum, l) => {
                    if (range && (l.timestamp < range.start || l.timestamp > range.end)) return sum;
                    return sum + (l.ignoreTotal ? 0 : l.points);
                }, 0);
                return { name: s.name, pts };
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
                if (range && (l.timestamp < range.start || l.timestamp > range.end)) return false;
                if (currentProfileId && l.studentId !== currentProfileId) return false;
                return true;
            }).forEach(l => {
                const s = students.find(x => x.id === l.studentId);
                csv += `"${s?s.name:'未知'}","${l.label}",${l.points},"${new Date(l.timestamp).toLocaleString()}"\n`;
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
        
        wire('resetAllPointsBtn', () => { if(confirm('歸零所有點數？')) { logs = []; saveData(); renderStudents(); if(currentView === 'groups') renderGroups(); } });
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
                const s = 's'+i; const url = `https://api.dicebear.com/7.x/${document.getElementById('editStudentAvatarStyle').value}/svg?seed=${s}`;
                const img = document.createElement('img'); img.src = url; img.className = 'avatar-picker-item';
                img.onclick = () => { document.getElementById('editStudentAvatarPreview').src = url; const s = students.find(x=>x.id===currentProfileId); if(s) s.avatarUrl = url; closeModal(document.getElementById('avatarPickerModal')); };
                grid.appendChild(img);
            }
            openModal(document.getElementById('avatarPickerModal'));
        });
        wire('randomizeAvatarBtn', () => { const url = generateAvatar('r'+Date.now(), document.getElementById('editStudentAvatarStyle').value); document.getElementById('editStudentAvatarPreview').src = url; const s = students.find(x=>x.id===currentProfileId); if(s) s.avatarUrl = url; });

        if(autoSyncInterval > 0) setInterval(performCloudUpload, Math.max(autoSyncInterval, 15) * 1000);
    };

    const createPointAnimation = (pts, count) => { for(let i=0; i<Math.min(count, 5); i++) { const el = document.createElement('div'); el.className = 'point-animation'; el.textContent = `${pts>0?'+':''}${pts}`; el.style.color = pts>0?'var(--positive-color)':'var(--negative-color)'; el.style.left = (50+Math.random()*10-5)+'%'; el.style.top = (40+Math.random()*10-5)+'%'; document.body.appendChild(el); setTimeout(() => el.remove(), 1000); } };

    // --- Start ---
    bootSequence();
});
