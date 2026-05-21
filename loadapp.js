/**
 * Charles Nextime - 資源加載核心 (loadapp.js) - 穩定相容版
 */
 
(function() {
    // --- 核心 UI 分發器 ---
    window.updateLoading = function(percent, status) {
        const bar = document.getElementById('loading-bar');
        const text = document.getElementById('loading-text');
        const statusText = document.getElementById('loading-status');
        const { isBabel: isBabelMode, isEsbuild: isEsbuildMode } = window.APP_ENV;
        const isJSXProject = isBabelMode || isEsbuildMode;
        
        let displayPercent = percent;
        let displayStatus = status || '載入中...';

        if (isBabelMode && percent >= 80 && percent < 90) {
            displayPercent = 80;
            displayStatus = '100% 載入完成，正在啟動引擎...';
        } else if (isBabelMode && percent >= 90) {
            displayPercent = 90;
            displayStatus = '引擎啟動完成';
        }
        
        if (bar) bar.style.width = displayPercent + '%';
        if (text) text.innerText = Math.round(displayPercent) + '%';
        if (statusText) statusText.innerText = displayStatus;
        
        // 揭開遮罩邏輯
        if (percent >= 100) {
            const screen = document.getElementById('loading-screen');
            const root = document.getElementById('root');
            const statusEl = document.getElementById('status');
            
            // 重要：清理主引擎留下的任何警告
            if (statusEl) statusEl.innerHTML = '';

            if (screen && screen.style.display !== 'none') {
                screen.style.opacity = '0';
                if (root) root.style.visibility = 'visible'; 
                setTimeout(() => {
                    screen.style.display = 'none';
                    if (root) root.style.visibility = 'visible';
                }, 500); 
            }
        }
    };

    function startBabelOrFinish() {
        const isBabelMode = window.APP_ENV.isBabel;
        
        if (!isBabelMode) {
            window.updateLoading(100, '載入完成');
            return;
        }

        let babelTimer = setInterval(function() {
            const hasBabelTags = !!document.querySelector('script[type="text/babel"]');
            if (hasBabelTags && window.Babel) {
                clearInterval(babelTimer);
                window.updateLoading(90, '正在編譯分析組件...');
                setTimeout(() => {
                    console.log("[Loader] 開始執行 Babel 轉換...");
                    Babel.transformScriptTags();
                    window.updateLoading(100, '引擎啟動完成');
                }, 50);
            } else if (window.loaderFinished && !hasBabelTags) {
                clearInterval(babelTimer);
                window.updateLoading(100);
            }
        }, 50);
    }

    // 核心注入邏輯 (回歸 Script Tag 以保證相容性)
    function injectResource(type, item, onComplete) {
        const url = typeof item === 'string' ? item : item.url;
        const scriptType = typeof item === 'object' ? item.type : null;
        const isCSS = type === 'css';
        const el = document.createElement(isCSS ? 'link' : 'script');
        const attr = isCSS ? 'href' : 'src';
        
        if (isCSS) {
            el.rel = 'stylesheet';
        } else {
            let finalType = scriptType;
            if (!finalType) {
                finalType = window.APP_ENV.isBabel ? 'jsx' : 'js';
            }

            if (finalType === 'jsx') {
                el.type = 'text/babel';
                el.setAttribute('data-presets', 'react');
            } else if (finalType !== 'js') {
                el.type = finalType;
            }
            
            // 核心優化：只有 JS (正常執行腳本) 才需要 async = false
            // JSX 不要 async = false，否則會導致瀏覽器在執行隊列中卡死無法觸發 onload
            if (finalType === 'js') {
                el.async = false;
            }
        }

        // 狀態管理
        let isDone = false;
        const done = () => {
            if (isDone) return;
            isDone = true;
            console.log(`%c[Loader] 已載入 ${type.toUpperCase()}: ${url.split('/').pop()}`, "color: #00b894");
            if (onComplete) onComplete();
        };

        // 先掛監聽，再設網址，防止本機快取漏掉事件
        el.onload = done;
        el.onerror = done;

        // 針對 text/babel 增加 1.5 秒的保險，應對某些老舊瀏覽器不對資料標籤觸發 onload
        if (!isCSS && el.type === 'text/babel') {
            setTimeout(done, 1500);
        }

        const ver = typeof APP_VER !== 'undefined' ? APP_VER : "1.00a";
        el[attr] = `${url}?ver=${ver}`;
        document.head.appendChild(el);
    }

    function loadApp() {
        console.log(`%c[Loader] 開始初始化資源`, "color: #3498db; font-weight: bold;");

        if (typeof resources === 'undefined') {
            console.error('[Loader] 找不到 resources 配置');
            window.updateLoading(100, '讀取配置失敗');
            if (typeof reveal === 'function') reveal();
            return;
        }

        const cssList = resources.styles || [];
        let scriptList = resources.scripts || [];

        // 動態路徑注入：pro 模式下自動為腳本加上 dist/ 前綴
        const isProMode = window.APP_ENV.isEsbuild;
        if (isProMode) {
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
            console.log("%c[Loader] 所有資源確認完成", "color: #9b59b6; font-weight: bold;");
            startBabelOrFinish();
            if (typeof reveal === 'function') reveal();
        };

        const reportProgress = (url) => {
            loadedCount++;
            const { isBabel: isBabelMode, isEsbuild: isEsbuildMode } = window.APP_ENV;
            const isJSXProject = isBabelMode || isEsbuildMode;
            
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