var resources = {
    libs: [
        {
            url: "https://cdnjs.cloudflare.com/ajax/libs/pako/2.1.0/pako.min.js",
            condition: typeof DecompressionStream === "undefined",      // 判斷瀏覽器是否支援gzip，不支援才去下載
            fallback: "../libs/pako.min.js"     // 如果檔名衝突，可以自訂檔名
        }
    ],
    styles: [
        "style.css"
    ], 
    
    scripts: [
        "db.js",
        "context.js",
        "pages/DietPage.js",
        "pages/BowelPage.js",
        "pages/AnalysisPage.js",
        "pages/SettingsPage.js",
        "script.js"
    ]
};