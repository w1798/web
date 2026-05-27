// Header 元件: 已轉為 React 完全受控元件，與 AppContext 狀態綁定
function Header() {
    const { 
        currentView, 
        switchMainView, 
        isMultiSelectMode,
        classes, 
        currentClassId, 
        toggleMultiSelectMode,
        setModal,
        cloudStatus
    } = React.useContext(AppContext);

    const handleClassChange = (e) => {
        if (window.switchClass) window.switchClass(e.target.value);
    };

    const handleRankingClick = () => {
        if (window.showClassSummary) window.showClassSummary();
    };

    return (
        <header id="mainHeader" className="app-header">
            <div className="header-left">
                <h1 id="rankingTitle" onClick={handleRankingClick} style={{ cursor: 'pointer' }}>班級榮譽星</h1>
                <div id="syncStatus" className={`sync-badge ${cloudStatus.isSyncing ? 'syncing' : ''}`}>
                    {cloudStatus.isSyncing ? '🔄 同步中...' : '☁️ 雲端已就緒'}
                </div>
            </div>
            <div className="header-actions">
                <button 
                    className={`view-tab-btn header-tab ${currentView === 'students' ? 'active' : ''}`} 
                    onClick={() => switchMainView('students')}
                    data-view="students"
                >🧑‍ 學生</button>
                <button 
                    className={`view-tab-btn header-tab ${currentView === 'groups' ? 'active' : ''}`} 
                    onClick={() => switchMainView('groups')}
                    data-view="groups"
                >👥 群組</button>
                
                <select 
                    id="classSelect" 
                    className="filter-select" 
                    style={{ maxWidth: '200px', fontWeight: 600 }}
                    value={currentClassId}
                    onChange={handleClassChange}
                >
                    {classes.map(c => <option key={c.id} value={c.id}>{c.id}</option>)}
                </select>

                <button 
                    id="manageClassesBtn" 
                    className="btn icon-btn" 
                    title="班級管理"
                    onClick={() => setModal('manageClasses', true)}
                >🏫</button>
                
                <button 
                    id="addStudentBtn" 
                    className="btn primary-btn"
                    onClick={() => setModal('addStudent', true)}
                >+ 新增學生</button>
                
                <button 
                    id="reportsBtn" 
                    className="btn reports-btn"
                    onClick={() => setModal('reports', true)}
                >📊 成長排名</button>
                
                <button 
                    id="toggleMultiSelectBtn" 
                    className={`btn secondary-btn ${isMultiSelectMode ? 'active-mode' : ''}`}
                    onClick={toggleMultiSelectMode}
                >{isMultiSelectMode ? '取消多選' : '☑️ 多選模式'}</button>
                
                <button 
                    id="settingsBtn" 
                    className="btn icon-btn" 
                    title="設定"
                    onClick={() => setModal('settings', true)}
                >⚙️</button>
            </div>
        </header>
    );
}
