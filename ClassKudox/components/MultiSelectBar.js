// 多選工具列元件: 已轉為 React 受控元件，與 AppContext 狀態綁定
function MultiSelectBar() {
    const { 
        isMultiSelectMode, 
        selectedStudentIds, 
        toggleMultiSelectMode, 
        selectAllStudents,
        openMultiAwardModal,
        undoAction 
    } = React.useContext(AppContext);

    const handleSelectAll = () => {
        selectAllStudents();
    };

    const handleCancel = () => {
        toggleMultiSelectMode();
    };

    const handleMultiAward = () => {
        openMultiAwardModal();
    };

    return (
        <React.Fragment>
            {/* floatingMultiSelectBtn 的顯示/隱藏由 scroll 事件控制，React 不介入 */}
            <div className="floating-bottom-strip">
                <button 
                    id="floatingMultiSelectBtn" 
                    className="floating-bottom-btn hidden"
                    title="多選模式"
                    onClick={toggleMultiSelectMode}
                >
                    ☑️ 多選模式
                </button>
            </div>
            
            {/* multiSelectBar 由 React isMultiSelectMode 控制顯示 */}
            <div id="multiSelectBar" className={`multi-select-bar ${isMultiSelectMode ? '' : 'hidden'}`}>
                <span id="multiSelectCount">已選擇 {selectedStudentIds.length} 位學生</span>
                <div className="multi-select-actions-container">
                    <div className="multi-select-actions">
                        <button 
                            id="selectAllBtn" 
                            className="btn secondary-btn" 
                            style={{ padding: '0.4rem 0.8rem' }}
                            onClick={selectAllStudents}
                        >
                            全選/取消
                        </button>
                        <button 
                            id="multiAwardBtn" 
                            className="btn primary-btn" 
                            style={{ padding: '0.4rem 0.8rem' }}
                            onClick={handleMultiAward}
                        >
                            給予點數
                        </button>
                    </div>
                    <div className="multi-select-cancel-row" style={{ display: 'flex', justifyContent: 'center', marginTop: '0.4rem' }}>
                        <button 
                            id="cancelMultiBtn" 
                            className="btn secondary-btn" 
                            style={{ padding: '0.3rem 1rem', fontSize: '0.85em' }}
                            onClick={toggleMultiSelectMode}
                        >
                            關閉
                        </button>
                    </div>
                </div>
            </div>
        </React.Fragment>
    );
}
