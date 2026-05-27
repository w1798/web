/**
 * ClassKudox - React Context Provider
 */
const AppContext = React.createContext();

function AppProvider({ children }) {
    const safeArray = (val) => Array.isArray(val) ? [...val] : (val && typeof val[Symbol.iterator] === 'function' ? Array.from(val) : []);
    const safeObject = (val) => val && typeof val === 'object' ? { ...val } : {};
    
    const [state, setState] = React.useState({
        students: safeArray(window.students),
        groups: safeArray(window.groups),
        logs: safeArray(window.logs),
        pointItems: window.pointItems ? { 
            pos: safeArray(window.pointItems.pos), 
            neg: safeArray(window.pointItems.neg) 
        } : { pos: [], neg: [] },
        customItems: safeArray(window.customItems),
        customPrefs: safeObject(window.customPrefs),
        giftSettings: safeObject(window.giftSettings),
        treasureDefs: safeArray(window.treasureDefs),
        classes: safeArray(window.classes),
        currentClassId: window.currentClassId || '',
        settings: safeObject(window.settings),
        currentView: window.currentView || 'students',
        isMultiSelectMode: window.isMultiSelectMode || false,
        selectedStudentIds: safeArray(window.selectedStudentIds),
        selectedGroupIds: safeArray(window.selectedGroupIds),
        cloudStatus: {
            binId: window.cloudBinId || '',
            apiKey: window.cloudApiKey || '',
            isSyncing: window.isSyncing || false
        },
        // 彈窗狀態管理
        modals: {
            settings: false,
            reports: false,
            addStudent: false,
            editStudent: false,
            manageClasses: false,
            studentProfile: false,
            manageGroup: false,
            groupDetail: false,
            classSummary: false,
            editPointItem: false,
            iconPicker: false,
            avatarPicker: false,
            summaryDetail: false
        },
        // 目前獎勵對象 context（由 openAwardModal bridge 寫入）
        awardContext: {
            ids: [],
            title: '',
            groupId: null
        },
        // 目前個人檔案 ID（單選時等同 ids[0]）
        currentProfileId: null,
        // 群組詳情資料（由 openGroupDetailModal bridge 寫入）
        groupDetailData: null,
        // 編輯中群組 ID（由 openManageGroupModal bridge 寫入）
        editingGroupId: null
    });

    // setModal(name, isOpen, extraData?)
    // extraData 可含 { awardContext, currentProfileId, groupDetailData } 等額外資料
    const setModal = React.useCallback((name, isOpen, extraData = {}) => {
        setState(prev => {
            const next = {
                ...prev,
                modals: { ...prev.modals, [name]: isOpen }
            };
            if (isOpen && extraData.awardContext) {
                next.awardContext = { ...prev.awardContext, ...extraData.awardContext };
            }
            if (extraData.currentProfileId !== undefined) {
                next.currentProfileId = extraData.currentProfileId;
            }
            if (extraData.groupDetailData !== undefined) {
                next.groupDetailData = extraData.groupDetailData;
            }
            if (extraData.editingGroupId !== undefined) {
                next.editingGroupId = extraData.editingGroupId;
            }
            return next;
        });

        if (isOpen) {
            document.body.classList.add('modal-open');
            if (name === 'manageClasses' && window.renderClassSelector) {
                setTimeout(() => window.renderClassSelector(), 0);
            }
        } else {
            setTimeout(() => {
                const anyOpen = !!document.querySelector('.modal-overlay:not(.hidden)');
                if (!anyOpen) document.body.classList.remove('modal-open');
            }, 50);
        }
    }, []);

    const refresh = React.useCallback(() => {
        setState(prev => ({
            ...prev,
            students: safeArray(window.students),
            groups: safeArray(window.groups),
            logs: safeArray(window.logs),
            pointItems: {
                pos: safeArray(window.pointItems?.pos),
                neg: safeArray(window.pointItems?.neg)
            },
            customItems: safeArray(window.customItems),
            customPrefs: safeObject(window.customPrefs),
            giftSettings: safeObject(window.giftSettings),
            treasureDefs: safeArray(window.treasureDefs),
            classes: safeArray(window.classes),
            currentClassId: window.currentClassId || '',
            settings: safeObject(window.settings),
            currentView: window.currentView || 'students',
            isMultiSelectMode: window.isMultiSelectMode || false,
            selectedStudentIds: safeArray(window.selectedStudentIds),
            selectedGroupIds: safeArray(window.selectedGroupIds),
            cloudStatus: {
                binId: window.cloudBinId || '',
                apiKey: window.cloudApiKey || '',
                isSyncing: window.isSyncing || false
            }
            // 注意：modals 和 awardContext 刻意保留 prev 的值，不被 refresh 覆蓋
        }));
    }, []);

    // --- Actions ---

    // 主畫面切換
    const switchMainView = React.useCallback((view) => {
        window.currentView = view; // 同步全域供剩餘舊邏輯讀取
        setState(prev => ({ ...prev, currentView: view }));
        // 觸發 Vanilla JS 的 UI 更新 (例如標籤 Active 狀態，若仍有舊標籤存在)
        if (window.switchMainView) {
            // 注意：我們已經在上面更新了 window.currentView，
            // 這裡呼叫 window.switchMainView 主要是為了執行其內部的 DOM 操作
        }
    }, []);

    // 點數給予 (橋接至獎勵彈窗)
    const awardPoints = React.useCallback((lb, pt, forcedIgnore = null) => {
        if (window.awardPoints) {
            window.awardPoints(null, lb, pt, forcedIgnore);
        }
    }, []);

    // 寶物給予 (橋接至獎勵彈窗)
    const awardTreasure = React.useCallback((treasureId, qty, silent = false) => {
        if (window.awardTreasure) {
            return window.awardTreasure(treasureId, qty, silent);
        }
        return [];
    }, []);

    // 復原操作
    const undoAction = React.useCallback(() => {
        if (window.undoAction) window.undoAction();
        refresh();
    }, [refresh]);

    // 批量獎勵
    const openMultiAwardModal = React.useCallback(() => {
        let ids = [];
        let title = '';
        if (state.currentView === 'groups') {
            if (state.selectedGroupIds.length === 0) return alert('請先選擇群組');
            state.selectedGroupIds.forEach(gid => {
                const g = state.groups.find(x => x.id === gid);
                if (g) ids = ids.concat(g.sIds);
            });
            title = `給予 ${state.selectedGroupIds.length} 個群組 (${ids.length} 人次) 點數`;
        } else {
            if (state.selectedStudentIds.length === 0) return alert('請先選擇學生');
            ids = [...state.selectedStudentIds];
            title = `給予 ${ids.length} 位學生點數`;
        }
        
        if (window.openAwardModal) {
            window.openAwardModal(ids, title);
        }
    }, [state.currentView, state.selectedGroupIds, state.selectedStudentIds, state.groups]);

    // 切換多選模式
    const toggleMultiSelectMode = React.useCallback(() => {
        const nextMode = !state.isMultiSelectMode;
        
        // --- 強制同步全域 ---
        window.isMultiSelectMode = nextMode;
        window.selectedStudentIds = [];
        window.selectedGroupIds = new Set();
        
        // 如果全域有定義區域變數同步器，則呼叫它
        if (typeof window.syncGlobalToLocal === 'function') window.syncGlobalToLocal();
        
        setState(prev => ({
            ...prev,
            isMultiSelectMode: nextMode,
            selectedStudentIds: [],
            selectedGroupIds: []
        }));

        // 關閉復原氣泡並強制觸發滾動檢查（以隱藏/顯示浮動按鈕）
        if (window.hideUndoToast) window.hideUndoToast();
        setTimeout(() => window.dispatchEvent(new Event('scroll')), 10);
    }, [state.isMultiSelectMode]);

    // 切換單一學生的選取（直接操作 React state，不走 Vanilla bridge）
    const toggleStudentSelection = React.useCallback((id) => {
        setState(prev => {
            const ids = prev.selectedStudentIds.includes(id)
                ? prev.selectedStudentIds.filter(x => x !== id)
                : [...prev.selectedStudentIds, id];
            window.selectedStudentIds = ids;
            return { ...prev, selectedStudentIds: ids };
        });
    }, []);

    // 全選
    const selectAllStudents = React.useCallback(() => {
        const isGroups = state.currentView === 'groups';
        if (isGroups) {
            const allIds = state.groups.map(g => g.id);
            const isAllSelected = state.selectedGroupIds.length === allIds.length;
            const nextSelected = isAllSelected ? [] : allIds;
            
            window.selectedGroupIds = new Set(nextSelected);
            setState(prev => ({ ...prev, selectedGroupIds: nextSelected }));
        } else {
            const allIds = state.students.map(s => s.id);
            const isAllSelected = state.selectedStudentIds.length === allIds.length;
            const nextSelected = isAllSelected ? [] : allIds;
            
            window.selectedStudentIds = nextSelected;
            setState(prev => ({ ...prev, selectedStudentIds: nextSelected }));
        }
    }, [state.currentView, state.groups, state.students, state.selectedGroupIds, state.selectedStudentIds]);

    // 將 refresh 曝露給全域，讓遺留代碼可在異動後呼叫
    React.useEffect(() => {
        window._refreshReact = refresh;
        window.refreshProxy = refresh; 
        
        return () => {
            delete window._refreshReact;
        };
    }, [refresh]);

    // 【關鍵修復】掛載後與主程序同步
    React.useEffect(() => {
        refresh();
        const timer = setTimeout(refresh, 500);
        return () => clearTimeout(timer);
    }, [refresh]);

    // --- Bridge ---
    React.useEffect(() => {
        // 暴露帶資料的版本：window._setReactModal(name, isOpen, extraData)
        window._setReactModal = setModal;
        window._openReactManageGroupModal = (groupId) => {
            setModal('manageGroup', true, {
                editingGroupId: groupId || null
            });
        };
        window._openReactGroupDetailModal = (groupData) => {
            setModal('groupDetail', true, { groupDetailData: groupData || null });
        };
        window._openReactEditPointItemModal = (cat, itemId) => {
            window._pendingEditPointItem = { cat, itemId };
            setModal('editPointItem', true);
        };
        // 開放完整的 openAwardModal 橋接
        window._openReactAwardModal = (ids, title, groupId) => {
            setModal('studentProfile', true, {
                awardContext: { ids: ids || [], title: title || '', groupId: groupId || null },
                currentProfileId: (ids && ids.length === 1) ? ids[0] : null
            });
            // Force DOM visibility to override any Vanilla-added "hidden" class
            const el = document.getElementById('studentProfileModal');
            if (el) el.classList.remove('hidden');
        };
    }, [setModal]);

    const actions = {
        switchMainView,
        awardPoints,
        awardTreasure,
        undoAction,
        toggleMultiSelectMode,
        toggleStudentSelection,
        selectAllStudents,
        openMultiAwardModal,
        setModal
    };

    return (
        <AppContext.Provider value={{ ...state, ...actions, refresh }}>
            {children}
        </AppContext.Provider>
    );
}
