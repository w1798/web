/**
 * ClassKudox - Version Polling & Auto Updater
 * 負責在背景檢查 version.json 是否有新版本
 */

(function() {
    const CHECK_INTERVAL = 10 * 60 * 1000; // 每 10 分鐘檢查一次
    
    function checkVersion() {
        console.log('[Updater] 正在檢查版本更新...');
        fetch('version.json?t=' + Date.now())
            .then(res => res.json())
            .then(data => {
                if (data.ver && typeof APP_VER !== 'undefined' && data.ver !== APP_VER) {
                    console.log(`[Updater] 偵測到新版本: ${APP_VER} -> ${data.ver}，自動更新中...`);
                    localStorage.setItem('APP_VER', data.ver);
                    location.reload(true);
                }
            })
            .catch(err => console.warn('[Updater] 版本檢查失敗 (可能處於離線狀態)'));
    }

    // 啟動定時檢查
    setInterval(checkVersion, CHECK_INTERVAL);
})();
