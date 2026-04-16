const axios = require('axios');
const { Blob, Response } = require('undici'); // Node 18+ 環境需確保有這些 Web API
const { CompressionStream, DecompressionStream } = require('node:stream/web');

const JSONBIN_ID = process.env.JSONBIN_BIN_ID;
const JSONBIN_KEY = process.env.JSONBIN_KEY;
const UPSTASH_URL = process.env.UPSTASH_REST_URL;
const UPSTASH_TOKEN = process.env.UPSTASH_REST_TOKEN;

// --- 與前端一致的解壓工具 ---
const decompressJSON = async (base64) => {
    try {
        const bin = Buffer.from(base64, 'base64');
        const stream = new Blob([bin]).stream().pipeThrough(new DecompressionStream('gzip'));
        const text = await new Response(stream).text();
        return JSON.parse(text);
    } catch (e) {
        // 如果不是 Gzip，嘗試直接當 JSON 解析（相容舊資料）
        return JSON.parse(base64);
    }
};

const compressJSON = async (obj) => {
    const str = JSON.stringify(obj);
    const stream = new Blob([str]).stream().pipeThrough(new CompressionStream('gzip'));
    const buf = await new Response(stream).arrayBuffer();
    return Buffer.from(buf).toString('base64');
};

async function updateDataRecord(fullData) {
    // 強力檢查：如果傳進來的資料連 settings 都沒有，絕對不能繼續
    if (!fullData || !fullData.settings || !fullData.settings.urls) {
        throw new Error("❌ 資料格式致命錯誤：找不到 settings.urls，終止程序以保護資料。");
    }

    const urls = fullData.settings.urls;
    if (!fullData.stats) fullData.stats = {};

    const now = new Date();
    const timeStr = now.toLocaleString('zh-TW', { timeZone: 'Asia/Taipei', hour12: false });
    const todayStr = timeStr.split(' ')[0]; // 取得 YYYY/M/D

    for (const url of urls) {
        try {
            const res = await axios.get(`https://events.vercount.one/log?url=${encodeURIComponent(url)}`, { timeout: 5000 });
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
            // 判斷是否為同一天 (比對 YYYY/M/D)
            if (lastIdx >= 0 && historyArr[lastIdx].time.startsWith(todayStr)) {
                historyArr[lastIdx] = newEntry;
            } else {
                historyArr.push(newEntry);
                const maxDays = fullData.settings.logDays || 14;
                if (historyArr.length > maxDays) historyArr.shift();
            }
        } catch (err) {
            console.error(`抓取失敗 ${url}: ${err.message}`);
        }
    }
    return fullData;
}

async function run() {
    console.log("🚀 開始執行自動同步任務 (Gzip 互通模式)...");

    try {
        // 1. 從 Upstash 讀取
        const res = await axios.get(`${UPSTASH_URL}/get/vercount_v1`, {
            headers: { Authorization: `Bearer ${UPSTASH_TOKEN}` }
        });

        if (!res.data || !res.data.result) {
            throw new Error("Upstash 中找不到任何資料。");
        }

        let rawResult = res.data.result;
        
        // 關鍵修正：如果 Upstash 存的是前端傳上去的 JSON 格式 {"d": "base64..."}
        // 我們需要判斷並取出裡面的 d
        let masterData;
        try {
            const parsed = JSON.parse(rawResult);
            if (parsed && parsed.d) {
                console.log("📦 偵測到封裝格式 {d: ...}，進行解壓...");
                masterData = await decompressJSON(parsed.d);
            } else {
                masterData = parsed; // 可能是舊的未封裝 JSON
            }
        } catch (e) {
            // 如果不能解析成 JSON，代表它可能直接就是 Base64 字串
            masterData = await decompressJSON(rawResult);
        }

        console.log("✅ 數據載入成功，項目數量:", masterData.settings.urls.length);

        // 2. 更新
        const updatedData = await updateDataRecord(masterData);

        // 3. 壓縮 (採用與前端一致的封裝格式)
        const compressedBase64 = await compressJSON(updatedData);
        const uploadPayload = JSON.stringify({ d: compressedBase64 });

        // 4. 同步回雲端
        console.log("📤 正在同步至雲端...");
        await Promise.all([
            axios.post(`${UPSTASH_URL}/set/vercount_v1`, uploadPayload, {
                headers: { Authorization: `Bearer ${UPSTASH_TOKEN}` }
            }),
            axios.put(`https://api.jsonbin.io/v3/b/${JSONBIN_ID}`, uploadPayload, {
                headers: { 
                    'Content-Type': 'application/json', 
                    'X-Access-Key': JSONBIN_KEY 
                }
            })
        ]);

        console.log("🎉 所有平台同步成功！");

    } catch (err) {
        console.error("❌ 執行失敗:", err.message);
        process.exit(1); // 確保 CI/CD 環境知道失敗了
    }
}

run();
