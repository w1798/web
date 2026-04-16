const axios = require('axios');
const zlib = require('zlib');
const util = require('util');

const JSONBIN_ID = process.env.JSONBIN_BIN_ID;
const JSONBIN_KEY = process.env.JSONBIN_KEY;
const UPSTASH_URL = process.env.UPSTASH_REST_URL;
const UPSTASH_TOKEN = process.env.UPSTASH_REST_TOKEN;

const gunzip = util.promisify(zlib.gunzip);
const gzip = util.promisify(zlib.gzip);

async function decompressJSON(base64Str) {
    const buffer = Buffer.from(base64Str, 'base64');
    const decompressed = await gunzip(buffer);
    return JSON.parse(decompressed.toString('utf-8'));
}

async function compressJSON(obj) {
    const jsonStr = JSON.stringify(obj);
    const compressed = await gzip(jsonStr);
    return compressed.toString('base64');
}

// 核心處理函式：給入資料、回傳更新後的資料
async function updateDataRecord(fullData) {
    if (!fullData || !fullData.settings || !fullData.settings.urls) {
        console.log("資料格式不正確，跳過更新");
        return fullData;
    }

    const urls = fullData.settings.urls;
    if (!fullData.stats) fullData.stats = {};

// --- 建議修正為 (強制指定台灣時區) ---
const now = new Date();
const options = { timeZone: 'Asia/Taipei', hour12: false, year: 'numeric', month: 'numeric', day: 'numeric' };
const formatter = new Intl.DateTimeFormat('zh-TW', options);
const parts = formatter.formatToParts(now);

// 取得 YYYY/M/D 格式用於比對
const y = parts.find(p => p.type === 'year').value;
const m = parts.find(p => p.type === 'month').value;
const d = parts.find(p => p.type === 'day').value;
const todayStr = `${y}/${m}/${d}`;

// 取得完整的顯示時間 (例如：2026/2/5 18:00:00)
const timeStr = now.toLocaleString('zh-TW', { timeZone: 'Asia/Taipei', hour12: false });

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
    console.log("🚀 開始執行自動同步任務 (以 Upstash 為主)...");

    try {
        // 1. 從 Upstash 讀取權威名單與舊數據
        const res = await axios.get(`${UPSTASH_URL}/get/vercount_v1`, {
            headers: { Authorization: `Bearer ${UPSTASH_TOKEN}` }
        });

        if (!res.data.result) {
            throw new Error("Upstash 中找不到 vercount_v1 紀錄，無法開始任務。");
        }

        let masterData;
        try {
            masterData = await decompressJSON(res.data.result);
            console.log("✅ 成功從 Upstash 取得並解壓縮權威名單。");
        } catch (e) {
            console.log("⚠️ 解壓縮失敗，嘗試以純 JSON 解析 (可能是舊格式)。");
            masterData = JSON.parse(res.data.result);
        }

        // 2. 拿這份名單去抓所有 Vercount 數據並進行更新
        const updatedData = await updateDataRecord(masterData);
        console.log("✅ 數據更新處理完成。");

        // 3. 同時更新回 Upstash 與 JSONBin
        console.log("⏳ 正在壓縮資料並上傳...");
        const compressedData = await compressJSON(updatedData);

        const upstashUpdate = axios.post(`${UPSTASH_URL}/set/vercount_v1`, JSON.stringify(compressedData), {
            headers: { 
                Authorization: `Bearer ${UPSTASH_TOKEN}`,
                'Content-Type': 'application/json' 
            }
        });

        const jsonbinUpdate = axios.put(`https://api.jsonbin.io/v3/b/${JSONBIN_ID}`, { d: compressedData }, {
            headers: { 
                'Content-Type': 'application/json', 
                'X-Access-Key': JSONBIN_KEY 
            }
        });

        // 使用 Promise.all 同時發送，速度更快
        await Promise.all([upstashUpdate, jsonbinUpdate]);

        console.log("🎉 所有平台同步成功！(Upstash & JSONBin)");

    } catch (err) {
        console.error("❌ 執行過程中發生錯誤:", err.message);
    }
}

run();
