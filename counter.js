/**
 * Charles Nextime - 全局計數器組件
 * 支援功能：自動 Footer 生成、30分鐘冷卻、Vercount 統計、Log Viewer
 */

(function() {
    // === 1. 樣式注入 ===
    const style = document.createElement('style');
    style.textContent = `
        .cn-auto-footer {
            text-align: center !important;
            padding: 10px !important;
            font: 0.8rem Arial, sans-serif !important;
            border-top: 1px solid rgba(128,128,128,0.2) !important;
            margin-top: 40px !important;
            color: #888 !important;
            display: block !important;
            clear: both !important;
        }

        .cn-auto-footer a,
        #busuanzi_value_page_pv {
            color: #00b894 !important;
            text-decoration: none;
        }

        .cn-auto-footer a:hover {
            text-decoration: underline;
            opacity: 0.8;
        }

        #busuanzi_container_page_pv {
            display: none;
        }

        .cn-clog-eye {
            cursor: pointer;
        }

        /* Log Viewer Overlay */
        #cn-clog-viewer {
            display: none;
            position: fixed;
            top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(0,0,0,0.6);
            z-index: 99999;
            flex-direction: column;
            align-items: center;
            padding: 20px;
            font: 0.85rem/1.4 'Courier New', monospace;
        }

        #cn-clog-viewer > div {
            max-width: 800px;
            width: 100%;
            background: #1e1e1e;
            color: #d4d4d4;
            border-radius: 8px;
            display: flex;
            flex-direction: column;
            max-height: 90vh;
        }

        #cn-clog-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 10px 14px;
            border-bottom: 1px solid #333;
            font-size: 0.9rem;
            flex-shrink: 0;
        }

        #cn-clog-header button {
            background: #333;
            color: #d4d4d4;
            border: none;
            padding: 4px 12px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 0.85rem;
            margin-left: 6px;
        }

        #cn-clog-header button:hover { background: #555; }

        #cn-clog-body {
            padding: 8px 14px;
            overflow-y: auto;
            flex: 1;
            min-height: 200px;
        }

        #cn-clog-body > div {
            padding: 1px 0;
            white-space: pre-wrap;
            word-break: break-all;
        }

        .cn-clog-ts { color: #6a9955; }
        .cn-clog-lv  { font-weight: bold; }
        .cn-clog-err .cn-clog-lv { color: #f44747; }
        .cn-clog-log .cn-clog-lv { color: #569cd6; }
        .cn-clog-err { background: rgba(244,71,71,0.08); }
    `;

    document.head.appendChild(style);

    const _escape = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

    // === Log Viewer 控制 ===
    let _logVisible = false;
    let _logEl = null;

    const _renderLogs = () => {
        const body = document.getElementById('cn-clog-body');
        if (!body) return;
        body.innerHTML = window._LOGS.map(e => {
            const ts = new Date(e.t).toLocaleTimeString('zh-TW', { hour12: false });
            const cls = e.l === 'E' ? 'cn-clog-err' : 'cn-clog-log';
            return `<div class="${cls}"><span class="cn-clog-ts">[${ts}]</span> <span class="cn-clog-lv">[${e.l}]</span> ${_escape(e.m)}</div>`;
        }).join('');
        body.scrollTop = body.scrollHeight;
        const hdr = document.querySelector('#cn-clog-header span');
        if (hdr) hdr.textContent = `📋 Logs (${window._LOGS.length})`;
    };

    const _createLogViewer = () => {
        _logEl = document.createElement('div');
        _logEl.id = 'cn-clog-viewer';
        _logEl.innerHTML = `
            <div>
                <div id="cn-clog-header">
                    <span>📋 Logs (${window._LOGS.length})</span>
                    <div>
                        <button id="cn-clog-copy">Copy All</button>
                        <button id="cn-clog-clear">Clear</button>
                        <button id="cn-clog-close">✕</button>
                    </div>
                </div>
                <div id="cn-clog-body"></div>
            </div>
        `;
        document.body.appendChild(_logEl);

        _logEl.addEventListener('click', e => { if (e.target === _logEl) _toggleLog(); });
        document.getElementById('cn-clog-close').addEventListener('click', _toggleLog);
        document.getElementById('cn-clog-clear').addEventListener('click', () => {
            window._LOGS = [];
            _renderLogs();
        });
        document.getElementById('cn-clog-copy').addEventListener('click', () => {
            const text = window._LOGS.map(e => {
                const ts = new Date(e.t).toLocaleTimeString('zh-TW', { hour12: false });
                return `[${ts}] [${e.l}] ${e.m}`;
            }).join('\n');
            navigator.clipboard.writeText(text).catch(() => {});
        });
    };

    const _toggleLog = () => {
        if (!_logEl) _createLogViewer();
        _logVisible = !_logVisible;
        _logEl.style.display = _logVisible ? 'flex' : 'none';
        if (_logVisible) _renderLogs();
    };

    // === 輔助函式：安全存取 localStorage (file:// 可能拋出 SecurityError) ===
    const _safeStorage = {
        getItem: (key) => {
            try { return localStorage.getItem(key); } catch { return null; }
        },
        setItem: (key, val) => {
            try { localStorage.setItem(key, val); return true; } catch { return false; }
        }
    };

    // === 輔助函式：本地計數器 (file:// fallback) ===
    const _localCounter = (path, pvSpan, pvContainer) => {
        const TIME_KEY = `COUNT_TIME_${path}`;
        const VAL_KEY = `COUNT_VAL_${path}`;

        const lastVisit = _safeStorage.getItem(TIME_KEY);
        const lastVal = _safeStorage.getItem(VAL_KEY);
        const now = Date.now();

        if (lastVisit && (now - parseInt(lastVisit, 10) < 1800000)) {
            pvSpan.innerText = lastVal || "--";
            pvContainer.style.display = "inline";
            L(`[Counter] ${path} 本地冷卻中，顯示快取數據。`);
            return;
        }

        // 簡單遞增本地計數
        const newVal = (parseInt(lastVal, 10) || 0) + 1;
        const storageSuccess = _safeStorage.setItem(VAL_KEY, String(newVal)) && 
                              _safeStorage.setItem(TIME_KEY, String(now));
        
        pvSpan.innerText = String(newVal);
        pvContainer.style.display = "inline";
        if (storageSuccess) {
            L(`[Counter] ${path} 本地計數器啟用，計數：${newVal}`);
        } else {
            L(`[Counter] ${path} 本地計數器啟用（localStorage 失敗），計數：${newVal}`);
        }
    };

    const init = () => {
        // --- 2. 處理 Footer 結構 ---
        let footer = document.querySelector('footer');

        if (!footer) {
            footer = document.createElement('footer');
            document.body.appendChild(footer);
        }

        footer.classList.add('cn-auto-footer');

        const startYear = 2026;
        const currentYear = new Date().getFullYear();
        const yearStr = currentYear > startYear ? `${startYear}-${currentYear}` : startYear;

        footer.innerHTML = `
            <a href="https://w1798.github.io/web/" target="_blank">&copy;${yearStr} Charles Nextime</a>,
            <a href="https://www.gnu.org/licenses/gpl-3.0.html" target="_blank">GPLv3</a>
            <span class="cn-clog-eye">👁️</span>
            <span id="busuanzi_container_page_pv">
                <span id="busuanzi_value_page_pv">--</span>
            </span>
        `;

        // --- 3. 計數器核心邏輯 ---
        const pvSpan = document.getElementById('busuanzi_value_page_pv');
        const pvContainer = document.getElementById('busuanzi_container_page_pv');
        if (!pvSpan) return;

        const path = window.location.pathname.replace(/^\/|\/$/g, "").replace(/\//g, "-") || "home";
        const isFileProtocol = window.location.protocol === 'file:';

        // file:// 環境：直接使用本地計數器，跳過外部 CDN
        if (isFileProtocol) {
            _localCounter(path, pvSpan, pvContainer);
        } else {
            // http(s):// 環境：嘗試載入 vercount，失敗時 fallback 到本地快取或隱藏
            const lastVisit = _safeStorage.getItem(`COUNT_TIME_${path}`);
            const lastVal = _safeStorage.getItem(`COUNT_VAL_${path}`);

            if (lastVisit && (Date.now() - parseInt(lastVisit, 10) < 1800000)) {
                pvSpan.innerText = lastVal || "--";
                pvContainer.style.display = "inline";
                L(`[Counter] ${path} 冷卻中，顯示快取數據。`);
            } else {
                const script = document.createElement('script');
                script.src = "https://events.vercount.one/js";
                script.async = true;

                let observerDisconnected = false;
                const observer = new MutationObserver(() => {
                    if (observerDisconnected) return;
                    const newVal = pvSpan.innerText;
                    if (newVal && newVal !== "--" && newVal !== "") {
                        _safeStorage.setItem(`COUNT_VAL_${path}`, newVal);
                        _safeStorage.setItem(`COUNT_TIME_${path}`, String(Date.now()));
                        pvContainer.style.display = "inline";
                        observerDisconnected = true;
                        observer.disconnect();
                    }
                });

                observer.observe(pvSpan, { childList: true, characterData: true, subtree: true });

                // 立即失敗偵測：script 載入錯誤時直接觸發 fallback
                script.onerror = () => {
                    if (!observerDisconnected) {
                        observerDisconnected = true;
                        observer.disconnect();
                        clearTimeout(fallbackTimer);
                        const cachedVal = _safeStorage.getItem(`COUNT_VAL_${path}`);
                        if (cachedVal) {
                            pvSpan.innerText = cachedVal;
                            pvContainer.style.display = "inline";
                            L(`[Counter] ${path} vercount 載入失敗，使用本地快取。`);
                        } else {
                            pvContainer.style.display = "none";
                            L(`[Counter] ${path} vercount 載入失敗且無快取，隱藏計數器。`);
                        }
                    }
                };

                document.head.appendChild(script);

                // 5 秒 fallback：網路極慢或 CDN 回應異常時的保底
                const fallbackTimer = setTimeout(() => {
                    if (!observerDisconnected) {
                        observerDisconnected = true;
                        observer.disconnect();
                        const cachedVal = _safeStorage.getItem(`COUNT_VAL_${path}`);
                        if (cachedVal) {
                            pvSpan.innerText = cachedVal;
                            pvContainer.style.display = "inline";
                            L(`[Counter] ${path} vercount 載入逾時，使用本地快取。`);
                        } else {
                            pvContainer.style.display = "none";
                            L(`[Counter] ${path} vercount 載入逾時且無快取，隱藏計數器。`);
                        }
                    }
                }, 5000);

                const originalDisconnect = observer.disconnect.bind(observer);
                observer.disconnect = () => {
                    clearTimeout(fallbackTimer);
                    originalDisconnect();
                };
            }
        }

        // --- 4. Log Viewer 掛勾 (點 👁️ 開啟) ---
        const eyeEl = document.querySelector('.cn-clog-eye');
        if (eyeEl) {
            eyeEl.addEventListener('click', _toggleLog);
        }
    };

    // 使用更穩健的初始化時機確保在 loader_engine 之後
    // 策略：1. 檢查 loader_engine 是否已完成（透過全域變數）
    //      2. 如果未完成，監聽 load 事件
    //      3. 如果文件已完成，使用 setTimeout 確保當前執行上下文結束
    const initializeCounter = () => {
        // 檢查 loader_engine 是否設定了完成標誌
        if (window.loaderFinished === true) {
            // loader_engine 已完成，直接初始化
            setTimeout(init, 0);
        } else {
            // 監聽 load 事件作為備用機制
            if (document.readyState === 'complete') {
                // 文件已完成，但 loader_engine 可能仍在做非同步工作
                setTimeout(init, 0);
            } else {
                // 等待 load 事件（在 loader_engine 的 DOMContentLoaded 之後觸發）
                window.addEventListener('load', init);
            }
        }
    };

    // 立即註冊初始化
    initializeCounter();
})();