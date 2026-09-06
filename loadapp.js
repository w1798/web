/**
 * Charles Nextime - 資源加載核心 (loadapp.js) - 穩定相容版
 */
 
(function() {
    const L = window.L, LE = window.LE;
    // --- 核心 UI 分發器 ---
    window.updateLoading = function(percent, status) {
        const bar = document.getElementById('loading-bar');
        const text = document.getElementById('loading-text');
        const statusText = document.getElementById('loading-status');
        const { isEsbuild: isEsbuildMode } = window.APP_ENV;
        const isJSXProject = isEsbuildMode;
        
        let displayPercent = percent;
        let displayStatus = status || '載入中...';

        if (bar) bar.style.width = displayPercent + '%';
        if (text) text.innerText = Math.round(displayPercent) + '%';
        if (statusText) statusText.innerText = displayStatus;
        
        // 進度達 100% 時，僅更新 UI 文字；Loading Screen 揭露統一由 loader_engine.reveal() 控制
        if (percent >= 100) {
            const statusEl = document.getElementById('status');
            if (statusEl) statusEl.innerHTML = '';
        }
    };

    // 核心注入邏輯 (回歸 Script Tag 以保證相容性)
    function injectResource(type, item, onComplete) {
        const url = typeof item === 'string' ? item : item.url;
        const isCSS = type === 'css';
        const el = document.createElement(isCSS ? 'link' : 'script');
        const attr = isCSS ? 'href' : 'src';
        
        if (isCSS) {
            el.rel = 'stylesheet';
        } else {
            // 核心優化：只有 JS (正常執行腳本) 才需要 async = false
            el.async = false;
        }

        // 狀態管理
        let isDone = false;
        const done = () => {
            if (isDone) return;
            isDone = true;
            L(`[Loader] 已載入 ${type.toUpperCase()}: ${url.split('/').pop()}`);
            if (onComplete) onComplete();
        };

        // 先掛監聽，再設網址，防止本機快取漏掉事件
        el.onload = done;
        el.onerror = () => {
            if (isDone) return;
            isDone = true;
            LE(`[Loader] 載入失敗 ${type.toUpperCase()}: ${url.split('/').pop()}`);
            if (onComplete) onComplete();
        };

        el[attr] = window.getVersionedUrl(url);
        document.head.appendChild(el);
    }

    function loadApp() {
        L('[Loader] 開始初始化資源');

        if (typeof resources === 'undefined') {
            LE('[Loader] 找不到 resources 配置');
            window.updateLoading(100, '讀取配置失敗');
            if (typeof reveal === 'function') reveal();
            return;
        }

        let cssList = resources.styles || [];
        let scriptList = resources.scripts || [];

        // 動態路徑注入：pro 模式下自動為腳本與樣式加上 dist/ 前綴
        const isProMode = window.APP_ENV.isEsbuild;
        if (isProMode) {
            cssList = cssList.map(url => url.startsWith('dist/') ? url : 'dist/' + url);
            scriptList = scriptList.map(item => {
                // 1. 拆解出 url 與 type
                const isString = typeof item === 'string';
                const url = isString ? item : item.url;
                const type = isString ? null : item.type;

                // 2. 核心排除條件：如果是 type 為 'js' 的物件，直接原樣回傳，不加 dist/
                if (type === 'js') {
                    return item;
                }

                // 3. 原有的條件：確保有 url 且開頭不是 dist/ 才會加上前綴
                if (url && !url.startsWith('dist/')) {
                    if (isString) return 'dist/' + url;
                    return { ...item, url: 'dist/' + url };
                }

                return item;
            });
        }

        const totalResources = cssList.length + scriptList.length;
        let loadedCount = 0;

        const handleComplete = () => {
            window.loaderFinished = true;
            L('[Loader] 所有資源確認完成');
            // 僅設定完成旗標，統一由 loader_engine.reveal() 處理 UI 揭露（避免雙重控制造成閃爍）
            if (typeof reveal === 'function') reveal();
        };

        const reportProgress = (url) => {
            loadedCount++;
            const { isEsbuild: isEsbuildMode } = window.APP_ENV;
            const isJSXProject = isEsbuildMode;
            
            const progress = 20 + (loadedCount / totalResources) * (isJSXProject ? 60 : 80);
            const fileName = url.split('/').pop();
            window.updateLoading(progress, `載入模組: ${fileName}`);
            
            if (loadedCount >= totalResources) {
                handleComplete();
            }
        };

        if (totalResources === 0) {
            handleComplete();
            return; 
        }
        
        // 分批啟動載入
        cssList.forEach(item => injectResource('css', item, () => reportProgress(typeof item === 'string' ? item : item.url)));
        scriptList.forEach(item => injectResource('js', item, () => reportProgress(typeof item === 'string' ? item : item.url)));
    }

    loadApp();
})();