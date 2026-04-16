const axios = require('axios');

const JSONBIN_ID = process.env.JSONBIN_BIN_ID;
const JSONBIN_KEY = process.env.JSONBIN_KEY;
const UPSTASH_URL = process.env.UPSTASH_REST_URL;
const UPSTASH_TOKEN = process.env.UPSTASH_REST_TOKEN;

// --- Gzip 壓縮/解壓工具 (使用 Web Streams API) ---
const compressJSON = async (obj) => {
    const str = JSON.stringify(obj);
    const stream = new Blob([str]).stream().pipeThrough(new CompressionStream('gzip'));
    const buf = await new Response(stream).arrayBuffer();
    // 轉成 Base64 字串以便儲存在資料庫
    return btoa(String.fromCharCode(...new Uint8Array(buf)));
};

const decompressJSON = async (base64) => {
    if (!base64) return null;
    const bin = atob(base64);
    const buf = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
    const stream = new Blob([buf]).stream().pipeThrough(new DecompressionStream('gzip'));
    const text = await new Response(stream).text();
    return JSON.parse(text);
};

// 核心處理函式 (保持邏輯不變)
async function updateDataRecord(fullData) {
    if (!fullData || !fullData.settings || !fullData.settings.urls) {
        console.log("資料格式不正確，跳過更新");
        return fullData;
    }

    const urls = fullData.settings.urls;
    if (!fullData.stats) fullData.stats = {};

    const now = new Date();
    const options = { timeZone: 'Asia/Taipei', hour12: false, year: 'numeric', month: 'numeric', day: 'numeric' };
    const formatter = new Intl.DateTimeFormat('zh-TW', options);
    const parts = formatter.formatToParts(now);

    const y = parts.find(p => p.type === 'year').value;
    const m = parts.find(p => p.type === 'month').value;
    const d = parts.find(p => p.type === 'day').value;
    const todayStr = `${y}/${m}/${d}`;
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
    console.log("🚀 開始執行自動同步任務 (Gzip 模式)...");

    try {
        // 1. 從 Upstash 讀取權威名單 (處理壓縮過的資料)
        const res = await axios.get(`${UPSTASH_URL}/get/vercount_v1`, {
            headers: { Authorization: `Bearer ${UPSTASH_TOKEN}` }
        });

        if (!res.data.result) {
            throw new Error("Upstash 中找不到 vercount_v1 紀錄。");
        }

        // 解壓縮讀取到的資料
        let masterData;
        try {
            // 嘗試解壓縮，如果失敗則視為原始 JSON (相容舊資料)
            masterData = await decompressJSON(res.data.result);
            console.log("✅ 已成功解壓 Upstash 數據。");
        } catch (e) {
            masterData = JSON.parse(res.data.result);
            console.log("⚠️ 偵測到舊版未壓縮數據，直接解析。");
        }

        // 2. 更新數據
        const updatedData = await updateDataRecord(masterData);

        // 3. 壓縮數據
        const compressedBase64 = await compressJSON(updatedData);
        console.log(`🗜️ 數據已壓縮 (Base64 長度: ${compressedBase64.length})`);

        // 4. 同時更新回 Upstash 與 JSONBin
        // Upstash 直接存入 Base64 字串
        const upstashUpdate = axios.post(`${UPSTASH_URL}/set/vercount_v1`, compressedBase64, {
            headers: { Authorization: `Bearer ${UPSTASH_TOKEN}` }
        });

        // JSONBin 存入一個帶有 metadata 的物件，方便辨識
        const jsonbinUpdate = axios.put(`https://api.jsonbin.io/v3/b/${JSONBIN_ID}`, 
            { 
                updatedAt: new Date().toISOString(),
                payload: compressedBase64,
                isCompressed: true 
            }, 
            {
                headers: { 
                    'Content-Type': 'application/json', 
                    'X-Access-Key': JSONBIN_KEY 
                }
            }
        );

        await Promise.all([upstashUpdate, jsonbinUpdate]);
        console.log("🎉 所有平台同步成功！");

    } catch (err) {
        console.error("❌ 執行過程中發生錯誤:", err.message);
    }
}

run();
