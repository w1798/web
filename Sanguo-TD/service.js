/* ===== 存檔、圖片、城池、碎片、上陣系統 ===== */
var STORAGE_KEY = 'sanguo_td_save';
var LB_CACHE_KEY = 'sanguo_td_lb_cache';
var TIER_NAMES = ['', '良', '優', '名將', '傳說', '無雙'];
var TIER_COLORS = ['', '#8a8a8a', '#2ecc71', '#3498db', '#9b59b6', '#ffd700'];
var STAMINA_MAX = 120;
var STAMINA_COST = 5;
var STAMINA_RECOVER_MS = 600000; // 10 分鐘

/* ═══ 本地存檔加解密（XOR + LCG 混淆 + djb2 hash 簽名）═══ */
var _SAVE_SECRET = 'sgt_td_2026_s3cr3t';

function _djb2(str) {
  var h = 5381;
  for (var i = 0; i < str.length; i++) { h = ((h << 5) + h) + str.charCodeAt(i); h |= 0; }
  return (h >>> 0).toString(16);
}

function _djb2Bytes(bytes) {
  var h = 5381;
  for (var i = 0; i < bytes.length; i++) { h = ((h << 5) + h) + bytes[i]; h |= 0; }
  return h >>> 0;
}

function _intToBytes(n) {
  return new Uint8Array([(n >>> 24) & 0xFF, (n >>> 16) & 0xFF, (n >>> 8) & 0xFF, n & 0xFF]);
}

function _bytesToInt(bytes) {
  return ((bytes[0] << 24) | (bytes[1] << 16) | (bytes[2] << 8) | bytes[3]) >>> 0;
}

function _lcgStream(seed, len) {
  var s = seed, bytes = new Uint8Array(len);
  for (var i = 0; i < len; i++) { s = (s * 1103515245 + 12345) >>> 0; bytes[i] = (s >>> 16) & 0xFF; }
  return bytes;
}

function _xorBytes(a, b) {
  var r = new Uint8Array(a.length);
  for (var i = 0; i < a.length; i++) r[i] = a[i] ^ b[i];
  return r;
}

function _strToBytes(str) {
  var bytes = new Uint8Array(str.length);
  for (var i = 0; i < str.length; i++) bytes[i] = str.charCodeAt(i) & 0xFF;
  return bytes;
}

function _bytesToStr(bytes) {
  var str = '';
  for (var i = 0; i < bytes.length; i++) str += String.fromCharCode(bytes[i]);
  return str;
}

function _btoaSafe(bytes) {
  var binary = '';
  for (var i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

function _atobSafe(b64) {
  var binary = atob(b64);
  var bytes = new Uint8Array(binary.length);
  for (var i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function _utf8Encode(str) {
  return unescape(encodeURIComponent(str));
}

function _utf8Decode(str) {
  return decodeURIComponent(escape(str));
}

function _encryptSave(dataObj) {
  var json = _utf8Encode(JSON.stringify(dataObj));
  var jsonBytes = _strToBytes(json);
  var hashNum = _djb2Bytes(jsonBytes);
  var hashBytes = _intToBytes(hashNum);
  var payload = new Uint8Array(jsonBytes.length + 4);
  payload.set(jsonBytes, 0);
  payload.set(hashBytes, jsonBytes.length);
  var seed = _djb2Bytes(_strToBytes(_SAVE_SECRET + hashNum));
  var key = _lcgStream(seed, payload.length);
  var enc = _xorBytes(payload, key);
  return { _v: 3, hash: hashNum, data: _btoaSafe(enc) };
}

function _decryptSave(pack) {
  var enc = _atobSafe(pack.data);
  /* 新格式 _v: 3 */
  if (pack._v === 3 && typeof pack.hash === 'number') {
    var seed3 = _djb2Bytes(_strToBytes(_SAVE_SECRET + pack.hash));
    var key3 = _lcgStream(seed3, enc.length);
    var dec3 = _xorBytes(enc, key3);
    if (dec3.length < 4) return null;
    var jsonBytes3 = dec3.slice(0, dec3.length - 4);
    var hashBytes3 = dec3.slice(dec3.length - 4);
    var expected3 = _djb2Bytes(jsonBytes3);
    if (_bytesToInt(hashBytes3) !== expected3) return null;
    var json3 = _utf8Decode(_bytesToStr(jsonBytes3));
    return JSON.parse(json3);
  }
  /* 舊格式 _v=2 */
  if (pack._v === 2 && typeof pack._h === 'string') {
    var seed2 = _djb2(_SAVE_SECRET + pack._h);
    var key2 = _lcgStream(seed2, enc.length);
    var dec2 = _bytesToStr(_xorBytes(enc, key2));
    var sep = dec2.lastIndexOf('::');
    if (sep === -1) return null;
    var json2 = _utf8Decode(dec2.substring(0, sep));
    var hash2 = dec2.substring(sep + 2);
    var expected2 = _djb2(_utf8Encode(json2) + _SAVE_SECRET);
    if (hash2 !== expected2) return null;
    return JSON.parse(json2);
  }
  return null;
}

function _isEncryptedPack(raw) {
  try {
    var p = JSON.parse(raw);
    return p && typeof p._v === 'number' && typeof p.data === 'string'
      && (typeof p.hash === 'number' || typeof p._h === 'string');
  } catch(e) { return false; }
}

var DEFAULT_DATA = {
  gold: 10,
  ownedHeroes: [],
  completedStages: [],
  completedHard: [],
  completedHell: [],
  heroFrags: {},
  heroTier: {},
  heroStar: {},
  deployedHeroes: [],
  stamina: 120,
  staminaLastRecovery: Date.now(),
  depositedGold: 0,
  settings: {},
  weapons: {},
  weaponStorage: [],
  playerName: '',
  lastScoreUploadTime: 0,
  heroExp: {},
  heroLevel: {},
  challengeHighWave: 0,
  bossRushKills: 0,
  diamond: 0,
  redeemedCodes: [],
  dailyLoginDate: '',
  dailyResetDate: '',
  dailyTaskProgress: {},
  dailyTaskClaimed: {},
  dailyShopPurchases: {},
  claimedCompensation: []
};

var Service = (function() {

  /* ═══ 私有資料儲存 ═══ */
  var _data = null;

  /* ═══ 工具函式 ═══ */
  function clone(obj) { return JSON.parse(JSON.stringify(obj)); }

  /* ═══ 唯讀 Proxy（防止 F12 直接修改資料）═══ */
  var _proxyCache = null;

  // 這些欄位禁止透過 Service.appData.xxx = ... 直接修改
  var CHEAT_FIELDS = {
    diamond: true, gold: true,
    ownedHeroes: true, weaponStorage: true, heroFrags: true,
    heroTier: true, heroStar: true, weapons: true
  };

  // 這些物件/陣列欄位回傳凍結複本，防止 .push() 等就地修改
  var FROZEN_RETURN = {
    ownedHeroes: true, weaponStorage: true, heroFrags: true,
    heroTier: true, heroStar: true, weapons: true
  };

  var _proxyHandler = {
    get: function(target, prop) {
      if (!_data) return undefined;
      var val = _data[prop];
      if (FROZEN_RETURN[prop] && typeof val === 'object' && val !== null) {
        return Array.isArray(val) ? Object.freeze(val.slice()) : Object.freeze(Object.assign({}, val));
      }
      return val;
    },
    set: function(target, prop, value) {
      if (CHEAT_FIELDS[prop]) {
        console.warn('⚠️ 禁止直接修改 ' + prop + '！請使用專用方法');
        return true;
      }
      _data[prop] = value;
      return true;
    },
    deleteProperty: function(target, prop) {
      if (CHEAT_FIELDS[prop]) {
        console.warn('⚠️ 禁止直接刪除 ' + prop + '！');
        return true;
      }
      delete _data[prop];
      return true;
    },
    ownKeys: function(target) {
      return Object.keys(_data || {});
    },
    getOwnPropertyDescriptor: function(target, prop) {
      if (_data && prop in _data) {
        return { enumerable: true, configurable: true };
      }
      return undefined;
    }
  };
  function buildProxy() {
    if (!_proxyCache) _proxyCache = new Proxy({}, _proxyHandler);
    return _proxyCache;
  }

  /* ═══ Console 呼叫檢測（透過 Error.stack 判斷）═══ */
  function _isConsoleCall() {
    try {
      var stack = new Error().stack || '';
      return /eval|anonymous|<anonymous>|console/i.test(stack);
    } catch(e) { return true; }
  }

  /* addBattleWeapon 每日計數（閉包變數，重整後重置） */
  var _wpnDailyDate = '', _wpnDailyCount = 0;

  var service = {
    get appData() { return buildProxy(); },

  loadData: function() {
    var raw = localStorage.getItem(STORAGE_KEY);
    var loaded = false;
    if (raw) {
      if (_isEncryptedPack(raw)) {
        try {
          var dec = _decryptSave(JSON.parse(raw));
          if (dec) { _data = this.mergeDefaults(dec); loaded = true; }
        } catch(e) { /* 解密失敗，fallback 到預設 */ }
      }
      if (!loaded) {
        /* 舊版明文 JSON 相容 — 過渡期僅限小明/小王 */
        try {
          var parsed = JSON.parse(raw);
          if (parsed && typeof parsed.gold === 'number') {
            var name = parsed.playerName || '';
            if (name === '羅密歐與豬過夜' || name === '我從零開始') {
              _data = this.mergeDefaults(parsed);
              loaded = true;
              /* 自動升級為加密格式 */
              this.saveData();
            }
          }
        } catch(e) {}
      }
    }
    if (!loaded) _data = clone(DEFAULT_DATA);
    var oldWave = _data.challengeHighWave;
    var oldKills = _data.bossRushKills;
    this.checkReset();
    if (_data.challengeHighWave !== oldWave || _data.bossRushKills !== oldKills) {
      this.saveData();
    }
    return _data;
  },

  checkReset: function() {
    if (!_data) return;

    var name = _data.playerName;
    var claimed = _data.claimedCompensation;
    var dirty = false;

    /* === 補償清單（始終執行，單次發放） ===
     * 每筆格式：{ id, name, gold, diamond, message }
     * - id:     唯一識別碼（同一筆只能領一次）
     * - name:   目標玩家名稱(可省略，對所有玩家)
     * - gold:   金幣數量（可省略）
     * - diamond:鑽石數量（可省略）
     * - message:領取後彈出的提示訊息（可省略）
     */
    var rewards = [
      // ===== 範例（請取消註解並修改） =====
      // { id: 'fix_20260723_xiaoming', name: '小明', gold: 5000, diamond: 100, message: '修復補償：金幣 5000、鑽石 100' },
      // { id: 'fix_20260723_xiaohua', name: '小華', gold: 10000, message: '金幣補償 10000' },
    ];
    for (var i = 0; i < rewards.length; i++) {
      var r = rewards[i];
      var isAll = !r.name;
      var match = isAll || r.name === name;
      if (match && claimed.indexOf(r.id) === -1) {
        if (r.gold) _data.gold += r.gold;
        if (r.diamond) _data.diamond += r.diamond;
        claimed.push(r.id);
        dirty = true;
        if (r.message) alert(r.message);
      }
    }

    /* === 排行榜數值重置（始終執行，單次重置） ===
     * 每筆格式：{ id, name, newWave, newKills }
     * - id:       唯一識別碼（同一筆只能重置一次）
     * - name:     目標玩家名稱（省略表示對所有玩家）
     * - newWave:  重置後的波數（可省略）
     * - newKills: 重置後的擊殺數（可省略）
     */
    var resets = [
      // ===== 範例（請取消註解並修改） =====
      // { id: 'reset_20260723_user', name: '使用者名稱', newWave: 63, newKills: 1 }, 
    ];
    for (var i = 0; i < resets.length; i++) {
      var r = resets[i];
      var isAll = !r.name;
      var match = isAll || r.name === name;
      if (match && claimed.indexOf(r.id) === -1) {
        if (r.newWave !== undefined) _data.challengeHighWave = r.newWave;
        if (r.newKills !== undefined) _data.bossRushKills = r.newKills;
        claimed.push(r.id);
        dirty = true;
      }
    }

    /* 自動清理：只保留 rewards 與 resets 中仍然存在的 ID */
    var validIds = [];
    for (var i = 0; i < rewards.length; i++) validIds.push(rewards[i].id);
    for (var i = 0; i < resets.length; i++) validIds.push(resets[i].id);
    _data.claimedCompensation = claimed.filter(function(id) {
      return validIds.indexOf(id) !== -1;
    });
    if (dirty) this.saveData();
  },

  mergeDefaults: function(data) {
    var d = clone(DEFAULT_DATA);
    if (typeof data.gold === 'number') d.gold = data.gold;
    if (Array.isArray(data.ownedHeroes)) d.ownedHeroes = data.ownedHeroes;
    if (Array.isArray(data.completedStages)) d.completedStages = data.completedStages;
    if (Array.isArray(data.completedHard)) d.completedHard = data.completedHard;
    if (Array.isArray(data.completedHell)) d.completedHell = data.completedHell;
    if (data.heroFrags && typeof data.heroFrags === 'object') {
      for (var k in data.heroFrags) d.heroFrags[k] = data.heroFrags[k];
    }
    if (data.heroTier && typeof data.heroTier === 'object') {
      for (var k in data.heroTier) d.heroTier[k] = data.heroTier[k];
    }
    if (data.heroStar && typeof data.heroStar === 'object') {
      for (var k in data.heroStar) d.heroStar[k] = data.heroStar[k];
    }
    if (Array.isArray(data.deployedHeroes)) d.deployedHeroes = data.deployedHeroes.slice(0, 6);
    if (typeof data.stamina === 'number') d.stamina = data.stamina;
    if (typeof data.staminaLastRecovery === 'number') d.staminaLastRecovery = data.staminaLastRecovery;
    if (data.settings && typeof data.settings === 'object') d.settings = data.settings;
    if (data.weapons && typeof data.weapons === 'object') {
      for (var k in data.weapons) {
        var w = data.weapons[k];
        if (w && typeof w.atk === 'number' && w.atkPct === undefined) {
          w.atkPct = w.atk;
          delete w.atk;
        }
        if (w && typeof w.hp === 'number' && w.hpPct === undefined) {
          w.hpPct = w.hp;
          delete w.hp;
        }
        d.weapons[k] = w;
      }
    }
    if (Array.isArray(data.weaponStorage)) {
      d.weaponStorage = [];
      for (var i = 0; i < data.weaponStorage.length; i++) {
        var w = data.weaponStorage[i];
        if (w && typeof w.atk === 'number' && w.atkPct === undefined) {
          w.atkPct = w.atk;
          delete w.atk;
        }
        if (w && typeof w.hp === 'number' && w.hpPct === undefined) {
          w.hpPct = w.hp;
          delete w.hp;
        }
        d.weaponStorage.push(w);
      }
    }
    if (typeof data.playerName === 'string') d.playerName = data.playerName;
    if (data.heroExp && typeof data.heroExp === 'object') {
      for (var k in data.heroExp) d.heroExp[k] = data.heroExp[k];
    }
    if (data.heroLevel && typeof data.heroLevel === 'object') {
      for (var k in data.heroLevel) d.heroLevel[k] = data.heroLevel[k];
    }
    if (typeof data.challengeHighWave === 'number') d.challengeHighWave = data.challengeHighWave;
    if (typeof data.bossRushKills === 'number') d.bossRushKills = data.bossRushKills;
    if (typeof data.diamond === 'number') d.diamond = data.diamond;
    if (Array.isArray(data.redeemedCodes)) d.redeemedCodes = data.redeemedCodes;
    if (typeof data.dailyLoginDate === 'string') d.dailyLoginDate = data.dailyLoginDate;
    if (typeof data.dailyResetDate === 'string') d.dailyResetDate = data.dailyResetDate;
    if (data.dailyTaskProgress && typeof data.dailyTaskProgress === 'object') {
      for (var k in data.dailyTaskProgress) d.dailyTaskProgress[k] = data.dailyTaskProgress[k];
    }
    if (data.dailyTaskClaimed && typeof data.dailyTaskClaimed === 'object') {
      for (var k in data.dailyTaskClaimed) d.dailyTaskClaimed[k] = data.dailyTaskClaimed[k];
    }
    if (data.dailyShopPurchases && typeof data.dailyShopPurchases === 'object') {
      for (var k in data.dailyShopPurchases) d.dailyShopPurchases[k] = data.dailyShopPurchases[k];
    }
    if (Array.isArray(data.claimedCompensation)) d.claimedCompensation = data.claimedCompensation;
    if (typeof data.lastScoreUploadTime === 'number') d.lastScoreUploadTime = data.lastScoreUploadTime;
    return d;
  },

  saveData: function() {
    this.checkReset();
    var pack = _encryptSave(_data);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(pack));
  },

  addDiamond: function(amount) {
    if (amount > 300) amount = 300;
    _data.diamond += amount;
    this.saveData();
  },

  spendDiamond: function(amount) {
    if (_data.diamond < amount) return false;
    _data.diamond -= amount;
    this.saveData();
    return true;
  },

  getTodayStr: function() {
    var d = new Date();
    return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2);
  },

  checkDailyReset: function() {
    var today = this.getTodayStr();
    if (_data.dailyResetDate !== today) {
      _data.dailyTaskProgress = {};
      _data.dailyTaskClaimed = {};
      _data.dailyShopPurchases = {};
      _data.dailyResetDate = today;
      this.saveData();
    }
  },

  checkDailyLogin: function() {
    var today = this.getTodayStr();
    if (_data.dailyLoginDate !== today) {
      _data.dailyLoginDate = today;
      this.addDiamond(10);
      return true;
    }
    return false;
  },

  addTaskProgress: function(taskId, amount) {
    this.checkDailyReset();
    var p = _data.dailyTaskProgress;
    p[taskId] = (p[taskId] || 0) + amount;
    this.saveData();
  },

  getTaskProgress: function(taskId) {
    return _data.dailyTaskProgress[taskId] || 0;
  },

  isTaskClaimed: function(taskId, milestoneIdx) {
    var key = taskId + '_' + milestoneIdx;
    return !!_data.dailyTaskClaimed[key];
  },

  claimTaskReward: function(taskId, milestoneIdx) {
    var key = taskId + '_' + milestoneIdx;
    if (_data.dailyTaskClaimed[key]) return false;
    var task = null;
    for (var i = 0; i < DAILY_TASKS.length; i++) {
      if (DAILY_TASKS[i].id === taskId) { task = DAILY_TASKS[i]; break; }
    }
    if (!task || milestoneIdx >= task.milestones.length) return false;
    if (this.getTaskProgress(taskId) < task.milestones[milestoneIdx]) return false;
    _data.dailyTaskClaimed[key] = true;
    this.addDiamond(task.reward);
    return true;
  },

  getShopPurchaseCount: function(itemId) {
    return _data.dailyShopPurchases[itemId] || 0;
  },

  buyShopItem: function(itemId) {
    this.checkDailyReset();
    var item = null;
    for (var i = 0; i < DAILY_SHOP.length; i++) {
      if (DAILY_SHOP[i].id === itemId) { item = DAILY_SHOP[i]; break; }
    }
    if (!item) return { ok: false, msg: '物品不存在' };
    if (item.dailyLimit > 0) {
      var bought = this.getShopPurchaseCount(itemId);
      if (bought >= item.dailyLimit) return { ok: false, msg: '今日已達購買上限' };
    }
    if (!this.spendGold(item.costGold)) return { ok: false, msg: '金幣不足' };
    item.effect();
    if (item.dailyLimit > 0) {
      _data.dailyShopPurchases[itemId] = (_data.dailyShopPurchases[itemId] || 0) + 1;
      this.saveData();
    }
    return { ok: true };
  },

  resetData: function() {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(STORAGE_KEY + '_devbackup');
    _data = clone(DEFAULT_DATA);
    this.saveData();
    if (UI) { UI.showMenu(); UI.renderCampaignList(); }
  },

  addGold: function(amount) {
    if (amount > 10000) amount = 10000;
    _data.gold += amount;
    this.saveData();
  },

  /* 戰鬥獎勵加入武器（繞過 Proxy 直接寫入 _data；每日 100 次上限） */
  addBattleWeapon: function(wpn) {
    var today = this.getTodayStr();
    if (_wpnDailyDate !== today) { _wpnDailyDate = today; _wpnDailyCount = 0; }
    _wpnDailyCount++;
    if (_wpnDailyCount > 100) return;
    if (!_data.weaponStorage) _data.weaponStorage = [];
    _data.weaponStorage.push(wpn);
    this.saveData();
  },

  /* 設定武將經驗 */
  setHeroExp: function(heroId, exp) {
    if (!_data.heroExp) _data.heroExp = {};
    _data.heroExp[heroId] = exp;
  },

  /* 設定武將等級 */
  setHeroLevel: function(heroId, lv) {
    if (!_data.heroLevel) _data.heroLevel = {};
    _data.heroLevel[heroId] = lv;
  },

  redeemCode: function(code) {
    var cleanCode = code.trim().toUpperCase();
    if (!cleanCode) return { ok: false, msg: '請輸入禮包碼' };

    var codes = {
      'VIP666': { gold: 200, diamond: 20, yellowWeapon: 1 },
      'VIP777': { gold: 200, diamond: 20, yellowWeapon: 1 },
      'VIP888': { gold: 200, diamond: 20, yellowWeapon: 1 }
    };

    /* 自動清理：只保留 codes 中仍然存在的禮包碼 */
    var currentCodes = Object.keys(codes);
    _data.redeemedCodes = _data.redeemedCodes.filter(function(c) {
      return currentCodes.indexOf(c) !== -1;
    });

    if (_data.redeemedCodes.indexOf(cleanCode) !== -1) return { ok: false, msg: '此禮包碼已領取過' };

    var reward = codes[cleanCode];
    if (!reward) return { ok: false, msg: '無效的禮包碼' };

    if (reward.gold) this.addGold(reward.gold);
    if (reward.diamond) this.addDiamond(reward.diamond);
    if (reward.yellowWeapon) {
      if (!_data.weaponStorage) _data.weaponStorage = [];
      for (var i = 0; i < reward.yellowWeapon; i++) {
        _data.weaponStorage.push(this.generateWeaponByQuality(4));
      }
    }
    _data.redeemedCodes.push(cleanCode);
    this.saveData();
    
    var msg = '領取成功！獲得金幣 ' + (reward.gold || 0) + '，鑽石 ' + (reward.diamond || 0);
    if (reward.yellowWeapon) msg += '，黃武器 x' + reward.yellowWeapon;
    return { ok: true, msg: msg };
  },

  spendGold: function(amount) {
    if (_data.gold < amount) return false;
    _data.gold -= amount;
    this.saveData();
    return true;
  },

  getStamina: function() {
    var now = Date.now();
    var elapsed = now - _data.staminaLastRecovery;
    var recover = Math.floor(elapsed / STAMINA_RECOVER_MS);
    if (recover > 0) {
      /* 只在未達上限時自然回復；超過上限（購買所得）不削減 */
      if (_data.stamina < STAMINA_MAX) {
        _data.stamina = Math.min(STAMINA_MAX, _data.stamina + recover);
      }
      _data.staminaLastRecovery += recover * STAMINA_RECOVER_MS;
      this.saveData();
    }
    return _data.stamina;
  },

  spendStamina: function(amount) {
    this.getStamina();
    if (_data.stamina < amount) return false;
    _data.stamina -= amount;
    this.addTaskProgress('stamina_spend', amount);
    this.saveData();
    return true;
  },

  getSettings: function() {
    return _data.settings;
  },

  hasHero: function(heroId) {
    return _data.ownedHeroes.indexOf(heroId) !== -1;
  },

  addHero: function(heroId) {
    if (this.hasHero(heroId)) return false;
    _data.ownedHeroes.push(heroId);
    var hd = getHeroData(heroId);
    if (hd) {
      _data.heroTier[heroId] = hd.rarity;
      _data.heroFrags[heroId] = 0;
    }
    this.autoFillDeploy();
    this.saveData();
    return true;
  },

  getHeroTier: function(heroId) {
    if (_data.heroTier[heroId]) return _data.heroTier[heroId];
    var hd = getHeroData(heroId);
    return hd ? hd.rarity : 1;
  },

  getHeroFrags: function(heroId) {
    return _data.heroFrags[heroId] || 0;
  },

  getHeroStar: function(heroId) {
    return _data.heroStar[heroId] || 0;
  },

  getPromoCount: function(heroId) {
    var hd = getHeroData(heroId);
    if (!hd) return 0;
    var startTier = hd.rarity;
    var currentTier = this.getHeroTier(heroId);
    var star = this.getHeroStar(heroId);
    var promos = (currentTier - startTier) + star;
    return Math.max(0, promos);
  },

  allHeroesMaxed: function() {
    var threeKingdomsHeroes = HERO_DATA.filter(function(h) { return h.faction !== '特'; });
    var ownedThreeKingdoms = _data.ownedHeroes.filter(function(hid) {
      var hd = getHeroData(hid);
      return hd && hd.faction !== '特';
    });
    if (ownedThreeKingdoms.length < threeKingdomsHeroes.length) return false;
    for (var i = 0; i < ownedThreeKingdoms.length; i++) {
      var hid = ownedThreeKingdoms[i];
      var hd = getHeroData(hid);
      if (!hd) continue;
      var tier = this.getHeroTier(hid);
      var star = this.getHeroStar(hid);
      if (getNextPromotion(hd.rarity, tier, star)) return false;
    }
    return true;
  },

addFrag: function(heroId, count) {
  if (count > 10) count = 10;
  var f = _data.heroFrags;
  f[heroId] = (f[heroId] || 0) + count;
  var addedCount = count;
  var hd = getHeroData(heroId);
  if (!hd) return { upgraded: false, msg: '', tier: this.getHeroTier(heroId), star: this.getHeroStar(heroId), fragCount: addedCount };
  var origin = hd.rarity;
  var tier = this.getHeroTier(heroId);
  var star = this.getHeroStar(heroId);
  var upgraded = false;
  var upgradeMsg = '';

  while (true) {
    var next = getNextPromotion(origin, tier, star);
    if (!next) break;
    if (f[heroId] >= next.cost) {
      f[heroId] -= next.cost;
      tier = next.toTier;
      star = next.toStar;
      _data.heroTier[heroId] = tier;
      _data.heroStar[heroId] = star;
      upgradeMsg = TIER_NAMES[tier] + (tier >= 4 && star > 0 ? '+' + star + '⭐' : '') + ' 晉升！';
      upgraded = true;
    } else {
      break;
    }
  }

  /* ===== 滿星碎片轉換 ===== */
  var convertMsg = '';
  var remainingFrags = f[heroId] || 0;
  if (remainingFrags > 0 && !getNextPromotion(origin, tier, star)) {
    if (hd.faction === '特') {
      /* 特陣營（系列）：傳說(R4)→藍武器x3/碎片，無雙(R5)→黃武器x1/碎片 */
      if (origin === 4) {
        var blueCount = remainingFrags * 3;
        for (var i = 0; i < blueCount; i++) {
          _data.weaponStorage.push(this.generateWeaponByQuality(2));
        }
        convertMsg = '轉換為藍武器 x' + blueCount;
        f[heroId] = 0;
      } else if (origin === 5) {
        for (var i = 0; i < remainingFrags; i++) {
          _data.weaponStorage.push(this.generateWeaponByQuality(4));
        }
        convertMsg = '轉換為黃武器 x' + remainingFrags;
        f[heroId] = 0;
      }
    } else {
      /* 三國：R1→1金，R2→2金，R3→3金，R4→5金，R5→100金 */
      var goldRate = 0;
      if (origin === 1) goldRate = 1;
      else if (origin === 2) goldRate = 2;
      else if (origin === 3) goldRate = 3;
      else if (origin === 4) goldRate = 5;
      else if (origin === 5) goldRate = 100;
      if (goldRate > 0) {
        var totalGold = remainingFrags * goldRate;
        _data.gold += totalGold;
        convertMsg = '轉換為金幣 x' + totalGold;
        f[heroId] = 0;
      }
    }
  }

  this.saveData();
  return {
    upgraded: upgraded,
    converted: !!convertMsg,
    msg: convertMsg || upgradeMsg,
    tier: tier,
    star: star,
    fragCount: addedCount
  };
},

  /* ===== Deploy System ===== */
  getDeployedHeroes: function() {
    var d = _data.deployedHeroes.filter(function(h) { return true; });
    var owned = _data.ownedHeroes.length;
    if (owned <= 6) {
      // auto-deploy all
      d = _data.ownedHeroes.slice();
    }
    return d;
  },

  getDeployedSynergyBonuses: function(deployed) {
    var typeCount = {}, rarityCount = {}, factionCount = {};
    for (var i = 0; i < deployed.length; i++) {
      var hd = getHeroData(deployed[i]);
      if (!hd) continue;
      typeCount[hd.type] = (typeCount[hd.type] || 0) + 1;
      rarityCount[hd.rarity] = (rarityCount[hd.rarity] || 0) + 1;
      factionCount[hd.faction] = (factionCount[hd.faction] || 0) + 1;
    }
    var atkPct = 0;
    var distinctTypes = Object.keys(typeCount).length;
    if (distinctTypes >= 3) atkPct += 2 * distinctTypes - 2;
    var rarityMax = 0;
    for (var r in rarityCount) { if (rarityCount[r] > rarityMax) rarityMax = rarityCount[r]; }
    if (rarityMax >= 3) atkPct += 4 + rarityMax * 2;
    var distinctRarities = Object.keys(rarityCount).length;
    if (distinctRarities >= 5) atkPct += DISTINCT_RARITY_BONUS_ATK;
    var factionMax = 0;
    for (var f in factionCount) { if (factionCount[f] > factionMax) factionMax = factionCount[f]; }
    if (factionMax >= 3) atkPct += 4 + 2 * factionMax;
    var bonds = [];
    for (var b = 0; b < BOND_DATA.length; b++) {
      var bond = BOND_DATA[b];
      if (bond.type !== 'bond' && bond.type !== 'factionBond') continue;
      var allOk = true;
      if (bond.factionBond) {
        var fc = factionCount[bond.factionBond] || 0;
        allOk = fc >= (bond.minFaction || 2);
        if (allOk) {
          bonds.push({ name: bond.name, members: [], atkPct: bond.atkPct || 0, hpPct: bond.hpPct || 0 });
        }
        continue;
      }
      var deployedCount = 0;
      for (var m = 0; m < bond.members.length; m++) {
        if (deployed.indexOf(bond.members[m]) !== -1) deployedCount++;
      }
      var required = bond.minMembers || bond.members.length;
      allOk = deployedCount >= required;
      if (allOk) {
        bonds.push({ name: bond.name, members: bond.members, atkPct: bond.atkPct || 0, hpPct: bond.hpPct || 0 });
      }
    }
    return { atkPct: atkPct, bonds: bonds };
  },

  autoFillDeploy: function() {
    var d = _data;
    if (d.ownedHeroes.length <= 6) {
      d.deployedHeroes = d.ownedHeroes.slice();
    } else if (d.deployedHeroes.length < 6) {
      var existing = d.deployedHeroes.slice();
      var self = this;
      var sorted = d.ownedHeroes.slice().sort(function(a, b) {
        var ha = getHeroData(a), hb = getHeroData(b);
        var sa = ha ? getHeroScore(ha, self.getHeroTier(a), self.getHeroStar(a), self.getWeapon(a)) : 0;
        var sb = hb ? getHeroScore(hb, self.getHeroTier(b), self.getHeroStar(b), self.getWeapon(b)) : 0;
        return sb - sa;
      });
      for (var i = 0; i < sorted.length && existing.length < 6; i++) {
        if (existing.indexOf(sorted[i]) === -1) {
          var hd = getHeroData(sorted[i]);
          var specialCount = 0;
          for (var j = 0; j < existing.length; j++) {
            var shd = getHeroData(existing[j]);
            if (shd && shd.faction === '特') specialCount++;
          }
          if (hd && hd.faction === '特' && specialCount >= 2) continue;
          existing.push(sorted[i]);
        }
      }
      d.deployedHeroes = existing;
    }
    if (d.deployedHeroes.length > 6) d.deployedHeroes = d.deployedHeroes.slice(0, 6);
    this.saveData();
  },

  toggleDeploy: function(heroId) {
    var d = _data;
    if (d.ownedHeroes.length <= 6) return { ok: true };
    var idx = d.deployedHeroes.indexOf(heroId);
    if (idx !== -1) {
      d.deployedHeroes.splice(idx, 1);
    } else {
      if (d.deployedHeroes.length >= 6) return { ok: false, msg: '上陣已滿 6 人' };
      var hd = getHeroData(heroId);
      if (hd && hd.faction === '特') {
        var specialCount = 0;
        for (var i = 0; i < d.deployedHeroes.length; i++) {
          var shd = getHeroData(d.deployedHeroes[i]);
          if (shd && shd.faction === '特') specialCount++;
        }
        if (specialCount >= 2) return { ok: false, msg: '特陣營英雄最多只能上陣 2 人' };
      }
      d.deployedHeroes.push(heroId);
    }
    this.saveData();
    return { ok: true };
  },

  clearDeploy: function() {
    var d = _data;
    if (d.ownedHeroes.length <= 6) return;
    d.deployedHeroes = [];
    this.saveData();
  },

  isDeployed: function(heroId) {
    if (_data.ownedHeroes.length <= 6) return true;
    return _data.deployedHeroes.indexOf(heroId) !== -1;
  },

completeStage: function(stageId, difficulty) {
    difficulty = difficulty || 'normal';
    if (DEV_MODE) {
        for (var c = 0; c < CAMPAIGNS.length; c++) {
            for (var s = 0; s < CAMPAIGNS[c].stages.length; s++) {
                var sid = CAMPAIGNS[c].stages[s].id;
                if (_data.completedStages.indexOf(sid) === -1) {
                    _data.completedStages.push(sid);
                }
            }
        }
        this.saveData();
        return;
    }
    if (difficulty === 'normal' && _data.completedStages.indexOf(stageId) === -1) {
        _data.completedStages.push(stageId);
    }
    if (difficulty === 'hard' && _data.completedHard.indexOf(stageId) === -1) {
        _data.completedHard.push(stageId);
    }
    if (difficulty === 'hell' && _data.completedHell.indexOf(stageId) === -1) {
        _data.completedHell.push(stageId);
    }
    this.saveData();
},

  /* 特定難度是否通關 */
  isStageCompleted: function(stageId, difficulty) {
    difficulty = difficulty || 'normal';
    if (DEV_MODE) return true;
    if (difficulty === 'hard') return _data.completedHard.indexOf(stageId) !== -1;
    if (difficulty === 'hell') return _data.completedHell.indexOf(stageId) !== -1;
    return _data.completedStages.indexOf(stageId) !== -1;
  },

  isStageUnlocked: function(stageId, difficulty) {
    difficulty = difficulty || 'normal';
    if (DEV_MODE) return true;
    /* 高難度需前一難度全部通關才解鎖 */
    if (difficulty === 'hard' && !this.isDifficultyAllCleared('normal')) return false;
    if (difficulty === 'hell' && !this.isDifficultyAllCleared('hard')) return false;
    for (var c = 0; c < CAMPAIGNS.length; c++) {
      var st = CAMPAIGNS[c].stages;
      for (var s = 0; s < st.length; s++) {
        if (st[s].id === stageId) {
          if (s === 0) {
            if (c === 0) return true;
            var prevCampaign = CAMPAIGNS[c - 1];
            return this.isStageCompleted(prevCampaign.stages[prevCampaign.stages.length - 1].id, difficulty);
          }
          return this.isStageCompleted(st[s - 1].id, difficulty);
        }
      }
    }
    return false;
  },

  /* 某難度是否全通 */
  isDifficultyAllCleared: function(difficulty) {
    if (DEV_MODE) return true;
    var check = difficulty === 'hard' ? 'completedHard' : (difficulty === 'hell' ? 'completedHell' : 'completedStages');
    for (var c = 0; c < CAMPAIGNS.length; c++) {
      for (var s = 0; s < CAMPAIGNS[c].stages.length; s++) {
        if (_data[check].indexOf(CAMPAIGNS[c].stages[s].id) === -1) return false;
      }
    }
    return true;
  },

  doGacha: function() {
    if (!DEV_MODE && !this.spendGold(10)) return null;
    return this._gachaPull();
  },

  _gachaPull: function() {
    var roll = Math.random();
    var rarity = 1;
    for (var i = 0; i < GACHA_RATES.length; i++) {
      if (roll < GACHA_RATES[i].threshold) { rarity = GACHA_RATES[i].rarity; break; }
    }

    var candidates = HERO_DATA.filter(function(h) { return h.rarity === rarity && h.faction !== '特'; });
    if (candidates.length === 0) candidates = HERO_DATA.filter(function(h) { return h.rarity <= 2 && h.faction !== '特'; });
    var picked = candidates[Math.floor(Math.random() * candidates.length)];

    var isNew = !this.hasHero(picked.id);
    var upgradeInfo = null;
    if (isNew) {
      this.addHero(picked.id);
    } else {
      upgradeInfo = this.addFrag(picked.id, 1);
    }
    return { hero: picked, isNew: isNew, rarity: rarity, upgradeInfo: upgradeInfo };
  },

  doMultiGacha: function(count) {
    var cost = count * 10;
    if (!DEV_MODE && !this.spendGold(cost)) return null;
    var results = [];
    for (var i = 0; i < count; i++) {
      results.push(this._gachaPull());
    }
    return results;
  },

  /* ===== 事件抽卡（時空裂隙·特陣營） ===== */
  EVENT_GACHA_COST: 30,
  EVENT_GACHA_MULTI: 10,
  EVENT_GACHA_PITY: 10,

  doEventGacha: function() {
    if (!DEV_MODE && !this.spendDiamond(this.EVENT_GACHA_COST)) return null;
    return this._eventGachaPull(false);
  },

  doMultiEventGacha: function(count) {
    count = count || this.EVENT_GACHA_MULTI;
    var cost = count * this.EVENT_GACHA_COST;
    if (!DEV_MODE && !this.spendDiamond(cost)) return null;
    var results = [];
    var pityCounter = 0;
    for (var i = 0; i < count; i++) {
      pityCounter++;
      var force5 = (pityCounter >= this.EVENT_GACHA_PITY);
      var r = this._eventGachaPull(force5);
      if (r && r.rarity === 5) pityCounter = 0;
      results.push(r);
    }
    return results;
  },

  _eventGachaPull: function(forceWushuang) {
    var roll = Math.random();
    var rarity;
    if (forceWushuang) {
      rarity = 5;
    } else {
      rarity = 4;
      for (var i = 0; i < EVENT_GACHA_RATES.length; i++) {
        if (roll < EVENT_GACHA_RATES[i].threshold) { rarity = EVENT_GACHA_RATES[i].rarity; break; }
      }
    }
    var candidates = HERO_DATA.filter(function(h) {
      return h.rarity === rarity && h.faction === '特' && h.series === ACTIVE_SERIES;
    });
    if (candidates.length === 0) {
      candidates = HERO_DATA.filter(function(h) {
        return h.faction === '特' && h.series === ACTIVE_SERIES;
      });
    }
    var picked = candidates[Math.floor(Math.random() * candidates.length)];
    var isNew = !this.hasHero(picked.id);
    var upgradeInfo = null;
    if (isNew) {
      this.addHero(picked.id);
    } else {
      upgradeInfo = this.addFrag(picked.id, 1);
    }
    return { hero: picked, isNew: isNew, rarity: rarity, upgradeInfo: upgradeInfo };
  },

  _weaponGachaPull: function() {
    var r = Math.random();
    var quality;
    if (r < 0.03) quality = 4;
    else if (r < 0.10) quality = 3;
    else if (r < 0.50) quality = 2;
    else quality = 1;

    var types = ['sword','spear','bow','horse','mage','monk'];
    var type = types[Math.floor(Math.random() * types.length)];
    return this._buildWeapon(quality, type);
  },

  doWeaponGacha: function() {
    if (!DEV_MODE && !this.spendGold(100)) return null;
    var w = this._weaponGachaPull();
    _data.weaponStorage.push(w);
    this.saveData();
    return w;
  },

  doMultiWeaponGacha: function(count) {
    var cost = count * 100;
    if (!DEV_MODE && !this.spendGold(cost)) return null;
    var results = [];
    for (var i = 0; i < count; i++) {
      results.push(this._weaponGachaPull());
    }
    for (var j = 0; j < results.length; j++) {
      _data.weaponStorage.push(results[j]);
    }
    this.saveData();
    return results;
  },

  /* ===== 武器系統 ===== */
  getWeapon: function(heroId) {
    return _data.weapons[heroId] || null;
  },

  generateWeapon: function(stageId, guaranteed, difficulty) {
    var diff = difficulty || 'normal';
    var rates = getDropRates(stageId, diff);
    if (!rates) return null;

    var r = Math.random();
    var quality;
    if (guaranteed) {
      var total = rates.yellow + rates.purple + rates.blue + rates.white;
      if (total <= 0) return null;
      r = Math.random() * total;
      if (r < rates.yellow) quality = 4;
      else if (r < rates.yellow + rates.purple) quality = 3;
      else if (r < rates.yellow + rates.purple + rates.blue) quality = 2;
      else quality = 1;
    } else {
      if (r < rates.yellow) quality = 4;
      else if (r < rates.yellow + rates.purple) quality = 3;
      else if (r < rates.yellow + rates.purple + rates.blue) quality = 2;
      else if (r < rates.yellow + rates.purple + rates.blue + rates.white) quality = 1;
      else return null;
    }
    var types = ['sword','spear','bow','horse','mage','monk'];
    var type = types[Math.floor(Math.random() * types.length)];
    return this._buildWeapon(quality, type);
  },

  _generateWeaponStats: function(quality) {
    var atkPct = 0, hpPct = 0, spd = 0;
    if (quality === 1) {
      atkPct = +(0.1 + Math.random() * 19.9).toFixed(1);
    } else if (quality === 2) {
      atkPct = +(5.0 + Math.random() * 25.0).toFixed(1);
      hpPct = +(5.0 + Math.random() * 25.0).toFixed(1);
    } else if (quality === 3) {
      atkPct = +(10.0 + Math.random() * 30.0).toFixed(1);
      hpPct = +(10.0 + Math.random() * 30.0).toFixed(1);
      spd = +(0.10 + Math.random() * 0.40).toFixed(2);
    } else if (quality === 4) {
      atkPct = +(0.1 + Math.random() * 49.9).toFixed(1);
      hpPct = +(0.1 + Math.random() * 49.9).toFixed(1);
      spd = +(0.01 + Math.random() * 0.99).toFixed(2);
    }
    return { atkPct: atkPct, hpPct: hpPct, spd: spd };
  },

  _buildWeapon: function(quality, type) {
    var stats = this._generateWeaponStats(quality);
    var w = { quality: quality, type: type, atkPct: stats.atkPct, hpPct: stats.hpPct, spd: stats.spd };
    if (quality === 4 && Math.random() < 0.20) {
      w.extraSkill = this._generateExtraSkill();
    }
    return w;
  },

  _generateExtraSkill: function() {
    var spec = EXTRA_SKILL_SPECS[Math.floor(Math.random() * EXTRA_SKILL_SPECS.length)];
    var skill = {
      type: spec.type,
      name: spec.name,
      procRate: +(0.1 + Math.random() * 9.9).toFixed(1),
      skillValues: {},
      lastProcTime: 0
    };
    var desc = spec.desc;
    if (spec.healPctRange) {
      skill.skillValues.healPct = +(spec.healPctRange[0] + Math.random() * (spec.healPctRange[1] - spec.healPctRange[0])).toFixed(1);
      desc = desc.replace('{healPct}', skill.skillValues.healPct);
    }
  if (spec.atkPctRange) {
    skill.skillValues.atkPct = +(spec.atkPctRange[0] + Math.random() * (spec.atkPctRange[1] - spec.atkPctRange[0])).toFixed(1);
    desc = desc.replace('{atkPct}', skill.skillValues.atkPct);
  }
    if (spec.atkPctRange) {
      skill.skillValues.atkPct = +(spec.atkPctRange[0] + Math.random() * (spec.atkPctRange[1] - spec.atkPctRange[0])).toFixed(1);
      desc = desc.replace('{atkPct}', skill.skillValues.atkPct);
    }
    if (spec.bonusPctRange) {
      skill.skillValues.bonusPct = +(spec.bonusPctRange[0] + Math.random() * (spec.bonusPctRange[1] - spec.bonusPctRange[0])).toFixed(1);
      desc = desc.replace('{bonusPct}', skill.skillValues.bonusPct);
    }
    if (spec.stunDurationRange) {
      skill.skillValues.stunDuration = +(spec.stunDurationRange[0] + Math.random() * (spec.stunDurationRange[1] - spec.stunDurationRange[0])).toFixed(1);
      desc = desc.replace('{stunDuration}', skill.skillValues.stunDuration);
    }
    if (spec.slowPctRange) {
      skill.skillValues.slowPct = +(spec.slowPctRange[0] + Math.random() * (spec.slowPctRange[1] - spec.slowPctRange[0])).toFixed(1);
      desc = desc.replace('{slowPct}', skill.skillValues.slowPct);
    }
    if (spec.durationRange) {
      skill.skillValues.duration = +(spec.durationRange[0] + Math.random() * (spec.durationRange[1] - spec.durationRange[0])).toFixed(1);
      desc = desc.replace('{duration}', skill.skillValues.duration);
    }
    skill.desc = desc;
    return skill;
  },

  generateWeaponByQuality: function(quality) {
    var types = ['sword','spear','bow','horse','mage','monk'];
    var type = types[Math.floor(Math.random() * types.length)];
    return this._buildWeapon(quality, type);
  },

  equipWeapon: function(heroId, weaponData) {
    _data.weapons[heroId] = weaponData;
    this.saveData();
  },

  unequipWeapon: function(heroId) {
    delete _data.weapons[heroId];
    this.saveData();
  },

  unequipToStorage: function(heroId) {
    var w = _data.weapons[heroId];
    if (!w) return false;
    delete _data.weapons[heroId];
    _data.weaponStorage.push(w);
    this.saveData();
    return true;
  },

  transferWeapon: function(fromHeroId, toHeroId) {
    var w = _data.weapons[fromHeroId];
    if (!w) return false;
    delete _data.weapons[fromHeroId];
    _data.weapons[toHeroId] = w;
    this.saveData();
    return true;
  },

  recycleWeapon: function(heroId) {
    var w = _data.weapons[heroId];
    if (!w) return 0;
    var gold = WEAPON_QUALITY[w.quality] ? WEAPON_QUALITY[w.quality].recycleGold : 0;
    delete _data.weapons[heroId];
    _data.gold += gold;
    this.addTaskProgress('weapon_sell', 1);
    this.saveData();
    return gold;
  },

  equipStoredWeapon: function(storageIndex, heroId) {
    var stored = _data.weaponStorage[storageIndex];
    if (!stored) return false;
    var hero = getHeroData(heroId);
    if (!hero) return false;
    _data.weaponStorage.splice(storageIndex, 1);
    if (_data.weapons[heroId]) {
      _data.weaponStorage.push(_data.weapons[heroId]);
    }
    _data.weapons[heroId] = stored;
    this.saveData();
    return true;
  },

  recycleStoredWeapon: function(storageIndex) {
    var stored = _data.weaponStorage[storageIndex];
    if (!stored) return 0;
    var gold = WEAPON_QUALITY[stored.quality] ? WEAPON_QUALITY[stored.quality].recycleGold : 0;
    _data.weaponStorage.splice(storageIndex, 1);
    _data.gold += gold;
    this.addTaskProgress('weapon_sell', 1);
    this.saveData();
    return gold;
  },

  batchRecycleStoredWeapons: function(quality) {
    var gold = WEAPON_QUALITY[quality] ? WEAPON_QUALITY[quality].recycleGold : 0;
    var total = 0, removed = 0;
    for (var k = _data.weaponStorage.length - 1; k >= 0; k--) {
      if (_data.weaponStorage[k].quality === quality && !_data.weaponStorage[k].isFavorite) {
        total += gold;
        _data.weaponStorage.splice(k, 1);
        removed++;
        this.addTaskProgress('weapon_sell', 1);
      }
    }
    _data.gold += total;
    this.saveData();
    return { removed: removed, gold: total };
  },

  toggleFavoriteWeapon: function(storageIndex) {
    var stored = _data.weaponStorage[storageIndex];
    if (!stored) return false;
    stored.isFavorite = !stored.isFavorite;
    this.saveData();
    return stored.isFavorite;
  },

  unequipAllToStorage: function() {
    if (!_data.weaponStorage) _data.weaponStorage = [];
    for (var i = 0; i < _data.ownedHeroes.length; i++) {
      var hid = _data.ownedHeroes[i];
      if (_data.weapons[hid]) {
        _data.weaponStorage.push(_data.weapons[hid]);
        delete _data.weapons[hid];
      }
    }
    this.saveData();
  },

  autoEquipBest: function() {
    if (!_data.weaponStorage) _data.weaponStorage = [];
    for (var i = 0; i < _data.ownedHeroes.length; i++) {
      var hid = _data.ownedHeroes[i];
      if (_data.weapons[hid]) {
        _data.weaponStorage.push(_data.weapons[hid]);
        delete _data.weapons[hid];
      }
    }
    var deployed = this.getDeployedHeroes();
    deployed.sort(function(a, b) {
      var ha = getHeroData(a), hb = getHeroData(b);
      var ra = ha ? ha.rarity : 0, rb = hb ? hb.rarity : 0;
      return rb - ra;
    });
    for (var j = 0; j < deployed.length; j++) {
      var hid2 = deployed[j];
      var hd = getHeroData(hid2);
      if (!hd) continue;
      var wType = this.getHeroWeaponType(hd);
      var bestIdx = -1, bestCp = -1;
      for (var k = 0; k < _data.weaponStorage.length; k++) {
        var w = _data.weaponStorage[k];
        if (w.type !== wType) continue;
        var cp = (w.atkPct || 0) + (w.hpPct || 0) / 2 + (w.spd || 0) * 100;
        if (cp > bestCp) { bestIdx = k; bestCp = cp; }
      }
      if (bestIdx >= 0) {
        _data.weapons[hid2] = _data.weaponStorage.splice(bestIdx, 1)[0];
      }
    }
    this.saveData();
  },

  getHeroWeaponType: function(hd) {
    var map = { warrior:'sword', spearman:'spear', archer:'bow', horse:'horse', mage:'mage', healer:'monk' };
    return map[hd.type] || 'sword';
  },

  importSaveData: function(dataObj) {
    if (!dataObj || typeof dataObj !== 'object') return;
    _data = this.mergeDefaults(dataObj);
    this.saveData();
  }
};

  return service;
})();
