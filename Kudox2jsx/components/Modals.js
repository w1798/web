function Modals() {
    const { 
        modals, 
        setModal, 
        undoAction,
        selectedStudentIds,
        students = [],
        groups = [],
        logs = [],
        pointItems = { pos: [], neg: [] },
        customItems = [],
        customPrefs = {},
        treasureDefs = [],
        giftSettings = {},
        classes = [],
        currentClassId,
        awardContext = { ids: [], title: '', groupId: null },
        currentProfileId: ctxProfileId,
        groupDetailData,
        editingGroupId,
        awardPoints,
        awardTreasure,
        refresh
    } = React.useContext(AppContext);

    const close = (name) => setModal(name, false);

    // 使用 Context 中的 awardContext （由 openAwardModal bridge 寫入）
    const cIds = awardContext.ids || [];
    const cId = cIds.length === 1 ? cIds[0] : (ctxProfileId || null);
    const hasGroupContext = !!(awardContext.groupId);

    // UI States
    const [activeProfileTab, setActiveProfileTab] = React.useState('award');
    const [activeAwardSubTab, setActiveAwardSubTab] = React.useState('positive');
    
    // Custom Award State
    const [cLabel, setCLabel] = React.useState('新增項目');
    const [cTempName, setCTempName] = React.useState('');
    const [cValue, setCValue] = React.useState('');
    const [cSign, setCSign] = React.useState('-');
    const [cIgnore, setCIgnore] = React.useState(true);

    // Context actions (bridge to Vanilla JS)
    const awardingRef = React.useRef(false);
    const doAwardPoints = (lb, pt, ign) => {
        if (awardingRef.current) return;
        awardingRef.current = true;
        awardPoints(lb, pt, ign);
        setTimeout(() => { awardingRef.current = false; }, 500);
    };
    const doAwardTreasure = (tid, qty, silent) => {
        if (awardingRef.current) return [];
        awardingRef.current = true;
        const result = awardTreasure(tid, qty, silent);
        setTimeout(() => { awardingRef.current = false; }, 500);
        return result;
    };
    const getAvatar = (sid, style) => window.getAvatarUrl ? window.getAvatarUrl(sid, style) : '';
    const getCustomPref = (lb) => (window.customPrefs && window.customPrefs[lb]) || { sign: '-', ign: true, val: '' };

    // 切換自訂項目時自動儲存前一項
    const saveCurrentCustomPref = React.useCallback(() => {
        if (cLabel && cLabel !== '新增項目') {
            if (window.saveCustomPref) window.saveCustomPref(cLabel, { sign: cSign, ign: cIgnore, val: cValue });
        }
    }, [cLabel, cSign, cIgnore, cValue]);
    React.useEffect(() => {
        if (activeAwardSubTab === 'custom' && cLabel && cLabel !== '新增項目') {
            const pref = getCustomPref(cLabel);
            setCSign(pref.sign || '-');
            setCIgnore(pref.ign !== false);
        }
    }, [cLabel, activeAwardSubTab]);
    // 當切換到不同項目時，先儲存前一個項目的設定
    const prevLabelRef = React.useRef(cLabel);
    React.useEffect(() => {
        const prev = prevLabelRef.current;
        if (prev && prev !== cLabel && prev !== '新增項目') {
            if (window.saveCustomPref) window.saveCustomPref(prev, { sign: cSign, ign: cIgnore, val: cValue });
        }
        prevLabelRef.current = cLabel;
    }, [cLabel, cSign, cIgnore, cValue]);

    // 彣窗開啟時同步狀態
    React.useEffect(() => {
        if (modals.studentProfile) {
            const pendingTab = window._pendingProfileTab;
            window._pendingProfileTab = null;
            const savedTab = pendingTab || localStorage.getItem('CD_LastProfileTab') || 'award';
            const savedSub = localStorage.getItem('CD_LastAwardSubTab') || 'positive';
            const forbidden = cIds.length > 1 || hasGroupContext;
            const tab = (forbidden && (savedTab === 'gift' || savedTab === 'history')) ? 'award' : savedTab;
            setActiveProfileTab(tab);
            setActiveAwardSubTab(savedSub);
            setPendingTreasures({});
            setGiftAmount('');
            const gs = window.giftSettings || {};
            setGiftFeeInt(gs.gInt !== undefined ? gs.gInt : 0);
            setGiftFeeStep(gs.gStep !== undefined ? gs.gStep : 0);
            setGiftIgn(gs.gIgn !== 0);
        }
    }, [modals.studentProfile, cIds.length, hasGroupContext]);

    // Handle tab switching inside React
    const handleProfileTabSwitch = (tab) => {
        setActiveProfileTab(tab);
        localStorage.setItem('CD_LastProfileTab', tab);
    };

    const handleSubTabSwitch = (tab) => {
        setActiveAwardSubTab(tab);
        localStorage.setItem('CD_LastAwardSubTab', tab);
    };

    const handleCustomAward = () => {
        let l = cLabel;
        if (l === '新增項目') {
            l = cTempName.trim();
            if(!l) return alert('請輸入名稱');
            if (window.addCustomItem) window.addCustomItem(l);
        }
        let vRaw = parseInt(cValue) || 0;
        let v = vRaw * (cSign === '+' ? 1 : -1);
        doAwardPoints(l, v, cIgnore);
        if (window.saveCustomPref) window.saveCustomPref(l, { sign: cSign, ign: cIgnore });
        setCValue('');
        setCTempName('');
        close('studentProfile');
    };

    // Manage Group State
    const [manageGroupSelectedIds, setManageGroupSelectedIds] = React.useState([]);

    React.useEffect(() => {
        if (modals.manageGroup) {
            const gid = editingGroupId;
            if (gid) {
                const g = (window.groups || []).find(x => x.id === gid);
                if (g) {
                    setManageGroupSelectedIds([...g.sIds]);
                    const inp = document.getElementById('groupNameInput');
                    if (inp) inp.value = g.id;
                }
            } else {
                setManageGroupSelectedIds([]);
                const inp = document.getElementById('groupNameInput');
                if (inp) inp.value = '';
            }
        }
    }, [modals.manageGroup, editingGroupId]);

    // Edit Point Item State
    const [editItemCat, setEditItemCat] = React.useState(null);
    const [editItemId, setEditItemId] = React.useState(null);
    const [editItemLabel, setEditItemLabel] = React.useState('');
    const [editItemIcon, setEditItemIcon] = React.useState('⭐');
    const [editItemValue, setEditItemValue] = React.useState(0);
    const [editItemIgnore, setEditItemIgnore] = React.useState(false);
    const isTreasureItem = editItemCat === 'treasure';

    React.useEffect(() => {
        if (modals.editPointItem) {
            const pending = window._pendingEditPointItem || {};
            const cat = pending.cat || null;
            const itemId = pending.itemId || null;
            setEditItemCat(cat);
            setEditItemId(itemId);
            let item;
            if (cat === 'treasure') {
                item = (window.treasureDefs || []).find(i => i.id === itemId);
            } else {
                const items = window.pointItems ? window.pointItems[cat] : [];
                item = (items || []).find(i => i.id === itemId);
            }
            if (item) {
                setEditItemLabel(item.lb || '');
                setEditItemIcon(item.ic || '⭐');
                if (cat !== 'treasure') {
                    setEditItemValue(item.vl || 0);
                    setEditItemIgnore(item.iSum === 1);
                }
            }
        }
    }, [modals.editPointItem]);

    // Avatar Picker State
    const [avatarPickerSeeds, setAvatarPickerSeeds] = React.useState([]);
    const [avatarPickerStyle, setAvatarPickerStyle] = React.useState('fe');

    React.useEffect(() => {
        if (modals.avatarPicker) {
            const style = document.getElementById('editStudentAvatarStyle')?.value || 'fe';
            setAvatarPickerStyle(style);
            const seeds = [];
            for (let i = 0; i < 30; i++) seeds.push('s' + i);
            setAvatarPickerSeeds(seeds);
        }
    }, [modals.avatarPicker]);

    const ICONS = [
        '⭐','🤝','🎯','🙋','💪','📚','🎨','⚽','🧹','♻️','📢','⌛','📵','🗣️','🤷','😡','😴','🎮','🍕','🍎','🌈','🔥','💧','⚡','🏆','💎','🎁','🚀','✨','🎉','🎈','☀️','🌊','❤️','✅','❌','⚠️','🔔','💡','📅','💯','🔍','⏰','🎂','🧿','🧲','🧯',
        '📝','📔','📕','📖','📗','📘','📓','📒','🖊️','✒️','✏️','🖍️','🖌️','✂️','📏','📐','📌','📍','📎','🖇️','📁','📂','🗂️','🔖','📅','📆','🗒️','🗓️','📋','📦','🗑️','💼','👜','🎒','🔒','🔓','🔏','🔐',
        '🐱','🐶','🦊','🐰','🐻','🐼','🦁','🐮','🐷','🐸','🐵','🐒','🐔','🐧','🐦','🐤','🦆','🦅','🦉','🦇','🐺','🐗','🐴','🦄','🐝','🐛','🦋','🐌','🐞','🐜','🦟','🦗','🕷️','🦂','🐢','🐍','🦎','🦖','🦕','🐙','🦑','🦐','🦞','🦀','🐡','🐠','🐟','🐬','🐳','🐋','🦈','🐊','🐅','🐆','🦓','🦍','🦧','🐘','🦛','🦏','🐪','🐫','🦒','🦘','🐃','🐂','🐄','🐎','🐖','🐑','🐏','🐐','🦌','🐕','🐩','🦮','🐕‍🦺','🐈','🐈‍⬛','🐓','🦃','🦚','🦜','🦢','🦩','🕊️','🦝','🦨','🦡','🦦','🦥','🐁','🐀','🐿️','🦔',
        '🌵','🎄','🌲','🌳','🌴','🌱','🌿','☘️','🍀','🎍','🎋','🍃','🍂','🍁','🍄','🐚','💨','🌪️','🍇','🍈','🍉','🍊','🍋','🍌','🍍','🥭','🍎','🍏','🍐','🍒','🍓','🍅','🥥','🥑','🥔','🌽','🌶️','🥒','🥬','🥦','🧄','🥜','🌰','🍞','🥐','🥖','🥞','🧀','🍖','🍗','🥩','🥓','🍔','🍟','🌭','🥪','🌮','🌯','🥙','🧆','🥚','🍳','🥘','🍲','🥣','🥗','🍿','🧈','🧂','🍱','🍘','🍙','🍚','🍛','🍜','🍝','🍠','🍢','🍣','🍤','🍥','🥮','🍡','🥟','🥠','🥡','🍦','🍧','🍨','🍩','🍪','🎂','🍰','🧁','🥧','🍫','🍬','🍭','🍮','🍯','🍼','🥛','☕','🍵','🍾','🍷','🍸','🍹','🍺','🍻','🥂','🥃','🥤','🧃','🧉','🧊',
        '🚗','🚕','🚙','🚌','🚎','🏎️','🚓','🚑','🚒','🚐','🚚','🚛','🚜','🛵','🚲','🛴','🚏','🛤️','⛽','🚨','🚥','🚦','🚧','⚓','⛵','🛶','🚤','🛳️','⛴️','🚢','✈️','🛩️','🛫','🛬','🪂','💺','🚟','🚀','🛸','🪐','🌍','🌎','🌏',
        '🔭','🔬','🧬','🧪','🌡️','🧺','🧻','🧼','🛁','🚿','🚽','🗝️','🔨','🪓','⛏️','⚒️','🛠️','🗡️','⚔️','🔫','🛡️','🔧','🗜️','⚖️','🦯','⛓️','💈','⚗️','⚙️','🧱','🧲','🚬','⚰️','⚱️','🧿','🔮','📿','🏺','🕯️','🔦','🏮','📽️','📱','📲','⌨️','🖨️','🖱️','💽','💾','💿','📀','📼','📸','📹','🎞️','☎️','📟','📠','📺','📡','🔋','🔌','🪔','🗑️','🛢️','💸','💵','💴','💶','💷','💰','💳','💎','🛒','🎁','🎈','🎏','🎀','🎊','🎉','🎎','🎐','✉️','📨','📩','📪','📫','📬','📭','📮',
        '😀','😂','🥰','😎','🤩','😇','🤗','🤔','😤','🥺','😱','🤯','🥳','😈','💀','🤖','👽','👾','🎃','👀','😅','🤣','🙂','🙃','😉','😊','😍','🥰','😘','😗','😚','😙','😋','😛','😜','🤪','🤨','🧐','🤓','😏','😒','😞','😌','😔','😟','😕','☹️','😣','😖','😫','😩','😢','😭','😠','🥵','🥶','😳','🤫','🤤','😷','🤒','🤕','🤢','🤮','🤧','😵','🤠','🤡','👺'
    ];
    
    const handleIconPick = (ico) => {
        if (window._currentIconTarget) {
            window._currentIconTarget.textContent = ico;
            close('iconPicker');
        }
    };

    // Class Summary State
    const [summaryData, setSummaryData] = React.useState([]);
    const [summaryRange, setSummaryRange] = React.useState('today');
    const [summaryRangeText, setSummaryRangeText] = React.useState('📅 今天點數總覽');
    const [summaryDetailName, setSummaryDetailName] = React.useState('');
    const [summaryDetailTotal, setSummaryDetailTotal] = React.useState(0);
    const [summaryDetailItems, setSummaryDetailItems] = React.useState([]);
    const [summaryDetailRangeText, setSummaryDetailRangeText] = React.useState('');

    const summaryRangeLabels = { today: '📅 今天', week: '📅 本週', month: '📅 本月', all: '📅 所有紀錄' };

    const getSummaryTimeRange = React.useCallback((v) => {
        if (v === 'all') return null;
        let s = new Date(), e = new Date();
        s.setHours(0, 0, 0, 0);
        e.setHours(23, 59, 59, 999);
        if (v === 'today') return { start: s.getTime(), end: e.getTime() };
        if (v === 'week') { s.setDate(s.getDate() - (s.getDay() || 7) + 1); e.setDate(s.getDate() + 6); return { start: s.getTime(), end: e.getTime() }; }
        if (v === 'month') { s.setDate(1); s.setHours(0,0,0,0); let skip = new Date(s); skip.setMonth(skip.getMonth() + 1); skip.setDate(0); skip.setHours(23, 59, 59, 999); return { start: s.getTime(), end: skip.getTime() }; }
        return null;
    }, []);

    const updateSummaryData = React.useCallback((rangeVal) => {
        const range = rangeVal === 'all' ? null : getSummaryTimeRange(rangeVal);
        setSummaryRangeText(summaryRangeLabels[rangeVal] + ' 點數總覽');
        const stu = window.students || [];
        const lgs = window.logs || [];
        const data = stu.map(s => {
            let pts = lgs.filter(l => l.sID === s.id).reduce((sum, l) => {
                const ts = window.getTS ? window.getTS(l.TS) : 0;
                if (range && (ts < range.start || ts > range.end)) return sum;
                return sum + (l.iSum === 1 ? 0 : l.pt);
            }, 0);
            return { ...s, pts };
        });
        const sort = window.currentSort === 'name' 
            ? (a, b) => a.id.localeCompare(b.id, 'zh-TW')
            : (a, b) => b.pts - a.pts;
        data.sort(sort);
        setSummaryData(data);
    }, []);

    React.useEffect(() => {
        if (modals.classSummary) {
            updateSummaryData(summaryRange);
        }
    }, [modals.classSummary, summaryRange, updateSummaryData]);

    const openStudentSummaryDetail = (id) => {
        const range = summaryRange === 'all' ? null : getSummaryTimeRange(summaryRange);
        const lgs = window.logs || [];
        const studentLogs = lgs.filter(l => {
            if (l.sID !== id) return false;
            const ts = window.getTS ? window.getTS(l.TS) : 0;
            if (range && (ts < range.start || ts > range.end)) return false;
            return true;
        });
        setSummaryDetailName(id + ' 的項目明細');
        const total = studentLogs.filter(l => l.iSum !== 1 && !l.trId).reduce((s, v) => s + v.pt, 0);
        setSummaryDetailTotal(total);
        setSummaryDetailRangeText(range ? '時間內積分：' : '總積分：');

        const aggregated = {};
        studentLogs.forEach(l => {
            const key = l.lb + (l.iSum === 1 ? ' (不列排)' : '') + (!!l.trId ? '_tr' : '');
            if (!aggregated[key]) {
                aggregated[key] = { lb: l.lb, pt: 0, count: 0, isTreasure: !!l.trId, iSum: l.iSum };
            }
            aggregated[key].pt += (l.pt || 0);
            aggregated[key].count += 1;
        });
        const sortedKeys = Object.keys(aggregated).sort((a, b) => {
            const dataA = aggregated[a], dataB = aggregated[b];
            if (dataA.iSum !== dataB.iSum) return dataA.iSum - dataB.iSum;
            if (dataA.isTreasure !== dataB.isTreasure) return dataA.isTreasure - dataB.isTreasure;
            return dataB.pt - dataA.pt;
        });
        setSummaryDetailItems(sortedKeys.map(k => aggregated[k]));
        setModal('summaryDetail', true);
    };

    const handleAvatarPick = (seed) => {
        const url = window.getAvatarUrl ? window.getAvatarUrl(seed, avatarPickerStyle) : '';
        const preview = document.getElementById('editStudentAvatarPreview');
        if (preview) preview.src = url;
        if (window.updateStudentAvatar) window.updateStudentAvatar(cId, seed, avatarPickerStyle);
        close('avatarPicker');
    };

    const toggleManageGroupStudent = (sid) => {
        setManageGroupSelectedIds(prev =>
            prev.includes(sid) ? prev.filter(x => x !== sid) : [...prev, sid]
        );
    };

    // Gift State
    const [giftAmount, setGiftAmount] = React.useState('');
    const [giftRecipients, setGiftRecipients] = React.useState([]);
    const [giftFeeInt, setGiftFeeInt] = React.useState(window.giftSettings?.gInt || 0);
    const [giftFeeStep, setGiftFeeStep] = React.useState(window.giftSettings?.gStep || 0);
    const [giftIgn, setGiftIgn] = React.useState(window.giftSettings?.gIgn !== 0);

    const handleGift = () => {
        const amt = parseInt(giftAmount) || 0;
        if (amt <= 0) return alert('請輸入有效數量');
        if (!giftRecipients.length) return alert('請選擇至少一個對象');
        const result = window.processGift(cId, amt, giftRecipients, giftFeeInt, giftFeeStep, giftIgn ? 1 : 0);
        if (!result || !result.success) return alert(result?.error || '贈與失敗');
        if (window.showUndoToast) window.showUndoToast(`已贈與 ${amt} 點給 ${giftRecipients.length} 位學生`);
        if (window.renderStudents) window.renderStudents();
        setGiftRecipients([]);
        close('studentProfile');
    };

    // Treasure State
    const [pendingTreasures, setPendingTreasures] = React.useState({});
    const applyTreasures = () => {
        if (awardingRef.current) return;
        awardingRef.current = true;
        let count = 0;
        let allLogs = [];
        Object.entries(pendingTreasures).forEach(([tid, qty]) => {
            if (qty !== 0) {
                const ids = doAwardTreasure(tid, qty, true);
                if (ids) allLogs = allLogs.concat(ids);
                count++;
            }
        });
        if (count > 0) {
            if(window.renderStudents) window.renderStudents();
            if(window.currentView === 'groups' && window.renderGroups) window.renderGroups();
            if(window.setLastActionLogIds) window.setLastActionLogIds(allLogs);
            if(window.showUndoToast) window.showUndoToast(cIds.length > 1 ? `已給予 ${cIds.length} 位學生寶物` : '已完成寶物發放');
            close('studentProfile');
        }
        setPendingTreasures({});
        setTimeout(() => { awardingRef.current = false; }, 500);
    };

    return (
        <React.Fragment>
            {/* ADD STUDENT MODAL - Keep Vanilla Shell for now if script.js handles it heavily, but React form is better */}
            <div id="addStudentModal" className={`modal-overlay ${modals.addStudent ? '' : 'hidden'}`}>
                <div className="modal-content" style={{ maxWidth: '600px' }}>
                    <div className="modal-header">
                        <h2>新增學生</h2>
                        <button className="close-modal-btn" onClick={() => close('addStudent')}>×</button>
                    </div>
                    <div className="modal-body">
                        <div className="input-group">
                            <label>座號+學生姓名 (支援多位學生，每行一個名字)</label>
                            <textarea id="newStudentName" rows="5"></textarea>
                            <p className="small-text" style={{ marginTop: '0.3rem', color: 'var(--text-secondary)' }}>
                                可到 <a href="https://w1798.github.io/web/TextLab" target="_blank" className="url-link" style={{ color: '#c53030', textDecoration: 'underline' }}>多功能文字處理器</a> 在 原始資料1 中貼上學生姓名，功能表中間下面的「編號」選2，按執行即可
                            </p>
                        </div>
                    </div>
                    <div className="modal-footer">
                        <button className="btn cancel-btn" onClick={() => close('addStudent')}>取消</button>
                        <button className="btn primary-btn" id="saveStudentBtn">儲存</button>
                    </div>
                </div>
            </div>

            {/* EDIT STUDENT MODAL */}
            <div id="editStudentModal" className={`modal-overlay ${modals.editStudent ? '' : 'hidden'}`} style={{ zIndex: 2300 }}>
                <div className="modal-content">
                    <div className="modal-header">
                        <h2>編輯學生資料</h2>
                        <button className="close-modal-btn" onClick={() => close('editStudent')}>×</button>
                    </div>
                    <div className="modal-body">
                        <div className="edit-profile-preview" style={{ textAlign: 'center', marginBottom: '1rem' }}>
                            <img id="editStudentAvatarPreview" src="" style={{ width: '80px', height:'80px', borderRadius:'50%' }} />
                            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', marginTop: '0.5rem' }}>
                                <button id="randomizeAvatarBtn" className="btn secondary-btn small-btn">🎲 隨機</button>
                                <button id="openAvatarPickerBtn" className="btn secondary-btn small-btn">🙋‍♂️ 挑選頭像</button>
                            </div>
                        </div>
                        <div className="input-group">
                            <label>學生姓名</label>
                            <input type="text" id="editStudentName" />
                        </div>
                        <div className="input-group">
                            <label>頭像風格</label>
                            <select id="editStudentAvatarStyle" className="filter-select" style={{ width: '100%' }}>
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
                                    <option value="ide">幾何圖案 (Identicon)</option>
                                    <option value="rin">抽象圓環 (Rings)</option>
                                    <option value="shi">各類形狀 (Shapes)</option>
                                </optgroup>
                                <optgroup label="其他風格">
                                    <option value="be">大耳人物 (Big Ears)</option>
                                    <option value="ico">簡約圖示 (Icons)</option>
                                    <option value="thu">讚美手勢 (Thumbs)</option>
                                </optgroup>
                            </select>
                        </div>
                    </div>
                    <div className="modal-footer" style={{ justifyContent: 'space-between' }}>
                        <button className="btn negative-btn" id="deleteStudentBtn">🗑️ 刪除學生</button>
                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <button className="btn cancel-btn" onClick={() => close('editStudent')}>取消</button>
                            <button className="btn primary-btn" id="saveEditStudentBtn">儲存</button>
                        </div>
                    </div>
                </div>
            </div>

            {/* MANAGE GROUP MODAL */}
            <div id="manageGroupModal" className={`modal-overlay ${modals.manageGroup ? '' : 'hidden'}`}>
                <div className="modal-content group-modal-content">
                    <div className="modal-header">
                        <h2 id="groupModalTitle">{editingGroupId ? '編輯群組' : '新增群組'}</h2>
                        <button className="close-modal-btn" onClick={() => close('manageGroup')}>×</button>
                    </div>
                    <div className="modal-body">
                        <div className="input-group">
                            <label>群組名稱</label>
                            <input type="text" id="groupNameInput" placeholder="第一組" />
                        </div>
                        <div className="group-selection-area">
                            <label>選擇群組成員：</label>
                            <div className="selection-grid" id="groupStudentSelectionGrid">
                                {students.map(s => {
                                    const isChecked = manageGroupSelectedIds.includes(s.id);
                                    const total = editingGroupId ? (s.cP || 0) : ((s.cP || 0) + (s.iP || 0));
                                    return (
                                        <label key={s.id} className="selection-item" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '8px', border: '1px solid var(--border-color)', borderRadius: '10px', background: 'white' }}>
                                            <input type="checkbox" value={s.id} checked={isChecked} onChange={() => toggleManageGroupStudent(s.id)} />
                                            <img src={window.getAvatarUrl ? window.getAvatarUrl(s.aU || s.id, s.aS) : ''} style={{ width: '24px', height: '24px', borderRadius: '50%' }} />
                                            <span style={{ fontSize: '0.9rem' }}>{s.id} ({total})</span>
                                        </label>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                    <div className="modal-footer" style={{ justifyContent: 'space-between' }}>
                        <button className={`btn negative-btn ${!editingGroupId ? 'hidden' : ''}`} id="deleteGroupBtn">🗑️ 刪除群組</button>
                        <div style={{ display: 'flex', gap: '1rem', marginLeft: 'auto' }}>
                            <button className="btn cancel-btn" onClick={() => close('manageGroup')}>取消</button>
                            <button className="btn primary-btn" id="saveGroupBtn">儲存</button>
                        </div>
                    </div>
                </div>
            </div>
            
            {/* GROUP DETAIL MODAL */}
            <div id="groupDetailModal" className={`modal-overlay ${modals.groupDetail ? '' : 'hidden'}`}>
                <div className="modal-content" style={{ maxWidth: '900px', width: '96%' }}>
                    <div className="modal-header">
                        <h2 id="groupDetailTitle">{groupDetailData ? groupDetailData.id : '群組資訊'}</h2>
                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                            <button className="close-modal-btn" onClick={() => close('groupDetail')}>&times;</button>
                        </div>
                    </div>
                    <div className="modal-body">
                        <ul id="groupDetailStudentList" className="group-member-list" style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', listStyle: 'none', padding: 0 }}>
                            {groupDetailData && groupDetailData.sIds.map(sid => {
                                const s = students.find(x => x.id === sid);
                                if (!s) return null;
                                return (
                                    <li key={sid} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.4rem 0.8rem', border: '1px solid var(--border-color)', borderRadius: '8px', background: 'white' }}>
                                        <img src={window.getAvatarUrl ? window.getAvatarUrl(s.aU || s.id, s.aS) : ''} className="student-avatar small-avatar" style={{ width: '24px', height: '24px', borderRadius: '50%' }} />
                                        <span>{s.id}</span>
                                    </li>
                                );
                            })}
                        </ul>
                    </div>
                    <div className="modal-footer" style={{ display: 'flex', gap: '0.5rem' }}>
                        <button id="editGroupDetailBtn" className="btn" style={{ flex: 1 }}>編輯群組</button>
                        <button id="groupAwardTreasureBtn" className="btn" style={{ flex: 1, background: 'var(--success-color, #10b981)', color: 'white' }}>給予全組寶物</button>
                        <button id="groupAwardPointsBtn" className="btn primary-btn" style={{ flex: 1 }}>給予全組點數</button>
                    </div>
                </div>
            </div>

            {/* STUDENT/GROUP PROFILE MODAL */}
            <div id="studentProfileModal" className={`modal-overlay ${modals.studentProfile ? '' : 'hidden'}`} style={{ zIndex: 2200 }}>
                <div className="modal-content profile-modal" style={{ width: '90%', maxWidth: '950px', padding: '1.5rem' }}>
                    <div className="modal-header">
                        <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span id="currentProfileName">{cIds.length > 1 ? (hasGroupContext ? '群組點數' : '多重獎勵') : cId}</span>
                            {!hasGroupContext && cIds.length === 1 && (
                                <button id="editProfileBtn" className="icon-btn edit-profile-btn" title="編輯資料"
                                    onClick={() => {
                                        const s = students.find(x => x.id === cId);
                                        if (!s) return;
                                        document.getElementById('editStudentName').value = s.id;
                                        document.getElementById('editStudentAvatarStyle').value = s.aS || 'fe';
                                        document.getElementById('editStudentAvatarPreview').src = window.getAvatarUrl(s.aU || s.id, s.aS);
                                        setModal('editStudent', true);
                                    }}
                                >✏️</button>
                            )}
                            {hasGroupContext && (
                                <button id="editGroupProfileBtn" className="icon-btn edit-profile-btn" title="編輯群組">✏️</button>
                            )}
                        </h2>
                        <button className="close-modal-btn" onClick={() => close('studentProfile')}>×</button>
                    </div>
                    <div id="groupAwardMembersPeek" className="hidden" style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingBottom: '0.5rem', margin: '0 1.5rem', borderBottom: '1px solid #eee' }}></div>
                    
                    <div className="modal-body">
                        <div className="tabs main-tabs">
                            <button className={`tab-btn ${activeProfileTab === 'award' ? 'active' : ''}`} onClick={() => handleProfileTabSwitch('award')}>給予點數</button>
                            {cIds.length === 1 && !hasGroupContext && (
                                <button className={`tab-btn ${activeProfileTab === 'gift' ? 'active' : ''}`} onClick={() => handleProfileTabSwitch('gift')}>贈與點數</button>
                            )}
                            <button className={`tab-btn ${activeProfileTab === 'treasure' ? 'active' : ''}`} onClick={() => handleProfileTabSwitch('treasure')}>寶物</button>
                            {cIds.length === 1 && !hasGroupContext && (
                                <button className={`tab-btn ${activeProfileTab === 'history' ? 'active' : ''}`} onClick={() => handleProfileTabSwitch('history')}>檢視紀錄</button>
                            )}
                        </div>

                        {/* AWARD TAB */}
                        {activeProfileTab === 'award' && (
                            <div className="profile-tab-content active">
                                <div className="tabs sub-tabs">
                                    <button className={`sub-tab-btn ${activeAwardSubTab === 'positive' ? 'active' : ''}`} onClick={() => handleSubTabSwitch('positive')}>優點</button>
                                    <button className={`sub-tab-btn ${activeAwardSubTab === 'needs-work' ? 'active' : ''}`} onClick={() => handleSubTabSwitch('needs-work')}>待改進</button>
                                    <button className={`sub-tab-btn ${activeAwardSubTab === 'custom' ? 'active' : ''}`} onClick={() => handleSubTabSwitch('custom')}>臨時自訂</button>
                                </div>
                                
                                {activeAwardSubTab === 'positive' && (
                                    <div className="award-content active">
                                        {[...pointItems.pos].sort(window.sortItems).map(item => (
                                            <button key={item.id} className="point-item-btn positive" onClick={() => { doAwardPoints(item.lb, item.vl, item.iSum === 1); close('studentProfile'); }}>
                                                <div className="point-icon">{item.ic}</div>
                                                <div className="point-label">{item.lb}{item.iSum === 1 && <small>(不列排)</small>}</div>
                                                <div className="point-value">{item.vl > 0 ? '+' : ''}{item.vl}</div>
                                            </button>
                                        ))}
                                    </div>
                                )}
                                
                                {activeAwardSubTab === 'needs-work' && (
                                    <div className="award-content active">
                                        {[...pointItems.neg].sort(window.sortItems).map(item => (
                                            <button key={item.id} className="point-item-btn negative" onClick={() => { doAwardPoints(item.lb, item.vl, item.iSum === 1); close('studentProfile'); }}>
                                                <div className="point-icon">{item.ic}</div>
                                                <div className="point-label">{item.lb}{item.iSum === 1 && <small>(不列排)</small>}</div>
                                                <div className="point-value">{item.vl > 0 ? '+' : ''}{item.vl}</div>
                                            </button>
                                        ))}
                                    </div>
                                )}

                                {activeAwardSubTab === 'custom' && (
                                    <div className="award-content active" style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', textAlign: 'left' }}>
                                        <div className="input-group">
                                            <label>自訂項目名稱</label>
                                            <select className="filter-select" value={cLabel} onChange={(e) => setCLabel(e.target.value)}>
                                                <option value="新增項目">✨ 新增項目</option>
                                                {customItems.map(nam => nam !== '新增項目' && <option key={nam} value={nam}>{nam}</option>)}
                                            </select>
                                        </div>
                                        {cLabel === '新增項目' && (
                                            <div className="input-group">
                                                <label>臨時名稱</label>
                                                <input type="text" value={cTempName} onChange={(e) => setCTempName(e.target.value)} />
                                            </div>
                                        )}
                                        <div className="input-group">
                                            <label>點數 (由左方按鈕控制正負)</label>
                                            <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                                                <button type="button" className="btn secondary-btn" style={{ background: cSign === '+' ? '#22c55e' : '#ef4444', color: '#fff', padding: '0.4rem 0.8rem', fontWeight: 'bold' }} onClick={() => setCSign(cSign==='+'?'-':'+')}>{cSign}</button>
                                                <input type="number" value={cValue} onChange={(e) => setCValue(e.target.value)} style={{ flex: 1 }} />
                                                <button type="button" className="btn secondary-btn" onClick={() => setCValue('')}>清空</button>
                                            </div>
                                        </div>
                                        <div className="checkbox-group">
                                            <input type="checkbox" id="cIgnoreCb" checked={cIgnore} onChange={(e) => setCIgnore(e.target.checked)} />
                                            <label htmlFor="cIgnoreCb">不列入排名</label>
                                        </div>
                                        <button className="btn primary-btn" onClick={handleCustomAward}>給予點數</button>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* GIFT TAB */}
                        {activeProfileTab === 'gift' && (
                            <div className="profile-tab-content active" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                <div className="input-group">
                                    <label>1. 選擇贈與對象 (可多選)</label>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '0.4rem', maxHeight: '200px', overflowY: 'auto', padding: '0.5rem', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
                                        {students.filter(s => s.id !== cId).map(s => (
                                            <label key={s.id} style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', background: '#fff', padding: '0.3rem', borderRadius: '4px', border: '1px solid #e2e8f0', cursor: 'pointer' }}>
                                                <input type="checkbox" checked={giftRecipients.includes(s.id)} onChange={(e) => {
                                                    setGiftRecipients(prev => e.target.checked ? [...prev, s.id] : prev.filter(x => x !== s.id));
                                                }} />
                                                <span>{s.id}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
                                    <div className="input-group" style={{ margin: 0 }}>
                                        <label>2. 贈與數量</label>
                                        <input type="number" min="1" style={{ width: '100px' }} value={giftAmount} onChange={e => setGiftAmount(e.target.value)} />
                                    </div>
                                    <div className="input-group" style={{ margin: 0 }}>
                                        <label>3. 手續費</label>
                                        <div style={{ display: 'flex', gap: '0.3rem', alignItems: 'center' }}>
                                            每 <input type="number" style={{ width: '60px' }} value={giftFeeInt} onChange={e => { const v = Number(e.target.value); setGiftFeeInt(v); if(window.saveGiftSettings) window.saveGiftSettings({gInt:v}); }} /> 
                                            點扣 <input type="number" style={{ width: '60px' }} value={giftFeeStep} onChange={e => { const v = Number(e.target.value); setGiftFeeStep(v); if(window.saveGiftSettings) window.saveGiftSettings({gStep:v}); }} />
                                        </div>
                                    </div>
                                    <div className="checkbox-group">
                                        <input type="checkbox" id="giftIgnR" checked={giftIgn} onChange={e => { const v = e.target.checked; setGiftIgn(v); if(window.saveGiftSettings) window.saveGiftSettings({gIgn:v}); }} />
                                        <label htmlFor="giftIgnR">不列入排名</label>
                                    </div>
                                    <button className="btn primary-btn" onClick={handleGift}>確定贈與</button>
                                </div>
                            </div>
                        )}

                        {/* TREASURE TAB */}
                        {activeProfileTab === 'treasure' && (
                            <div className="profile-tab-content active">
                                {treasureDefs.length === 0 ? (
                                    <p style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>尚未定義寶物</p>
                                ) : (
                                    <div className="treasure-award-grid">
                                        {[...treasureDefs].sort(window.sortItems).map(td => {
                                            const qty = pendingTreasures[td.id] || 0;
                                            return (
                                                <div key={td.id} className="treasure-card">
                                                    <div className="treasure-info">
                                                        <span className="treasure-icon">{td.ic}</span>
                                                        <span className="treasure-name">{td.lb}</span>
                                                    </div>
                                                    <div className="treasure-controls">
                                                        <button className="btn treasure-minus" onClick={() => setPendingTreasures(p => ({...p, [td.id]: (p[td.id]||0)-1}))}>-</button>
                                                        <span className={`treasure-qty ${qty!==0 ? (qty>0?'positive-val':'negative-val') : ''}`}>{qty>0?'+':''}{qty}</span>
                                                        <button className="btn treasure-plus" onClick={() => setPendingTreasures(p => ({...p, [td.id]: (p[td.id]||0)+1}))}>+</button>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                                <button className="btn primary-btn" style={{ width: '100%', marginTop: '1rem', padding: '1rem', background: 'linear-gradient(135deg, #10b981, #059669)' }} disabled={Object.values(pendingTreasures).every(v=>v===0)} onClick={applyTreasures}>
                                    🎁 確定給予寶物
                                </button>
                            </div>
                        )}

                        {/* HISTORY TAB */}
                        {activeProfileTab === 'history' && (
                            <div className="profile-tab-content active">
                                <ul className="history-list">
                                    {logs.filter(l => l.sID === cId).reverse().map(l => {
                                        const d = typeof l.TS === 'number' ? new Date(l.TS) : (window.StampTool ? window.StampTool.decode(l.TS) : new Date());
                                        const isTr = !!l.trId;
                                        return (
                                            <li key={l.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.8rem', borderBottom: '1px solid #eee' }}>
                                                <div>
                                                    <div style={{ color: '#94a3b8', fontSize: '0.85em' }}>{d.toLocaleString()}</div>
                                                    <div>{l.lb} {l.iSum === 1 && !isTr && <small style={{ color: '#94a3b8' }}>(不列排)</small>}</div>
                                                </div>
                                                <div style={{ fontWeight: 'bold', color: isTr ? '#000' : (l.pt > 0 ? '#22c55e' : '#ef4444'), display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                    {!isTr && (l.pt > 0 ? '+' : '')}{!isTr && l.pt}
                                                    <button onClick={() => { if(window.deleteLog) window.deleteLog(l.id); refresh(); }} style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}>🗑️</button>
                                                </div>
                                            </li>
                                        )
                                    })}
                                    {logs.filter(l => l.sID === cId).length === 0 && <li className="empty-state">無紀錄</li>}
                                </ul>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* CLASS SUMMARY MODAL */}
            <div id="classSummaryModal" className={`modal-overlay ${modals.classSummary ? '' : 'hidden'}`} style={{ zIndex: 2200 }}>
                <div className="modal-content reports-modal-content">
                    <div className="modal-header" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                        <h2 style={{ flex: 1, minWidth: '150px' }}>{summaryRangeText}</h2>
                        <select className="filter-select" value={summaryRange} onChange={e => setSummaryRange(e.target.value)} style={{ fontSize: '0.85rem', padding: '0.3rem 0.6rem' }}>
                            <option value="today">今天</option>
                            <option value="week">本週</option>
                            <option value="month">本月</option>
                            <option value="all">所有紀錄</option>
                        </select>
                        <button className="close-modal-btn" onClick={() => close('classSummary')}>×</button>
                    </div>
                    <div className="modal-body">
                        <div className="summary-grid" id="classSummaryContent">
                            {summaryData.map((s, idx) => (
                                <div key={s.id} className="summary-box" onClick={() => openStudentSummaryDetail(s.id)} style={{ cursor: 'pointer' }}>
                                    <div className="summary-seq">{idx + 1}</div>
                                    <div className="summary-name">{s.id}</div>
                                    <div className={`summary-points ${s.pts < 0 ? 'negative' : ''}`}>{s.pts > 0 ? `+${s.pts}` : s.pts}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* CLASS SUMMARY STUDENT DETAIL MODAL */}
            <div id="classSummaryStudentDetailModal" className={`modal-overlay ${modals.summaryDetail ? '' : 'hidden'}`} style={{ zIndex: 2250 }}>
                <div className="modal-content" style={{ maxWidth: '500px' }}>
                    <div className="modal-header">
                        <h2 id="summaryDetailStudentName">{summaryDetailName}</h2>
                        <button className="close-modal-btn" onClick={() => close('summaryDetail')}>×</button>
                    </div>
                    <div className="modal-body">
                        <div id="summaryDetailTotal" style={{ fontWeight: 'bold', marginBottom: '1rem', textAlign: 'center', color: summaryDetailTotal > 0 ? 'var(--positive-color)' : (summaryDetailTotal < 0 ? 'var(--negative-color)' : 'var(--text-secondary)') }}>
                            {summaryDetailRangeText}{summaryDetailTotal > 0 ? `+${summaryDetailTotal}` : summaryDetailTotal}
                        </div>
                        <div id="summaryDetailGrid" className="summary-detail-grid">
                            {summaryDetailItems.length === 0 ? (
                                <p style={{ gridColumn: '1/-1', textAlign: 'center', color: 'var(--text-secondary)', padding: '1.5rem' }}>此時間範圍內無紀錄</p>
                            ) : (
                                summaryDetailItems.map((item, idx) => (
                                    <div key={idx} className={`summary-detail-card ${item.isTreasure ? '' : (item.pt > 0 ? 'positive' : (item.pt < 0 ? 'negative' : ''))}`}>
                                        <div className="detail-label">{item.lb}{item.iSum === 1 ? ' <small>(不列排)</small>' : ''}<div style={{ fontSize: '0.85em', color: 'var(--text-secondary)', marginTop: '4px' }}>計 {item.count} 次</div></div>
                                        {!item.isTreasure && <div className="detail-pts">{item.pt > 0 ? '+' : ''}{item.pt}</div>}
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                    <div className="modal-footer">
                        <button className="btn cancel-btn" onClick={() => close('summaryDetail')}>關閉</button>
                    </div>
                </div>
            </div>

            {/* KEEP VANILLA SHELLS for others that are deeply wired in script.js (ManageClasses, Settings etc) to not break existing DOM bindings until full refactor */}
            <div id="manageClassesModal" className={`modal-overlay ${modals.manageClasses ? '' : 'hidden'}`}>
                <div className="modal-content manage-classes-modal-content" style={{ maxWidth: '1100px', width: '95%' }}>
                    <div className="modal-header"><h2>🏫 班級管理</h2><button className="close-modal-btn" onClick={() => close('manageClasses')}>&times;</button></div>
                    <div className="modal-body settings-body classes-modal-body">
                        <div className="classes-left classes-tab-content active" id="classesTabList">
                            <div className="settings-section"><h3>我的班級</h3><ul id="classList" className="settings-list"></ul></div>
                        </div>
                        <div className="classes-right classes-tab-content" id="classesTabAdd">
                            <div className="settings-section">
                                <h3>➕ 新增班級</h3>
                                <div className="input-group"><label>班級名稱</label><input type="text" id="newClassName" /></div>
                                <div className="input-group"><label>複製自...</label><select id="copyFromClassSelect" className="filter-select"></select></div>
                                <div className="checkbox-group" style={{ marginTop: '0.5rem' }}>
                                    <label><input type="checkbox" id="copyItemsCheckbox" defaultChecked /> 複製行為項目設定</label>
                                </div>
                                <div className="checkbox-group">
                                    <label><input type="checkbox" id="copyStudentsCheckbox" /> 複製學生與群組</label>
                                </div>
                                <button className="btn primary-btn" id="createClassBtn" style={{ width: '100%' }}>建立班級</button>
                            </div>

                            <div className="settings-section" id="behaviorSyncSection">
                                <h3>📂 複製行為項目設定</h3>
                                <p style={{ fontSize: '0.8em', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>您可以將其他班級的行為點數設定（優點與待改進項目）覆蓋綁定至目前班級。</p>
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    <select id="syncFromClassSelect" className="filter-select" style={{ flex: 1 }}>
                                        <option value="">請選擇來源班級...</option>
                                    </select>
                                    <button id="confirmSyncBehaviorsBtn" className="btn secondary-btn" style={{ whiteSpace: 'nowrap' }}>複製</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* AVATAR PICKER MODAL */}
            <div id="avatarPickerModal" className={`modal-overlay ${modals.avatarPicker ? '' : 'hidden'}`} style={{ zIndex: 2400 }}>
                <div className="modal-content" style={{ width: '95%', maxWidth: '600px', padding: '1.5rem' }}>
                    <div className="modal-header" style={{ marginBottom: '1rem' }}>
                        <h2 style={{ fontSize: '1.25rem' }}>從隨機圖庫中挑選未使用過的頭像</h2>
                        <button className="close-modal-btn avatar-picker-close" onClick={() => close('avatarPicker')}>&times;</button>
                    </div>
                    <div className="modal-body">
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(70px, 1fr))', gap: '1rem', maxHeight: '50vh', overflowY: 'auto', padding: '0.5rem' }}>
                            {avatarPickerSeeds.map(seed => (
                                <img key={seed} src={window.getAvatarUrl ? window.getAvatarUrl(seed, avatarPickerStyle) : ''}
                                    className="avatar-picker-item"
                                    style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', borderRadius: '12px', cursor: 'pointer', border: '2px solid transparent' }}
                                    onClick={() => handleAvatarPick(seed)}
                                />
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* ICON PICKER */}
            <div id="iconPickerModal" className={`modal-overlay ${modals.iconPicker ? '' : 'hidden'}`} style={{ zIndex: 3000 }}>
                <div className="modal-content" style={{ width: '90%', maxWidth: '950px' }}>
                    <div className="modal-header"><h2>選擇圖示</h2><button className="close-modal-btn" onClick={() => close('iconPicker')}>×</button></div>
                    <div className="modal-body">
                        <div className="icon-picker-grid">
                            {ICONS.map(ico => (
                                <button key={ico} className="icon-picker-btn" onClick={() => handleIconPick(ico)}>{ico}</button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* EDIT POINT ITEM */}
            <div id="editPointItemModal" className={`modal-overlay ${modals.editPointItem ? '' : 'hidden'}`} style={{ zIndex: 2500 }}>
                <div className="modal-content" style={{ maxWidth: '400px' }}>
                    <div className="modal-header"><h2>{isTreasureItem ? '編輯寶物' : '編輯行為項目'}</h2><button className="close-modal-btn" onClick={() => close('editPointItem')}>×</button></div>
                    <div className="modal-body">
                        <div className="input-group"><label>圖示</label><button className="icon-select-btn" id="editItemIconBtn">{editItemIcon}</button></div>
                        <div className="input-group"><label>名稱</label><input type="text" id="editItemLabel" value={editItemLabel} onChange={e => setEditItemLabel(e.target.value)} /></div>
                        <div className="input-group" style={{ display: isTreasureItem ? 'none' : 'flex' }}><label>點數</label><input type="number" id="editItemValue" value={editItemValue} onChange={e => setEditItemValue(Number(e.target.value))} /></div>
                        <div className="checkbox-group" style={{ display: isTreasureItem ? 'none' : 'flex' }}><input type="checkbox" id="editItemIgnore" checked={editItemIgnore} onChange={e => setEditItemIgnore(e.target.checked)} /><label>不列入排名</label></div>
                    </div>
                    <div className="modal-footer">
                        <button className="btn cancel-btn" onClick={() => close('editPointItem')}>取消</button>
                        <button className="btn primary-btn" id="saveEditItemBtn">儲存</button>
                    </div>
                </div>
            </div>
            
            {/* UNDO TOAST */}
            <div id="undoToast" className="undo-toast-bubble hidden">
                <span id="undoMessage" className="undo-msg-tooltip">已給予點數</span>
                <button id="undoActionBtn" className="btn undo-btn-simple" onClick={undoAction}>復原</button>
                <button className="undo-close-btn" onClick={() => document.getElementById('undoToast').classList.add('hidden')}>&times;</button>
            </div>
        </React.Fragment>
    );
}
