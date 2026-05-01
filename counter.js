/**
 * Charles Nextime - 全局計數器組件 (V3 自動化版)
 * 支援功能：CSS 注入、自動 Footer 生成、路徑識別、30分鐘冷卻、Vercount 統計
 */

(function() {
    // === 1. 樣式注入 (在這裡自定義顏色) ===
    const style = document.createElement('style');
    style.textContent = `
        .auto-footer {
            text-align: center !important;
            padding: 20px !important;
            font-size: 0.9rem !important;
            border-top: 1px solid rgba(128, 128, 128, 0.2) !important;
            margin-top: 40px !important;
            color: #888 !important; /* 預設文字顏色 */
            display: block !important;
            clear: both !important;
        }

        /* 作者資訊與連結顏色 */
        .auto-footer a { 
            color: #00b894 !important; 
            text-decoration: none !important; 
            background: none !important; /* 防止有些 CSS 會加背景色 */
            border: none !important;     /* 防止有些 CSS 會加底線邊框 */
        }

        .auto-footer a:hover { 
            opacity: 0.8 !important; 
            text-decoration: underline !important; 
            color: #00b894 !important; 
        }

        /* 計數器容器 */
        #busuanzi_container_page_pv {
            margin-left: 10px !important;
            border-left: 1px solid rgba(128, 128, 128, 0.4) !important;
            padding-left: 10px !important;
            display: none; /* 這裡不能加 !important，因為 JS 會動態控制顯示 */
        }

        /* 訪客人數數字顏色 */
        #busuanzi_value_page_pv { 
            color: #00b894 !important; 
            font-weight: bold !important; 
        }
    `;
    document.head.appendChild(style);

    const init = () => {
        // --- 2. 處理 Footer 結構 ---
        let footer = document.querySelector('footer');
        
        // 如果 HTML 裡完全沒寫 <footer>，就自動生一個並掛在 body 最後
        if (!footer) {
            footer = document.createElement('footer');
            document.body.appendChild(footer);
        }

        // 強制套用樣式類名
        footer.classList.add('auto-footer');
        
        // 計算年份邏輯
        const startYear = 2026;
        const currentYear = new Date().getFullYear();
        const yearStr = currentYear > startYear ? `${startYear}-${currentYear}` : startYear;

        // 注入內容 (無論原本 footer 裡有什麼都會被覆蓋成標準格式)
        footer.innerHTML = `
            <a href="https://w1798.github.io/web/" target="_blank">&copy; ${yearStr} Charles Nextime</a> · 
            <a href="https://www.gnu.org/licenses/gpl-3.0.html" target="_blank">GPLv3</a>
            <span id="busuanzi_container_page_pv">
                訪客 <span id="busuanzi_value_page_pv">--</span> 人次
            </span>
        `;

        // --- 3. 計數器核心邏輯 ---
        const pvSpan = document.getElementById('busuanzi_value_page_pv');
        const pvContainer = document.getElementById('busuanzi_container_page_pv');
        if (!pvSpan) return;

        // 路徑識別 (確保不同程式路徑的冷卻時間獨立)
        const path = window.location.pathname.replace(/^\/|\/$/g, "").replace(/\//g, "-") || "home";
        const TIME_KEY = `COUNT_TIME_${path}`;
        const VAL_KEY = `COUNT_VAL_${path}`;
        
        const lastVisit = localStorage.getItem(TIME_KEY);
        const lastVal = localStorage.getItem(VAL_KEY);

        // 檢查 30 分鐘冷卻 (1800000 ms)
        if (lastVisit && (Date.now() - lastVisit < 1800000)) {
            pvSpan.innerText = lastVal || "--";
            pvContainer.style.display = "inline";
            console.log(`[Counter] ${path} 冷卻中，顯示快取數據。`);
        } else {
            // 超過冷卻期，從伺服器更新
            const script = document.createElement('script');
            script.src = "https://events.vercount.one/js";
            script.async = true;

            // 使用 MutationObserver 監控數據填入
            const observer = new MutationObserver(() => {
                const newVal = pvSpan.innerText;
                if (newVal && newVal !== "--" && newVal !== "") {
                    localStorage.setItem(VAL_KEY, newVal);
                    localStorage.setItem(TIME_KEY, Date.now());
                    pvContainer.style.display = "inline";
                    observer.disconnect();
                }
            });

            observer.observe(pvSpan, { childList: true, characterData: true, subtree: true });
            document.head.appendChild(script);
        }
    };

    // 確保在 DOM 準備好後才執行
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();