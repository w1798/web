/**
 * ClassKudox - Utilities
 */

const initVercount = () => {
    const path = window.location.pathname.replace(/\/$/, "");
    const TIME_KEY = `VERCOUNT_TIME_${path}`;
    const VAL_KEY = `VERCOUNT_VAL_${path}`;
    const COOL_DOWN = 30 * 60 * 1000;
    const now = Date.now();
    const lastVisit = localStorage.getItem(TIME_KEY);
    const lastVal = localStorage.getItem(VAL_KEY);
    if (lastVisit && (now - lastVisit < COOL_DOWN)) {
        if (window._showVercountUI) window._showVercountUI(lastVal || "--");
    } else {
        if (window._initVercountUI) window._initVercountUI(VAL_KEY, TIME_KEY);
    }
};

initVercount();


const StampTool = (() => {
    const CHARS = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
    const EPOCH = 1735689600000;
    const CHAR_MAP = Object.fromEntries([...CHARS].map((c, i) => [c, i]));
    return {
        encode: (date = Date.now()) => {
            let diff = Math.floor((new Date(date).getTime() - EPOCH) / 100);
            if (diff < 0) diff = 0;
            let res = "";
            while (diff > 0) { res = CHARS[diff % 62] + res; diff = Math.floor(diff / 62); }
            return res.padStart(6, '0');
        },
        decode: (code) => {
            let diff = 0;
            for (let i = 0; i < code.length; i++) {
                const val = CHAR_MAP[code[i]];
                if (val !== undefined) diff = diff * 62 + val;
            }
            return new Date((diff * 100) + EPOCH);
        }
    };
})();

const getTS = (ts) => (typeof ts === 'number') ? ts : StampTool.decode(ts).getTime();

const sortItems = (a, b) => {
    const cat = s => { const c = s.charCodeAt(0); if (c >= 48 && c <= 57) return 0; if ((c >= 65 && c <= 90) || (c >= 97 && c <= 122)) return 1; return 2; };
    const ta = cat(a.lb || a.id || a), tb = cat(b.lb || b.id || b);
    if (ta !== tb) return ta - tb;
    return (a.lb || a.id || a).localeCompare(b.lb || b.id || b, 'zh-TW');
};
const compressJSON = async (obj, formatted = false) => {
    try {
        const str = formatted ? JSON.stringify(obj, null, 2) : JSON.stringify(obj);
        if (typeof pako !== 'undefined') {
            const compressed = pako.gzip(str);
            let binaryStr = '';
            const chunkSize = 32768; // 32KB chunks
            for (let i = 0; i < compressed.length; i += chunkSize) {
                binaryStr += String.fromCharCode.apply(null, compressed.subarray(i, i + chunkSize));
            }
            return btoa(binaryStr);
        }
        // Fallback
        const stream = new Blob([str]).stream().pipeThrough(new CompressionStream('gzip'));
        const resp = new Response(stream);
        const buf = await resp.arrayBuffer();
        return btoa(String.fromCharCode(...new Uint8Array(buf)));
    } catch(e) { console.error('壓縮失敗', e); return null; }
};

const decompressJSON = async (base64) => {
    try {
        const bin = atob(base64);
        const buf = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
        
        if (typeof pako !== 'undefined') {
            const jsonString = pako.ungzip(buf, { to: 'string' });
            return JSON.parse(jsonString);
        }
        // Fallback
        const stream = new Blob([buf]).stream().pipeThrough(new DecompressionStream('gzip'));
        const resp = new Response(stream);
        return await resp.json();
    } catch(e) { console.error('解壓失敗', e); return null; }
};

const decompressBinary = async (arrayBuffer) => {
    try {
        if (typeof pako !== 'undefined') {
            const buf = new Uint8Array(arrayBuffer);
            const jsonString = pako.ungzip(buf, { to: 'string' });
            return JSON.parse(jsonString);
        }
        // Fallback
        const stream = new Blob([arrayBuffer]).stream().pipeThrough(new DecompressionStream('gzip'));
        const resp = new Response(stream);
        return await resp.json();
    } catch(e) { console.error('解壓縮二進位失敗', e); return null; }
};

const AS_MAP = { 
    ava: 'avataaars', adv: 'adventurer', op: 'open-peeps', per: 'personas', min: 'miniavs', mic: 'micah',
    fe: 'fun-emoji', bs: 'big-smile', cro: 'croodles', lor: 'lorelei', not: 'notionists',
    bot: 'bottts', pix: 'pixel-art', ide: 'identicon', rin: 'rings', shi: 'shapes',
    be: 'big-ears', ico: 'icons', thu: 'thumbs'
};
const AS_REV = Object.fromEntries(Object.entries(AS_MAP).map(([k,v])=>[v,k]));

const getAvatarUrl = (seed, aS) => {
    const style = AS_MAP[aS] || aS || 'fun-emoji';
    return `https://api.dicebear.com/7.x/${style}/svg?seed=${encodeURIComponent(seed)}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf`;
};

const getRandomSeed = () => {
    const chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz!@#$%^&*()-=+.,<>;'";
    const len = Math.floor(Math.random() * 4) + 1;
    let res = '';
    for (let i = 0; i < len; i++) res += chars.charAt(Math.floor(Math.random() * chars.length));
    return res;
};

const safeLoad = (key, template) => {
    try {
        const raw = localStorage.getItem(key);
        if (raw === null) return template;
        const parsed = JSON.parse(raw);
        if (Array.isArray(template)) return Array.isArray(parsed) ? parsed : template;
        if (typeof template === 'object' && template !== null) {
            if (typeof parsed !== 'object' || parsed === null) return template;
            const result = {};
            for (const k in template) {
                result[k] = parsed.hasOwnProperty(k) ? parsed[k] : template[k];
            }
            for (const k in parsed) {
                if (!(k in result)) result[k] = parsed[k];
            }
            return result;
        }
        return parsed !== null ? parsed : template;
    } catch (e) {
        console.error(`[SafeLoad] 讀取 ${key} 失敗，使用預設值`, e);
        return template;
    }
};

window.sortItems = sortItems;
window.StampTool = StampTool;
window.getTS = getTS;
window.compressJSON = compressJSON;
window.decompressJSON = decompressJSON;
window.decompressBinary = decompressBinary;
window.getAvatarUrl = getAvatarUrl;
window.getRandomSeed = getRandomSeed;
window.safeLoad = safeLoad;
