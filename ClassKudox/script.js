/**
 * ClassKudox - Main Entry Point
 */


function App() {
    const { currentView } = React.useContext(AppContext);
    
    return (
        <div className="app-container">
            <Header />
            <div className="main-content">
                {currentView === 'students' ? <StudentGrid /> : <GroupGrid />}
            </div>
            <Modals />
            <Settings />
            <Reports />
            <MultiSelectBar />
        </div>
    );
}

const startApp = () => {
    if (window.isAppStarted) return;
    window.isAppStarted = true;
    console.log(`%c ClassKudox v${APP_VER} `, 'background:#222;color:#0f0;font-weight:bold;font-size:14px;padding:2px 6px;border-radius:3px;');
    window._LOGS.push({ t: Date.now(), l: 'L', m: ` ClassKudox v${APP_VER} ` });
    if (window._LOGS.length > 1000) window._LOGS.shift();

    try {
        const rootEl = document.getElementById('root');
        if (rootEl) {
            ReactDOM.render(
                <AppProvider>
                    <App />
                </AppProvider>,
                rootEl
            );
        }
    } catch (e) {
        LE("React render failed", e);
    }

    const fallbackSvg = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="%23e2e8f0"/><circle cx="50" cy="45" r="20" fill="%2394a3b8"/><path d="M20 100 C 20 60, 80 60, 80 100" fill="%2394a3b8"/></svg>`;
    window.addEventListener('error', function(e) {
        if (e.target.tagName && e.target.tagName.toLowerCase() === 'img') {
            if (e.target.src !== fallbackSvg) e.target.src = fallbackSvg;
        }
    }, true);

    // --- 相容性 Mock 渲染函式 (Bridge to React) ---
    const refreshProxy = () => { 
        if (window._refreshReact) {
            // 使用 setTimeout 確保在主執行緒空閒時觸發，避免競爭狀態
            setTimeout(() => window._refreshReact(), 0);
        } else {
            // 如果 React 還沒掛載完成，稍後重試 
            setTimeout(refreshProxy, 50);
        }
    };
    window.refreshProxy = refreshProxy;
    // 對於由 React 接管的主畫面渲染，只需觸發 React 刷新
    window.renderStudents = refreshProxy;
    window.renderGroups = refreshProxy;
    
    // 對於由 Vanilla JS 管理的彈窗內容，必須同時執行原有的渲染邏輯與 React 刷新
    const wrapVanilla = (origName) => {
        const orig = window[origName];
        window[origName] = (...args) => {
            if (typeof orig === 'function' && orig !== window[origName]) orig(...args);
            refreshProxy();
        };
    };

    wrapVanilla('renderPointItems');
    wrapVanilla('renderClassSelector');
    wrapVanilla('renderClassesList');
    wrapVanilla('applySettings');
    wrapVanilla('showClassSummary');
    wrapVanilla('updateSyncStatus');
    
    // 加強版的刷新 Proxy，確保 React 狀態與全域變數同步
    window.refreshProxy = () => {
        if (window._refreshReact) {
            // 使用 setTimeout 確保在主執行緒空閒時觸發，避免競爭狀態
            setTimeout(() => window._refreshReact(), 0);
        }
    };
    window.renderStudents = window.refreshProxy;
    window.renderGroups = window.refreshProxy;

    window._showUndoToastUI = (msg) => {
        const el = document.getElementById('undoMessage'); if(el) el.textContent = msg;
        const toast = document.getElementById('undoToast'); if(toast) toast.classList.remove('hidden');
    };
    window._hideUndoToastUI = () => {
        const toast = document.getElementById('undoToast'); if(toast) toast.classList.add('hidden');
    };
    window._scrollToReportLogsUI = () => {
        const el = document.getElementById('reportActivityTitle');
        if(el) el.scrollIntoView({ behavior: 'smooth' });
    };
    window._showVercountUI = (val) => {
        const span = document.getElementById('busuanzi_value_page_pv');
        const container = document.getElementById('busuanzi_container_page_pv');
        if (span) span.innerText = val;
        if (container) container.style.display = 'inline';
    };
    window._initVercountUI = (valKey, timeKey) => {
        const span = document.getElementById('busuanzi_value_page_pv');
        const container = document.getElementById('busuanzi_container_page_pv');
        if (!span) return;
        const script = document.createElement('script');
        script.src = 'https://events.vercount.one/js';
        script.defer = true;
        const observer = new MutationObserver(() => {
            const newVal = span.innerText;
            if (newVal && newVal !== '--' && newVal !== '') {
                localStorage.setItem(valKey, newVal);
                localStorage.setItem(timeKey, Date.now());
                if (container) container.style.display = 'inline';
                observer.disconnect();
            }
        });
        observer.observe(span, { childList: true, characterData: true, subtree: true });
        document.head.appendChild(script);
    };

    window.switchMainView = (v) => {
        window.currentView = v;
        if (typeof currentView !== 'undefined') currentView = v;
        // 更新 Tab 狀態
        document.querySelectorAll('.view-tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.getAttribute('data-view') === v);
        });
        window.refreshProxy();
    };
    const MODAL_ID_MAP = {
        'settingsModal': 'settings',
        'reportsModal': 'reports',
        'addStudentModal': 'addStudent',
        'manageClassesModal': 'manageClasses',
        'studentProfileModal': 'studentProfile',
        'manageGroupModal': 'manageGroup',
        'groupDetailModal': 'groupDetail',
        'classSummaryModal': 'classSummary',
        'editStudentModal': 'editStudent',
        'editPointItemModal': 'editPointItem',
        'iconPickerModal': 'iconPicker',
        'avatarPickerModal': 'avatarPicker',
        'classSummaryStudentDetailModal': 'summaryDetail'
    };

    window.openModal = (el) => { 
        if (!el) return;
        const reactName = MODAL_ID_MAP[el.id];
        if (reactName && window._setReactModal) {
            el.classList.remove('hidden');
            window._setReactModal(reactName, true);
        } else {
            el.classList.remove('hidden'); 
            setTimeout(() => el.classList.add('visible'), 10);
            document.body.classList.add('modal-open');
        }
    };
    window.closeModal = (el) => { 
        if (!el) return;
        const reactName = MODAL_ID_MAP[el.id];
        if (reactName && window._setReactModal) {
            window._setReactModal(reactName, false);
        } else {
            el.classList.remove('visible'); 
            setTimeout(() => el.classList.add('hidden'), 300);
            setTimeout(() => {
                const anyOpen = !!document.querySelector('.modal-overlay:not(.hidden)');
                if (!anyOpen) document.body.classList.remove('modal-open');
            }, 350);
        }
    };

    const bootSequence = async () => {
        const wire = (id, fn) => { const el = document.getElementById(id); if(el) el.onclick = fn; };
        
        wire('settingsBtn', () => { 
            try {
                const sz = document.getElementById('jsonSizeEst'); 
                if(sz) sz.textContent = `(約 ${(JSON.stringify(getFullBackupData(false)).length / 1024).toFixed(1)} KB)`; 
            } catch(e) {}
            openModal(document.getElementById('settingsModal')); 
            if (window.initSelectOptions) window.initSelectOptions(); // 確保 React 渲染後才填充下拉選單
            applySettings(); renderPointItems(); 
        });
        wire('manualShowUndoBtn', () => {
            closeModal(document.getElementById('settingsModal'));
            if (typeof showUndoToast === 'function') showUndoToast();
        });
        // 導覽列功能已遷移至 React Header 元件處理，此處僅保留非 React 控制的 DOM 滾動監聽
        window.addEventListener('scroll', () => {
            const floatingBtn = document.getElementById('floatingMultiSelectBtn');
            const undoToast = document.getElementById('undoToast');
            if (floatingBtn) {
                const isModalOpen = !!document.querySelector('.modal-overlay:not(.hidden)');
                const isBottom = (window.innerHeight + window.scrollY) >= (document.documentElement.scrollHeight - 80);
                
                // 讀取 window.isMultiSelectMode（已由 React 同步更新）
                const shouldShowFloating = isBottom && !window.isMultiSelectMode && !isModalOpen;

                if (shouldShowFloating) {
                    floatingBtn.classList.remove('hidden');
                    floatingBtn.style.padding = '0.7rem 1.3rem';
                    floatingBtn.style.fontSize = '1.05rem';
                    floatingBtn.style.borderRadius = '999px';
                    floatingBtn.style.bottom = '85px';
                    if(undoToast) {
                        undoToast.classList.add('has-floating-btn');
                        undoToast.style.right = '200px';
                    }
                } else {
                    floatingBtn.classList.add('hidden');
                    if(undoToast) undoToast.classList.remove('has-floating-btn');
                }
            }
        });

        document.querySelectorAll('.reports-mobile-tab').forEach(btn => {
            btn.onclick = () => {
                document.querySelectorAll('.reports-mobile-tab').forEach(t => t.classList.remove('active'));
                btn.classList.add('active');
                const target = btn.getAttribute('data-target');
                const layout = document.querySelector('.reports-body-layout');
                if(layout) {
                    if (target === 'reports-left-panel') {
                        layout.classList.add('mobile-show-left');
                        layout.classList.remove('mobile-show-right');
                    } else {
                        layout.classList.add('mobile-show-right');
                        layout.classList.remove('mobile-show-left');
                    }
                }
            };
        });

        // 班級管理頁籤 (手機版預設顯示「我的班級」)
        document.querySelectorAll('.classes-tab-btn').forEach(btn => {
            btn.onclick = () => {
                const tabId = btn.dataset.classTab;
                document.querySelectorAll('.classes-tab-btn').forEach(b => b.classList.toggle('active', b === btn));
                document.querySelectorAll('.classes-tab-content').forEach(c => c.classList.toggle('active', c.id === `classesTab${tabId.charAt(0).toUpperCase() + tabId.slice(1)}`));
                const body = document.querySelector('.classes-modal-body'); if(body) body.scrollTop = 0;
            };
        });
        
        document.querySelectorAll('.view-tab-btn').forEach(b => b.onclick = () => window.switchMainView(b.dataset.view));
        document.querySelectorAll('.close-modal-btn, .cancel-btn, .settings-close, .profile-close, .add-close, .edit-student-close, .classes-close, .group-close, .group-detail-close, .reports-close, .summary-close').forEach(b => b.onclick = () => closeModal(b.closest('.modal-overlay')));
        
        const wireRanking = () => {
            const btns = document.querySelectorAll('#rankingTitle, #reportsRankingBtn');
            btns.forEach(btn => {
                btn.onclick = () => { if (window.showClassSummary) window.showClassSummary(); };
            });
        };
        wireRanking();
        
        // 多選工具列功能已完全遷移至 React Context 與 MultiSelectBar 元件
        
        const fsSel = document.getElementById('fontSizeSelect'); if(fsSel) fsSel.onchange = (e) => { settings.ftS = e.target.value; applySettings(); saveData(true); };
        const sSel = document.getElementById('enableSoundSetting'); if(sSel) sSel.onchange = (e) => { settings.eS = e.target.checked ? 1 : 0; saveData(true); };
        const saSel = document.getElementById('showAvatarSetting'); if(saSel) saSel.onchange = (e) => { settings.sAv = e.target.checked ? 1 : 0; applySettings(); saveData(true); };
        const trSel = document.getElementById('showTreasureSetting'); if(trSel) trSel.onchange = (e) => { settings.sTR = e.target.checked ? 1 : 0; renderStudents(); saveData(true); };
        const retSel = document.getElementById('logRetentionSetting'); if(retSel) retSel.onchange = (e) => { settings.lRet = parseInt(e.target.value); applySettings(); saveData(true); performLogRetention(); };

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
        
        // Ensure React gets the latest loaded data once the boot sequence finishes loading memory
        if (window._refreshReact) window._refreshReact();
        
        wire('applyClassAvatarBtn', () => { 
            const style = document.getElementById('classAvatarStyle').value;
            if(confirm('確定要將全班學生的頭像風格都換成這個嗎？')) {
                window.applyClassAvatarStyle(style);
                renderStudents(); alert('全班頭像已更新並記錄同步！');
            }
        });

        wire('saveEditStudentBtn', () => { 
            const newName = document.getElementById('editStudentName').value;
            const newStyle = document.getElementById('editStudentAvatarStyle').value;
            const result = window.renameStudent(currentProfileId, newName, newStyle);
            if (result && !result.success) return alert(result.error);
            if (result && result.success) { renderStudents(); closeModal(document.getElementById('editStudentModal')); }
        });
        wire('deleteStudentBtn', () => { if(confirm('刪除？')) { 
            window.deleteStudent(currentProfileId); renderStudents(); closeModal(document.getElementById('editStudentModal'));
        } });
        wire('saveStudentBtn', () => { 
            const i = document.getElementById('newStudentName'); if(!i.value.trim()) return; 
            window.addStudents(i.value.split('\n')); 
            renderStudents(); i.value = ''; closeModal(document.getElementById('addStudentModal')); 
        });
        
        wire('saveGroupBtn', () => { 
            const name = document.getElementById('groupNameInput').value.trim();
            const sids = Array.from(document.querySelectorAll('#groupStudentSelectionGrid input:checked')).map(cb => cb.value); 
            const result = window.saveGroup(name, sids, editingGroupId);
            if (result && !result.success) return alert(result.error);
            if (result && result.success) { renderGroups(); closeModal(document.getElementById('manageGroupModal')); }
        });
        wire('deleteGroupBtn', () => { if(confirm('刪除群組？')) { 
            window.deleteGroup(editingGroupId); renderGroups(); closeModal(document.getElementById('manageGroupModal')); 
        } });
        wire('groupAwardPointsBtn', () => { 
            if(!awardContextIds.length) return; 
            openAwardModal(awardContextIds, document.getElementById('groupDetailTitle').textContent, currentGroupIdForAward); 
            closeModal(document.getElementById('groupDetailModal')); 
        });
        wire('groupAwardTreasureBtn', () => {
            if(!awardContextIds.length) return;
            window._pendingProfileTab = 'treasure';
            openAwardModal(awardContextIds, document.getElementById('groupDetailTitle').textContent, currentGroupIdForAward);
            closeModal(document.getElementById('groupDetailModal'));
        });
        wire('editGroupDetailBtn', () => { const g = groups.find(x => x.sIds.every(sid => awardContextIds.includes(sid)) && x.sIds.length === awardContextIds.length); if(g) openManageGroupModal(g.id); closeModal(document.getElementById('groupDetailModal')); });

        // 自訂獎勵面板已完全遷移至 React 受控元件，移除所有 Vanilla 監聽器
        
        // 贈與費率變動時同步至雲端
        const wireGiftFee = (id, key) => {
            const el = document.getElementById(id);
            if(el) el.addEventListener('change', () => {
                giftSettings[key] = parseInt(el.value) || 0;
                saveData();
            });
        };
        wireGiftFee('giftFeeInterval', 'gInt');
        wireGiftFee('giftFeeStep', 'gStep');
        
        const giftIgnEl = document.getElementById('giftIgnoreRanking');
        if(giftIgnEl) giftIgnEl.addEventListener('change', () => {
            giftSettings.gIgn = giftIgnEl.checked ? 1 : 0;
            saveData();
        });
        
        wire('confirmGiftBtn', () => {
            const amount = parseInt(document.getElementById('giftAmount').value) || 0;
            if(amount <= 0) return alert('請輸入有效數量');
            const interval = giftSettings.gInt;
            const step = giftSettings.gStep;
            const ign = document.getElementById('giftIgnoreRanking').checked;
            const recipients = Array.from(document.querySelectorAll('#giftRecipientList input:checked')).map(cb => cb.value);
            if(!recipients.length) return alert('請選擇至少一個對象');

            const result = window.processGift(currentProfileId, amount, recipients, interval, step, ign);
            if (result && !result.success) return alert(result.error);
            renderStudents();
            showUndoToast(`已贈與 ${amount} 點給 ${recipients.length} 位學生`);
            closeModal(document.getElementById('studentProfileModal'));
        });

        document.querySelectorAll('.tab-btn').forEach(b => b.onclick = () => {
            switchProfileTab(b.dataset.profileTab);
            // 切換至贈與分頁時，如果需要額外邏輯可加在此（目前 renderGiftTab 已處理賦值）
        });
        document.querySelectorAll('.sub-tab-btn').forEach(b => b.onclick = () => {
            const tab = b.dataset.awardTab;
            switchAwardTab(tab);
            if (tab === 'custom') loadCustomItemPrefs(); // 切換到自訂分頁時自動載入偏好
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
            const sortBtn = document.querySelector('.sort-btn[data-sort="score"]');
            if (sortBtn) {
                sortBtn.textContent = currentReportView === 'treasure' ? '寶物' : '點數';
            }
            renderReports(); 
        });
        
        wire('saveCustomItemsBtn', () => { 
            const ta = document.getElementById('customItemsTextarea'); if(!ta) return;
            window.saveCustomItems(ta.value.split('\n').map(s => s.trim()).filter(Boolean));
            renderPointItems(); alert('已儲存');
        });

        wire('addTreasureBtn', () => { 
            const l = document.getElementById('newTreasureLabel'); const i = document.getElementById('newTreasureIconBtn'); if(!l.value.trim()) return; 
            window.addTreasureItem(l.value, i.textContent);
            renderPointItems(); l.value = ''; 
        });

        wire('addPositiveBtn', () => { 
            const l = document.getElementById('newPositiveLabel'); const v = document.getElementById('newPositiveValue'); const i = document.getElementById('newPositiveIconBtn'); const ign = document.getElementById('newPositiveIgnore'); if(!l.value.trim()) return; 
            const val = isNaN(parseInt(v.value)) ? 1 : parseInt(v.value);
            window.addPointItem('pos', l.value, val, i.textContent, ign.checked);
            renderPointItems(); l.value = ''; v.value = '1'; 
        });
        wire('addNeedsWorkBtn', () => { 
            const l = document.getElementById('newNeedsWorkLabel'); const v = document.getElementById('newNeedsWorkValue'); const i = document.getElementById('newNeedsWorkIconBtn'); const ign = document.getElementById('newNeedsWorkIgnore'); if(!l.value.trim()) return; 
            const val = isNaN(parseInt(v.value)) ? -1 : parseInt(v.value);
            window.addPointItem('neg', l.value, val, i.textContent, ign.checked);
            renderPointItems(); l.value = ''; v.value = '-1'; 
        });
        
        wire('saveEditItemBtn', () => {
            if(!editingPointItemId || !editingPointItemCat) return;
            const l = document.getElementById('editItemLabel').value.trim();
            const ic = document.getElementById('editItemIconBtn').textContent;
            
            if (editingPointItemCat === 'treasure') {
                window.saveEditItem('treasure', editingPointItemId, l, ic);
                renderPointItems();
                if (window.refreshProxy) window.refreshProxy();
                window.closeModal(document.getElementById('editPointItemModal'));
            } else {
                const v = parseInt(document.getElementById('editItemValue').value) || 0;
                const ign = document.getElementById('editItemIgnore').checked;
                window.saveEditItem(editingPointItemCat, editingPointItemId, l, ic, v, ign);
                renderPointItems(); window.closeModal(document.getElementById('editPointItemModal'));
            }
        });

        wire('createClassBtn', () => { 
            const nInp = document.getElementById('newClassName');
            const n = nInp.value.trim(); if(!n) return; 
            const src = document.getElementById('copyFromClassSelect').value; 
            const copyItems = document.getElementById('copyItemsCheckbox').checked;
            const copyStudents = document.getElementById('copyStudentsCheckbox').checked;
            const result = window.createClass(n, src, copyItems, copyStudents);
            if (result && !result.success) return alert(result.error);
            renderStudents(); renderPointItems(); renderClassSelector(); nInp.value = ''; closeModal(document.getElementById('manageClassesModal'));
        });
        
        wire('syncStatus', () => checkCloudSyncState());
        wire('cloudUploadBtn', () => { if(confirm('會以上傳的本地資料覆蓋雲端，確定？')) performCloudUpload(true); });
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
        const avSel = document.getElementById('avatarSizeSelect');
        if(avSel) avSel.addEventListener('change', () => applySettings());
        bindSelect('cardGapVSelect', 'cGV', true, '--card-gap-v');
        bindSelect('cardGapHSelect', 'cGH', true, '--card-gap-h');
        bindSelect('itemGapVSelect', 'iGV', true, '--item-gap-v');
        bindSelect('itemGapHSelect', 'iGH', true, '--item-gap-h');
        bindSelect('versionBackupSetting', 'sBkup', false);

        const ivInp = document.getElementById('autoSyncInterval'); if(ivInp) { ivInp.value = autoSyncInterval; ivInp.onchange = (e) => { autoSyncInterval = parseInt(e.target.value); saveData(); startSyncTimer(); }; }
        wire('resetCloudBinId', () => { if(confirm('重置 URL 或 ID？')) { document.getElementById('cloudBinId').value = ''; cloudBinId = ''; saveData(); } });
        wire('resetCloudApiKey', () => { if(confirm('重置 Key？')) { document.getElementById('cloudApiKey').value = ''; cloudApiKey = ''; saveData(); } });
        wire('confirmSyncBehaviorsBtn', () => {
            const src = document.getElementById('syncFromClassSelect').value;
            if(!src) return alert('請選擇來源班級');
            if(confirm('這將會覆蓋目前班級的行為設定，確定嗎？')) {
                window.syncBehaviors(src);
                renderPointItems(); if (window._refreshReact) window._refreshReact(); alert('行為項目已成功覆蓋綁定及紀錄同步！');
            }
        });

        const copyTextToClipboard = (text, successMsg) => {
            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(text).then(() => alert(successMsg)).catch(e => {
                    fallbackCopy(text, successMsg);
                });
            } else {
                fallbackCopy(text, successMsg);
            }
        };
        const fallbackCopy = (text, successMsg) => {
            const textArea = document.createElement("textarea");
            textArea.value = text;
            textArea.style.position = "fixed";
            textArea.style.left = "-999999px";
            textArea.style.top = "-999999px";
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            try {
                document.execCommand('copy');
                alert(successMsg);
            } catch (err) {
                alert('複製失敗，請手動複製！');
            }
            document.body.removeChild(textArea);
        };

        wire('copyPointsBtn', () => {
             const range = getReportsTimeRange();
             const isTreasure = window._reportView === 'treasure';
             let data = students.map(s => {
                 let val;
                 if (isTreasure) {
                     val = logs.filter(l => l.sID === s.id && l.trId).reduce((sum, l) => {
                         const ts = getTS(l.TS);
                         if (range && (ts < range.start || ts > range.end)) return sum;
                         return sum + (l.trQty || 0);
                     }, 0);
                 } else {
                     val = logs.filter(l => l.sID === s.id).reduce((sum, l) => {
                         const ts = getTS(l.TS);
                         if (range && (ts < range.start || ts > range.end)) return sum;
                         return sum + (l.iSum === 1 ? 0 : l.pt);
                     }, 0);
                 }
                 return { name: s.id, val };
             });
             if (window.currentSort === 'name') data.sort((a,b) => a.name.localeCompare(b.name, 'zh-TW'));
             else data.sort((a,b) => b.val - a.val);
             const text = data.map(d => `${d.val}`).join('\n');
             copyTextToClipboard(text, '已按目前排序複製點數');
        });

        wire('copyNamesBtn', () => {
             const range = getReportsTimeRange();
             const isTreasure = window._reportView === 'treasure';
             let data = students.map(s => {
                 let val;
                 if (isTreasure) {
                     val = logs.filter(l => l.sID === s.id && l.trId).reduce((sum, l) => {
                         const ts = getTS(l.TS);
                         if (range && (ts < range.start || ts > range.end)) return sum;
                         return sum + (l.trQty || 0);
                     }, 0);
                 } else {
                     val = logs.filter(l => l.sID === s.id).reduce((sum, l) => {
                         const ts = getTS(l.TS);
                         if (range && (ts < range.start || ts > range.end)) return sum;
                         return sum + (l.iSum === 1 ? 0 : l.pt);
                     }, 0);
                 }
                 return { name: s.id, val };
             });
             if (window.currentSort === 'name') data.sort((a,b) => a.name.localeCompare(b.name, 'zh-TW'));
             else data.sort((a,b) => b.val - a.val);
             const text = data.map(d => `${d.name}`).join('\n');
             copyTextToClipboard(text, '已按目前排序複製姓名');
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

        // timeRangeFilter / startDateFilter / endDateFilter onChange 已由 Reports.js React 元件處理

        wire('exportJsonBtn', async () => { 
            const b = getFullBackupData(true); 
            const compressed = await compressJSON(b, true);
            if (!compressed) return alert('匯出壓縮失敗');
            
            const now = new Date();
            const dateStr = now.getFullYear() + String(now.getMonth() + 1).padStart(2, '0') + String(now.getDate()).padStart(2, '0');
            
            const raw = atob(compressed);
            const bytes = new Uint8Array(raw.length);
            for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
            const blo = new Blob([bytes], {type:'application/gzip'}); 
            const a = document.createElement('a'); 
            a.href = URL.createObjectURL(blo); 
            a.download = `ClassKudox_${dateStr}.json.gz`; 
            a.click(); 
        });
        wire('importJsonBtn', () => {
            if (window.autoSyncInterval > 0) {
                alert('要匯入資料，請先到「雲端同步」將「異動同步頻率」改為「無」，匯入後，再按「上傳至雲端」更新雲端的資料，最後才更動「異動同步頻率」的時間。');
                return;
            }
            document.getElementById('importJsonFile')?.click();
        });
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
        
        // multiAwardBtn 已遷移至 React MultiSelectBar
        
        // toggleMultiSelectBtn 已遷移至 React Header

        wire('resetAllClassesPointsBtn', () => { 
            if(confirm('重置「所有班級」學生的點數、寶物與紀錄？')) { 
                window.resetAllClassesPoints();
                renderStudents(); if(currentView === 'groups') renderGroups(); alert('已重置');
            } 
        });
        wire('resetCurrentClassPointsBtn', () => { 
            if(confirm(`重置目前班級「${currentClassId}」學生的點數、寶物與紀錄？`)) { 
                window.resetCurrentClassPoints();
                renderStudents(); if(currentView === 'groups') renderGroups(); alert('已重置');
            } 
        });
        wire('deleteLogsBtn', () => { 
            const inp = document.getElementById('deleteLogsConfirmInput');
            if(!inp || inp.value.trim() !== '刪除紀錄') return alert('請輸入正確的確認文字');
            if(confirm('確定要清除目前班級的所有紀錄與寶物？學生名單將會保留。')) { 
                window.resetCurrentClassPoints();
                renderStudents(); if(currentView === 'groups') renderGroups(); 
                inp.value = '';
                alert('已清除紀錄與寶物');
            }
        });
        wire('recoverDelRecordBtn', () => {
            if (typeof recoverDeletedOps === 'function') recoverDeletedOps();
            else alert('復原功能需要雲端同步模組支援');
        });
        wire('resetSystemBtn', () => { if(confirm('重置系統？')) { 
            const keys = []; for (let i=0; i<localStorage.length; i++) { const k = localStorage.key(i); if (k && (k.startsWith('CD_') || ['BId', 'Key', 'aSyn', 'sVer'].includes(k))) keys.push(k); }
            keys.forEach(k => localStorage.removeItem(k)); location.reload(); 
        } });


        // --- 圖示與頭像選擇器邏輯 ---
        let currentIconTarget = null;
        document.addEventListener('click', (e) => {
            const btn = e.target.closest('.icon-select-btn');
            if (btn) {
                window._currentIconTarget = btn;
                openModal(document.getElementById('iconPickerModal'));
            }
        });
        
        wire('openAvatarPickerBtn', () => {
            openModal(document.getElementById('avatarPickerModal'));
        });
        wire('randomizeAvatarBtn', () => { 
            const seed = getRandomSeed(); const style = document.getElementById('editStudentAvatarStyle').value; 
            document.getElementById('editStudentAvatarPreview').src = getAvatarUrl(seed, style); 
            if (window.updateStudentAvatar) window.updateStudentAvatar(currentProfileId, seed, style); 
        });

        const startSyncTimer = () => {
            if (window.checkTimer) clearInterval(window.checkTimer); if (autoSyncTimer) clearInterval(autoSyncTimer);
            if (!cloudBinId || !cloudApiKey) return;
            if (autoSyncInterval <= 0) return;
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
        window.startSyncTimer = startSyncTimer;

        // --- Key Listeners ---
        window.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                const stack = window._openModalStack || [];
                const top = stack[stack.length - 1];
                if (top && window._setReactModal) {
                    const map = {manageGroup:'manageGroupModal',groupDetail:'groupDetailModal',editStudent:'editStudentModal',addStudent:'addStudentModal',studentProfile:'studentProfileModal',classSummary:'classSummaryModal',settings:'settingsModal',manageClasses:'manageClassesModal',reports:'reportsModal',summaryDetail:'classSummaryStudentDetailModal',editPointItem:'editPointItemModal',avatarPicker:'avatarPickerModal',iconPicker:'iconPickerModal'};
                    const el = document.getElementById(map[top]);
                    if (el) el.classList.add('hidden');
                    window._setReactModal(top, false);
                } else {
                    const els = document.querySelectorAll('.modal-overlay:not(.hidden)');
                    if (els.length > 0) closeModal(els[els.length - 1]);
                }
            }
        });
    };

    bootSequence();
};

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startApp);
} else {
    startApp();
}
