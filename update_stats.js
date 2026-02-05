const axios = require('axios');

console.log("--- 環境變數診斷 ---");
console.log("JSONBIN_ID 存在嗎:", !!process.env.JSONBIN_BIN_ID);
console.log("JSONBIN_KEY 存在嗎:", !!process.env.JSONBIN_KEY);
console.log("UPSTASH_URL 內容:", process.env.UPSTASH_REST_URL || "找不到變數");
console.log("UPSTASH_TOKEN 存在嗎:", !!process.env.UPSTASH_REST_TOKEN);
console.log("-------------------");

const JSONBIN_ID = process.env.JSONBIN_BIN_ID;
const JSONBIN_KEY = process.env.JSONBIN_KEY;
const UPSTASH_URL = process.env.UPSTASH_REST_URL;
const UPSTASH_TOKEN = process.env.UPSTASH_REST_TOKEN;

// 核心處理函式：給入資料、回傳更新後的資料
async function updateDataRecord(fullData) {
    if (!fullData || !fullData.settings || !fullData.settings.urls) {
        console.log("資料格式不正確，跳過更新");
        return fullData;
    }

    const urls = fullData.settings.urls;
    if (!fullData.stats) fullData.stats = {};

    const now = new Date();
    const todayStr = `${now.getFullYear()}/${now.getMonth() + 1}/${now.getDate()}`;
    const timeStr = now.toLocaleString('zh-TW', { hour12: true });

    for (const url of urls) {
        try {
            const res = await axios.get(`https://events.vercount.one/log?url=${url}`);
            const data = res.data;
            
            if (!fullData.stats[url]) fullData.stats[url] = [];
            const historyArr = fullData.stats[url];

            const newEntry = {
                time: timeStr,
                pv: data.page_pv || 0,
                site_pv: data.site_pv || 0,
                uv: data.site_uv || 0
            };

            const lastIdx = historyArr.length - 1;
            // 判斷是否為同一天
            if (lastIdx >= 0 && historyArr[lastIdx].time.startsWith(todayStr)) {
                historyArr[lastIdx] = newEntry;
            } else {
                historyArr.push(newEntry);
                if (historyArr.length > 30) historyArr.shift();
            }
        } catch (err) {
            console.error(`抓取失敗 ${url}: ${err.message}`);
        }
    }
    return fullData;
}

async function run() {
    // --- 任務 A: JSONBin.io ---
    console.log("開始執行 JSONBin 任務...");
    try {
        const res = await axios.get(`https://api.jsonbin.io/v3/b/${JSONBIN_ID}/latest`, {
            headers: { 'X-Master-Key': JSONBIN_KEY }
        });
        const updatedJSONBin = await updateDataRecord(res.data.record);
        await axios.put(`https://api.jsonbin.io/v3/b/${JSONBIN_ID}`, updatedJSONBin, {
            headers: { 'Content-Type': 'application/json', 'X-Access-Key': JSONBIN_KEY }
        });
        console.log("✅ JSONBin 同步完成");
    } catch (err) {
        console.error("❌ JSONBin 流程錯誤:", err.message);
    }

    // --- 任務 B: Upstash (Redis) ---
    console.log("開始執行 Upstash 任務...");
    try {
        const res = await axios.get(`${UPSTASH_URL}/get/CHARLES_STATS`, {
            headers: { Authorization: `Bearer ${UPSTASH_TOKEN}` }
        });
        // Upstash 的結果是在 .result 欄位，且通常是字串，需要解析
        if (res.data.result) {
            const currentUpstashData = JSON.parse(res.data.result);
            const updatedUpstash = await updateDataRecord(currentUpstashData);
            await axios.post(`${UPSTASH_URL}/set/CHARLES_STATS`, JSON.stringify(updatedUpstash), {
                headers: { Authorization: `Bearer ${UPSTASH_TOKEN}` }
            });
            console.log("✅ Upstash 同步完成");
        } else {
            console.log("Upstash 中找不到 CHARLES_STATS 紀錄");
        }
    } catch (err) {
        console.error("❌ Upstash 流程錯誤:", err.message);
    }
}

run();
