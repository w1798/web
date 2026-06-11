/**
 * Charles Nextime - 全局計數器組件
 * 支援功能：自動 Footer 生成、30分鐘冷卻、Vercount 統計、全局 Log 系統
 */

// === [0] 全局 Log 系統 (在任何程式碼之前初始化) ===
window._LOGS = [];
const _MAX_LOG = 1000;

const _fmtTS = () => new Date().toLocaleTimeString('zh-TW', { hour12: false });

const _logMsg = (args) => args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ');

if (!window.L) {
    window.L = (...args) => {
        const ts = _fmtTS();
        const msg = _logMsg(args);
        window._LOGS.push({ t: Date.now(), l: 'L', m: msg });
        if (window._LOGS.length > _MAX_LOG) window._LOGS.shift();
        console.log(`[${ts}]`, ...args);
    };
}

if (!window.LE) {
    window.LE = (...args) => {
        const ts = _fmtTS();
        const msg = _logMsg(args);
        window._LOGS.push({ t: Date.now(), l: 'E', m: msg });
        if (window._LOGS.length > _MAX_LOG) window._LOGS.shift();
        console.error(`[${ts}]`, ...args);
    };
}

(function() {
    // === 1. 樣式注入 ===
    const style = document.createElement('style');
    style.textContent = `
        .auto-footer {
            text-align: center !important;
            padding: 10px !important;
            font: 0.8rem Arial, sans-serif !important;
            border-top: 1px solid rgba(128,128,128,0.2) !important;
            margin-top: 40px !important;
            color: #888 !important;
            display: block !important;
            clear: both !important;
        }

        .auto-footer a,
        #busuanzi_value_page_pv {
            color: #00b894 !important;
            text-decoration: none;
        }

        .auto-footer a:hover {
            text-decoration: underline;
            opacity: 0.8;
        }

        #busuanzi_container_page_pv {
            display: none;
            cursor: pointer;
        }

        /* Log Viewer Overlay */
        #clog-viewer {
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

        #clog-viewer > div {
            max-width: 800px;
            width: 100%;
            background: #1e1e1e;
            color: #d4d4d4;
            border-radius: 8px;
            display: flex;
            flex-direction: column;
            max-height: 90vh;
        }

        #clog-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 10px 14px;
            border-bottom: 1px solid #333;
            font-size: 0.9rem;
            flex-shrink: 0;
        }

        #clog-header button {
            background: #333;
            color: #d4d4d4;
            border: none;
            padding: 4px 12px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 0.85rem;
            margin-left: 6px;
        }

        #clog-header button:hover { background: #555; }

        #clog-body {
            padding: 8px 14px;
            overflow-y: auto;
            flex: 1;
            min-height: 200px;
        }

        #clog-body > div {
            padding: 1px 0;
            white-space: pre-wrap;
            word-break: break-all;
        }

        .clog-ts { color: #6a9955; }
        .clog-lv  { font-weight: bold; }
        .clog-err .clog-lv { color: #f44747; }
        .clog-log .clog-lv { color: #569cd6; }
        .clog-err { background: rgba(244,71,71,0.08); }
    `;

    document.head.appendChild(style);

    const _escape = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

    // === Log Viewer 控制 ===
    let _logVisible = false;
    let _logEl = null;

    const _renderLogs = () => {
        const body = document.getElementById('clog-body');
        if (!body) return;
        body.innerHTML = window._LOGS.map(e => {
            const ts = new Date(e.t).toLocaleTimeString('zh-TW', { hour12: false });
            const cls = e.l === 'E' ? 'clog-err' : 'clog-log';
            return `<div class="${cls}"><span class="clog-ts">[${ts}]</span> <span class="clog-lv">[${e.l}]</span> ${_escape(e.m)}</div>`;
        }).join('');
        body.scrollTop = body.scrollHeight;
        const hdr = document.querySelector('#clog-header span');
        if (hdr) hdr.textContent = `📋 Logs (${window._LOGS.length})`;
    };

    const _createLogViewer = () => {
        _logEl = document.createElement('div');
        _logEl.id = 'clog-viewer';
        _logEl.innerHTML = `
            <div>
                <div id="clog-header">
                    <span>📋 Logs (${window._LOGS.length})</span>
                    <div>
                        <button id="clog-clear">Clear</button>
                        <button id="clog-close">✕</button>
                    </div>
                </div>
                <div id="clog-body"></div>
            </div>
        `;
        document.body.appendChild(_logEl);

        _logEl.addEventListener('click', e => { if (e.target === _logEl) _toggleLog(); });
        document.getElementById('clog-close').addEventListener('click', _toggleLog);
        document.getElementById('clog-clear').addEventListener('click', () => {
            window._LOGS = [];
            _renderLogs();
        });
    };

    const _toggleLog = () => {
        if (!_logEl) _createLogViewer();
        _logVisible = !_logVisible;
        _logEl.style.display = _logVisible ? 'flex' : 'none';
        if (_logVisible) _renderLogs();
    };

    const init = () => {
        // --- 2. 處理 Footer 結構 ---
        let footer = document.querySelector('footer');

        if (!footer) {
            footer = document.createElement('footer');
            document.body.appendChild(footer);
        }

        footer.classList.add('auto-footer');

        const startYear = 2026;
        const currentYear = new Date().getFullYear();
        const yearStr = currentYear > startYear ? `${startYear}-${currentYear}` : startYear;

        footer.innerHTML = `
            <a href="https://w1798.github.io/web/" target="_blank">&copy;${yearStr} Charles Nextime</a>,
            <a href="https://www.gnu.org/licenses/gpl-3.0.html" target="_blank">GPLv3</a>
            <span id="busuanzi_container_page_pv">
                👁️<span id="busuanzi_value_page_pv">--</span>
            </span>
        `;

        // --- 3. 計數器核心邏輯 ---
        const pvSpan = document.getElementById('busuanzi_value_page_pv');
        const pvContainer = document.getElementById('busuanzi_container_page_pv');
        if (!pvSpan) return;

        const path = window.location.pathname.replace(/^\/|\/$/g, "").replace(/\//g, "-") || "home";
        const TIME_KEY = `COUNT_TIME_${path}`;
        const VAL_KEY = `COUNT_VAL_${path}`;

        const lastVisit = localStorage.getItem(TIME_KEY);
        const lastVal = localStorage.getItem(VAL_KEY);

        if (lastVisit && (Date.now() - lastVisit < 1800000)) {
            pvSpan.innerText = lastVal || "--";
            pvContainer.style.display = "inline";
            L(`[Counter] ${path} 冷卻中，顯示快取數據。`);
        } else {
            const script = document.createElement('script');
            script.src = "https://events.vercount.one/js";
            script.async = true;

            const observer = new MutationObserver(() => {
                const newVal = pvSpan.innerText;
                if (newVal && newVal !== "--" && newVal !== "") {
                    localStorage.setItem(VAL_KEY, newVal);
                    localStorage.setItem(TIME_KEY, Date.now());
                    pvContainer.style.display = "inline";
                    observer.disconnect();
                }
            });

            observer.observe(pvSpan, { childList: true, characterData: true, subtree: true });
            document.head.appendChild(script);
        }

        // --- 4. Log Viewer 掛勾 (點 👁️ 開啟) ---
        if (pvContainer) {
            pvContainer.addEventListener('click', _toggleLog);
        }
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
