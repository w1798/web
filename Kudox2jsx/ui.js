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
    if (window.refreshProxy) window.refreshProxy();
};

const renderGiftTab = () => {
    if (window.refreshProxy) window.refreshProxy();
};

const switchAwardTab = (tab) => {
    localStorage.setItem('CD_LastAwardSubTab', tab);
    if (window.refreshProxy) window.refreshProxy();
};

const switchMainView = (v) => { 
    currentView = v; 
    document.querySelectorAll('.view-tab-btn').forEach(b => b.classList.toggle('active', b.dataset.view === v)); 
    const sGrid = document.getElementById('studentGrid'); if(sGrid) sGrid.classList.toggle('hidden', v !== 'students'); 
    const gGrid = document.getElementById('groupGrid'); if(gGrid) gGrid.classList.toggle('hidden', v !== 'groups'); 
    v === 'students' ? renderStudents() : renderGroups(); 
};

const renderStudents = () => {
    if (window.refreshProxy) {
        window.refreshProxy();
    } else {
        console.warn("React is not loaded yet.");
    }
};

const renderGroups = () => {
    if (window.refreshProxy) {
        window.refreshProxy();
    } else {
        console.warn("React is not loaded yet.");
    }
};

const renderPointItems = () => {
    if (window.refreshProxy) window.refreshProxy();
};

const renderCustomDropdown = () => {
    const sel = document.getElementById('customAwardLabel'); if(!sel) return;
    sel.innerHTML = '';
    const defaultOpt = document.createElement('option');
    defaultOpt.value = '新增項目'; defaultOpt.textContent = '新增項目';
    sel.appendChild(defaultOpt);
    customItems.forEach(name => {
        if (name === '新增項目') return; 
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
    if (window.refreshProxy) window.refreshProxy();
};

const renderHistory = () => { 
    if (window.refreshProxy) window.refreshProxy();
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
    if(v === 'lastWeek') { s.setDate(s.getDate() - (s.getDay()||7) + 1 - 7); e.setDate(s.getDate() + 6); return { start: s.getTime(), end: e.getTime() }; }
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
    if (window.refreshProxy) window.refreshProxy();
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
            document.getElementById('resetReportFilterBtnAside')?.classList.remove('hidden');
            document.getElementById('resetReportFilterBtn2')?.classList.remove('hidden');
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
    openModal(document.getElementById('classSummaryModal'));
};

const createPointAnimation = (pts, count) => { for(let i=0; i<Math.min(count, 5); i++) { const el = document.createElement('div'); el.className = 'point-animation'; el.textContent = `${pts>0?'+':''}${pts}`; el.style.color = pts>0?'var(--positive-color)':'var(--negative-color)'; el.style.left = (50+Math.random()*10-5)+'%'; el.style.top = (40+Math.random()*10-5)+'%'; document.body.appendChild(el); setTimeout(() => el.remove(), 1000); } };

// --- Expose UI Functions to Window for React Components ---
window.renderClassSelector = renderClassSelector;
window.showClassSummary = showClassSummary;
window.getAvatarUrl = getAvatarUrl;
window.renderPointItems = renderPointItems;
window.getTS = getTS;
window.getReportsTimeRange = getReportsTimeRange;
window.createPointAnimation = createPointAnimation;
window.loadCustomTextarea = loadCustomTextarea;
window.applySettings = applySettings;
window.updateSyncStatus = updateSyncStatus;
window.openManageGroupModal = openManageGroupModal;
window.openGroupDetailModal = openGroupDetailModal;
window.openAwardModal = openAwardModal;
