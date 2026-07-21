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
  waitingUnits: [],
  recruitCount: 0,
  recruitCost: 10,
  maxLives: 3,
  difficulty: 'normal',
  gameMode: 'campaign',
  challengeWave: 0,
  challengeGold: 0,
  bossRushIndex: 0,
  bossRushKills: 0,
  bossRushUnits: [],
  bossRushMap: null,

  getStage: function(stageId) {
    return getStageData(stageId);
  },

  initStage: function(stageId, mode) {
    this.gameMode = mode || 'campaign';
    if (this.gameMode === 'challenge') {
      this.challengeWave = 0;
      this.challengeGold = 0;
    }
    if (this.gameMode === 'bossrush') {
      // bossrush 由 initBossRushStage 處理
      return;
    }
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
    this.waitingUnits = [];
    this.recruitCount = 0;
    this.recruitCost = 10;
    this.buildGrid();
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

  generateChallengeWave: function(waveNum) {
    var enemies = [];
    var baseCount = 3 + Math.floor(waveNum * 0.5);
    var isBoss = (waveNum % CHALLENGE_CONFIG.bossInterval === 0);
    if (isBoss) {
      var bossPool = ['boss_dongzhuo', 'boss_caocao', 'boss_sunquan', 'boss_lubu'];
      var bossId = bossPool[Math.floor(Math.random() * bossPool.length)];
      enemies.push({ type: bossId, count: 1 });
      for (var i = 0; i < Math.floor(baseCount / 2); i++) {
        enemies.push({ type: 'wei_soldier', count: 1 });
      }
    } else {
      var typeMap = ['wei_soldier', 'wu_soldier', 'wei_archer', 'dong_cavalry', 'wei_general'];
      for (var i = 0; i < baseCount; i++) {
        enemies.push({ type: typeMap[Math.floor(Math.random() * typeMap.length)], count: 1 });
      }
    }
    return { enemies: enemies, delay: 2 };
  },

  initBossRushStage: function(bossIndex) {
    if (bossIndex >= BOSS_RUSH_ORDER.length) {
      this.battlePhase = 'won';
      this.onVictory();
      return;
    }
    this.bossRushIndex = bossIndex;
    var boss = BOSS_RUSH_ORDER[bossIndex];
    var layoutKey = getRandomMapLayout();
    this.stage = {
      id: 'bossrush_' + bossIndex,
      name: 'Boss Rush ' + (bossIndex + 1),
      map: layoutKey,
      waves: [{ enemies: [{ type: boss.heroId, count: 1 }], delay: 2 }]
    };
    this.mapLayout = MAP_LAYOUTS[layoutKey];
    this.units = [];
    this.enemies = [];
    this.food = 10;
    this.lives = 1;
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
    this.waitingUnits = [];
    this.recruitCount = 0;
    this.recruitCost = CHALLENGE_CONFIG.recruitCostBase;
    this.buildGrid();
    UI.renderBattle();
    UI.updateHUD();
  },

  startBossRushWave: function() {
    var boss = BOSS_RUSH_ORDER[this.bossRushIndex];
    if (!boss) return;
    this.waveIndex = 1;
    this.currentWaveEnemies = [boss.heroId];
    this.waveActive = true;
    this.spawnedCount = 0;
    this.waveDelay = 2;
    this.spawnTimer = 0;
    UI.updateHUD();
    UI.renderBarUnits();
    UI.renderWaitingArea();
  },

  batchRecruit: function() {
    var cost = this.recruitCost;
    if (this.gameMode === 'challenge' || this.gameMode === 'bossrush') {
      cost = CHALLENGE_CONFIG.recruitCostBase + this.recruitCount * 2;
      this.recruitCost = cost;
    }
    if (!DEV_MODE && this.food < cost) return null;

    var deployed = Service.getDeployedHeroes();
    var guaranteedHeroes = deployed.length > 0 ? (this.difficulty === 'hell' ? 3 : (this.difficulty === 'hard' ? 2 : 1)) : 0;
    var heroRate = this.difficulty === 'hell' ? 0.5 : (this.difficulty === 'hard' ? 0.3 : 0.1);

    var hasLocked = false;
    for (var r = 0; r < this.grid.length && !hasLocked; r++) {
      for (var c = 0; c < this.grid[r].length && !hasLocked; c++) {
        if (this.grid[r][c].isBuildable && !this.grid[r][c].isDug) hasLocked = true;
      }
    }

    this.waitingUnits = [];
    var heroCount = 0;
    var shovelUsed = false;

    for (var i = 0; i < 6; i++) {
      if (hasLocked && !shovelUsed && Math.random() < 0.3) {
        this.waitingUnits.push({type:'shovel', emoji:'🔧', name:'鏟子'});
        shovelUsed = true;
      } else if (deployed.length > 0 && Math.random() < heroRate) {
        var hid = deployed[Math.floor(Math.random() * deployed.length)];
        var hd = getHeroData(hid);
        if (hd) {
          this.waitingUnits.push({type:'hero', heroId:hid, emoji:hd.emoji, name:hd.name, level:1});
          heroCount++;
        } else {
          var t = SOLDIER_KEYS[Math.floor(Math.random() * SOLDIER_KEYS.length)];
          this.waitingUnits.push({type:t, soldierType:t, level:1, emoji:SOLDIER_TYPES[t].emoji, name:SOLDIER_TYPES[t].name});
        }
      } else {
        var t = SOLDIER_KEYS[Math.floor(Math.random() * SOLDIER_KEYS.length)];
        this.waitingUnits.push({type:t, soldierType:t, level:1, emoji:SOLDIER_TYPES[t].emoji, name:SOLDIER_TYPES[t].name});
      }
    }

    if (heroCount < guaranteedHeroes && deployed.length > 0) {
      for (var j = 0; j < this.waitingUnits.length && heroCount < guaranteedHeroes; j++) {
        if (this.waitingUnits[j].type !== 'hero' && this.waitingUnits[j].type !== 'shovel') {
          var hid = deployed[Math.floor(Math.random() * deployed.length)];
          var hd = getHeroData(hid);
          if (hd) {
            this.waitingUnits[j] = {type:'hero', heroId:hid, emoji:hd.emoji, name:hd.name, level:1};
            heroCount++;
          }
        }
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

  startAutoWave: function() {
    if (this.gameEnded) return;
    this.autoWaveTimer = 3;
    this.waveIndex++;
    UI.updateHUD();
    this.startNextWave();
  },

  startNextWave: function() {
    if (this.gameMode === 'challenge') {
      this.challengeWave++;
      var wave = this.generateChallengeWave(this.challengeWave);
      this.currentWaveEnemies = [];
      this.waveActive = true;
      this.spawnedCount = 0;
      this.waveDelay = wave.delay || 2;
      this.spawnTimer = 0;
      for (var i = 0; i < wave.enemies.length; i++) {
        var ew = wave.enemies[i];
        for (var j = 0; j < ew.count; j++) {
          this.currentWaveEnemies.push(ew.type);
        }
      }
      UI.updateHUD();
      UI.renderBarUnits();
      UI.renderWaitingArea();
      return;
    }
    if (this.gameMode === 'bossrush') {
      this.startBossRushWave();
      return;
    }
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
    this.gameTime = (this.gameTime || 0) + dt;

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
            var mult;
            if (this.gameMode === 'challenge') {
              var scale = 1 + (this.challengeWave - 1) * CHALLENGE_CONFIG.atkScale;
              var hpScale = 1 + (this.challengeWave - 1) * CHALLENGE_CONFIG.hpScale;
              mult = { atk: scale, hp: hpScale };
            } else if (this.gameMode === 'bossrush') {
              var boss = BOSS_RUSH_ORDER[this.bossRushIndex];
              mult = { atk: boss ? boss.atkMult : 3, hp: boss ? boss.hpMult : 3 };
            } else {
              mult = getEnemyMult(this.stage.id, this.difficulty);
            }
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
          if (this.gameMode === 'bossrush') {
            this.bossRushKills++;
            if (this.bossRushKills > (Service.appData.bossRushKills || 0)) {
              Service.appData.bossRushKills = this.bossRushKills;
            }
            this.bossRushIndex++;
            Service.saveData();
            UI.updateHUD();
            if (this.bossRushIndex >= BOSS_RUSH_ORDER.length) {
              this.onVictory();
            } else {
              UI.showBossRest();
            }
            return;
          }
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
    /* 所有模式勝利皆觸發每日任務進度 */
    Service.addTaskProgress('battle_win', 1);
    /* 挑戰模式勝利 */
    if (this.gameMode === 'challenge') {
      var gold = this.challengeWave;
      Service.addGold(gold);
      if (this.challengeWave > (Service.appData.challengeHighWave || 0)) {
        Service.appData.challengeHighWave = this.challengeWave;
      }
      Service.saveData();
      UI.showResult(true, gold, null);
      return;
    }
    /* Boss Rush 通關/進入休息 */
    if (this.gameMode === 'bossrush') {
      this.bossRushKills++;
      Service.addGold(this.bossRushKills * 10);
      if (this.bossRushKills > (Service.appData.bossRushKills || 0)) {
        Service.appData.bossRushKills = this.bossRushKills;
      }
      Service.saveData();
      if (this.bossRushIndex + 1 >= BOSS_RUSH_ORDER.length) {
        UI.showResult(true, 0, null);
      } else {
        UI.showBossRest();
      }
      return;
    }
    var s = this.stage;
    var firstClear = !Service.isStageCompleted(s.id, this.difficulty);
    var stageIdx = getStageIndex(s.id);
    var gold = getStageGold(stageIdx, this.difficulty, firstClear);
    
    // 經驗值分配與升級計算 (3.3)
    var diffMult = this.difficulty === 'hard' ? 1.5 : (this.difficulty === 'hell' ? 2.5 : 1.0);
    var baseExp = 1;
    var gainedExp = Math.round(baseExp * (stageIdx + 1) * diffMult);
    var survivors = this.units.filter(function(u) { return !u.isSoldier && !u.dead; });
    var levelUpList = [];
    
    if (!Service.appData.heroExp) Service.appData.heroExp = {};
    if (!Service.appData.heroLevel) Service.appData.heroLevel = {};

    survivors.forEach(function(u) {
      var heroId = u.heroId;
      var curExp = Service.appData.heroExp[heroId] || 0;
      var curLevel = Service.appData.heroLevel[heroId] || 1;
      
      if (curLevel >= 20) return;
      curExp += gainedExp;
      
      var leveled = false;
      while (true) {
        var req = 200 + curLevel * 250;
        if (curExp >= req && curLevel < 20) {
          curExp -= req;
          curLevel++;
          leveled = true;
        } else {
          break;
        }
      }
      
      Service.appData.heroExp[heroId] = curExp;
      Service.appData.heroLevel[heroId] = curLevel;
      if (leveled) {
        levelUpList.push(u.emoji + u.name + ' 升至 Lv.' + curLevel);
      }
    });

    Service.addGold(gold);
    if (firstClear) Service.completeStage(s.id, this.difficulty);
    var weapon = firstClear ? Service.generateWeapon(s.id, true, this.difficulty) : Service.generateWeapon(s.id, false, this.difficulty);
    var extraWeapons = [];
    if (weapon) {
      Service.appData.weaponStorage.push(weapon);
    }
    if (firstClear) {
      var whiteWpn = Service.generateWeaponByQuality(1);
      Service.appData.weaponStorage.push(whiteWpn);
      extraWeapons.push(whiteWpn);
      if (stageIdx % 3 === 2) {
        if (this.difficulty === 'hard') {
          var blueWpn = Service.generateWeaponByQuality(2);
          Service.appData.weaponStorage.push(blueWpn);
          extraWeapons.push(blueWpn);
        } else if (this.difficulty === 'hell') {
          var purpWpn = Service.generateWeaponByQuality(3);
          Service.appData.weaponStorage.push(purpWpn);
          extraWeapons.push(purpWpn);
        }
      }
      if (s.id === 'hell') {
        if (this.difficulty === 'normal') {
          var hellBlue = Service.generateWeaponByQuality(2);
          Service.appData.weaponStorage.push(hellBlue);
          extraWeapons.push(hellBlue);
        } else if (this.difficulty === 'hard') {
          var hellPurp = Service.generateWeaponByQuality(3);
          Service.appData.weaponStorage.push(hellPurp);
          extraWeapons.push(hellPurp);
        } else {
          var hellGold = Service.generateWeaponByQuality(4);
          Service.appData.weaponStorage.push(hellGold);
          extraWeapons.push(hellGold);
        }
      }
    }
    Service.saveData();
    if (Service.appData.playerName) {
      UI.uploadCurrentScore();
    }
    UI.showResult(true, gold, weapon, extraWeapons, gainedExp, levelUpList);
  },

  onDefeat: function() {
    if (this.gameEnded) return;
    this.gameEnded = true;
    this.paused = false;
    var overlay = document.getElementById('pause-overlay');
    if (overlay) overlay.style.display = 'none';
    /* 挑戰模式敗北 */
    if (this.gameMode === 'challenge') {
      var gold = Math.floor(this.challengeWave * CHALLENGE_CONFIG.goldRewardBase * 0.5);
      Service.addGold(gold);
      if (this.challengeWave > (Service.appData.challengeHighWave || 0)) {
        Service.appData.challengeHighWave = this.challengeWave;
      }
      Service.saveData();
      UI.showResult(false, gold, null);
      return;
    }
    /* Boss Rush 敗北 */
    if (this.gameMode === 'bossrush') {
      if (this.bossRushKills > (Service.appData.bossRushKills || 0)) {
        Service.appData.bossRushKills = this.bossRushKills;
      }
      Service.saveData();
      UI.showResult(false, 0, null);
      return;
    }
    Service.addGold(5);
    UI.showResult(false, 5, null);
  },

  start: function() {
    var self = this;
    this.lastTime = performance.now();
    this.speed = 1;
    this.gameTime = 0;
    this._skillBarTick = 0;
    function loop(now) {
      var dt = Math.min((now - self.lastTime) / 1000, 0.05) * self.speed;
      self.lastTime = now;
      if (!self.paused) self.update(dt);
      UI.renderEnemies();
      UI.renderUnits();
      // 每 20 幀更新技能欄 CD 顯示
      self._skillBarTick = (self._skillBarTick || 0) + 1;
      if (self._skillBarTick >= 20) {
        self._skillBarTick = 0;
        if (typeof UI.updateSkillBar === 'function') UI.updateSkillBar();
      }
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
