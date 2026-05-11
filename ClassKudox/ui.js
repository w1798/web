/**
 * ClassKudox - UI Rendering & Component Logic
 */

const openModal = (m) => {
    if (typeof hideUndoToast === 'function') hideUndoToast();
    m?.classList.remove('hidden');
    document.body.classList.add('modal-open');
    // 有視窗開啟時，強制隱藏右下角多選按鈕
    const fbtn = document.getElementById('floatingMultiSelectBtn');
    if (fbtn) fbtn.classList.add('hidden');
};
const closeModal = (m) => {
    m?.classList.add('hidden');
    if (document.querySelectorAll('.modal-overlay:not(.hidden)').length === 0) {
        document.body.classList.remove('modal-open');
        // 關閉視窗後，根據目前位置重新判斷是否顯示多選按鈕
        window.dispatchEvent(new Event('scroll'));
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
    document.documentElement.style.setProperty('--body-font-size', (settings.ftS || 16) + 'px');
    document.documentElement.style.setProperty('--grid-cols', settings.col);
    document.documentElement.style.setProperty('--group-grid-cols', settings.gCol || 2);
    document.documentElement.style.setProperty('--item-grid-cols', settings.iCol || 5);
    document.documentElement.style.setProperty('--student-card-height', (settings.sCH || 0) + 'px');
    document.documentElement.style.setProperty('--group-card-height', (settings.gCH || 0) + 'px');
    document.documentElement.style.setProperty('--item-scale', (settings.itmS || 0) + 'px');
    document.documentElement.style.setProperty('--avatar-scale', 1 + (settings.avS || 0) / 100);
    document.documentElement.style.setProperty('--avatar-display', settings.sAv === 0 ? 'none' : 'block');

    document.documentElement.style.setProperty('--card-gap-v', (settings.cGV ?? 25) + 'px');
    document.documentElement.style.setProperty('--card-gap-h', (settings.cGH ?? 25) + 'px');
    document.documentElement.style.setProperty('--item-gap-v', (settings.iGV ?? 15) + 'px');
    document.documentElement.style.setProperty('--item-gap-h', (settings.iGH ?? 15) + 'px');

    const setVal = (id, val) => { const el = document.getElementById(id); if(el) el.value = val; };
    setVal('fontSizeSelect', settings.ftS || 16);
    setVal('gridColsSelect', settings.col);
    setVal('cardHeightSelect', settings.sCH || 0);
    setVal('groupHeightSelect', settings.gCH || 0);
    setVal('groupColsSelect', settings.gCol || 5);
    setVal('itemColsSelect', settings.iCol || 5);
    setVal('itemScaleSelect', settings.itmS || 0);
    setVal('avatarSizeSelect', settings.avS || 0);
    setVal('cardGapVSelect', settings.cGV ?? 25);
    setVal('cardGapHSelect', settings.cGH ?? 25);
    setVal('itemGapVSelect', settings.iGV ?? 15);
    setVal('itemGapHSelect', settings.iGH ?? 15);
    setVal('versionBackupSetting', settings.sBkup ?? 1);
    
    const ss = document.getElementById('enableSoundSetting'); if(ss) ss.checked = !!settings.eS;
    const sa = document.getElementById('showAvatarSetting'); if(sa) sa.checked = settings.sAv !== 0;
    const st = document.getElementById('showTreasureSetting'); if(st) st.checked = settings.sTR !== 0;
    const rr = document.getElementById('logRetentionSetting'); if(rr) rr.value = settings.lRet || 0;

    updateSyncStatus();
};

const switchProfileTab = (tab) => {
    localStorage.setItem('CD_LastProfileTab', tab);
    document.querySelectorAll('.main-tabs .tab-btn').forEach(b => b.classList.toggle('active', b.dataset.profileTab === tab));
    const awardTab = document.getElementById('profileAwardTab'); if(awardTab) awardTab.classList.toggle('active', tab === 'award');
    const giftTab = document.getElementById('profileGiftTab'); if(giftTab) giftTab.classList.toggle('active', tab === 'gift');
    const treasTab = document.getElementById('profileTreasureTab'); if(treasTab) treasTab.classList.toggle('active', tab === 'treasure');
    const histTab = document.getElementById('profileHistoryTab'); if(histTab) histTab.classList.toggle('active', tab === 'history');
    if(tab === 'history') renderHistory();
    if(tab === 'treasure') renderStudentTreasures();
    if(tab === 'gift') renderGiftTab();
    // 贈與分頁需要更寬的 modal
    const profileModal = document.querySelector('#editStudentModal .modal-content');
    if (profileModal) profileModal.classList.toggle('modal-large', tab === 'gift');
};

const renderGiftTab = () => {
    const el = document.getElementById('giftRecipientList'); if(!el) return; el.innerHTML = '';
    // 如果是群組贈與，需排除掉群組內所有人
    const excludeIds = awardContextIds.length > 0 ? awardContextIds : [currentProfileId];
    
    students.filter(s => !excludeIds.includes(s.id)).sort((a,b)=>a.id.localeCompare(b.id, 'zh-TW')).forEach(s => {
        const div = document.createElement('div');
        div.style = 'display:flex; align-items:center; gap:0.4rem; padding:0.3rem 0.5rem; cursor:pointer; background:white; border-radius:6px; font-size:0.9em; border:1px solid #e2e8f0;';
        div.innerHTML = `<input type="checkbox" value="${s.id}" style="cursor:pointer;"><span style="cursor:pointer; flex:1; margin:0;">${s.id}</span>`;
        div.onclick = (e) => { if(e.target.tagName !== 'INPUT') { const cb = div.querySelector('input'); cb.checked = !cb.checked; } };
        el.appendChild(div);
    });

    // 載入雲端同步的手續費與偏好設定
    const intInp = document.getElementById('giftFeeInterval');
    const stepInp = document.getElementById('giftFeeStep');
    const amtInp = document.getElementById('giftAmount');
    const ignInp = document.getElementById('giftIgnoreRanking');
    
    if(intInp && giftSettings) intInp.value = giftSettings.gInt || 0;
    if(stepInp && giftSettings) stepInp.value = giftSettings.gStep || 0;
    if(amtInp) amtInp.value = "";
    if(ignInp && giftSettings) ignInp.checked = giftSettings.gIgn !== undefined ? (giftSettings.gIgn === 1) : true;
};

const switchAwardTab = (tab) => {
    localStorage.setItem('CD_LastAwardSubTab', tab);
    document.querySelectorAll('.sub-tabs .sub-tab-btn').forEach(b => b.classList.toggle('active', b.dataset.awardTab === tab));
    const pos = document.getElementById('positiveItems'); if(pos) pos.classList.toggle('active', tab === 'positive');
    const neg = document.getElementById('needsWorkItems'); if(neg) neg.classList.toggle('active', tab === 'needs-work');
    const cust = document.getElementById('customAwardArea'); if(cust) cust.classList.toggle('active', tab === 'custom');
};

const switchMainView = (v) => { 
    currentView = v; 
    document.querySelectorAll('.view-tab-btn').forEach(b => b.classList.toggle('active', b.dataset.view === v)); 
    const sGrid = document.getElementById('studentGrid'); if(sGrid) sGrid.classList.toggle('hidden', v !== 'students'); 
    const gGrid = document.getElementById('groupGrid'); if(gGrid) gGrid.classList.toggle('hidden', v !== 'groups'); 
    v === 'students' ? renderStudents() : renderGroups(); 
};

const renderStudents = () => {
    const grid = document.getElementById('studentGrid'); if(!grid) return;
    const fragment = document.createDocumentFragment();
    [...students].sort((a,b) => a.id.localeCompare(b.id, 'zh-TW')).forEach(s => {
        const card = document.createElement('div'); card.className = 'student-card' + (selectedStudentIds.includes(s.id) ? ' selected' : '');
        card.onclick = () => isMultiSelectMode ? toggleStudentSelection(s.id) : openAwardModal([s.id], s.id, null);
        let total = (s.cP || 0) + (s.iP || 0);
        const ptClass = 'student-points' + (total > 0 ? ' positive-total' : (total < 0 ? ' negative-total' : ''));
        
        let trHtml = '';
        if (s.tr && (settings.sTR !== 0)) {
            const activeTr = Object.entries(s.tr).filter(([_, qty]) => qty !== 0);
            if (activeTr.length > 0) {
                trHtml = `<div class="student-treasures">`;
                activeTr.forEach(([id, qty]) => {
                    const def = treasureDefs.find(t => t.id === id);
                    if (def) trHtml += `<span class="stu-treasure-icon" title="${def.lb}">${def.ic}${qty}</span>`;
                });
                trHtml += `</div>`;
            }
        }

        card.innerHTML = `${isMultiSelectMode ? `<div class="selection-check">${selectedStudentIds.includes(s.id) ? '\u2713' : ''}</div>` : ''}<div class="${ptClass}">${total}</div><div class="student-avatar-wrapper"><img src="${getAvatarUrl(s.aU||s.id, s.aS)}" class="student-avatar"></div><div class="student-name">${s.id}</div>${trHtml}`;
        fragment.appendChild(card);
    });
    grid.innerHTML = '';
    grid.appendChild(fragment);
};

const renderGroups = () => {
    const grid = document.getElementById('groupGrid'); if(!grid) return;
    const fragment = document.createDocumentFragment();
    groups.forEach(g => {
        const card = document.createElement('div'); card.className = 'student-card group-card';
        let total = g.sIds.reduce((sum, sid) => { const s = students.find(x=>x.id===sid); return sum + (s ? ((s.cP||0) + (s.iP||0)) : 0); }, 0);
        const ptClass = 'student-points' + (total > 0 ? ' positive-total' : (total < 0 ? ' negative-total' : ''));
        
        const isSelected = isMultiSelectMode && selectedGroupIds.has(g.id);
        if (isSelected) card.classList.add('selected');
        
        card.innerHTML = `<button class="edit-group-inline-btn">\u2699\ufe0f</button><div class="group-icon">\ud83d\udc65</div><div class="student-name">${g.id}</div><div class="group-member-count">${g.sIds.length} 位成員 ${isSelected ? '<b style="color:var(--primary-color)">[已選]</b>' : ''}</div><div class="${ptClass}">${total > 0 ? '+' : ''}${total}</div>`;
        card.querySelector('.edit-group-inline-btn').onclick = (e) => { e.stopPropagation(); openManageGroupModal(g.id); };
        card.onclick = () => {
            if (isMultiSelectMode) {
                selectedGroupIds.has(g.id) ? selectedGroupIds.delete(g.id) : selectedGroupIds.add(g.id);
                const countEl = document.getElementById('multiSelectCount');
                if (countEl) countEl.textContent = `已選擇 ${selectedGroupIds.size} 個群組`;
                renderGroups();
            } else {
                g.sIds.length ? openAwardModal(g.sIds, g.id, g.id) : alert('群組內沒有學生');
            }
        };
        fragment.appendChild(card);
    });
    const create = document.createElement('div'); create.className = 'student-card group-card create-group-card'; create.onclick = () => openManageGroupModal();
    create.innerHTML = `<div class="create-group-icon">+</div><div class="student-name">新增群組</div>`;
    fragment.appendChild(create);
    
    grid.innerHTML = '';
    grid.appendChild(fragment);
};

const renderPointItems = () => {
    const rGrid = (id, items, cat) => { const el = document.getElementById(id); if(!el) return; el.innerHTML = ''; items.slice().sort((a,b)=>a.lb.localeCompare(b.lb,'zh-TW')).forEach(item => { const btn = document.createElement('button'); btn.className = `point-item-btn ${cat}`; btn.innerHTML = `<div class="point-icon">${item.ic}</div><div class="point-label">${item.lb}${item.iSum===1?'<small>(不列排)</small>':''}</div><div class="point-value">${item.vl > 0 ? '+' : ''}${item.vl}</div>`; btn.onclick = () => awardPoints(item.id, item.lb, item.vl, item.iSum===1); el.appendChild(btn); }); };
    rGrid('positiveItems', pointItems.pos, 'positive'); rGrid('needsWorkItems', pointItems.neg, 'negative');
    const rList = (id, items, cat) => { const el = document.getElementById(id); if(!el) return; el.innerHTML = ''; items.slice().sort((a,b)=>a.lb.localeCompare(b.lb,'zh-TW')).forEach(item => { const div = document.createElement('div'); div.className = `point-item-btn ${cat==='pos'?'positive':'negative'}`; div.onclick = () => openEditPointItemModal(cat, item.id); div.innerHTML = `<div class="point-icon">${item.ic}</div><div class="point-label">${item.lb}${item.iSum===1?'<small>(不列排)</small>':''}</div><div class="point-value">${item.vl > 0 ? '+' : ''}${item.vl}</div><button class="remove-item-btn" onclick="event.stopPropagation(); window.removePointItem('${cat}', '${item.id}')">×</button>`; el.appendChild(div); }); };
    rList('settingsPositiveList', pointItems.pos, 'pos'); rList('settingsNeedsWorkList', pointItems.neg, 'neg');
    renderCustomDropdown();
    renderTreasureSettings();
};

const renderCustomDropdown = () => {
    const sel = document.getElementById('customAwardLabel'); if(!sel) return;
    sel.innerHTML = '';
    const defaultOpt = document.createElement('option');
    defaultOpt.value = '兌換點數'; defaultOpt.textContent = '兌換點數';
    sel.appendChild(defaultOpt);
    customItems.forEach(name => {
        if (name === '兌換點數') return; 
        const opt = document.createElement('option');
        opt.value = name; opt.textContent = name;
        sel.appendChild(opt);
    });
};

const loadCustomTextarea = () => {
    const ta = document.getElementById('customItemsTextarea'); if(!ta) return;
    ta.value = customItems.join('\n');
};

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

const renderStudentTreasures = () => {
    const el = document.getElementById('studentTreasureList'); if(!el) return;
    el.innerHTML = '';
    if (!treasureDefs.length) {
        el.innerHTML = '<p style="text-align:center; color:var(--text-secondary); padding:2rem;">尚未定義寶物，請先在「系統設定 → 寶物設定」中新增寶物種類。</p>';
        return;
    }

    treasureDefs.slice().sort((a,b)=>a.lb.localeCompare(b.lb,'zh-TW')).forEach(td => {
        const card = document.createElement('div');
        card.className = 'treasure-card';
        const qtyText = pendingTreasures[td.id] || 0;
        
        card.innerHTML = `
            <div class="treasure-info">
                <span class="treasure-icon">${td.ic}</span>
                <span class="treasure-name">${td.lb}</span>
            </div>
            <div class="treasure-controls">
                <button class="btn treasure-minus" data-tid="${td.id}">−</button>
                <span class="treasure-qty ${qtyText!==0 ? (qtyText>0?'positive-val':'negative-val') : ''}">${qtyText>0?'+':''}${qtyText}</span>
                <button class="btn treasure-plus" data-tid="${td.id}">+</button>
            </div>
        `;
        card.querySelector('.treasure-minus').onclick = () => {
            pendingTreasures[td.id] = (pendingTreasures[td.id]||0) - 1;
            renderStudentTreasures();
        };
        card.querySelector('.treasure-plus').onclick = () => {
            pendingTreasures[td.id] = (pendingTreasures[td.id]||0) + 1;
            renderStudentTreasures();
        };
        el.appendChild(card);
    });

    const totalPending = Object.values(pendingTreasures).reduce((a,b) => a+Math.abs(b), 0);
    const confBtn = document.createElement('button');
    confBtn.className = 'btn primary-btn';
    confBtn.style = 'width:100%; margin-top: 1rem; padding: 1rem; font-size: 1.1em; border-radius: 16px; background: linear-gradient(135deg, #10b981, #059669);';
    confBtn.innerHTML = `🎁 確定給予寶物 (${totalPending > 0 ? '已調整項目' : '尚未調整'})`;
    confBtn.disabled = totalPending === 0;
    if (totalPending === 0) { confBtn.style.opacity = '0.5'; confBtn.style.cursor = 'not-allowed'; }
    
    confBtn.onclick = () => {
        let count = 0;
        let allLogIds = [];
        Object.entries(pendingTreasures).forEach(([tId, qty]) => {
            if (qty !== 0) {
                const ids = awardTreasure(tId, qty, true);
                allLogIds = allLogIds.concat(ids);
                count++;
            }
        });
        if (count > 0) {
            renderStudents(); if(currentView==='groups') renderGroups();
            createPointAnimation(1, awardContextIds.length);
            const titleText = awardContextIds.length > 1 ? `已給予 ${awardContextIds.length} 位學生寶物異動` : `已完成寶物發放`;
            lastActionLogIds = allLogIds;
            pendingTreasures = {};
            if(isMultiSelectMode) toggleMultiSelectMode();
            showUndoToast(titleText);
        } else {
            pendingTreasures = {};
            if(isMultiSelectMode) toggleMultiSelectMode();
        }
        setTimeout(() => {
            closeModal(document.getElementById('studentProfileModal'));
            closeModal(document.getElementById('groupDetailModal'));
        }, 300);
    };
    el.appendChild(confBtn);
};

const renderHistory = () => { 
    const list = document.getElementById('studentHistoryList'); if(!list) return; list.innerHTML = ''; 
    const f = logs.filter(l => l.sID === currentProfileId).sort((a,b) => getTS(b.TS) - getTS(a.TS)); 
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
        const li = document.createElement('li'); 
        li.innerHTML = `
            <span class="class-item-id" style="${c.arc?'text-decoration:line-through;color:#94a3b8;':''}">${c.id}</span>
            <div class="class-item-actions" style="display:flex;gap:0.4rem;flex-wrap:wrap;margin-left:auto;justify-content:flex-end;">
                <button class="rename-class-btn btn secondary-btn small-btn">✏️ 修改名稱</button>
                <button class="archive-btn btn small-btn">${c.arc?'解封存':'封存'}</button>
                <button class="del-class-btn btn negative-btn small-btn">🗑️</button>
            </div>
        `;
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
                pushOp(10, { old: oldId, new: n }, true);
                saveData(); renderClassSelector();
            }
        };
        li.querySelector('.archive-btn').onclick = () => { 
            if (!c.arc) {
                if (!confirm(`確定要封存 [${c.id}] 嗎？\n\n封存將會清除該班級的所有學生歷史紀錄\n(但會保留目前的點數、寶物和優缺點項目)。`)) {
                    return;
                }
                // 清除歷史紀錄，保留點數/寶物
                localStorage.setItem(`CD_${c.id}_Ls`, '[]');
                if (currentClassId === c.id) {
                    logs = [];
                }
            }
            c.arc = !c.arc; 
            pushOp(11, { id: c.id, arc: c.arc }, true);
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
                pushOp(12, { id: c.id }, true);
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

const getReportsTimeRange = () => {
    const v = document.getElementById('timeRangeFilter')?.value || 'all'; if(v === 'all') return null;
    let s = new Date(), e = new Date(); s.setHours(0,0,0,0); e.setHours(23,59,59,999);
    if(v === 'today') return { start: s.getTime(), end: e.getTime() };
    if(v === 'week') { s.setDate(s.getDate() - (s.getDay()||7) + 1); e.setDate(s.getDate() + 6); return { start: s.getTime(), end: e.getTime() }; }
    if(v === 'month') { s.setDate(1); let skip = new Date(s); skip.setMonth(skip.getMonth()+1); skip.setDate(0); skip.setHours(23,59,59,999); return { start: s.getTime(), end: skip.getTime() }; }
    if(v === 'custom') { const sval = document.getElementById('startDateFilter')?.value, evalStr = document.getElementById('endDateFilter')?.value; if(sval && evalStr) {
        let sd = new Date(sval); sd.setHours(0,0,0,0);
        let ed = new Date(evalStr); ed.setHours(23,59,59,999);
        return { start: sd.getTime(), end: ed.getTime() };
    } }
    return null;
};

const renderPieChart = (logs) => {
    const pie = document.getElementById('reportPieChart'), legend = document.getElementById('reportPieLegend'); if(!pie || !legend) return; pie.innerHTML = ''; legend.innerHTML = ''; if(!logs.length) { pie.style.background = '#e2e8f0'; return; }
    const stats = {}; let total = 0; logs.forEach(l => { stats[l.lb] = (stats[l.lb] || 0) + 1; total++; });
    const labels = Object.keys(stats).sort((a,b)=>stats[b]-stats[a]); const colors = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#06b6d4', '#8b5cf6'];
    let cum = 0, parts = []; labels.forEach((l, i) => { const p = (stats[l]/total)*100; const c = colors[i % colors.length]; parts.push(`${c} ${cum}% ${cum+p}%`); cum += p; legend.innerHTML += `<div class="legend-item"><div class="legend-color" style="background:${c}"></div><span>${l}: ${stats[l]}</span></div>`; });
    pie.style.background = `conic-gradient(${parts.join(', ')})`;
};

const renderReports = () => {
    if (currentReportView === 'treasure') return renderTreasureReports();
    const list = document.getElementById('reportsList'); if(!list) return; list.innerHTML = '';
    const range = getReportsTimeRange();
    
    // 預先過濾符合時間範圍與學生選取的紀錄，供排名計算與動態顯示使用
    const filteredLogs = logs.filter(l => {
        const ts = getTS(l.TS);
        if (range && (ts < range.start || ts > range.end)) return false;
        return true;
    });

    let data = students.map(s => {
        let pts = filteredLogs.filter(l => l.sID === s.id).reduce((sum, l) => {
            return sum + (l.iSum === 1 ? 0 : l.pt);
        }, 0);
        return { ...s, pts };
    });
    if (currentSort === 'name') data.sort((a,b) => a.id.localeCompare(b.id, 'zh-TW')); else data.sort((a,b) => b.pts - a.pts);
    data.forEach((s, idx) => {
        const li = document.createElement('li'); li.className = 'report-item' + (currentProfileId === s.id ? ' active' : '');
        li.onclick = () => { 
            currentProfileId = s.id; 
            currentReportPage = 1; // 切換學生時重設頁碼
            document.getElementById('resetReportFilterBtn')?.classList.remove('hidden');
            document.getElementById('reportActivityTitle').textContent = s.id + ' 的紀錄'; 
            renderReports(); 
            const rightTabBtn = document.querySelector('.reports-mobile-tab[data-target="reports-right-panel"]');
            if(rightTabBtn) rightTabBtn.click();
            const alist = document.getElementById('reportActivityList'); if(alist) alist.scrollTop = 0;
            const rightViz = document.querySelector('.reports-right-viz'); if(rightViz) rightViz.scrollTop = 0;
            if (typeof scrollToReportLogs === 'function') scrollToReportLogs();
        };
        li.innerHTML = `<div class="report-item-left"><span class="report-rank">#${idx+1}</span><img src="${getAvatarUrl(s.aU||s.id, s.aS)}" class="report-avatar"><span class="report-name">${s.id}</span></div><div class="report-item-right ${s.pts > 0 ? 'positive-val' : 'negative-val'}">${s.pts > 0 ? '+' : ''}${s.pts}</div>`;
        list.appendChild(li);
    });

    const alist = document.getElementById('reportActivityList'); if(alist) {
        alist.innerHTML = '';
        let rawF = filteredLogs.filter(log => { 
            if(currentProfileId && log.sID !== currentProfileId) return false; 
            return true; 
        });
        let f = rawF.map((log, index) => ({ log, index })).sort((a, b) => {
            const tsDiff = getTS(b.log.TS) - getTS(a.log.TS);
            if (tsDiff !== 0) return tsDiff;
            return b.index - a.index; // Tiemstamp identical, newer index first
        }).map(item => item.log);

        // 分頁處理
        const pageSize = 50;
        const totalPages = Math.ceil(f.length / pageSize) || 1;
        if (currentReportPage > totalPages) currentReportPage = totalPages;
        const startIdx = (currentReportPage - 1) * pageSize;
        const pagedData = f.slice(startIdx, startIdx + pageSize);

        pagedData.forEach(log => {
            const s = students.find(x => x.id === log.sID);
            const d = (typeof log.TS === 'number') ? new Date(log.TS) : StampTool.decode(log.TS);
            const isTreasure = !!log.trId;
            const rightContent = isTreasure ? `<button class="delete-log-btn" onclick="window.deleteLog('${log.id}')">🗑️</button>` : `${log.pt > 0 ? '+' : ''}${log.pt}<button class="delete-log-btn" onclick="window.deleteLog('${log.id}')">🗑️</button>`;
            const li = document.createElement('li'); li.innerHTML = `<div class="history-item-left"><span class="history-date">${d.toLocaleString()} • ${s?s.id:'未知'}</span><span class="history-label">${log.lb}${log.iSum === 1 && !isTreasure ? '<small>(不列排)</small>' : ''}</span></div><div class="history-item-right ${isTreasure ? '' : (log.pt > 0 ? 'positive-val' : 'negative-val')}">${rightContent}</div>`;
            alist.appendChild(li);
        });

        // 更新分頁 UI
        const prevBtn = document.getElementById('reportPrevPageBtn');
        const nextBtn = document.getElementById('reportNextPageBtn');
        const info = document.getElementById('reportPageInfo');
        if (prevBtn) prevBtn.disabled = currentReportPage <= 1;
        if (nextBtn) nextBtn.disabled = currentReportPage >= totalPages;
        if (info) info.textContent = `頁數 ${currentReportPage} / ${totalPages}`;

        renderPieChart(f);
    }
};

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
            currentReportPage = 1;
            document.getElementById('resetReportFilterBtn')?.classList.remove('hidden');
            document.getElementById('reportActivityTitle').textContent = s.id + ' 的寶物'; 
            renderReports(); 
            const rightTabBtn = document.querySelector('.reports-mobile-tab[data-target="reports-right-panel"]');
            if(rightTabBtn) rightTabBtn.click();
            const alist = document.getElementById('reportActivityList'); if(alist) alist.scrollTop = 0;
            const rightViz = document.querySelector('.reports-right-viz'); if(rightViz) rightViz.scrollTop = 0;
            if (typeof scrollToReportLogs === 'function') scrollToReportLogs();
        };
        let trDetail = treasureDefs.map(td => {
            const qty = (s.tr && s.tr[td.id]) || 0;
            return qty !== 0 ? `${td.ic}${qty}` : '';
        }).filter(Boolean).join(' ');
        if (!trDetail) trDetail = '<span style="color:var(--text-secondary);font-size:0.85em;">無寶物</span>';
        li.innerHTML = `<div class="report-item-left"><span class="report-rank">#${idx+1}</span><img src="${getAvatarUrl(s.aU||s.id, s.aS)}" class="report-avatar"><span class="report-name">${s.id}</span></div><div class="report-item-right" style="font-size:0.9em;">${trDetail}</div>`;
        list.appendChild(li);
    });
    const alist = document.getElementById('reportActivityList'); if(alist) {
        alist.innerHTML = '';
        const range = getReportsTimeRange();
        let f = logs.filter(log => {
            const ts = getTS(log.TS);
            if(range && (ts < range.start || ts > range.end)) return false;
            if(currentProfileId && log.sID !== currentProfileId) return false;
            return true;
        }).sort((a,b) => getTS(b.TS) - getTS(a.TS));

        const pageSize = 50;
        const totalPages = Math.ceil(f.length / pageSize) || 1;
        if (currentReportPage > totalPages) currentReportPage = totalPages;
        const startIdx = (currentReportPage - 1) * pageSize;
        const pagedData = f.slice(startIdx, startIdx + pageSize);

        pagedData.forEach(log => {
            const s = students.find(x => x.id === log.sID);
            const d = (typeof log.TS === 'number') ? new Date(log.TS) : StampTool.decode(log.TS);
            const isTreasure = !!log.trId;
            const rightContent = isTreasure ? `<button class="delete-log-btn" onclick="window.deleteLog('${log.id}')">🗑️</button>` : `${log.pt > 0 ? '+' : ''}${log.pt}<button class="delete-log-btn" onclick="window.deleteLog('${log.id}')">🗑️</button>`;
            const li = document.createElement('li'); li.innerHTML = `<div class="history-item-left"><span class="history-date">${d.toLocaleString()} • ${s?s.id:'未知'}</span><span class="history-label">${log.lb}${log.iSum === 1 && !isTreasure ? '<small>(不列排)</small>' : ''}</span></div><div class="history-item-right ${isTreasure ? '' : (log.pt > 0 ? 'positive-val' : 'negative-val')}">${rightContent}</div>`;
            alist.appendChild(li);
        });

        const prevBtn = document.getElementById('reportPrevPageBtn');
        const nextBtn = document.getElementById('reportNextPageBtn');
        const info = document.getElementById('reportPageInfo');
        if (prevBtn) prevBtn.disabled = currentReportPage <= 1;
        if (nextBtn) nextBtn.disabled = currentReportPage >= totalPages;
        if (info) info.textContent = `頁數 ${currentReportPage} / ${totalPages}`;

        const pie = document.getElementById('reportPieChart'); if(pie) pie.style.background = '#e2e8f0';
        const legend = document.getElementById('reportPieLegend'); if(legend) legend.innerHTML = '';
    }
};

const showClassSummary = () => {
    const content = document.getElementById('classSummaryContent'); if(!content) return;
    content.innerHTML = '';
    const range = getReportsTimeRange();
    
    // Update title to show if filtered
    const titleEl = document.getElementById('classSummaryTitle');
    if (titleEl) {
        titleEl.textContent = range ? '時間內點數總覽' : '全班點數總覽 (所有紀錄)';
    }

    let data = students.map(s => {
        let pts = logs.filter(l => l.sID === s.id).reduce((sum, l) => {
            const ts = getTS(l.TS);
            if (range && (ts < range.start || ts > range.end)) return sum;
            return sum + (l.iSum === 1 ? 0 : l.pt);
        }, 0);
        return { ...s, pts };
    });
    if (currentSort === 'name') data.sort((a,b) => a.id.localeCompare(b.id, 'zh-TW')); else data.sort((a,b) => b.pts - a.pts);
    data.forEach((s, idx) => {
        const box = document.createElement('div');
        box.className = 'summary-box';
        box.onclick = () => openStudentSummaryDetail(s.id);
        const isNeg = s.pts < 0;
        const ptsText = s.pts > 0 ? `+${s.pts}` : s.pts;
        box.innerHTML = `<div class="summary-seq">${idx + 1}</div><div class="summary-name">${s.id}</div><div class="summary-points ${isNeg ? 'negative' : ''}">${ptsText}</div>`;
        content.appendChild(box);
    });
    openModal(document.getElementById('classSummaryModal'));
};

const openStudentSummaryDetail = (id) => {
    const range = getReportsTimeRange();
    const studentLogs = logs.filter(l => {
        if (l.sID !== id) return false;
        const ts = getTS(l.TS);
        if (range && (ts < range.start || ts > range.end)) return false;
        return true;
    });
    const grid = document.getElementById('summaryDetailGrid');
    const titleEl = document.getElementById('summaryDetailStudentName');
    const totalEl = document.getElementById('summaryDetailTotal');
    if (!grid || !titleEl || !totalEl) return;
    titleEl.textContent = id + ' 的項目明細';
    const total = studentLogs.filter(l => l.iSum !== 1 && !l.trId).reduce((s, v) => s + v.pt, 0);
    totalEl.textContent = total > 0 ? `時間內積分：+${total}` : `時間內積分：${total}`;
    totalEl.style.color = total > 0 ? 'var(--positive-color)' : (total < 0 ? 'var(--negative-color)' : 'var(--text-secondary)');
    grid.innerHTML = '';
    
    if (!studentLogs.length) {
        grid.innerHTML = `<p style="grid-column:1/-1; text-align:center; color:var(--text-secondary); padding:1.5rem;">此時間範圍內無紀錄</p>`;
    } else {
        // 分類加總
        const aggregated = {};
        studentLogs.forEach(l => {
            const key = l.lb + (l.iSum === 1 ? ' (不列排)' : '') + (!!l.trId ? '_tr' : '');
            if (!aggregated[key]) {
                aggregated[key] = { lb: l.lb, pt: 0, count: 0, isTreasure: !!l.trId, iSum: l.iSum };
            }
            aggregated[key].pt += (l.pt || 0);
            aggregated[key].count += 1;
        });

        // 排序：先排正分、再排負分、最後排不計分/寶物
        const sortedKeys = Object.keys(aggregated).sort((a, b) => {
            const dataA = aggregated[a], dataB = aggregated[b];
            if (dataA.iSum !== dataB.iSum) return dataA.iSum - dataB.iSum;
            if (dataA.isTreasure !== dataB.isTreasure) return dataA.isTreasure - dataB.isTreasure;
            return dataB.pt - dataA.pt;
        });

        sortedKeys.forEach(key => {
            const data = aggregated[key];
            const card = document.createElement('div');
            card.className = `summary-detail-card ${data.isTreasure ? '' : (data.pt > 0 ? 'positive' : (data.pt < 0 ? 'negative' : ''))}`;
            const ptsText = data.isTreasure ? '' : `<div class="detail-pts">${data.pt > 0 ? '+' : ''}${data.pt}</div>`;
            card.innerHTML = `<div class="detail-label">${data.lb}${data.iSum === 1 ? ' <small>(不列排)</small>' : ''}<div style="font-size:0.85em; color:var(--text-secondary); margin-top:4px;">計 ${data.count} 次</div></div>${ptsText}`;
            grid.appendChild(card);
        });
    }
    openModal(document.getElementById('classSummaryStudentDetailModal'));
};

const createPointAnimation = (pts, count) => { for(let i=0; i<Math.min(count, 5); i++) { const el = document.createElement('div'); el.className = 'point-animation'; el.textContent = `${pts>0?'+':''}${pts}`; el.style.color = pts>0?'var(--positive-color)':'var(--negative-color)'; el.style.left = (50+Math.random()*10-5)+'%'; el.style.top = (40+Math.random()*10-5)+'%'; document.body.appendChild(el); setTimeout(() => el.remove(), 1000); } };
