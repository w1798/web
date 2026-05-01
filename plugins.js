/**
 * Charles Nextime - 通用套件載入引擎 (loadlibs.js)
 */
(function() {
    function initLibraries() {
        // 讀取 index.html 傳進來的配置，如果沒寫就給個空陣列
        const libraries = (typeof resources !== 'undefined' && resources.libs) ? resources.libs : [];

        if (libraries.length === 0) {
            console.log("%c[LibLoader] 無外部套件需要載入", "color: #9E9E9E;");
            return;
        }

        console.log(`%c[LibLoader] 開始檢查外部套件...`, "color: #3498db;");

        libraries.forEach(lib => {
            // 自動提取檔名
            const fileName = new URL(lib.url).pathname.split('/').pop();
            
            // 判斷是否需要載入
            const shouldLoad = (lib.condition !== undefined) ? lib.condition : true;

            if (!shouldLoad) {
                console.log(`%c[跳過] 環境支援原生功能: ${fileName}`, 'color: #9E9E9E;');
                return;
            }

            const script = document.createElement('script');
            script.src = lib.url;
            script.async = false;

            script.onload = () => console.log(`%c[成功] 外部庫已載入: ${fileName}`, 'color: #4CAF50; font-weight: bold;');

            // 在 loadlibs.js 的迴圈中
            script.onerror = function() {
                // 如果有寫 fallback 就用 fallback，沒寫才用預設檔名
                const fallbackPath = lib.fallback || `../libs/${fileName}`; 
                
                console.warn(`[失敗] CDN 失敗，嘗試備援: ${fallbackPath}`);
                
                const fallbackScript = document.createElement('script');
                fallbackScript.src = fallbackPath;
                fallbackScript.async = false;
                fallbackScript.onload = () => console.log(`%c[備援成功] 已載入: ${fileName}`, 'color: #FF9800; font-weight: bold;');
                fallbackScript.onerror = () => console.error(`[重大錯誤] 備援失敗: ${fallbackPath}`);

                document.head.appendChild(fallbackScript);
            };

            document.head.appendChild(script);
        });
    }

    initLibraries();
})();