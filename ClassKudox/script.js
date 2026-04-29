/**
 * ClassKudox - Main Entry Point
 */

function initLibraries() {
    const libraries = [
        {
            url: 'https://cdnjs.cloudflare.com/ajax/libs/pako/2.1.0/pako.min.js',
            condition: typeof DecompressionStream === 'undefined'
        }
    ];

    libraries.forEach(lib => {
        const fileName = new URL(lib.url).pathname.split('/').pop();
        const shouldLoad = (lib.condition !== undefined) ? lib.condition : true;

        if (!shouldLoad) {
            console.log(`%c[跳過] 環境支援原生功能，不載入: ${fileName}`, 'color: #9E9E9E;');
            return;
        }

        const script = document.createElement('script');
        script.src = lib.url;
        script.async = false;
        script.onload = () => console.log(`%c[成功] 外部庫已載入: ${fileName}`, 'color: #4CAF50; font-weight: bold;');
        script.onerror = () => {
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

initLibraries();

document.addEventListener('DOMContentLoaded', () => {

    const fallbackSvg = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="%23e2e8f0"/><circle cx="50" cy="45" r="20" fill="%2394a3b8"/><path d="M20 100 C 20 60, 80 60, 80 100" fill="%2394a3b8"/></svg>`;
    window.addEventListener('error', function(e) {
        if (e.target.tagName && e.target.tagName.toLowerCase() === 'img') {
            if (e.target.src !== fallbackSvg) e.target.src = fallbackSvg;
        }
    }, true);

    const bootSequence = async () => {
        const wire = (id, fn) => { const el = document.getElementById(id); if(el) el.onclick = fn; };
        
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
            currentReportPage = 1;
            const filter = document.getElementById('timeRangeFilter');
            if(filter) filter.value = 'today';
            renderReports(); 
            openModal(document.getElementById('reportsModal')); 
        });
        wire('resetReportFilterBtn', () => { 
            currentProfileId = null; 
            currentReportPage = 1;
            document.getElementById('resetReportFilterBtn')?.classList.add('hidden'); 
            document.getElementById('reportActivityTitle').textContent = '全班最近紀錄'; 
            renderReports(); 
        });
        
        // 報表分頁綁定
        wire('reportPrevPageBtn', () => {
            if (currentReportPage > 1) {
                currentReportPage--;
                renderReports();
            }
        });
        wire('reportNextPageBtn', () => {
            currentReportPage++;
            renderReports();
        });
        wire('undoActionBtn', undoAction);
        wire('toggleMultiSelectBtn', toggleMultiSelectMode);
        wire('addStudentBtn', () => openModal(document.getElementById('addStudentModal')));
        
        document.querySelectorAll('.view-tab-btn').forEach(b => b.onclick = () => switchMainView(b.dataset.view));
        document.querySelectorAll('.close-modal-btn, .cancel-btn, .settings-close, .profile-close, .add-close, .edit-student-close, .classes-close, .group-close, .group-detail-close, .reports-close, .summary-close').forEach(b => b.onclick = () => closeModal(b.closest('.modal-overlay')));
        wire('rankingTitle', showClassSummary);
        
        wire('cancelMultiBtn', toggleMultiSelectMode);
        wire('selectAllBtn', () => { 
            if (currentView === 'groups') {
                if (selectedGroupIds.size === groups.length) selectedGroupIds.clear();
                else groups.forEach(g => selectedGroupIds.add(g.id));
                document.getElementById('multiSelectCount').textContent = `已選擇 ${selectedGroupIds.size} 個群組`;
                renderGroups();
            } else {
                if (selectedStudentIds.length === students.length) selectedStudentIds.length = 0;
                else { selectedStudentIds.length = 0; students.forEach(s => selectedStudentIds.push(s.id)); }
                document.getElementById('multiSelectCount').textContent = `已選擇 ${selectedStudentIds.length} 位學生`;
                renderStudents();
            }
        });
        
        const fsSel = document.getElementById('fontSizeSelect'); if(fsSel) fsSel.onchange = (e) => { settings.ftS = e.target.value; applySettings(); saveData(true); };
        const sSel = document.getElementById('enableSoundSetting'); if(sSel) sSel.onchange = (e) => { settings.eS = e.target.checked ? 1 : 0; saveData(true); };
        const saSel = document.getElementById('showAvatarSetting'); if(saSel) saSel.onchange = (e) => { settings.sAv = e.target.checked ? 1 : 0; applySettings(); saveData(true); };
        const trSel = document.getElementById('showTreasureSetting'); if(trSel) trSel.onchange = (e) => { settings.sTR = e.target.checked ? 1 : 0; renderStudents(); saveData(true); };
        const retSel = document.getElementById('logRetentionSetting'); if(retSel) retSel.onchange = (e) => { settings.lRet = parseInt(e.target.value); applySettings(); saveData(true); performLogRetention(); };

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

        try {
            L('[System] 啟動資料載入與渲染流程...');
            loadClassData(); renderClassSelector(); renderStudents();
            // 變數已由 state.js 在載入時正確初始化，此處僅進行必要的啟動檢查與載入
            sanitizeAndCleanDatabase();
            
            // 如果 classes 仍然為空，則建立預設班級
            if (classes.length === 0) {
                let firstClassId = '我的班級';
                classes.push({ id: firstClassId });
                currentClassId = firstClassId;
                localStorage.setItem('CD_Cls', JSON.stringify(classes));
                localStorage.setItem('CD_cCId', currentClassId);
            }

            loadClassData();
            applySettings(); 
            renderStudents(); 
            renderPointItems(); 
            renderClassSelector();
            performLogRetention();
        } catch (err) {
            console.error('[Critical Error] 系統載入失敗:', err);
            alert('系統載入資料時發生錯誤，您可在「系統設定」->「危險區域」中嘗試重設系統。');
        }

        wire('editProfileBtn', () => { const s = students.find(x => x.id === currentProfileId); if(!s) return; document.getElementById('editStudentName').value = s.id; document.getElementById('editStudentAvatarStyle').value = s.aS || 'fe'; document.getElementById('editStudentAvatarPreview').src = getAvatarUrl(s.aU || s.id, s.aS); closeModal(document.getElementById('studentProfileModal')); openModal(document.getElementById('editStudentModal')); });
        
        wire('applyClassAvatarBtn', () => { 
            const style = document.getElementById('classAvatarStyle').value;
            if(confirm('確定要將全班學生的頭像風格都換成這個嗎？')) {
                students.forEach(s => s.aS = style);
                pushOp(ACT.SET_AVATAR_STYLE, style);
                saveData(); renderStudents(); alert('全班頭像已更新並記錄同步！');
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
                    const selIdx = selectedStudentIds.indexOf(s.id); 
                    if(selIdx > -1) { selectedStudentIds[selIdx] = newName; }
                    s.id = newName;
                }
                s.aS = newStyle; 
                pushOp(ACT.STU_UPD, s);
                saveData(); renderStudents(); closeModal(document.getElementById('editStudentModal')); 
            } else if(!nameInp.value.trim()) alert('請輸入姓名');
        });
        wire('deleteStudentBtn', () => { if(confirm('刪除？')) { 
            pushOp(ACT.STU_DEL, currentProfileId);
            students = students.filter(x => x.id !== currentProfileId); logs = logs.filter(x => x.sID !== currentProfileId); saveData(); renderStudents(); closeModal(document.getElementById('editStudentModal')); 
        } });
        wire('saveStudentBtn', () => { 
            const i = document.getElementById('newStudentName'); if(!i.value.trim()) return; 
            i.value.split('\n').forEach(n => { 
                const name = n.trim(); if(name) {
                    if(students.some(s => s.id === name)) { console.warn('跳過重複姓名:', name); return; }
                    const newStu = { id: name, cP: 0, iP: 0, aS: 'fe', aU: getRandomSeed(), tr: {} };
                    students.push(newStu);
                    pushOp(ACT.STU_UPD, newStu);
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
            pushOp(ACT.GRP_UPD, g);
            saveData(); renderGroups(); closeModal(document.getElementById('manageGroupModal')); 
        });
        wire('deleteGroupBtn', () => { if(confirm('刪除群組？')) { 
            pushOp(ACT.GRP_DEL, editingGroupId);
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
                    pushOp(ACT.SET_CUSTOM_ITEMS, customItems, true);
                    saveData();
                    renderCustomDropdown();
                }
            }
            const v = parseInt(document.getElementById('customAwardValue').value) || 0; 
            const ign = document.getElementById('customAwardIgnore').checked; 
            awardPoints('custom', l, v, ign); 
            if (tempInp) tempInp.value = '';
            try {
                const saved = JSON.parse(localStorage.getItem('CD_CustomTemp') || '{}');
                saved.temp = '';
                localStorage.setItem('CD_CustomTemp', JSON.stringify(saved));
            } catch(e) {}
        });

        wire('customAwardClearBtn', () => {
            const v = document.getElementById('customAwardValue'); if (v) { v.value = ''; v.focus(); v.dispatchEvent(new Event('input')); }
        });
        wire('customAwardNegBtn', () => {
            const v = document.getElementById('customAwardValue'); if (!v) return;
            const cur = v.value.trim();
            if (!cur || cur === '0') { v.value = '-'; }
            else if (cur.startsWith('-')) { v.value = cur.substring(1); }
            else { v.value = '-' + cur; }
            v.focus();
            v.dispatchEvent(new Event('input'));
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
        document.querySelectorAll('.sort-btn').forEach(b => b.onclick = () => { 
            currentSort = b.dataset.sort; 
            currentReportPage = 1;
            document.querySelectorAll('.sort-btn').forEach(x => x.classList.remove('active')); 
            b.classList.add('active'); 
            renderReports(); 
        });
        document.querySelectorAll('.report-view-btn').forEach(b => b.onclick = () => { 
            currentReportView = b.dataset.reportView; 
            currentReportPage = 1;
            document.querySelectorAll('.report-view-btn').forEach(x => x.classList.remove('active')); 
            b.classList.add('active'); 
            renderReports(); 
        });
        
        wire('saveCustomItemsBtn', () => { 
            const ta = document.getElementById('customItemsTextarea'); if(!ta) return;
            customItems = ta.value.split('\n').map(s => s.trim()).filter(Boolean);
            pushOp(ACT.SET_CUSTOM_ITEMS, customItems, true);
            saveData(); renderPointItems();
            alert('已儲存');
        });

        wire('addTreasureBtn', () => { 
            const l = document.getElementById('newTreasureLabel'); const i = document.getElementById('newTreasureIconBtn'); if(!l.value.trim()) return; 
            const itemId = Math.random().toString(36).substring(2, 8);
            const item = { id: itemId, lb: l.value.trim(), ic: i.textContent };
            treasureDefs.push(item); 
            pushOp(ACT.TR_DEF_UPD, item);
            saveData(); renderPointItems(); l.value = ''; 
        });

        wire('addPositiveBtn', () => { 
            const l = document.getElementById('newPositiveLabel'); const v = document.getElementById('newPositiveValue'); const i = document.getElementById('newPositiveIconBtn'); const ign = document.getElementById('newPositiveIgnore'); if(!l.value.trim()) return; 
            let val = isNaN(parseInt(v.value)) ? 1 : parseInt(v.value);
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
                    pushOp(ACT.TR_DEF_UPD, item);
                    saveData(); renderPointItems(); 
                    if (!document.getElementById('studentProfileModal').classList.contains('hidden')) renderStudentTreasures();
                    closeModal(document.getElementById('editPointItemModal'));
                }
            } else {
                const v = parseInt(document.getElementById('editItemValue').value) || 0;
                const item = pointItems[editingPointItemCat].find(i => i.id === editingPointItemId);
                if(item) {
                    item.lb = l; item.vl = v; item.ic = ic;
                    if(document.getElementById('editItemIgnore').checked) item.iSum = 1; else delete item.iSum;
                    pushOp(ACT.ITEM_UPD, { c: editingPointItemCat, i: item });
                    saveData(); renderPointItems(); closeModal(document.getElementById('editPointItemModal'));
                }
            }
        });

        wire('createClassBtn', () => { 
            const nInp = document.getElementById('newClassName');
            const n = nInp.value.trim(); if(!n) return; 
            if(classes.some(c => c.id === n)) return alert('班級名稱已存在');
            let items = JSON.parse(JSON.stringify(defaultItems));
            let s = [], g = [];
            const src = document.getElementById('copyFromClassSelect').value; 
            const copyItems = document.getElementById('copyItemsCheckbox').checked;
            const copyStudents = document.getElementById('copyStudentsCheckbox').checked;

            if (src) {
                if (copyItems) {
                    const siValue = localStorage.getItem(`CD_${src}_itm`);
                    const si = siValue ? JSON.parse(siValue) : null;
                    if (si) {
                        items.pos = (si.pos||[]).sort((a,b)=>a.lb.localeCompare(b.lb, 'zh-TW')).map(x => ({...x, id: Math.random().toString(36).substring(2, 8)}));
                        items.neg = (si.neg||[]).sort((a,b)=>a.lb.localeCompare(b.lb, 'zh-TW')).map(x => ({...x, id: Math.random().toString(36).substring(2, 8)}));
                    }
                }
                if (copyStudents) { 
                    const oldSData = JSON.parse(localStorage.getItem(`CD_${src}_Stus`) || '[]'); 
                    s = oldSData.map(x => ({ id: x.id, cP: 0, iP: 0, aS: 'fe', aU: getRandomSeed(), tr: {} })); 
                    g = JSON.parse(localStorage.getItem(`CD_${src}_Gs`) || '[]'); 
                } 
            }

            classes.push({ id: n }); 
            pushOp(ACT.CLS_NEW, { id: n, s, itm: items, g }, true);
            students = s; pointItems = items; groups = g; logs = []; currentClassId = n; 
            saveData(); renderStudents(); renderPointItems(); renderClassSelector(); nInp.value = ''; closeModal(document.getElementById('manageClassesModal'));
        });
        
        wire('syncStatus', () => performCloudUpload(true));
        wire('cloudUploadBtn', () => { if(confirm('會以上傳的本地資料覆蓋雲端，確定？')) performCloudUpload(); });
        wire('cloudDownloadBtn', () => { if(confirm('會覆蓋本地資料，確定？')) performCloudDownload(true); });
        
        const binInp = document.getElementById('cloudBinId'); if(binInp) { binInp.value = cloudBinId; binInp.onchange = (e) => { cloudBinId = e.target.value; saveData(); startSyncTimer(); }; }
        const keyInp = document.getElementById('cloudApiKey'); if(keyInp) { keyInp.value = cloudApiKey; keyInp.onchange = (e) => { cloudApiKey = e.target.value; saveData(); startSyncTimer(); }; }
        
        const bindSelect = (id, key, isStyleVar = true, styleVarName = null, isPercent = false, isUnitless = false) => {
            const el = document.getElementById(id); if(!el) return;
            el.onchange = (e) => {
                const val = Number(e.target.value);
                settings[key] = val;
                if(isStyleVar) {
                    const unit = isUnitless ? '' : (isPercent ? '%' : 'px');
                    document.documentElement.style.setProperty(styleVarName || `--${key}`, val + unit);
                }
                if(key === 'ftS') document.documentElement.style.setProperty('--body-font-size', val + 'px');
                if(key === 'itmS') document.documentElement.style.setProperty('--item-scale', val + 'px');
                saveData(true);
                if(['ftS','col','sTR'].includes(key)) renderStudents(); 
                if(['gCol'].includes(key)) renderGroups();
            };
        };
        
        bindSelect('fontSizeSelect', 'ftS', false);
        bindSelect('gridColsSelect', 'col', true, '--grid-cols', false, true);
        bindSelect('cardHeightSelect', 'sCH', true, '--student-card-height');
        bindSelect('groupHeightSelect', 'gCH', true, '--group-card-height');
        bindSelect('groupColsSelect', 'gCol', true, '--group-grid-cols', false, true);
        bindSelect('itemColsSelect', 'iCol', true, '--item-grid-cols', false, true);
        bindSelect('itemScaleSelect', 'itmS', false); 
        bindSelect('avatarSizeSelect', 'avS', false);
        bindSelect('cardGapVSelect', 'cGV', true, '--card-gap-v');
        bindSelect('cardGapHSelect', 'cGH', true, '--card-gap-h');
        bindSelect('itemGapVSelect', 'iGV', true, '--item-gap-v');
        bindSelect('itemGapHSelect', 'iGH', true, '--item-gap-h');

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
                    pushOp(ACT.SET_PT_ITEMS, pointItems);
                    saveData(); renderPointItems(); alert('行為項目已成功覆蓋綁定及紀錄同步！');
                }
            }
        });

        wire('copyPointsBtn', () => {
             const range = getReportsTimeRange();
             let data = students.map(s => {
                 let pts = logs.filter(l => l.sID === s.id).reduce((sum, l) => {
                     const ts = getTS(l.TS);
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
                     const ts = getTS(l.TS);
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
            const filteredLogs = logs.filter(l => {
                const ts = getTS(l.TS);
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
                validItems.forEach(itm => { row += `,${sLogs.filter(l => l.lb === itm).reduce((acc, l) => acc + l.pt, 0)}`; });
                csv += row + '\n';
            });
            const b = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = `report_${new Date().toLocaleDateString()}.csv`; a.click();
        });

        const rRange = document.getElementById('timeRangeFilter'); if(rRange) {
            rRange.onchange = () => {
                const cu = document.getElementById('customDateContainer'); if(cu) cu.classList.toggle('hidden', rRange.value !== 'custom');
                currentReportPage = 1;
                renderReports();
            };
        }
        const sD = document.getElementById('startDateFilter'); if(sD) sD.onchange = () => { currentReportPage = 1; renderReports(); };
        const eD = document.getElementById('endDateFilter'); if(eD) eD.onchange = () => { currentReportPage = 1; renderReports(); };

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
            iFile.onchange = (e) => { 
                const f = e.target.files[0]; if(!f) return; 
                const r = new FileReader(); 
                if (f.name.endsWith('.gz')) {
                    r.onload = async (ev) => { try { const p = await decompressBinary(ev.target.result); if(p) restoreFromBackup(p); } catch(err) { alert('匯入失敗'); } }; 
                    r.readAsArrayBuffer(f);
                } else {
                    r.onload = (ev) => { try { restoreFromBackup(JSON.parse(ev.target.result)); } catch(err) { alert('匯入失敗'); } }; 
                    r.readAsText(f); 
                }
            };
        }
        
        wire('multiAwardBtn', () => { 
            let ids = [];
            let title = '';
            if (currentView === 'groups') {
                if(selectedGroupIds.size === 0) return;
                selectedGroupIds.forEach(gid => {
                    const g = groups.find(x => x.id === gid);
                    if(g) ids = ids.concat(g.sIds);
                });
                title = `給予 ${selectedGroupIds.size} 個群組 (${ids.length} 人次) 點數`;
            } else {
                if(selectedStudentIds.length === 0) return;
                ids = [...selectedStudentIds];
                title = `給予 ${ids.length} 位學生點數`;
            }
            openAwardModal(ids, title); 
        });
        
        wire('toggleMultiSelectBtn', toggleMultiSelectMode);

        wire('resetAllClassesPointsBtn', () => { 
            if(confirm('重置「所有班級」學生的點數與紀錄？')) { 
                classes.forEach(c => {
                    localStorage.setItem(`CD_${c.id}_Ls`, '[]');
                    const stus = JSON.parse(localStorage.getItem(`CD_${c.id}_Stus`) || '[]');
                    stus.forEach(s => { s.cP = 0; s.iP = 0; });
                    localStorage.setItem(`CD_${c.id}_Stus`, JSON.stringify(stus));
                });
                logs = []; students.forEach(s => { s.cP = 0; s.iP = 0; });
                pushOp(18, null, true);
                saveData(); renderStudents(); if(currentView === 'groups') renderGroups(); alert('已重置');
            } 
        });
        wire('resetCurrentClassPointsBtn', () => { 
            if(confirm(`重置目前班級「${currentClassId}」學生的點數與紀錄？`)) { 
                logs = []; students.forEach(s => { s.cP = 0; s.iP = 0; });
                pushOp(16, null); 
                saveData(); renderStudents(); if(currentView === 'groups') renderGroups(); alert('已重置');
            } 
        });
        wire('resetSystemBtn', () => { if(confirm('重置系統？')) { 
            const keys = []; for (let i=0; i<localStorage.length; i++) { const k = localStorage.key(i); if (k && (k.startsWith('CD_') || ['BId', 'Key', 'aSyn', 'sVer'].includes(k))) keys.push(k); }
            keys.forEach(k => localStorage.removeItem(k)); location.reload(); 
        } });

const icons = [
    // 常用 & 符號
    '⭐','🤝','🎯','🙋','💪','📚','🎨','⚽','🧹','♻️','📢','⌛','📵','🗣️','🤷','😡','😴','🎮','🍕','🍎','🌈','🔥','💧','⚡','🏆','💎','🎁','🚀','✨','🎉','🎈','🌈','☀️','🌊','❤️','✅','❌','⚠️','🔔','💡','📅','💯','🔍','⏰','🎂','🧿','🧲','🧯',
    
    // 文具與辦公 (全數換回圖標)
    '📝','📔','📕','📖','📗','📘','📓','📒','🖊️','✒️','✏️','🖍️','🖌️','✂️','📏','📐','📌','📍','📎','🖇️','📁','📂','🗂️','🔖','📅','📆','🗒️','🗓️','📋','📦','🗑️','💼','👜','🎒','🔒','🔓','🔏','🔐',

    // 動物 (文字已修正為圖標)
    '🐱','🐶','🦊','🐰','🐻','🐼','🦁','🐮','🐷','🐸','🐵','🐒','🐔','🐧','🐦','🐤','🦆','🦅','🦉','🦇','🐺','🐗','🐴','🦄','🐝','🐛','🦋','🐌','🐞','🐜','🦟','🦗','🕷️','🦂','🐢','🐍','🦎','🦖','🦕','🐙','🦑','🦐','🦞','🦀','🐡','🐠','🐟','🐬','🐳','🐋','🦈','🐊','🐅','🐆','🦓','🦍','🦧','🐘','🦛','🦏','🐪','🐫','🦒','🦘','🐃','🐂','🐄','🐎','🐖','🐑','🐏','🐐','🦌','🐕','🐩','🦮','🐕‍🦺','🐈','🐈‍⬛','🐓','🦃','🦚','🦜','🦢','🦩','🕊️','🦝','🦨','🦡','🦦','🦥','🐁','🐀','🐿️','🦔',

    // 植物與食物 (文字已修正為圖標)
    '🌵','🎄','🌲','🌳','🌴','🌱','🌿','☘️','🍀','🎍','🎋','🍃','🍂','🍁','🍄','🐚','💨','🌪️','🍇','🍈','🍉','🍊','🍋','🍌','🍍','🥭','🍎','🍏','🍐','🍒','🍓','🍅','🥥','🥑','🥔','🌽','🌶️','🥒','🥬','🥦','🧄','🥜','🌰','🍞','🥐','🥖','🥞','🧀','🍖','🍗','🥩','🥓','🍔','🍟','🌭','🥪','🌮','🌯','🥙','🧆','🥚','🍳','🥘','🍲','🥣','🥗','🍿','🧈','🧂','🍱','🍘','🍙','🍚','🍛','🍜','🍝','🍠','🍢','🍣','🍤','🍥','🥮','🍡','🥟','🥠','🥡','🍦','🍧','🍨','🍩','🍪','🎂','🍰','🧁','🥧','🍫','🍬','🍭','🍮','🍯','🍼','🥛','☕','🍵','🍾','🍷','🍸','🍹','🍺','🍻','🥂','🥃','🥤','🧃','🧉','🧊',

    // 交通與建築 (文字已修正為圖標)
    '🚗','🚕','🚙','🚌','🚎','🏎️','🚓','🚑','🚒','🚐','🚚','🚛','🚜','🛵','🚲','🛴','🚏','🛤️','⛽','🚨','🚥','🚦','🚧','⚓','⛵','🛶','🚤','🛳️','⛴️','🚢','✈️','🛩️','🛫','🛬','🪂','💺','🚟','🚀','🛸','🪐','🌍','🌎','🌏',

    // 物品與雜項
    '🔭','🔬','🧬','🧪','🌡️','🧺','🧻','🧼','🛁','🚿','🚽','🗝️','🔨','🪓','⛏️','⚒️','🛠️','🗡️','⚔️','🔫','🛡️','🔧','🗜️','⚖️','🦯','⛓️','💈','⚗️','⚙️','🧱','🧲','🚬','⚰️','⚱️','🧿','🔮','📿','🏺','🕯️','🔦','🏮','📽️','📱','📲','⌨️','🖨️','🖱️','💽','💾','💿','📀','📼','📸','📹','🎞️','☎️','📟','📠','📺','📡','🔋','🔌','🪔','🗑️','🛢️','💸','💵','💴','💶','💷','💰','💳','💎','🛒','🎁','🎈','🎏','🎀','🎊','🎉','🎎','🎐','✉️','📨','📩','📪','📫','📬','📭','📮',
    
        // 表情
    '😀','😂','🥰','😎','🤩','😇','🤗','🤔','😤','🥺','😱','🤯','🥳','😈','💀','🤖','👽','👾','🎃','👀','😅','🤣','🙂','🙃','😉','😊','😍','😘','😗','😚','😙','😋','😛','😜','🤪','🤨','🧐','🤓','😏','😒','😞','😌','😔','😟','😕','☹️','😣','😖','😫','😩','😢','😭','😠','🥵','🥶','😳','🤫','🤤','😷','🤒','🤕','🤢','🤮','🤧','😵','🤠','🤡','👺'
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
                const seed = 's'+i; const url = getAvatarUrl(seed, document.getElementById('editStudentAvatarStyle').value);
                const img = document.createElement('img'); img.src = url; img.className = 'avatar-picker-item';
                img.onclick = () => { document.getElementById('editStudentAvatarPreview').src = url; const s = students.find(x=>x.id===currentProfileId); if(s) s.aU = seed; closeModal(document.getElementById('avatarPickerModal')); };
                grid.appendChild(img);
            }
            openModal(document.getElementById('avatarPickerModal'));
        });
        wire('randomizeAvatarBtn', () => { 
            const seed = getRandomSeed(); const url = getAvatarUrl(seed, document.getElementById('editStudentAvatarStyle').value); 
            document.getElementById('editStudentAvatarPreview').src = url; const s = students.find(x=>x.id===currentProfileId); if(s) s.aU = seed; 
        });

        const startSyncTimer = () => {
            if (window.checkTimer) clearInterval(window.checkTimer); if (autoSyncTimer) clearInterval(autoSyncTimer);
            if (!cloudBinId || !cloudApiKey || autoSyncInterval <= 0) return;
            window.checkTimer = setInterval(() => {
                if (isSyncing) return; idleSeconds++;
                if (isDirty > 0) { 
                    mSyn--; 
                    if (mSyn <= 0) { 
                        const m = (idleSeconds / 60).toFixed(1);
                        L(`[CloudSync] 達智慧頻率，執行同步。閒置 ${m} 分鐘，重設頻率為 ${getSmartSyncInterval()} 秒。`);
                        checkCloudSyncState(); 
                        mSyn = getSmartSyncInterval(); 
                    } 
                }
            }, 1000);
            if (autoSyncInterval > 0) autoSyncTimer = setInterval(() => { if (isDirty === 1 && !isSyncing) checkCloudSyncState(); }, Math.max(autoSyncInterval, 15) * 1000);
            setTimeout(() => { if (!isSyncing) checkCloudSyncState(); }, 1500);
        };
        startSyncTimer();

        // --- Key Listeners ---
        window.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                const modals = document.querySelectorAll('.modal-overlay:not(.hidden)');
                if (modals.length > 0) {
                    // Close the last (top-most) modal
                    closeModal(modals[modals.length - 1]);
                }
            }
        });
    };

    bootSequence();
});
