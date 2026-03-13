/* =========================================
   1. 基礎設定與顏色變數
   ========================================= */
:root { 
    --primary: #8fb1e9; 
    --bg: #f0f4f8; 
    --text: #333; 
    --card: #fff; 
    --grid-cols: 5; 
    --student-cols: 7; 
    /* 狀態顏色變數 */
    --color-1: #8fb1e9; /* 湖水藍 - 淺藍 */
    --color-2: #ff9800; /* 活力橙 - 亮橘 */
    --color-3: #d81b60; /* 胭脂紅 - 深紅紫 */
    --color-4: #8e24aa; /* 羅蘭紫 - 深紫 */
    --color-5: #546e7a; /* 石板灰 - 冷灰 */
    --color-6: #52b788; /* 深林綠 - 翠綠 */
    --color-7: #e64a19;  /* 磚紅橘 - 比 2 號更深、更紅 */
        --color-8: #3f51b5;  /* 靛藍色 - 正深藍 */
    --color-9: #afb42b;  /* 萊姆黃 - 偏綠的黃 */
    --color-10: #795548; /* 咖啡棕 - 泥土色 */
    --color-11: #ff80ab; /* 亮粉紅 - 比 3 號更淺、更粉 */
    --color-12: #00838f; /* 深青色 - 比 1 號更深、偏綠藍 */
}

/* --- 學生方格基礎樣式 --- */
.student-item {
    position: relative; /* 必須設定，讓數字能定位在方格內 */
    overflow: hidden;   /* 確保數字不會超出方格邊界 */
    z-index: 1;
}

/* --- 背景數字通用樣式 (浮水印感) --- */
.student-item[class*="status-"]::after {
    position: absolute;
    bottom: 5px;  /* 靠下 */
    right: 5px;    /* 靠右 */
    font-size: 2.2rem; /* 數字大小 */
    font-weight: 900;
    font-style: italic;
    color: rgba(255, 255, 255, 0.25); /* 白色半透明，形成浮水印效果 */
    z-index: -1;   /* 放在座號文字後方 */
    pointer-events: none; /* 防止干擾點擊 */
}

/* --- 各狀態對應的顏色、紋理與數字內容 --- */

.student-item.status-1 { background-color: var(--color-1) !important; color: white; }
.student-item.status-1::after { content: "1"; }

.student-item.status-2 { background-color: var(--color-2) !important; color: white; }
.student-item.status-2::after { content: "2"; }

.student-item.status-3 { background-color: var(--color-3) !important; color: white; }
.student-item.status-3::after { content: "3"; }

.student-item.status-4 { background-color: var(--color-4) !important; color: white; }
.student-item.status-4::after { content: "4"; }

.student-item.status-5 { background-color: var(--color-5) !important; color: white; }
.student-item.status-5::after { content: "5"; }

.student-item.status-6 { background-color: var(--color-6) !important; color: white; }
.student-item.status-6::after { content: "6"; }

.student-item.status-7 { background-color: var(--color-7) !important; color: white; }
.student-item.status-7::after { content: "7"; }

.student-item.status-8 { background-color: var(--color-8) !important; color: white; }
.student-item.status-8::after { content: "8"; }

.student-item.status-9 { background-color: var(--color-9) !important; color: white; }
.student-item.status-9::after { content: "9"; }

.student-item.status-10 { background-color: var(--color-10) !important; color: white; }
.student-item.status-10::after { content: "10"; }

.student-item.status-11 { background-color: var(--color-11) !important; color: white; }
.student-item.status-11::after { content: "11"; }

.student-item.status-12 { background-color: var(--color-12) !important; color: white; }
.student-item.status-12::after { content: "12"; }

/* =========================================
   2. 詳情彈窗 Header 排版 (電腦版)
   ========================================= */
.detail-header-row {
    display: flex;
    align-items: center; 
    justify-content: flex-start;
    gap: 10px;
    padding: 10px 15px;
    background: rgba(0,0,0,0.04);
    border-radius: 12px;
    margin-bottom: 15px;
}

#detailTitle {
    font-size: 1.4rem;
    font-weight: bold;
    color: var(--primary);
    margin: 0;
    max-width: 35%;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    flex-shrink: 0;
}

/* 圖例區塊 */
#statusLegend {
    display: flex;
    flex-wrap: wrap;
    justify-content: flex-start;
    gap: 6px;
    flex: 1; /* 電腦版佔據剩餘空間 */
    font-size: 16px;
}

.legend-item {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 2px 6px;
    border-radius: 4px;
    background: #fff;
    box-shadow: 0 1px 3px rgba(0,0,0,0.05);
    white-space: nowrap;
    font-weight: 500;
}

/* 狀態圓點 */
.status-dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    display: inline-block;
}
.status-dot.status-1 { background-color: var(--color-1); }
.status-dot.status-2 { background-color: var(--color-2); }
.status-dot.status-3 { background-color: var(--color-3); }
.status-dot.status-4 { background-color: var(--color-4); }
.status-dot.status-5 { background-color: var(--color-5); }
.status-dot.status-6 { background-color: var(--color-6); }
.status-dot.status-7 { background-color: var(--color-7); }
.status-dot.status-8 { background-color: var(--color-8); }
.status-dot.status-9 { background-color: var(--color-9); }
.status-dot.status-10 { background-color: var(--color-10); }
.status-dot.status-11 { background-color: var(--color-11); }
.status-dot.status-12 { background-color: var(--color-12); }

/* 圖例文字顏色對應 */
.legend-item:nth-child(1) { color: #5a8bd8; } 
.legend-item:nth-child(2) { color: #e68a00; } 
.legend-item:nth-child(3) { color: #d81b60; } 
.legend-item:nth-child(4) { color: #8e24aa; } 
.legend-item:nth-child(5) { color: #546e7a; } 
.legend-item:nth-child(6) { color: #52b788; }

/* =========================================
   3. 全域元件樣式
   ========================================= */
* { box-sizing: border-box; }
body { font-family: sans-serif; background: var(--bg); color: var(--text); margin: 0; padding: 20px; min-height: 100vh; display: flex; flex-direction: column; }

.modal { display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.6); z-index: 999; }
.modal-content { background: var(--card); margin: 2vh auto; padding: 25px; border-radius: 20px; position: relative; max-width: 95%; }
.modal-full { height: 92vh; display: flex; flex-direction: column; margin-left: auto; margin-right: auto; }

.scroll-box { flex: 1; overflow-y: auto; background: rgba(0,0,0,0.03); border-radius: 12px; padding: 15px; }
.student-grid { display: grid; grid-template-columns: repeat(var(--student-cols), 1fr); gap: 8px; }

/* 按鈕樣式 */
.btn-confirm { background: #28a745; color: white; border: none; padding: 8px 20px; border-radius: 8px; cursor: pointer; font-weight: bold; }
.btn-danger { background: #dc3545; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: bold; padding: 8px 15px; }
.nav-btn { font-size: 1rem; padding: 8px 15px; border: none; border-radius: 8px; cursor: pointer; background: rgba(150,150,150,0.1); }

/* =========================================
   4. 手機版 RWD 修正 (解決「完成」按鈕消失問題)
   ========================================= */
@media (max-width: 768px) {
    /* 彈窗整體優化 */
    .modal-content {
        padding: 12px;
        width: 98% !important;
        margin: 1vh auto;
    }

    /* --- 核心：詳情 Header 網格架構 --- */
    .detail-header-row {
        display: grid !important;
        /* 第二列需要三個區塊，所以定義三欄網格 */
        grid-template-columns: repeat(3, 1fr) !important;
        grid-template-rows: auto auto !important;
        row-gap: 8px;
        padding: 5px 10px !important; /* 縮小上下內邊距 */
        margin-top: 0 !important;      /* 確保外部沒有間距 */
        align-items: center;
    }

    /* --- 第一列：打破區塊限制，改用一個橫跨整行的大容器感 --- */
    
    /* 這裡利用一個技巧：讓這三個元素都橫跨整行，但透過 flex 置右 */
    /* 標題與按鈕的共用邏輯：全部擠到第一排，且橫跨三欄寬度 */
    #detailTitle, .btn-danger, .btn-confirm {
        grid-row: 1 / 2;
        grid-column: 1 / span 3; /* 重點：橫跨所有欄位，不再受限於 1/3 的寬度 */
    }

    /* 讓這三個元素在同一排顯示並置右對齊 */
    .detail-header-row {
        /* 如果 HTML 結構中這些元素是散裝的，我們需要精確的定位 */
        display: grid;
    }

    /* 利用 Flex 定位將內容推向右邊 */
    .btn-danger {
        justify-self: end;
        /* 利用 margin-right 將標題和完成按鈕推開 */
        margin-right: calc(100% - 60px); /* 範例：如果想讓刪除在最左邊 */
        /* 但你的需求是「整體置右」，所以我們改用以下更簡單的 margin 組合： */
        margin-right: 250px; /* 這裡根據標題長度動態調整，或者更推薦下方的做法 */
    }

    /* 最穩定的置右做法：強制這三個元素轉為 Flex 排列 */
    /* 我們對個別元素設定置右偏移 */

    .btn-danger {
        grid-row: 1 / 2;
        grid-column: 1 / span 3;
        justify-self: start;
        margin-right: 200px; /* 留位置給標題與完成 */
        padding: 6px 10px !important;
        min-width: 55px !important;
        font-size: 13px;
    }

    #detailTitle {
        grid-row: 1 / 2;
        grid-column: 1 / span 3;
        justify-self: end;
        margin-right: 65px; /* 留位置給完成按鈕 */
        text-align: right;
        font-size: 1.1rem;
        font-weight: bold;
        color: var(--primary);
        white-space: nowrap !important;
        overflow: visible;
        max-width: 60%; /* 給予標題極大的寬度空間 */
    }

    .btn-confirm {
        grid-row: 1 / 2;
        grid-column: 1 / span 3;
        justify-self: end;
        margin-right: 0;
        padding: 6px 10px !important;
        min-width: 55px !important;
        font-size: 13px;
    }

    /* --- 第二列：色系圖例 (三個區塊) --- */
    #statusLegend {
        grid-row: 2 / 3;
        grid-column: 1 / span 3;
        display: grid !important;
        /* 固定三欄，形成三個區塊 */
        grid-template-columns: repeat(3, 1fr) !important; 
        gap: 0px;
        width: 100%;
        border-top: 1px solid rgba(0,0,0,0.05);
        padding-top: 5px;
    }

    .legend-item {
        font-size: 14px;
        padding: 2px 1px;
        justify-content: center;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: clip;
        background: white;
        border-radius: 4px;
        text-align: center;
        box-shadow: 0 1px 2px rgba(0,0,0,0.05);
    }
    
    #statusLegend .status-dot {
        /* 5. 縮小圓點尺寸 */
        width: 6px !important;
        height: 6px !important;
        flex-shrink: 0; /* 防止圓點被擠扁 */
    }
    
    /* --- 座號區塊：連動大小與個數 --- */
    .student-grid {
        display: grid !important;
        grid-template-columns: repeat(var(--student-cols), 1fr) !important; 
        gap: 6px !important;
        margin-top: 15px;
    }

    .student-item {
        font-size: var(--student-font-size) !important; 
        aspect-ratio: 1.2 / 1;
        display: flex;
        align-items: center;
        justify-content: center;
    }
}

/* 導覽列靠右設定 */
.nav-buttons { display: flex; flex: 1; justify-content: flex-end; align-items: center; gap: 10px; }
.danger-zone { margin: 0 20px; background: #fff1f0; border: 1px solid #ffa39e; border-radius: 8px; }


/* 主題設定 (保留您原本的所有主題) */
body[data-theme="soft"] { --primary: #8fb1e9; --bg: #f0f4f8; --text: #333; --card: #fff; }
body[data-theme="tech"] { --primary: #00d4ff; --bg: #0b1e3b; --text: #eee; --card: #162a4a; }
body[data-theme="girl"] { --primary: #ff9a9e; --bg: #fff0f3; --text: #7c4d52; --card: #fff; }
body[data-theme="forest"] { --primary: #52b788; --bg: #f1f8f4; --text: #2d6a4f; --card: #fff; }
body[data-theme="ocean"] { --primary: #0077b6; --bg: #eefbff; --text: #023e8a; --card: #fff; }
body[data-theme="sunset"] { --primary: #f8961e; --bg: #fff5eb; --text: #6a3805; --card: #fff; }
body[data-theme="lavender"] { --primary: #9d4edd; --bg: #f7f0ff; --text: #5a189a; --card: #fff; }
body[data-theme="minimal"] { --primary: #4a4a4a; --bg: #f5f5f5; --text: #222; --card: #fff; }
body[data-theme="sakura"] { --primary: #ffb7c5; --bg: #fff5f7; --text: #d04a60; --card: #fff; }
body[data-theme="coffee"] { --primary: #7f5539; --bg: #ede0d4; --text: #463f3a; --card: #fff; }
body[data-theme="mint"] { --primary: #80ed99; --bg: #f7fffb; --text: #22577a; --card: #fff; }
body[data-theme="lemon"] { --primary: #fee440; --bg: #fffffa; --text: #856404; --card: #fff; }
body[data-theme="grape"] { --primary: #7209b7; --bg: #f8f0ff; --text: #3c096c; --card: #fff; }
body[data-theme="chocolate"] { --primary: #432818; --bg: #fdf0d5; --text: #3c2218; --card: #fff; }
body[data-theme="midnight"] { --primary: #1d3557; --bg: #f1faee; --text: #1d3557; --card: #fff; }

* { box-sizing: border-box; }
body { font-family: sans-serif; background: var(--bg); color: var(--text); margin: 0; padding: 20px; min-height: 100vh; display: flex; 

flex-direction: column; }

/* 標頭響應式 */
header { display: flex; justify-content: space-between; align-items: center; background: var(--card); padding: 15px 30px; border-

radius: 15px; box-shadow: 0 4px 10px rgba(0,0,0,0.1); margin-bottom: 25px; flex-wrap: wrap; gap: 10px; }
.logo { font-size: 2.2rem; font-weight: bold; color: var(--primary); }

/* 主佈局網格 */
.main-layout { flex: 1; display: grid; gap: 15px; grid-template-columns: repeat(var(--grid-cols), minmax(0, 1fr)); align-content: 

start; }
.card { background: var(--card); border-radius: 12px; cursor: pointer; height: 110px; box-shadow: 0 4px 6px rgba(0,0,0,0.05); border: 

1px solid rgba(0,0,0,0.08); display: flex; flex-direction: column; justify-content: center; align-items: center; padding: 10px; 

transition: transform 0.2s; }
.card:hover { transform: translateY(-3px); border-color: var(--primary); }
.card h3 { font-size: 1.1rem; margin: 0; width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; text-align: 

center; }

/* 彈窗核心邏輯 (修正重點) */
.modal { display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.6); z-index: 999; }
.modal-content { background: var(--card); margin: 2vh auto; padding: 30px; border-radius: 20px; position: relative; max-width: 95%; }
.modal-full { height: 92vh; display: flex; flex-direction: column; margin-left: auto; margin-right: auto; }

/* 針對電腦版寬度控制 */
@media (min-width: 769px) {
    .modal-fixed-70 { width: 90% !important; max-width: 1200px; }
    /* 此處讓 JS 設定的 width 生效 */
    .dynamic-size { width: auto; } 
}

/* 滾動區域與內容 */
.scroll-box { flex: 1; overflow-y: auto; background: rgba(0,0,0,0.03); border-radius: 12px; padding: 15px; }
.student-grid { display: grid; grid-template-columns: repeat(var(--student-cols), 1fr); gap: 8px; align-content: start; }
.student-item { 
    aspect-ratio: 1.8 / 1; 
    display: flex; 
    align-items: center; 
    justify-content: center; 
    border: 1px solid rgba(0,0,0,0.1); 
    border-radius: 6px; 
    font-size: var(--student-font-size); /* 使用變數控制大小 */
    cursor: pointer; 
    font-weight: bold; 
    background: var(--card); 
}

.student-item.done { background: var(--primary); color: white; border-color: var(--primary); }

/* 設定頁面佈局 */
.settings-grid-container { 
    display: grid; 
    grid-template-columns: 2fr 2fr 1fr 1fr; 
    gap: 15px; 
    padding: 10px; 
}
.settings-column { 
    display: flex; 
    flex-direction: column; 
    gap: 12px; 
}
.settings-full-row { grid-column: 1 / span 2; margin-top: 10px; }
.settings-row { font-weight: bold; font-size: 1.1rem; }
.settings-row label { display: flex; align-items: center; gap: 5px; cursor: pointer; }

.legend-wrap {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    justify-content: center;
    background: rgba(0,0,0,0.03);
    padding: 8px;
    border-radius: 8px;
    font-size: 0.9rem;
}



/* 確保小圓點樣式 */
.status-dot {
    display: inline-block;
    width: 12px;
    height: 12px;
    border-radius: 50%;
}




/* 其他組件樣式 (保留) */
.modal-header-btns { position: absolute; top: 20px; right: 20px; display: flex; gap: 10px; }
.select-short-width { width: auto; min-width: 90px; font-size: 1rem; padding: 3px; border-radius: 6px; border: 1px solid #ccc; }
.input-triple { width: 100%; font-size: 1.1rem; padding: 10px; border-radius: 8px; min-height: 80px; border: 1px solid #ccc; margin-

top: 8px; }
.large-input { width: 100%; font-size: 2.2rem; padding: 12px; border-radius: 10px; border: 2px solid #ddd; margin-top: 15px; font-

weight: bold; }
.nav-btn { font-size: 1rem; padding: 8px 15px; border: none; border-radius: 8px; cursor: pointer; background: rgba(150,150,150,0.1); 

color: var(--text); }
.btn-primary { background: var(--primary) !important; color: white !important; }
.btn-confirm { background: #28a745; color: white; border: none; padding: 8px 20px; border-radius: 8px; cursor: pointer; font-weight: 

bold; }
.btn-danger { background: #dc3545; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: bold; }
.btn-small { padding: 8px 15px; font-size: 0.9rem; }
.report-header-left { display: flex; align-items: center; gap: 30px; margin-bottom: 10px; padding-left: 20px; }
.report-header-left h2 { margin: 0; font-size: 1.8rem; color: var(--primary); }
.report-header-left .select-box { display: flex; align-items: center; gap: 10px; font-size: 1.4rem; font-weight: bold; }
.report-link { color: var(--primary); text-decoration: underline; cursor: pointer; font-size: 1.4rem; margin: 10px 15px 10px 0; 

display: inline-block; font-weight: bold; }
.report-link:hover { filter: brightness(0.8); color: #000; }
.select-short { font-size: 1.5rem; padding: 5px 15px; border-radius: 8px; cursor: pointer; border: 2px solid var(--primary); }
.author-info { margin-top: 30px; padding: 20px; text-align: center; }
.author-link { text-decoration: none; color: #888; text-decoratimary); /* 若想讓顏色跟隨主題色，可加上這行 */
}

/* --- 手機版 RWD 最終修正 --- */
@media (max-width: 768px) {
    body { padding: 8px; }
    
    header { 
        padding: 10px; 
        flex-direction: column; 
        text-align: center;
    }

    .logo { 
        font-size: 1.3rem; 
        margin-bottom: 8px; 
        width: 100%; 
    }

    /* 讓所有按鈕容器置中並緊密排列 */
    .nav-buttons {
        width: 100%;
        justify-content: center !important; 
        display: flex;
        flex-wrap: wrap; /* 寬度不夠時才換行 */
        gap: 4px; /* 極小間距以擠進更多按鈕 */
    }

    /* 取消群組的區隔感，讓所有按鈕像是在同一個容器內 */
    .nav-group {
        width: auto !important;
        display: flex;
        gap: 4px;
        margin: 0 !important;
    }

    /* 移除重置按鈕區塊的特殊間距與底色 */
    .danger-zone {
        margin: 0 !important;
        background: transparent !important;
        border: none !important;
    }

    /* 縮小按鈕尺寸，確保設定也能擠上去 */
    .nav-btn {
        padding: 5px 8px;
        font-size: 0.85rem;
        white-space: nowrap; /* 防止按鈕文字換行 */
    }

    /* 新增任務按鈕在手機版可以稍微顯眼一點，但不要太寬 */
    .btn-primary {
        padding: 5px 12px;
    }

    /* 彈窗寬度控制 */
    .modal-content { 
        padding: 15px; 
        padding-top: 60px; 
        width: 96% !important; 
        box-sizing: border-box;
    }

    /* 設定頁面內容垂直排列 */
    .settings-grid-container { 
        grid-template-columns: 1fr !important; 
        display: flex;
        flex-direction: column;
        gap: 10px;
    }

    .main-layout { 
        grid-template-columns: repeat(2, 1fr) !important; 
        gap: 8px;
    }
}

/* 讓導覽列容器內的內容全部向右靠齊 */
.nav-buttons {
    display: flex;
    flex: 1;
    justify-content: flex-end; /* 關鍵：所有元素靠右 */
    align-items: center;
    gap: 10px;
}

/* 按鈕群組基礎樣式 */
.nav-group {
    display: flex;
    gap: 10px;
    align-items: center;
}

/* 關鍵：利用左右 margin 在重置按鈕旁留白 */
.danger-zone {
    margin-left: 50px;  /* 增加左側間距，與「匯入」拉開距離 */
    margin-right: 50px; /* 增加右側間距，與「設定」拉開距離 */
    background-color: #fff1f0; /* 選用：給重置按鈕淡淡的底色作為視覺提醒 */
    border-color: #ffa39e;     /* 選用：淡紅色邊框 *
}

/* 手機版適應：回到置中排列，並縮小間距防止溢出螢幕 */
@media (max-width: 768px) {
    .nav-buttons {
        justify-content: center; /* 手機版改回置中 */
        flex-wrap: wrap;
    }
    .danger-zone {
        margin: 5px; /* 手機版不需要超大間距 */
    }
}


