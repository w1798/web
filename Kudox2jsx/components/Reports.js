const Reports = React.memo(function Reports() {
    const { 
        modals, setModal, refresh,
        students = [], logs = [], treasureDefs = []
    } = React.useContext(AppContext);

    const [reportView, setReportView] = React.useState('points');
    const [sortBy, setSortBy] = React.useState('score');
    const [currentPage, setCurrentPage] = React.useState(1);
    const [selectedStudent, setSelectedStudent] = React.useState('');
    const [timeFilter, setTimeFilter] = React.useState('today');
    const pageSize = 50;

    const timeRange = React.useMemo(() => {
        if (timeFilter === 'all') return null;
        let s = new Date(), e = new Date();
        s.setHours(0, 0, 0, 0);
        e.setHours(23, 59, 59, 999);
        if (timeFilter === 'today') return { start: s.getTime(), end: e.getTime() };
        if (timeFilter === 'week') { s.setDate(s.getDate() - (s.getDay() || 7) + 1); e.setDate(s.getDate() + 6); return { start: s.getTime(), end: e.getTime() }; }
        if (timeFilter === 'lastWeek') { s.setDate(s.getDate() - (s.getDay() || 7) + 1 - 7); e.setDate(s.getDate() + 6); return { start: s.getTime(), end: e.getTime() }; }
        if (timeFilter === 'month') { s.setDate(1); let skip = new Date(s); skip.setMonth(skip.getMonth() + 1); skip.setDate(0); skip.setHours(23, 59, 59, 999); return { start: s.getTime(), end: skip.getTime() }; }
        if (timeFilter === 'custom') {
            const sval = document.getElementById('startDateFilter')?.value;
            const evalStr = document.getElementById('endDateFilter')?.value;
            if (sval && evalStr) {
                let sd = new Date(sval); sd.setHours(0, 0, 0, 0);
                let ed = new Date(evalStr); ed.setHours(23, 59, 59, 999);
                return { start: sd.getTime(), end: ed.getTime() };
            }
        }
        return null;
    }, [timeFilter]);

    const filteredLogs = React.useMemo(() => {
        return logs.filter(l => {
            if (selectedStudent && l.sID !== selectedStudent) return false;
            const ts = (typeof l.TS === 'number') ? l.TS : (window.StampTool ? window.StampTool.decode(l.TS)?.getTime() : 0);
            if (timeRange && (ts < timeRange.start || ts > timeRange.end)) return false;
            return true;
        });
    }, [logs, selectedStudent, timeRange]);

    const pointsData = React.useMemo(() => {
        if (reportView === 'treasure') {
            if (!treasureDefs.length) return [];
            let data = students.map(s => {
                const totalTr = treasureDefs.reduce((sum, td) => sum + ((s.tr && s.tr[td.id]) || 0), 0);
                return { ...s, reportValue: totalTr };
            });
            if (sortBy === 'name') data.sort((a, b) => a.id.localeCompare(b.id, 'zh-TW'));
            else data.sort((a, b) => b.reportValue - a.reportValue);
            return data;
        }
        let data = students.map(s => {
            let pts = filteredLogs.filter(l => l.sID === s.id).reduce((sum, l) => sum + (l.iSum === 1 ? 0 : l.pt), 0);
            return { ...s, reportValue: pts };
        });
        if (sortBy === 'name') data.sort((a, b) => a.id.localeCompare(b.id, 'zh-TW'));
        else data.sort((a, b) => b.reportValue - a.reportValue);
        return data;
    }, [students, filteredLogs, reportView, sortBy, treasureDefs]);

    const pagedActivityLogs = React.useMemo(() => {
        const f = filteredLogs.map((log, index) => ({ log, index }))
            .sort((a, b) => {
                const tsDiff = (typeof b.log.TS === 'number' ? b.log.TS : 0) - (typeof a.log.TS === 'number' ? a.log.TS : 0);
                if (tsDiff !== 0) return tsDiff;
                return b.index - a.index;
            })
            .map(item => item.log);
        const totalPages = Math.ceil(f.length / pageSize) || 1;
        const pg = Math.min(currentPage, totalPages);
        const start = (pg - 1) * pageSize;
        return { logs: f.slice(start, start + pageSize), totalPages, page: pg };
    }, [filteredLogs, currentPage]);

    const handleStudentClick = (sid) => {
        setSelectedStudent(sid);
        setCurrentPage(1);
        document.getElementById('resetReportFilterBtn')?.classList.remove('hidden');
        document.getElementById('resetReportFilterBtn2')?.classList.remove('hidden');
        document.getElementById('resetReportFilterBtnAside')?.classList.remove('hidden');
    };

    const resetFilter = React.useCallback(() => {
        setSelectedStudent('');
        setCurrentPage(1);
        document.getElementById('resetReportFilterBtn')?.classList.add('hidden');
        document.getElementById('resetReportFilterBtn2')?.classList.add('hidden');
        document.getElementById('resetReportFilterBtnAside')?.classList.add('hidden');
    }, []);

    const handleViewChange = (v) => {
        setReportView(v);
        setCurrentPage(1);
    };

    const handleSortChange = (s) => {
        setSortBy(s);
        setCurrentPage(1);
    };

    React.useEffect(() => {
        window._reportsTimeFilter = timeFilter;
    }, [timeFilter]);

    React.useEffect(() => {
        if (modals.reports) {
            setTimeFilter('today');
            setReportView('points');
            setSortBy('score');
            setCurrentPage(1);
            setSelectedStudent('');
            const filter = document.getElementById('timeRangeFilter');
            if (filter) filter.value = 'today';
            const layout = document.querySelector('.reports-body-layout');
            if (layout) { layout.classList.remove('mobile-show-left'); layout.classList.add('mobile-show-right'); }
        }
    }, [modals.reports]);

    // 切換到「自訂日期」時自動填入結束日期
    React.useEffect(() => {
        if (timeFilter === 'custom') {
            const eD = document.getElementById('endDateFilter');
            if (eD && !eD.value) eD.value = new Date().toISOString().slice(0, 10);
        }
    }, [timeFilter]);

    // Pie chart
    const pieData = React.useMemo(() => {
        if (!filteredLogs.length) return null;
        const stats = {};
        let total = 0;
        filteredLogs.forEach(l => { stats[l.lb] = (stats[l.lb] || 0) + 1; total++; });
        const labels = Object.keys(stats).sort((a, b) => stats[b] - stats[a]);
        const colors = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#06b6d4', '#8b5cf6'];
        let cum = 0;
        const parts = labels.map((l, i) => {
            const p = (stats[l] / total) * 100;
            const c = colors[i % colors.length];
            const part = `${c} ${cum}% ${cum + p}%`;
            cum += p;
            return { label: l, count: stats[l], color: c, percent: p };
        });
        return parts;
    }, [filteredLogs]);

    const activeLabel = selectedStudent || '全班';

    if (reportView === 'treasure' && treasureDefs.length === 0) {
    }

    return (
        <React.Fragment>
            <div id="reportsModal" className={`modal-overlay ${modals.reports ? '' : 'hidden'}`}>
                <div className="modal-content reports-modal-content">
                    <div className="modal-header" style={{ flexWrap: 'wrap' }}>
                        <h2>成長排名<span className="report-title-note">(此報表會排除不列入點數項目後的總點數)</span></h2>
                        <button className="close-modal-btn reports-close" onClick={() => setModal('reports', false)}>&times;</button>
                        <div className="reports-mobile-tabs hidden-desktop" style={{ width: '100%', marginTop: '0.5rem' }}>
                            <button className="reports-mobile-tab active" data-target="reports-right-panel">報表內容</button>
                            <button className="reports-mobile-tab" data-target="reports-left-panel">學生狀態</button>
                        </div>
                    </div>

                    <div className="reports-body-layout">
                        <div className="reports-left-panel">
                            <div className="reports-controls-compact" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <label style={{ fontSize: '0.85em', color: 'var(--text-secondary)', fontWeight: 600, whiteSpace: 'nowrap', marginRight: '0.5rem' }}>報表內容</label>
                                    <div className="sort-tabs" style={{ flex: 1, margin: 0 }}>
                                        <button className={`report-view-btn ${reportView === 'points' ? 'active' : ''}`} onClick={() => handleViewChange('points')}>點數</button>
                                        <button className={`report-view-btn ${reportView === 'treasure' ? 'active' : ''}`} onClick={() => handleViewChange('treasure')}>寶物</button>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <label style={{ fontSize: '0.85em', color: 'var(--text-secondary)', fontWeight: 600, whiteSpace: 'nowrap', marginRight: '0.5rem' }}>排序方式</label>
                                    <div className="sort-tabs" style={{ flex: 1, margin: 0 }}>
                                        <button className={`sort-btn ${sortBy === 'score' ? 'active' : ''}`} onClick={() => handleSortChange('score')}>{reportView === 'treasure' ? '寶物' : '點數'}</button>
                                        <button className={`sort-btn ${sortBy === 'name' ? 'active' : ''}`} onClick={() => handleSortChange('name')}>姓名</button>
                                    </div>
                                </div>
                            </div>
                            <h3 className="report-panel-header">
                                <button id="reportsRankingBtn" className="small-btn gold-btn" style={{ fontSize: '0.85em', padding: '0.15rem 0.6rem', marginRight: 'auto', marginLeft: '-0.2rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>🏆 排名總表</button>
                                <div className="report-panel-header-actions">
                                    <button id="copyPointsBtn" className="small-btn primary-btn" style={{ fontSize: '0.75em', padding: '0.15rem 0.4rem' }}>複製點數</button>
                                    <button id="copyNamesBtn" className="small-btn primary-btn" style={{ fontSize: '0.75em', padding: '0.15rem 0.4rem' }}>複製姓名</button>
                                    <button id="resetReportFilterBtn" className={`small-btn secondary-btn ${!selectedStudent ? 'hidden' : ''}`} onClick={resetFilter}>全班</button>
                                </div>
                            </h3>
                            <ul className="reports-list" id="reportsList" style={{ flex: 1, overflowY: 'auto' }}>
                                {reportView === 'treasure' && !treasureDefs.length ? (
                                    <li style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '2rem' }}>尚未定義寶物。</li>
                                ) : pointsData.map((s, idx) => (
                                    <li key={s.id} className={`report-item ${selectedStudent === s.id ? 'active' : ''}`} onClick={() => handleStudentClick(s.id)} style={{ cursor: 'pointer' }}>
                                        <div className="report-item-left">
                                            <span className="report-rank">#{idx + 1}</span>
                                            <img src={window.getAvatarUrl ? window.getAvatarUrl(s.aU || s.id, s.aS) : ''} className="report-avatar" />
                                            <span className="report-name">{s.id}</span>
                                        </div>
                                        {reportView === 'treasure' ? (
                                            <div className="report-item-right" style={{ fontSize: '0.9em' }}>
                                                {[...treasureDefs].sort(window.sortItems).map(td => {
                                                    const qty = (s.tr && s.tr[td.id]) || 0;
                                                    return qty !== 0 ? `${td.ic}${qty} ` : '';
                                                }).filter(Boolean).join('') || <span style={{ color: 'var(--text-secondary)', fontSize: '0.85em' }}>無寶物</span>}
                                            </div>
                                        ) : (
                                            <div className={`report-item-right ${s.reportValue > 0 ? 'positive-val' : 'negative-val'}`}>
                                                {s.reportValue > 0 ? '+' : ''}{s.reportValue}
                                            </div>
                                        )}
                                    </li>
                                ))}
                            </ul>
                        </div>

                        <div className="reports-right-panel">
                            <div id="reportFilters" className="report-filters-inline">
                                <div className="input-group">
                                    <label>時間範圍</label>
                                    <select id="timeRangeFilter" className="filter-select" value={timeFilter} onChange={e => { setTimeFilter(e.target.value); setCurrentPage(1); }}>
                                        <option value="all">系統總點數 (所有紀錄)</option>
                                        <option value="today">今天</option>
                                        <option value="week">本週</option>
                                        <option value="lastWeek">上週</option>
                                        <option value="month">本月</option>
                                        <option value="custom">自訂日期</option>
                                    </select>
                                </div>
                                <div id="customDateContainer" className={`custom-date-container ${timeFilter === 'custom' ? '' : 'hidden'}`} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', flexWrap: 'wrap' }}>
                                    <input type="date" id="startDateFilter" onChange={() => setCurrentPage(1)} />
                                    <span>至</span>
                                    <input type="date" id="endDateFilter" onChange={() => setCurrentPage(1)} />
                                </div>
                                <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                                    <button id="resetReportFilterBtnAside" className={`small-btn secondary-btn ${!selectedStudent ? 'hidden' : ''}`} onClick={resetFilter}>全班</button>
                                    <button id="exportCsvBtn" className="btn secondary-btn small-btn">📊 匯出 CSV</button>
                                </div>
                            </div>

                            <h3 style={{ fontSize: '1em', borderBottom: '2px solid var(--border-color)', paddingBottom: '0.4rem', marginBottom: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span id="reportActivityTitle">{activeLabel} 的{reportView === 'treasure' ? '寶物' : '紀錄'}</span>
                                <button id="resetReportFilterBtn2" className={`small-btn cancel-btn ${!selectedStudent ? 'hidden' : ''}`} onClick={resetFilter}>↩️ 回到全班</button>
                            </h3>

                            <div className="reports-right-inner">
                                <div className="reports-right-logs">
                                    <ul className="history-list" id="reportActivityList" style={{ flex: 1, overflowY: 'auto' }}>
                                        {pagedActivityLogs.logs.map((log, i) => {
                                            const s = students.find(x => x.id === log.sID);
                                            const d = (typeof log.TS === 'number') ? new Date(log.TS) : (window.StampTool ? window.StampTool.decode(log.TS) : new Date());
                                            const isTreasure = !!log.trId;
                                            return (
                                                <li key={log.id + '-' + i} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.6rem', borderBottom: '1px solid #eee' }}>
                                                    <div className="history-item-left">
                                                        <span className="history-date">{d.toLocaleString()} • {s ? s.id : '未知'}</span>
                                                        <span className="history-label">{log.lb}{log.iSum === 1 && !isTreasure && <small>(不列排)</small>}</span>
                                                    </div>
                                                    <div className={`history-item-right ${isTreasure ? '' : (log.pt > 0 ? 'positive-val' : 'negative-val')}`} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                        {!isTreasure && <span>{log.pt > 0 ? '+' : ''}{log.pt}</span>}
                                                        <button className="delete-log-btn" onClick={(e) => { e.stopPropagation(); if (window.deleteLog) window.deleteLog(log.id); }} style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}>🗑️</button>
                                                    </div>
                                                </li>
                                            );
                                        })}
                                        {pagedActivityLogs.logs.length === 0 && <li style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '2rem' }}>無紀錄</li>}
                                    </ul>
                                    <div className="report-pagination">
                                        <button id="reportPrevPageBtn" className="small-btn reports-page-btn" disabled={currentPage <= 1} onClick={() => setCurrentPage(p => Math.max(1, p - 1))}>上一頁</button>
                                        <span id="reportPageInfo" style={{ fontSize: '0.85em', color: 'var(--text-secondary)' }}>頁數 {pagedActivityLogs.page} / {pagedActivityLogs.totalPages}</span>
                                        <button id="reportNextPageBtn" className="small-btn reports-page-btn" disabled={currentPage >= pagedActivityLogs.totalPages} onClick={() => setCurrentPage(p => p + 1)}>下一頁</button>
                                    </div>
                                </div>
                                <div className="reports-right-viz">
                                    <div className="pie-chart" style={{ background: pieData ? `conic-gradient(${pieData.map(p => `${p.color} ${p.percent}%`).join(', ')})` : '#e2e8f0' }}></div>
                                    <div className="pie-legend">
                                        {pieData ? pieData.map((p, i) => (
                                            <div key={i} className="legend-item">
                                                <div className="legend-color" style={{ background: p.color }}></div>
                                                <span>{p.label}: {p.count}</span>
                                            </div>
                                        )) : <div className="legend-item"><span>無資料</span></div>}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </React.Fragment>
    );
}, () => true);