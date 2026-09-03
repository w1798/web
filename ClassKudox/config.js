var resources = {
    styles: [
        'style.css'
    ],
    scripts: [
        { url: 'utils.js', type: 'js' },
        { url: 'state.js', type: 'js' },
        { url: 'sync.js', type: 'js' },
        { url: 'actions.js', type: 'js' },
        { url: 'ui.js', type: 'js' },
        { url: 'init-ui.js', type: 'js' },
        { url: 'updater.js', type: 'js' },

        'context.js',
        'components/Header.js',
        'components/StudentGrid.js',
        'components/GroupGrid.js',
        'components/MultiSelectBar.js',
        'components/Modals.js',
        'components/Settings.js',
        'components/Reports.js',
        'script.js'
    ],
    libs: [
    ]

};

// 生產模式 (APP_JSX='es'，isEsbuild=true，由 loader_engine.js 設定)：
// 目的：把「純邏輯層 (utils/state/sync/actions/ui/init-ui/updater)」換成 esbuild 打包壓縮後的 dist/vanilla.js。
// 原因：loadapp.js 只會自動加 dist/ 前綴給「字串」script，不會給 type:'js' 物件，
//       所以必須在此手動過濾掉所有 type:'js' 邏輯檔，改插入 dist/vanilla.js，才能載入打包檔。
// 開發模式 (非 esbuild)：維持前半段，依序載入原始邏輯檔 → UI 檔，方便除錯。
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