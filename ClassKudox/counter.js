/**
 * Charles Nextime - 萬用計數器組件
 * 功能：自動注入 CSS + 冷卻機制 + Vercount 統計
 */
(function() {
    // === 1. 自動注入 CSS 樣式 ===
    const style = document.createElement('style');
    style.textContent = `
        #busuanzi_container_page_pv {
            color: #888;
            font-size: 0.9rem;
            margin-left: 15px;
            border-left: 1px solid rgba(128, 128, 128, 0.5);
            padding-left: 15px;
            display: none; /* 初始隱藏 */
            align-items: center;
        }
        #busuanzi_value_page_pv {
            color: #00b894;
            font-weight: bold;
            margin: 0 4px;
        }
    `;
    document.head.appendChild(style);

    // === 2. 計數器核心邏輯 ===
    const initCounter = () => {
        const pvSpan = document.getElementById('busuanzi_value_page_pv');
        const pvContainer = document.getElementById('busuanzi_container_page_pv');
        if (!pvSpan || !pvContainer) return;

        const path = window.location.pathname.replace(/\/$/, "") || "/root";
        const TIME_KEY = `VERCOUNT_TIME_${path}`;
        const VAL_KEY = `VERCOUNT_VAL_${path}`;
        const COOL_DOWN = 30 * 60 * 1000; // 30 分鐘冷卻
        const now = Date.now();

        const lastVisit = localStorage.getItem(TIME_KEY);
        const lastVal = localStorage.getItem(VAL_KEY);

        // 判斷是否在冷卻期
        if (lastVisit && (now - lastVisit < COOL_DOWN)) {
            pvSpan.innerText = lastVal || "--";
            pvContainer.style.display = "inline-flex"; // 使用 flex 確保垂直居中
            console.log(`[Counter] 冷卻中，顯示舊值: ${lastVal}`);
        } else {
            // 執行 Vercount 抓取
            const script = document.createElement('script');
            script.src = "https://events.vercount.one/js";
            script.async = true;

            // 使用 MutationObserver 監控數值變化
            const observer = new MutationObserver(() => {
                const newVal = pvSpan.innerText;
                if (newVal && newVal !== "--" && newVal !== "") {
                    localStorage.setItem(VAL_KEY, newVal);
                    localStorage.setItem(TIME_KEY, Date.now());
                    pvContainer.style.display = "inline-flex";
                    observer.disconnect();
                }
            });

            observer.observe(pvSpan, { childList: true, characterData: true, subtree: true });
            document.head.appendChild(script);
        }
    };

    // 確保 DOM 載入後執行
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initCounter);
    } else {
        initCounter();
    }
})();