const axios = require('axios');

// 從 GitHub Secrets 讀取環境變數
const JSONBIN_ID = process.env.JSONBIN_BIN_ID;
const JSONBIN_KEY = process.env.JSONBIN_KEY;
const UPSTASH_URL = process.env.UPSTASH_REST_URL;
const UPSTASH_TOKEN = process.env.UPSTASH_REST_TOKEN;

const TARGET_URLS = [
    "https://nextime5.blogspot.com/", "https://w1798.github.io/web/homework",
    "https://w1798.github.io/web/evalprompt", "https://w1798.github.io/web/TextLab",
    "https://w1798.github.io/web/examboard", "https://w1798.github.io/web/markit",
    "https://w1798.github.io/web/jsonEditor", "https://w1798.github.io/web/comment",
    "https://w1798.github.io/web/"
];

async function run() {
    let history = {};

    // --- 1. 抓取初始數據 (優先從 JSONBin 讀取舊紀錄) ---
    try {
        const res = await axios.get(`https://api.jsonbin.io/v3/b/${JSONBIN_ID}/latest`, {
            headers: { 'X-Access-Key': JSONBIN_KEY }
        });
        history = res.data.record || {};
        console.log("成功從 JSONBin 讀取歷史數據");
    } catch (err) {
        console.log("無法讀取歷史數據，將建立新紀錄");
    }

    // --- 2. 抓取最新 PV 資料 ---
    const now = new Date();
    const todayStr = `${now.getFullYear()}/${now.getMonth() + 1}/${now.getDate()}`;
    const timeStr = now.toLocaleString('zh-TW', { hour12: true });

    for (const url of TARGET_URLS) {
        try {
            const res = await axios.get(`https://events.vercount.one/log?url=${url}`);
            const data = res.data;
            if (!history[url]) history[url] = [];

            const newEntry = {
                time: timeStr,
                pv: data.page_pv || 0,
                site_pv: data.site_pv || 0,
                uv: data.site_uv || 0
            };

            const lastIdx = history[url].length - 1;
            if (lastIdx >= 0 && history[url][lastIdx].time.split(' ')[0] === todayStr) {
                history[url][lastIdx] = newEntry; // 同天更新
            } else {
                history[url].push(newEntry);
                if (history[url].length > 30) history[url].shift(); // 僅保留 30 天
            }
        } catch (err) {
            console.error(`抓取失敗 ${url}: ${err.message}`);
        }
    }

    // --- 3. 同步至 JSONBin.io ---
    try {
        await axios.put(`https://api.jsonbin.io/v3/b/${JSONBIN_ID}`, history, {
            headers: { 'Content-Type': 'application/json', 'X-Master-Key': JSONBIN_KEY }
        });
        console.log("✅ JSONBin.io 同步成功");
    } catch (err) {
        console.error("❌ JSONBin 同步失敗:", err.message);
    }

    // --- 4. 同步至 Upstash (Redis) ---
    try {
        // 使用 Redis 的 SET 指令存入 CHARLES_STATS
        await axios.post(`${UPSTASH_URL}/set/CHARLES_STATS`, JSON.stringify(history), {
            headers: { Authorization: `Bearer ${UPSTASH_TOKEN}` }
        });
        console.log("✅ Upstash 同步成功");
    } catch (err) {
        console.error("❌ Upstash 同步失敗:", err.message);
    }
}

run();
