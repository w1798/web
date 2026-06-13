const { useState, useEffect } = React;

// === 子組件：預覽結果面板 ===
const ResultPanel = ({ results, onCopy, onDownloadBat, onReset }) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', height: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: '1rem', color: 'var(--text-dim)' }}>預覽結果 ({results.length} 個)</h3>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <button className="btn btn-ghost" style={{ padding: '0.4rem 0.8rem' }} onClick={onCopy}>📄 複製</button>
                <button className="btn btn-ghost" style={{ padding: '0.4rem 0.8rem' }} onClick={onDownloadBat}>💾 .bat</button>
                <button className="btn btn-ghost" style={{ padding: '0.4rem 0.8rem', color: '#f43f5e' }} onClick={onReset}>🔄 重置</button>
            </div>
        </div>
        <pre style={{ flex: 1, overflowY: 'auto', fontSize: '1rem', color: '#818cf8', padding: '1rem', background: 'rgba(0,0,0,0.25)', borderRadius: '0.75rem', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
            {results.join('\n') || '尚未產生結果'}
        </pre>
    </div>
);

const App = () => {
    const [activeTab, setActiveTab] = useState('rename');
    const [config, setConfig] = useState(window.EMagLogic.initData());
    const [results, setResults] = useState([]);
    const [poetryContent, setPoetryContent] = useState('');
    const [status, setStatus] = useState('');

    useEffect(() => {
        window.EMagLogic.saveData(config);
        const r = (() => {
            if (config.modeOption === 'A') return config.manualInput ? config.manualInput.split('\n').filter(l => l.trim()) : [];
            if (config.modeOption === 'B') return window.EMagLogic.processModeB(config.modeB_Prefix, 10, config.modeB_Digits);
            if (config.modeOption === 'C') return window.EMagLogic.generateFinalFilenames(config);
            return [];
        })();
        setResults(r);
    }, [config]);

    const handleWordUpload = (event) => {
        const file = event.target.files[0];
        if (!file) return;
        setPoetryContent('');
        setStatus("正在讀取...");
        const reader = new FileReader();
        reader.onload = (e) => {
            window.mammoth.extractRawText({ arrayBuffer: e.target.result })
                .then((result) => {
                    let text = result.value.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
                    text = text.replace(/\n\n\n/g, "\n\n");
                    text = text.replace(/(.)\n\n(.)/g, "$1\n$2");
                    setPoetryContent(text);
                    setStatus("解讀成功！");
                })
                .catch((err) => { alert("讀取失敗：" + err); setStatus("讀取失敗。"); });
        };
        reader.readAsArrayBuffer(file);
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

    const handleReset = () => { if (confirm('確定要重置？')) setConfig(window.EMagLogic.resetData()); };

    // === 各模式渲染 ===
    const renderMode = () => {
        // 共用的預覽面板 props
        const panelProps = { results, onCopy: handleCopy, onDownloadBat: () => window.EMagLogic.generateRenameBat(results), onReset: handleReset };

        if (config.modeOption === 'A') {
            return (
                <div style={{ display: 'flex', gap: '1.5rem', flex: 1, minHeight: 0 }}>
                    <div className="input-group" style={{ flex: 1 }}>
                        <label>A. 全手動操作 (一行一個檔名)</label>
                        <textarea
                            value={config.manualInput}
                            onChange={(e) => set('manualInput', e.target.value)}
                            placeholder={`範例：\n生活花絮001\n生活花絮002`}
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
                            <label>學生姓名名單 (一行一姓名)</label>
                            <textarea value={config.studentNames} onChange={(e) => set('studentNames', e.target.value)} placeholder={`王小明\n陳小東\n\n汪小川`} style={{ flex: 1 }} />
                        </div>
                    </div>
                    {/* 2區 */}
                    <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                        <div className="input-group" style={{ flex: 1, minHeight: 0 }}>
                            <label>座號名單 (一行一作品，支援 1,2)</label>
                            <textarea value={config.batchSeats} onChange={(e) => set('batchSeats', e.target.value)} placeholder={`範例：\n1, 2\n3, 5, 8`} style={{ flex: 1 }} />
                        </div>
                    </div>
                    {/* 3區 */}
                    <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                        <div className="input-group" style={{ flex: 1, minHeight: 0 }}>
                            <label>作品名稱</label>
                            <textarea value={config.workTitles} onChange={(e) => set('workTitles', e.target.value)} placeholder="未具名作品" style={{ flex: 1 }} />
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
            <header className="header">
                <h1>電子校刊作品管理</h1>
                <p>快速處理作文內容與批次檔名格式化</p>
            </header>

            <div className="main-layout">
                <nav className="sidebar">
                    <button className={`tab-btn ${activeTab === 'poetry' ? 'active' : ''}`} onClick={() => setActiveTab('poetry')}>
                        📝 作文/童詩內容處理
                    </button>
                    <button className={`tab-btn ${activeTab === 'rename' ? 'active' : ''}`} onClick={() => setActiveTab('rename')}>
                        🏷️ 批次檔名更改
                    </button>
                </nav>

                <main className="content-area">

                    {/* === 童詩頁面 === */}
                    {activeTab === 'poetry' && (
                        <div className="glass-card" style={{ flex: 1, minHeight: 0, gap: '1rem' }}>
                            <h2 className="section-title">童詩精準格式轉換器</h2>
                            <div style={{ display: 'flex', gap: '1.5rem', flex: 1, minHeight: 0 }}>
                                {/* 左區 1x：格式說明 */}
                                <div style={{ flex: 1, minWidth: 0, background: 'rgba(255,255,255,0.04)', border: '1px solid var(--glass-border)', borderRadius: '0.75rem', padding: '1.25rem', fontSize: '1rem', lineHeight: 2, overflowY: 'auto' }}>
                                    <div style={{ color: 'var(--text-dim)', fontWeight: 700, marginBottom: '0.5rem' }}>💡 格式：</div>
                                    <div style={{ color: '#f1c40f', fontWeight: 600 }}>題目</div>
                                    <div>學號</div>
                                    <div>學生姓名</div>
                                    <div>指導老師</div>
                                    <div style={{ margin: '0.25rem 0' }}>&nbsp;</div>
                                    <div style={{ color: 'var(--text-dim)' }}>詩句內容...</div>
                                    <div style={{ margin: '0.25rem 0' }}>&nbsp;</div>
                                    <div style={{ color: 'var(--text-dim)', fontSize: '0.95rem' }}>(每篇以空行隔開)</div>
                                </div>
                                {/* 中區 1x：控制操作 */}
                                <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '1.25rem', overflowY: 'auto', paddingRight: '0.5rem' }}>
                                    <div className="input-group">
                                        <label>指導老師 (預設空白)</label>
                                        <input 
                                            type="text" 
                                            value={config.poetryTeacher || ''} 
                                            onChange={(e) => set('poetryTeacher', e.target.value)} 
                                            placeholder="如：許美麗"
                                        />
                                    </div>
                                    <div className="input-group">
                                        <label>📄 上傳學生 Word 檔 (.docx)</label>
                                        <input type="file" accept=".docx" onChange={handleWordUpload} />
                                    </div>
                                    <button className="btn btn-primary" onClick={() => window.EMagLogic.generatePoetryWord(poetryContent, config.poetryTeacher)} style={{ justifyContent: 'center' }}>
                                        🚀 匯出格式化 Word
                                    </button>
                                </div>
                                {/* 右區 2x：編輯內容 */}
                                <div className="input-group" style={{ flex: 2, minWidth: 0, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                                    <label>
                                        編輯內容
                                        {status && <span style={{ color: '#e67e22', marginLeft: '10px', fontWeight: 400 }}>{status}</span>}
                                    </label>
                                    <textarea
                                        value={poetryContent}
                                        onChange={(e) => setPoetryContent(e.target.value)}
                                        placeholder="貼上內容或上傳檔案後進行編輯..."
                                        style={{ flex: 1, resize: 'none' }}
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* === 改名頁面 === */}
                    {activeTab === 'rename' && (
                        <div className="glass-card">
                            {/* 頂列：標題 + 模式切換 (同一列) */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
                                <h2 className="section-title" style={{ marginBottom: 0 }}>檔名批量產生器</h2>
                                <nav style={{ display: 'flex', gap: '0.5rem' }}>
                                    {[
                                        { id: 'A', label: 'A.全手動' },
                                        { id: 'B', label: 'B.流水號' },
                                        { id: 'C', label: 'C.名單格式' }
                                    ].map(m => (
                                        <button key={m.id} className={`btn ${config.modeOption === m.id ? 'btn-primary' : 'btn-ghost'}`}
                                            onClick={() => set('modeOption', m.id)}>
                                            {m.label}
                                        </button>
                                    ))}
                                </nav>
                            </div>

                            {/* 各模式內容區 */}
                            {renderMode()}
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
};

const rootElement = document.getElementById('root');
if (rootElement) {
    const root = ReactDOM.createRoot(rootElement);
    root.render(<App />);
}
