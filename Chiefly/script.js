const { useState, useEffect, useMemo } = React;

/**
 * Chiefly - 主應用程式 (UI Layer)
 */
function App() {
    const [state, setState] = useState(() => {
        const init = ChieflyLogic.initState();
        return { 
            ...init, 
            hiddenJobIds: init.hiddenJobIds || [],
            gridCols: init.gridCols || 6
        };
    });
    const [isSidebarOpen, setSidebarOpen] = useState(true);
    const [activeTab, setActiveTab] = useState('library');
    const [showBackToTop, setShowBackToTop] = useState(false);
    const [selectedStudent, setSelectedStudent] = useState(null); // 已選取的學生，用於點擊分配

    // 儲存狀態至 localStorage
    useEffect(() => {
        ChieflyLogic.saveState(state);
    }, [state]);

    // 任務完成訊號：告知載入器遮罩可以退場了
    useEffect(() => {
        if (window.updateLoading) {
            window.updateLoading(100, '任務完成');
        }
        
        const finish = () => {
            if (window.loadApp && typeof window.loadApp.finish === 'function') {
                window.loadApp.finish();
            } else if (window.Loader && typeof window.Loader.finish === 'function') {
                window.Loader.finish();
            } else if (typeof reveal === 'function') {
                reveal(false); // 呼叫 loader_engine 的 reveal
            }
        };
        
        // 延遲一點點讓使用者看見 100% 滿格感
        setTimeout(finish, 300);
    }, []);

    // 監聽滾動以顯示回頂按鈕 (規則 #5)
    useEffect(() => {
        const handleScroll = () => {
            setShowBackToTop(window.scrollY > 200);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // 套用設定：僅更新職位，暫不強行清空分配
    const handleApplySettings = () => {
        const jobs = ChieflyLogic.parseJobs(state.settings.jobsText);
        setState(prev => ({ 
            ...prev, 
            activeJobs: jobs,
            hiddenJobIds: []
        }));
        setActiveTab('library'); // 切換到元件庫
    };
    
    // 智慧隨機分配
    const handleSmartAllocate = () => {
        if (!confirm("確定要進行智慧隨機分配嗎？此操作將覆蓋目前的分配狀況。")) return;
        const visibleJobs = state.activeJobs.filter(j => !state.hiddenJobIds.includes(j.id));
        const result = ChieflyLogic.smartAllocate(visibleJobs, ChieflyLogic.parseStudents(state.settings.studentsText));
        setState(prev => ({ ...prev, assignments: result }));
    };

    // 重置職位：僅重置目前的分配狀況
    const handleClearAssignments = () => {
        if (!confirm("確定要重置目前的職位分配嗎？")) return;
        setState(prev => ({ ...prev, assignments: {} }));
    };

    const handleFullReset = () => {
        if (confirm("確定要一鍵系統重置嗎？所有設定與分配都將消失。")) {
            ChieflyLogic.resetStorage();
        }
    };

    // 移除/隱藏職位卡
    const toggleJobVisibility = (jobId, hidden) => {
        if (hidden && !confirm("確定要暫時移除此職位卡嗎？")) return;
        setState(prev => ({
            ...prev,
            hiddenJobIds: hidden 
                ? [...prev.hiddenJobIds, jobId]
                : prev.hiddenJobIds.filter(id => id !== jobId)
        }));
    };

    // 移除單一學生的分配
    const removeAssignment = (jobId, studentName) => {
        setState(prev => ({
            ...prev,
            assignments: {
                ...prev.assignments,
                [jobId]: prev.assignments[jobId].filter(s => s !== studentName)
            }
        }));
    };

    // 拖放處理：從庫或卡片移動到卡片
    const onDropToJob = (jobId, studentName, fromJobId = null) => {
        setState(prev => {
            const currentAssignments = { ...prev.assignments };
            
            // 如果是從另一個職務移過來的，先從原職務移除
            if (fromJobId && fromJobId !== jobId) {
                currentAssignments[fromJobId] = (currentAssignments[fromJobId] || []).filter(s => s !== studentName);
            }

            const targetJobAssignments = currentAssignments[jobId] || [];
            if (targetJobAssignments.includes(studentName)) {
                // 如果目標職務已經有該生，且是從別處移來，則只執行移除原處
                return { ...prev, assignments: currentAssignments };
            }

            return {
                ...prev,
                assignments: {
                    ...currentAssignments,
                    [jobId]: [...targetJobAssignments, studentName]
                }
            };
        });
    };

    // 渲染學生標籤
    const renderStudentTag = (name, jobId = null) => (
        <div 
            key={`${jobId}-${name}`}
            className="student-tag"
            draggable
            onDragStart={(e) => {
                e.dataTransfer.setData("studentName", name);
                e.dataTransfer.setData("fromJobId", jobId || "");
            }}
            onClick={() => {
                if (!jobId) {
                    setSelectedStudent(selectedStudent === name ? null : name);
                }
            }}
            style={{ 
                fontSize: '1.25rem',
                fontWeight: 'bold',
                border: selectedStudent === name ? '2px solid var(--primary)' : '1px solid rgba(255,255,255,0.1)',
                background: selectedStudent === name ? 'var(--primary)' : '#0f172a',
                color: selectedStudent === name ? 'white' : '#f1f5f9',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '0 4px',
                minWidth: '32px',
                height: '32px',
                borderRadius: '4px'
            }}
        >
            {name}
            {jobId && (
                <span className="tag-remove" style={{ fontSize: '0.8rem', marginLeft: '1px' }} onClick={() => removeAssignment(jobId, name)}>×</span>
            )}
        </div>
    );

    return (
        <div className="app-container">
            {/* 側邊欄 */}
            <aside className={`sidebar ${isSidebarOpen ? '' : 'collapsed'}`}>
                <div className="sidebar-toggle" onClick={() => setSidebarOpen(!isSidebarOpen)}>
                    {isSidebarOpen ? '❮' : '❯'}
                </div>

                {/* 頂部按鈕 (規則：避免誤觸，置頂並排) */}
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                    <button className="btn btn-primary" style={{ flex: 1, fontSize: '1rem', padding: '0.5rem' }} onClick={handleSmartAllocate}>🎲 隨機分配</button>
                    <button className="btn btn-danger" style={{ flex: 1, fontSize: '1rem', padding: '0.5rem' }} onClick={handleFullReset}>🧹 系統重置</button>
                </div>

                <div className="tabs">
                    <button className={`tab-btn ${activeTab === 'library' ? 'active' : ''}`} onClick={() => setActiveTab('library')}>元件庫</button>
                    <button className={`tab-btn ${activeTab === 'settings' ? 'active' : ''}`} onClick={() => setActiveTab('settings')}>文字設定</button>
                </div>

                <div className="sidebar-content" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                    {activeTab === 'settings' ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', height: '100%' }}>
                            <div style={{ display: 'flex', gap: '1rem', flex: 1 }}>
                                <div style={{ flex: 2, display: 'flex', flexDirection: 'column' }}>
                                    <label style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.3rem' }}>職務設定 (名稱, 名額)</label>
                                    <textarea 
                                        style={{ flex: 1, minHeight: '100px', fontSize: '1.1rem' }}
                                        value={state.settings.jobsText}
                                        onChange={(e) => setState(prev => ({ ...prev, settings: { ...prev.settings, jobsText: e.target.value } }))}
                                    />
                                </div>
                                <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                                    <label style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.3rem' }}>學生名單</label>
                                    <textarea 
                                        style={{ flex: 1, minHeight: '100px', fontSize: '1.1rem' }}
                                        value={state.settings.studentsText}
                                        onChange={(e) => setState(prev => ({ ...prev, settings: { ...prev.settings, studentsText: e.target.value } }))}
                                    />
                                </div>
                            </div>
                            <div style={{ padding: '0.5rem', background: 'rgba(0,0,0,0.3)', borderRadius: '10px', border: '1px solid var(--glass-border)' }}>
                                <label style={{ fontSize: '1rem', fontWeight: 600, display: 'block', marginBottom: '0.4rem' }}>一列顯示職位數</label>
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    {[4, 6, 8, 10].map(n => (
                                        <button 
                                            key={n}
                                            className={`tab-btn ${state.gridCols === n ? 'active' : ''}`}
                                            style={{ padding: '4px' }}
                                            onClick={() => setState(prev => ({ ...prev, gridCols: n }))}
                                        >
                                            {n}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                                <button className="btn btn-primary" style={{ flex: 2 }} onClick={handleApplySettings}>💾 套用設定</button>
                                <button className="btn btn-secondary" style={{ flex: 1 }} onClick={handleClearAssignments}>🔄 重置職位</button>
                            </div>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', height: '100%', minHeight: 0 }}>
                            <section style={{ flex: 1, overflowY: 'auto', minHeight: '0', paddingBottom: '0.5rem' }}>
                                <h4 style={{ fontSize: '1.1rem', marginBottom: '0.5rem', color: 'var(--text-muted)', position: 'sticky', top: 0, background: 'var(--sidebar-bg)', padding: '4px 0', zIndex: 1 }}>職務待分配 (點擊恢復)</h4>
                                <div className="tags-container" style={{ padding: '4px' }}>
                                    {state.activeJobs.filter(j => state.hiddenJobIds.includes(j.id)).map(job => (
                                        <div 
                                            key={job.id} 
                                            className="student-tag" 
                                            style={{ borderStyle: 'dashed', cursor: 'pointer', background: 'transparent' }}
                                            onClick={() => toggleJobVisibility(job.id, false)}
                                        >
                                            ＋ {job.name}
                                        </div>
                                    ))}
                                    {state.activeJobs.filter(j => state.hiddenJobIds.includes(j.id)).length === 0 && (
                                        <div style={{ fontSize: '0.85rem', color: '#475569', fontStyle: 'italic' }}>無暫存職位</div>
                                    )}
                                </div>
                            </section>
                            <section style={{ marginTop: 'auto', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '1rem', paddingBottom: '1rem' }}>
                                <h4 style={{ fontSize: '1.1rem', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>學生標籤 (點選或拖放)</h4>
                                <div className="tags-container" style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '4px' }}>
                                    {ChieflyLogic.parseStudents(state.settings.studentsText).map(name => renderStudentTag(name))}
                                </div>
                            </section>
                        </div>
                    )}
                </div>
            </aside>

            {/* 主工作區 */}
            <main className="main-content">
                <header style={{ marginBottom: '2rem' }}>
                    <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>各司其職 分配系統</h1>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>拖曳左側學生標籤至卡片內進行分配</p>
                </header>

                <div className="job-grid" style={{ gridTemplateColumns: `repeat(${state.gridCols}, 1fr)` }}>
                    {state.activeJobs.filter(j => !state.hiddenJobIds.includes(j.id)).map(job => (
                        <JobCard 
                            key={job.id}
                            job={job}
                            assignedStudents={state.assignments[job.id] || []}
                            onDrop={(name, fromId) => onDropToJob(job.id, name, fromId)}
                            onClick={() => {
                                if (selectedStudent) {
                                    onDropToJob(job.id, selectedStudent);
                                    setSelectedStudent(null);
                                }
                            }}
                            onRemove={() => toggleJobVisibility(job.id, true)}
                            renderStudentTag={(name) => renderStudentTag(name, job.id)}
                            highlight={!!selectedStudent}
                        />
                    ))}
                </div>
            </main>

            {/* 回頂按鈕 (規則 #5) */}
            <div 
                className={`back-to-top ${showBackToTop ? 'visible' : ''}`}
                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            >
                ↑
            </div>
        </div>
    );
}

/**
 * 職位卡片組件
 */
function JobCard({ job, assignedStudents, onDrop, onClick, onRemove, renderStudentTag, highlight }) {
    const [isDragOver, setDragOver] = useState(false);

    return (
        <div 
            className={`job-card ${isDragOver ? 'dragover' : ''} ${highlight ? 'highlight-pulse' : ''}`}
            onClick={onClick}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                const name = e.dataTransfer.getData("studentName");
                const fromId = e.dataTransfer.getData("fromJobId") || null;
                if (name) onDrop(name, fromId);
            }}
            style={{ border: highlight ? '2px dashed var(--primary)' : '1px solid var(--glass-border)' }}
        >
            <div className="job-header">
                <span className="job-title">{job.name}</span>
                <span 
                    className="tag-remove" 
                    style={{ fontSize: '1rem', marginLeft: '4px' }} 
                    onClick={(e) => { e.stopPropagation(); onRemove(); }}
                    title="暫時移除此職位"
                >×</span>
            </div>
            <div className="tags-container">
                {assignedStudents.map(student => renderStudentTag(student))}
            </div>
        </div>
    );
}

// 啟動 React
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
