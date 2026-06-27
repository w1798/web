function Settings() {
    const { 
        modals, 
        setModal,
        settings,
        pointItems = { pos: [], neg: [] },
        treasureDefs = [],
        customItems = [],
        refresh
    } = React.useContext(AppContext);

    const [activeTab, setActiveTab] = React.useState('display');
    const [showDelLogs, setShowDelLogs] = React.useState(false);
    const [delLogVersion, setDelLogVersion] = React.useState(0);
    const getDelLogList = () => {
        const arr = window.delLogs || [];
        return [...arr].sort((a, b) => {
            const ta = typeof a.deletedAt === 'number' ? a.deletedAt : (window.StampTool ? window.StampTool.decode(a.deletedAt).getTime() : 0);
            const tb = typeof b.deletedAt === 'number' ? b.deletedAt : (window.StampTool ? window.StampTool.decode(b.deletedAt).getTime() : 0);
            return tb - ta;
        });
    };

    // 設定展關時，蟸發 Vanilla JS 填充選單選項與狀態
    React.useEffect(() => {
        if (modals.settings) {
            setTimeout(() => {
                if (window.initSelectOptions) window.initSelectOptions();
                if (window.applySettings) window.applySettings();
                if (window.renderPointItems) window.renderPointItems();
            }, 0);
        }
    }, [modals.settings]);

    React.useEffect(() => {
        const body = document.querySelector('.settings-body');
        if (body) body.scrollTop = 0;
        if (activeTab === 'custom' && typeof loadCustomTextarea === 'function') {
            loadCustomTextarea();
        }
        if (activeTab === 'display') {
            if (window.initSelectOptions) window.initSelectOptions();
            if (window.applySettings) window.applySettings();
            const bind = (id, fn) => { const el = document.getElementById(id); if (el) el.onchange = fn; };
            bind('fontSizeSelect', (e) => { window.settings.ftS = e.target.value; window.applySettings(); window.saveData(true); });
            bind('enableSoundSetting', (e) => { window.settings.eS = e.target.checked ? 1 : 0; window.saveData(true); });
            bind('showAvatarSetting', (e) => { window.settings.sAv = e.target.checked ? 1 : 0; window.applySettings(); window.saveData(true); });
            bind('showTreasureSetting', (e) => { window.settings.sTR = e.target.checked ? 1 : 0; window.renderStudents(); window.saveData(true); });
            bind('logRetentionSetting', (e) => { window.settings.lRet = parseInt(e.target.value); window.applySettings(); window.saveData(true); window.performLogRetention(); });
            const bindSelect = (id, key, isStyleVar = true, styleVarName = null, isPercent = false, isUnitless = false) => {
                const el = document.getElementById(id); if(!el) return;
                el.onchange = (e) => {
                    const val = Number(e.target.value);
                    window.settings[key] = val;
                    if(isStyleVar) {
                        const unit = isUnitless ? '' : (isPercent ? '%' : 'px');
                        document.documentElement.style.setProperty(styleVarName || `--${key}`, val + unit);
                    }
                    if(key === 'ftS') document.documentElement.style.setProperty('--body-font-size', val + 'px');
                    if(key === 'itmS') document.documentElement.style.setProperty('--item-scale', val + 'px');
                    window.saveData(true);
                    if(['ftS','col','sTR'].includes(key)) window.renderStudents(); 
                    if(['gCol'].includes(key)) window.renderGroups();
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
            if(avSel) avSel.addEventListener('change', () => window.applySettings());
            bindSelect('cardGapVSelect', 'cGV', true, '--card-gap-v');
            bindSelect('cardGapHSelect', 'cGH', true, '--card-gap-h');
            bindSelect('itemGapVSelect', 'iGV', true, '--item-gap-v');
            bindSelect('itemGapHSelect', 'iGH', true, '--item-gap-h');
            bindSelect('versionBackupSetting', 'sBkup', false);
        }
        if (activeTab === 'cloud') {
            const bind = (id, fn) => { const el = document.getElementById(id); if (el) el.onchange = fn; };
            const binInp = document.getElementById('cloudBinId');
            if(binInp) { binInp.value = window.cloudBinId; binInp.onchange = (e) => { window.cloudBinId = e.target.value; window.saveData(); if(window.startSyncTimer) window.startSyncTimer(); }; }
            const keyInp = document.getElementById('cloudApiKey');
            if(keyInp) { keyInp.value = window.cloudApiKey; keyInp.onchange = (e) => { window.cloudApiKey = e.target.value; window.saveData(); if(window.startSyncTimer) window.startSyncTimer(); }; }
            const ivInp = document.getElementById('autoSyncInterval');
            if(ivInp) { ivInp.value = window.autoSyncInterval; ivInp.onchange = (e) => { window.autoSyncInterval = parseInt(e.target.value); window.saveData(); if(window.startSyncTimer) window.startSyncTimer(); }; }
        }
    }, [activeTab]);

    const close = () => setModal('settings', false);

    return (
        <div id="settingsModal" className={`modal-overlay ${modals.settings ? '' : 'hidden'}`}>
            <div className="modal-content settings-modal-content">
                <div className="modal-header">
                    <h2>⚙️ 系統設定 <span style={{ fontSize: '0.6em', fontWeight: 400, color: '#888', marginLeft: '0.5rem' }}>{APP_VER}</span></h2>
                    <button className="close-modal-btn" onClick={close}>&times;</button>
                </div>
                <div className="modal-body settings-body" style={{ display: 'flex', flexDirection: 'column', gap: 0, overflow: 'hidden' }}>
                    <div className="tabs settings-tabs">
                        <button className={`settings-tab-btn ${activeTab === 'display' ? 'active' : ''}`} onClick={() => setActiveTab('display')}>🖥️ 顯示與聲音</button>
                        <button className={`settings-tab-btn ${activeTab === 'positive' ? 'active' : ''}`} onClick={() => setActiveTab('positive')}>⭐ 優點項目</button>
                        <button className={`settings-tab-btn ${activeTab === 'negative' ? 'active' : ''}`} onClick={() => setActiveTab('negative')}>🚩 待改進項目</button>
                        <button className={`settings-tab-btn ${activeTab === 'custom' ? 'active' : ''}`} onClick={() => setActiveTab('custom')}>🔧 自訂項目</button>
                        <button className={`settings-tab-btn ${activeTab === 'treasure' ? 'active' : ''}`} onClick={() => setActiveTab('treasure')}>🎁 寶物設定</button>
                        <button className={`settings-tab-btn ${activeTab === 'cloud' ? 'active' : ''}`} onClick={() => setActiveTab('cloud')}>☁️ 雲端同步</button>
                        <button className={`settings-tab-btn ${activeTab === 'data' ? 'active' : ''}`} onClick={() => setActiveTab('data')}>💾 資料管理</button>
                        <button className={`settings-tab-btn ${activeTab === 'danger' ? 'active' : ''}`} onClick={() => setActiveTab('danger')}>⚠️ 危險區域</button>
                    </div>

                    <div className={`settings-tab-content ${activeTab === 'display' ? 'active' : ''}`} id="settingsDisplayTab">
                        <div className="settings-section">
                            <div className="settings-grid-6">
                                <div className="input-group">
                                    <label htmlFor="fontSizeSelect">字體大小</label>
                                    <select id="fontSizeSelect" className="filter-select">
                                        <option value="14">14px</option>
                                        <option value="16">16px</option>
                                        <option value="18">18px</option>
                                        <option value="20">20px</option>
                                        <option value="22">22px</option>
                                        <option value="24">24px</option>
                                        <option value="26">26px</option>
                                    </select>
                                </div>
                                <div className="input-group">
                                    <label htmlFor="avatarSizeSelect">頭像縮放</label>
                                    <select id="avatarSizeSelect" className="filter-select"></select>
                                </div>
                                <div className="input-group">
                                    <label htmlFor="gridColsSelect">學生卡每列</label>
                                    <select id="gridColsSelect" className="filter-select"></select>
                                </div>
                                <div className="input-group">
                                    <label htmlFor="cardHeightSelect">學生卡高度</label>
                                    <select id="cardHeightSelect" className="filter-select"></select>
                                </div>
                                <div className="input-group">
                                    <label htmlFor="groupColsSelect">群組卡每列</label>
                                    <select id="groupColsSelect" className="filter-select"></select>
                                </div>
                                <div className="input-group">
                                    <label htmlFor="groupHeightSelect">群組卡高度</label>
                                    <select id="groupHeightSelect" className="filter-select"></select>
                                </div>
                                <div className="input-group">
                                    <label htmlFor="itemColsSelect">行為卡每列</label>
                                    <select id="itemColsSelect" className="filter-select"></select>
                                </div>
                                <div className="input-group">
                                    <label htmlFor="itemScaleSelect">行為卡高度</label>
                                    <select id="itemScaleSelect" className="filter-select"></select>
                                </div>
                                <div className="input-group">
                                    <label htmlFor="cardGapVSelect">卡片上下距</label>
                                    <select id="cardGapVSelect" className="filter-select"></select>
                                </div>
                                <div className="input-group">
                                    <label htmlFor="cardGapHSelect">卡片左右距</label>
                                    <select id="cardGapHSelect" className="filter-select"></select>
                                </div>
                                <div className="input-group">
                                    <label htmlFor="itemGapVSelect">項目上下距</label>
                                    <select id="itemGapVSelect" className="filter-select"></select>
                                </div>
                                <div className="input-group">
                                    <label htmlFor="itemGapHSelect">項目左右距</label>
                                    <select id="itemGapHSelect" className="filter-select"></select>
                                </div>
                            </div>
                            
                            <div className="settings-row" style={{ marginTop: '1rem', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1 }}>
                                    <input type="checkbox" id="enableSoundSetting" style={{ width: '1.2rem', height: '1.2rem', cursor: 'pointer' }} />
                                    <label htmlFor="enableSoundSetting" style={{ cursor: 'pointer', fontWeight: 500, margin: 0 }}>🔊 加扣點音效</label>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1 }}>
                                    <input type="checkbox" id="showAvatarSetting" style={{ width: '1.2rem', height: '1.2rem', cursor: 'pointer' }} />
                                    <label htmlFor="showAvatarSetting" style={{ cursor: 'pointer', fontWeight: 500, margin: 0 }}>🧑 顯示頭像</label>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1 }}>
                                    <input type="checkbox" id="showTreasureSetting" style={{ width: '1.2rem', height: '1.2rem', cursor: 'pointer' }} />
                                    <label htmlFor="showTreasureSetting" style={{ cursor: 'pointer', fontWeight: 500, margin: 0 }}>🎁 顯示寶物</label>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, justifyContent: 'flex-end' }}>
                                    <button id="manualShowUndoBtn" className="small-btn secondary-btn" style={{ padding: '4px 10px', fontSize: '0.85em', borderRadius: '6px' }}>♻️ 顯示復原</button>
                                </div>
                            </div>
                            <div className="settings-row" style={{ marginTop: '1rem', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
                                <div className="input-group" style={{ flex: 1 }}>
                                    <label htmlFor="classAvatarStyle">🎨 套用全班頭像風格</label>
                                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'stretch' }}>
                                        <select id="classAvatarStyle" className="filter-select" style={{ flex: 1 }}>
                                            <optgroup label="寫實人物">
                                                <option value="ava">寫實頭像 (Avataaars)</option>
                                                <option value="adv">冒險者 (Adventurer)</option>
                                                <option value="op">手繪風格 (Open Peeps)</option>
                                                <option value="per">極簡人像 (Personas)</option>
                                                <option value="min">迷你人像 (Miniavs)</option>
                                                <option value="mic">抽象線條 (Micah)</option>
                                            </optgroup>
                                            <optgroup label="趣味插畫">
                                                <option value="fe">可愛表情 (Fun Emoji)</option>
                                                <option value="bs">燦爛笑容 (Big Smile)</option>
                                                <option value="cro">塗鴉人物 (Croodles)</option>
                                                <option value="lor">插畫風格 (Lorelei)</option>
                                                <option value="not">米白風格 (Notionists)</option>
                                            </optgroup>
                                            <optgroup label="科技/機器人">
                                                <option value="bot">機器人 (Bottts)</option>
                                                <option value="pix">像素風格 (Pixel Art)</option>
                                                <option value="ide">幾幾何圖案 (Identicon)</option>
                                                <option value="rin">抽象圓環 (Rings)</option>
                                                <option value="shi">各類形狀 (Shapes)</option>
                                            </optgroup>
                                            <optgroup label="其他風格">
                                                <option value="be">大耳人物 (Big Ears)</option>
                                                <option value="ico">簡約圖示 (Icons)</option>
                                                <option value="thu">讚美手勢 (Thumbs)</option>
                                            </optgroup>
                                        </select>
                                        <button className="btn secondary-btn" id="applyClassAvatarBtn" style={{ whiteSpace: 'nowrap' }}>全班套用</button>
                                    </div>
                                </div>
                            </div>
                            <div className="settings-footer-spacer"></div>
                        </div>
                    </div>

                    <div className={`settings-tab-content ${activeTab === 'positive' ? 'active' : ''}`} id="settingsPositiveTab">
                        <div className="settings-section">
                            <div className="add-item-form-container">
                                <h4>✨ 新增項目 <label className="add-item-inline-check"><input type="checkbox" id="newPositiveIgnore" />不列入排名</label></h4>
                                <div className="add-item-form">
                                    <button className="icon-select-btn" id="newPositiveIconBtn">⭐</button>
                                    <input type="text" id="newPositiveLabel" placeholder="項目：例如 團隊合作" className="add-item-text-input" />
                                    <input type="number" id="newPositiveValue" placeholder="點數" defaultValue="1" min="0" className="add-item-num-input" />
                                    <button className="btn add-item-btn" id="addPositiveBtn">+增加</button>
                                </div>
                            </div>
                            <div className="settings-point-grid" style={{ marginTop: '1rem' }}>
                                {[...pointItems.pos].sort(window.sortItems).map(item => (
                                    <div key={item.id} className="point-item-btn positive" onClick={() => window.openEditPointItemModal && window.openEditPointItemModal('pos', item.id)}>
                                        <div className="point-icon">{item.ic}</div>
                                        <div className="point-label">{item.lb}{item.iSum === 1 && <small>(不列排)</small>}</div>
                                        <div className="point-value">{item.vl > 0 ? '+' : ''}{item.vl}</div>
                                        <button className="remove-item-btn" onClick={(e) => { e.stopPropagation(); if(window.removePointItem) window.removePointItem('pos', item.id); }}>×</button>
                                    </div>
                                ))}
                            </div>
                            <div className="settings-footer-spacer"></div>
                        </div>
                    </div>

                    <div className={`settings-tab-content ${activeTab === 'negative' ? 'active' : ''}`} id="settingsNegativeTab">
                        <div className="settings-section">
                            <div className="add-item-form-container">
                                <h4>✨ 新增項目 <label className="add-item-inline-check"><input type="checkbox" id="newNeedsWorkIgnore" />不列入排名</label></h4>
                                <div className="add-item-form">
                                    <button className="icon-select-btn" id="newNeedsWorkIconBtn">🚩</button>
                                    <input type="text" id="newNeedsWorkLabel" placeholder="項目：例如 上課講話" className="add-item-text-input" />
                                    <input type="number" id="newNeedsWorkValue" placeholder="點數 (負數)" defaultValue="-1" max="0" className="add-item-num-input" />
                                    <button className="btn add-item-btn" id="addNeedsWorkBtn">+增加</button>
                                </div>
                            </div>
                            <div className="settings-point-grid" style={{ marginTop: '1rem' }}>
                                {[...pointItems.neg].sort(window.sortItems).map(item => (
                                    <div key={item.id} className="point-item-btn negative" onClick={() => window.openEditPointItemModal && window.openEditPointItemModal('neg', item.id)}>
                                        <div className="point-icon">{item.ic}</div>
                                        <div className="point-label">{item.lb}{item.iSum === 1 && <small>(不列排)</small>}</div>
                                        <div className="point-value">{item.vl > 0 ? '+' : ''}{item.vl}</div>
                                        <button className="remove-item-btn" onClick={(e) => { e.stopPropagation(); if(window.removePointItem) window.removePointItem('neg', item.id); }}>×</button>
                                    </div>
                                ))}
                            </div>
                            <div className="settings-footer-spacer"></div>
                        </div>
                    </div>

                    <div className={`settings-tab-content ${activeTab === 'custom' ? 'active' : ''}`} id="settingsCustomTab">
                        <div className="settings-section">
                            <h3>🔧 預設自訂項目</h3>
                            <p className="small-text" style={{ marginBottom: '1rem', color: 'var(--text-secondary)' }}>在此定義常用的「臨時自訂」項目名稱，每行一個。這些名稱會出現在給予點數 → 臨時自訂分頁的下拉選單中。</p>
                            <div className="input-group" style={{ textAlign: 'center' }}>
                                <label>自訂項目名稱 (每行一個)</label>
                                <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', alignItems: 'stretch' }}>
                                    <textarea id="customItemsTextarea" rows="8" placeholder="兌換點數&#10;分領獎品&#10;清除事項" style={{ width: '100%', maxWidth: '250px', resize: 'vertical' }}></textarea>
                                    <button className="btn primary-btn" id="saveCustomItemsBtn" style={{ whiteSpace: 'nowrap', width: 'auto', padding: '0 1rem', alignSelf: 'flex-start', minHeight: '40px' }}>儲存自訂<br/>項目</button>
                                </div>
                            </div>
                            <div className="settings-footer-spacer"></div>
                        </div>
                    </div>

                    <div className={`settings-tab-content ${activeTab === 'treasure' ? 'active' : ''}`} id="settingsTreasureTab">
                        <div className="settings-section">
                            <h3>🎁 寶物種類設定</h3>
                            <p className="small-text" style={{ marginBottom: '1rem', color: 'var(--text-secondary)' }}>定義班級可用的寶物種類，例如：免死金牌、尚方寶劍等。</p>
                            <div className="add-item-form-container">
                                <h4>✨ 新增寶物(先選圖示)</h4>
                                <div className="add-item-form">
                                    <div className="add-item-input-group">
                                        <label className="mobile-only-label">名稱</label>
                                        <div style={{ display: 'flex', gap: '0.5rem', width: '100%' }}>
                                            <button className="icon-select-btn" id="newTreasureIconBtn">🏅</button>
                                            <input type="text" id="newTreasureLabel" placeholder="例如：免死金牌" style={{ flex: 1 }} />
                                        </div>
                                    </div>
                                    <button className="btn add-item-btn" id="addTreasureBtn" style={{ whiteSpace: 'nowrap', padding: '0 1rem', flexShrink: 0, minWidth: 'max-content' }}>+增加</button>
                                </div>
                            </div>
                            <div className="settings-point-grid" style={{ marginTop: '1rem' }}>
                                {[...treasureDefs].sort(window.sortItems).map(item => (
                                    <div key={item.id} className="point-item-btn positive" onClick={() => window.openEditPointItemModal && window.openEditPointItemModal('treasure', item.id)}>
                                        <div className="point-icon">{item.ic}</div>
                                        <div className="point-label">{item.lb}</div>
                                        <button className="remove-item-btn" onClick={(e) => { e.stopPropagation(); if(window.removeTreasureDef) window.removeTreasureDef(item.id); }}>×</button>
                                    </div>
                                ))}
                            </div>
                            <div className="settings-footer-spacer"></div>
                        </div>
                    </div>

                    <div className={`settings-tab-content ${activeTab === 'cloud' ? 'active' : ''}`} id="settingsCloudTab">
                        <div className="settings-section">
                            <h3>☁️ 雲端同步設定 (<a href="https://w1798.github.io/web/JsonCloudGuide" target="_blank" style={{ color: '#ff0000', fontSize: '1em' }}>申請說明</a>)</h3>
                            <p className="small-text" style={{ marginBottom: '1rem', color: 'var(--text-secondary)' }}>支援 Upstash / Firebase。上傳時會自動排除您的金鑰資訊以保護隱私。</p>
                            
                            <div className="settings-sync-item">
                                <label>資料庫 URL</label>
                                <div className="input-with-btn">
                                    <input type="text" id="cloudBinId" placeholder="Upstash: https://xxx.upstash.io / Firebase: https://xxx.firebaseio.com" />
                                    <button className="btn icon-btn" id="resetCloudBinId" title="重置">🧹</button>
                                </div>
                            </div>
                            
                            <div className="settings-sync-item">
                                <label>Key ID</label>
                                <div className="input-with-btn">
                                    <input type="password" id="cloudApiKey" placeholder="Token / 自設 rules pwd" />
                                    <button className="btn icon-btn" id="resetCloudApiKey" title="重置">🧹</button>
                                </div>
                            </div>
                            
                            <div className="input-group">
                                <div className="settings-sync-item no-margin-bottom">
                                    <label htmlFor="autoSyncInterval">異動同步頻率</label>
                                    <select id="autoSyncInterval" className="filter-select">
                                        <option value="0">無 (請先下載後再同步)</option>
                                        <option value="15">15 秒一次</option>
                                        <option value="30">30 秒一次</option>
                                        <option value="60">1 分鐘一次</option>
                                    </select>
                                </div>
                                <div className="small-text" style={{ marginTop: '0.4rem', color: '#ef4444', fontWeight: 500 }}>匯入資料後，請先按「上傳到雲端」。如有設定同步時間，會「優先從雲端下載覆蓋本地的資料」，然後補做已更動的加扣點！</div>
                            </div>

                            <div className="input-group">
                                <div className="settings-sync-item no-margin-bottom">
                                    <label htmlFor="versionBackupSetting">異版跳備份</label>
                                    <select id="versionBackupSetting" className="filter-select">
                                        <option value="1">是</option>
                                        <option value="0">否</option>
                                    </select>
                                </div>
                                <div className="small-text" style={{ marginTop: '0.4rem', color: '#ef4444', fontWeight: 500 }}>當雲端與本地資料版本不同時，是否彈出視窗詢問匯出備份。</div>
                            </div>

                            <div className="data-actions">
                                <button className="btn secondary-btn" id="cloudUploadBtn">📤 上傳至雲端</button>
                                <button className="btn secondary-btn" id="cloudDownloadBtn">📥 從雲端下載</button>
                            </div>
                            <div className="settings-footer-spacer"></div>
                        </div>
                    </div>

                    <div className={`settings-tab-content ${activeTab === 'data' ? 'active' : ''}`} id="settingsDataTab">
                        <div className="settings-section">
                            <h3>💾 資料進階管理 <span id="jsonSizeEst" style={{ fontSize: '0.85em', fontWeight: 'normal', color: 'var(--text-secondary)', marginLeft: '10px' }}></span></h3>
                            <div className="input-group" style={{ marginBottom: '1.5rem', marginTop: '1rem' }}>
                                <label htmlFor="logRetentionSetting">🗑️ 自動刪除過期紀錄</label>
                                <select id="logRetentionSetting" className="filter-select" style={{ width: '100%' }}>
                                    <option value="0">無 (手動清理)</option>
                                    <option value="1">保留 1 個月</option>
                                    <option value="3">保留 3 個月</option>
                                    <option value="6">保留 6 個月</option>
                                    <option value="12">保留 1 年</option>
                                    <option value="24">保留 2 年</option>
                                </select>
                                <div className="small-text" style={{ marginTop: '0.3rem', color: 'var(--text-secondary)' }}>會於啟動時自動掃描清除所有班級過期紀錄，但學生總點數仍會保留。</div>
                            </div>
                            <div className="data-actions">
                                <button className="btn primary-btn" id="exportJsonBtn">📤 匯出 JSON 檔</button>
                                <button className="btn primary-btn" id="importJsonBtn">📥 匯入 JSON 檔</button>
                            </div>
                            <input type="file" id="importJsonFile" accept=".gz" style={{ display: 'none' }} />
                            <div className="settings-footer-spacer"></div>
                        </div>
                    </div>

                    <div className={`settings-tab-content ${activeTab === 'danger' ? 'active' : ''}`} id="settingsDangerTab">
                        <div className="settings-section">
                            <h3 style={{ color: '#ef4444' }}>⚠️ 危險區域</h3>
                            <p className="small-text" style={{ marginBottom: '1rem', color: 'var(--text-secondary)' }}>您可以在這裡重設目前的資料設定。重設將無法復原，<strong>請先備份重要資料。</strong></p>

                            <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)', margin: '1.5rem 0' }} />

                            <div className="input-group" style={{ marginBottom: '0.8rem' }}>
                                <label style={{ color: '#ef4444' }}>清除「目前班級」學生的點數和寶物的紀錄(但保留  cP/iP 點數)</label>
                                <button className="btn negative-btn" id="clearCurrentClassRecordsBtn" style={{ width: '100%' }}>清除目前班級點數紀錄</button>
                            </div>

                            <div className="input-group" style={{ marginBottom: '0.8rem' }}>
                                <label style={{ color: '#ef4444' }}>清除「所有班級」學生的點數和寶物的紀錄(但保留  cP/iP 點數)</label>
                                <button className="btn negative-btn" id="clearAllClassesRecordsBtn" style={{ width: '100%' }}>清除所有班級點數紀錄</button>
                            </div>

                            <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)', margin: '1.5rem 0' }} />

                            <div className="input-group" style={{ marginBottom: '0.8rem' }}>
                                <label style={{ color: '#ef4444' }}>徹底清除此瀏覽器的所有資料，包含所有班級、點數、紀錄與設定。</label>
                                <button className="btn negative-btn" id="resetSystemBtn" style={{ width: '100%' }}>清除系統全部資料</button>
                            </div>

                            <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)', margin: '1.5rem 0' }} />

                            <div className="input-group" style={{ marginBottom: '0.8rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', marginBottom: '0.5rem' }} onClick={() => setShowDelLogs(!showDelLogs)}>
                                    <span style={{ fontSize: '1.2rem', color: '#ef4444' }}>📋</span>
                                    <span style={{ fontWeight: 600, color: '#ef4444', fontSize: '0.95em' }}>刪除寶物和點數的紀錄（{getDelLogList().length} 筆）</span>
                                    <span style={{ marginLeft: 'auto', fontSize: '0.8em', color: '#94a3b8' }}>{showDelLogs ? '▲ 收合' : '▼ 展開'}</span>
                                </div>
                                {showDelLogs && (
                                    <div style={{ maxHeight: '300px', overflowY: 'auto', background: '#f8fafc', borderRadius: '8px', border: '1px solid var(--border-color)', padding: '0.5rem' }}>
                                        {getDelLogList().length === 0 ? (
                                            <div style={{ textAlign: 'center', color: '#94a3b8', padding: '1rem', fontSize: '0.9em' }}>尚無刪除紀錄</div>
                                        ) : (
                                            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                                                {getDelLogList().map(dl => {
                                                    const delTime = typeof dl.deletedAt === 'number' ? new Date(dl.deletedAt) : (window.StampTool ? window.StampTool.decode(dl.deletedAt) : new Date());
                                                    const origTime = typeof dl.originalTS === 'number' ? new Date(dl.originalTS) : (window.StampTool ? window.StampTool.decode(dl.originalTS) : new Date());
                                                    return (
                                                        <li key={dl.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.4rem 0.5rem', borderBottom: '1px solid #e2e8f0', fontSize: '0.85em' }}>
                                                            <span style={{ color: '#64748b', whiteSpace: 'nowrap', fontFamily: 'monospace' }}>
                                                                {delTime.toLocaleDateString()} {delTime.toLocaleTimeString()}
                                                            </span>
                                                            <span style={{ color: '#ef4444', fontWeight: 600 }}>刪除</span>
                                                            <span style={{ fontWeight: 600 }}>{dl.sID}</span>
                                                            <span style={{ color: '#94a3b8' }}>→</span>
                                                            <span style={{ color: '#64748b', fontFamily: 'monospace', whiteSpace: 'nowrap' }}>
                                                                {origTime.toLocaleDateString()} {origTime.toLocaleTimeString()}
                                                            </span>
                                                            <span style={{ color: '#94a3b8' }}>給的</span>
                                                            <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                                {dl.lb}{!dl.trId && (dl.pt > 0 ? '+' : '')}{dl.pt}{dl.trQty ? ' ×' + dl.trQty : ''}
                                                            </span>
                                                            <button className="btn" style={{ flexShrink: 0, padding: '0.2rem 0.6rem', fontSize: '0.8em', background: '#10b981', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }} onClick={() => { window.restoreDelLog && window.restoreDelLog(dl.id); setDelLogVersion(v => v + 1); }}>↩️ 還原</button>
                                                        </li>
                                                    );
                                                })}
                                            </ul>
                                        )}
                                    </div>
                                )}
                            </div>
                            <div className="settings-footer-spacer"></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
