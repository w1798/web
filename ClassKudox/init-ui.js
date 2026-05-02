/**
 * ClassKudox - UI Initialization
 * 用於替代原本的寫法產成下拉選單選項
 */

function initSelectOptions() {
    console.log('[Init-UI] 開始初始化下拉選單選項...');
    
    // 1. 每列顯示學生數 (2-15)
    populateRange('gridColsSelect', 2, 15, 1, ' 人');
    
    // 2. 學生卡高度 (-40 到 100)
    populateRange('cardHeightSelect', -40, 100, 10, 'px', true);
    
    // 3. 群組卡高度 (-40 到 100)
    populateRange('groupHeightSelect', -40, 100, 10, 'px', true);
    
    // 4. 每列顯示群組數 (1-10)
    populateRange('groupColsSelect', 1, 10, 1, ' 個');
    
    // 5. 每列顯示行為項目數 (1-10)
    populateRange('itemColsSelect', 1, 10, 1, ' 個');
    
    // 6. 行為按鈕縮放 (-40 到 60)
    populateRange('itemScaleSelect', -40, 60, 10, 'px', true);
    
    // 7. 頭像縮放百分比 (-60 到 60)
    populateRange('avatarSizeSelect', -40, 100, 10, '%', true);
    
    // 8. 卡片間距 (水平與垂直: 0-60)
    populateRange('cardGapVSelect', 0, 60, 5, 'px');
    populateRange('cardGapHSelect', 0, 60, 5, 'px');
    
    // 9. 行為按鈕間距 (0-60)
    populateRange('itemGapVSelect', 0, 60, 5, 'px');
    populateRange('itemGapHSelect', 0, 60, 5, 'px');
    
    console.log('[Init-UI] 下拉選單初始化完成。');
}

/**
 * 填充數值範圍到指定的 Select 元素
 * @param {string} id 元素 ID
 * @param {number} start 開始值
 * @param {number} end 結束值
 * @param {number} step 步進值
 * @param {string} suffix 單位後綴
 * @param {boolean} showSign 是否顯示正負號
 */
function populateRange(id, start, end, step, suffix, showSign = false) {
    const select = document.getElementById(id);
    if (!select) return;
    
    // 清空現有選項 (如果有)
    select.innerHTML = '';
    
    for (let i = start; i <= end; i += step) {
        const opt = document.createElement('option');
        opt.value = i;
        const sign = (showSign && i > 0) ? '+' : '';
        opt.textContent = `${sign}${i}${suffix}`;
        select.appendChild(opt);
    }
}

// 監聽 DOMReady 或由 loader 觸發
if (document.readyState === 'complete' || document.readyState === 'interactive') {
    initSelectOptions();
} else {
    document.addEventListener('DOMContentLoaded', initSelectOptions);
}
