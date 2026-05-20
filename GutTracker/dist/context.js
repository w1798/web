const GutContext = React.createContext();
const GutProvider = ({ children }) => {
  const [db, setDb] = useState(null);
  const [dietRecords, setDietRecords] = useState({});
  const [bowelRecords, setBowelRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [darkMode, setDarkMode] = useState(localStorage.getItem("gut_darkMode") !== "false");
  const [config, setConfig] = useState(loadConfig);
  useEffect(() => {
    openDB().then(async (database) => {
      setDb(database);
      const allDiet = await dbGetAll(database, "diet");
      const dietMap = allDiet.reduce((acc, curr) => ({ ...acc, [curr.date]: curr }), {});
      const allBowel = await dbGetAll(database, "bowel");
      setDietRecords(dietMap);
      setBowelRecords(allBowel);
      setLoading(false);
    }).catch((err) => {
      console.error("[GutTracker] IndexedDB \u521D\u59CB\u5316\u5931\u6557:", err);
      setLoading(false);
    });
  }, []);
  useEffect(() => {
    if (darkMode) document.documentElement.classList.add("dark");
    else document.documentElement.classList.remove("dark");
    localStorage.setItem("gut_darkMode", darkMode);
  }, [darkMode]);
  useEffect(() => {
    document.documentElement.style.fontSize = `${config.fontSizeZoom || 100}%`;
  }, [config.fontSizeZoom]);
  const updateConfig = (newCfg) => {
    setConfig(newCfg);
    saveConfig(newCfg);
  };
  const doResetConfig = () => {
    resetConfig();
    setConfig({ ...DEFAULTS });
  };
  const saveDiet = async (date, data) => {
    const record = { date, ...data };
    await dbPut(db, "diet", record);
    setDietRecords((prev) => ({ ...prev, [date]: record }));
  };
  const saveBowel = async (record) => {
    const id = await dbPut(db, "bowel", record);
    setBowelRecords((prev) => [...prev, { ...record, id }]);
  };
  const deleteBowel = async (id) => {
    await dbDelete(db, "bowel", id);
    setBowelRecords((prev) => prev.filter((b) => b.id !== id));
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
      const blob = new Blob([compressed], { type: "application/gzip" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `GutTracker_Backup_${(/* @__PURE__ */ new Date()).toISOString().slice(0, 10)}.json.gz`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      alert("\u532F\u51FA\u5931\u6557: " + e.message);
    }
  };
  const importData = async (file) => {
    try {
      const buffer = await file.arrayBuffer();
      const uint8 = new Uint8Array(buffer);
      let text;
      const isGzip = uint8[0] === 31 && uint8[1] === 139;
      if (isGzip) {
        text = await ungzip(uint8);
      } else {
        text = new TextDecoder().decode(uint8);
      }
      const parsed = JSON.parse(text);
      if (parsed.diet) for (const d of parsed.diet) await dbPut(db, "diet", d);
      if (parsed.bowel) for (const b of parsed.bowel) await dbPut(db, "bowel", b);
      if (parsed.config) {
        const currentCloud = {
          binUrl: config.binUrl || "",
          apiKey: config.apiKey || ""
        };
        const mergedConfig = { ...parsed.config, ...currentCloud };
        saveConfig(mergedConfig);
      }
      window.location.reload();
    } catch (e) {
      alert("\u532F\u5165\u5931\u6557\uFF1A" + e.message);
    }
  };
  const systemReset = async () => {
    try {
      if (db) db.close();
      await deleteDB();
      localStorage.removeItem(LS_KEY);
      localStorage.removeItem("gut_darkMode");
      window.location.reload();
    } catch (e) {
      alert("\u91CD\u7F6E\u5931\u6557\uFF1A" + e.message);
    }
  };
  const value = {
    dietRecords,
    bowelRecords,
    loading,
    darkMode,
    setDarkMode,
    config,
    updateConfig,
    doResetConfig,
    systemReset,
    saveDiet,
    saveBowel,
    deleteBowel,
    exportData,
    importData,
    getSnapshot
  };
  return /* @__PURE__ */ React.createElement(GutContext.Provider, { value }, children);
};
const useGut = () => React.useContext(GutContext);
const formatDateStr = (d) => {
  const date = new Date(d.replace(/-/g, "/"));
  return `${date.getMonth() + 1}/${date.getDate()} (${["\u65E5", "\u4E00", "\u4E8C", "\u4E09", "\u56DB", "\u4E94", "\u516D"][date.getDay()]})`;
};
