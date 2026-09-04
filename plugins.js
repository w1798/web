/**
 * Charles Nextime - 通用套件載入引擎 (plugins.js)
 */

(function() {
    const L = window.L;

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

        const { isEsbuild: isEsbuildMode } = window.APP_ENV;

        if (isEsbuildMode) {
            // pro 模式：React 必須在 loadapp.js 之前載入 (lazy: false)
            const jsxLibs = [
                { url: "https://cdnjs.cloudflare.com/ajax/libs/react/18.3.1/umd/react.production.min.js", lazy: false },
                { url: "https://cdnjs.cloudflare.com/ajax/libs/react-dom/18.3.1/umd/react-dom.production.min.js", lazy: false }
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
                L(`[plugins] [略過]: ${fileName} (環境已支援)`);
                return;
            }

            const script = document.createElement('script');
            script.src = lib.url;
            // 關鍵修復：即使是延遲載入，也必須設為 async = false 以保證依賴順序 (React -> ReactDOM)
            script.async = false; 

            script.onload = () => L(`[plugins] [成功] ${isLazy ? '背景' : '核心'}庫已載入: ${fileName}`);
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
        L('[plugins] 啟動背景資源載入...');
        initLibraries(true);
    };
})();