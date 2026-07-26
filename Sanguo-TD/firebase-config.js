/* ===== Firebase 排行榜系統 ===== */
var firebaseConfig = {
  apiKey: "AIzaSyC8FDd0JH-_KdxiwCErFB-Z3DoV1TVQ0vc",
  authDomain: "sanguo-td.firebaseapp.com",
  projectId: "sanguo-td",
  storageBucket: "sanguo-td.appspot.com",
  messagingSenderId: "G-37W198SSSD",
  appId: "1:1055126172943:web:dc981c09444a4277803a7a"
};

var LeaderboardAPI = {
  db: null,
  uid: null,

  init: function() {
    try {
      firebase.initializeApp(firebaseConfig);

      // 本地環境跳過 App Check（避免 ReCAPTCHA 403 錯誤洗版）
      var _host = (self.location && self.location.hostname) || '';
      var _isLocal = _host === '127.0.0.1' || _host === 'localhost' || (self.location && self.location.protocol === 'file:');
      if (!_isLocal) {
        // 啟動 App Check（reCAPTCHA v3）
        firebase.appCheck().activate(
          '6Le2H2QtAAAAAOvb8f5Z666vUseA403uFu-vP4yC',
          true  // isTokenAutoRefreshEnabled
        );
      }

      this.db = firebase.firestore();
      this.signIn();
    } catch(e) {
      console.warn('Firebase init failed:', e);
    }
  },

  signIn: function() {
    var self = this;
    firebase.auth().signInAnonymously()
      .then(function(result) {
        self.uid = result.user.uid;
      })
      .catch(function(e) {
        console.warn('Anonymous auth failed:', e);
      });
  },

  submitScore: function(playerName, totalScore, heroes, extraData, callback) {
    if (!this.db || !this.uid) {
      if (callback) callback(false);
      return;
    }
    var data = {
      uid: this.uid,
      playerName: playerName,
      totalScore: totalScore,
      heroes: heroes,
      challengeHighWave: (extraData && extraData.challengeHighWave) || 0,
      bossRushKills: (extraData && extraData.bossRushKills) || 0,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    this.db.collection('leaderboard').doc(this.uid).set(data)
      .then(function() { if (callback) callback(true); })
      .catch(function(e) { console.warn('Submit score failed:', e); if (callback) callback(false); });
  },

  getLeaderboard: function(topN, sortBy, callback) {
    if (!this.db) {
      if (callback) callback([]);
      return;
    }
    this.db.collection('leaderboard')
      .orderBy('totalScore', 'desc')
      .limit(topN || 20)
      .get()
      .then(function(snapshot) {
        var list = [];
        snapshot.forEach(function(doc) {
          list.push(doc.data());
        });
        var field = sortBy || 'totalScore';
        list.sort(function(a, b) { return (b[field] || 0) - (a[field] || 0); });
        if (callback) callback(list);
      })
      .catch(function(e) {
        console.warn('Get leaderboard failed:', e);
        if (callback) callback([]);
      });
  },

  checkNameExists: function(name, callback) {
    if (!this.db) {
      if (callback) callback(false);
      return;
    }
    this.db.collection('leaderboard')
      .where('playerName', '==', name)
      .limit(1)
      .get()
      .then(function(snapshot) {
        var exists = false;
        snapshot.forEach(function(doc) {
          if (doc.id !== LeaderboardAPI.uid) exists = true;
        });
        if (callback) callback(exists);
      })
      .catch(function(e) {
        console.warn('Check name failed:', e);
        if (callback) callback(false);
      });
  },

  cleanupLeaderboard: async function() {
    if (!this.db) return 0;
    var snapshot = await this.db.collection('leaderboard').get();
    var allDocs = [];
    snapshot.forEach(function(doc) {
      allDocs.push({id: doc.id, data: doc.data()});
    });
    if (allDocs.length === 0) return 0;

    var now = Date.now();
    var oneDay = 24 * 60 * 60 * 1000;
    var toDelete = [];
    var playerMap = {};

    for (var i = 0; i < allDocs.length; i++) {
      var doc = allDocs[i];
      var data = doc.data;
      var updatedAt = data.updatedAt ? (data.updatedAt.toDate ? data.updatedAt.toDate().getTime() : (data.updatedAt.seconds ? data.updatedAt.seconds * 1000 : 0)) : 0;
      
      // 1. 刪除 totalScore == 0 且超過 1 天的
      if ((data.totalScore || 0) === 0 && (now - updatedAt > oneDay)) {
        toDelete.push(doc.id);
        continue;
      }

      // 2. 同名保留最新
      if (data.playerName) {
        if (!playerMap[data.playerName] || updatedAt > playerMap[data.playerName].updatedAt) {
          if (playerMap[data.playerName]) toDelete.push(playerMap[data.playerName].id);
          playerMap[data.playerName] = { id: doc.id, updatedAt: updatedAt };
        } else {
          toDelete.push(doc.id);
        }
      }
    }

    if (toDelete.length === 0) return 0;

    // 使用 batch 批次刪除
    var batchSize = 500;
    var deleted = 0;
    for (var startIdx = 0; startIdx < toDelete.length; startIdx += batchSize) {
      var endIdx = Math.min(startIdx + batchSize, toDelete.length);
      var batch = this.db.batch();
      for (var i = startIdx; i < endIdx; i++) {
        batch.delete(this.db.collection('leaderboard').doc(toDelete[i]));
      }
      await batch.commit();
      deleted += (endIdx - startIdx);
    }

    return deleted;
  }
};

/* 輔助：從 Firestore Timestamp 取得毫秒時間戳 */
function _getTimestamp(ts) {
  if (!ts) return 0;
  if (ts.toDate) return ts.toDate().getTime();
  if (ts.seconds) return ts.seconds * 1000;
  if (typeof ts === 'number') return ts;
  return 0;
}

/* ===== 雲端存檔（AES-256-GCM + PBKDF2） ===== */
function _bufToB64(buf) {
  var binary = '';
  for (var i = 0; i < buf.length; i++) binary += String.fromCharCode(buf[i]);
  return btoa(binary);
}
function _b64ToBuf(b64) {
  var binary = atob(b64);
  var buf = new Uint8Array(binary.length);
  for (var i = 0; i < binary.length; i++) buf[i] = binary.charCodeAt(i);
  return buf;
}

var CloudSaveAPI = {
  _useSubtle: typeof crypto !== 'undefined' && crypto.subtle && crypto.subtle.importKey ? true : false,

  _hashStr: function(str) {
    var h = 0;
    for (var i = 0; i < str.length; i++) { h = ((h << 5) - h) + str.charCodeAt(i); h |= 0; }
    return h >>> 0;
  },

  _xorEncrypt: function(dataBytes, password, salt) {
    var seed = this._hashStr(password + ':' + _bufToB64(salt));
    var key = new Uint8Array(dataBytes.length);
    for (var i = 0; i < dataBytes.length; i++) {
      seed = (seed * 1103515245 + 12345) >>> 0;
      key[i] = (seed >>> 16) & 0xFF;
    }
    var result = new Uint8Array(dataBytes.length);
    for (var i = 0; i < dataBytes.length; i++) result[i] = dataBytes[i] ^ key[i];
    return result;
  },

  _encrypt: async function(rawStr, password) {
    // v2: AES-256-GCM + PBKDF2 — 加密任意字串（localStorage 原始內容）
    var enc = new TextEncoder();
    var salt = crypto.getRandomValues(new Uint8Array(16));
    var iv = crypto.getRandomValues(new Uint8Array(12));
    var keyMaterial = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveKey']);
    var key = await crypto.subtle.deriveKey({name:'PBKDF2', salt:salt, iterations:100000, hash:'SHA-256'}, keyMaterial, {name:'AES-GCM', length:256}, false, ['encrypt']);
    var encrypted = await crypto.subtle.encrypt({name:'AES-GCM', iv:iv}, key, enc.encode(rawStr));
    return {
      _v: 2,
      salt: _bufToB64(salt),
      iv: _bufToB64(iv),
      data: _bufToB64(new Uint8Array(encrypted))
    };
  },

  _decrypt: async function(pack, password) {
    if (!pack || !pack.data) return null;
    // v1: 全位元組 XOR + hash 驗證（與 _encrypt 完全一致）
    if (pack._v === 1 && typeof pack.hash === 'number') {
      var dataBytes = _b64ToBuf(pack.data);
      var seed = _djb2(password + ':' + pack.hash);
      var key = new Uint8Array(dataBytes.length);
      for (var i = 0; i < dataBytes.length; i++) {
        seed = (seed * 1103515245 + 12345) >>> 0;
        key[i] = (seed >>> 16) & 0xFF;
      }
      var decBytes = new Uint8Array(dataBytes.length);
      for (var i = 0; i < dataBytes.length; i++) decBytes[i] = dataBytes[i] ^ key[i];
      if (decBytes.length < 4) return null;
      var jsonBytes = decBytes.slice(0, decBytes.length - 4);
      var hashBytes = decBytes.slice(decBytes.length - 4);
      var expected = _djb2Bytes(jsonBytes);
      if (_bytesToInt(hashBytes) !== expected) return null;
      return JSON.parse(_utf8Decode(_bytesToStr(jsonBytes)));
    }
    // v2: AES-GCM — 解密回原始字串（不再 JSON.parse）
    if (pack._v === 2 && pack.iv && this._useSubtle) {
      var enc = new TextEncoder();
      var salt = _b64ToBuf(pack.salt);
      var iv = _b64ToBuf(pack.iv);
      var data = _b64ToBuf(pack.data);
      var keyMaterial = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveKey']);
      var key = await crypto.subtle.deriveKey({name:'PBKDF2', salt:salt, iterations:100000, hash:'SHA-256'}, keyMaterial, {name:'AES-GCM', length:256}, false, ['decrypt']);
      var decrypted = await crypto.subtle.decrypt({name:'AES-GCM', iv:iv}, key, data);
      return new TextDecoder().decode(decrypted);
    }
    return null;
  },

  checkExists: async function(playerName) {
    if (!LeaderboardAPI.db) return false;
    try {
      var doc = await LeaderboardAPI.db.collection('saves').doc(playerName).get();
      return doc.exists;
    } catch(e) { return false; }
  },

  upload: async function(playerName, rawStr, password) {
    if (!LeaderboardAPI.db) return false;
    try {
      var pack = await this._encrypt(rawStr, password);
      var toStore = {
        playerName: playerName,
        salt: pack.salt,
        iv: pack.iv,
        data: pack.data,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      };
      if (pack._v) toStore._v = pack._v;
      await LeaderboardAPI.db.collection('saves').doc(playerName).set(toStore);
      return true;
    } catch(e) {
      console.warn('Cloud save upload failed:', e);
      return false;
    }
  },

  download: async function(playerName, password) {
    if (!LeaderboardAPI.db) return {ok:false};
    try {
      var doc = await LeaderboardAPI.db.collection('saves').doc(playerName).get();
      if (!doc.exists) return {ok:false, reason:'not_found'};
      var decrypted = await this._decrypt(doc.data(), password);
      if (!decrypted) return {ok:false, reason:'wrong_password'};
      return {ok:true, rawStr:decrypted};
    } catch(e) {
      return {ok:false, reason:'wrong_password'};
    }
  },

  deleteDoc: async function(playerName) {
    if (!LeaderboardAPI.db) return false;
    try {
      await LeaderboardAPI.db.collection('saves').doc(playerName).delete();
      return true;
    } catch(e) { return false; }
  }
};
