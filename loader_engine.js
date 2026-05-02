/**
 * 資源載入引擎 - Engine.js
 */

// 強制顯示函式
function reveal() {
    if (document.documentElement.style.visibility === 'hidden') {
        document.documentElement.style.visibility = 'visible';
        console.warn("[Engine] 載入資源超時，已強行顯示頁面。");
        
        setTimeout(() => {
            const statusEl = document.getElementById('status');
            if (statusEl) {
                statusEl.innerHTML = "<span style='color:red; font-weight:bold;'>[Engine] 系統載入稍慢，部分功能可能尚未就緒。</span>";
            }
        }, 0);
    }
}

// 封裝載入邏輯
function startLoading() {
    const version = typeof APP_VER !== 'undefined' ? APP_VER : '1.00a';
    const isRoot = (typeof APP_ROOT !== 'undefined' && APP_ROOT === 1);
    const pathPrefix = isRoot ? "" : "../";

    // --- 第一步：先載入 config.js ---
    const configScript = document.createElement('script');
    configScript.src = `config.js?ver=${version}`;
    console.log("[Engine] 開始載入 config.js 配置檔...");

    configScript.onload = () => {
        console.log("[Engine] config.js 載入成功，準備啟動 loadapp.js");

        // --- 第二步：config 載入後，才建立 loadapp.js 的 script ---
        const loader = document.createElement('script');
        loader.src = `${pathPrefix}loadapp.js?ver=${version}`;
        
        // 設定 5 秒超時保險
        const timeoutId = setTimeout(reveal, 5000); 

        loader.onload = () => {
            clearTimeout(timeoutId); 
            console.log("[Engine] loadapp.js 載入成功");
        };

        loader.onerror = () => {
            clearTimeout(timeoutId);
            reveal();
            console.error("[Engine] loadapp.js 載入失敗");
        };

        document.head.appendChild(loader);
    };

    configScript.onerror = () => {
        console.error("[Engine] config.js 載入失敗，無法繼續載入應用程式。");
        reveal(); // 配置檔失敗也要顯示頁面，避免死當
    };

    document.head.appendChild(configScript);
}

startLoading();
