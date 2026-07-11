/* ===== 核心遊戲引擎 ===== */
var Game = {
  state: 'menu',
  stage: null,
  mapLayout: null,
  grid: [],
  units: [],
  enemies: [],
  battlePhase: 'prep',
  selectedUnit: null,
  gameEnded: false,
  paused: false,
  autoWaveTimer: 6,
  wavePool: [],
  waitingUnits: [],
  recruitCount: 0,
  recruitCost: 10,
  maxLives: 3,
  difficulty: 'normal',

  getStage: function(stageId) {
    return getStageData(stageId);
  },

  initStage: function(stageId) {
    var s = this.getStage(stageId);
    if (!s) return;
    this.stage = s;
    this.mapLayout = MAP_LAYOUTS[s.map];
    this.units = [];
    this.enemies = [];
    this.food = 10;
    this.lives = this.maxLives;
    this.waveIndex = 0;
    this.spawnedCount = 0;
    this.currentWaveEnemies = [];
    this.waveActive = false;
    this.spawnTimer = 0;
    this.spawnInterval = 0.8;
    this.waveDelay = 0;
    this.battlePhase = 'fighting';
    this.selectedUnit = null;
    this.gameEnded = false;
    this.paused = false;
    this.speed = 1;
    this.autoWaveTimer = 10;
    this.wavePool = [];
    this.waitingUnits = [];
    this.recruitCount = 0;
    this.recruitCost = 10;

    this.buildGrid();
    this.generateWavePool();
    UI.renderBattle();
    UI.updateHUD();
  },

  buildGrid: function() {
    var ml = this.mapLayout;
    this.grid = [];
    var pathSet = {};
    for (var i = 0; i < ml.path.length; i++) {
      var p = ml.path[i];
      pathSet[p.col + ',' + p.row] = true;
    }
    var buildable = getBuildableCells(ml);
    var buildSet = {};
    for (var b = 0; b < buildable.length; b++) {
      buildSet[buildable[b].col + ',' + buildable[b].row] = true;
    }
    var preDugSet = {};
    if (ml.preDug) {
      for (var p = 0; p < ml.preDug.length; p++) {
        preDugSet[ml.preDug[p].col + ',' + ml.preDug[p].row] = true;
      }
    }
    for (var r = 0; r < ml.rows; r++) {
      this.grid[r] = [];
      for (var c = 0; c < ml.cols; c++) {
        var key = c + ',' + r;
        var isB = !!buildSet[key];
        this.grid[r][c] = {
          col: c, row: r,
          isPath: !!pathSet[key],
          isBuildable: isB,
          isDug: isB && !!preDugSet[key],
          occupied: false,
          unit: null
        };
      }
    }
  },

  isValidPlacement: function(col, row) {
    if (row < 0 || row >= this.grid.length || col < 0 || col >= this.grid[0].length) return false;
    return this.grid[row][col].isBuildable && !this.grid[row][col].occupied && this.grid[row][col].isDug;
  },

  placeUnit: function(heroId, col, row) {
    if (!this.isValidPlacement(col, row)) return false;
    var heroData = getHeroData(heroId);
    if (!heroData) return false;
    var tier = Service.getHeroTier(heroId);
    var star = Service.getHeroStar(heroId);
    var unit = new Unit(heroData, col, row, tier, star);
    unit.applyWeaponStats();
    this.units.push(unit);
    this.grid[row][col].occupied = true;
    this.grid[row][col].unit = unit;
    UI.renderBattle();
    return true;
  },

  placeSoldier: function(type, col, row) {
    if (!this.isValidPlacement(col, row)) return false;
    var st = SOLDIER_TYPES[type];
    if (!st) return false;
    var soldier = new SoldierUnit(type, 1, col, row);
    this.units.push(soldier);
    this.grid[row][col].occupied = true;
    this.grid[row][col].unit = soldier;
    UI.renderBattle();
    return true;
  },

  isDeployed: function(heroId) {
    for (var i = 0; i < this.units.length; i++) {
      if (!this.units[i].isSoldier && this.units[i].heroId === heroId) return true;
    }
    return false;
  },

  recalcAllSynergies: function() {
    for (var i = 0; i < this.units.length; i++) {
      var u = this.units[i];
      if (!u.isSoldier) {
        if (u._synAtkPct) u.atk = Math.round(u.atk / (1 + u._synAtkPct / 100));
        if (u._synHpPct) {
          u.maxHp = Math.round(u.maxHp / (1 + u._synHpPct / 100));
          u.hp = Math.min(u.hp, u.maxHp);
        }
        u.applySynergyBonuses();
      }
    }
  },

  removeUnit: function(unit) {
    var idx = this.units.indexOf(unit);
    if (idx === -1) return;
    this.units.splice(idx, 1);
    if (unit.row !== undefined && unit.col !== undefined) {
      if (this.grid[unit.row] && this.grid[unit.row][unit.col]) {
        this.grid[unit.row][unit.col].occupied = false;
        this.grid[unit.row][unit.col].unit = null;
      }
    }
  },

  retreatToWaiting: function(unit, swapIdx) {
    if (swapIdx === undefined && this.waitingUnits.length >= 6) return false;
    var col = unit.col;
    var row = unit.row;
    this.removeUnit(unit);
    var wu = unit.isSoldier
      ? {type:unit.soldierType, soldierType:unit.soldierType, level:unit.level, emoji:unit.emoji, name:unit.soldierName}
      : {type:'hero', heroId:unit.heroId, emoji:unit.emoji, name:unit.name, level:unit.battleLevel || 1};
    wu.hp = unit.hp;
    wu.maxHp = unit.maxHp;
    if (swapIdx !== undefined && swapIdx >= 0 && swapIdx < this.waitingUnits.length) {
      var swapped = this.waitingUnits[swapIdx];
      this.waitingUnits.splice(swapIdx, 1);
      this.waitingUnits.push(wu);
      /* 將被換下的等待卡放到格子 */
      if (this.grid[row] && this.grid[row][col] && !this.grid[row][col].occupied) {
        if (swapped.soldierType && SOLDIER_TYPES[swapped.soldierType]) {
          var s = new SoldierUnit(swapped.soldierType, swapped.level || 1, col, row);
          if (swapped.hp != null) s.hp = Math.min(swapped.hp, s.maxHp);
          this.units.push(s);
          this.grid[row][col].unit = s;
          this.grid[row][col].occupied = true;
        } else if (swapped.type === 'hero' && swapped.heroId) {
          var hd = getHeroData(swapped.heroId);
          if (hd) {
            var baseTier = Service.getHeroTier(swapped.heroId);
            var star = Service.getHeroStar(swapped.heroId);
            var h = new Unit(hd, col, row, baseTier, star);
            h.battleLevel = swapped.level || 1;
            h.level = h.battleLevel;
            h.applyTierStats(hd, h.battleLevel);
            h.applyWeaponStats();
            if (swapped.hp != null) h.hp = Math.min(swapped.hp, h.maxHp);
            this.units.push(h);
            this.grid[row][col].unit = h;
            this.grid[row][col].occupied = true;
          }
        }
      }
    } else {
      this.waitingUnits.push(wu);
    }
    this.recalcAllSynergies();
    UI.renderBattle();
    return true;
  },

  digCell: function(col, row) {
    var cell = this.grid[row] && this.grid[row][col];
    if (!cell || !cell.isBuildable || cell.isDug || cell.isPath) return false;
    cell.isDug = true;
    return true;
  },

  batchRecruit: function() {
    var cost = this.recruitCost;
    if (!DEV_MODE && this.food < cost) return null;

    var heroChance = 0.1;

    var heroPool = [];
    var soldierPool = [];
    for (var i = 0; i < this.wavePool.length; i++) {
      var w = this.wavePool[i];
      if (w.type === 'hero') {
        heroPool.push({type:'hero', heroId:w.heroId, emoji:w.emoji, name:w.name});
      } else {
        soldierPool.push({type:w.type, soldierType:w.type, level:w.level, emoji: SOLDIER_TYPES[w.type] ? SOLDIER_TYPES[w.type].emoji : '🗡️', name: SOLDIER_TYPES[w.type] ? SOLDIER_TYPES[w.type].name : w.type});
      }
    }

    var hasLocked = false;
    for (var r = 0; r < this.grid.length && !hasLocked; r++) {
      for (var c = 0; c < this.grid[r].length && !hasLocked; c++) {
        if (this.grid[r][c].isBuildable && !this.grid[r][c].isDug) hasLocked = true;
      }
    }
    if (heroPool.length === 0 && soldierPool.length === 0 && !hasLocked) return null;

    this.waitingUnits = [];

    /* shuffle heroPool/soldierPool 後依序輪取，避免重複 */
    function shuffle(arr) {
      for (var z = arr.length - 1; z > 0; z--) {
        var zj = Math.floor(Math.random() * (z + 1));
        var ztmp = arr[z]; arr[z] = arr[zj]; arr[zj] = ztmp;
      }
      return arr;
    }
    shuffle(heroPool);
    shuffle(soldierPool);

    var guaranteedHeroes = heroPool.length > 0 ? (this.difficulty === 'hell' ? 3 : (this.difficulty === 'hard' ? 2 : 1)) : 0;
    var gIdx = 0, hIdx = 0, sIdx = 0;
    var shovelUsed = false;
    for (var k = 0; k < 6; k++) {
      if (guaranteedHeroes > 0 && gIdx < heroPool.length) {
        var gh = heroPool[gIdx++];
        this.waitingUnits.push({type:'hero', heroId:gh.heroId, emoji:gh.emoji, name:gh.name, level:1});
        guaranteedHeroes--;
      } else if (hasLocked && !shovelUsed && Math.random() < 0.3) {
        this.waitingUnits.push({type:'shovel', emoji:'🔧', name:'鏟子'});
        shovelUsed = true;
      } else if (Math.random() < heroChance && hIdx < heroPool.length) {
        var h = heroPool[hIdx++];
        this.waitingUnits.push({type:'hero', heroId:h.heroId, emoji:h.emoji, name:h.name, level:1});
      } else if (sIdx < soldierPool.length) {
        var s = soldierPool[sIdx++];
        this.waitingUnits.push({type:s.type, soldierType:s.soldierType, level:s.level, emoji:s.emoji, name:s.name});
      } else if (hIdx < heroPool.length) {
        var h2 = heroPool[hIdx++];
        this.waitingUnits.push({type:'hero', heroId:h2.heroId, emoji:h2.emoji, name:h2.name, level:1});
      } else {
        break;
      }
    }

    if (!DEV_MODE) this.food -= cost;
    this.recruitCount++;
    this.recruitCost = 10 + this.recruitCount * 2;
    return this.waitingUnits.length;
  },

  deployFromWaiting: function(waitingUnit, col, row) {
    if (waitingUnit.type === 'shovel') {
      var cell = this.grid[row] && this.grid[row][col];
      if (!cell || !cell.isBuildable || cell.isDug || cell.isPath) return false;
      cell.isDug = true;
      var idx = this.waitingUnits.indexOf(waitingUnit);
      if (idx !== -1) this.waitingUnits.splice(idx, 1);
      return true;
    }
    var cell = this.grid[row] && this.grid[row][col];
    if (!cell) return false;

    /* 從待位欄直接拖到已佔格 → 合成 */
    if (cell.occupied && cell.unit) {
      var tgt = cell.unit;
      if (waitingUnit.soldierType && tgt.isSoldier &&
          waitingUnit.soldierType === tgt.soldierType &&
          waitingUnit.level === tgt.level && tgt.level < 5) {
        tgt.level++;
        tgt.battleLevel = tgt.level;
        tgt.upgradeStats();
        var idx = this.waitingUnits.indexOf(waitingUnit);
        if (idx !== -1) this.waitingUnits.splice(idx, 1);
        UI.renderBattle();
        return true;
      }
      if (waitingUnit.type === 'hero' && !tgt.isSoldier &&
          waitingUnit.heroId === tgt.heroId && tgt.battleLevel < 5) {
        tgt.battleLevel++;
        tgt.level = tgt.battleLevel;
        var hd = getHeroData(tgt.heroId);
        if (hd) tgt.applyTierStats(hd, tgt.battleLevel);
        tgt.applyWeaponStats();
        tgt.applySynergyBonuses();
        var idx = this.waitingUnits.indexOf(waitingUnit);
        if (idx !== -1) this.waitingUnits.splice(idx, 1);
        UI.renderBattle();
        return true;
      }
      /* 不能合成 → 互換位置 */
      var wIdx = this.waitingUnits.indexOf(waitingUnit);
      if (wIdx === -1) return false;
      this.removeUnit(tgt);
      this.waitingUnits[wIdx] = tgt;
      if (waitingUnit.soldierType && SOLDIER_TYPES[waitingUnit.soldierType]) {
        var st = SOLDIER_TYPES[waitingUnit.soldierType];
        var soldierLv = waitingUnit.level || 1;
        var soldier = new SoldierUnit(waitingUnit.soldierType, soldierLv, col, row);
        if (waitingUnit.hp != null) soldier.hp = Math.min(waitingUnit.hp, soldier.maxHp);
        this.units.push(soldier);
        this.grid[row][col].unit = soldier;
      } else {
        var hd2 = getHeroData(waitingUnit.heroId);
        if (!hd2) return false;
        var baseTier = Service.getHeroTier(waitingUnit.heroId);
        var star = Service.getHeroStar(waitingUnit.heroId);
        var unit = new Unit(hd2, col, row, baseTier, star);
        unit.battleLevel = waitingUnit.level || 1;
        unit.level = unit.battleLevel;
        unit.applyTierStats(hd2, unit.battleLevel);
        unit.applyWeaponStats();
        if (waitingUnit.hp != null) unit.hp = Math.min(waitingUnit.hp, unit.maxHp);
        this.units.push(unit);
        this.grid[row][col].unit = unit;
      }
      this.grid[row][col].occupied = true;
      this.recalcAllSynergies();
      return true;
    }

    /* 正常放置 */
    if (!this.isValidPlacement(col, row)) return false;
    if (waitingUnit.soldierType && SOLDIER_TYPES[waitingUnit.soldierType]) {
      var st = SOLDIER_TYPES[waitingUnit.soldierType];
      var soldierLv = waitingUnit.level || 1;
      var soldier = new SoldierUnit(waitingUnit.soldierType, soldierLv, col, row);
      if (waitingUnit.hp != null) soldier.hp = Math.min(waitingUnit.hp, soldier.maxHp);
      this.units.push(soldier);
      this.grid[row][col].occupied = true;
      this.grid[row][col].unit = soldier;
    } else {
      var hd = getHeroData(waitingUnit.heroId);
      if (!hd) return false;
      var tier = Service.getHeroTier(waitingUnit.heroId);
      var star = Service.getHeroStar(waitingUnit.heroId);
      var unit = new Unit(hd, col, row, tier, star);
      unit.battleLevel = waitingUnit.level || 1;
      unit.level = unit.battleLevel;
      unit.applyTierStats(hd, unit.battleLevel);
      unit.applyWeaponStats();
      if (waitingUnit.hp != null) unit.hp = Math.min(waitingUnit.hp, unit.maxHp);
      this.units.push(unit);
      this.grid[row][col].occupied = true;
      this.grid[row][col].unit = unit;
    }
    var idx = this.waitingUnits.indexOf(waitingUnit);
    if (idx !== -1) this.waitingUnits.splice(idx, 1);
    this.recalcAllSynergies();
    return true;
  },

  deployFromWaitingIndex: function(idx, col, row) {
    if (idx < 0 || idx >= this.waitingUnits.length) return false;
    return this.deployFromWaiting(this.waitingUnits[idx], col, row);
  },

  moveUnit: function(unit, toCol, toRow) {
    var fromCol = unit.col, fromRow = unit.row;
    if (fromCol === toCol && fromRow === toRow) return false;
    var target = this.grid[toRow] && this.grid[toRow][toCol];
    if (!target || !target.isBuildable || !target.isDug) return false;
    if (target.occupied) {
      var targetUnit = target.unit;
      // soldier soldier merge
      if (unit.isSoldier && targetUnit.isSoldier &&
          unit.soldierType === targetUnit.soldierType &&
          unit.level === targetUnit.level && unit.level < 5) {
        this.removeUnit(unit);
        targetUnit.level++;
        targetUnit.battleLevel = targetUnit.level;
        targetUnit.upgradeStats();
        UI.renderBattle();
        return true;
      }
      // hero hero merge
      if (!unit.isSoldier && !targetUnit.isSoldier &&
          unit.heroId === targetUnit.heroId &&
          unit.battleLevel === targetUnit.battleLevel && unit.battleLevel < 5) {
        this.removeUnit(unit);
        targetUnit.battleLevel++;
        targetUnit.level = targetUnit.battleLevel;
        var hd = getHeroData(targetUnit.heroId);
        if (hd) targetUnit.applyTierStats(hd, targetUnit.battleLevel);
        targetUnit.applyWeaponStats();
        targetUnit.applySynergyBonuses();
        UI.renderBattle();
        return true;
      }
      // swap
      this.grid[fromRow][fromCol].occupied = true;
      this.grid[fromRow][fromCol].unit = targetUnit;
      targetUnit.col = fromCol;
      targetUnit.row = fromRow;
      this.grid[toRow][toCol].occupied = true;
      this.grid[toRow][toCol].unit = unit;
      unit.col = toCol;
      unit.row = toRow;
      UI.renderBattle();
      return true;
    }
    this.grid[fromRow][fromCol].occupied = false;
    this.grid[fromRow][fromCol].unit = null;
    unit.col = toCol;
    unit.row = toRow;
    this.grid[toRow][toCol].occupied = true;
    this.grid[toRow][toCol].unit = unit;
    return true;
  },

  generateWavePool: function() {
    this.wavePool = [];
    var deployed = Service.getDeployedHeroes();
    var ratios = [0.9, 0.86, 0.82, 0.78, 0.74, 0.7];
    var campIdx = 0;
    for (var ci = 0; ci < CAMPAIGNS.length; ci++) {
      for (var si = 0; si < CAMPAIGNS[ci].stages.length; si++) {
        if (CAMPAIGNS[ci].stages[si].id === this.stage.id) campIdx = ci;
      }
    }
    if (campIdx >= ratios.length) campIdx = ratios.length - 1;
    var soldierRate = ratios[campIdx];
    var guaranteedHeroes = deployed.length > 0 ? (this.difficulty === 'hell' ? 3 : (this.difficulty === 'hard' ? 2 : 1)) : 0;
    var heroInserted = {};
    var heroCount = 0;
    for (var i = 0; i < 6; i++) {
      if (heroCount < guaranteedHeroes && deployed.length > 0) {
        var hid = deployed[Math.floor(Math.random() * deployed.length)];
        var hd = getHeroData(hid);
        if (hd && !heroInserted[hid]) {
          this.wavePool.push({ type:'hero', heroId:hid, emoji:hd.emoji, name:hd.name });
          heroInserted[hid] = true;
          heroCount++;
          continue;
        } else {
          /* 已插入過，找沒插入過的 */
          var unused = [];
          for (var d = 0; d < deployed.length; d++) {
            if (!heroInserted[deployed[d]]) unused.push(deployed[d]);
          }
          if (unused.length > 0) {
            var hud = unused[Math.floor(Math.random() * unused.length)];
            var hdu = getHeroData(hud);
            if (hdu) {
              this.wavePool.push({ type:'hero', heroId:hud, emoji:hdu.emoji, name:hdu.name });
              heroInserted[hud] = true;
              heroCount++;
              continue;
            }
          }
        }
      }
      if (deployed.length > 0 && Math.random() >= soldierRate && heroCount < 6) {
        var hid2 = deployed[Math.floor(Math.random() * deployed.length)];
        var hd2 = getHeroData(hid2);
        if (hd2 && !heroInserted[hid2]) {
          this.wavePool.push({ type:'hero', heroId:hid2, emoji:hd2.emoji, name:hd2.name });
          heroInserted[hid2] = true;
          heroCount++;
          continue;
        }
      }
      var t = SOLDIER_KEYS[Math.floor(Math.random() * SOLDIER_KEYS.length)];
      this.wavePool.push({ type: t, level: 1 });
    }
  },

  startAutoWave: function() {
    if (this.gameEnded) return;
    this.autoWaveTimer = 3;
    this.waveIndex++;
    UI.updateHUD();
    this.generateWavePool();
    this.startNextWave();
  },

  startNextWave: function() {
    if (this.waveIndex > this.stage.waves.length) {
      this.battlePhase = 'won';
      this.onVictory();
      return;
    }
    var waveIdx = Math.min(this.waveIndex - 1, this.stage.waves.length - 1);
    var wave = this.stage.waves[waveIdx];
    this.currentWaveEnemies = [];
    this.waveActive = true;
    this.spawnedCount = 0;
    this.waveDelay = wave.delay || 2;
    this.spawnTimer = 0;

    var difficultyMult = this.difficulty === 'hell' ? 2 : (this.difficulty === 'hard' ? 1.2 : 1);
    for (var i = 0; i < wave.enemies.length; i++) {
      var ew = wave.enemies[i];
      var adjusted = Math.round(ew.count * difficultyMult);
      if (adjusted < 1) adjusted = 1;
      for (var j = 0; j < adjusted; j++) {
        this.currentWaveEnemies.push(ew.type);
      }
    }
    UI.updateHUD();
    UI.renderBarUnits();
    UI.renderWaitingArea();
  },

  update: function(dt) {
    if (this.battlePhase !== 'fighting' || this.gameEnded) return;

    this.autoWaveTimer -= dt;
    if (this.autoWaveTimer <= 0 && !this.waveActive) {
      this.startAutoWave();
    }

    if (this.waveActive) {
      this.waveDelay -= dt;
      if (this.waveDelay <= 0) {
        this.spawnTimer -= dt;
        if (this.spawnTimer <= 0 && this.spawnedCount < this.currentWaveEnemies.length) {
          var etype = this.currentWaveEnemies[this.spawnedCount];
          this.spawnedCount++;
          UI.renderBarUnits();
          var enemyData = getEnemyData(etype);
          if (enemyData) {
            var mult = getEnemyMult(this.stage.id, this.difficulty);
            var scaledData = {};
            for (var key in enemyData) scaledData[key] = enemyData[key];
            scaledData.hp = Math.round(enemyData.hp * mult.hp);
            scaledData.atk = Math.round(enemyData.atk * mult.atk);
            scaledData.def = Math.round((enemyData.def || 0) * mult.hp);
            var startPos = this.mapLayout.path[0];
            var enemy = new Enemy(scaledData, startPos.col, startPos.row);
            this.enemies.push(enemy);
          }
          this.spawnTimer = this.spawnInterval;
        }
        if (!this.waveActive) return;
        if (this.spawnedCount >= this.currentWaveEnemies.length && this.enemies.length === 0) {
          this.waveActive = false;
          var waveMin = [12, 14, 16, 18, 20];
          var minFood = (this.waveIndex <= waveMin.length) ? waveMin[this.waveIndex - 1] : 20;
          if (this.waveIndex >= 1 && this.food < minFood) this.food = minFood;
          UI.updateHUD();
          this.autoWaveTimer = 3;
        }
      }
    }

    for (var i = this.enemies.length - 1; i >= 0; i--) {
      var e = this.enemies[i];
      e.update(dt);
      if (e.dead) {
        this.enemies.splice(i, 1);
        if (e.hp <= 0) {
          var isBoss = e.data && e.data.id && e.data.id.indexOf('boss_') === 0;
          var waveMult = this.waveIndex === 1 ? 2 : 1;
          var gained = (isBoss ? 2 : 1) * waveMult;
          this.food += gained;
          UI.showDmgNum(e.pixelX, e.pixelY, '+' + gained + '🍖', '#ffd700');
          UI.updateHUD();
        }
      }
    }

    for (var u = 0; u < this.units.length; u++) {
      this.units[u].update(dt);
    }

    if (this.lives <= 0) {
      this.battlePhase = 'lost';
      this.onDefeat();
    }
  },

  onVictory: function() {
    if (this.gameEnded) return;
    this.gameEnded = true;
    this.paused = false;
    var overlay = document.getElementById('pause-overlay');
    if (overlay) overlay.style.display = 'none';
    var s = this.stage;
    var firstClear = !Service.isStageCompleted(s.id, this.difficulty);
    var stageIdx = getStageIndex(s.id);
    var gold = getStageGold(stageIdx, this.difficulty, firstClear);
    Service.addGold(gold);
    if (firstClear) Service.completeStage(s.id, this.difficulty);
    var weapon = firstClear ? Service.generateWeapon(s.id, true, this.difficulty) : Service.generateWeapon(s.id, false, this.difficulty);
    var extraWeapons = [];
    if (weapon) {
      Service.appData.weaponStorage.push(weapon);
    }
    if (firstClear) {
      var types = ['sword','spear','bow','horse','mage','monk'];
      var rType = types[Math.floor(Math.random() * types.length)];
      var whiteWpn = { quality:1, type:rType, atkPct:+(15+Math.random()*35).toFixed(1), hpPct:0, spd:0 };
      Service.appData.weaponStorage.push(whiteWpn);
      extraWeapons.push(whiteWpn);
      if (stageIdx % 3 === 2) {
        if (this.difficulty === 'hard') {
          var rType2 = types[Math.floor(Math.random() * types.length)];
          var blueWpn = { quality:2, type:rType2, atkPct:+(18+Math.random()*27).toFixed(1), hpPct:+(15+Math.random()*20).toFixed(1), spd:0 };
          Service.appData.weaponStorage.push(blueWpn);
          extraWeapons.push(blueWpn);
        } else if (this.difficulty === 'hell') {
          var rType2 = types[Math.floor(Math.random() * types.length)];
          var purpWpn = { quality:3, type:rType2, atkPct:+(25+Math.random()*35).toFixed(1), hpPct:+(20+Math.random()*30).toFixed(1), spd:+(0.2+Math.random()*0.3).toFixed(1) };
          Service.appData.weaponStorage.push(purpWpn);
          extraWeapons.push(purpWpn);
        }
      }
      if (s.id === 'hell') {
        if (this.difficulty === 'normal') {
          var rTypeH = types[Math.floor(Math.random() * types.length)];
          var hellBlue = { quality:2, type:rTypeH, atkPct:+(18+Math.random()*27).toFixed(1), hpPct:+(15+Math.random()*20).toFixed(1), spd:0 };
          Service.appData.weaponStorage.push(hellBlue);
          extraWeapons.push(hellBlue);
        } else if (this.difficulty === 'hard') {
          var rTypeH2 = types[Math.floor(Math.random() * types.length)];
          var hellPurp = { quality:3, type:rTypeH2, atkPct:+(25+Math.random()*35).toFixed(1), hpPct:+(20+Math.random()*30).toFixed(1), spd:+(0.2+Math.random()*0.3).toFixed(1) };
          Service.appData.weaponStorage.push(hellPurp);
          extraWeapons.push(hellPurp);
        } else {
          var rTypeH3 = types[Math.floor(Math.random() * types.length)];
          var hellGold = { quality:4, type:rTypeH3, atkPct:+(30+Math.random()*40).toFixed(1), hpPct:+(30+Math.random()*40).toFixed(1), spd:+(0.3+Math.random()*0.6).toFixed(1) };
          Service.appData.weaponStorage.push(hellGold);
          extraWeapons.push(hellGold);
        }
      }
      Service.saveData();
    }
    UI.showResult(true, gold, weapon, extraWeapons);
  },

  onDefeat: function() {
    if (this.gameEnded) return;
    this.gameEnded = true;
    this.paused = false;
    var overlay = document.getElementById('pause-overlay');
    if (overlay) overlay.style.display = 'none';
    Service.addGold(5);
    UI.showResult(false, 5, null);
  },

  start: function() {
    var self = this;
    this.lastTime = performance.now();
    this.speed = 1;
    function loop(now) {
      var dt = Math.min((now - self.lastTime) / 1000, 0.05) * self.speed;
      self.lastTime = now;
      if (!self.paused) self.update(dt);
      UI.renderEnemies();
      UI.renderUnits();
      self.animFrame = requestAnimationFrame(loop);
    }
    this.animFrame = requestAnimationFrame(loop);
  },

  stop: function() {
    if (this.animFrame) {
      cancelAnimationFrame(this.animFrame);
      this.animFrame = null;
    }
  },

  togglePause: function() {
    if (this.gameEnded || this.battlePhase !== 'fighting') return;
    this.paused = !this.paused;
    var overlay = document.getElementById('pause-overlay');
    if (overlay) overlay.style.display = this.paused ? 'flex' : 'none';
    var btn = document.getElementById('btn-pause');
    if (btn) btn.textContent = this.paused ? '▶' : '⏸';
    if (!this.paused) this.lastTime = performance.now();
  },

  setSpeed: function(s) {
    this.speed = s;
    this.lastTime = performance.now();
    var btns = document.querySelectorAll('.speed-btn');
    for (var i = 0; i < btns.length; i++) {
      btns[i].classList.toggle('active', parseInt(btns[i].dataset.speed) === s);
    }
  }
};
