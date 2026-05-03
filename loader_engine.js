/**
 * Charles Nextime - 資源載入引擎 (Engine.js)
 */

function reveal() {
    if (document.documentElement.style.visibility === 'hidden') {
        document.documentElement.style.visibility = 'visible';
        console.warn("[Engine] 載入資源超時，已強行顯示頁面。");
        
        setTimeout(() => {
            const statusEl = document.getElementById('status');
            if (statusEl) {
                statusEl.innerHTML = "<span style='color:red; font-weight:bold;'>[Engine] 系統載入稍慢，部分功能可能尚未就緒。</span>";
            }
        }, 0);
    }
}

// 輔助函式：建立 Script 標籤並返回 Promise
function loadScript(src) {
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = src;
        script.onload = () => resolve(src);
        script.onerror = () => reject(src);
        document.head.appendChild(script);
    });
}

async function startLoading() {
    const version = typeof APP_VER !== 'undefined' ? APP_VER : '1.00a';
    const isRoot = (typeof APP_ROOT !== 'undefined' && APP_ROOT === 1);
    const pathPrefix = isRoot ? "" : "../";
    
    // 設定 5 秒全域超時保險
    const timeoutId = setTimeout(reveal, 5000);

    try {
        // --- 第一步：載入核心配置 ---
        console.log("[Engine] 開始載入 config.js...");
        await loadScript(`config.js?ver=${version}`);

        // --- 第二步：並行載入通用插件 ---
        const commonAssets = [
            `${pathPrefix}counter.js?ver=${version}`,
            `${pathPrefix}plugins.js?ver=${version}`
        ];
        console.log(`[Engine] 載入通用資源: counter.js, plugins.js`);
        
        const results = await Promise.allSettled(commonAssets.map(src => loadScript(src)));
        
        results.forEach((result, index) => {
            if (result.status === 'rejected') {
                console.error(`[Engine] 資源載入失敗: ${commonAssets[index]}`);
            } else {
                console.log(`[Engine] 資源載入成功: ${result.value}`);
            }
        });

        // --- 第三步：載入主程式 loadapp.js ---
        console.log("[Engine] 準備啟動 loadapp.js...");
        await loadScript(`${pathPrefix}loadapp.js?ver=${version}`);

        // --- 全部成功：清除超時計時器 ---
        clearTimeout(timeoutId);
        console.log("[Engine] 所有核心資源載入完成，保險定時器已解除。");

    } catch (error) {
        console.error("[Engine] 載入過程中發生關鍵錯誤:", error);
        // 如果 catch 抓到錯誤（通常是 loadScript 失敗），就不清除 timeout，讓 reveal 觸發
    }
}

startLoading();