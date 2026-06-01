const { useState, useEffect, useMemo } = React;

/**
 * Chiefly - 主應用程式 (UI Layer)
 */
function App() {
    const [state, setState] = useState(() => ChieflyLogic.initState());
    const [isSidebarOpen, setSidebarOpen] = useState(true);
    const [isSettingsOpen, setSettingsOpen] = useState(false);
    const [showBackToTop, setShowBackToTop] = useState(false);
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [isCustomThemeOpen, setCustomThemeOpen] = useState(false);

    // 獲取當前工作表
    const currentSheet = useMemo(() => {
        const sheet = state.sheets.find(s => s.id === state.currentSheetId) || state.sheets[0];
        // 確保新欄位存在
        return {
            jobTitleSize: 1.2,
            tagSize: 1.25,
            assignmentTagSize: 0.85,
            isMultiSelect: true,
            theme: 'theme-dark',
            customColors: {
                bgMain: '#0f172a',
                sidebarBg: '#1e293b',
                cardBg: '#1e293b',
                cardHeaderBg: '#0f172a',
                tagBg: 'rgba(255, 255, 255, 0.1)',
                tagText: '#ffffff',
                textMain: '#ffffff',
                textMuted: '#e2e8f0',
                primary: '#818cf8'
            },
            ...sheet
        };
    }, [state.sheets, state.currentSheetId]);

    // 自訂主題 CSS 變數注入
    const customThemeStyles = useMemo(() => {
        if (currentSheet.theme !== 'theme-custom') return {};
        const c = currentSheet.customColors;
        return {
            '--c-bgMain': c.bgMain,
            '--c-sidebarBg': c.sidebarBg,
            '--c-cardBg': c.cardBg,
            '--c-cardHeaderBg': c.cardHeaderBg,
            '--c-tagBg': c.tagBg,
            '--c-tagText': c.tagText,
            '--c-textMain': c.textMain,
            '--c-textMuted': c.textMuted,
            '--c-primary': c.primary
        };
    }, [currentSheet.theme, currentSheet.customColors]);

    // 儲存狀態
    useEffect(() => {
        ChieflyLogic.saveState(state);
    }, [state]);

    // 任務完成訊號
    useEffect(() => {
        if (window.updateLoading) window.updateLoading(100, '任務完成');
        const finish = () => {
            if (window.loadApp && typeof window.loadApp.finish === 'function') window.loadApp.finish();
            else if (window.Loader && typeof window.Loader.finish === 'function') window.Loader.finish();
            else if (typeof reveal === 'function') reveal(false);
        };
        setTimeout(finish, 300);
    }, []);

    // 監聽滾動
    useEffect(() => {
        const handleScroll = () => setShowBackToTop(window.scrollY > 200);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // 內部輔助：更新當前工作表
    const updateCurrentSheet = (updater) => {
        setState(prev => {
            const index = prev.sheets.findIndex(s => s.id === prev.currentSheetId);
            if (index === -1) return prev;
            const newSheets = [...prev.sheets];
            newSheets[index] = updater(newSheets[index]);
            return { ...prev, sheets: newSheets };
        });
    };

    // --- 工作表管理 ---
    const handleAddSheet = () => {
        const name = prompt("請輸入新工作表名稱：", "新工作表");
        if (!name) return;
        const newSheet = {
            ...currentSheet,
            id: 'sheet_' + Date.now(),
            name: name,
            assignments: {},
            hiddenJobIds: []
        };
        setState(prev => ({
            ...prev,
            sheets: [...prev.sheets, newSheet],
            currentSheetId: newSheet.id
        }));
    };

    const handleSwitchSheet = (id) => {
        setState(prev => ({ ...prev, currentSheetId: id }));
        setSelectedStudent(null);
    };

    const handleRenameSheet = () => {
        const name = prompt("重新命名工作表：", currentSheet.name);
        if (!name || name === currentSheet.name) return;
        updateCurrentSheet(s => ({ ...s, name: name }));
    };

    const handleDeleteSheet = () => {
        if (state.sheets.length <= 1) {
            alert("至少需保留一個工作表！");
            return;
        }
        if (!confirm(`確定要刪除「${currentSheet.name}」嗎？`)) return;
        setState(prev => {
            const newSheets = prev.sheets.filter(s => s.id !== prev.currentSheetId);
            return {
                ...prev,
                sheets: newSheets,
                currentSheetId: newSheets[0].id
            };
        });
    };

    // --- 匯入匯出 ---
    const handleExport = async () => {
        const buffer = await ChieflyLogic.exportData(state);
        const blob = new Blob([buffer], { type: 'application/gzip' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        const now = new Date();
        const dateStr = now.getFullYear() + String(now.getMonth() + 1).padStart(2, '0') + String(now.getDate()).padStart(2, '0');
        a.href = url;
        a.download = `各司其職_備份_${dateStr}.json.gz`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const handleImport = () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json,.gz,.json.gz';
        input.onchange = async (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const buffer = await file.arrayBuffer();
            try {
                const importedState = await ChieflyLogic.importData(buffer);
                if (confirm("匯入將覆蓋目前所有資料，確定嗎？")) {
                    setState(importedState);
                }
            } catch (err) {
                alert("匯入失敗: " + err.message);
            }
        };
        input.click();
    };

    const handleGenerateWord = () => {
        const blob = ChieflyLogic.generateWordDoc(currentSheet);
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `各司其職_${currentSheet.name}.doc`;
        a.click();
        URL.revokeObjectURL(url);
    };

    // --- 分配邏輯 ---
    const handleApplySettings = () => {
        const newJobs = ChieflyLogic.parseJobs(currentSheet.settings.jobsText);
        const oldJobs = currentSheet.activeJobs;
        const oldByName = {};
        oldJobs.forEach(j => { oldByName[j.name] = j; });
        const mergedJobs = newJobs.map(nj => {
            const old = oldByName[nj.name];
            return old ? { ...nj, id: old.id } : nj;
        });
        const newIdSet = new Set(mergedJobs.map(j => j.id));
        const filteredAssignments = {};
        Object.keys(currentSheet.assignments).forEach(id => {
            if (newIdSet.has(id)) filteredAssignments[id] = currentSheet.assignments[id];
        });
        const filteredHidden = currentSheet.hiddenJobIds.filter(id => newIdSet.has(id));
        updateCurrentSheet(s => ({
            ...s,
            activeJobs: mergedJobs,
            assignments: filteredAssignments,
            hiddenJobIds: filteredHidden
        }));
        setSettingsOpen(false);
    };
    
    const handleSmartAllocate = () => {
        if (!confirm("確定要進行隨機分配嗎？(將保留目前已分配人員)")) return;
        const visibleJobs = currentSheet.activeJobs.filter(j => !currentSheet.hiddenJobIds.includes(j.id));
        const students = ChieflyLogic.parseStudents(currentSheet.settings.studentsText);
        const result = ChieflyLogic.smartAllocate(visibleJobs, students, currentSheet.assignments);
        updateCurrentSheet(s => ({ ...s, assignments: result }));
    };

    const handleClearAssignments = () => {
        if (!confirm("確定要重置目前的職位分配嗎？")) return;
        updateCurrentSheet(s => ({ ...s, assignments: {} }));
    };

    const toggleJobVisibility = (jobId, hidden) => {
        if (hidden && !confirm("確定要隱藏此職位卡嗎？")) return;
        updateCurrentSheet(s => ({
            ...s,
            hiddenJobIds: hidden ? [...s.hiddenJobIds, jobId] : s.hiddenJobIds.filter(id => id !== jobId)
        }));
    };

    const removeAssignment = (jobId, studentName) => {
        updateCurrentSheet(s => ({
            ...s,
            assignments: {
                ...s.assignments,
                [jobId]: (s.assignments[jobId] || []).filter(str => str !== studentName)
            }
        }));
    };

    const onDropToJob = (jobId, studentName, fromJobId = null) => {
        updateCurrentSheet(s => {
            const currentAssignments = { ...s.assignments };
            if (!s.isMultiSelect) {
                Object.keys(currentAssignments).forEach(jid => {
                    currentAssignments[jid] = (currentAssignments[jid] || []).filter(name => name !== studentName);
                });
            } else if (fromJobId && fromJobId !== jobId) {
                currentAssignments[fromJobId] = (currentAssignments[fromJobId] || []).filter(name => name !== studentName);
            }
            const targetJobAssignments = currentAssignments[jobId] || [];
            if (targetJobAssignments.includes(studentName)) return { ...s, assignments: currentAssignments };
            return {
                ...s,
                assignments: { ...currentAssignments, [jobId]: [...targetJobAssignments, studentName] }
            };
        });
    };

    const renderStudentTag = (name, jobId = null) => {
        const isSelected = selectedStudent === name;
        return (
            <div 
                key={`${jobId}-${name}`}
                className={`student-tag ${isSelected ? 'selected' : ''}`}
                draggable
                onDragStart={(e) => {
                    e.dataTransfer.setData("studentName", name);
                    e.dataTransfer.setData("fromJobId", jobId || "");
                }}
                onClick={() => { if (!jobId) setSelectedStudent(isSelected ? null : name); }}
                style={{ 
                    fontSize: `${jobId ? currentSheet.assignmentTagSize : currentSheet.tagSize}rem`,
                    fontWeight: 'bold',
                    background: isSelected ? 'var(--primary)' : 'var(--tag-bg)',
                    color: isSelected ? 'white' : 'var(--tag-text)',
                    border: isSelected ? '2px solid var(--primary)' : '1px solid var(--glass-border)'
                }}
            >
                {name}
                {jobId && (
                    <span className="tag-remove" onClick={(e) => { e.stopPropagation(); removeAssignment(jobId, name); }}>×</span>
                )}
            </div>
        );
    };

    const libraryStudents = useMemo(() => {
        const all = ChieflyLogic.parseStudents(currentSheet.settings.studentsText);
        if (currentSheet.isMultiSelect) return all;
        const assignedNames = new Set(Object.values(currentSheet.assignments).flat());
        return all.filter(name => !assignedNames.has(name));
    }, [currentSheet.settings.studentsText, currentSheet.assignments, currentSheet.isMultiSelect]);

    const themes = [
        { id: 'theme-dark', name: '經典深色', color: '#0f172a' },
        { id: 'theme-light', name: '舒適淺灰', color: '#e2e8f0' },
        { id: 'theme-ocean', name: '經典海洋藍', color: '#1e40af' },
        { id: 'theme-forest', name: '清新薄荷', color: '#065f46' },
        { id: 'theme-custom', name: '🎨 自訂', color: 'linear-gradient(45deg, #ff0066, #44aa99)' }
    ];

    return (
        <div className={`app-container ${currentSheet.theme}`} style={customThemeStyles}>
            <aside className={`sidebar ${isSidebarOpen ? '' : 'collapsed'}`}>
                <div className="sidebar-toggle" onClick={() => setSidebarOpen(!isSidebarOpen)}>{isSidebarOpen ? '❮' : '❯'}</div>
                <div style={{ display: isSidebarOpen ? 'flex' : 'none', flexDirection: 'column', gap: '0.75rem', height: '100%' }}>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button className="btn btn-primary" style={{ flex: 1, fontSize: '1.2rem', padding: '0.6rem' }} onClick={() => setSettingsOpen(true)}>⚙️ 系統設定</button>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button className="btn btn-secondary" style={{ flex: 1, fontSize: '1rem', padding: '0.6rem' }} onClick={handleClearAssignments}>🔄 清空分配</button>
                        <button className="btn btn-primary" style={{ flex: 1.4, fontSize: '1.2rem', padding: '0.6rem' }} onClick={handleSmartAllocate}>🎲 隨機分配</button>
                    </div>
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1rem', minHeight: 0, marginTop: '0.5rem' }}>
                        <section style={{ flex: 1, overflowY: 'auto', minHeight: '0', background: 'rgba(0,0,0,0.1)', borderRadius: '10px', padding: '0.5rem' }}>
                            <h4 style={{ fontSize: '1.1rem', marginBottom: '0.5rem', color: 'var(--text-muted)', position: 'sticky', top: 0, background: 'var(--sidebar-bg)', zIndex: 1 }}>職務待分配</h4>
                            <div className="tags-container" style={{ gap: '4px' }}>
                                {currentSheet.activeJobs.filter(j => currentSheet.hiddenJobIds.includes(j.id)).map(job => (
                                    <div key={job.id} className="student-tag" style={{ borderStyle: 'dashed', cursor: 'pointer', background: 'transparent', fontSize: `${currentSheet.tagSize}rem` }} onClick={() => toggleJobVisibility(job.id, false)}>＋ {job.name}</div>
                                ))}
                            </div>
                        </section>
                        <section style={{ flex: 1.5, overflowY: 'auto', minHeight: '0', padding: '0.5rem', background: 'rgba(0,0,0,0.1)', borderRadius: '10px' }}>
                            <h4 style={{ fontSize: '1.1rem', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>學生標籤 ({libraryStudents.length})</h4>
                            <div className="tags-container" style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '4px' }}>
                                {libraryStudents.map(n => renderStudentTag(n))}
                            </div>
                        </section>
                    </div>
                </div>
            </aside>

            <main className="main-content">
                <header style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '1rem', paddingLeft: '1rem' }}>
                    <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>各司其職 分配系統</h1>
                    <div style={{ marginLeft: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--tag-text)', background: 'var(--card-bg)', padding: '2px 10px', borderRadius: '4px', border: '1px solid var(--glass-border)' }}>正在管理</span>
                        <span style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--primary)', marginRight: '10px' }}>{currentSheet.name}</span>
                        <span className="badge" style={{ fontSize: '0.9rem', background: '#10b981', color: 'white' }}>{currentSheet.isMultiSelect ? '學生可兼任' : '學生一任一職'}</span>
                    </div>
                </header>
                <div className="job-grid" style={{ gridTemplateColumns: `repeat(${currentSheet.gridCols || 6}, 1fr)` }}>
                    {currentSheet.activeJobs.filter(j => !currentSheet.hiddenJobIds.includes(j.id)).map(job => (
                        <JobCard 
                            key={job.id} job={job} jobTitleSize={currentSheet.jobTitleSize}
                            assignedStudents={currentSheet.assignments[job.id] || []}
                            onDrop={(n, f) => onDropToJob(job.id, n, f)}
                            onClick={() => { if (selectedStudent) { onDropToJob(job.id, selectedStudent); setSelectedStudent(null); } }}
                            onRemove={() => toggleJobVisibility(job.id, true)}
                            renderStudentTag={(n) => renderStudentTag(n, job.id)}
                            highlight={!!selectedStudent}
                        />
                    ))}
                </div>
            </main>

            {isSettingsOpen && (
                <div className="modal-overlay" onClick={() => setSettingsOpen(false)}>
                    <div className="modal-container" style={{ maxWidth: '1000px', height: 'auto', maxHeight: '98vh', overflow: 'hidden' }} onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>🛠 系統設定 - {currentSheet.name}</h2>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <button className="btn btn-secondary" style={{ padding: '4px 12px', fontSize: '1rem' }} onClick={handleExport}>📤 匯出</button>
                                <button className="btn btn-secondary" style={{ padding: '4px 12px', fontSize: '1rem' }} onClick={handleImport}>📥 匯入</button>
                                <button className="btn btn-secondary" style={{ padding: '4px 12px', fontSize: '1rem' }} onClick={handleGenerateWord}>📝 Word 檔</button>
                                <button className="btn btn-primary" style={{ padding: '4px 20px', fontSize: '1rem' }} onClick={handleApplySettings}>💾 套用職務</button>
                                <button className="btn btn-secondary" style={{ padding: '4px 20px', fontSize: '1rem'}} onClick={() => setSettingsOpen(false)}>關閉</button>
                            </div>
                        </div>
                        
                        <div style={{ display: 'flex', gap: '1.2rem', flex: 1, minHeight: 0 }}>
                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.75rem', minHeight: 0 }}>
                                <div style={{ flex: 1, display: 'flex', gap: '0.75rem', minHeight: 0 }}>
                                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                                        <label style={{ fontSize: '1.2rem', fontWeight: 600, marginBottom: '0.2rem' }}>職務設定(名稱, 名額)</label>
                                        <textarea style={{ flex: 1, fontSize: '1.05rem', backgroundColor: 'var(--bg-main)', color: 'var(--text-main)', border: '1px solid var(--glass-border)', padding: '0.4rem' }}
                                            value={currentSheet.settings.jobsText} onChange={(e) => updateCurrentSheet(s => ({ ...s, settings: { ...s.settings, jobsText: e.target.value } }))} />
                                    </div>
                                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                                        <label style={{ fontSize: '1.2rem', fontWeight: 600, marginBottom: '0.2rem' }}>學生名單</label>
                                        <textarea style={{ flex: 1, fontSize: '1.05rem', backgroundColor: 'var(--bg-main)', color: 'var(--text-main)', border: '1px solid var(--glass-border)', padding: '0.4rem' }}
                                            value={currentSheet.settings.studentsText} onChange={(e) => updateCurrentSheet(s => ({ ...s, settings: { ...s.settings, studentsText: e.target.value } }))} />
                                    </div>
                                </div>
                                <div style={{ flex: 0.34, padding: '1rem', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', fontSize: '1rem', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                                    <div>💡 編輯完成後請記得儲存並套用設定。職務名可加上數字定義名額給隨機分配使用(用,分開)。</div>
                                    <button className="btn btn-danger" style={{ marginTop: '1rem', fontSize: '1rem', width: 'fit-content', padding: '6px 15px' }} onClick={() => { if(confirm("確定重置整個系統？")) ChieflyLogic.resetStorage(); }}>🧹 系統重置</button>
                                </div>
                            </div>

                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.6rem', overflowY: 'auto', paddingRight: '8px' }}>
                                <div className="sheet-manager" style={{ margin: 0, padding: '0.5rem' }}>
                                    <h4 style={{ marginBottom: '0.4rem', fontSize: '1.2rem', color: 'var(--text-muted)' }}>📂 工作表管理</h4>
                                    <div style={{ display: 'flex', gap: '6px' }}>
                                        <select className="tab-btn" style={{ flex: 1, padding: '6px' }} value={state.currentSheetId} onChange={(e) => handleSwitchSheet(e.target.value)}>
                                            {state.sheets.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                        </select>
                                        <button className="btn btn-primary" style={{ padding: '0 12px', fontSize: '0.85rem' }} onClick={handleAddSheet}>+新增</button>
                                        <button className="btn btn-secondary" style={{ padding: '0 10px', fontSize: '0.85rem' }} onClick={handleRenameSheet}>✎</button>
                                        <button className="btn btn-danger" style={{ padding: '0 10px', fontSize: '0.85rem' }} onClick={handleDeleteSheet}>🗑</button>
                                    </div>
                                </div>

                                <div className="sheet-manager" style={{ margin: 0, padding: '0.5rem' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <h4 style={{ fontSize: '1.2rem', color: 'var(--text-muted)' }}>⚙️ 模式設定</h4>
                                        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '1.2rem', cursor: 'pointer' }}>
                                            <input type="checkbox" checked={currentSheet.isMultiSelect} onChange={(e) => updateCurrentSheet(s => ({ ...s, isMultiSelect: e.target.checked }))}/>
                                            <span>開放學生兼任多職</span>
                                        </label>
                                    </div>
                                </div>

                                <div className="sheet-manager" style={{ margin: 0, padding: '0.5rem' }}>
                                    <h4 style={{ marginBottom: '0.4rem', fontSize: '1.2rem', color: 'var(--text-muted)' }}>📐 版面排列 (一列顯示)</h4>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.4rem' }}>
                                        {[4, 6, 8, 10].map(n => (
                                            <button key={n} className={`tab-btn ${currentSheet.gridCols === n ? 'active' : ''}`} style={{ padding: '6px' }} onClick={() => updateCurrentSheet(s => ({ ...s, gridCols: n }))}>{n}</button>
                                        ))}
                                    </div>
                                </div>

                                <div className="sheet-manager" style={{ margin: 0, padding: '0.6rem' }}>
                                    <h4 style={{ marginBottom: '0.6rem', fontSize: '1.2rem', color: 'var(--text-muted)' }}>🔠 字體大小 (rem)</h4>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                        {[{l:'職位標題', v:currentSheet.jobTitleSize, k:'jobTitleSize', m:0.8, x:2.5}, {l:'標籤欄位', v:currentSheet.tagSize, k:'tagSize', m:0.8, x:2.5}, {l:'職內學生', v:currentSheet.assignmentTagSize, k:'assignmentTagSize', m:0.5, x:2}].map(f => (
                                            <div key={f.k} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                                <span style={{ fontSize: '1.2rem' }}>{f.l} ({f.v})</span>
                                                <input type="range" min={f.m} max={f.x} step="0.05" value={f.v} style={{ width: '120px' }} onChange={(e) => updateCurrentSheet(s => ({ ...s, [f.k]: parseFloat(e.target.value) }))} />
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="sheet-manager" style={{ margin: 0, padding: '0.6rem' }}>
                                    <h4 style={{ marginBottom: '0.6rem', fontSize: '1.2rem', color: 'var(--text-muted)' }}>🎨 介面風格</h4>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.4rem' }}>
                                        {themes.map(t => (
                                            <button 
                                                key={t.id} 
                                                className={`tab-btn ${currentSheet.theme === t.id ? 'active' : ''}`}
                                                style={{ padding: '8px 2px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap', overflow: 'hidden' }}
                                                onClick={() => {
                                                    updateCurrentSheet(s => ({ ...s, theme: t.id }));
                                                    if (t.id === 'theme-custom') setCustomThemeOpen(true);
                                                }}
                                            >
                                                <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: t.color, border: '1px solid rgba(255,255,255,0.2)', flexShrink: 0 }}></span>
                                                {t.name === '🎨 自訂' ? '自訂' : t.name}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {isCustomThemeOpen && (
                <div className="modal-overlay" style={{ zIndex: 3000 }} onClick={() => setCustomThemeOpen(false)}>
                    <div className="modal-container" style={{ maxWidth: '560px', height: 'auto' }} onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2 style={{ fontSize: '1.4rem' }}>🎨 自訂配色調整</h2>
                        </div>
                        
                        <div style={{ background: 'rgba(255,255,255,0.05)', padding: '0.75rem', borderRadius: '8px', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span style={{ fontSize: '1rem', whiteSpace: 'nowrap' }}>快速複製範本：</span>
                            <select id="presetSelect" style={{ flex: 1, padding: '6px', borderRadius: '4px', background: '#334155', color: 'white', border: '1px solid var(--glass-border)' }}>
                                <option value="theme-dark">經典深色</option>
                                <option value="theme-light">舒適淺灰</option>
                                <option value="theme-ocean">經典海洋藍</option>
                                <option value="theme-forest">清新薄荷</option>
                            </select>
                            <button className="btn btn-primary" style={{ padding: '6px 15px', fontSize: '0.9rem' }} onClick={() => {
                                const presetId = document.getElementById('presetSelect').value;
                                const presets = {
                                    'theme-dark': { bgMain: '#0f172a', sidebarBg: '#1e293b', cardBg: '#1e293b', cardHeaderBg: '#0f172a', tagBg: 'rgba(255, 255, 255, 0.1)', tagText: '#ffffff', textMain: '#ffffff', textMuted: '#e2e8f0', primary: '#818cf8' },
                                    'theme-light': { bgMain: '#e2e8f0', sidebarBg: '#cbd5e1', cardBg: '#ffffff', cardHeaderBg: '#f1f5f9', tagBg: '#f1f5f9', tagText: '#000000', textMain: '#1e293b', textMuted: '#475569', primary: '#6366f1' },
                                    'theme-ocean': { bgMain: '#1e40af', sidebarBg: '#1e3a8a', cardBg: '#dbeafe', cardHeaderBg: '#1e3a8a', tagBg: '#ffffff', tagText: '#000000', textMain: '#ffffff', textMuted: '#e0f2fe', primary: '#3b82f6' },
                                    'theme-forest': { bgMain: '#065f46', sidebarBg: '#064e3b', cardBg: '#d1fae5', cardHeaderBg: '#064e3b', tagBg: '#ffffff', tagText: '#000000', textMain: '#ffffff', textMuted: '#d1fae5', primary: '#10b981' }
                                };
                                updateCurrentSheet(s => ({ ...s, customColors: presets[presetId] }));
                            }}>確定複製</button>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem 1.2rem', padding: '0.5rem' }}>
                            {[
                                { l: '主要標題(職務)文字', k: 'textMain' },
                                { l: '學生標籤文字', k: 'tagText' },
                                { l: '職務卡上面底色', k: 'cardHeaderBg' },
                                { l: '職務卡下面底色', k: 'cardBg' },
                                { l: '學生標籤背景', k: 'tagBg' },
                                { l: '側邊欄和設定窗背景', k: 'sidebarBg' },
                                { l: '設定欄位背景', k: 'bgMain' },
                                { l: '品牌按鍵主色', k: 'primary' },
                                { l: '學生標籤文字和其他文字', k: 'textMuted' }
                            ].map(item => (
                                <div key={item.k} style={{ display: 'flex', flexDirection: 'column', gap: '4px', gridColumn: item.k === 'textMuted' ? 'span 2' : 'auto' }}>
                                    <label style={{ fontSize: '1rem', fontWeight: 600 }}>{item.l}</label>
                                    <div style={{ display: 'flex', gap: '6px' }}>
                                        {(() => {
                                            const val = (currentSheet.customColors && currentSheet.customColors[item.k]) || '#888888';
                                            const isRgba = val.startsWith('rgba');
                                            return (
                                                <input type="color" value={isRgba ? '#ffffff' : val} 
                                                    onChange={(e) => updateCurrentSheet(s => ({ ...s, customColors: { ...(s.customColors || {}), [item.k]: e.target.value } }))}
                                                    style={{ width: '36px', height: '36px', padding: 0, border: 'none', cursor: 'pointer', borderRadius: '4px' }}
                                                />
                                            );
                                        })()}
                                        <input type="text" value={currentSheet.customColors ? currentSheet.customColors[item.k] : ''} 
                                            onChange={(e) => updateCurrentSheet(s => ({ ...s, customColors: { ...(s.customColors || {}), [item.k]: e.target.value } }))}
                                            style={{ flex: 1, fontSize: '0.9rem', padding: '6px', borderRadius: '4px', border: '1px solid var(--glass-border)', background: 'rgba(0,0,0,0.2)', color: 'white' }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.2rem', gap: '10px' }}>
                            <button className="btn btn-secondary" onClick={() => setCustomThemeOpen(false)}>取消</button>
                            <button className="btn btn-primary" style={{ padding: '8px 35px' }} onClick={() => setCustomThemeOpen(false)}>儲存並結束</button>
                        </div>
                    </div>
                </div>
            )}
            <div className={`back-to-top ${showBackToTop ? 'visible' : ''}`} onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>↑</div>
        </div>
    );
}

function JobCard({ job, jobTitleSize, assignedStudents, onDrop, onClick, onRemove, renderStudentTag, highlight }) {
    const [isDragOver, setDragOver] = useState(false);
    return (
        <div className={`job-card ${isDragOver ? 'dragover' : ''} ${highlight ? 'highlight-pulse' : ''}`} onClick={onClick} onDragOver={(e) => { e.preventDefault(); setDragOver(true); }} onDragLeave={() => setDragOver(false)}
            onDrop={(e) => { e.preventDefault(); setDragOver(false); const name = e.dataTransfer.getData("studentName"); const fromId = e.dataTransfer.getData("fromJobId") || null; if (name) onDrop(name, fromId); }}
            style={{ border: highlight ? '2px dashed var(--primary)' : '1px solid var(--glass-border)', background: 'var(--card-bg)' }}>
            <div className="job-header">
                <span className="job-title" style={{ fontSize: `${jobTitleSize}rem`, fontWeight: 800 }}>{job.name}</span>
                <span className="tag-remove" style={{ fontSize: '1.2rem' }} onClick={(e) => { e.stopPropagation(); onRemove(); }}>×</span>
            </div>
            <div className="tags-container">{assignedStudents.map(student => renderStudentTag(student))}</div>
        </div>
    );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
