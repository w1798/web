/**
 * ClassCompass 介面層 (script.js) - React JSX
 * 圖標使用內建 SVG，不依賴任何外部圖標庫
 */

const { useState, useEffect, useMemo, useRef, useCallback } = React;

/* ========== 內建 SVG 圖標 ========== */
const ICON_PATHS = {
    'upload-cloud': '<path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242"/><path d="M12 12v9"/><path d="m16 16-4-4-4 4"/>',
    'compass': '<circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/>',
    'layout-grid': '<rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/><rect width="7" height="7" x="14" y="14" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/>',
    'users': '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
    'search': '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
    'chevron-left': '<path d="m15 18-6-6 6-6"/>',
    'chevron-up': '<path d="m18 15-6-6-6 6"/>',
    'arrow-right': '<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>',
    'trash-2': '<path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/>',
    'alert-triangle': '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><line x1="12" x2="12" y1="9" y2="13"/><line x1="12" x2="12.01" y1="17" y2="17"/>',
    'search-x': '<path d="m13.5 8.5-5 5"/><path d="m8.5 8.5 5 5"/><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
    'file-spreadsheet': '<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M8 13h2"/><path d="M14 13h2"/><path d="M8 17h2"/><path d="M14 17h2"/>',
    'settings': '<path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/>',
    'copy': '<rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>',
    'check': '<path d="M20 6 9 17l-5-5"/>',
    'x': '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
};

const Icon = ({ name, size = 20, className = "" }) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
        dangerouslySetInnerHTML={{ __html: ICON_PATHS[name] || '' }}
    />
);

/* ========== 剪貼簿工具 ========== */
function copyToClipboard(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).catch(() => execCopy(text));
    } else {
        execCopy(text);
    }
}
function execCopy(text) {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.cssText = 'position:fixed;left:-9999px;top:0';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
}

/* ========== 設定管理 ========== */
const SETTINGS_KEY = 'ClassCompass_Settings';
const DEFAULT_SETTINGS = { fontSize: 14, emailDomain: '@gmail.com' };

function loadSettings() {
    try {
        const raw = localStorage.getItem(SETTINGS_KEY);
        if (!raw) return structuredClone(DEFAULT_SETTINGS);
        const saved = JSON.parse(raw);
        return Object.assign(structuredClone(DEFAULT_SETTINGS), saved);
    } catch (e) {
        return structuredClone(DEFAULT_SETTINGS);
    }
}
function saveSettings(s) {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
}

/* ========== 子組件 (外部定義避免 Render 丟失焦點) ========== */

const SettingsPanel = ({ settings, updateSetting, onClose }) => (
    <div className="mb-6 p-6 bg-white border border-slate-200 rounded-2xl shadow-sm animate-in">
        <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <Icon name="settings" size={18} />
                設定
            </h3>
            <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600">
                <Icon name="x" size={18} />
            </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
                <label className="block text-sm font-medium text-slate-600 mb-2">
                    表格字體大小：{settings.fontSize}px
                </label>
                <input
                    type="range"
                    min="12"
                    max="20"
                    step="1"
                    value={settings.fontSize}
                    onChange={(e) => updateSetting('fontSize', Number(e.target.value))}
                    className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-primary-500"
                />
                <div className="flex justify-between text-xs text-slate-400 mt-1">
                    <span>12px</span>
                    <span>20px</span>
                </div>
            </div>
            <div>
                <label className="block text-sm font-medium text-slate-600 mb-2">
                    Email 網域
                </label>
                <input
                    type="text"
                    value={settings.emailDomain}
                    onChange={(e) => updateSetting('emailDomain', e.target.value)}
                    placeholder="@gmail.com"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none text-slate-900"
                />
            </div>
        </div>
    </div>
);

const Navbar = ({ students, activeTab, onTabClick, onReset, showSettings, onToggleSettings }) => {
    const navItems = [
        { id: 'roster', label: '班級名冊', iconName: 'layout-grid' },
        { id: 'duplicates', label: '同名查詢', iconName: 'users' },
        { id: 'search', label: '智慧搜尋', iconName: 'search' }
    ];

    return (
        <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-200">
            <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="bg-primary-600 p-2 rounded-lg text-white">
                        <Icon name="compass" size={20} />
                    </div>
                    <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary-600 to-primary-800">
                        學生學籍查詢系統
                    </h1>
                </div>

                {students.length > 0 && (
                    <div className="flex items-center gap-2">
                        <nav className="flex bg-slate-100 p-1 rounded-xl">
                            {navItems.map(item => (
                                <button
                                    key={item.id}
                                    onClick={() => onTabClick(item.id)}
                                    className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${activeTab === item.id
                                            ? 'bg-white text-primary-600 shadow-sm'
                                            : 'text-slate-500 hover:text-slate-700'
                                        }`}
                                >
                                    <Icon name={item.iconName} size={16} />
                                    {item.label}
                                </button>
                            ))}
                        </nav>
                        <button
                            onClick={onToggleSettings}
                            className={`p-2 rounded-lg transition-colors ${showSettings ? 'bg-primary-100 text-primary-600' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'
                                }`}
                            title="設定"
                        >
                            <Icon name="settings" size={18} />
                        </button>
                    </div>
                )}

                <div className="flex items-center gap-4">
                    {students.length > 0 && (
                        <button
                            onClick={onReset}
                            className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                            title="重設資料"
                        >
                            <Icon name="trash-2" size={20} />
                        </button>
                    )}
                </div>
            </div>
        </header>
    );
};

/* ========== 主應用 ========== */
const App = () => {
    const [students, setStudents] = useState([]);
    const [warnings, setWarnings] = useState([]);
    const [lastUpdate, setLastUpdate] = useState('');
    const [loading, setLoading] = useState(true);

    const [activeTab, setActiveTab] = useState('roster');
    const [currentClass, setCurrentClass] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [showBackToTop, setShowBackToTop] = useState(false);
    const [dragActive, setDragActive] = useState(false);
    const [settings, setSettings] = useState(DEFAULT_SETTINGS);
    const [showSettings, setShowSettings] = useState(false);
    const [copyFeedback, setCopyFeedback] = useState('');

    useEffect(() => {
        const saved = ClassCompass_Logic.loadData();
        if (saved) {
            setStudents(saved.students || []);
            setWarnings(saved.warnings || []);
            setLastUpdate(saved.lastUpdate || '');
        }
        setSettings(loadSettings());
        setLoading(false);

        const handleScroll = () => setShowBackToTop(window.scrollY > 200);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const handleFileUpload = async (file) => {
        setLoading(true);
        try {
            const result = await ClassCompass_Logic.parseExcel(file);
            setStudents(result.students);
            setWarnings(result.warnings);
            setLastUpdate(result.lastUpdate);
            ClassCompass_Logic.saveData(result);
            setActiveTab('roster');
        } catch (err) {
            alert(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFileUpload(e.dataTransfer.files[0]);
        }
    };

    const handleReset = () => {
        if (confirm('確定要清除所有資料嗎？這將無法復原。')) {
            ClassCompass_Logic.resetData();
            setStudents([]);
            setWarnings([]);
            setLastUpdate('');
            setCurrentClass(null);
            setSearchQuery('');
        }
    };

    const updateSetting = (key, value) => {
        setSettings(prev => {
            const next = { ...prev, [key]: value };
            saveSettings(next);
            return next;
        });
    };

    const showCopyToast = useCallback((label) => {
        setCopyFeedback(label);
        setTimeout(() => setCopyFeedback(''), 1500);
    }, []);

    const handleColumnCopy = useCallback((data, field, label) => {
        const values = data.map(s => {
            if (field === 'seatPad') return String(s.seat).padStart(2, '0');
            if (field === 'email') return s.studentId + settings.emailDomain;
            return String(s[field] || '');
        });
        copyToClipboard(values.join('\n'));
        showCopyToast(label);
    }, [settings.emailDomain, showCopyToast]);

    // 計算資料
    const classes = useMemo(() => {
        return [...new Set(students.map(s => s.classId))].sort();
    }, [students]);

    const filteredStudents = useMemo(() => {
        if (activeTab === 'search') {
            return ClassCompass_Logic.searchStudents(students, searchQuery);
        }
        if (activeTab === 'roster' && currentClass) {
            return students
                .filter(s => s.classId === currentClass)
                .sort((a, b) => a.seat - b.seat);
        }
        return [];
    }, [students, activeTab, currentClass, searchQuery]);

    const duplicates = useMemo(() => {
        return ClassCompass_Logic.findDuplicates(students);
    }, [students]);

    const duplicateNames = useMemo(() => {
        return Array.from(new Set(duplicates.map(d => d.name)));
    }, [duplicates]);

    const gradeGrid = useMemo(() => {
        const groups = {};
        classes.forEach(id => {
            const sample = students.find(s => s.classId === id);
            if (!sample) return;
            const g = sample.grade;
            if (!groups[g]) groups[g] = [];
            groups[g].push({ classId: id, grade: sample.grade, className: sample.className, count: students.filter(s => s.classId === id).length });
        });
        const grades = Object.keys(groups).sort((a, b) => Number(a) - Number(b));
        const maxRows = Math.max(...grades.map(g => groups[g].length), 0);
        return { groups, grades, maxRows };
    }, [classes, students]);

    /* --- 子組件 --- */

    const UploadSection = () => (
        <div
            className={`max-w-3xl mx-auto mt-12 p-12 border-2 border-dashed rounded-3xl transition-all duration-300 flex flex-col items-center justify-center bg-white shadow-sm ${dragActive ? 'border-primary-500 bg-primary-50' : 'border-slate-200'
                }`}
            onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
            onDragLeave={() => setDragActive(false)}
            onDrop={handleDrop}
        >
            <div className="w-20 h-20 bg-primary-100 text-primary-600 rounded-2xl flex items-center justify-center mb-6">
                <Icon name="upload-cloud" size={40} />
            </div>
            <h2 className="text-2xl font-bold text-slate-800 mb-2">上傳學生分班資料</h2>
            <p className="text-primary-600 font-medium mb-8 text-center max-w-md">
                請拖曳 Excel (.xlsx, .xls) 到此處，或使用下方按鈕選取檔案。
                <br />
                系統將自動辨識「年級」、「班級」、「座號」與「姓名」。
            </p>
            <label className="bg-primary-600 hover:bg-primary-700 text-white px-8 py-3 rounded-xl font-medium cursor-pointer transition-all shadow-md hover:shadow-lg">
                選取 Excel 檔案
                <input
                    type="file"
                    className="hidden"
                    accept=".xlsx,.xls"
                    onChange={(e) => e.target.files[0] && handleFileUpload(e.target.files[0])}
                />
            </label>
        </div>
    );

    const CopyableHeader = ({ label, data, field }) => (
        <th
            className="sticky top-0 z-10 bg-slate-50 px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider cursor-pointer hover:text-primary-600 hover:bg-primary-50 transition-colors select-none group border-b border-slate-200"
            title={`點擊複製全部「${label}」`}
            onClick={() => handleColumnCopy(data, field, label)}
        >
            <span className="flex items-center gap-1.5">
                {label}
                <Icon name="copy" size={12} className="opacity-0 group-hover:opacity-100 transition-opacity" />
            </span>
        </th>
    );

    const ClassDetailTable = ({ data }) => {
        const fs = settings.fontSize;
        return (
            <div className="overflow-auto rounded-2xl border border-slate-200 bg-white shadow-sm" style={{ maxHeight: '70vh' }}>
                <table className="w-full text-left border-separate border-spacing-0" style={{ fontSize: fs }}>
                    <thead>
                        <tr>
                            <CopyableHeader label="班級號" data={data} field="classNo" />
                            <CopyableHeader label="學生姓名" data={data} field="name" />
                            <CopyableHeader label="學號" data={data} field="studentId" />
                            <CopyableHeader label="座號1" data={data} field="seat" />
                            <CopyableHeader label="座號2(補0)" data={data} field="seatPad" />
                            <CopyableHeader label="Email" data={data} field="email" />
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {data.map(s => (
                            <tr key={s.studentId} className="hover:bg-slate-50 transition-colors group">
                                <td className="px-5 py-3 font-mono text-primary-600 font-medium">{s.classNo}</td>
                                <td className="px-5 py-3 font-bold text-slate-800">{s.name}</td>
                                <td className="px-5 py-3 text-slate-500">{s.studentId}</td>
                                <td className="px-5 py-3 text-slate-500">{s.seat}</td>
                                <td className="px-5 py-3 font-mono text-slate-500">{String(s.seat).padStart(2, '0')}</td>
                                <td className="px-5 py-3 text-slate-500 font-mono">{s.studentId}{settings.emailDomain}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        );
    };

    const SearchTable = ({ data }) => {
        const fs = settings.fontSize;
        return (
            <div className="overflow-auto rounded-2xl border border-slate-200 bg-white shadow-sm" style={{ maxHeight: '70vh' }}>
                <table className="w-full text-left border-separate border-spacing-0" style={{ fontSize: fs }}>
                    <thead>
                        <tr>
                            <CopyableHeader label="班級號" data={data} field="classNo" />
                            <CopyableHeader label="學生姓名" data={data} field="name" />
                            <CopyableHeader label="學號" data={data} field="studentId" />
                            <th className="sticky top-0 z-10 bg-slate-50 px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">班級</th>
                            <th className="sticky top-0 z-10 bg-slate-50 px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">座號</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {data.map(s => (
                            <tr key={s.studentId} className="hover:bg-slate-50 transition-colors group">
                                <td className="px-5 py-3 font-mono text-primary-600 font-medium">{s.classNo}</td>
                                <td className="px-5 py-3 font-bold text-slate-800">{s.name}</td>
                                <td className="px-5 py-3 text-slate-500">{s.studentId}</td>
                                <td className="px-5 py-3 text-slate-500">{s.grade}年{s.className}班</td>
                                <td className="px-5 py-3">
                                    <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-slate-100 text-xs font-bold text-slate-600 group-hover:bg-primary-100 group-hover:text-primary-700 transition-colors">
                                        {s.seat}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        );
    };

    /* --- 分頁渲染 --- */

    const renderRoster = () => {
        if (currentClass) {
            const first = filteredStudents[0];
            return (
                <div className="space-y-6">
                    <div className="flex items-center gap-4">
                        <button onClick={() => setCurrentClass(null)} className="p-2 hover:bg-slate-200 rounded-xl transition-colors">
                            <Icon name="chevron-left" size={24} />
                        </button>
                        <div>
                            <h2 className="text-2xl font-bold text-slate-800">
                                {first ? first.grade : ''}年{first ? first.className : ''}班 學生名冊
                            </h2>
                            <p className="text-slate-500 text-sm">共 {filteredStudents.length} 位學生　|　點擊欄位標題可複製整欄</p>
                        </div>
                    </div>
                    <ClassDetailTable data={filteredStudents} />
                </div>
            );
        }

        const { groups, grades, maxRows } = gradeGrid;
        const colCount = grades.length || 1;

        return (
            <div>
                <div
                    className="grid gap-4"
                    style={{ gridTemplateColumns: `repeat(${colCount}, minmax(0, 1fr))` }}
                >
                    {Array.from({ length: maxRows }).map((_, row) =>
                        grades.map(g => {
                            const item = groups[g][row];
                            if (!item) return <div key={g + '-' + row} />;
                            return (
                                <button
                                    key={item.classId}
                                    onClick={() => setCurrentClass(item.classId)}
                                    className="group p-5 bg-white border border-slate-200 rounded-2xl hover:border-primary-300 hover:shadow-lg hover:shadow-primary-500/5 transition-all text-left relative overflow-hidden"
                                >
                                    <div className="absolute top-0 right-0 p-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Icon name="arrow-right" className="text-primary-500" size={16} />
                                    </div>
                                    <h3 className="text-lg font-bold text-slate-800 mb-1">
                                        {item.grade} 年 {item.className} 班
                                    </h3>
                                    <p className="text-slate-500 text-sm">{item.count} 位學生</p>
                                </button>
                            );
                        })
                    )}
                </div>
            </div>
        );
    };

    const renderDuplicates = () => (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold text-slate-800">全校同名學生查詢</h2>
                <p className="text-slate-500 text-sm">自動找出姓名相同但學號或班級不同的學生</p>
            </div>
            {duplicates.length > 0 ? (
                <div className="grid gap-6">
                    {duplicateNames.map(name => (
                        <div key={name} className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
                            <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex items-center justify-between">
                                <h3 className="font-bold text-slate-800">學生姓名：{name}</h3>
                                <span className="text-xs bg-primary-100 text-primary-700 px-2 py-1 rounded-full font-bold">
                                    共有 {duplicates.filter(d => d.name === name).length} 位
                                </span>
                            </div>
                            <table className="w-full text-left" style={{ fontSize: settings.fontSize }}>
                                <tbody className="divide-y divide-slate-100">
                                    {duplicates.filter(d => d.name === name).map(s => (
                                        <tr key={s.studentId} className="hover:bg-slate-50 transition-colors">
                                            <td className="px-6 py-4 font-mono text-primary-600 font-medium whitespace-nowrap">{s.classNo}</td>
                                            <td className="px-6 py-4 text-slate-500 whitespace-nowrap">學號: {s.studentId}</td>
                                            <td className="px-6 py-4 text-slate-500 whitespace-nowrap">{s.grade}年{s.className}班 - {s.seat}號</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center py-20 text-slate-400 bg-white rounded-3xl border border-slate-200">
                    <Icon name="users" size={48} className="mb-4 opacity-50" />
                    <p>全校目前沒有同名學生</p>
                </div>
            )}
        </div>
    );

    const renderSearch = () => (
        <div className="space-y-6">
            <div className="relative group">
                <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-primary-500 transition-colors">
                    <Icon name="search" size={20} />
                </div>
                <input
                    type="text"
                    placeholder="輸入姓名、學號或班級座號 (支援多關鍵字空格查詢，如：王 小明)"
                    className="w-full bg-white border border-slate-200 rounded-2xl py-4 pl-14 pr-6 focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none shadow-sm transition-all text-lg text-slate-900"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    autoFocus
                />
            </div>

            {searchQuery ? (
                filteredStudents.length > 0 ? (
                    <div className="space-y-4">
                        <p className="text-sm text-slate-500">找到 {filteredStudents.length} 筆符合的結果</p>
                        <SearchTable data={filteredStudents} />
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-20 text-slate-400 bg-white rounded-3xl border border-slate-200">
                        <Icon name="search-x" size={48} className="mb-4 opacity-50" />
                        <p>找不到符合「{searchQuery}」的學生</p>
                    </div>
                )
            ) : (
                <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                    <Icon name="file-spreadsheet" size={48} className="mb-4 opacity-50" />
                    <p>在上方搜尋框輸入關鍵字開始查詢</p>
                </div>
            )}
        </div>
    );

    /* --- 主渲染 --- */
    if (loading) return null;

    return (
        <div className="pb-1">
            <Navbar
                students={students}
                activeTab={activeTab}
                onTabClick={(id) => { setActiveTab(id); setCurrentClass(null); setShowSettings(false); }}
                onReset={handleReset}
                showSettings={showSettings}
                onToggleSettings={() => setShowSettings(!showSettings)}
            />

            <main className="max-w-7xl mx-auto px-4 py-1">
                {/* 設定面板 */}
                {showSettings && (
                    <SettingsPanel
                        settings={settings}
                        updateSetting={updateSetting}
                        onClose={() => setShowSettings(false)}
                    />
                )}

                {/* 警告 */}
                {warnings.length > 0 && students.length > 0 && (
                    <div className="mb-8 p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-4">
                        <Icon name="alert-triangle" className="text-amber-500 shrink-0 mt-0.5" size={20} />
                        <div>
                            <h4 className="text-amber-800 font-bold mb-1">資料驗證警告</h4>
                            <ul className="text-sm text-amber-700 list-disc list-inside">
                                {warnings.map((w, i) => <li key={i}>{w}</li>)}
                            </ul>
                        </div>
                    </div>
                )}

                {students.length === 0 ? (
                    <UploadSection />
                ) : (
                    <div className="space-y-8">
                        {activeTab === 'roster' && renderRoster()}
                        {activeTab === 'duplicates' && renderDuplicates()}
                        {activeTab === 'search' && renderSearch()}
                    </div>
                )}
            </main>

            {/* 複製提示 */}
            {copyFeedback && (
                <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 px-5 py-2.5 bg-slate-800 text-white text-sm font-medium rounded-xl shadow-xl flex items-center gap-2 animate-in text-slate-900 bg-white">
                    <Icon name="check" size={16} className="text-green-500" />
                    已複製「{copyFeedback}」欄位
                </div>
            )}

            {/* 回頂 */}
            <button
                className={`fixed bottom-8 right-8 p-4 bg-white border border-slate-200 rounded-2xl shadow-xl transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 z-50 text-primary-600 ${showBackToTop ? 'opacity-100 scale-100 cursor-pointer' : 'opacity-0 scale-75 pointer-events-none'
                    }`}
                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            >
                <Icon name="chevron-up" size={24} />
            </button>
        </div>
    );
};

// 確保在 DOM 與核心庫就緒後才進行渲染
// (避免 script.js 在 #root 元素建立前執行，導致 createRoot 收到 null 而拋出 React error #299)
const mountApp = () => {
    const rootElement = document.getElementById('root');
    if (rootElement && typeof ReactDOM !== 'undefined') {
        const root = ReactDOM.createRoot(rootElement);
        root.render(<App />);
    }
};

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mountApp);
} else {
    mountApp();
}
