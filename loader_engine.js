/**
 * Charles Nextime - 資源載入引擎 (loader_engine.js)
 */

// --- 全局 Log 系統 (最早初始化，供所有後續模組使用) ---
window._LOGS = [];
(function() {
    const MAX_LOG = 200;
    const fmtTS = () => new Date().toLocaleTimeString('zh-TW', { hour12: false });
    const msg = (args) => args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ');

    window.L = (...args) => {
        const ts = fmtTS();
        const m = msg(args);
        window._LOGS.push({ t: Date.now(), l: 'L', m });
        if (window._LOGS.length > MAX_LOG) window._LOGS.shift();
        console.log(`[${ts}]`, ...args);
    };

    window.LE = (...args) => {
        const ts = fmtTS();
        const m = msg(args);
        window._LOGS.push({ t: Date.now(), l: 'E', m });
        if (window._LOGS.length > MAX_LOG) window._LOGS.shift();
        console.error(`[${ts}]`, ...args);
    };
})();

// --- 壓縮降級輔助 (原生失敗時動態載入 pako) ---
window._loadPako = () => {
    if (typeof pako !== 'undefined') return Promise.resolve();
    return new Promise((resolve, reject) => {
        const s = document.createElement('script');
        s.src = 'https://cdnjs.cloudflare.com/ajax/libs/pako/2.1.0/pako.min.js';
        s.onload = resolve;
        s.onerror = () => {
            const isRoot = typeof APP_ROOT !== 'undefined' && APP_ROOT === 1;
            const prefix = isRoot ? 'libs/' : '../libs/';
            const fb = document.createElement('script');
            fb.src = prefix + 'pako.min.js';
            fb.async = false;
            fb.onload = resolve;
            fb.onerror = () => reject(new Error('pako 載入失敗（CDN + 本地均無法讀取）'));
            document.head.appendChild(fb);
        };
        document.head.appendChild(s);
    });
};

// --- 集中系統狀態 ---
window.APP_ENV = (function() {
    const rawMode = typeof APP_JSX !== 'undefined' ? String(APP_JSX).toLowerCase() : 'vanilla';
    const isEsbuild = ['es', 'esbuild', '1'].includes(rawMode);

    return {
        isEsbuild: isEsbuild,
        version: typeof APP_VER !== 'undefined' ? APP_VER : '1.00a'
    };
})();

function reveal(isTimeout) {
    // 只有當「是因為超時觸發」且「事實上已經載入完成」時，才攔截不處理
    if (isTimeout && typeof window.loaderFinished !== 'undefined') return;

    // 清除計時器（如果是手動呼叫）
    if (window.overallTimeoutId) {
        clearTimeout(window.overallTimeoutId);
        window.overallTimeoutId = null;
    }

    const statusEl = document.getElementById('status');
    
    if (isTimeout) {
        // 真正的超時情況
        console.warn("[Engine] 載入資源超時，已強行顯示頁面。");
        if (statusEl) statusEl.innerHTML = "<span style='color:red; font-weight:bold;'>[Engine] 系統載入稍慢，部分功能可能尚未就緒。</span>";
    } else if (typeof window.loaderFinished === 'undefined') {
        L("[Engine] 偵測到載入異常，提前開放介面。");
        if (statusEl) statusEl.innerHTML = "";
    } else {
        // 正常路徑：完全沈默
        if (statusEl) statusEl.innerHTML = "";
    }

    // 確保遮罩移除，主體顯示
    const screen = document.getElementById('loading-screen');
    if (screen) {
        screen.style.opacity = '0';
        setTimeout(() => { screen.style.display = 'none'; }, 500);
    }
    const root = document.getElementById('root');
    if (root) root.style.visibility = 'visible';
    
    // 強制讓 HTML 可見 (應對某些舊專案設定)
    document.documentElement.style.visibility = 'visible';
}

// 輔助函式：建立 Script 標籤並返回 Promise
function loadScript(src) {
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = src;
        script.onload = () => resolve(src);
        script.onerror = () => reject(src);
        document.head.appendChild(script);
    });
}

async function startLoading() {
    const version = window.APP_ENV.version;
    const isRoot = (typeof APP_ROOT !== 'undefined' && APP_ROOT === 1);
    const pathPrefix = isRoot ? "" : "../";
    
    // 設定 6 秒全域超時保險，將 ID 掛在 window 以便跨實體清除
    window.overallTimeoutId = setTimeout(() => reveal(true), 6000);

    try {
        // --- 第一步：載入核心配置 ---
        if (window.updateLoading) window.updateLoading(5, '讀取系統配置...');
        await loadScript(`config.js?ver=${version}`);

        // --- 第二步：並行載入通用插件 ---
        const commonAssets = [
            `${pathPrefix}counter.js?ver=${version}`,
            `${pathPrefix}plugins.js?ver=${version}`
        ];
        
        const results = await Promise.allSettled(commonAssets.map(src => loadScript(src)));
        if (window.updateLoading) window.updateLoading(20, '準備核心插件...');
        
        // --- 第三步：載入主程式 loadapp.js ---
        if (window.updateLoading) window.updateLoading(60, '啟動應用程式載入器...');
        await loadScript(`${pathPrefix}loadapp.js?ver=${version}`);

        // --- 全部成功：清除超時計時器並確保 UI 乾淨 ---
        if (window.overallTimeoutId) {
            clearTimeout(window.overallTimeoutId);
            window.overallTimeoutId = null;
        }
        
        // 強致清理一次 status (應對極速載入時的殘留)
        const statusEl = document.getElementById('status');
        if (statusEl) statusEl.innerHTML = "";

        // 不再檢查 APP_JSX 旗標，全權交給 plugins.js 判斷是否有 lazy 庫需要載入
        if (typeof startLazyLoading === 'function') {
            startLazyLoading();
        }

    } catch (error) {
        LE("[Engine] 載入過程中發生關鍵錯誤:", error);
        reveal(false);
    }
}

startLoading();