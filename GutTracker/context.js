// --- 全域狀態 Context ---
const GutContext = React.createContext();

const GutProvider = ({ children }) => {
    const [db, setDb] = useState(null);
    const [dietRecords, setDietRecords] = useState({});
    const [bowelRecords, setBowelRecords] = useState([]);
    const [loading, setLoading] = useState(true);
    const [darkMode, setDarkMode] = useState(localStorage.getItem('gut_darkMode') !== 'false');
    const [config, setConfig] = useState(loadConfig);

    useEffect(() => {
        openDB().then(async (database) => {
            setDb(database);
            const allDiet = await dbGetAll(database, 'diet');
            const dietMap = allDiet.reduce((acc, curr) => ({ ...acc, [curr.date]: curr }), {});
            const allBowel = await dbGetAll(database, 'bowel');
            setDietRecords(dietMap);
            setBowelRecords(allBowel);
            setLoading(false);
        }).catch(err => {
            console.error('[GutTracker] IndexedDB 初始化失敗:', err);
            setLoading(false);
        });
    }, []);

    useEffect(() => {
        if (darkMode) document.documentElement.classList.add('dark');
        else document.documentElement.classList.remove('dark');
        localStorage.setItem('gut_darkMode', darkMode);
    }, [darkMode]);

    useEffect(() => {
        document.documentElement.style.fontSize = `${config.fontSizeZoom || 100}%`;
    }, [config.fontSizeZoom]);

    const updateConfig = (newCfg) => { setConfig(newCfg); saveConfig(newCfg); };
    const doResetConfig = () => { resetConfig(); setConfig({ ...DEFAULTS }); };

    const saveDiet = async (date, data) => {
        const record = { date, ...data };
        await dbPut(db, 'diet', record);
        setDietRecords(prev => ({ ...prev, [date]: record }));
    };

    const saveBowel = async (record) => {
        const id = await dbPut(db, 'bowel', record);
        setBowelRecords(prev => [...prev, { ...record, id }]);
    };

    const deleteBowel = async (id) => {
        await dbDelete(db, 'bowel', id);
        setBowelRecords(prev => prev.filter(b => b.id !== id));
    };

    const getSnapshot = () => {
        const safeConfig = { ...config };
        delete safeConfig.binUrl;
        delete safeConfig.apiKey;
        return { diet: Object.values(dietRecords), bowel: bowelRecords, config: safeConfig };
    };

    const exportData = async () => {
        const data = JSON.stringify(getSnapshot(), null, 2);
        try {
            const compressed = await gzip(data);
            const blob = new Blob([compressed], { type: 'application/gzip' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `GutTracker_Backup_${new Date().toISOString().slice(0,10)}.json.gz`;
            a.click();
            URL.revokeObjectURL(url);
        } catch(e) {
            alert("匯出失敗: " + e.message);
        }
    };

    const importData = async (file) => {
        try {
            const buffer = await file.arrayBuffer();
            const uint8 = new Uint8Array(buffer);
            let text;
            
            // 嘗試解壓縮 (Gzip 標頭為 1f 8b)
            const isGzip = uint8[0] === 0x1f && uint8[1] === 0x8b;
            if (isGzip) {
                text = await ungzip(uint8);
            } else {
                // 回退到純文字處理 (Legacy 支援)
                text = new TextDecoder().decode(uint8);
            }

            const parsed = JSON.parse(text);
            if (parsed.diet) for (const d of parsed.diet) await dbPut(db, 'diet', d);
            if (parsed.bowel) for (const b of parsed.bowel) await dbPut(db, 'bowel', b);
            
            if (parsed.config) {
                // 核心保護：獲取當前有效的雲端 Key，避免被備份檔中的空白欄位蓋掉
                const currentCloud = { 
                    binUrl: config.binUrl || "", 
                    apiKey: config.apiKey || "" 
                };
                const mergedConfig = { ...parsed.config, ...currentCloud };
                saveConfig(mergedConfig);
            }
            window.location.reload();
        } catch(e) { alert('匯入失敗：' + e.message); }
    };

    // 系統重置：刪除 IndexedDB + 清除所有 localStorage
    const systemReset = async () => {
        try {
            if (db) db.close();
            await deleteDB();
            localStorage.removeItem(LS_KEY);
            localStorage.removeItem('gut_darkMode');
            window.location.reload();
        } catch(e) {
            alert('重置失敗：' + e.message);
        }
    };

    const value = {
        dietRecords, bowelRecords, loading, darkMode, setDarkMode,
        config, updateConfig, doResetConfig, systemReset,
        saveDiet, saveBowel, deleteBowel, exportData, importData, getSnapshot
    };
    return <GutContext.Provider value={value}>{children}</GutContext.Provider>;
};

const useGut = () => React.useContext(GutContext);

// --- 日期工具 ---
const formatDateStr = (d) => {
    // 使用斜線替代橫線，確保各瀏覽器皆以本地時間解析日期
    const date = new Date(d.replace(/-/g, '/'));
    return `${date.getMonth()+1}/${date.getDate()} (${['日','一','二','三','四','五','六'][date.getDay()]})`;
};
