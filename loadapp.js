/**
 * Charles Nextime - 資源加載核心 (loadapp.js)
 */
 
(function() {
    // 檢查全域變數 resources 是否存在
    if (typeof resources === 'undefined') {
        document.documentElement.style.visibility = 'visible';
        console.error('[Loader] 找不到 resources 配置');
        return;
    }

    // 內部核心邏輯 (完全保留你提供的代碼)
    function injectResource(type, item, onCssLoaded) {
        const url = typeof item === 'string' ? item : item.url;
        const scriptType = typeof item === 'object' ? item.type : null;

        const isCSS = type === 'css';
        const el = document.createElement(isCSS ? 'link' : 'script');
        const attr = isCSS ? 'href' : 'src';
        
        if (isCSS) {
            el.rel = 'stylesheet';
        } else {
            // 智慧型別判定 (解耦 APP_JSX)
            let finalType = scriptType;
            if (!finalType) {
                // 如果沒指定型別，先看全域變數，若無全域變數則檢查資源清單中是否包含 babel
                const isJSXMode = (typeof APP_JSX !== 'undefined' && APP_JSX === 1) || 
                                 (resources.libs && resources.libs.some(lib => {
                                     const l = typeof lib === 'string' ? lib : lib.url;
                                     return l.toLowerCase().includes('babel');
                                 }));
                                 
                finalType = isJSXMode ? 'jsx' : 'js';
            }

            if (finalType === 'jsx') {
                el.type = 'text/babel';
                el.setAttribute('data-presets', 'react');
            } else if (finalType !== 'js') {
                el.type = finalType;
            }
            
            // 只要不是 ES Module，就強制關閉 async 以確保按順序執行
            if (finalType !== 'module') {
                el.async = false;
            }
        }

        // 使用全域定義的 APP_VER
        const ver = typeof APP_VER !== 'undefined' ? APP_VER : "1.00a";
        el[attr] = `${url}?ver=${ver}`;
        
        el.onload = () => {
            console.log(`%c[Loader] 已載入 ${type.toUpperCase()}: ${url}`, "color: #00b894");
            if (onCssLoaded) onCssLoaded(); // 這裡現在作為資源載入完成的統一回呼
        };

        el.onerror = () => {
            console.error(`[Loader] 載入失敗 ${url}`);
            if (onCssLoaded) onCssLoaded(); // 失敗也回報進度，避免卡死
        };

        document.head.appendChild(el);
    }

    function loadApp() {
        console.log(`%c[Loader] 開始初始化資源 (版本: ${typeof APP_VER !== 'undefined' ? APP_VER : 'N/A'})`, "color: #3498db; font-weight: bold;");

        const cssList = resources.styles || [];
        const scriptList = resources.scripts || [];
        const totalResources = cssList.length + scriptList.length;
        let loadedCount = 0;

        // 核心顯示邏輯：決定何時展示頁面
        const handleComplete = () => {
            const hasJSX = typeof APP_JSX !== 'undefined' && APP_JSX === 1;
            
            if (window.updateLoading) {
                // 接納用戶建議：JSX 模式下資源到位即顯示 80%，文字偽裝為 100% 載入
                window.updateLoading(hasJSX ? 80 : 100, hasJSX ? '100% 載入完成' : '載入完成');
            }
            
            // 強制顯示頁面 (如果引擎還沒 reveal)
            if (typeof reveal === 'function') reveal();
            else document.documentElement.style.visibility = 'visible';

            window.loaderFinished = true; // 標記載入完成，通知 index.html 進入編譯判定
            console.log("%c[Loader] 所有資源確認完成", "color: #9b59b6; font-weight: bold;");
        };

        const reportProgress = (url) => {
            loadedCount++;
            const hasJSX = typeof APP_JSX !== 'undefined' && APP_JSX === 1;
            // 如果是 JSX，資源載入佔 20-80%
            const progress = 20 + (loadedCount / totalResources) * (hasJSX ? 60 : 80);
            const fileName = url.split('/').pop();
            if (window.updateLoading) window.updateLoading(progress, `載入模組: ${fileName}`);
            
            if (loadedCount >= totalResources) {
                handleComplete();
            }
        };

        const configs = [
            { data: cssList, type: 'css', label: 'CSS' },
            { data: scriptList, type: 'js', label: 'JS' }
        ];

        // 如果完全沒有資源，也要印出日誌並完成初始化
        if (totalResources === 0) {
            configs.forEach(config => {
                console.log(`%c[Loader] 無外部 ${config.label} 資源需要載入`, "color: #e67e22");
            });
            handleComplete();
            return; 
        }
        
        configs.forEach(config => {
            if (config.data && config.data.length > 0) {
                config.data.forEach(item => {
                    injectResource(config.type, item, () => reportProgress(typeof item === 'string' ? item : item.url));
                });
            }
        });
    }

    // 執行
    loadApp();
})();