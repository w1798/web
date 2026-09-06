/**
 * Charles Nextime - 通用套件載入引擎 (plugins.js)
 */

(function() {
    const L = window.L;

    /**
     * 載入單一庫：插入 script 標籤（async=false），返回 Promise 供 fallback 追蹤
     * 核心庫（lazy: false）：同步插入不阻塞後續標籤；lazy 庫：可選擇依序
     */
    function loadLibrary(lib, isLazy) {
        const fileName = new URL(lib.url, window.location.href).pathname.split('/').pop();
        const shouldLoad = (lib.condition !== undefined) ? lib.condition : true;
        
        if (!shouldLoad) {
            L(`[plugins] [略過]: ${fileName} (環境已支援)`);
            return Promise.resolve();
        }

        const isRoot = (typeof APP_ROOT !== 'undefined' && APP_ROOT === 1);
        const defaultPrefix = isRoot ? "libs/" : "../libs/";
        const fallbackPath = lib.fallback || `${defaultPrefix}${fileName}`;

        // 建立 CDN script（async=false 保證插入順序即執行順序）
        const cdnScript = document.createElement('script');
        cdnScript.src = lib.url;
        cdnScript.async = false;

        let settled = false;
        const markSettled = () => { settled = true; };

        // 返回 Promise 讓呼叫端可追蹤 fallback 完成，但不阻塞後續插入
        return new Promise((resolve) => {
            // 5 秒超時：建立新的 fallback script，不修改原 script.src
            const timeoutId = setTimeout(() => {
                if (!settled) {
                    L(`[plugins] [超時] ${fileName} CDN 掛起，改用本地: ${fallbackPath}`);
                    markSettled();
                    loadFallback(fallbackPath, fileName, isLazy).then(resolve);
                }
            }, 5000);

            function loadFallback(path, name, lazy) {
                return new Promise((fbResolve) => {
                    const fbScript = document.createElement('script');
                    fbScript.src = path;
                    fbScript.async = false;
                    fbScript.onload = () => {
                        L(`[plugins] [成功] ${lazy ? '背景' : '核心'}庫已載入: ${name} (fallback)`);
                        fbResolve();
                    };
                    fbScript.onerror = () => {
                        L(`[plugins] [失敗] 核心庫載入失敗: ${name}`);
                        fbResolve();
                    };
                    document.head.appendChild(fbScript);
                });
            }

            cdnScript.onload = () => {
                clearTimeout(timeoutId);
                if (settled) return;
                markSettled();
                L(`[plugins] [成功] ${isLazy ? '背景' : '核心'}庫已載入: ${fileName}`);
                resolve();
            };
            cdnScript.onerror = () => {
                clearTimeout(timeoutId);
                if (settled) return;
                markSettled();
                L(`[plugins] [失敗] ${fileName} CDN 載入失敗，改用本地: ${fallbackPath}`);
                loadFallback(fallbackPath, fileName, isLazy).then(resolve);
            };

            // 關鍵：同步插入 script 標籤，不等待 onload
            document.head.appendChild(cdnScript);
        });
    }

    async function initLibraries(isLazy = false) {
        // 取得專案定義的 libs（可能為空或未定義）
        const userLibs = (typeof resources !== 'undefined' && Array.isArray(resources.libs)) ? [...resources.libs] : [];
        let libraries = [...userLibs];

        // 輔助：檢查 libraries 中是否已有某類庫（URL 含關鍵字）
        const hasLib = (keyword) => libraries.some(l => {
            const url = typeof l === 'string' ? l : l.url;
            return url && url.includes(keyword);
        });

        // 1. pako：專案 libs 中沒有 pako 時才補預設
        if (!hasLib('pako')) {
            libraries.unshift({ 
                url: "https://cdnjs.cloudflare.com/ajax/libs/pako/2.1.0/pako.min.js", 
                condition: typeof DecompressionStream === "undefined" 
            });
        }

        // 2. React：esbuild 模式下，專案 libs 中沒有 react 庫時才補預設 React 18
        const { isEsbuild: isEsbuildMode } = window.APP_ENV;
        if (isEsbuildMode && !hasLib('react')) {
            const jsxLibs = [
                { url: "https://cdnjs.cloudflare.com/ajax/libs/react/18.3.1/umd/react.production.min.js", lazy: false },
                { url: "https://cdnjs.cloudflare.com/ajax/libs/react-dom/18.3.1/umd/react-dom.production.min.js", lazy: false }
            ];
            jsxLibs.forEach(jl => libraries.push(jl));
        }

        if (libraries.length === 0) return;

        // 核心庫（lazy: false）：同步立即插入所有 script 標籤，不等待載入完成
        // lazy 庫：維持依序載入（不影響主流程）
        const coreLibs = [];
        const lazyLibs = [];
        
        for (const item of libraries) {
            const lib = typeof item === 'string' ? { url: item } : item;
            const isItemLazy = lib.lazy === true;
            if (isLazy !== isItemLazy) continue;
            
            if (isItemLazy) {
                lazyLibs.push(lib);
            } else {
                coreLibs.push(lib);
            }
        }

        // 核心庫：同步插入所有標籤（async=false 保證順序），不 await
        for (const lib of coreLibs) {
            loadLibrary(lib, false); // 不 await，立即插入下一個
        }

        // lazy 庫：依序載入（背景載入，不阻塞主流程）
        for (const lib of lazyLibs) {
            await loadLibrary(lib, true);
        }
    }

    // 第一階段：載入核心資源
    initLibraries(false);

    // 提供介面讓外部揭開第二階段
    window.startLazyLoading = function() {
        L('[plugins] 啟動背景資源載入...');
        initLibraries(true);
    };
})();