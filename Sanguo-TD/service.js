/* ===== 存檔、金幣、抽卡、碎片、上陣系統 ===== */
var STORAGE_KEY = 'sanguo_td_save';
var TIER_NAMES = ['', '良', '優', '名將', '傳說', '無雙'];
var TIER_COLORS = ['', '#8a8a8a', '#2ecc71', '#3498db', '#9b59b6', '#ffd700'];
var STAMINA_MAX = 120;
var STAMINA_COST = 5;
var STAMINA_RECOVER_MS = 600000; // 10 分鐘

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
  lastScoreUploadTime: 0
};

var Service = {
  appData: null,

  loadData: function() {
    var raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        var parsed = JSON.parse(raw);
        this.appData = this.mergeDefaults(parsed);
      } catch(e) {
        this.appData = this.clone(DEFAULT_DATA);
      }
    } else {
      this.appData = this.clone(DEFAULT_DATA);
    }
    return this.appData;
  },

  mergeDefaults: function(data) {
    var d = this.clone(DEFAULT_DATA);
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
    return d;
  },

  saveData: function() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.appData));
  },

  resetData: function() {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(STORAGE_KEY + '_devbackup');
    this.appData = this.clone(DEFAULT_DATA);
    this.saveData();
    if (UI) { UI.showMenu(); UI.renderCampaignList(); }
  },

  clone: function(obj) {
    return JSON.parse(JSON.stringify(obj));
  },

  addGold: function(amount) {
    this.appData.gold += amount;
    this.saveData();
  },

  spendGold: function(amount) {
    if (this.appData.gold < amount) return false;
    this.appData.gold -= amount;
    this.saveData();
    return true;
  },

  getStamina: function() {
    var now = Date.now();
    var elapsed = now - this.appData.staminaLastRecovery;
    var recover = Math.floor(elapsed / STAMINA_RECOVER_MS);
    if (recover > 0) {
      this.appData.stamina = Math.min(STAMINA_MAX, this.appData.stamina + recover);
      this.appData.staminaLastRecovery += recover * STAMINA_RECOVER_MS;
      this.saveData();
    }
    return this.appData.stamina;
  },

  spendStamina: function(amount) {
    this.getStamina();
    if (this.appData.stamina < amount) return false;
    this.appData.stamina -= amount;
    this.saveData();
    return true;
  },

  getSettings: function() {
    return this.appData.settings;
  },

  hasHero: function(heroId) {
    return this.appData.ownedHeroes.indexOf(heroId) !== -1;
  },

  addHero: function(heroId) {
    if (this.hasHero(heroId)) return false;
    this.appData.ownedHeroes.push(heroId);
    var hd = getHeroData(heroId);
    if (hd) {
      this.appData.heroTier[heroId] = hd.rarity;
      this.appData.heroFrags[heroId] = 0;
    }
    this.autoFillDeploy();
    this.saveData();
    return true;
  },

  getHeroTier: function(heroId) {
    if (this.appData.heroTier[heroId]) return this.appData.heroTier[heroId];
    var hd = getHeroData(heroId);
    return hd ? hd.rarity : 1;
  },

  getHeroFrags: function(heroId) {
    return this.appData.heroFrags[heroId] || 0;
  },

  getHeroStar: function(heroId) {
    return this.appData.heroStar[heroId] || 0;
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
    if (this.appData.ownedHeroes.length < HERO_DATA.length) return false;
    for (var i = 0; i < this.appData.ownedHeroes.length; i++) {
      var hid = this.appData.ownedHeroes[i];
      var hd = getHeroData(hid);
      if (!hd) continue;
      var tier = this.getHeroTier(hid);
      var star = this.getHeroStar(hid);
      if (getNextPromotion(hd.rarity, tier, star)) return false;
    }
    return true;
  },

  addFrag: function(heroId, count) {
    var f = this.appData.heroFrags;
    f[heroId] = (f[heroId] || 0) + count;
    var hd = getHeroData(heroId);
    if (!hd) return { upgraded: false, msg: '', tier: this.getHeroTier(heroId), star: this.getHeroStar(heroId) };
    var origin = hd.rarity;
    var tier = this.getHeroTier(heroId);
    var star = this.getHeroStar(heroId);
    var upgraded = false;
    var upgradeMsg = '';

    while (true) {
      var next = getNextPromotion(origin, tier, star);
      if (!next) {
        upgradeMsg = '已達最高軍階！';
        break;
      }
      if (f[heroId] >= next.cost) {
        f[heroId] -= next.cost;
        tier = next.toTier;
        star = next.toStar;
        this.appData.heroTier[heroId] = tier;
        this.appData.heroStar[heroId] = star;
        upgradeMsg = TIER_NAMES[tier] + (tier >= 4 && star > 0 ? '+' + star + '⭐' : '') + ' 晉升！';
        upgraded = true;
      } else {
        break;
      }
    }
    this.saveData();
    return { upgraded: upgraded, msg: upgradeMsg, tier: tier, star: star };
  },

  /* ===== Deploy System ===== */
  getDeployedHeroes: function() {
    var d = this.appData.deployedHeroes.filter(function(h) { return true; });
    var owned = this.appData.ownedHeroes.length;
    if (owned <= 6) {
      // auto-deploy all
      d = this.appData.ownedHeroes.slice();
    }
    return d;
  },

  autoFillDeploy: function() {
    var d = this.appData;
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
          existing.push(sorted[i]);
        }
      }
      d.deployedHeroes = existing;
    }
    if (d.deployedHeroes.length > 6) d.deployedHeroes = d.deployedHeroes.slice(0, 6);
    this.saveData();
  },

  toggleDeploy: function(heroId) {
    var d = this.appData;
    if (d.ownedHeroes.length <= 6) return;
    var idx = d.deployedHeroes.indexOf(heroId);
    if (idx !== -1) {
      d.deployedHeroes.splice(idx, 1);
    } else {
      if (d.deployedHeroes.length >= 6) return;
      d.deployedHeroes.push(heroId);
    }
    this.saveData();
  },

  clearDeploy: function() {
    var d = this.appData;
    if (d.ownedHeroes.length <= 6) return;
    d.deployedHeroes = [];
    this.saveData();
  },

  isDeployed: function(heroId) {
    if (this.appData.ownedHeroes.length <= 6) return true;
    return this.appData.deployedHeroes.indexOf(heroId) !== -1;
  },

  completeStage: function(stageId, difficulty) {
    difficulty = difficulty || 'normal';
    if (DEV_MODE) {
      for (var c = 0; c < CAMPAIGNS.length; c++) {
        for (var s = 0; s < CAMPAIGNS[c].stages.length; s++) {
          var sid = CAMPAIGNS[c].stages[s].id;
          if (this.appData.completedStages.indexOf(sid) === -1) {
            this.appData.completedStages.push(sid);
          }
        }
      }
      return;
    }
    if (difficulty === 'normal' && this.appData.completedStages.indexOf(stageId) === -1) {
      this.appData.completedStages.push(stageId);
    }
    if (difficulty === 'hard' && this.appData.completedHard.indexOf(stageId) === -1) {
      this.appData.completedHard.push(stageId);
    }
    if (difficulty === 'hell' && this.appData.completedHell.indexOf(stageId) === -1) {
      this.appData.completedHell.push(stageId);
    }
    this.saveData();
  },

  /* 特定難度是否通關 */
  isStageCompleted: function(stageId, difficulty) {
    difficulty = difficulty || 'normal';
    if (DEV_MODE) return true;
    if (difficulty === 'hard') return this.appData.completedHard.indexOf(stageId) !== -1;
    if (difficulty === 'hell') return this.appData.completedHell.indexOf(stageId) !== -1;
    return this.appData.completedStages.indexOf(stageId) !== -1;
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
        if (this.appData[check].indexOf(CAMPAIGNS[c].stages[s].id) === -1) return false;
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
    var rarity;
    if (roll < 0.01) rarity = 5;
    else if (roll < 0.06) rarity = 4;
    else if (roll < 0.20) rarity = 3;
    else if (roll < 0.50) rarity = 2;
    else rarity = 1;

    var candidates = HERO_DATA.filter(function(h) { return h.rarity === rarity; });
    if (candidates.length === 0) candidates = HERO_DATA.filter(function(h) { return h.rarity <= 2; });
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

  _weaponGachaPull: function() {
    var r = Math.random();
    var quality;
    if (r < 0.03) quality = 4;
    else if (r < 0.10) quality = 3;
    else if (r < 0.50) quality = 2;
    else quality = 1;

    var types = ['sword','spear','bow','horse','mage','monk'];
    var type = types[Math.floor(Math.random() * types.length)];
    var stats = this._generateWeaponStats(quality);
    return { quality: quality, type: type, atkPct: stats.atkPct, hpPct: stats.hpPct, spd: stats.spd };
  },

  doWeaponGacha: function() {
    if (!DEV_MODE && !this.spendGold(100)) return null;
    var w = this._weaponGachaPull();
    this.appData.weaponStorage.push(w);
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
      this.appData.weaponStorage.push(results[j]);
    }
    this.saveData();
    return results;
  },

  /* ===== 武器系統 ===== */
  getWeapon: function(heroId) {
    return this.appData.weapons[heroId] || null;
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
    var stats = this._generateWeaponStats(quality);
    return { quality: quality, type: type, atkPct: stats.atkPct, hpPct: stats.hpPct, spd: stats.spd };
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

  generateWeaponByQuality: function(quality) {
    var types = ['sword','spear','bow','horse','mage','monk'];
    var type = types[Math.floor(Math.random() * types.length)];
    var stats = this._generateWeaponStats(quality);
    return { quality: quality, type: type, atkPct: stats.atkPct, hpPct: stats.hpPct, spd: stats.spd };
  },

  equipWeapon: function(heroId, weaponData) {
    this.appData.weapons[heroId] = weaponData;
    this.saveData();
  },

  unequipWeapon: function(heroId) {
    delete this.appData.weapons[heroId];
    this.saveData();
  },

  unequipToStorage: function(heroId) {
    var w = this.appData.weapons[heroId];
    if (!w) return false;
    delete this.appData.weapons[heroId];
    this.appData.weaponStorage.push(w);
    this.saveData();
    return true;
  },

  transferWeapon: function(fromHeroId, toHeroId) {
    var w = this.appData.weapons[fromHeroId];
    if (!w) return false;
    delete this.appData.weapons[fromHeroId];
    this.appData.weapons[toHeroId] = w;
    this.saveData();
    return true;
  },

  recycleWeapon: function(heroId) {
    var w = this.appData.weapons[heroId];
    if (!w) return 0;
    var gold = WEAPON_QUALITY[w.quality] ? WEAPON_QUALITY[w.quality].recycleGold : 0;
    delete this.appData.weapons[heroId];
    this.appData.gold += gold;
    this.saveData();
    return gold;
  },

  equipStoredWeapon: function(storageIndex, heroId) {
    var stored = this.appData.weaponStorage[storageIndex];
    if (!stored) return false;
    var hero = getHeroData(heroId);
    if (!hero) return false;
    this.appData.weaponStorage.splice(storageIndex, 1);
    if (this.appData.weapons[heroId]) {
      this.appData.weaponStorage.push(this.appData.weapons[heroId]);
    }
    this.appData.weapons[heroId] = stored;
    this.saveData();
    return true;
  },

  recycleStoredWeapon: function(storageIndex) {
    var stored = this.appData.weaponStorage[storageIndex];
    if (!stored) return 0;
    var gold = WEAPON_QUALITY[stored.quality] ? WEAPON_QUALITY[stored.quality].recycleGold : 0;
    this.appData.weaponStorage.splice(storageIndex, 1);
    this.appData.gold += gold;
    this.saveData();
    return gold;
  },

  unequipAllToStorage: function() {
    if (!this.appData.weaponStorage) this.appData.weaponStorage = [];
    for (var i = 0; i < this.appData.ownedHeroes.length; i++) {
      var hid = this.appData.ownedHeroes[i];
      if (this.appData.weapons[hid]) {
        this.appData.weaponStorage.push(this.appData.weapons[hid]);
        delete this.appData.weapons[hid];
      }
    }
    this.saveData();
  },

  autoEquipBest: function() {
    if (!this.appData.weaponStorage) this.appData.weaponStorage = [];
    for (var i = 0; i < this.appData.ownedHeroes.length; i++) {
      var hid = this.appData.ownedHeroes[i];
      if (this.appData.weapons[hid]) {
        this.appData.weaponStorage.push(this.appData.weapons[hid]);
        delete this.appData.weapons[hid];
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
      for (var k = 0; k < this.appData.weaponStorage.length; k++) {
        var w = this.appData.weaponStorage[k];
        if (w.type !== wType) continue;
        var cp = (w.atkPct || 0) + (w.hpPct || 0) / 2 + (w.spd || 0) * 100;
        if (cp > bestCp) { bestIdx = k; bestCp = cp; }
      }
      if (bestIdx >= 0) {
        this.appData.weapons[hid2] = this.appData.weaponStorage.splice(bestIdx, 1)[0];
      }
    }
    this.saveData();
  },

  getHeroWeaponType: function(hd) {
    var map = { warrior:'sword', spearman:'spear', archer:'bow', horse:'horse', mage:'mage', healer:'monk' };
    return map[hd.type] || 'sword';
  }
};
