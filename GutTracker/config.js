var resources = {
    libs: [
        {
            url: "https://cdnjs.cloudflare.com/ajax/libs/pako/2.1.0/pako.min.js",
            condition: typeof DecompressionStream === "undefined",      // 判斷瀏覽器是否支援gzip，不支援才去下載
            fallback: "../libs/pako.min.js"     // 如果檔名衝突，可以自訂檔名
        }, 
        "https://unpkg.com/react@18/umd/react.development.js",   
        "https://unpkg.com/react-dom@18/umd/react-dom.development.js", 
        "https://unpkg.com/@babel/standalone/babel.min.js"
    ],
    styles: [
        "style.css"
    ], 
    
    scripts: [
        { url: "db.js", type: "jsx" },
        { url: "context.js", type: "jsx" },
        { url: "pages/DietPage.js", type: "jsx" },
        { url: "pages/BowelPage.js", type: "jsx" },
        { url: "pages/AnalysisPage.js", type: "jsx" },
        { url: "pages/SettingsPage.js", type: "jsx" },
        { url: "script.js", type: "jsx" }
    ]
};