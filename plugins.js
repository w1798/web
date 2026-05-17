/**
 * Charles Nextime - 通用套件載入引擎 (plugins.js)
 */

(function() {
    function initLibraries() {
        // 讀取 index.html 傳進來的配置，如果沒寫就給個空陣列
        const libraries = (typeof resources !== 'undefined' && resources.libs) ? resources.libs : [];

        if (libraries.length === 0) {
            console.log("%c[plugins] 無外部套件需要載入", "color: #9E9E9E;");
            return;
        }

        console.log(`%c[plugins] 開始檢查外部套件...`, "color: #3498db;");

        libraries.forEach(item => {
            // 正規化參數：支援字串或是完整的設定物件
            const lib = typeof item === 'string' ? { url: item } : item;

            // 自動提取檔名
            const fileName = new URL(lib.url).pathname.split('/').pop();
            
            // 判斷是否需要載入？(undefined 為沒定義，要載入。有定義時，依定義條件傳回是否載入)
            const shouldLoad = (lib.condition !== undefined) ? lib.condition : true;

            if (!shouldLoad) {
                console.log(`%c[plugins] [跳過] 環境支援原生功能: ${fileName}`, 'color: #9E9E9E;');
                return;
            }

            const script = document.createElement('script');
            script.src = lib.url;
            script.async = false;

            script.onload = () => console.log(`%c[plugins] [成功] 外部庫已載入: ${fileName}`, 'color: #4CAF50; font-weight: bold;');

            // 在 loadlibs.js 的迴圈中
            script.onerror = function() {
                // 1. 判斷是否為根目錄
                const isRoot = (typeof APP_ROOT !== 'undefined' && APP_ROOT === 1);
                
                // 2. 根據 APP_ROOT 決定預設的備援路徑前綴
                const defaultPrefix = isRoot ? "libs/" : "../libs/";
                
                // 3. 如果 lib.fallback 有值就用它的，否則組裝預設路徑
                const fallbackPath = lib.fallback || `${defaultPrefix}${fileName}`;
                
                console.warn(`[plugins] [失敗] CDN 失敗，嘗試備援: ${fallbackPath}`);
                
                const fallbackScript = document.createElement('script');
                fallbackScript.src = fallbackPath;
                fallbackScript.async = false;
                fallbackScript.onload = () => console.log(`%c[plugins] [備援成功] 已載入: ${fileName}`, 'color: #FF9800; font-weight: bold;');
                fallbackScript.onerror = () => console.error(`[[plugins] 重大錯誤] 備援失敗: ${fallbackPath}`);

                document.head.appendChild(fallbackScript);
            };

            document.head.appendChild(script);
        });
    }

    initLibraries();
})();