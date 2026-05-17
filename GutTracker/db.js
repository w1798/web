var { useState, useEffect, useMemo, useCallback, useRef } = React;

// --- 原生 IndexedDB 封裝 ---
const DB_NAME = 'GutTrackerDB';
const DB_VERSION = 1;

const openDB = () => new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains('diet')) {
            db.createObjectStore('diet', { keyPath: 'date' });
        }
        if (!db.objectStoreNames.contains('bowel')) {
            db.createObjectStore('bowel', { keyPath: 'id', autoIncrement: true });
        }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
});

const dbPut = (db, store, data) => new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readwrite');
    const req = tx.objectStore(store).put(data);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
});

const dbGetAll = (db, store) => new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readonly');
    const req = tx.objectStore(store).getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
});

const dbDelete = (db, store, key) => new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readwrite');
    const req = tx.objectStore(store).delete(key);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
});

const deleteDB = () => new Promise((resolve, reject) => {
    const req = indexedDB.deleteDatabase(DB_NAME);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
});

// =============================================
// 可自訂設定預設值 (localStorage)
// =============================================
const DEFAULTS = {
    mealNames:   ['早餐7', '午餐12', '晚餐19', '其他22'],
    foodTypes:   ['飯', '水煮蛋','麥片','漢堡','三明治','麵', '肉', '菜', '湯', '咖啡','茶','水','水果'],
    amounts:     ['多', '適中', '少'],
    cookMethods: ['炸', '滷', '烤', '蒸', '煮', '生食'],
    bowelStatuses: ['正常', '多', '少', '硬', '軟', '稀', '便祕', '拉肚子'],
    fontSizeZoom: 100,
    binUrl: '',
    apiKey: ''
};

const LS_KEY = 'gut_config';
const loadConfig = () => {
    try {
        const raw = localStorage.getItem(LS_KEY);
        if (raw) return { ...DEFAULTS, ...JSON.parse(raw) };
    } catch(e) {}
    return { ...DEFAULTS };
};
const saveConfig = (cfg) => localStorage.setItem(LS_KEY, JSON.stringify(cfg));
const resetConfig = () => localStorage.removeItem(LS_KEY);

const parseMealStr = (str) => {
    const match = str.trim().match(/^(.*?)(\d+)$/);
    if (match) {
        return { name: match[1].trim(), hour: parseInt(match[2]) };
    }
    return { name: str.trim(), hour: null };
};

// --- 統一壓縮工具 (自動切換原生或 Pako) ---
const gzip = async (text) => {
    if (typeof CompressionStream !== 'undefined') {
        const stream = new Blob([text]).stream().pipeThrough(new CompressionStream('gzip'));
        return new Uint8Array(await new Response(stream).arrayBuffer());
    }
    if (window.pako) return window.pako.gzip(text);
    throw new Error("找不到壓縮引擎");
};

const ungzip = async (uint8, isString = true) => {
    if (typeof DecompressionStream !== 'undefined') {
        const stream = new Blob([uint8]).stream().pipeThrough(new DecompressionStream('gzip'));
        const buffer = await new Response(stream).arrayBuffer();
        return isString ? new TextDecoder().decode(buffer) : new Uint8Array(buffer);
    }
    if (window.pako) return window.pako.ungzip(uint8, { to: isString ? 'string' : 'Uint8Array' });
    throw new Error("找不到解壓縮引擎");
};
