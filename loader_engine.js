/**
 * 資源載入引擎 - Engine.js
 */

// 強制顯示函式
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

// 封裝載入邏輯
function startLoading() {
    const loader = document.createElement('script');

    // 檢查是否有定義 APP_ROOT 且其值為 1
    const isRoot = (typeof APP_ROOT !== 'undefined' && APP_ROOT === 1);
    const pathPrefix = isRoot ? "" : "../";
    
    // 組合最終路徑
    const version = typeof APP_VER !== 'undefined' ? APP_VER : 'default';
    loader.src = `${pathPrefix}loadapp.js?ver=${version}`;
    
    const timeoutId = setTimeout(reveal, 3000); 

    loader.onload = () => {
        clearTimeout(timeoutId); 
        console.log("[Engine] loadapp.js 載入成功");
    };

    loader.onerror = () => {
        clearTimeout(timeoutId);
        reveal();
        console.error("[Engine] loadapp.js 載入失敗");
    };

    document.head.appendChild(loader);
}

startLoading();
