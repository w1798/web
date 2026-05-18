/**
 * Charles Nextime - 通用套件載入引擎 (plugins.js)
 */

(function() {
    function initLibraries(isLazy = false) {
        let libraries = (typeof resources !== 'undefined' && resources.libs) ? [...resources.libs] : [];

        // 基礎裝備：Pako.js (當瀏覽器不支援原生 DecompressionStream 時自動補位)
        const baseLibs = [
            { 
                url: "https://cdnjs.cloudflare.com/ajax/libs/pako/2.1.0/pako.min.js", 
                condition: typeof DecompressionStream === "undefined" 
            }
        ];
        // 預置基礎庫
        baseLibs.forEach(bl => {
            if (!libraries.some(l => (typeof l === 'string' ? l : l.url) === bl.url)) {
                libraries.unshift(bl); // 放在最前面優先判斷
            }
        });

        // 恢復簡單注入：只識別顯式的 APP_JSX 旗標
        const shouldLoadJSX = typeof APP_JSX !== 'undefined' && APP_JSX === 1;

        if (shouldLoadJSX) {
            const jsxLibs = [
                { url: "https://cdnjs.cloudflare.com/ajax/libs/react/18.3.1/umd/react.production.min.js", lazy: true },
                { url: "https://cdnjs.cloudflare.com/ajax/libs/react-dom/18.3.1/umd/react-dom.production.min.js", lazy: true },
                { url: "https://cdnjs.cloudflare.com/ajax/libs/babel-standalone/7.23.9/babel.min.js", lazy: true }
            ];
            // 避免重複加入
            jsxLibs.forEach(jl => {
                if (!libraries.some(l => (typeof l === 'string' ? l : l.url) === jl.url)) {
                    libraries.push(jl);
                }
            });
        }

        if (libraries.length === 0) return;

        libraries.forEach(item => {
            const lib = typeof item === 'string' ? { url: item } : item;
            const fileName = new URL(lib.url).pathname.split('/').pop();
            const shouldLoad = (lib.condition !== undefined) ? lib.condition : true;
            
            // 模式匹配：如果是正常模式，跳過標記為 lazy 的；如果是 lazy 模式，指抓載入標記為 lazy 的
            const isItemLazy = lib.lazy === true;
            if (isLazy !== isItemLazy) return;

            if (!shouldLoad) {
                console.log(`%c[plugins] [略過]: ${fileName} (環境已支援)`, 'color: #9E9E9E;');
                return;
            }

            const script = document.createElement('script');
            script.src = lib.url;
            // 關鍵修復：即使是延遲載入，也必須設為 async = false 以保證依賴順序 (React -> ReactDOM)
            script.async = false; 

            script.onload = () => console.log(`%c[plugins] [成功] ${isLazy ? '背景' : '核心'}庫已載入: ${fileName}`, 'color: #4CAF50;');
            script.onerror = function() {
                const isRoot = (typeof APP_ROOT !== 'undefined' && APP_ROOT === 1);
                const defaultPrefix = isRoot ? "libs/" : "../libs/";
                const fallbackPath = lib.fallback || `${defaultPrefix}${fileName}`;
                const fallbackScript = document.createElement('script');
                fallbackScript.src = fallbackPath;
                fallbackScript.async = false;
                document.head.appendChild(fallbackScript);
            };

            document.head.appendChild(script);
        });
    }

    // 第一階段：載入核心資源
    initLibraries(false);

    // 提供介面讓外部揭開第二階段
    window.startLazyLoading = function() {
        console.log("%c[plugins] 啟動背景資源載入...", "color: #9b59b6; font-weight: bold;");
        initLibraries(true);
    };
})();