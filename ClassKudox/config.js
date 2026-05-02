var resources = {
    styles: [
        'style.css'
    ],
    scripts: [
        'utils.js',
        'state.js',
        'sync.js',
        'ui.js',
        'actions.js',
        'script.js',
        'init-ui.js',
        'updater.js'
    ],
    libs: [
        {
            url: 'https://cdnjs.cloudflare.com/ajax/libs/pako/2.1.0/pako.min.js',
            condition: typeof DecompressionStream === 'undefined'
        }
    ]

};



