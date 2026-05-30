var resources = {
    styles: [
        "style.css"
    ], 
    
    scripts: [
        { url: "logic.js",  type: "js" },
        "script.js"
    ]
};

// 生產模式：用 window.APP_ENV.isEsbuild（由 loader_engine.js 設定）
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