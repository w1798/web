// =============================================
// 設定頁面
// =============================================
const ConfigTextarea = ({ label, value, onChange, placeholder }) => (
    <div className="mb-4">
        <label className="text-sm font-bold text-gray-600 dark:text-gray-300 mb-1.5 block">{label}</label>
        <textarea value={value} onChange={onChange} placeholder={placeholder} rows={4}
            className="w-full bg-gray-100 dark:bg-slate-700 border-none rounded-xl p-3 text-sm dark:text-gray-200 focus:outline-none focus:ring-2 ring-indigo-400 resize-y font-mono leading-relaxed" />
    </div>
);

const SettingsPage = () => {
    const { exportData, importData, config, updateConfig, doResetConfig, systemReset, getSnapshot } = useGut();
    const fileRef = useRef(null);

    const [mealText, setMealText]   = useState(config.mealNames.join('\n'));
    const [foodText, setFoodText]   = useState(config.foodTypes.join('\n'));
    const [amountText, setAmountText] = useState(config.amounts.join('\n'));
    const [cookText, setCookText]   = useState(config.cookMethods.join('\n'));
    const [bowelText, setBowelText] = useState(config.bowelStatuses.join('\n'));
    const [fontSizeZoom, setFontSizeZoom] = useState(config.fontSizeZoom || 100);
    const [binUrl, setBinUrl] = useState(config.binUrl || '');
    const [apiKey, setApiKey] = useState(config.apiKey || '');

    const hasCloud = Boolean(config.binUrl && config.apiKey);
    const [showLoadMenu, setShowLoadMenu] = useState(false);
    const [showSaveMenu, setShowSaveMenu] = useState(false);

    useEffect(() => {
        setMealText(config.mealNames.join('\n'));
        setFoodText(config.foodTypes.join('\n'));
        setAmountText(config.amounts.join('\n'));
        setCookText(config.cookMethods.join('\n'));
        setBowelText(config.bowelStatuses.join('\n'));
        setFontSizeZoom(config.fontSizeZoom || 100);
        setBinUrl(config.binUrl || '');
        setApiKey(config.apiKey || '');
    }, [config]);

    const parseLines = (text) => text.split('\n').map(s => s.trim()).filter(Boolean);

    const handleSave = () => {
        updateConfig({
            mealNames: parseLines(mealText),
            foodTypes: parseLines(foodText),
            amounts: parseLines(amountText),
            cookMethods: parseLines(cookText),
            bowelStatuses: parseLines(bowelText),
            fontSizeZoom: parseInt(fontSizeZoom),
            binUrl: binUrl.trim(),
            apiKey: apiKey.trim()
        });
        alert('✅ 設定已儲存！');
    };

    const handleReset = () => {
        if (!confirm('確定要重置所有設定為預設值嗎？\n（不會清除飲食與排便紀錄，但所有自訂項目將被復原）')) return;
        const currentCloud = { binUrl: config.binUrl, apiKey: config.apiKey };
        const newCfg = { ...DEFAULTS, ...currentCloud };
        updateConfig(newCfg);
        alert('✅ 已恢復自訂選項預設值（已保留雲端設定）！');
    };

    const handleSystemReset = () => {
        if (!confirm('⚠️ 系統重置將會清除所有資料！\n包括：飲食紀錄、排便紀錄、自訂設定\n\n此操作無法復原，建議先匯出備份。\n\n確定要重置嗎？')) return;
        if (!confirm('🚨 最後確認：真的要刪除所有資料嗎？')) return;
        systemReset();
    };

    const handleCloudUpload = async () => {
        if (!config.binUrl || !config.apiKey) return alert('請先綁定雲端！');
        if (!confirm('確定要將完整的本地資料上傳覆蓋至雲端備份庫嗎？')) return;
        try {
            const isUpstash = config.binUrl.includes('upstash.io');
            let endpoint = config.binUrl.startsWith('http') ? config.binUrl : `https://api.jsonbin.io/v3/b/${config.binUrl}`;
            
            const headers = isUpstash 
                ? { "Authorization": `Bearer ${config.apiKey}`, "Content-Type": "application/json" }
                : { "X-Access-Key": config.apiKey, "Content-Type": "application/json" };
            
            const payloadStr = JSON.stringify(getSnapshot());
            const compressed = await gzip(payloadStr);
            let binaryString = '';
            for (let i=0; i<compressed.length; i++) binaryString += String.fromCharCode(compressed[i]);
            const base64Str = btoa(binaryString);
            
            // Upstash 需要 Redis 命令格式 ["SET", key, value]
            const body = isUpstash 
                ? JSON.stringify(["SET", "gut_backup", base64Str]) 
                : JSON.stringify({ payload: base64Str });

            const res = await fetch(endpoint, { method: isUpstash ? 'POST' : 'PUT', headers, body });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            alert('✅ 雲端備份成功！');
            setShowSaveMenu(false);
        } catch(e) { alert('上傳失敗：' + e.message); }
    };

    const handleCloudDownload = async () => {
        if (!config.binUrl || !config.apiKey) return alert('請先綁定雲端！');
        if (!confirm('⚠️ 危險：這會從雲端下載並【覆寫】本地同日的紀錄，確定執行嗎？')) return;
        try {
            const isUpstash = config.binUrl.includes('upstash.io');
            let endpoint = config.binUrl.startsWith('http') ? config.binUrl : `https://api.jsonbin.io/v3/b/${config.binUrl}/latest`;
            
            if (isUpstash) {
                // 如果是 Upstash，自動補上 /get/gut_backup 命令
                endpoint = endpoint.replace(/\/$/, '') + '/get/gut_backup';
            }

            const headers = isUpstash 
                ? { "Authorization": `Bearer ${config.apiKey}` }
                : { "X-Access-Key": config.apiKey };
            
            const res = await fetch(endpoint, { headers });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            
            const base64Str = isUpstash ? data.result : (data.record ? data.record.payload : data.payload);
            if (!base64Str) throw new Error("雲端目前沒有備份資料");

            const binaryStr = atob(base64Str);
            const charArray = new Uint8Array(binaryStr.length);
            for(let i=0; i<binaryStr.length; i++) charArray[i] = binaryStr.charCodeAt(i);
            const decompressed = await ungzip(charArray);
            
            const parsed = JSON.parse(decompressed);
            if (parsed.config) {
                const newCfg = { ...config, ...parsed.config, binUrl: config.binUrl, apiKey: config.apiKey };
                updateConfig(newCfg);
            }
            await importData(new File([new Blob([decompressed])], "cloud.json"));
        } catch(e) { alert('下載失敗：' + e.message); }
    };

    return (
        <div className="p-5 animate-fade-in space-y-5">
            <h2 className="text-lg font-black text-gray-800 dark:text-gray-100 flex items-center gap-2">⚙️ 系統設定</h2>

            <section>
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">存檔與讀取</h3>
                {!hasCloud && <p className="text-xs text-gray-400 mb-2 px-1">尚未綁定雲端，只有提供本地 JSON 操作功能。</p>}
                <div className="space-y-4">
                    <div className="glass-card p-4 rounded-2xl">
                        <button onClick={() => hasCloud ? setShowLoadMenu(!showLoadMenu) : fileRef.current?.click()}
                            className="w-full flex items-center justify-between font-bold text-gray-700 dark:text-gray-200 hover-lift active:scale-[0.98] transition-all">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-500 rounded-xl flex items-center justify-center text-lg">📥</div>
                                <span className="font-bold text-sm">讀取資料</span>
                            </div>
                            {!hasCloud ? <span className="text-gray-400 text-xs font-normal">本地</span> : <span className="text-gray-300">{showLoadMenu ? '▲' : '▼'}</span>}
                        </button>
                        {hasCloud && showLoadMenu && (
                            <div className="mt-3 flex gap-2 border-t border-gray-100 dark:border-slate-700/50 pt-3 animate-fade-in">
                                <button onClick={() => fileRef.current?.click()} className="flex-1 bg-gray-100 dark:bg-slate-700 py-2.5 rounded-xl text-sm font-bold text-gray-700 dark:text-gray-300">從本地匯入</button>
                                <button onClick={handleCloudDownload} className="flex-1 bg-emerald-100 dark:bg-emerald-900/40 py-2.5 rounded-xl text-sm font-bold text-emerald-600 dark:text-emerald-400">從雲端下載</button>
                            </div>
                        )}
                        <input ref={fileRef} type="file" accept=".json,.json.gz,.gz" className="hidden" onChange={e => { e.target.files[0] && importData(e.target.files[0]); setShowLoadMenu(false); }} />
                    </div>

                    <div className="glass-card p-4 rounded-2xl">
                        <button onClick={() => hasCloud ? setShowSaveMenu(!showSaveMenu) : exportData()}
                            className="w-full flex items-center justify-between font-bold text-gray-700 dark:text-gray-200 hover-lift active:scale-[0.98] transition-all">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-500 rounded-xl flex items-center justify-center text-lg">📤</div>
                                <span className="font-bold text-sm">存檔備份</span>
                            </div>
                            {!hasCloud ? <span className="text-gray-400 text-xs font-normal">本地</span> : <span className="text-gray-300">{showSaveMenu ? '▲' : '▼'}</span>}
                        </button>
                        {hasCloud && showSaveMenu && (
                            <div className="mt-3 flex gap-2 border-t border-gray-100 dark:border-slate-700/50 pt-3 animate-fade-in">
                                <button onClick={exportData} className="flex-1 bg-gray-100 dark:bg-slate-700 py-2.5 rounded-xl text-sm font-bold text-gray-700 dark:text-gray-300">匯出到本地</button>
                                <button onClick={handleCloudUpload} className="flex-1 bg-indigo-100 dark:bg-indigo-900/30 py-2.5 rounded-xl text-sm font-bold text-indigo-600 dark:text-indigo-400">上傳到雲端</button>
                            </div>
                        )}
                    </div>
                </div>
            </section>

            <section className="glass-card rounded-2xl p-4 shadow-sm">
                <h3 className="text-base font-bold text-gray-700 dark:text-gray-200 mb-3 flex items-center gap-2">
                    📝 自訂項目 <span className="text-xs text-gray-400 font-normal">(每行一個值)</span>
                </h3>
                <ConfigTextarea label="餐別名稱" value={mealText} onChange={e => setMealText(e.target.value)} placeholder="🌅 早餐" />
                <ConfigTextarea label="食物種類" value={foodText} onChange={e => setFoodText(e.target.value)} placeholder="🍚 飯" />
                <ConfigTextarea label="量" value={amountText} onChange={e => setAmountText(e.target.value)} placeholder="多" />
                <ConfigTextarea label="調理方式" value={cookText} onChange={e => setCookText(e.target.value)} placeholder="炸" />
                <ConfigTextarea label="排便狀態" value={bowelText} onChange={e => setBowelText(e.target.value)} placeholder="正常" />
                
                <div className="mb-4 pt-3 border-t border-gray-100 dark:border-slate-600">
                    <label className="text-sm font-bold text-gray-600 dark:text-gray-300 mb-2 flex justify-between">
                        <span>全域字體大小</span>
                        <span className="text-indigo-500">{fontSizeZoom}%</span>
                    </label>
                    <input type="range" min="100" max="200" step="5" value={fontSizeZoom} onChange={e => setFontSizeZoom(e.target.value)} className="w-full mb-1" />
                    <p className="text-xs text-gray-400">目前為最低 100%，可往上調大</p>
                </div>

                <div className="mb-4 pt-3 border-t border-gray-100 dark:border-slate-600">
                    <label className="text-sm font-bold text-gray-600 dark:text-gray-300 mb-2 flex justify-between">
                        <span className="flex items-center gap-2">☁️ 雲端備份綁定</span>
                        <a href="https://w1798.github.io/web/JsonCloudGuide" target="_blank" className="text-xs text-indigo-500 font-bold hover:underline">申請說明🡕</a>
                    </label>
                    <div className="space-y-2 mb-2">
                        <input type="text" value={binUrl} onChange={e => setBinUrl(e.target.value)} placeholder="URL or JSONBin ID" 
                            className="w-full bg-gray-100 dark:bg-slate-700 border-none rounded-xl p-2.5 text-sm dark:text-gray-200 focus:outline-none" />
                        <div className="flex gap-2">
                            <input type="password" value={apiKey} onChange={e => setApiKey(e.target.value)} placeholder="Token or X-Access-Key" 
                                className="flex-1 bg-gray-100 dark:bg-slate-700 border-none rounded-xl p-2.5 text-sm dark:text-gray-200 focus:outline-none" />
                            <button onClick={() => { setBinUrl(''); setApiKey(''); }} className="px-3 rounded-xl bg-gray-200 dark:bg-slate-600 text-sm font-bold text-gray-600 dark:text-gray-300 shrink-0">重置</button>
                        </div>
                    </div>
                </div>

                <div className="flex gap-3 mt-4">
                    <button onClick={handleSave}
                        className="flex-1 bg-indigo-500 text-white py-3 rounded-xl font-bold text-base shadow-lg hover:brightness-110 active:scale-[0.98] transition-all min-h-[48px]">💾 儲存設定</button>
                    <button onClick={handleReset}
                        className="flex-1 bg-gray-200 dark:bg-slate-600 text-gray-700 dark:text-gray-200 py-3 rounded-xl font-bold text-base hover:brightness-95 active:scale-[0.98] transition-all min-h-[48px]">🔄 回復項目</button>
                </div>
            </section>

            {/* 系統重置 */}
            <section>
                <h3 className="text-xs font-bold text-red-400 uppercase tracking-widest mb-3">⚠️ 危險區域</h3>
                <button onClick={handleSystemReset}
                    className="w-full bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-700/50 p-4 rounded-2xl flex items-center justify-between hover:bg-red-100 dark:hover:bg-red-900/40 active:scale-[0.98] transition-all">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-red-100 dark:bg-red-900/40 text-red-500 rounded-xl flex items-center justify-center text-lg">🗑️</div>
                        <div>
                            <span className="font-bold text-sm text-red-600 dark:text-red-400 block">系統重置</span>
                            <span className="text-[10px] text-red-400">清除所有資料，恢復原始狀態</span>
                        </div>
                    </div>
                    <span className="text-red-300">▶</span>
                </button>
            </section>

            <section>
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">關於</h3>
                <div className="glass-card p-4 rounded-2xl space-y-2">
                    <div className="flex justify-between items-center">
                        <span className="text-sm font-bold dark:text-gray-300">程式版本</span>
                        <span className="text-xs py-0.5 px-3 bg-gray-100 dark:bg-slate-700 rounded-full font-mono font-bold text-gray-500">v{APP_VER}</span>
                    </div>
                    <p className="text-xs text-gray-400 leading-relaxed">GutTracker 專為關心腸道健康的人士設計，透過簡易的圖像化紀錄，找出飲食與身體反應的規律。</p>
                </div>
            </section>
            
        </div>
    );
};
