function StudentGrid() {
    const { 
        students, 
        isMultiSelectMode, 
        selectedStudentIds, 
        settings, 
        treasureDefs,
        setModal,
        toggleStudentSelection
    } = React.useContext(AppContext);

    const handleCardClick = (studentId) => {
        if (isMultiSelectMode) {
            toggleStudentSelection(studentId);
        } else {
            window.openAwardModal && window.openAwardModal([studentId], studentId);
        }
    };

    if (students.length === 0) {
        return (
            <main className="student-grid" id="studentGrid">
                <div style={{ textAlign: 'center', width: '100%', gridColumn: '1 / -1', padding: '30px', color: '#64748b' }}>
                    <p style={{ marginBottom: '15px' }}>目前沒有學生資料。</p>
                    <button className="primary-btn" onClick={() => setModal('addStudent', true)}>新增學生</button>
                    或
                    <button className="primary-btn" onClick={() => document.getElementById('importJsonFile')?.click()} style={{ marginLeft: '10px', background: 'var(--secondary)' }}>
                        匯入 JSON / GZ
                    </button>
                </div>
            </main>
        );
    }

    return (
        <main className="student-grid" id="studentGrid">
            {students.map(s => {
                const total = (Number(s.cP) || 0) + (Number(s.iP) || 0);
                const isSelected = isMultiSelectMode && selectedStudentIds.includes(s.id);
                
                // Determine color class
                let pointClass = '';
                if (total > 0) pointClass = 'positive-total';
                else if (total < 0) pointClass = 'negative-total';

                // Determine active treasures
                let activeTreasures = [];
                if (s.tr && settings.sTR !== 0) {
                    activeTreasures = Object.entries(s.tr).filter(([_, qty]) => qty !== 0);
                }
                
                return (
                    <div 
                        key={s.id} 
                        className={`student-card ${isSelected ? 'selected' : ''}`}
                        onClick={() => handleCardClick(s.id)}
                    >
                        <div className={`student-points ${pointClass}`}>
                            {total}
                        </div>
                        <div className="student-avatar-wrapper">
                            <img src={window.getAvatarUrl(s.aU || s.id, s.aS)} className="student-avatar" loading="lazy" />
                        </div>
                        <div className="student-name">{s.id}</div>
                        {activeTreasures.length > 0 && (
                            <div className="student-treasures">
                                {activeTreasures.map(([tid, qty]) => {
                                    const def = treasureDefs?.find(t => t.id === tid);
                                    return def ? (
                                        <span key={tid} className="stu-treasure-icon" title={def.lb}>
                                            {def.ic}{qty}
                                        </span>
                                    ) : null;
                                })}
                            </div>
                        )}
                        {isMultiSelectMode && <div className="selection-check">{isSelected ? '✓' : ''}</div>}
                    </div>
                );
            })}
        </main>
    );
}
