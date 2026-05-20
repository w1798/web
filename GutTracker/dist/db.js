var { useState, useEffect, useMemo, useCallback, useRef } = React;
const DB_NAME = "GutTrackerDB";
const DB_VERSION = 1;
const openDB = () => new Promise((resolve, reject) => {
  const request = indexedDB.open(DB_NAME, DB_VERSION);
  request.onupgradeneeded = (e) => {
    const db = e.target.result;
    if (!db.objectStoreNames.contains("diet")) {
      db.createObjectStore("diet", { keyPath: "date" });
    }
    if (!db.objectStoreNames.contains("bowel")) {
      db.createObjectStore("bowel", { keyPath: "id", autoIncrement: true });
    }
  };
  request.onsuccess = () => resolve(request.result);
  request.onerror = () => reject(request.error);
});
const dbPut = (db, store, data) => new Promise((resolve, reject) => {
  const tx = db.transaction(store, "readwrite");
  const req = tx.objectStore(store).put(data);
  req.onsuccess = () => resolve(req.result);
  req.onerror = () => reject(req.error);
});
const dbGetAll = (db, store) => new Promise((resolve, reject) => {
  const tx = db.transaction(store, "readonly");
  const req = tx.objectStore(store).getAll();
  req.onsuccess = () => resolve(req.result);
  req.onerror = () => reject(req.error);
});
const dbDelete = (db, store, key) => new Promise((resolve, reject) => {
  const tx = db.transaction(store, "readwrite");
  const req = tx.objectStore(store).delete(key);
  req.onsuccess = () => resolve();
  req.onerror = () => reject(req.error);
});
const deleteDB = () => new Promise((resolve, reject) => {
  const req = indexedDB.deleteDatabase(DB_NAME);
  req.onsuccess = () => resolve();
  req.onerror = () => reject(req.error);
});
const DEFAULTS = {
  mealNames: ["\u65E9\u99107", "\u5348\u991012", "\u665A\u991019", "\u5176\u4ED622"],
  foodTypes: ["\u98EF", "\u6C34\u716E\u86CB", "\u9EA5\u7247", "\u6F22\u5821", "\u4E09\u660E\u6CBB", "\u9EB5", "\u8089", "\u83DC", "\u6E6F", "\u5496\u5561", "\u8336", "\u6C34", "\u6C34\u679C"],
  amounts: ["\u591A", "\u9069\u4E2D", "\u5C11"],
  cookMethods: ["\u70B8", "\u6EF7", "\u70E4", "\u84B8", "\u716E", "\u751F\u98DF"],
  bowelAmounts: ["\u591A", "\u9069\u4E2D", "\u5C11"],
  bowelStatuses: ["\u6B63\u5E38", "\u786C", "\u8EDF", "\u7A00", "\u4FBF\u7955", "\u62C9\u809A\u5B50"],
  fontSizeZoom: 100,
  binUrl: "",
  apiKey: ""
};
const LS_KEY = "gut_config";
const loadConfig = () => {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch (e) {
  }
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
const gzip = async (text) => {
  if (typeof CompressionStream !== "undefined") {
    const stream = new Blob([text]).stream().pipeThrough(new CompressionStream("gzip"));
    return new Uint8Array(await new Response(stream).arrayBuffer());
  }
  if (window.pako) return window.pako.gzip(text);
  throw new Error("\u627E\u4E0D\u5230\u58D3\u7E2E\u5F15\u64CE");
};
const ungzip = async (uint8, isString = true) => {
  if (typeof DecompressionStream !== "undefined") {
    const stream = new Blob([uint8]).stream().pipeThrough(new DecompressionStream("gzip"));
    const buffer = await new Response(stream).arrayBuffer();
    return isString ? new TextDecoder().decode(buffer) : new Uint8Array(buffer);
  }
  if (window.pako) return window.pako.ungzip(uint8, { to: isString ? "string" : "Uint8Array" });
  throw new Error("\u627E\u4E0D\u5230\u89E3\u58D3\u7E2E\u5F15\u64CE");
};
