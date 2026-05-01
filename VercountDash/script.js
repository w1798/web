// 負責載入多個外部套件的函式
function initLibraries() {
    const libraries = [
        {
            url: 'https://cdn.jsdelivr.net/npm/chart.js'
        }
    ];

    libraries.forEach(lib => {
        // 1. 自動從 URL 提取檔名
        const fileName = new URL(lib.url).pathname.split('/').pop();

        // 2. 處理 shouldLoad 邏輯：
        // 如果 lib.condition 有定義，就用它的結果；如果沒定義(undefined)，則預設為 true
        const shouldLoad = (lib.condition !== undefined) ? lib.condition : true;

        if (!shouldLoad) {
            console.log(`%c[跳過] 環境支援原生功能，不載入: ${fileName}`, 'color: #9E9E9E;');
            return;
        }

        const script = document.createElement('script');
        script.src = lib.url;
        script.async = false;

        script.onload = function() {
            console.log(`%c[成功] 外部庫已載入: ${fileName}`, 'color: #4CAF50; font-weight: bold;');
        };

        script.onerror = function() {
            const fallbackPath = `libs/${fileName}`;
            console.warn(`[失敗] 載入失敗，嘗試本地備援: ${fallbackPath}`);
            
            const fallbackScript = document.createElement('script');
            fallbackScript.src = fallbackPath;
            fallbackScript.onload = () => console.log(`%c[備援成功] 已從本地載入: ${fileName}`, 'color: #FF9800; font-weight: bold;');
            fallbackScript.onerror = () => console.error(`[重大錯誤] 本地檔案不存在: ${fallbackPath}`);

            document.head.appendChild(fallbackScript);
        };

        document.head.appendChild(script);
    });
}

// 啟動
initLibraries();