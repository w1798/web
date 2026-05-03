const links = [
    { id: "ClassKudox", category: "daily", title: "班級榮譽星", desc: "　是一套專為教師設計的現代化班級點數管理系統。老師可輕鬆記錄學生的優良行為與待改進事項，支援多班級管理、行為項目自訂、報表 CSV 匯出，讓教學管理更有效率，讓每位學生的努力都被看見。", url: "ClassKudox" },
    { id: "homework", category: "daily", title: "作業動態曆", desc: "　解放雙手的智慧作業排程助手，採「智慧動態推移」技術，讓相同作業自動遞延、精準避開假日。結合直覺的視覺化編輯與全面客製化風格，讓功課管理告別壓力，轉化為一場極簡高效的視覺享受。", url: "homework" },
    { id: "markit", category: "daily", title: "教學清點小幫手", desc: "　快速清點作業與任務，簡化繁瑣流程透，過即時數據與視覺化介面。能精確掌握每位學生的學習動態，大幅減輕繁瑣的班級經營負擔，將寶貴的教學時間與心力，更專注地回歸到教育本質與學生關懷上。", url: "markit" },
    { id: "ClassDojoStats", category: "daily", title: "ClassDojo 點數統計", desc: "　專為教師打造的課堂管理工具，透過 ClassDojo 的 CSV 檔，系統能根據自訂關鍵字自動加減算出總點數。介面簡潔支援全班總覽，協助您高效掌握學生表現，是現代教室數據化管理的最佳助手。", url: "ClassDojoStats" }, 
    { id: "ClassSeatPlanner", category: "daily", title: "智慧班級排座家", desc: "　是一款專為導師設計的智慧化座位管理系統。它突破傳統手寫限制，提供自定義「禁用區域」與一鍵「隨機編排」。系統核心具備「十字」與「九宮格」衝突避讓演算法，能精準確保特定學生不相鄰。透過直觀的拖拽操作與即時位子標記功能，讓複雜的座位調整變得迅速且公平，是優化課堂秩序、提升行政效率的最佳數位幫手。", url: "ClassSeatPlanner" }, 

    { id: "examboard", category: "milestone", title: "數位考場看板", desc: "　這是一套整合式智慧監考系統，透過即時考試進度管理、聽力播放控制與客製化試場設定，協助監考老師精準掌控測驗節奏與秩序。", url: "examboard" },      
    { id: "evalprompt", category: "milestone", title: "評語提詞自造佳", desc: "　自訂模組，造視操作，佳句生成！提供高自由度，讓您「視覺化」自定義類別與特質，並透過簡單操作輕鬆完成評語提詞，是追求效率與流暢美學者的最佳選擇。", url: "evalprompt" },
    { id: "GuardianContacts", category: "milestone", title: "家長通訊錄轉換器", desc: "　專為導師設計，能將學務系統匯出的繁雜 Excel 轉化為 Google/iCloud 聯絡人格式。根據「監護人優先」原則自動標註星號與詳細備註，自動去除重複資料，確保您的手機通訊錄簡潔且資訊完整，一鍵輕鬆完成親師聯繫管道的數位化建置。", url: "GuardianContacts" },            
    { id: "schedulemaster", category: "milestone", title: "學年總課表", desc: "　能自動化整合多班級的 Word 格式課表，系統可讀取任課資訊，自動分類導師課與科任課。支援完全自訂的科目縮寫設定，一鍵生成清晰的「學年總課表」，大幅提升安排教學活動的效率。", url: "ScheduleMaster" },
    { id: "URL2StickPro", category: "milestone", title: "QR碼 專業標籤產生器", desc: "　本工具提供彈性的版面配置，支援圖文上下或左右並排，並內建實線、虛線及無外框等。使用者能自定 QR 碼尺寸、字體大小、行高與紙張邊距，確保排版精確無誤，適配各種規格的預切標籤紙。", url: "URL2StickPro" },
    { id: "speteacher", category: "milestone", title: "專注追蹤器", desc: "　專為教育工作者設計的數位化評估工具，協助使用者即時記錄學生的行為頻率（如分心、離座等），不僅能減少手動記錄的負擔，更可將觀察數據轉化成統計報表，是落實行為分析與優化教學策略的專業利器。", url: "SpeTeacher" },
    { id: "BKL2excel", category: "milestone", title: "博客來書單一鍵轉", desc: "　是一款專為博客來書籍資料設計的自動化擷取工具。透過簡單的「全選、貼上、解析」三步驟，即可精準提取書名、ISBN、售價等八大核心資訊。程式支援多筆資料累加持久化儲存，並提供一鍵 Tab 格式複製，讓使用者能流暢地將批量書籍資訊匯入 Excel 進行管理。", url: "BKL2excel" },
    { id: "NameFormatter", category: "milestone", title: "姓名中譯英格式轉換器", desc: "　本程式是一款專為「外文姓名中譯英」設計的格式自動化工具。使用者僅需輸入中文姓名，系統便能智慧識別姓氏與名字，並一鍵轉換為符合領務局規範的「姓,名1,名2;」格式。內建貼上、清除與複製功能，大幅提升行政處理效率與正確性。", url: "NameFormatter" },


    { id: "textlab", category: "doc", title: "多功能文字處理器", desc: "　透過累加運算邏輯，整合串接、分割、取代與重複項偵測等強大功能。極簡暗色介面搭配直覺式操作，助您瞬間完成複雜的文本清理與格式重塑。", url: "TextLab" },
    { id: "jsoneditor", category: "doc", title: "JSON編輯器", desc: "　能自動解析各種簡單的 JSON 結構檔並視覺化編修，可以資料模組化為直觀的卡片，支援動態拖拽排序與即時編輯，任何配置檔都能輕鬆修改。", url: "jsonEditor" },            
    { id: "jsoncloudguide", category: "doc", title: "JSON雲端備份申請", desc: "　跨平台同步，數據如影隨形申請說明，透過 Upstash 與 JSONBin.io 雲端整合方案，您可以將本地 .json 設定檔透過雲端備份至雲端，輕鬆實現多裝置間的偏好設定共用，打造無縫接軌的數位體驗。", url: "JsonCloudGuide" },
    
    { id: "MathPKPro", category: "game", title: "數學算術 PK 大賽", desc: "　這是一款專為觸屏或平板設計的雙人數學PK網頁。支援直向或面對面視角，結合 RPG 戰鬥機制：答對可發動攻擊、連續答對（Combo）與速答能強化傷害，但每秒會自動扣血，增加競技緊張感。內建多元題型與打地鼠模式，讓數學練習變得像對戰遊戲一樣刺激！", url: "MathPKPro/" },
    
    { id: "Dojo2Kudox", category: "tool", title: "酷多搬家助手", desc: "　專為老師設計的無痛資料轉移工具。只需簡單複製貼上，程式便會自動解析學生名單、點數與加扣分技能，並聰明配對合適的代表圖示。一鍵生成專屬壓縮備份檔，讓您的班級從原本的 ClassDojo 中輕鬆無縫接軌 ClassKudox - 班級榮譽星！", url: "Dojo2Kudox" },            
    { id: "Divvy", category: "tool", title: "股息回本解套記", desc: "　是一套個人化的股息追蹤工具，讓您輕鬆記錄各股票的購入明細與配息歷史。只需貼入公開的配息資料，系統便自動計算每次除息日的應得股息，並支援多股票管理、快速輸入、雲端備份與資料匯出，幫您精準掌握每一筆現金流，逐步邁向解套之路。", url: "Divvy" },            
    { id: "vercountdash", category: "tool", title: "Vercount數據儀表板", desc: "　是為 Vercount 打造的視覺化儀表板，配合 JSONbin 服務能將資料存入雲端。支援多網址 PV/UV 即時監控與 30 日趨勢圖表。具備雙向雲端同步、自動緩衝更新及對比數據顯示，助您精準掌握多個專案的流量動態。", url: "VercountDash" },
    { id: "blogspot", category: "tool", title: "其他電腦程式", desc: "　Charles Nextime 的程式，提供一些好用的 Windows 軟體，程式碼公開透明，不僅安全免費、無廣告干擾，更能自由使用，邀您體驗純粹、強大且不受限的數位工作流。", url: "https://nextime5.blogspot.com/" }
];

let currentCategory = 'all';

function renderLinks() {
    const container = document.getElementById('link-container');
    const favorites = JSON.parse(localStorage.getItem('my_favorites') || '[]');
    
    // --- 1. 判斷目前的環境來決定 URL 前綴與後綴 ---
    const currentHref = window.location.href;
    let urlPrefix = "";
    let urlSuffix = "";

    if (currentHref.startsWith('http://192.168.') || currentHref.startsWith('http://127.0.')) {
        // 情況 1：區域網路或本機伺服器
        urlPrefix = "";
        urlSuffix = "";
    } else if (currentHref.startsWith('file:///')) {
        // 情況 2：直接開啟本地檔案
        urlPrefix = "";
        urlSuffix = "/index.html";
    } else {
        // 情況 3：其他（通常是 GitHub Pages 正式環境）
        urlPrefix = "https://w1798.github.io/web/";
        urlSuffix = "";
    }

    let filteredData = currentCategory === 'all' ? links : (
        currentCategory === 'fav' ? links.filter(i => favorites.includes(i.id)) :
        links.filter(i => i.category === currentCategory)
    );

    // 排序與 Class 邏輯保持不變...
    filteredData.sort((a, b) => {
        const aFav = favorites.includes(a.id);
        const bFav = favorites.includes(b.id);
        if (aFav && !bFav) return -1;
        if (!aFav && bFav) return 1;
        return 0;
    });

    const isSimpleView = container.classList.contains('simple-view');
    const isLargeGroup = !isSimpleView && filteredData.length > 6;

    container.innerHTML = filteredData.map(item => {
        let cardClass = `card cat-${item.category}`;
        if (isSimpleView) cardClass += ' has-tooltip';
        if (isLargeGroup) cardClass += ' line-clamp';
        
        const isFav = favorites.includes(item.id);

        // --- 2. 處理最終 URL ---
        // 如果 url 本身已經是完整的 http 開頭（如 blogspot），則不進行轉換
        const finalUrl = item.url.startsWith('http') 
                         ? item.url 
                         : `${urlPrefix}${item.url}${urlSuffix}`;

        return `
            <a href="${finalUrl}" target="_blank" class="${cardClass}" onmouseenter="checkTooltipBoundary(this)">
                <h2>
                    <span class="heart-icon ${isFav ? 'is-fav' : ''}" onclick="toggleFavorite(event, '${item.id}')">${isFav ? '❤️' : '♡'}</span>
                    <span class="title-text">${item.title}</span>
                </h2>
                <p>${item.desc}</p>
                <div class="card-stats">使用：<b id="count-${item.id}">...</b> 次</div>
            </a>
        `;
    }).join('');

    fetchStats(filteredData);
}


// 使用 async/await 讓請求乖乖排隊
async function fetchStats(dataList) {
    const CACHE_KEY_PREFIX = 'vc_cache_';
    const CACHE_TIME = 60 * 60 * 1000; // 60 分鐘 (毫秒)
    const now = Date.now();

    for (const item of dataList) {
        const el = document.getElementById(`count-${item.id}`);
        if (!el) continue;

        // 嘗試從 localStorage 讀取快取
        const cachedData = localStorage.getItem(CACHE_KEY_PREFIX + item.id);
        if (cachedData) {
            const { value, timestamp } = JSON.parse(cachedData);
            // 檢查是否在 5 分鐘內
            if (now - timestamp < CACHE_TIME) {
                el.innerText = value.toLocaleString();
                continue; // 跳過這次 fetch，直接處理下一個
            }
        }

        try {
            await new Promise(resolve => setTimeout(resolve, 50)); 
            const response = await fetch(`https://events.vercount.one/log?url=${item.url}`);
            const data = await response.json();
            const num = data.page_pv !== undefined ? data.page_pv : 0;
            
            // 更新顯示
            el.innerText = num.toLocaleString();
            
            // 存入快取
            localStorage.setItem(CACHE_KEY_PREFIX + item.id, JSON.stringify({
                value: num,
                timestamp: now
            }));
        } catch (error) {
            console.error('抓取失敗:', item.id, error);
            el.innerText = '-';
        }
    }
}


function filterLinks(category, element) {
    if (currentCategory === category) return;
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    element.classList.add('active');
    currentCategory = category;
    
    // 我的最愛與全部彙整預設使用精簡模式
    const useSimple = (category === 'all' || category === 'fav');
    changeView(useSimple ? 'simple' : 'detail', document.getElementById(useSimple ? 'btn-simple' : 'btn-detail'));
    
    renderLinks();
    
    // --- 新增：自動捲動至置中 ---
    element.scrollIntoView({
        behavior: 'smooth', // 平滑捲動
        inline: 'center',   // 水平方向對齊中間
        block: 'nearest'    // 垂直方向保持不動
    });

    // --- 新增：點選後自動回頂端 ---
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// --- 新增：手勢偵測與導覽控制 ---
let touchStartX = 0;
let touchStartY = 0;

window.addEventListener('touchstart', e => {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
}, { passive: true });

window.addEventListener('touchend', e => {
    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;
    const dx = touchEndX - touchStartX;
    const dy = touchEndY - touchStartY;

    // 門檻：水平滑動距離 > 80px，且水平位移顯著大於垂直位移（防誤觸捲動）
    if (Math.abs(dx) > 80 && Math.abs(dx) > Math.abs(dy)) {
        if (dx < 0) {
            navigateCategory(1); // 向右滑 -> 前一個 (左邊) 
        } else {
            navigateCategory(-1); //向左滑 -> 次一個 (右邊)
        }
    }
}, { passive: true });

function navigateCategory(direction) {
    if (window.innerWidth > 850) return; // 僅限手機版
    const cats = ['all', 'fav', 'daily', 'milestone', 'doc', 'game', 'tool'];
    let currentIdx = cats.indexOf(currentCategory);
    let nextIdx = currentIdx + direction;
    if (nextIdx >= 0 && nextIdx < cats.length) {
        const nextCat = cats[nextIdx];
        const nextEl = document.getElementById(`nav-${nextCat}`);
        if (nextEl) filterLinks(nextCat, nextEl);
    }
}

function toggleFavorite(event, id) {
    event.preventDefault(); // 防止跳轉到連結
    event.stopPropagation(); // 防止觸發卡片點擊
    
    let favorites = JSON.parse(localStorage.getItem('my_favorites') || '[]');
    const index = favorites.indexOf(id);
    
    if (index > -1) {
        favorites.splice(index, 1);
    } else {
        favorites.push(id);
    }
    
    localStorage.setItem('my_favorites', JSON.stringify(favorites));
    renderLinks();
    updateSidebarCounts(); // 更新計數
}

function resetAllData() {
    if (confirm('確定要重置所有收藏與統計快取嗎？')) {
        // 依照要求使用 localStorage.removeItem
        localStorage.removeItem('my_favorites');
        
        // 同時清除統計快取
        const keys = Object.keys(localStorage);
        keys.forEach(key => {
            if (key.startsWith('vc_cache_')) {
                localStorage.removeItem(key);
            }
        });
        
        updateSidebarCounts(); // 更新計數
        location.reload();
    }
}

function updateSidebarCounts() {
    const favorites = JSON.parse(localStorage.getItem('my_favorites') || '[]');
    const validFavorites = favorites.filter(id => links.some(l => l.id === id));
    
    const categories = {
        all: { label: '全部彙整', count: links.length },
        fav: { label: '我的最愛', count: validFavorites.length },
        daily: { label: '教學日常', count: links.filter(l => l.category === 'daily').length },
        milestone: { label: '階段任務', count: links.filter(l => l.category === 'milestone').length },
        doc: { label: '文件相關', count: links.filter(l => l.category === 'doc').length },
        game: { label: '教學遊戲', count: links.filter(l => l.category === 'game').length },
        tool: { label: '其他軟體', count: links.filter(l => l.category === 'tool').length }
    };

    Object.keys(categories).forEach(cat => {
        const el = document.getElementById(`nav-${cat}`);
        if (el) {
            el.innerText = `${categories[cat].label}(${categories[cat].count})`;
        }
    });
}

function changeView(mode, element) {
    const container = document.getElementById('link-container');
    document.querySelectorAll('.view-btn').forEach(el => el.classList.remove('active'));
    element.classList.add('active');
    container.className = mode === 'detail' ? 'detail-view' : 'simple-view';
    renderLinks(); // 切換視圖後重新渲染以更新 class 邏輯
}

function scrollToComments() {
    const commentSection = document.getElementById('comment-area');
    if (commentSection) {
        // 取得 header 的高度
        const headerHeight = document.querySelector('header').offsetHeight;
        // 計算位置：目標位置 - header高度 - 額外的間距(20px)
        const elementPosition = commentSection.getBoundingClientRect().top + window.pageYOffset;
        const offsetPosition = elementPosition - headerHeight - 20;

        window.scrollTo({
            top: offsetPosition,
            behavior: 'smooth'
        });
    }
}

// 偵測工具提示是否超出邊界並修正 (桌機版專用)
function checkTooltipBoundary(element) {
    if (window.innerWidth <= 850 || !element.classList.contains('has-tooltip')) return;
    
    const p = element.querySelector('p');
    if (!p) return;
    
    // 先重設樣式
    p.style.left = '50%';
    p.style.right = 'auto';
    p.style.transform = 'translateX(-50%)';
    
    // 取得當前幾何資訊
    const rect = p.getBoundingClientRect();
    const padding = 20; // 邊界緩衝
    
    if (rect.right > window.innerWidth - padding) {
        // 超出右邊界：向左靠齊
        const diff = rect.right - (window.innerWidth - padding);
        p.style.transform = `translateX(calc(-50% - ${diff}px))`;
    } else if (rect.left < padding) {
        // 超出左邊界：向右靠齊
        const diff = padding - rect.left;
        p.style.transform = `translateX(calc(-50% + ${diff}px))`;
    }
}


// 監聽網頁捲動事件
window.onscroll = function() {
    const topBtn = document.getElementById("backToTop");
    // 當捲動超過 300px 時顯示按鈕
    if (document.body.scrollTop > 300 || document.documentElement.scrollTop > 300) {
        topBtn.style.display = "block";
    } else {
        topBtn.style.display = "none";
    }
};

// 回到頂端的平滑捲動函數
function scrollToTop() {
    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
}

// 確保在 DOM 載入後執行
function initApp() {
    renderLinks();
    updateSidebarCounts(); // 初始載入計數
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}
