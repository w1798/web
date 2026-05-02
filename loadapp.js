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
    function injectResource(type, url, onCssLoaded) {
        const isCSS = type === 'css';
        const el = document.createElement(isCSS ? 'link' : 'script');
        const attr = isCSS ? 'href' : 'src';
        
        if (isCSS) {
            el.rel = 'stylesheet';
        } else {
            el.async = false;
        }

        // 使用全域定義的 APP_VER
        const ver = typeof APP_VER !== 'undefined' ? APP_VER : Date.now();
        el[attr] = `${url}?ver=${ver}`;
        
        el.onload = () => {
            console.log(`%c[Loader] 已載入 ${type.toUpperCase()}: ${url}`, "color: #00b894");
            if (isCSS && onCssLoaded) onCssLoaded();
        };

        el.onerror = () => {
            console.error(`[Loader] 載入失敗 ${url}`);
            if (isCSS && onCssLoaded) onCssLoaded();
        };

        document.head.appendChild(el);
    }

    function loadApp() {
        console.log(`%c[Loader] 開始初始化資源 (版本: ${typeof APP_VER !== 'undefined' ? APP_VER : 'N/A'})`, "color: #3498db; font-weight: bold;");

        const cssList = resources.styles || [];
        let cssLoadedCount = 0;

        const checkCssProgress = () => {
            cssLoadedCount++;
            if (cssLoadedCount >= cssList.length) {
                document.documentElement.style.visibility = 'visible';
                console.log("%c[Loader] 樣式套用完成，解除頁面鎖定", "color: #9b59b6; font-weight: bold;");
            }
        };

        if (cssList.length === 0) {
            document.documentElement.style.visibility = 'visible';
        }

        const configs = [
            { data: cssList, type: 'css', label: 'CSS' },
            { data: resources.scripts, type: 'js', label: 'JS' }
        ];

        configs.forEach(config => {
            if (config.data && config.data.length > 0) {
                config.data.forEach(url => {
                    injectResource(config.type, url, config.type === 'css' ? checkCssProgress : null);
                });
            } else {
                console.log(`%c[Loader] 無外部 ${config.label} 資源需要載入`, "color: #e67e22");
            }
        });
    }

    // 執行
    loadApp();
})();