document.addEventListener('DOMContentLoaded', () => {

    // --- State Management : Classes ---
    let classes = JSON.parse(localStorage.getItem('cdData_classes')) || [];
    let currentClassId = localStorage.getItem('cdData_currentClassId');

    const defaultItems = {
        positive: [
            { id: 1, label: '幫助他人', value: 1, icon: '🤝', ignoreTotal: false },
            { id: 2, label: '專心上課', value: 1, icon: '🎯', ignoreTotal: false },
            { id: 3, label: '踴躍參與', value: 1, icon: '🙋', ignoreTotal: false },
            { id: 4, label: '努力學習', value: 1, icon: '💪', ignoreTotal: false },
        ],
        needsWork: [
            { id: 5, label: '不專心', value: -1, icon: '📵', ignoreTotal: false },
            { id: 6, label: '上課講話', value: -1, icon: '🗣️', ignoreTotal: false },
            { id: 7, label: '未帶學用品', value: -1, icon: '🤷', ignoreTotal: false },
        ]
    };

    if (classes.length === 0) {
        let firstClassId = 'class_' + Date.now();
        classes.push({ id: firstClassId, name: '我的班級' });
        currentClassId = firstClassId;
        localStorage.setItem('cdData_classes', JSON.stringify(classes));
        localStorage.setItem('cdData_currentClassId', currentClassId);
        
        const oldStudents = localStorage.getItem('cdData_students');
        if (oldStudents) {
            localStorage.setItem(`cdData_${firstClassId}_students`, oldStudents);
            localStorage.setItem(`cdData_${firstClassId}_groups`, localStorage.getItem('cdData_groups') || '[]');
            localStorage.setItem(`cdData_${firstClassId}_logs`, localStorage.getItem('cdData_logs') || '[]');
            const oldItems = localStorage.getItem('cdData_items');
            if(oldItems) localStorage.setItem(`cdData_${firstClassId}_items`, oldItems);
            const oldSettings = localStorage.getItem('cdData_settings');
            if(oldSettings) localStorage.setItem(`cdData_${firstClassId}_settings`, oldSettings);
        }
    } else if (!currentClassId || !classes.find(c => c.id === currentClassId)) {
        currentClassId = classes[0].id;
        localStorage.setItem('cdData_currentClassId', currentClassId);
    }

    let students = [];
    let groups = [];
    let logs = [];
    let pointItems = null;
    let settings = null;

    // --- Default Templates (add new parameters here in the future) ---
    const DEFAULT_SETTINGS = {
        fontSize: 'medium',
        columns: 5,
        groupColumns: 2,
        enableSound: false,
        studentCardHeight: 0,
        groupCardHeight: 0,
        cloudBinId: '',
        cloudApiKey: '',
        autoBackupInterval: 0, // 0 means Off
        // Future parameters can be added here, they will auto-apply to existing users
    };

    const loadClassData = () => {
        students = JSON.parse(localStorage.getItem(`cdData_${currentClassId}_students`)) || [];
        groups = JSON.parse(localStorage.getItem(`cdData_${currentClassId}_groups`)) || [];
        logs = JSON.parse(localStorage.getItem(`cdData_${currentClassId}_logs`)) || [];

        // pointItems: merge stored with defaults (handles new item categories gracefully)
        const storedItems = JSON.parse(localStorage.getItem(`cdData_${currentClassId}_items`));
        pointItems = storedItems ? storedItems : JSON.parse(JSON.stringify(defaultItems));

        // settings: always start with full defaults, then overlay stored values
        // This guarantees any new parameter added in future will have a default for existing users
        const storedSettings = JSON.parse(localStorage.getItem(`cdData_${currentClassId}_settings`)) || {};
        settings = Object.assign({}, DEFAULT_SETTINGS, storedSettings);
    };
    loadClassData();

    // View States
    let currentView = 'students'; // 'students' or 'groups'
    let isMultiSelectMode = false;
    let selectedStudentIds = new Set();
    
    // Sync State: 0(Incomplete), 1(Waiting), 2(Error), 3(Synced)
    let isDirty = (settings.cloudBinId && settings.cloudApiKey) ? 3 : 0;
    const syncStatusEl = document.getElementById('syncStatus');
    let autoBackupTimer = null;

    // Context for Award Modal
    let awardContextIds = []; // Array of student IDs to receive points
    let currentProfileId = null; // Used for Profile History / Editing
    let editingGroupId = null; // Used when editing a group

    // Undo State
    let lastActionLogIds = [];
    let undoTimeout = null;

    let currentSort = 'score'; // 'score' or 'name'

    const saveData = (skipDirty = false) => {
        localStorage.setItem('cdData_classes', JSON.stringify(classes));
        localStorage.setItem('cdData_currentClassId', currentClassId);
        
        localStorage.setItem(`cdData_${currentClassId}_students`, JSON.stringify(students));
        localStorage.setItem(`cdData_${currentClassId}_groups`, JSON.stringify(groups));
        localStorage.setItem(`cdData_${currentClassId}_logs`, JSON.stringify(logs));
        localStorage.setItem(`cdData_${currentClassId}_items`, JSON.stringify(pointItems));
        localStorage.setItem(`cdData_${currentClassId}_settings`, JSON.stringify(settings));

        if (!skipDirty) {
            // Check if cloud config is complete
            if (settings.cloudBinId && settings.cloudApiKey) {
                isDirty = 1; // Waiting for sync
            } else {
                isDirty = 0; // Incomplete config
            }
            updateSyncStatus();
        }
    };


    // --- Audio Feedback (Web Audio API) ---
    let audioCtx = null;
    const playSound = (type) => {
        if (!settings.enableSound) return;
        if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        if (audioCtx.state === 'suspended') audioCtx.resume();
        const osc = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        osc.connect(gainNode);
        gainNode.connect(audioCtx.destination);

        if (type === 'positive') {
            osc.type = 'sine';
            osc.frequency.setValueAtTime(500, audioCtx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(1000, audioCtx.currentTime + 0.1);
            gainNode.gain.setValueAtTime(0.5, audioCtx.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);
            osc.start();
            osc.stop(audioCtx.currentTime + 0.5);
        } else if (type === 'negative') {
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(300, audioCtx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(150, audioCtx.currentTime + 0.3);
            gainNode.gain.setValueAtTime(0.5, audioCtx.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);
            osc.start();
            osc.stop(audioCtx.currentTime + 0.5);
        }
    };


    // --- DOM Elements ---
    const classSelect = document.getElementById('classSelect');
    const manageClassesBtn = document.getElementById('manageClassesBtn');
    const manageClassesModal = document.getElementById('manageClassesModal');
    const classList = document.getElementById('classList');
    const copyFromClassSelect = document.getElementById('copyFromClassSelect');
    const newClassNameInput = document.getElementById('newClassName');
    const createClassBtn = document.getElementById('createClassBtn');
    const copyItemsCheckbox = document.getElementById('copyItemsCheckbox');
    const copyStudentsCheckbox = document.getElementById('copyStudentsCheckbox');
    const studentGrid = document.getElementById('studentGrid');
    const groupGrid = document.getElementById('groupGrid');
    
    // View Tabs
    const viewTabBtns = document.querySelectorAll('.view-tab-btn');

    // Multi-Select
    const toggleMultiSelectBtn = document.getElementById('toggleMultiSelectBtn');
    const multiSelectBar = document.getElementById('multiSelectBar');
    const multiSelectCount = document.getElementById('multiSelectCount');
    const multiAwardBtn = document.getElementById('multiAwardBtn');
    const cancelMultiBtn = document.getElementById('cancelMultiBtn');
    const selectAllBtn = document.getElementById('selectAllBtn');

    // Undo Toast
    const undoToast = document.getElementById('undoToast');
    const undoActionBtn = document.getElementById('undoActionBtn');
    const undoMessage = document.getElementById('undoMessage');

    // Modals
    const addStudentModal = document.getElementById('addStudentModal');
    const editStudentModal = document.getElementById('editStudentModal');
    const manageGroupModal = document.getElementById('manageGroupModal');
    const studentProfileModal = document.getElementById('studentProfileModal');
    const settingsModal = document.getElementById('settingsModal');
    const reportsModal = document.getElementById('reportsModal');

    // Profile Modal elements
    const currentProfileName = document.getElementById('currentProfileName');
    const editProfileBtn = document.getElementById('editProfileBtn');
    const profileHistoryTabBtn = document.getElementById('profileHistoryTabBtn');
    const positiveItemsGrid = document.getElementById('positiveItems');
    const needsWorkItemsGrid = document.getElementById('needsWorkItems');
    const studentHistoryList = document.getElementById('studentHistoryList');

    // Display Settings
    const fontSizeSelect = document.getElementById('fontSizeSelect');
    const gridColsRange = document.getElementById('gridColsRange');
    const gridColsLabel = document.getElementById('gridColsLabel');

    // Create Group Elements
    const groupNameInput = document.getElementById('groupNameInput');
    const groupStudentSelectionGrid = document.getElementById('groupStudentSelectionGrid');

    // Group Detail Modal elements
    const groupDetailModal = document.getElementById('groupDetailModal');
    const groupDetailTitle = document.getElementById('groupDetailTitle');
    const groupMemberPointsList = document.getElementById('groupMemberPointsList');
    const groupAwardPointsBtn = document.getElementById('groupAwardPointsBtn');
    const editGroupDetailBtn = document.getElementById('editGroupDetailBtn');

    // Settings Modal Tabs
    const settingsTabBtns = document.querySelectorAll('.settings-tab-btn');
    const settingsTabContents = document.querySelectorAll('.settings-tab-content');
    
    // New Range Sliders
    const cardHeightRange = document.getElementById('cardHeightRange');
    const cardHeightLabel = document.getElementById('cardHeightLabel');
    const groupHeightRange = document.getElementById('groupHeightRange');
    const groupHeightLabel = document.getElementById('groupHeightLabel');


    // --- Helper Functions ---
    const generateAvatar = (name, style = 'fun-emoji') => {
        return `https://api.dicebear.com/7.x/${style}/svg?seed=${encodeURIComponent(name)}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf`;
    };

    // Available avatar styles for the dropdown
    const AVATAR_STYLES = [
        { value: 'fun-emoji', label: '😄 趣味表情' },
        { value: 'adventurer', label: '🧑 冒險家' },
        { value: 'avataaars', label: '👤 卡通人像' },
        { value: 'big-ears', label: '👂 大耳朵' },
        { value: 'big-smile', label: '😃 大微笑' },
        { value: 'bottts', label: '🤖 機器人' },
        { value: 'croodles', label: '✏️ 塗鴉風' },
        { value: 'lorelei', label: '🧝 洛蕾萊' },
        { value: 'micah', label: '🎨 米卡' },
        { value: 'miniavs', label: '🟢 迷你頭像' },
        { value: 'notionists', label: '📓 概念人物' },
        { value: 'open-peeps', label: '🚶 開放人物' },
        { value: 'personas', label: '🧑‍🦱 人物角色' },
        { value: 'pixel-art', label: '👾 像素風格' },
        { value: 'rings', label: '💍 圓環圖案' },
        { value: 'shapes', label: '📐 幾何圖案' },
        { value: 'thumbs', label: '👍 大拇指' },
    ];

    // Populate avatar style dropdown dynamically
    const _editStyleSelectEl = document.getElementById('editStudentAvatarStyle');
    if (_editStyleSelectEl && _editStyleSelectEl.options.length <= 2) {
        _editStyleSelectEl.innerHTML = '';
        AVATAR_STYLES.forEach(style => {
            const opt = document.createElement('option');
            opt.value = style.value;
            opt.textContent = style.label;
            _editStyleSelectEl.appendChild(opt);
        });
    }

    const applySettings = () => {
        document.body.dataset.fontSize = settings.fontSize;
        document.documentElement.style.setProperty('--grid-cols', settings.columns);
        document.documentElement.style.setProperty('--group-grid-cols', settings.groupColumns || 2);
        document.documentElement.style.setProperty('--student-card-height', (settings.studentCardHeight || 0) + 'px');
        document.documentElement.style.setProperty('--group-card-height', (settings.groupCardHeight || 0) + 'px');
        
        // Mobile grid: max 4 columns
        document.documentElement.style.setProperty('--mobile-grid-cols', Math.min(settings.columns, 4));
        document.documentElement.style.setProperty('--mobile-group-cols', Math.min(settings.groupColumns || 2, 4));

        // Update UI controls to match
        fontSizeSelect.value = settings.fontSize;
        gridColsRange.value = settings.columns;
        gridColsLabel.textContent = settings.columns;

        const gColsRange = document.getElementById('groupColsRange');
        const gColsLabel = document.getElementById('groupColsLabel');
        if(gColsRange) {
            gColsRange.value = settings.groupColumns || 2;
            gColsLabel.textContent = settings.groupColumns || 2;
        }
        
        if(cardHeightRange) {
            cardHeightRange.value = settings.studentCardHeight || 0;
            cardHeightLabel.textContent = settings.studentCardHeight || 0;
        }
        if(groupHeightRange) {
            groupHeightRange.value = settings.groupCardHeight || 0;
            groupHeightLabel.textContent = settings.groupCardHeight || 0;
        }

        const soundSettingCbx = document.getElementById('enableSoundSetting');
        if(soundSettingCbx) soundSettingCbx.checked = settings.enableSound;

        // Cloud & Auto Backup
        const binIdInput = document.getElementById('cloudBinId');
        const apiKeyInput = document.getElementById('cloudApiKey');
        const autoBackupSelect = document.getElementById('autoBackupInterval');
        if(binIdInput) binIdInput.value = settings.cloudBinId || '';
        if(apiKeyInput) apiKeyInput.value = settings.cloudApiKey || '';
        if(autoBackupSelect) autoBackupSelect.value = settings.autoBackupInterval || 0;

        initAutoBackup();
        updateSyncStatus();
    };

    const updateSyncStatus = () => {
        if (!syncStatusEl) return;
        
        let text = '載入中...';
        let className = 'sync-badge state-0';

        switch(isDirty) {
            case 1:
                text = '等待同步';
                className = 'sync-badge state-1';
                break;
            case 2:
                text = '同步錯誤';
                className = 'sync-badge state-2';
                break;
            case 3:
                text = '同步雲端';
                className = 'sync-badge state-3';
                break;
            case 0:
            default:
                text = '本地資料';
                className = 'sync-badge state-0';
                break;
        }

        syncStatusEl.textContent = text;
        syncStatusEl.className = className;
    };

    const initAutoBackup = () => {
        if (autoBackupTimer) clearInterval(autoBackupTimer);
        const intervalSec = parseInt(settings.autoBackupInterval);
        if (intervalSec > 0) {
            autoBackupTimer = setInterval(() => {
                if (isDirty === 1 && settings.cloudBinId && settings.cloudApiKey) {
                    console.log("Auto backing up...");
                    performCloudUpload(true);
                }
            }, intervalSec * 1000);
        }
    };


    // --- Core Rendering Functions ---

    const renderStudents = () => {
        studentGrid.innerHTML = '';
        
        const sortedStudents = [...students].sort((a,b) => a.name.localeCompare(b.name, 'zh-TW'));
        sortedStudents.forEach(student => {
            const card = document.createElement('div');
            card.className = 'student-card';
            if (isMultiSelectMode && selectedStudentIds.has(student.id)) {
                card.classList.add('selected');
            }

            card.onclick = () => {
                if (isMultiSelectMode) {
                    toggleStudentSelection(student.id);
                } else {
                    openAwardModal([student.id], student.name, student.id);
                }
            };

            let absoluteTotal = 0;
            logs.forEach(log => {
                if (log.studentId === student.id) absoluteTotal += log.points;
            });

            let pointClass = 'student-points';
            if (absoluteTotal > 0) pointClass += ' positive-total';
            if (absoluteTotal < 0) pointClass += ' negative-total';

            const avatarUrl = student.avatarUrl || generateAvatar(student.name, student.avatarStyle || 'fun-emoji');

            card.innerHTML = `
                ${isMultiSelectMode ? `<div class="selection-check">${selectedStudentIds.has(student.id) ? '✓' : ''}</div>` : ''}
                <div class="student-avatar-wrapper">
                    <img src="${avatarUrl}" class="student-avatar" alt="${student.name}">
                    <div class="${pointClass}">${absoluteTotal}</div>
                </div>
                <div class="student-name">${student.name}</div>
            `;
            studentGrid.appendChild(card);
        });
    };

    const renderGroups = () => {
        groupGrid.innerHTML = '';
        
        groups.forEach(group => {
            const card = document.createElement('div');
            card.className = 'student-card group-card';
            
            // Edit button overlay
            const editBtn = document.createElement('button');
            editBtn.className = 'edit-group-inline-btn';
            editBtn.innerHTML = '⚙️';
            editBtn.onclick = (e) => { e.stopPropagation(); openManageGroupModal(group.id); };
            card.appendChild(editBtn);

            card.onclick = () => {
                if (group.studentIds.length === 0) return alert('群組內沒有學生，請先編輯群組加入學生。');
                openGroupDetailModal(group);
            };

            let groupTotal = 0;
            group.studentIds.forEach(sid => {
                logs.forEach(log => {
                    if (log.studentId === sid) groupTotal += log.points;
                });
            });

            const pointsStr = groupTotal > 0 ? `+${groupTotal}` : groupTotal;
            let pointClass = 'student-points';
            if (groupTotal > 0) pointClass += ' positive-total';
            if (groupTotal < 0) pointClass += ' negative-total';
            
            const content = document.createElement('div');
            content.style.display = 'flex'; content.style.flexDirection = 'column'; content.style.alignItems = 'center'; content.style.pointerEvents = 'none';
            content.innerHTML = `
                <div class="group-icon">👥</div>
                <div class="student-name">${group.name}</div>
                <div class="group-member-count">${group.studentIds.length} 位成員</div>
                <div class="${pointClass}" style="margin-top: 5px">${pointsStr}</div>
            `;
            card.appendChild(content);

            groupGrid.appendChild(card);
        });

        // Add "Create Group" card at the END
        const createCard = document.createElement('div');
        createCard.className = 'student-card create-group-card';
        createCard.onclick = () => openManageGroupModal();
        createCard.innerHTML = `
            <div class="student-avatar" style="background:#e2e8f0; display:flex; align-items:center; justify-content:center; font-size: 2rem; color: #64748b;">+</div>
            <div class="student-name">新增群組</div>
        `;
        groupGrid.appendChild(createCard);
    };

    const toggleStudentSelection = (id) => {
        if (selectedStudentIds.has(id)) selectedStudentIds.delete(id);
        else selectedStudentIds.add(id);
        
        multiSelectCount.textContent = `已選擇 ${selectedStudentIds.size} 位學生`;
        renderStudents();
    };

    const openAwardModal = (idsArray, titleName, profileIdContext) => {
        awardContextIds = idsArray;
        currentProfileId = profileIdContext; // Can be null if opening for group or multi-select

        currentProfileName.textContent = titleName;
        
        // Setup permissions
        if (currentProfileId) {
            editProfileBtn.classList.remove('hidden');
            profileHistoryTabBtn.classList.remove('hidden');
        } else {
            editProfileBtn.classList.add('hidden');
            profileHistoryTabBtn.classList.add('hidden');
            // Force return to award tab if history was open
            switchProfileTab('award');
        }

        switchProfileTab('award');
        switchAwardTab('positive');
        openModal(studentProfileModal);
    };

    const awardPoints = (itemId, label, points, forcedIgnore = null) => {
        if(awardContextIds.length === 0) return;

        let newLogIds = [];

        awardContextIds.forEach(studentId => {
            const studentIndex = students.findIndex(s => s.id === studentId);
            if(studentIndex > -1) {
                const logId = Date.now() + Math.random();
                logs.push({
                    id: logId,
                    studentId: studentId,
                    itemId: itemId,
                    label: label,
                    points: points,
                    timestamp: Date.now(),
                    ignoreTotal: forcedIgnore !== null ? forcedIgnore : false
                });
                newLogIds.push(logId);
            }
        });

        saveData();
        playSound(points > 0 ? 'positive' : 'negative');
        createPointAnimation(points, awardContextIds.length);
        
        renderStudents();
        if(currentView === 'groups') renderGroups();
        if(currentProfileId && !studentProfileModal.classList.contains('hidden')) {
            renderHistory();
        }

        // Setup Undo
        lastActionLogIds = newLogIds;
        showUndoToast(points > 0 ? `+${points} 給予 ${awardContextIds.length} 位學生` : `${points} 扣除 ${awardContextIds.length} 位學生`);
        
        // Auto close or clear select
        setTimeout(() => {
            if(document.querySelector('.main-tabs .tab-btn.active').dataset.profileTab === 'award') {
                closeModal(studentProfileModal);
                if (isMultiSelectMode) {
                    toggleMultiSelectMode(); // Exit multi-select after awarding
                }
            }
        }, 500);
    };


    // --- Multi-select Logic ---
    const toggleMultiSelectMode = () => {
        isMultiSelectMode = !isMultiSelectMode;
        selectedStudentIds.clear();
        multiSelectCount.textContent = `已選擇 0 位學生`;
        
        if (isMultiSelectMode) {
            multiSelectBar.classList.remove('hidden');
            toggleMultiSelectBtn.classList.add('active-mode');
            toggleMultiSelectBtn.innerHTML = '❌ 退出選擇';
            // Force View to Students
            switchMainView('students');
        } else {
            multiSelectBar.classList.add('hidden');
            toggleMultiSelectBtn.classList.remove('active-mode');
            toggleMultiSelectBtn.innerHTML = '☑️ 多選模式';
        }
        renderStudents();
    };


    // --- View Navigation ---
    const switchMainView = (viewName) => {
        currentView = viewName;
        viewTabBtns.forEach(btn => {
            if (btn.dataset.view === viewName) btn.classList.add('active');
            else btn.classList.remove('active');
        });

        if (viewName === 'students') {
            studentGrid.classList.remove('hidden');
            groupGrid.classList.add('hidden');
            renderStudents();
        } else {
            studentGrid.classList.add('hidden');
            groupGrid.classList.remove('hidden');
            renderGroups();
            if(isMultiSelectMode) toggleMultiSelectMode(); // disable multi select if in group modes
        }
    };


    const showUndoToast = (msg) => {
        undoMessage.textContent = msg;
        undoToast.classList.remove('hidden');
        // No auto-hide: stays until user clicks Undo, or next award action replaces it
        if(undoTimeout) clearTimeout(undoTimeout);
        undoTimeout = null;
    };

    undoActionBtn.onclick = () => {
        if(lastActionLogIds.length > 0) {
            logs = logs.filter(log => !lastActionLogIds.includes(log.id));
            saveData();
            lastActionLogIds = [];
            
            undoToast.classList.add('hidden');
            if(undoTimeout) clearTimeout(undoTimeout);
            
            renderStudents();
            if(currentView === 'groups') renderGroups();
            if(currentProfileId && !studentProfileModal.classList.contains('hidden')) renderHistory();
            
            // Make an undo sound
            playSound('negative'); // Just a feedback sound
        }
    };


    // --- Group Management Modal ---
    const openManageGroupModal = (groupId = null) => {
        editingGroupId = groupId;
        const groupModalTitle = document.getElementById('groupModalTitle');
        const deleteGroupBtn = document.getElementById('deleteGroupBtn');

        groupStudentSelectionGrid.innerHTML = '';
        
        let existingStudentIds = [];
        if (groupId) {
            const group = groups.find(g => g.id === groupId);
            groupModalTitle.textContent = '編輯群組';
            groupNameInput.value = group.name;
            existingStudentIds = group.studentIds || [];
            deleteGroupBtn.classList.remove('hidden');
        } else {
            groupModalTitle.textContent = '新增群組';
            groupNameInput.value = '';
            deleteGroupBtn.classList.add('hidden');
        }

        students.forEach(student => {
            const label = document.createElement('label');
            label.className = 'group-student-select-item';
            const isChecked = existingStudentIds.includes(student.id);
            
            label.innerHTML = `
                <input type="checkbox" value="${student.id}" ${isChecked ? 'checked' : ''}>
                <img src="${student.avatarUrl || generateAvatar(student.name, student.avatarStyle)}" class="small-avatar">
                <span>${student.name}</span>
            `;
            groupStudentSelectionGrid.appendChild(label);
        });

        openModal(manageGroupModal);
    };

    document.getElementById('saveGroupBtn').onclick = () => {
        const name = groupNameInput.value.trim();
        if(!name) return alert('請輸入群組名稱');

        const checkboxes = groupStudentSelectionGrid.querySelectorAll('input[type="checkbox"]');
        const selectedIds = Array.from(checkboxes).filter(cb => cb.checked).map(cb => parseInt(cb.value));

        if(selectedIds.length === 0) return alert('請至少選擇一位學生');

        if (editingGroupId) {
            const group = groups.find(g => g.id === editingGroupId);
            group.name = name;
            group.studentIds = selectedIds;
        } else {
            groups.push({
                id: Date.now(),
                name: name,
                studentIds: selectedIds
            });
        }

        saveData();
        renderGroups();
        closeModal(manageGroupModal);
    };

    document.getElementById('deleteGroupBtn').onclick = () => {
        if(confirm('確定要刪除這個群組嗎？（不影響學生個人紀錄）')) {
            groups = groups.filter(g => g.id !== editingGroupId);
            saveData();
            renderGroups();
            closeModal(manageGroupModal);
        }
    };


    // --- Student Editing Logic ---
    const _editNameInput = document.getElementById('editStudentName');
    const _editStyleSelect = document.getElementById('editStudentAvatarStyle');
    const _editAvatarPreview = document.getElementById('editStudentAvatarPreview');
    let _tempAvatarSeed = '';

    editProfileBtn.onclick = () => {
        if(!currentProfileId) return;
        const student = students.find(s => s.id === currentProfileId);
        if(!student) return;

        _editNameInput.value = student.name;
        const currentStyle = student.avatarStyle || 'fun-emoji';
        _editStyleSelect.value = currentStyle;
        _tempAvatarSeed = student.avatarSeed || student.name;
        
        updateEditAvatarPreview();
        
        closeModal(studentProfileModal);
        openModal(editStudentModal);
    };

    const updateEditAvatarPreview = () => {
        const style = _editStyleSelect.value;
        const url = generateAvatar(_tempAvatarSeed, style);
        _editAvatarPreview.src = url;
    };

    _editStyleSelect.onchange = updateEditAvatarPreview;
    
    document.getElementById('randomizeAvatarBtn').onclick = () => {
        _tempAvatarSeed = Math.random().toString(36).substring(7);
        updateEditAvatarPreview();
    };

    document.getElementById('saveEditStudentBtn').onclick = () => {
        const newName = _editNameInput.value.trim();
        if(!newName) return;

        const student = students.find(s => s.id === currentProfileId);
        student.name = newName;
        student.avatarStyle = _editStyleSelect.value;
        student.avatarSeed = _tempAvatarSeed;
        student.avatarUrl = generateAvatar(_tempAvatarSeed, student.avatarStyle); // precompute it

        saveData();
        renderStudents();
        renderReports();
        closeModal(editStudentModal);
    };

    document.getElementById('deleteStudentBtn').onclick = () => {
        if(confirm('警告：這將會永久刪除此學生及其所有的點數紀錄！確定嗎？')) {
            students = students.filter(s => s.id !== currentProfileId);
            logs = logs.filter(l => l.studentId !== currentProfileId);
            groups.forEach(g => {
                g.studentIds = g.studentIds.filter(id => id !== currentProfileId);
            });
            saveData();
            renderStudents();
            closeModal(editStudentModal);
        }
    };


    // --- Settings & Advanced Controls ---
    const enableSoundSetting = document.getElementById('enableSoundSetting');
    if (enableSoundSetting) {
        enableSoundSetting.onchange = (e) => {
            settings.enableSound = e.target.checked;
            saveData();
        };
    }

    fontSizeSelect.onchange = (e) => {
        settings.fontSize = e.target.value;
        applySettings();
        saveData();
    };

    gridColsRange.oninput = (e) => {
        const val = e.target.value;
        settings.columns = parseInt(val);
        gridColsLabel.textContent = val;
        applySettings();
        saveData();
    };

    document.getElementById('resetAllPointsBtn').onclick = () => {
        if(confirm('⚠️ 極限警告 ⚠️\\n確定要將【所有學生】的點數強制歸零嗎？這相當於一個學期的重新開始。\\n(系統會自動寫入負向調整分數，讓目前的總分歸零)')) {
            const sure = confirm('請再次確認！這個動作不可復原！');
            if(sure) {
                const now = Date.now();
                students.forEach(student => {
                    let absoluteTotal = 0;
                    logs.forEach(log => {
                        if (log.studentId === student.id) absoluteTotal += log.points;
                    });
                    
                    if (absoluteTotal !== 0) {
                        logs.push({
                            id: now + student.id,
                            studentId: student.id,
                            itemId: null,
                            label: '學期重置歸零',
                            points: -absoluteTotal,
                            timestamp: now,
                            ignoreTotal: false
                        });
                    }
                });
                saveData();
                renderStudents();
                if(currentView === 'groups') renderGroups();
                alert('所有學生點數已歸零！');
                closeModal(settingsModal);
            }
        }
    };


    // All that rest remains the same (Reports, Items, Initialization)
    // --- Reports Logic --- (Simplified for brevity, refer to old one)
    const reportsList = document.getElementById('reportsList');
    const timeRangeFilter = document.getElementById('timeRangeFilter');
    const customDateContainer = document.getElementById('customDateContainer');
    const startDateFilter = document.getElementById('startDateFilter');
    const endDateFilter = document.getElementById('endDateFilter');

    const getReportsTimeRange = () => {
        const val = timeRangeFilter.value;
        if (val === 'all') return null;

        const start = new Date();
        const end = new Date();
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);

        if (val === 'today') {
            return { start: start.getTime(), end: end.getTime() };
        } else if (val === 'week') {
            const day = start.getDay() || 7;
            start.setDate(start.getDate() - day + 1);
            end.setDate(start.getDate() + 6);
            return { start: start.getTime(), end: end.getTime() };
        } else if (val === 'month') {
            start.setDate(1);
            end.setMonth(end.getMonth() + 1);
            end.setDate(0);
            return { start: start.getTime(), end: end.getTime() };
        } else if (val === 'custom') {
            if (startDateFilter.value && endDateFilter.value) {
                const s = new Date(startDateFilter.value);
                const e = new Date(endDateFilter.value);
                s.setHours(0, 0, 0, 0);
                e.setHours(23, 59, 59, 999);
                return { start: s.getTime(), end: e.getTime() };
            }
        }
        return null;
    };

    const isItemIgnored = (log) => {
        if (log.ignoreTotal !== undefined) return log.ignoreTotal;
        if (!log.itemId) return false;
        const allItems = [...pointItems.positive, ...pointItems.needsWork];
        const itemDef = allItems.find(i => i.id === log.itemId);
        return itemDef ? itemDef.ignoreTotal : false;
    };

    window.renderReports = () => {
        reportsList.innerHTML = '';
        const range = getReportsTimeRange();

        let reportData = students.map(student => {
            let total = 0;
            logs.forEach(log => {
                if (log.studentId === student.id) {
                    if (range && (log.timestamp < range.start || log.timestamp > range.end)) return;
                    if (!isItemIgnored(log)) {
                        total += log.points;
                    }
                }
            });
            return { ...student, calculatedPoints: total };
        });

        if (currentSort === 'name') reportData.sort((a, b) => a.name.localeCompare(b.name, 'zh-TW'));
        else reportData.sort((a, b) => b.calculatedPoints - a.calculatedPoints);

        if (reportData.length === 0) {
            reportsList.innerHTML = '<li class="empty-state">沒有學生資料</li>';
        } else {
            reportData.forEach((data, index) => {
                const li = document.createElement('li');
                li.className = 'report-item';
                li.style.cursor = 'pointer';
                
                if (currentReportFilterStudentId === data.id) {
                    li.style.border = '2px solid var(--primary-color)';
                    li.style.background = '#eff6ff';
                }

                li.onclick = () => {
                    currentReportFilterStudentId = data.id;
                    currentReportActivityPage = 1;
                    document.getElementById('reportActivityTitle').textContent = data.name + ' 的紀錄';
                    document.getElementById('resetReportFilterBtn').classList.remove('hidden');
                    window.renderReports();
                };
                
                let valClass = '';
                if (data.calculatedPoints > 0) valClass = 'positive-val';
                if (data.calculatedPoints < 0) valClass = 'negative-val';

                li.innerHTML = `
                    <div class="report-item-left">
                        <span class="report-rank">#${index + 1}</span>
                        <img src="${data.avatarUrl || generateAvatar(data.name, data.avatarStyle)}" class="report-avatar">
                        <span class="report-name">${data.name}</span>
                    </div>
                    <div class="report-item-right ${valClass}">
                        ${data.calculatedPoints > 0 ? '+' + data.calculatedPoints : data.calculatedPoints}
                    </div>
                `;
                reportsList.appendChild(li);
            });
        }
        
        renderReportActivity();
    };

    let currentReportActivityPage = 1;
    let currentReportFilterStudentId = null;
    const itemsPerPage = 20;

    const renderReportActivity = () => {
        const range = getReportsTimeRange();
        const activityList = document.getElementById('reportActivityList');
        activityList.innerHTML = '';

        let filteredLogs = logs.filter(log => {
            if (range && (log.timestamp < range.start || log.timestamp > range.end)) return false;
            if (currentReportFilterStudentId && log.studentId !== currentReportFilterStudentId) return false;
            return true;
        });

        filteredLogs.sort((a,b) => b.timestamp - a.timestamp);

        const totalPages = Math.max(1, Math.ceil(filteredLogs.length / itemsPerPage));
        if (currentReportActivityPage > totalPages) currentReportActivityPage = totalPages;

        document.getElementById('reportPageInfo').textContent = `頁數 ${currentReportActivityPage} / ${totalPages}`;
        document.getElementById('reportPrevPageBtn').disabled = currentReportActivityPage === 1;
        document.getElementById('reportNextPageBtn').disabled = currentReportActivityPage === totalPages;

        const startIdx = (currentReportActivityPage - 1) * itemsPerPage;
        const pageLogs = filteredLogs.slice(startIdx, startIdx + itemsPerPage);

        if (pageLogs.length === 0) {
            activityList.innerHTML = '<li class="empty-state">沒有找到紀錄</li>';
            return;
        }

        pageLogs.forEach(log => {
            const dt = new Date(log.timestamp);
            const student = students.find(s => s.id === log.studentId);
            const isIgnored = isItemIgnored(log);
            const valClass = log.points > 0 ? 'positive-val' : 'negative-val';
            
            const li = document.createElement('li');
            li.innerHTML = `
                <div class="history-item-left">
                    <span class="history-date">${dt.toLocaleString('zh-TW', { month:'short', day:'numeric', hour:'2-digit', minute:'2-digit' })} • ${student ? student.name : '未知'}</span>
                    <span class="history-label">${log.label} ${isIgnored ? '<span class="ignore-badge">不計入報表</span>' : ''}</span>
                </div>
                <div class="history-item-right ${valClass}">
                    ${log.points > 0 ? '+' + log.points : log.points}
                    <button class="delete-log-btn" title="刪除紀錄" onclick="window.deleteLog(${log.id})">🗑️</button>
                </div>
            `;
            activityList.appendChild(li);
        });

        // Update Pie Chart
        renderPieChart(filteredLogs);
    };

    const renderPieChart = (currentLogs) => {
        const pieContainer = document.getElementById('reportPieChart');
        const legendContainer = document.getElementById('reportPieLegend');
        pieContainer.innerHTML = '';
        legendContainer.innerHTML = '';

        if (currentLogs.length === 0) {
            pieContainer.style.background = '#e2e8f0';
            legendContainer.innerHTML = '<div class="legend-item">目前無紀錄</div>';
            return;
        }

        // Aggregate by label
        const stats = {};
        let totalCount = 0;
        currentLogs.forEach(log => {
            stats[log.label] = (stats[log.label] || 0) + 1;
            totalCount++;
        });

        const sortedLabels = Object.keys(stats).sort((a,b) => stats[b] - stats[a]);
        const colors = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#06b6d4', '#8b5cf6', '#ec4899', '#f97316'];
        
        let cumulativePercent = 0;
        const gradientParts = [];
        
        sortedLabels.forEach((label, i) => {
            const count = stats[label];
            const percent = (count / totalCount) * 100;
            const color = colors[i % colors.length];
            
            gradientParts.push(`${color} ${cumulativePercent}% ${cumulativePercent + percent}%`);
            cumulativePercent += percent;

            const item = document.createElement('div');
            item.className = 'legend-item';
            item.innerHTML = `
                <div class="legend-color" style="background: ${color}"></div>
                <span>${label}: ${count} (${Math.round(percent)}%)</span>
            `;
            legendContainer.appendChild(item);
        });

        pieContainer.style.background = `conic-gradient(${gradientParts.join(', ')})`;
    };

    document.getElementById('exportCsvBtn').onclick = () => {
        const range = getReportsTimeRange();
        let filteredLogs = logs.filter(log => {
            if (range && (log.timestamp < range.start || log.timestamp > range.end)) return false;
            if (currentReportFilterStudentId && log.studentId !== currentReportFilterStudentId) return false;
            return true;
        });

        if (filteredLogs.length === 0) return alert('沒有資料可以匯出');

        // Identify all behavior labels in the system (or just those in the current logs)
        // User wants "Behavior Name" as headers
        const uniqueLabels = Array.from(new Set(filteredLogs.map(l => l.label))).sort();
        
        let csvContent = "\ufeff" + "姓名," + uniqueLabels.join(",") + "\n";
        
        // Pivot students
        const targetStudents = currentReportFilterStudentId 
            ? students.filter(s => s.id === currentReportFilterStudentId)
            : students;

        targetStudents.forEach(student => {
            const studentLogs = filteredLogs.filter(l => l.studentId === student.id);
            if (studentLogs.length === 0 && !currentReportFilterStudentId) return;

            let row = [`"${student.name}"`];
            uniqueLabels.forEach(lbl => {
                const sum = studentLogs.filter(l => l.label === lbl).reduce((acc, curr) => acc + curr.points, 0);
                row.push(sum);
            });
            csvContent += row.join(",") + "\n";
        });

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `班級報表統計_${new Date().toLocaleDateString()}.csv`;
        link.click();
    };

    document.getElementById('copyPointsBtn').onclick = () => {
        const range = getReportsTimeRange();
        let reportData = students.map(student => {
            let total = 0;
            logs.forEach(log => {
                if (log.studentId === student.id) {
                    if (range && (log.timestamp < range.start || log.timestamp > range.end)) return;
                    if (!isItemIgnored(log)) total += log.points;
                }
            });
            return total;
        });

        reportData.sort((a,b) => b - a);
        let text = reportData.join('\n');

        navigator.clipboard.writeText(text).then(() => {
            alert('點數列表（僅數字）已複製到剪貼簿');
        });
    };

    document.getElementById('reportPrevPageBtn').onclick = () => {
        if(currentReportActivityPage > 1) { currentReportActivityPage--; renderReportActivity(); }
    };
    document.getElementById('reportNextPageBtn').onclick = () => {
        currentReportActivityPage++; renderReportActivity();
    };

    document.getElementById('resetReportFilterBtn').onclick = () => {
        currentReportFilterStudentId = null;
        currentReportActivityPage = 1;
        document.getElementById('reportActivityTitle').textContent = '全班最近紀錄';
        document.getElementById('resetReportFilterBtn').classList.add('hidden');
        window.renderReports();
    };

    const onReportsFilterChange = () => {
        if (timeRangeFilter.value === 'custom') customDateContainer.classList.remove('hidden');
        else customDateContainer.classList.add('hidden');
        window.renderReports();
    };
    timeRangeFilter.addEventListener('change', onReportsFilterChange);
    startDateFilter.addEventListener('change', onReportsFilterChange);
    endDateFilter.addEventListener('change', onReportsFilterChange);

    document.querySelectorAll('.sort-btn').forEach(btn => {
        btn.onclick = () => {
            document.querySelectorAll('.sort-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentSort = btn.dataset.sort;
            window.renderReports();
        };
    });


    // --- Other Profile History ---
    const renderHistory = () => {
        if (!currentProfileId) return;
        studentHistoryList.innerHTML = '';
        const studentLogs = logs.filter(log => log.studentId === currentProfileId)
                                .sort((a, b) => b.timestamp - a.timestamp);

        if (studentLogs.length === 0) {
            studentHistoryList.innerHTML = '<li class="empty-state">此學生沒有任何紀錄</li>';
        } else {
            studentLogs.forEach(log => {
                const li = document.createElement('li');
                const dt = new Date(log.timestamp);
                const isIgnored = isItemIgnored(log);
                const valClass = log.points > 0 ? 'positive-val' : 'negative-val';
                
                li.innerHTML = `
                    <div class="history-item-left">
                        <span class="history-date">${dt.toLocaleString('zh-TW', { month:'short', day:'numeric', hour:'2-digit', minute:'2-digit' })}</span>
                        <span class="history-label">${log.label} ${isIgnored ? '<span class="ignore-badge" title="未計入報表總分">不計入報表</span>' : ''}</span>
                    </div>
                    <div class="history-item-right ${valClass}">
                        ${log.points > 0 ? '+' + log.points : log.points}
                        <button class="delete-log-btn" onclick="deleteLog(${log.id})">🗑️</button>
                    </div>
                `;
                studentHistoryList.appendChild(li);
            });
        }
    };


    // --- Delete individual log entry ---
    window.deleteLog = (logId) => {
        if (!confirm('確定刪除這筆紀錄嗎？')) return;
        logs = logs.filter(l => l.id != logId);
        saveData();
        renderHistory();
        renderStudents();
        if (currentView === 'groups') renderGroups();
        if (!reportsModal.classList.contains('hidden')) renderReportActivity();
    };

    // --- Render Items ---
    const renderPointItems = () => {
        positiveItemsGrid.innerHTML = '';
        pointItems.positive.forEach(item => {
            const btn = document.createElement('button');
            btn.className = 'point-item-btn positive';
            btn.innerHTML = `
                <div class="point-icon">${item.icon}</div>
                <div class="point-label">${item.label}</div>
                <div class="point-value">+${item.value}</div>
                ${item.ignoreTotal ? '<div class="ignore-badge" style="position:absolute; top:4px; right:4px">不列入報表</div>' : ''}
            `;
            btn.onclick = () => awardPoints(item.id, item.label, item.value);
            positiveItemsGrid.appendChild(btn);
        });

        needsWorkItemsGrid.innerHTML = '';
        pointItems.needsWork.forEach(item => {
            const btn = document.createElement('button');
            btn.className = 'point-item-btn negative';
            btn.innerHTML = `
                <div class="point-icon">${item.icon}</div>
                <div class="point-label">${item.label}</div>
                <div class="point-value">${item.value}</div>
                ${item.ignoreTotal ? '<div class="ignore-badge" style="position:absolute; top:4px; right:4px">不列入報表</div>' : ''}
            `;
            btn.onclick = () => awardPoints(item.id, item.label, item.value);
            needsWorkItemsGrid.appendChild(btn);
        });

        // Settings Modal Items rendering
        settingsPositiveList.innerHTML = '';
        pointItems.positive.forEach(item => {
            const li = document.createElement('li');
            li.innerHTML = `
                <div class="item-info">
                    <span>${item.icon} ${item.label} ${item.ignoreTotal ? '<span class="ignore-badge">不計入報表</span>' : ''}</span>
                    <span class="item-value">+${item.value}</span>
                </div>
                <button class="remove-item-btn" onclick="removePointItem('positive', ${item.id})">×</button>
            `;
            settingsPositiveList.appendChild(li);
        });

        settingsNeedsWorkList.innerHTML = '';
        pointItems.needsWork.forEach(item => {
            const li = document.createElement('li');
            li.innerHTML = `
                <div class="item-info">
                    <span>${item.icon} ${item.label}  ${item.ignoreTotal ? '<span class="ignore-badge">不計入報表</span>' : ''}</span>
                    <span class="item-value">${item.value}</span>
                </div>
                <button class="remove-item-btn" onclick="removePointItem('needsWork', ${item.id})">×</button>
            `;
            settingsNeedsWorkList.appendChild(li);
        });
    };

    window.removePointItem = (category, id) => {
        if (!confirm('確定要刪除這個行為項目嗎？')) return;
        pointItems[category] = pointItems[category].filter(item => item.id !== id);
        saveData();
        renderPointItems();
    };

    const copyBehaviors = (fromId, toId) => {
        if (!fromId || !toId) return;
        const sourceData = JSON.parse(localStorage.getItem(`cdData_${fromId}_items`));
        if (!sourceData) return alert('找不到來源班級的設定');

        if (confirm(`確定要從「${classes.find(c => c.id === fromId)?.name}」複製行為項目到目前班級嗎？這將覆蓋現有設定。`)) {
            pointItems = JSON.parse(JSON.stringify(sourceData));
            saveData();
            renderPointItems();
            alert('行為項目複製完成！');
        }
    };
    window.copyBehaviors = copyBehaviors;

    document.getElementById('addPositiveBtn').onclick = () => addNewPointItem('positive');
    document.getElementById('addNeedsWorkBtn').onclick = () => addNewPointItem('needsWork');

    const addNewPointItem = (category) => {
        const isPos = category === 'positive';
        const labelInput = isPos ? newPositiveLabel : newNeedsWorkLabel;
        const valueInput = isPos ? newPositiveValue : newNeedsWorkValue;
        const ignoreCheck = isPos ? newPositiveIgnore : newNeedsWorkIgnore;
        
        const label = labelInput.value.trim();
        let value = parseInt(valueInput.value);
        if(!label || isNaN(value)) return;

        if(!isPos && value > 0) value = -value;
        const icon = isPos ? '⭐' : '🚩';

        pointItems[category].push({
            id: Date.now(),
            label,
            value,
            icon,
            ignoreTotal: ignoreCheck.checked
        });
        saveData();
        renderPointItems();

        labelInput.value = '';
        valueInput.value = isPos ? '1' : '-1';
        ignoreCheck.checked = false;
    };

    // Award sub-tab switching (positive, needs-work, custom)
    document.querySelectorAll('.sub-tab-btn').forEach(btn => {
        btn.onclick = () => {
            const tab = btn.dataset.awardTab;
            document.querySelectorAll('.sub-tab-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            // Map tab name to grid element
            const awardContentMap = {
                'positive': 'positiveItems',
                'needs-work': 'needsWorkItems',
                'custom': 'customAwardArea'
            };

            document.querySelectorAll('.award-content').forEach(c => c.classList.remove('active'));
            const targetId = awardContentMap[tab];
            if (targetId) document.getElementById(targetId)?.classList.add('active');
        };
    });

    const addStudent = () => {
        const newStudentNameInput = document.getElementById('newStudentName');
        const inputStr = newStudentNameInput.value.trim();
        if(!inputStr) return;
        
        const names = inputStr.split('\n').map(n => n.trim()).filter(n => n.length > 0);
        
        names.forEach((name, index) => {
            const newStudent = { id: Date.now() + index, name: name, avatarStyle: 'fun-emoji' };
            students.push(newStudent);
        });

        saveData();
        renderStudents();
        closeModal(addStudentModal);
        newStudentNameInput.value = '';
    };
    document.getElementById('saveStudentBtn').onclick = addStudent;


    // --- Global Base Events ---

    // --- Settings Confirm / Cancel ---
    let _settingsSnapshot = null;

    // When opening settings, save a snapshot to restore on Cancel / X
    const openSettingsModal = () => {
        _settingsSnapshot = JSON.stringify(settings);
        openModal(settingsModal);
        applySettings();
        renderPointItems(); // Corrected name
        // Reset tabs to first
        switchSettingsTab('display');
    };

    document.getElementById('settingsConfirmBtn').onclick = () => {
        _settingsSnapshot = null; // discard old snapshot
        saveData();
        closeModal(settingsModal);
    };

    document.getElementById('settingsCancelBtn').onclick = () => {
        if (_settingsSnapshot) {
            Object.assign(settings, JSON.parse(_settingsSnapshot));
            applySettings();
            saveData(true); // Don't mark as dirty when reverting
        }
        closeModal(settingsModal);
    };

    document.querySelectorAll('.settings-close').forEach(btn => {
        btn.onclick = () => {
            // X = cancel, restore snapshot
            if (_settingsSnapshot) {
                Object.assign(settings, JSON.parse(_settingsSnapshot));
                applySettings();
                saveData(true); // Don't mark as dirty when reverting
            }
            closeModal(settingsModal);
        };
    });

    toggleMultiSelectBtn.onclick = toggleMultiSelectMode;
    cancelMultiBtn.onclick = toggleMultiSelectMode;
    multiAwardBtn.onclick = () => {
        if(selectedStudentIds.size === 0) return alert('請先選擇學生！');
        openAwardModal(Array.from(selectedStudentIds), `給予 ${selectedStudentIds.size} 位學生點數`, null);
    };

    viewTabBtns.forEach(btn => {
        btn.onclick = () => switchMainView(btn.dataset.view);
    });

    const createPointAnimation = (points, batchMultiplier = 1) => {
        for(let i=0; i < Math.min(batchMultiplier, 5); i++) {
            setTimeout(() => {
                const animEl = document.createElement('div');
                animEl.className = 'point-animation';
                animEl.textContent = points > 0 ? `+${points}` : points;
                animEl.style.color = points > 0 ? 'var(--positive-color)' : 'var(--negative-color)';
                
                animEl.style.left = (50 + (Math.random()*10 - 5)) + '%';
                animEl.style.top = (40 + (Math.random()*10 - 5)) + '%';
                animEl.style.transform = 'translate(-50%, -50%)';
                
                document.body.appendChild(animEl);
                setTimeout(() => { animEl.remove(); }, 1000);
            }, i * 100);
        }
    };

    // --- Settings Tabs ---
    const switchSettingsTab = (tabName) => {
        settingsTabBtns.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.settingsTab === tabName);
        });
        settingsTabContents.forEach(content => {
            content.classList.toggle('active', content.id === `settings${tabName.charAt(0).toUpperCase() + tabName.slice(1)}Tab`);
        });
    };
    settingsTabBtns.forEach(btn => {
        btn.onclick = () => switchSettingsTab(btn.dataset.settingsTab);
    });

    // --- Group Detail Modal ---
    const openGroupDetailModal = (group) => {
        groupDetailTitle.textContent = group.name;
        groupMemberPointsList.innerHTML = '';
        
        group.studentIds.forEach(sid => {
            const student = students.find(s => s.id === sid);
            if(!student) return;
            
            let total = 0;
            logs.forEach(l => { if(l.studentId === sid) total += l.points; });
            
            const card = document.createElement('div');
            card.className = 'group-member-card';
            const ptClass = total > 0 ? 'positive-total' : (total < 0 ? 'negative-total' : '');
            card.innerHTML = `
                <img src="${student.avatarUrl || generateAvatar(student.name, student.avatarStyle)}" class="small-avatar">
                <div class="gc-name">${student.name}</div>
                <div class="gc-pts ${ptClass}">${total > 0 ? '+' + total : total}</div>
            `;
            groupMemberPointsList.appendChild(card);
        });

        editGroupDetailBtn.onclick = () => {
            closeModal(groupDetailModal);
            openManageGroupModal(group.id);
        };
        groupAwardPointsBtn.onclick = () => {
            closeModal(groupDetailModal);
            openAwardModal(group.studentIds, `群組：${group.name}`, null);
        };

        openModal(groupDetailModal);
    };

    // --- Multi-select Select All ---
    selectAllBtn.onclick = () => {
        if(selectedStudentIds.size === students.length) {
            selectedStudentIds.clear();
        } else {
            students.forEach(s => selectedStudentIds.add(s.id));
        }
        multiSelectCount.textContent = `已選擇 ${selectedStudentIds.size} 位學生`;
        renderStudents();
    };

    // --- Range Slider Handlers (live preview, save on Confirm) ---
    cardHeightRange.oninput = (e) => {
        settings.studentCardHeight = parseInt(e.target.value);
        cardHeightLabel.textContent = settings.studentCardHeight;
        applySettings();
    };
    groupHeightRange.oninput = (e) => {
        settings.groupCardHeight = parseInt(e.target.value);
        groupHeightLabel.textContent = settings.groupCardHeight;
        applySettings();
        saveData();
    };

    // Modal Switchers
    const openModal = (modal) => modal.classList.remove('hidden');
    const closeModal = (modal) => modal.classList.add('hidden');

    const switchProfileTab = (tabName) => {
        document.querySelectorAll('#studentProfileModal .main-tabs .tab-btn').forEach(btn => {
            if(btn.dataset.profileTab === tabName) btn.classList.add('active');
            else btn.classList.remove('active');
        });
        document.querySelectorAll('#studentProfileModal .profile-tab-content').forEach(content => {
            content.classList.remove('active');
        });

        if (tabName === 'award') document.getElementById('profileAwardTab').classList.add('active');
        else {
            document.getElementById('profileHistoryTab').classList.add('active');
            renderHistory();
        }
    };
    document.querySelectorAll('#studentProfileModal .main-tabs .tab-btn').forEach(btn => {
        btn.onclick = () => switchProfileTab(btn.dataset.profileTab);
    });

    const switchAwardTab = (tabName) => {
        document.querySelectorAll('#studentProfileModal .sub-tabs .sub-tab-btn').forEach(btn => {
            if(btn.dataset.awardTab === tabName) btn.classList.add('active');
            else btn.classList.remove('active');
        });
        document.querySelectorAll('#studentProfileModal .award-content').forEach(content => content.classList.remove('active'));
        
        if (tabName === 'positive') document.getElementById('positiveItems').classList.add('active');
        else if (tabName === 'needs-work') document.getElementById('needsWorkItems').classList.add('active');
        else if (tabName === 'custom') document.getElementById('customAwardArea').classList.add('active');
    };
    document.querySelectorAll('#studentProfileModal .sub-tabs .sub-tab-btn').forEach(btn => {
        btn.onclick = () => switchAwardTab(btn.dataset.awardTab);
    });

    document.getElementById('groupColsRange').oninput = (e) => {
        settings.groupColumns = parseInt(e.target.value) || 2;
        document.getElementById('groupColsLabel').textContent = settings.groupColumns;
        document.documentElement.style.setProperty('--group-grid-cols', settings.groupColumns);
        document.documentElement.style.setProperty('--mobile-group-cols', Math.min(settings.groupColumns, 4));
        renderGroups();
    };

    document.getElementById('autoBackupInterval').onchange = (e) => {
        settings.autoBackupInterval = parseInt(e.target.value) || 0;
        initAutoBackup();
    };

    // Top Level Buttons
    document.getElementById('addStudentBtn').onclick = () => openModal(addStudentModal);
    document.getElementById('settingsBtn').onclick = openSettingsModal;
    document.getElementById('reportsBtn').onclick = () => { window.renderReports(); openModal(reportsModal); };

    // --- Class Management Logic ---
    const renderClassSelector = () => {
        classSelect.innerHTML = '';
        copyFromClassSelect.innerHTML = '<option value="">不複製 (建立全新空白班級)</option>';
        document.getElementById('syncFromClassSelect').innerHTML = '<option value="">請選擇來源班級...</option>';
        classList.innerHTML = '';

        classes.forEach(c => {
            // Only show non-archived in the main selector
            if (!c.isArchived) {
                const opt1 = document.createElement('option');
                opt1.value = c.id;
                opt1.textContent = c.name;
                if(c.id === currentClassId) opt1.selected = true;
                classSelect.appendChild(opt1);
            }

            const opt2 = document.createElement('option');
            opt2.value = c.id;
            opt2.textContent = c.name + (c.isArchived ? ' (已封存)' : '');
            copyFromClassSelect.appendChild(opt2);

            // Populate syncFromClassSelect (excluding current class)
            if (c.id !== currentClassId) {
                const opt3 = document.createElement('option');
                opt3.value = c.id;
                opt3.textContent = c.name;
                document.getElementById('syncFromClassSelect').appendChild(opt3);
            }

            const li = document.createElement('li');
            li.innerHTML = `
                <div class="item-info">
                    <span style="font-weight: 600;">${c.name}</span>
                    ${c.id === currentClassId ? '<span class="highlight-badge">目前班級</span>' : ''}
                    ${c.isArchived ? '<span class="archived-label">已封存</span>' : ''}
                </div>
                <div style="display:flex; gap:0.5rem;">
                    <button class="archive-btn small-btn secondary-btn">${c.isArchived ? '📂 解封存' : '📁 封存'}</button>
                    ${classes.length > 1 ? '<button class="remove-item-btn" title="刪除班級">🗑️</button>' : ''}
                </div>
            `;
            
            li.querySelector('.archive-btn').onclick = () => {
                c.isArchived = !c.isArchived;
                saveData();
                renderClassSelector();
            };

            const delBtn = li.querySelector('.remove-item-btn');
            if(delBtn) delBtn.onclick = () => deleteClass(c.id);
            
            classList.appendChild(li);
        });
    };

    document.getElementById('confirmSyncBehaviorsBtn').onclick = () => {
        const fromId = document.getElementById('syncFromClassSelect').value;
        if(!fromId) return alert('請選擇來源班級！');
        window.copyBehaviors(fromId, currentClassId);
    };

    const switchClass = (classId) => {
        currentClassId = classId;
        localStorage.setItem('cdData_currentClassId', currentClassId);
        loadClassData();
        
        applySettings();
        renderClassSelector();
        selectedStudentIds.clear();
        if(isMultiSelectMode) toggleMultiSelectMode();
        switchMainView('students');
        renderStudents(); // Missing call restored
        renderPointItems();
        if(!reportsModal.classList.contains('hidden')) window.renderReports();
    };

    classSelect.onchange = (e) => switchClass(e.target.value);

    const deleteClass = (classId) => {
        if(classes.length <= 1) return alert('必須保留至少一個班級！');
        if(confirm('警告：確定要永久刪除這個班級及其所有的學生與紀錄嗎？此動作無法復原！')) {
            classes = classes.filter(c => c.id !== classId);
            localStorage.removeItem(`cdData_${classId}_students`);
            localStorage.removeItem(`cdData_${classId}_groups`);
            localStorage.removeItem(`cdData_${classId}_logs`);
            localStorage.removeItem(`cdData_${classId}_items`);
            localStorage.removeItem(`cdData_${classId}_settings`);
            
            if(currentClassId === classId) {
                switchClass(classes[0].id);
            } else {
                saveData();
                renderClassSelector();
            }
        }
    };

    manageClassesBtn.onclick = () => {
        renderClassSelector();
        newClassNameInput.value = '';
        openModal(manageClassesModal);
    };

    createClassBtn.onclick = () => {
        const name = newClassNameInput.value.trim();
        if(!name) return alert('請輸入班級名稱！');
        
        const newClassId = 'class_' + Date.now();
        classes.push({ id: newClassId, name });
        
        let newStudents = [];
        let newGroups = [];
        let newItems = JSON.parse(JSON.stringify(defaultItems));
        let newSettings = { fontSize: 'medium', columns: 5, enableSound: true };

        const copyFromId = copyFromClassSelect.value;
        if (copyFromId) {
            if (copyItemsCheckbox.checked) {
                const srcItems = localStorage.getItem(`cdData_${copyFromId}_items`);
                if(srcItems) newItems = JSON.parse(srcItems);
                
                const srcSettings = localStorage.getItem(`cdData_${copyFromId}_settings`);
                if(srcSettings) newSettings = JSON.parse(srcSettings);
            }
            if (copyStudentsCheckbox.checked) {
                const srcStudents = localStorage.getItem(`cdData_${copyFromId}_students`);
                if(srcStudents) {
                    const parsedStudents = JSON.parse(srcStudents);
                    const idMap = {};
                    newStudents = parsedStudents.map(s => {
                        const newId = Date.now() + Math.random();
                        idMap[s.id] = newId;
                        return { ...s, id: newId };
                    });

                    const srcGroups = localStorage.getItem(`cdData_${copyFromId}_groups`);
                    if (srcGroups) {
                        const parsedGroups = JSON.parse(srcGroups);
                        newGroups = parsedGroups.map(g => {
                            return {
                                id: Date.now() + Math.random(),
                                name: g.name,
                                studentIds: g.studentIds.map(sid => idMap[sid]).filter(sid => sid)
                            };
                        });
                    }
                }
            }
        }
        
        localStorage.setItem(`cdData_${newClassId}_students`, JSON.stringify(newStudents));
        localStorage.setItem(`cdData_${newClassId}_groups`, JSON.stringify(newGroups));
        localStorage.setItem(`cdData_${newClassId}_items`, JSON.stringify(newItems));
        localStorage.setItem(`cdData_${newClassId}_settings`, JSON.stringify(newSettings));
        localStorage.setItem(`cdData_${newClassId}_logs`, '[]'); 
        
        saveData(); 
        switchClass(newClassId);
        closeModal(manageClassesModal);
    };

    document.querySelectorAll('.group-detail-close').forEach(btn => btn.onclick = () => closeModal(groupDetailModal));
    document.querySelectorAll('.classes-close').forEach(btn => btn.onclick = () => closeModal(manageClassesModal));

    // Custom Award Logic
    const customAwardLabel = document.getElementById('customAwardLabel');
    const customAwardValue = document.getElementById('customAwardValue');
    const customAwardIgnore = document.getElementById('customAwardIgnore');
    const saveCustomAwardBtn = document.getElementById('saveCustomAwardBtn');

    saveCustomAwardBtn.onclick = () => {
        const label = customAwardLabel.value.trim();
        const value = parseInt(customAwardValue.value);
        if(!label || isNaN(value)) return alert('請輸入完整原因與點數');
        
        const isIgnored = customAwardIgnore.checked;
        awardPoints(null, label, value, isIgnored); // Pass null as itemId for custom
        
        customAwardLabel.value = '';
        customAwardValue.value = '1';
    };

    // --- Cloud & Data Management Logic ---

    const getFullBackupData = () => {
        const backup = {};
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key.startsWith('cdData_')) {
                const rawVal = localStorage.getItem(key);
                let val;
                try {
                    val = JSON.parse(rawVal);
                } catch(e) {
                    val = rawVal; // Keep as string (e.g. currentClassId)
                }

                // Privacy: Exclude binId and apiKey from ALL settings objects in backup
                if (key.includes('_settings') && typeof val === 'object') {
                    const sCopy = { ...val };
                    delete sCopy.cloudBinId;
                    delete sCopy.cloudApiKey;
                    backup[key] = sCopy;
                } else {
                    backup[key] = val;
                }
            }
        }
        return backup;
    };

    const restoreFromBackup = (data) => {
        if (!data || typeof data !== 'object') return alert('無效的備份資料');
        
        // Before overwriting, keep the current cloud settings if they exist in the new data
        // (Though usually we want to keep the LOCAL ones to avoid losing access)
        const currentBinId = settings.cloudBinId;
        const currentApiKey = settings.cloudApiKey;

        Object.keys(data).forEach(key => {
            if (key.startsWith('cdData_')) {
                localStorage.setItem(key, JSON.stringify(data[key]));
            }
        });

        // Restore cloud keys to current class settings to ensure we don't lose access after sync
        const newSettings = JSON.parse(localStorage.getItem(`cdData_${currentClassId}_settings`)) || {};
        newSettings.cloudBinId = currentBinId;
        newSettings.cloudApiKey = currentApiKey;
        localStorage.setItem(`cdData_${currentClassId}_settings`, JSON.stringify(newSettings));

        alert('資料導入成功！即將重新載入頁面...');
        location.reload();
    };

    // Cloud Actions
    const cloudUploadBtn = document.getElementById('cloudUploadBtn');
    const cloudDownloadBtn = document.getElementById('cloudDownloadBtn');
    const resetCloudBinId = document.getElementById('resetCloudBinId');
    const resetCloudApiKey = document.getElementById('resetCloudApiKey');

    resetCloudBinId.onclick = () => {
        if(confirm('確定要清除 Bin ID 嗎？')) {
            settings.cloudBinId = '';
            saveData();
            applySettings();
        }
    };
    resetCloudApiKey.onclick = () => {
        if(confirm('確定要清除存取金鑰嗎？')) {
            settings.cloudApiKey = '';
            saveData();
            applySettings();
        }
    };

    document.getElementById('cloudBinId').onchange = (e) => {
        settings.cloudBinId = e.target.value.trim();
        saveData();
    };
    document.getElementById('cloudApiKey').onchange = (e) => {
        settings.cloudApiKey = e.target.value.trim();
        saveData();
    };

    const performCloudUpload = async (isAuto = false) => {
        const binId = settings.cloudBinId;
        const apiKey = settings.cloudApiKey;
        if (!binId || !apiKey) {
            if(!isAuto) alert('請先設定 Bin ID 與存取金鑰！');
            return;
        }

        if (!isAuto && !confirm('確定要將本地資料同步至雲端嗎？（這將覆蓋雲端現有資料）')) return;

        const isUpstash = binId.includes('upstash.io');
        const data = getFullBackupData();
        
        try {
            if(!isAuto) {
                cloudUploadBtn.disabled = true;
                cloudUploadBtn.textContent = '⏳ 上傳中...';
            }
            
            let response;
            if (isUpstash) {
                response = await fetch(binId, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${apiKey}` },
                    body: JSON.stringify(['SET', 'classKudox_backup', JSON.stringify(data)])
                });
            } else {
                const url = binId.startsWith('http') ? binId : `https://api.jsonbin.io/v3/b/${binId}`;
                response = await fetch(url, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Access-Key': apiKey
                    },
                    body: JSON.stringify(data)
                });
            }

            if (response.ok) {
                isDirty = 3; // Success
                updateSyncStatus();
                if(!isAuto) alert('雲端備份成功！');
            } else {
                throw new Error(await response.text());
            }
        } catch (err) {
            isDirty = 2; // Error
            updateSyncStatus();
            if(!isAuto) alert('上傳失敗：' + err.message);
            else console.error("Auto backup failed:", err);
        } finally {
            if(!isAuto) {
                cloudUploadBtn.disabled = false;
                cloudUploadBtn.textContent = '📤 上傳至雲端';
            }
        }
    };

    cloudUploadBtn.onclick = () => performCloudUpload(false);

    cloudDownloadBtn.onclick = async () => {
        const binId = settings.cloudBinId;
        const apiKey = settings.cloudApiKey;
        if (!binId || !apiKey) return alert('請先設定 Bin ID 與存取金鑰！');

        if (!confirm('⚠️ 警告：從雲端下載將【完全覆蓋】目前的本地資料且無法復原！確定要下載嗎？')) return;

        const isUpstash = binId.includes('upstash.io');

        try {
            cloudDownloadBtn.disabled = true;
            cloudDownloadBtn.textContent = '⏳ 下載中...';

            let response;
            if (isUpstash) {
                response = await fetch(`${binId}/GET/classKudox_backup`, {
                    headers: { 'Authorization': `Bearer ${apiKey}` }
                });
            } else {
                const url = binId.startsWith('http') ? binId : `https://api.jsonbin.io/v3/b/${binId}/latest`;
                response = await fetch(url, {
                    headers: { 'X-Access-Key': apiKey }
                });
            }

            if (response.ok) {
                const result = await response.json();
                const data = isUpstash ? JSON.parse(result.result) : (result.record || result);
                restoreFromBackup(data);
                isDirty = 3; // Synced after download
                saveData(true); 
                updateSyncStatus();
                alert('雲端資料下載並恢復成功！');
            } else {
                throw new Error(await response.text());
            }
        } catch (err) {
            alert('下載失敗：' + err.message);
        } finally {
            cloudDownloadBtn.disabled = false;
            cloudDownloadBtn.textContent = '📥 從雲端下載';
        }
    };

    // Local Data Actions
    document.getElementById('exportJsonBtn').onclick = () => {
        const data = getFullBackupData();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        const timestamp = new Date().toISOString().split('T')[0];
        a.href = url;
        a.download = `ClassKudox_Backup_${timestamp}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const importJsonBtn = document.getElementById('importJsonBtn');
    const importJsonFile = document.getElementById('importJsonFile');
    importJsonBtn.onclick = () => importJsonFile.click();
    importJsonFile.onchange = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (!confirm('⚠️ 警告：匯入 JSON 將【完全覆蓋】目前的本地資料！確定嗎？')) {
            importJsonFile.value = '';
            return;
        }

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const data = JSON.parse(event.target.result);
                restoreFromBackup(data);
            } catch (err) {
                alert('匯入失敗：無效的 JSON 檔案');
            }
        };
        reader.readAsText(file);
    };

    // --- Boot sequence ---
    const bootSequence = () => {
        try {
            renderClassSelector();
            applySettings();
            renderStudents();
            renderPointItems();
        } catch(e) {
            console.error("Boot Sequence Error:", e);
        }
    };

    // Safely assign event listeners
    const el = (id) => document.getElementById(id);
    if(el('resetSystemBtn')) el('resetSystemBtn').onclick = () => {
        if (confirm('💣 極度危險 💣\n點擊「確定」將會刪除所有班級、學生與紀錄，系統將恢復至初始狀態。\n這個動作無法復原！確定嗎？')) {
            if (confirm('請最後一再次確認，真的要全面重置嗎？')) {
                Object.keys(localStorage).forEach(key => {
                    if (key.startsWith('cdData_')) localStorage.removeItem(key);
                });
                alert('系統已完成重置！');
                location.reload();
            }
        }
    };

    document.querySelectorAll('.reports-close').forEach(btn => {
        btn.onclick = () => {
            currentReportFilterStudentId = null;
            closeModal(reportsModal);
        };
    });
    document.querySelectorAll('.add-close').forEach(btn => btn.onclick = () => closeModal(addStudentModal));
    document.querySelectorAll('.profile-close').forEach(btn => btn.onclick = () => closeModal(studentProfileModal));
    document.querySelectorAll('.edit-student-close').forEach(btn => btn.onclick = () => closeModal(editStudentModal));
    document.querySelectorAll('.group-close').forEach(btn => btn.onclick = () => closeModal(manageGroupModal));
    document.querySelectorAll('.classes-close').forEach(btn => btn.onclick = () => closeModal(manageClassesModal));

    bootSequence();
});
