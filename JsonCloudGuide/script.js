/**
 * 複製 Firebase 規則到剪貼簿
 */
function copyRules() {
    const codeBlock = document.getElementById('firebase-rules');
    // 獲取純文字內容，去除 HTML 標籤
    const text = codeBlock.innerText || codeBlock.textContent;
    
    // 使用 modern API
    if (navigator.clipboard) {
        navigator.clipboard.writeText(text).then(() => {
            handleCopySuccess();
        }).catch(err => {
            console.error('Copy failed: ', err);
            fallbackCopy(text);
        });
    } else {
        fallbackCopy(text);
    }
}

function handleCopySuccess() {
    const btn = document.querySelector('.copy-btn');
    const originalText = btn.innerHTML;
    btn.innerHTML = '✅ 已複製！';
    btn.classList.add('copied');
    
    setTimeout(() => {
        btn.innerHTML = originalText;
        btn.classList.remove('copied');
    }, 2000);
}

function fallbackCopy(text) {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.select();
    try {
        document.execCommand('copy');
        handleCopySuccess();
    } catch (err) {
        alert('複製失敗，請手動複製。');
    }
    document.body.removeChild(textArea);
}

/**
 * 回頂部按鈕邏輯
 */
window.addEventListener('scroll', () => {
    const btt = document.getElementById('back-to-top');
    if (window.pageYOffset > 200) {
        btt.style.display = 'flex';
    } else {
        btt.style.display = 'none';
    }
});

function scrollToTop() {
    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
}

// 初始化
document.addEventListener('DOMContentLoaded', () => {
    // 檢查是否需要回頂按鈕 (雖然 css 已經隱藏，但動態插入確保結構完整)
    if (!document.getElementById('back-to-top')) {
        const btt = document.createElement('div');
        btt.id = 'back-to-top';
        btt.innerHTML = '↑';
        btt.onclick = scrollToTop;
        document.body.appendChild(btt);
    }
});
