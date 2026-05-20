// =============================================
// 佈局與主掛載層
// =============================================

// --- 佈局元件 ---
const Layout = ({ children, activeTab, setActiveTab }) => {
    const { darkMode, setDarkMode } = useGut();
    const [showBackToTop, setShowBackToTop] = useState(false);
    const mainRef = React.useRef(null);

    // 當分頁切換時，自動回到頂部並重置按鈕狀態
    useEffect(() => {
        if (mainRef.current) {
            mainRef.current.scrollTop = 0;
            setShowBackToTop(false);
        }
    }, [activeTab]);

    const handleScroll = (e) => {
        const container = e.target;
        // 降低門檻，捲動超過 100px 且有剩餘內容時顯示
        setShowBackToTop(container.scrollTop > 100);
    };

    const scrollToTop = () => {
        mainRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    };
    const tabs = [
        { id: 'diet', icon: '🍽️', label: '飲食' },
        { id: 'bowel', icon: '🚽', label: '排便' },
        { id: 'analysis', icon: '⚡', label: '分析' },
        { id: 'settings', icon: '⚙️', label: '設定' }
    ];
    return (
        <div className="h-[100dvh] flex flex-col max-w-md mx-auto relative bg-slate-100 dark:bg-slate-900 transition-colors shadow-2xl overflow-hidden">
            <header className="px-4 py-2 flex justify-between items-center sticky top-0 bg-slate-100/80 dark:bg-slate-800/80 backdrop-blur-md z-40 border-b border-gray-200 dark:border-slate-700">
                <h1 className="text-xl font-bold bg-gradient-to-r from-indigo-500 to-rose-500 bg-clip-text text-transparent flex items-center gap-2">順暢日記</h1>
                <button onClick={() => setDarkMode(!darkMode)} className="w-11 h-11 flex items-center justify-center rounded-full bg-gray-100 dark:bg-slate-700 text-lg">{darkMode ? '☀️' : '🌙'}</button>
            </header>
            <main ref={mainRef} onScroll={handleScroll} className="flex-1 overflow-y-auto pb-24">{children}</main>
            <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-[calc(448px-2rem)] bg-slate-100/90 dark:bg-slate-800/90 backdrop-blur-lg border border-gray-200 dark:border-slate-700 px-4 py-1 flex justify-around items-center z-50 rounded-2xl shadow-xl">
                {tabs.map(tab => (
                    <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                        className={`flex flex-col items-center gap-0 px-3 py-1 rounded-xl transition-all ${activeTab === tab.id ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 scale-105' : 'text-gray-400 dark:text-gray-500'}`}>
                        <span className="text-xl">{tab.icon}</span>
                        <span className="text-xs font-bold">{tab.label}</span>
                    </button>
                ))}
            </nav>
            {showBackToTop && (
                <button
                    onClick={scrollToTop}
                    className="absolute bottom-16 right-6 w-10 h-10 bg-indigo-600/90 hover:bg-indigo-500 text-white rounded-full flex items-center justify-center shadow-2xl backdrop-blur-sm z-[60] transition-all hover:scale-110 active:scale-95 text-xl cursor-pointer"
                >↑</button>
            )}
            <footer></footer>
        </div>
    );
};

// =============================================
// 主應用程式
// =============================================
const App = () => {
    const [activeTab, setActiveTab] = useState('diet');
    const { loading } = useGut();

    // 當 React 渲染完成後，將進度推至 100% 並關閉遮罩
    useEffect(() => {
        if (!loading && window.updateLoading) {
            window.updateLoading(100, '就緒');
        }
    }, [loading]);

    if (loading) {
        return (
            <div className="h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-slate-900 gap-4">
                <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-sm text-gray-400">載入中...</p>
            </div>
        );
    }
    return (
        <Layout activeTab={activeTab} setActiveTab={setActiveTab}>
            {activeTab === 'diet' && <DietPage />}
            {activeTab === 'bowel' && <BowelPage />}
            {activeTab === 'analysis' && <AnalysisPage />}
            {activeTab === 'settings' && <SettingsPage />}
        </Layout>
    );
};

// 確保在 DOM 與核心庫就緒後才進行渲染
const mountApp = () => {
    const rootElement = document.getElementById('root');
    if (rootElement && typeof ReactDOM !== 'undefined') {
        const root = ReactDOM.createRoot(rootElement);
        root.render(<GutProvider><App /></GutProvider>);
    }
};

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mountApp);
} else {
    mountApp();
}
