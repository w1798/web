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