var resources = {
    styles: [
        "style.css"
    ], 
    
    scripts: [
        { url: "logic.js",  type: "js" },
        "script.js"
    ]
};

// 生產模式 (APP_JSX='es'，isEsbuild=true，由 loader_engine.js 設定)：
// 目的：把「純邏輯層 logic.js」換成 esbuild 打包壓縮後的 dist/vanilla.js。
// 原因：loadapp.js 只會自動加 dist/ 前綴給「字串」script，不會給 type:'js' 物件，
//       所以必須在此手動過濾掉 logic.js，改插入 dist/vanilla.js，才能載入打包檔。
// 開發模式 (非 esbuild)：維持前半段，依序載入原始 logic.js → script.js，方便除錯。
if (typeof window !== 'undefined' && window.APP_ENV && window.APP_ENV.isEsbuild) {
    var filtered = [];
    for (var i = 0; i < resources.scripts.length; i++) {
        var item = resources.scripts[i];
        if (typeof item !== 'object' || item.type !== 'js') {
            filtered.push(item);
        }
    }
    filtered.unshift('dist/vanilla.js');
    resources.scripts = filtered;
}