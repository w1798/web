const { useState, useEffect } = React;

const ResultPanel = ({ results, onCopy, onDownloadBat, onReset }) => {
    // 檢查是否有重複項
    const duplicates = new Set();
    const seen = new Set();
    results.forEach(val => {
        if (seen.has(val)) duplicates.add(val);
        seen.add(val);
    });

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', height: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ fontSize: '1rem', color: 'var(--text-dim)' }}>預覽結果 ({results.length} 個)</h3>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <button className="btn btn-ghost" style={{ padding: '0.4rem 0.8rem' }} onClick={onDownloadBat}>💾 下載.bat</button>
                    <button className="btn btn-ghost" style={{ padding: '0.4rem 0.8rem', color: '#f43f5e' }} onClick={onReset}>🔄 重置</button>
                </div>
            </div>
            <pre style={{ flex: 1, overflowY: 'auto', fontSize: '1rem', color: '#818cf8', padding: '1rem', background: 'rgba(0,0,0,0.25)', borderRadius: '0.75rem', whiteSpace: 'pre-wrap', wordBreak: 'break-all', fontFamily: 'monospace' }}>
                {results.length > 0 ? results.map((line, i) => {
                    const isDup = duplicates.has(line);
                    return (
                        <div key={i} style={{ color: isDup ? '#fb7185' : 'inherit', textShadow: isDup ? '0 0 8px rgba(251,113,133,0.4)' : 'none' }}>
                            {line}{isDup && ' (重複項目)'}
                        </div>
                    );
                }) : '尚未產生結果'}
            </pre>
        </div>
    );
};

const App = () => {
    const [activeTab, setActiveTab] = useState('poetry');
    const [config, setConfig] = useState(window.EMagLogic.initData());
    const [results, setResults] = useState([]);
    const [poetryContent, setPoetryContent] = useState('');
    const [status, setStatus] = useState('');
    const [uploadedFileName, setUploadedFileName] = useState('');
    const [showHelp, setShowHelp] = useState(false);
    const [showDocxHelp, setShowDocxHelp] = useState(false);

    useEffect(() => {
        window.EMagLogic.saveData(config);
        const r = (() => {
            if (config.modeOption === 'A') return config.manualInput ? config.manualInput.split('\n').filter(l => l.trim()) : [];
            if (config.modeOption === 'B') return window.EMagLogic.processModeB(config.modeB_Prefix, config.modeB_Count || 10, config.modeB_Digits);
            if (config.modeOption === 'C') return window.EMagLogic.generateFinalFilenames(config);
            return [];
        })();
        setResults(r);
    }, [config]);

    // 統一檔案上傳處理
    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        const fileName = file.name.toLowerCase();
        setUploadedFileName(file.name);
        setPoetryContent('');
        setStatus('');

        if (fileName.endsWith('.docx')) {
            // 處理 Word
            setStatus("正在讀取 Word...");
            const reader = new FileReader();
            reader.onload = async (e) => {
                const result = await window.mammoth.extractRawText({ arrayBuffer: e.target.result });
                
                // 根據檔名判斷文類
                let type = "未知";
                const fname = file.name;
                if (fname.includes("作文")) type = "作文";
                else if (fname.includes("詩")) type = "童詩";
                else if (fname.includes("心得") || fname.includes("讀後")) type = "心得";
                
                let text = result.value.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
                text = text.replace(/\n\n\n/g, "\n\n");
                text = text.replace(/(.)\n\n(.)/g, "$1\n$2");
                
                const prefix = `[類型: ${type}]\n`;
                setPoetryContent(prefix + text);
                setStatus("✅ Word 讀取成功");
            };
            reader.readAsArrayBuffer(file);
        } else if (fileName.endsWith('.zip') || fileName.endsWith('.csv')) {
            // 處理 Google 表單 (ZIP 或單純 CSV)
            setStatus("正在解析 Google 表單資料...");
            try {
                let text = "";
                if (fileName.endsWith('.zip')) {
                    text = await window.EMagLogic.processGoogleFormZip(file);
                } else {
                    const reader = new FileReader();
                    text = await new Promise((resolve) => {
                        reader.onload = (re) => resolve(window.EMagLogic.parseGoogleCsv(re.target.result));
                        reader.readAsText(file);
                    });
                }
                
                if (text) {
                    setPoetryContent(text);
                    setStatus("✅ 表單匯入成功");
                }
            } catch (err) {
                console.error(err);
                setStatus(`❌ 處理失敗: ${err.message}`);
            }
        } else {
            alert("不支援的檔案格式！");
        }
        
        // 重置以利重複選擇
        e.target.value = '';
    };

    const set = (field, value) => setConfig(prev => ({ ...prev, [field]: value }));

    const handleCopy = () => {
        const text = results.join('\n');
        navigator.clipboard.writeText(text).catch(() => {
            const el = document.createElement("textarea");
            el.value = text;
            document.body.appendChild(el);
            el.select();
            document.execCommand('copy');
            document.body.removeChild(el);
        }).then(() => alert('已複製！'));
    };

    // 1. 重置基礎資訊 (僅影響左側班級/老師/名單)
    const handleBaseInfoReset = () => {
        if (window.confirm('確定要清空「班級資訊與學生名單」嗎？')) {
            setConfig(prev => ({
                ...prev,
                classInfo: '305',
                teacherName: '許美麗',
                studentNames: ''
            }));
        }
    };

    // 2. 重置特定模式設定 (僅影響右側該模式欄位)
    const handleModeReset = () => {
        const modeNames = { A: '全手動', B: '流水號', C: '格式化' };
        if (window.confirm(`確定要清空「${modeNames[config.modeOption]}」模式的所有設定嗎？`)) {
            if (config.modeOption === 'A') {
                set('manualInput', '');
            } else if (config.modeOption === 'B') {
                setConfig(prev => ({ 
                    ...prev, 
                    modeB_Prefix: '生活花絮', 
                    modeB_Count: 10, 
                    modeB_Digits: 3 
                }));
            } else if (config.modeOption === 'C') {
                setConfig(prev => ({ 
                    ...prev, 
                    batchNos: '', 
                    workTitles: '' 
                }));
            }
        }
    };

    // 3. 文章頁面重置 (使用 Logic 中定義的集中預設值)
    const handlePoetryReset = () => {
        if (window.confirm('確定要初始化「文選格式化」的所有設定嗎？(包含字體大小、行距等)')) {
            setConfig(prev => ({
                ...prev,
                ...window.EMagLogic.PoetryDefaults
            }));
            setPoetryContent('');
            setStatus('設定已恢復預設值');
        }
    };

    // 4. 重置命名格式
    const handleTemplateReset = () => {
        if (window.confirm('確定要恢復預設命名格式嗎？')) {
            set('nameTemplate', '{class}-{no}-{student}-{work}-指導老師-{teacher}');
        }
    };

    // === 各模式渲染 ===
    const renderMode = () => {
        // 共用的預覽面板 props
        const panelProps = { results, onCopy: handleCopy, onDownloadBat: () => window.EMagLogic.generateRenameBat(results, config.modeOption, config.classInfo, config.sortOrder), onReset: handleModeReset };

        if (config.modeOption === 'A') {
            return (
                <div style={{ display: 'flex', gap: '1.5rem', flex: 1, minHeight: 0 }}>
                    <div className="input-group" style={{ flex: 1 }}>
                        <label>A. 全手動操作 (一行一個檔名)</label>
                        <textarea
                            value={config.manualInput}
                            onChange={(e) => set('manualInput', e.target.value)}
                            placeholder={`生活花絮001\n生活花絮002`}
                            style={{ flex: 1 }}
                        />
                    </div>
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                        <ResultPanel {...panelProps} />
                    </div>
                </div>
            );
        }

        if (config.modeOption === 'B') {
            return (
                <div style={{ display: 'flex', gap: '1.5rem', flex: 1, minHeight: 0 }}>
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <div className="input-group">
                            <label>B. 生活花絮 - 檔名前綴</label>
                            <input type="text" value={config.modeB_Prefix} onChange={(e) => set('modeB_Prefix', e.target.value)} />
                        </div>
                        <div className="input-group">
                            <label>流水號位數</label>
                            <select value={config.modeB_Digits} onChange={(e) => set('modeB_Digits', parseInt(e.target.value))}>
                                <option value="1">1 位 (0)</option>
                                <option value="2">2 位 (00)</option>
                                <option value="3">3 位 (000)</option>
                            </select>
                        </div>
                    </div>
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                        <ResultPanel {...panelProps} />
                    </div>
                </div>
            );
        }

        if (config.modeOption === 'C') {
            return (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 3fr', gap: '1rem', flex: 1, minHeight: 0 }}>
                    {/* 1區 */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', minWidth: 0 }}>
                        <div className="input-group">
                            <label>班級</label>
                            <input type="text" value={config.classInfo} onChange={(e) => set('classInfo', e.target.value)} />
                        </div>
                        <div className="input-group">
                            <label>指導老師</label>
                            <input type="text" value={config.teacherName} onChange={(e) => set('teacherName', e.target.value)} />
                        </div>
                        <div className="input-group" style={{ flex: 1, minHeight: 0 }}>
                            <label>學生姓名 (一行一姓名，跳號要空行)</label>
                            <textarea value={config.studentNames} onChange={(e) => set('studentNames', e.target.value)} placeholder={`王小明\n陳小東\n\n汪小川`} style={{ flex: 1 }} />
                        </div>
                    </div>
                    {/* 2區 */}
                    <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                        <div className="input-group" style={{ flex: 1, minHeight: 0 }}>
                            <label>座號 (一行一作者，支援多作者3,5,8)</label>
                            <textarea value={config.batchNos} onChange={(e) => set('batchNos', e.target.value)} placeholder={`2\n1\n3, 5, 8`} style={{ flex: 1 }} />
                        </div>
                    </div>
                    {/* 3區 */}
                    <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                        <div className="input-group" style={{ flex: 1, minHeight: 0 }}>
                            <label>作品名稱(一行一作品，一樣輸一個即可)</label>
                            <textarea value={config.workTitles} onChange={(e) => set('workTitles', e.target.value)} placeholder="閱讀心得" style={{ flex: 1 }} />
                        </div>
                    </div>
                    {/* 4區 (寬度 3x) */}
                    <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                        <ResultPanel {...panelProps} />
                    </div>
                </div>
            );
        }
    };

    return (
        <div id="root">
            <header className="header" style={{ padding: '0.75rem 2rem 0.5rem' }}>
                <h1 style={{ fontSize: '2rem' }}>電子校刊作品管理</h1>
                <p style={{ fontSize: '1.2rem' }}>快速處理文選作者格式 與 批次檔名格式化<span style={{ color: '#F9F900', marginLeft: '0.5rem' }}>(下載.bat後，放到 要改檔名的目錄裡「點兩下執行」即可)</span></p>
            </header>

            <div className="main-layout">
                <nav className="sidebar" style={{ display: 'flex', flexDirection: 'column', gap: '0', height: '100%', overflow: 'hidden' }}>
                    {/* 上區：固定切換按鈕 (不受捲動影響) */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', paddingBottom: '1.25rem', flexShrink: 0, borderBottom: '1px solid var(--glass-border)', marginBottom: '0.5rem' }}>
                        <button className={`tab-btn ${activeTab === 'poetry' ? 'active' : ''}`} onClick={() => setActiveTab('poetry')}>
                            📝 文選作者格式化
                        </button>
                        <button className={`tab-btn ${activeTab === 'rename' ? 'active' : ''}`} onClick={() => setActiveTab('rename')}>
                            🏷️ 批次檔名更改
                        </button>
                    </div>

                    {/* 下區：班級資訊內容區域 (可捲動) */}
                    <div style={{ flex: 1, overflowY: 'auto', paddingRight: '4px' }}>
                        {activeTab === 'rename' && (
                            <div style={{ marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem', padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '0.75rem', border: '1px solid var(--glass-border)' }}>
                                <div className="input-group">
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <label style={{ margin: 0, fontSize: '0.9rem' }}>班級</label>
                                        <button className="btn btn-ghost" style={{ padding: '0.1rem 0.3rem', fontSize: '0.75rem', color: '#f43f5e' }} onClick={handleBaseInfoReset}>🔄 重置</button>
                                    </div>
                                    <input type="text" value={config.classInfo} onChange={(e) => set('classInfo', e.target.value)} style={{ height: '2.2rem' }} />
                                </div>
                                <div className="input-group">
                                    <label style={{ fontSize: '0.9rem' }}>指導老師</label>
                                    <input type="text" value={config.teacherName} onChange={(e) => set('teacherName', e.target.value)} style={{ height: '2.2rem' }} />
                                </div>
                                <div className="input-group" style={{ height: '400px' }}>
                                    <label style={{ fontSize: '0.9rem' }}>學生姓名 (一行一姓名)</label>
                                    <textarea 
                                        value={config.studentNames} 
                                        onChange={(e) => set('studentNames', e.target.value)} 
                                        placeholder={`王小明\n陳小東\n\n汪小川`} 
                                        style={{ flex: 1, fontSize: '0.9rem' }} 
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                </nav>

                <main className="content-area">
                    {/* === 童詩頁面 === */}
                    {/* .docx 說明 Modal */}
                    {showDocxHelp && (
                        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setShowDocxHelp(false)}>
                            <div style={{ background: '#1e1e2e', border: '1px solid var(--glass-border)', borderRadius: '1rem', padding: '2rem', maxWidth: '480px', width: '90%', fontSize: '0.95rem', lineHeight: 2.0 }} onClick={e => e.stopPropagation()}>
                                <div style={{ color: 'var(--text-dim)', fontWeight: 700, marginBottom: '0.75rem', fontSize: '1.1rem' }}>💡 .docx 格式說明</div>
                                <div>第一篇的第 1 行：題目</div>
                                <div style={{ color: '#F9F900' }}>第 2 行：學號（純數字，如 5401）</div>
                                <div>第 3 行：學生姓名</div>
                                <div>第 4 行：指導老師（可略，空白則採預設老師）</div>
                                <div style={{ color: 'var(--text-dim)', fontSize: '0.85rem', marginLeft: '1rem' }}>這要空一行，再接文章內容</div>
                                <div>文章內容...</div>
                                <div style={{ color: 'var(--text-dim)', marginTop: '0.5rem', fontSize: '0.85rem', marginLeft: '1rem' }}>第二篇前空一行</div>
                                <div>第二篇的第 1 行：題目</div>
                                <div style={{ color: '#F9F900' }}>第 2 行：學號（純數字）</div>
                                <div>重複上面的格式...</div>
                                <button className="btn btn-primary" style={{ marginTop: '1.5rem', width: '100%', justifyContent: 'center' }} onClick={() => setShowDocxHelp(false)}>關閉</button>
                            </div>
                        </div>
                    )}

                    {activeTab === 'poetry' && (
                        <div className="glass-card" style={{ flex: 1, minHeight: 0, gap: '1rem', padding: '1rem' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 3fr) minmax(0, 3fr) minmax(0, 4fr)', gap: '1rem', flex: 1, minHeight: 0, width: '100%' }}>

                                {/* 第 1 區：排版設定 */}
                                <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--glass-border)', borderRadius: '0.75rem', padding: '1rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginBottom: '1rem' }}>
                                        <div style={{ color: 'var(--text-dim)', fontWeight: 700 }}>⚙️ 排版細節設定</div>
                                        <button className="btn" onClick={handlePoetryReset} style={{ padding: '2px 10px', fontSize: '0.8rem', background: 'rgba(244,63,94,0.05)', border: '1px solid rgba(244,63,94,0.3)', color: '#f43f5e' }}>重置</button>
                                    </div>

                                    <div style={{ marginBottom: '0.5rem', display: 'flex', flexDirection: 'row', alignItems: 'center', width: '100%', gap: '10px' }}>
                                        <label style={{ fontSize: '1em', width: '120px', flexShrink: 0, whiteSpace: 'nowrap', marginBottom: 0 }}>題目字體</label>
                                        <input type="number" value={config.fontSizeTitle} onChange={(e) => set('fontSizeTitle', parseInt(e.target.value) || 1)} style={{ width: '70px', height: '30px', padding: '2px 6px' }} />
                                    </div>

                                    <div style={{ marginBottom: '0.5rem', display: 'flex', flexDirection: 'row', alignItems: 'center', width: '100%', gap: '10px' }}>
                                        <label style={{ fontSize: '1em', width: '120px', flexShrink: 0, whiteSpace: 'nowrap', marginBottom: 0 }}>作者字體</label>
                                        <input type="number" value={config.fontSizeAuthor} onChange={(e) => set('fontSizeAuthor', parseInt(e.target.value) || 1)} style={{ width: '70px', height: '30px', padding: '2px 6px' }} />
                                    </div>

                                    <div style={{ marginBottom: '0.5rem', display: 'flex', flexDirection: 'row', alignItems: 'center', width: '100%', gap: '10px' }}>
                                        <label style={{ fontSize: '1em', width: '120px', flexShrink: 0, whiteSpace: 'nowrap', marginBottom: 0 }}>內容字體</label>
                                        <input type="number" value={config.fontSizeContent} onChange={(e) => set('fontSizeContent', parseInt(e.target.value) || 1)} style={{ width: '70px', height: '30px', padding: '2px 6px' }} />
                                    </div>

                                    <div style={{ marginBottom: '0.5rem', display: 'flex', flexDirection: 'row', alignItems: 'center', width: '100%', gap: '10px' }}>
                                        <label style={{ fontSize: '1em', width: '120px', flexShrink: 0, whiteSpace: 'nowrap', marginBottom: 0 }}>作者右移</label>
                                        <input type="number" value={config.authorSpaces} onChange={(e) => set('authorSpaces', parseInt(e.target.value) || 0)} style={{ width: '70px', height: '30px', padding: '2px 6px' }} />
                                    </div>

                                    <div style={{ marginBottom: '0.5rem', display: 'flex', flexDirection: 'row', alignItems: 'center', width: '100%', gap: '10px' }}>
                                        <label style={{ fontSize: '1em', width: '120px', flexShrink: 0, whiteSpace: 'nowrap', marginBottom: 0 }}>每篇換頁</label>
                                        <select value={config.enablePageBreak ? "true" : "false"} onChange={(e) => set('enablePageBreak', e.target.value === "true")} style={{ width: '70px', height: '30px', padding: '2px', background: '#1a1a1a', border: '1px solid #444', borderRadius: '4px', color: '#fff' }}>
                                            <option value="true">是</option>
                                            <option value="false">否</option>
                                        </select>
                                    </div>

                                    <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '0.6rem', width: '100%' }}>
                                        <div style={{ marginBottom: '0.4rem', display: 'flex', flexDirection: 'row', alignItems: 'center', width: '100%', gap: '10px' }}>
                                            <label style={{ fontSize: '1em', width: '120px', flexShrink: 0, whiteSpace: 'nowrap', marginBottom: 0 }}>作文行距</label>
                                            <input type="number" step="0.1" value={config.spacingEssay} onChange={(e) => set('spacingEssay', parseFloat(e.target.value) || 1.5)} style={{ width: '70px', height: '30px', padding: '2px 6px' }} />倍
                                        </div>
                                        <div style={{ marginBottom: '0.4rem', display: 'flex', flexDirection: 'row', alignItems: 'center', width: '100%', gap: '10px' }}>
                                            <label style={{ fontSize: '1em', width: '120px', flexShrink: 0, whiteSpace: 'nowrap', marginBottom: 0 }}>童詩行距</label>
                                            <input type="number" step="0.1" value={config.spacingPoetry} onChange={(e) => set('spacingPoetry', parseFloat(e.target.value) || 1.5)} style={{ width: '70px', height: '30px', padding: '2px 6px' }} />倍
                                        </div>
                                        <div style={{ marginBottom: '0.4rem', display: 'flex', flexDirection: 'row', alignItems: 'center', width: '100%', gap: '10px' }}>
                                            <label style={{ fontSize: '1em', width: '120px', flexShrink: 0, whiteSpace: 'nowrap', marginBottom: 0 }}>心得行距</label>
                                            <input type="number" step="0.1" value={config.spacingReview} onChange={(e) => set('spacingReview', parseFloat(e.target.value) || 1.5)} style={{ width: '70px', height: '30px', padding: '2px 6px' }} />倍
                                        </div>
                                        <div style={{ marginBottom: '0.4rem', display: 'flex', flexDirection: 'row', alignItems: 'center', width: '100%', gap: '10px' }}>
                                            <label style={{ fontSize: '1em', width: '120px', flexShrink: 0, whiteSpace: 'nowrap', marginBottom: 0 }}>自然段空一行</label>
                                            <select value={config.emptyLineBetweenParagraphs ? "true" : "false"} onChange={(e) => set('emptyLineBetweenParagraphs', e.target.value === "true")} style={{ width: '70px', height: '30px', padding: '2px', background: '#1a1a1a', border: '1px solid #444', borderRadius: '4px', color: '#fff' }}>
                                                <option value="true">是</option>
                                                <option value="false">否</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>

                                {/* 第 2 區：指導老師與動作 */}
                                <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--glass-border)', borderRadius: '0.75rem', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                    <div style={{ color: 'var(--text-dim)', fontWeight: 700 }}>✍️ 指導老師與檔案</div>

                                    <div className="input-group">
                                        <label>預設指導老師</label>
                                        <input
                                            type="text"
                                            value={config.poetryTeacher}
                                            onChange={(e) => set('poetryTeacher', e.target.value)}
                                            placeholder="例：指導 某某某 師"
                                        />
                                    </div>

                                    <div className="input-group">
                                        <label style={{ color: '#F9F900', fontWeight: 'bold' }}>1. 上傳檔案</label>
                                        <input
                                            type="file"
                                            accept=".docx,.zip,.csv"
                                            onClick={(e) => { e.target.value = ''; setPoetryContent(''); setStatus('等待檔案...'); }}
                                            onChange={handleFileUpload}
                                        />
                                        <div style={{ fontSize: '1rem', color: 'var(--text-dim)', marginTop: '0.2rem', lineHeight: 1.8 }}>
                                            支援 .docx
                                            <a href="#" onClick={(e) => { e.preventDefault(); setShowDocxHelp(true); }} style={{ color: '#F9F900', marginLeft: '4px' }}>(說明)</a>
                                            &nbsp;和&nbsp;
                                            <a href="https://docs.google.com/forms/d/1OsotRlfDINTbaQLN1yUY2LKjvtSIpg8jxh2pjmqI1AU/copy" target="_blank" style={{ color: '#F9F900' }}>Google 表單</a>
                                            &nbsp;下載的 .zip(.csv) 檔
                                            <a href="#" onClick={(e) => { e.preventDefault(); setShowHelp(true); }} style={{ color: '#F9F900', marginLeft: '4px' }}>(說明)</a>
                                        </div>
                                    </div>

                                    <button className="btn btn-primary" onClick={() => {
                                        if (!poetryContent.trim()) {
                                            alert('請先選擇檔案或貼上文選資料');
                                            return;
                                        }
                                        window.EMagLogic.generatePoetryWord(poetryContent, config.poetryTeacher, uploadedFileName, config.authorSpaces, {
                                            fontSizeTitle: config.fontSizeTitle,
                                            fontSizeAuthor: config.fontSizeAuthor,
                                            fontSizeContent: config.fontSizeContent,
                                            enablePageBreak: config.enablePageBreak,
                                            spacingEssay: config.spacingEssay,
                                            spacingPoetry: config.spacingPoetry,
                                            spacingReview: config.spacingReview,
                                            emptyLineBetweenParagraphs: config.emptyLineBetweenParagraphs
                                        });
                                    }} style={{ justifyContent: 'center' }}>
                                        3. 下載格式化 Word
                                    </button>
                                </div>

                                {/* 第 3 區：編輯內容 */}
                                <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--glass-border)', borderRadius: '0.75rem', padding: '1rem', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
                                        <div style={{ color: '#F9F900', fontWeight: 700, fontSize: '1rem' }}>
                                            2. 編輯與手動修正
                                            {status && <span style={{ color: '#F9F900', marginLeft: '10px', fontSize: '0.8rem', fontWeight: 400 }}>[{status}]</span>}
                                        </div>
                                        <button className="btn" onClick={() => setPoetryContent('')} style={{ padding: '2px 8px', fontSize: '0.8rem' }}>清空</button>
                                    </div>
                                    <textarea
                                        value={poetryContent}
                                        onChange={(e) => setPoetryContent(e.target.value)}
                                        placeholder="貼上內容後進行編輯..."
                                        style={{ flex: 1, resize: 'none' }}
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* === 改名頁面 === */}
                    {activeTab === 'rename' && (
                        <div className="glass-card" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 3fr', gridTemplateRows: 'auto auto 1fr', gap: '1rem', flex: 1, minHeight: 0, paddingTop: '0.75rem' }}>
                            
                            {/* 第一列：標題與模式切換 (橫跨所有列) */}
                            <div style={{ gridColumn: '1 / 4', display: 'flex', alignItems: 'center', gap: '1.25rem', flexWrap: 'wrap', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.4rem' }}>
                                <h2 className="section-title" style={{ marginBottom: 0 }}>檔案更名產生器</h2>
                                <nav style={{ display: 'flex', gap: '0.5rem' }}>
                                    {[
                                        { id: 'A', label: 'A.全手動' },
                                        { id: 'B', label: 'B.流水號' },
                                        { id: 'C', label: 'C.格式化' }
                                    ].map(m => (
                                        <button key={m.id} className={`btn ${config.modeOption === m.id ? 'btn-primary' : 'btn-ghost'}`}
                                            onClick={() => set('modeOption', m.id)}>
                                            {m.label}
                                        </button>
                                    ))}
                                </nav>
                                <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <label style={{ whiteSpace: 'nowrap', color: 'var(--text-dim)', margin: 0 }}>原檔名排序方式：</label>
                                    <select value={config.sortOrder} onChange={(e) => set('sortOrder', e.target.value)} style={{ minWidth: '9rem' }}>
                                        <option value="time_asc">依時間舊到新</option>
                                        <option value="time_desc">依時間新到舊</option>
                                        <option value="name_asc">依檔名小到大</option>
                                        <option value="name_desc">依檔名大到小</option>
                                    </select>
                                </div>
                            </div>

                            {/* 第二列：命名格式 (僅 C 模式顯示) */}
                            <div style={{ gridColumn: '1 / 4', minHeight: config.modeOption === 'C' ? 'auto' : 0 }}>
                                {config.modeOption === 'C' && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.25rem 0' }}>
                                        <label style={{ whiteSpace: 'nowrap', color: 'var(--text-dim)', margin: 0 }}>命名格式：</label>
                                        <input 
                                            type="text" 
                                            value={config.nameTemplate} 
                                            onChange={(e) => set('nameTemplate', e.target.value)} 
                                            placeholder="{class}-{no}-{student}-{work}-指導老師-{teacher}"
                                            style={{ background: 'rgba(255,255,255,0.05)', height: '2.5rem', flex: 1, maxWidth: '800px' }}
                                        />
                                        <button className="btn btn-ghost" style={{ padding: '0.2rem 0.5rem', fontSize: '0.85rem', color: '#f43f5e' }} onClick={handleTemplateReset}>🔄 重置</button>
                                    </div>
                                )}
                            </div>

                            {/* 第三列：各模式內容下半部 (2, 3, 4 區) */}
                            {(() => {
                                const panelProps = { results, onCopy: handleCopy, onDownloadBat: () => window.EMagLogic.generateRenameBat(results, config.modeOption, config.classInfo, config.sortOrder), onReset: handleModeReset };
                                
                                if (config.modeOption === 'C') {
                                    return (
                                        <React.Fragment>
                                            <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                                                <div className="input-group" style={{ flex: 1, minHeight: 0 }}>
                                                    <label>座號 (一行一作者，支援多作者3,5,8)</label>
                                                    <textarea value={config.batchNos} onChange={(e) => set('batchNos', e.target.value)} placeholder={`2\n1\n3, 5, 8`} style={{ flex: 1 }} />
                                                </div>
                                            </div>
                                            <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                                                <div className="input-group" style={{ flex: 1, minHeight: 0 }}>
                                                    <label>作品名稱(一行一作品，支援單一輸入)</label>
                                                    <textarea value={config.workTitles} onChange={(e) => set('workTitles', e.target.value)} placeholder="閱讀心得" style={{ flex: 1 }} />
                                                </div>
                                            </div>
                                            <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                                                <ResultPanel {...panelProps} />
                                            </div>
                                        </React.Fragment>
                                    );
                                }
                                
                                if (config.modeOption === 'A') {
                                    return (
                                        <div style={{ gridColumn: '1 / 4', display: 'flex', gap: '1.25rem', minHeight: 0 }}>
                                            <div className="input-group" style={{ flex: 1 }}>
                                                <label>A. 全手動操作 (一行一個檔名)</label>
                                                <textarea 
                                                    value={config.manualInput} 
                                                    onChange={(e) => {
                                                        const val = e.target.value.replace(/[\\\\/:*?"<>|]/g, '');
                                                        set('manualInput', val);
                                                    }} 
                                                    placeholder={`生活花絮001\n生活花絮002`} 
                                                    style={{ flex: 1 }} 
                                                />
                                            </div>
                                            <div style={{ flex: 1 }}>
                                                <ResultPanel {...panelProps} />
                                            </div>
                                        </div>
                                    );
                                }

                                if (config.modeOption === 'B') {
                                    return (
                                        <div style={{ gridColumn: '1 / 4', display: 'flex', gap: '1.25rem', minHeight: 0 }}>
                                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                                <div className="input-group">
                                                    <label>B. 生活花絮 - 檔名前綴</label>
                                                    <input type="text" value={config.modeB_Prefix} onChange={(e) => set('modeB_Prefix', e.target.value)} />
                                                </div>
                                                <div className="input-group">
                                                    <label>流水號位數</label>
                                                    <select value={config.modeB_Digits} onChange={(e) => set('modeB_Digits', parseInt(e.target.value))}>
                                                        <option value="1">1 位 (0)</option>
                                                        <option value="2">2 位 (00)</option>
                                                        <option value="3">3 位 (000)</option>
                                                    </select>
                                                </div>
                                                <div className="input-group">
                                                    <label>幾筆檔案要改名</label>
                                                    <input 
                                                        type="number" 
                                                        value={config.modeB_Count} 
                                                        onChange={(e) => set('modeB_Count', parseInt(e.target.value) || 0)} 
                                                        min="1"
                                                    />
                                                </div>
                                            </div>
                                            <div style={{ flex: 1 }}>
                                                <ResultPanel {...panelProps} />
                                            </div>
                                        </div>
                                    );
                                }
                            })()}
                        </div>
                    )}
                </main>
            </div>
            {/* 說明彈窗 */}
            {showHelp && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '2rem' }}>
                    <div className="glass-card" style={{ maxWidth: '600px', width: '100%', position: 'relative', border: '1px solid rgba(255,255,255,0.2)', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)' }}>
                        <button 
                            onClick={() => setShowHelp(false)}
                            style={{ position: 'absolute', top: '1.25rem', right: '1.25rem', background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', fontSize: '1.5rem' }}
                        >✕</button>
                        
                        <h2 style={{ marginBottom: '1.5rem', color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            📋 Google 表單格式
                        </h2>
                        <div style={{ lineHeight: 1.8, fontSize: '1.05rem' }}>
                            <p style={{ marginBottom: '1rem', color: 'var(--text-dim)' }}>請 <a href="https://docs.google.com/forms/d/1OsotRlfDINTbaQLN1yUY2LKjvtSIpg8jxh2pjmqI1AU/copy" target="_blank" style={{ color: '#F9F900' }}>點我複製 Google 表單</a> 或 自行建立 下列欄位（皆為必填）：</p>
                            <ul style={{ listStyle: 'none', padding: 0 }}>
                                <li style={{ padding: '0.75rem', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', marginBottom: '0.5rem' }}>
                                    <strong style={{ color: '#fff' }}>類型</strong>：選擇 (選項：作文、童詩、心得)
                                </li>
                                <li style={{ padding: '0.75rem', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', marginBottom: '0.5rem' }}>
                                    <strong style={{ color: '#fff' }}>題目</strong>：簡答
                                </li>
                                <li style={{ padding: '0.75rem', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', marginBottom: '0.5rem' }}>
                                    <strong style={{ color: '#fff' }}>姓名</strong>：簡答
                                </li>
                                <li style={{ padding: '0.75rem', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', marginBottom: '0.5rem' }}>
                                    <strong style={{ color: '#fff' }}>學號 (範例：5401)</strong>：簡答
                                </li>
                                <li style={{ padding: '0.75rem', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', marginBottom: '0.5rem' }}>
                                    <strong style={{ color: '#fff' }}>內容</strong>：詳答
                                </li>
                            </ul>
                            <div style={{ marginTop: '1.5rem', padding: '1rem', background: 'rgba(244, 63, 94, 0.1)', borderRadius: '8px', borderLeft: '4px solid #f43f5e', fontSize: '0.9rem' }}>
                                ⚠️ <strong>注意：</strong> 欄位名稱一定要有「類型、題目、姓名、學號、內容」，系統才能正確提取資料。
                            </div>
                        </div>
                        <button 
                            className="btn btn-primary" 
                            onClick={() => setShowHelp(false)} 
                            style={{ width: '100%', marginTop: '2rem', justifyContent: 'center' }}
                        >我知道了</button>
                    </div>
                </div>
            )}
        </div>
    );
};

const rootElement = document.getElementById('root');
if (rootElement) {
    const root = ReactDOM.createRoot(rootElement);
    root.render(<App />);
}
