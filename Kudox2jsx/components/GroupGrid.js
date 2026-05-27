function GroupGrid() {
    const { groups, students, isMultiSelectMode, selectedGroupIds, settings, setModal } = React.useContext(AppContext);

    // 防禦：確保 selectedGroupIds 無論何種型別都能安全使用
    const selIds = React.useMemo(() => {
        if (!selectedGroupIds) return [];
        if (Array.isArray(selectedGroupIds)) return selectedGroupIds;
        if (typeof selectedGroupIds.forEach === 'function') return Array.from(selectedGroupIds);
        return [];
    }, [selectedGroupIds]);

    const safeGroups = groups || [];
    const safeStudents = students || [];
    const safeSettings = settings || {};

    const handleCardClick = (g) => {
        if (window.isMultiSelectMode) {
            if (window.toggleGroupSelection) window.toggleGroupSelection(g.id);
            if (window._refreshReact) window._refreshReact();
        } else {
            if (window.openAwardModal) window.openAwardModal(g.sIds || [], g.id, g.id);
        }
    };

    return (
        <main className="group-grid" id="groupGrid">
            {safeGroups.map(g => {
                const sIds = g.sIds || [];
                const members = sIds.map(sid => safeStudents.find(s => s && s.id === sid)).filter(Boolean);

                let total = 0;
                members.forEach(s => {
                    total += (Number(s.cP) || 0) + (Number(s.iP) || 0);
                });

                // 多選時的選中狀態，同樣從 window 讀取以保持一致
                const isSelected = window.isMultiSelectMode && selIds.includes(g.id);
                
                // Determine color class
                let ptClass = 'group-points';
                if (total > 0) ptClass += ' positive-total';
                else if (total < 0) ptClass += ' negative-total';

                return (
                    <div
                        key={g.id}
                        className={`group-card${isSelected ? ' selected' : ''}`}
                        onClick={() => handleCardClick(g)}
                    >
                        {/* 左上角編輯按鈕 */}
                        <button
                            className="edit-group-inline-btn"
                            onClick={(e) => { e.stopPropagation(); window.openManageGroupModal && window.openManageGroupModal(g.id); }}
                        >⚙️</button>
                        {/* 右上角點數 */}
                        <div className={ptClass}>{total > 0 ? '+' : ''}{total}</div>
                        {/* 中間圖示 */}
                        <div className="group-icon">👪</div>
                        {/* 群組名稱 */}
                        <div className="group-name">{g.id}</div>
                        {/* 成員數 */}
                        <div className="group-members-summary">
                            {members.length} 位成員{isSelected ? <b style={{ color: 'var(--primary-color)' }}> [已選]</b> : ''}
                        </div>
                    </div>
                );
            })}

            {/* Add Group Card - 永遠放最後（與原版一致） */}
            <div
                className="group-card add-group-card"
                onClick={() => window.openManageGroupModal && window.openManageGroupModal()}
            >
                <div className="create-group-icon">+</div>
                <div className="group-name">新增群組</div>
            </div>
        </main>
    );
}
