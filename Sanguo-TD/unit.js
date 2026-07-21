/* ===== 武將/單位系統 ===== */
function Unit(heroData, col, row, tier, star) {
  this.heroId = heroData.id;
  this.name = heroData.name;
  this.emoji = heroData.emoji;
  this.type = heroData.type;
  this.rarity = heroData.rarity;
  this.level = 1;
  this.battleLevel = 1;
  this.col = col;
  this.row = row;
  this.range = heroData.range !== undefined ? heroData.range : (SOLDIER_TYPES[HERO_WEAPON[heroData.type]] ? SOLDIER_TYPES[HERO_WEAPON[heroData.type]].range : 1);
  this.cooldown = 0;
  this.dead = false;
  this.target = null;
  this.el = null;
  this.isSoldier = false;
  this.tier = tier || heroData.rarity;
  this.star = star || 0;
  this.weaponType = HERO_WEAPON[heroData.type] || 'sword';
  var st = SOLDIER_TYPES[this.weaponType];
  this.attackType = st ? st.attackType : 'single';
  this.damageType = st ? st.damageType : 'physical';
  this.aoeMax = st ? (st.aoeMax || 3) : 3;
  this.atkSpeed = st ? st.atkSpeed + (this.tier - 1) * 0.1 : 1.0;
  
  // 技能與特殊狀態初始化
  this.uniqueId = 'u_' + Math.random().toString(36).substr(2, 9);
  this.autoCast = true; // 預設開啟自動施法
  this.skill = heroData.skill || null;
  this.skillCooldown = 0;
  this.stunnedTimer = 0;
  this.buffAtkPct = 0;
  this.buffDuration = 0;
  this.buffDefPct = 0;
  this.buffHpPct = 0;
  this.buffDefDuration = 0;
  this.buffDefAddedHp = 0;

  // Buff 獨立生命週期系統
  this.buffs = []; // { type:'atk'|'def', endTime, value, ... }
  this._defBuffBaseMaxHp = 0; // 無 DEF Buff 時的 maxHp 基準值

  this.applyTierStats(heroData);
}

Unit.prototype.applyTierStats = function(heroData, battleLv) {
  var weaponType = HERO_WEAPON[heroData.type];
  var std = STANDARD_STATS[weaponType] || STANDARD_STATS.sword;
  var lv = battleLv || this.battleLevel || 1;
  var lvMult = 1 + (lv - 1) * 0.5;
  var tm = 1.0 + (this.star || 0) * (PROMO_STAR[this.tier] || 0);

  // 取得全球武將等級並計算加成
  var gLevel = 0;
  if (window.Service && Service.appData && Service.appData.heroLevel) {
    gLevel = Service.appData.heroLevel[heroData.id] || 0;
  }
  var globalLvBonus = 1 + gLevel * 0.02;

  var offsetAtk = heroData.baseAtk - std.atk[heroData.rarity];
  var offsetDef = heroData.baseDef - std.def[heroData.rarity];
  var offsetHp = heroData.baseHp - std.hp[heroData.rarity];
  var effectiveAtk = std.atk[this.tier] + offsetAtk;
  var effectiveDef = std.def[this.tier] + offsetDef;
  var effectiveHp = std.hp[this.tier] + offsetHp;

  this.atk = Math.floor(effectiveAtk * tm * lvMult * globalLvBonus);
  this.def = Math.floor(effectiveDef * tm * lvMult * globalLvBonus);
  this.maxHp = Math.floor(effectiveHp * tm * lvMult * globalLvBonus);
  this.hp = this.maxHp;
  this.name = heroData.name + (lv > 1 ? ' Lv' + lv : '');
};

Unit.prototype.applyWeaponStats = function() {
  var w = Service.getWeapon(this.heroId);
  if (!w) return;
  var wType = Service.getHeroWeaponType({ type: this.type });
  if (w.type !== wType) return;
  var heroData = getHeroData(this.heroId);
  
  // 取得全球武將等級並計算加成
  var gLevel = 0;
  if (window.Service && Service.appData && Service.appData.heroLevel) {
    gLevel = Service.appData.heroLevel[this.heroId] || 0;
  }
  var globalLvBonus = 1 + gLevel * 0.02;

  if (heroData) {
    var weaponType = HERO_WEAPON[heroData.type];
    var std = STANDARD_STATS[weaponType] || STANDARD_STATS.sword;
    var tm = 1.0 + (this.star || 0) * (PROMO_STAR[this.tier] || 0);
    var lvMult = 1 + (this.battleLevel - 1) * 0.5;
    var offsetAtk = heroData.baseAtk - std.atk[heroData.rarity];
    var effectiveAtk = std.atk[this.tier] + offsetAtk;
    this.atk = Math.floor(effectiveAtk * tm * lvMult * globalLvBonus * (1 + (w.atkPct || 0) / 100));
    var effectiveHp = std.hp[this.tier] + (heroData.baseHp - std.hp[heroData.rarity]);
    this.maxHp = Math.floor(effectiveHp * tm * lvMult * globalLvBonus * (1 + (w.hpPct || 0) / 100));
    this.hp = this.maxHp;
  } else {
    this.atk = Math.floor(this.atk * (1 + (w.atkPct || 0) / 100));
    if (w.hpPct) { this.maxHp = Math.floor(this.maxHp * (1 + w.hpPct / 100)); this.hp = this.maxHp; }
  }
  if (w.spd) { this.atkSpeed = Math.max(0.3, this.atkSpeed + w.spd); }
};

Unit.prototype.findTarget = function() {
  var best = null;
  var bestDist = Infinity;
  for (var i = 0; i < Game.enemies.length; i++) {
    var e = Game.enemies[i];
    if (e.dead) continue;
    var dx = e.col - this.col;
    var dy = e.row - this.row;
    var dist = Math.sqrt(dx * dx + dy * dy);
    if (dist <= this.range && dist < bestDist) {
      bestDist = dist;
      best = e;
    }
  }
  return best;
};

// 優先尋找範圍內未暈眩的敵人（用於暈眩技能，避免重複暈眩同一目標）
Unit.prototype.findUnstunnedTarget = function() {
  var best = null;
  var bestDist = Infinity;
  // 第一輪：只找未暈眩的
  for (var i = 0; i < Game.enemies.length; i++) {
    var e = Game.enemies[i];
    if (e.dead || e.stunnedTimer > 0) continue;
    var dx = e.col - this.col;
    var dy = e.row - this.row;
    var dist = Math.sqrt(dx * dx + dy * dy);
    if (dist <= this.range && dist < bestDist) {
      bestDist = dist;
      best = e;
    }
  }
  // 第二輪：若所有範圍內敵人都已暈眩，則 fallback 找最近的（含已暈眩）
  if (!best) {
    for (var i = 0; i < Game.enemies.length; i++) {
      var e = Game.enemies[i];
      if (e.dead) continue;
      var dx = e.col - this.col;
      var dy = e.row - this.row;
      var dist = Math.sqrt(dx * dx + dy * dy);
      if (dist <= this.range && dist < bestDist) {
        bestDist = dist;
        best = e;
      }
    }
  }
  return best;
};

// 過濾過期 Buff 並重新計算所有 Buff 總值
Unit.prototype._recalcBuffs = function() {
  var now = (window.Game && Game.gameTime) || 0;
  var hadDefBuff = this.buffs.some(function(b) { return b.type === 'def'; });
  var oldTotalHpPct = 0;
  for (var i = 0; i < this.buffs.length; i++) {
    if (this.buffs[i].type === 'def') oldTotalHpPct += (this.buffs[i].hpPct || 0);
  }

  // 過濾過期 Buff
  this.buffs = this.buffs.filter(function(b) { return b.endTime > now; });

  // 計算當前所有活跃 Buff 總值
  var totalAtk = 0;
  var totalDef = 0;
  var totalHpPct = 0;
  var latestEndTime = 0;
  for (var i = 0; i < this.buffs.length; i++) {
    var b = this.buffs[i];
    if (b.type === 'atk') {
      totalAtk += b.value;
      if (b.endTime > latestEndTime) latestEndTime = b.endTime;
    } else if (b.type === 'def') {
      totalDef += (b.defPct || 0);
      totalHpPct += (b.hpPct || 0);
      if (b.endTime > latestEndTime) latestEndTime = b.endTime;
    }
  }

  // 更新 ATK Buff 屬性
  this.buffAtkPct = totalAtk;
  // 為 UI 顯示：取最長剩餘時間
  this.buffDuration = latestEndTime > now ? latestEndTime - now : 0;

  // 更新 DEF/HP Buff 屬性
  this.buffDefPct = totalDef;

  // 處理 HP 基準值：若之前有 def buff 但現在沒有，記錄基準
  if (hadDefBuff && !this.buffs.some(function(b) { return b.type === 'def'; })) {
    // 所有 def buff 都過期了，重置基準
    this._defBuffBaseMaxHp = 0;
  }

  // 從基準值重算 maxHp（如果有 def buff 存在）
    if (this.buffs.some(function(b) { return b.type === 'def'; })) {
      if (this._defBuffBaseMaxHp <= 0) {
        // 首次或基準被清除：以當前 maxHp 反推基準
        var curHpPct = oldTotalHpPct;
        this._defBuffBaseMaxHp = curHpPct > 0 ? Math.floor(this.maxHp / (1 + curHpPct / 100)) : this.maxHp;
      }
      var newMaxHp = Math.floor(this._defBuffBaseMaxHp * (1 + totalHpPct / 100));
      if (newMaxHp !== this.maxHp) {
        // 關鍵修改：HP 隨 maxHp 同比例縮放，但不再強制限制在 newMaxHp 內
        // 這樣當 maxHp 降低時，hp 會按比例降低，但不會被截斷
        var ratio = this.maxHp > 0 ? this.hp / this.maxHp : 1;
        this.maxHp = Math.max(1, newMaxHp);
        this.hp = Math.max(1, Math.floor(this.maxHp * ratio));
      }
      this.buffHpPct = totalHpPct;
    } else if (hadDefBuff) {
      // def buff 全部過期：恢復到基準值
      if (this._defBuffBaseMaxHp > 0) {
        var ratio = this.maxHp > 0 ? this.hp / this.maxHp : 1;
        this.maxHp = Math.max(1, this._defBuffBaseMaxHp);
        this.hp = Math.max(1, Math.floor(this.maxHp * ratio));
      }
      this.buffHpPct = 0;
      this._defBuffBaseMaxHp = 0;
    }
};

Unit.prototype.update = function(dt) {
  if (this.dead) return;

  // 技能冷卻與狀態倒數
  if (this.skillCooldown > 0) {
    this.skillCooldown -= dt;
  }
  // Buff 獨立生命週期：過濾過期 Buff 並重新計算總值
  this._recalcBuffs();

  // 自動施法判定 (4.2 - 自動功能)
  if (this.autoCast && this.skill && this.skillCooldown <= 0) {
    this.useSkill();
  }

  // 暈眩狀態處理
  if (this.stunnedTimer > 0) {
    this.stunnedTimer -= dt;
    // 確保在計時器歸零時仍然保持暈眩狀態直到幀結束
    if (this.el && !this.el.querySelector('.stunned-effect')) {
      var stunDiv = document.createElement('div');
      stunDiv.className = 'stunned-effect';
      stunDiv.textContent = '💫';
      this.el.appendChild(stunDiv);
    }
    if (this.el) {
      var hpPct = Math.max(0, this.hp / this.maxHp);
      var hpBar = this.el.querySelector('.unit-hp-fill');
      if (hpBar) {
        hpBar.style.width = (hpPct * 100) + '%';
        hpBar.style.background = hpPct < 0.3 ? '#e74c3c' : hpPct < 0.6 ? '#f39c12' : '#2ecc71';
      }
    }
    return;
  } else {
    // 確保在超時時移除視覺效果
    if (this.el) {
      var stunDiv = this.el.querySelector('.stunned-effect');
      if (stunDiv) stunDiv.remove();
    }
  }

  this.cooldown -= dt;
  this.target = this.findTarget();
  if (this.cooldown <= 0) {
    if (this.target) {
      this.attack(this.target);
      this.cooldown = 1 / this.atkSpeed;
    } else if (this.attackType === 'heal') {
      this.attack(null);
      this.cooldown = 1 / this.atkSpeed;
    }
  }
  if (this.el) {
    var hpPct = Math.max(0, this.hp / this.maxHp);
    var hpBar = this.el.querySelector('.unit-hp-fill');
    if (hpBar) {
      hpBar.style.width = (hpPct * 100) + '%';
      hpBar.style.background = hpPct < 0.3 ? '#e74c3c' : hpPct < 0.6 ? '#f39c12' : '#2ecc71';
    }
  }
};

Unit.prototype.useSkill = function() {
  if (this.dead || !this.skill || this.skillCooldown > 0) return false;
  
  var type = this.skill.type;
  var mult = this.skill.multiplier || 0;
  var aoeRange = this.skill.aoeRange || 0;
  var dur = this.skill.duration || 0;
  var effectVal = this.skill.effectValue || 0;
  var effectVal2 = this.skill.effectValue2 || 0;
  
  var selfValAtk = this.atk * (1 + (this.buffAtkPct || 0) / 100);
  
  if (type === 'damage_single') {
    var tgt = this.target || this.findTarget();
    if (!tgt || tgt.dead) return false;
    
    var dmg = Math.round(selfValAtk * mult);
    tgt.takeDamage(dmg);
    this.showSkillEffect(tgt.pixelX, tgt.pixelY, '⚡', 'rgba(255,165,0,0.8)');
  }
  else if (type === 'damage_aoe') {
    var center = this.target || this.findTarget();
    if (!center || center.dead) return false;
    
    var dmg = Math.round(selfValAtk * mult);
    this.showSkillEffect(center.pixelX, center.pixelY, '🔥', 'rgba(255,69,0,0.8)', aoeRange * 40);
    
    var inRange = [];
    for (var i = 0; i < Game.enemies.length; i++) {
      var e = Game.enemies[i];
      if (e.dead) continue;
      var dx = e.col - center.col;
      var dy = e.row - center.row;
      var d = Math.sqrt(dx*dx + dy*dy);
      if (d <= aoeRange) {
        inRange.push(e);
      }
    }
    inRange.forEach(function(e) {
      e.takeDamage(dmg);
    });
  }
  else if (type === 'heal') {
    var tgt = null;
    var minPct = 1.0;
    Game.units.forEach(function(u) {
      if (u.dead) return;
      var pct = u.hp / u.maxHp;
      if (pct < minPct) {
        minPct = pct;
        tgt = u;
      }
    });
    if (!tgt) tgt = this;
    
    var healVal = Math.round(tgt.maxHp * mult);
    tgt.hp = Math.min(tgt.maxHp, tgt.hp + healVal);
    var pos = UI.cellToPixel(tgt.col, tgt.row);
    this.showSkillEffect(pos.x, pos.y, '💚', 'rgba(46,204,113,0.8)');
    UI.showDmgNum(pos.x, pos.y, '+' + healVal, '#2ecc71');
  }
  else if (type === 'stun') {
    // 優先選擇未暈眩的敵人，避免多個暈眩技能重複暈眩同一目標
    var tgt = this.findUnstunnedTarget();
    if (!tgt || tgt.dead) return false;
    
    tgt.takeDamage(Math.round(selfValAtk * mult));
    tgt.stunnedTimer = dur;
    this.showSkillEffect(tgt.pixelX, tgt.pixelY, '🌀', 'rgba(52,152,219,0.8)');
  }
  else if (type === 'buff_self') {
    // 每個 Buff 獨立生命週期，不互相影響
    var now = (window.Game && Game.gameTime) || 0;
    this.buffs.push({ type: 'atk', value: effectVal, endTime: now + dur });
    var pos = UI.cellToPixel(this.col, this.row);
    this.showSkillEffect(pos.x, pos.y, '✨', 'rgba(230,126,34,0.8)');
  }
else if (type === 'buff_ally') {
        var self = this;
        var now = (window.Game && Game.gameTime) || 0;
        Game.units.forEach(function(u) {
            if (u.dead) return;
            // 每個單位各自添加獨立的 Buff 實例
            u.buffs.push({ type: 'atk', value: effectVal, endTime: now + dur });
            var pos = UI.cellToPixel(u.col, u.row);
            self.showSkillEffect(pos.x, pos.y, '🌞', 'rgba(241,196,15,0.8)');
        });
    }
    else if (type === 'slow_aoe') {
        var center = this.target || this.findTarget();
        if (!center || center.dead) return false;
        
        var dmg = Math.round(selfValAtk * mult);
        this.showSkillEffect(center.pixelX, center.pixelY, '❄️', 'rgba(173,216,230,0.8)', aoeRange * 40);
        
        var inRange = [];
        for (var i = 0; i < Game.enemies.length; i++) {
            var e = Game.enemies[i];
            if (e.dead) continue;
            var dx = e.col - center.col;
            var dy = e.row - center.row;
            var d = Math.sqrt(dx*dx + dy*dy);
            if (d <= aoeRange) {
                inRange.push(e);
            }
        }
        inRange.forEach(function(e) {
            e.takeDamage(dmg);
            // 施加緩速效果
            e.slowPct = effectVal;
            e.slowTimer = dur;
        });
    }
    else if (type === 'buff_def_aoe') {
        // 改為全體我方武將生效
        var now = (window.Game && Game.gameTime) || 0;
        Game.units.forEach(function(u) {
            if (u.dead || u.isSoldier) return; // 只影響武將
            
            // 若無 DEF Buff 基準值，記錄當前 maxHp 為基準
            if (u._defBuffBaseMaxHp <= 0) {
                u._defBuffBaseMaxHp = u.maxHp;
            }
            // 添加獨立 DEF/HP Buff 實例
            u.buffs.push({ type: 'def', defPct: effectVal, hpPct: effectVal2, endTime: now + dur });
        });
        
        // 視覺效果：在施法者位置顯示一個大光環
        var pos = UI.cellToPixel(this.col, this.row);
        this.showSkillEffect(pos.x, pos.y, '🛡️', 'rgba(30,144,255,0.8)', 3.0);
    }
  
  if (typeof UI.triggerScreenShake === 'function') {
    UI.triggerScreenShake();
  }
  
  this.skillCooldown = this.skill.cd;
  
  if (window.Sound && typeof Sound.play === 'function') {
    Sound.play('upgrade');
  }
  
  return true;
};

Unit.prototype.showSkillEffect = function(px, py, emoji, color, radius) {
  var fx = document.createElement('div');
  fx.className = 'skill-effect-fx';
  fx.style.cssText = 'position:absolute;left:' + px + 'px;top:' + py + 'px;transform:translate(-50%,-50%);font-size:32px;pointer-events:none;z-index:9999;transition:all 0.6s ease;opacity:1;';
  fx.textContent = emoji;
  
  var gridContainer = document.getElementById('battle-grid');
  if (gridContainer) {
    gridContainer.appendChild(fx);
    setTimeout(function() {
      fx.style.transform = 'translate(-50%, -100%) scale(2.0)';
      fx.style.opacity = '0';
    }, 50);
    setTimeout(function() {
      fx.remove();
    }, 650);
  }
};

Unit.prototype.attack = function(target) {
  Combat.doUnitAttack(this, target);
};

Unit.prototype.takeDamage = function(dmg) {
  var actualDmg = Math.max(1, dmg - this.def);
  this.hp -= actualDmg;
  var pos = UI.cellToPixel(this.col, this.row);
  UI.showDmgNum(pos.x, pos.y, '-' + actualDmg, '#ff6b6b');
  if (this.hp <= 0) {
    this.hp = 0;
    this.dead = true;
    Game.removeUnit(this);
  }
};

Unit.prototype.getPixelPos = function() {
  return UI.cellToPixel(this.col, this.row);
};

Unit.prototype.applySynergyBonuses = function() {
    if (this.isSoldier) return;
    this._synAtkPct = 0;
    this._synHpPct = 0;
    var bonus = Combat.getSynergyBonus(this.heroId);
    this._synAtkPct = bonus.atkPct || 0;
    this._synHpPct = bonus.hpPct || 0;
    if (this._synAtkPct) {
        this.atk = Math.floor(this.atk * (1 + this._synAtkPct / 100));
    }
    if (this._synHpPct) {
        var oldMax = this.maxHp;
        this.maxHp = Math.floor(this.maxHp * (1 + this._synHpPct / 100));
        this.hp = Math.floor(this.hp * this.maxHp / oldMax);
    }
    this._activeBonds = bonus.activeBonds || [];
};

Unit.prototype.upgradeStats = function() {
  var hd = getHeroData(this.heroId);
  if (hd) this.applyTierStats(hd, this.battleLevel);
  this.applyWeaponStats();
  this.applySynergyBonuses();
};

/* ===== 小兵單位（合成等級系統） ===== */
function SoldierUnit(type, level, col, row) {
  var st = SOLDIER_TYPES[type];
  this.isSoldier = true;
  this.soldierType = type;
  this.soldierName = st.name;
  this.emoji = st.emoji;
  this.level = level;
  this.battleLevel = level;
  this.col = col;
  this.row = row;
  this.type = st.name;
  this.heroId = 'soldier_' + type + '_' + level;
  this.rarity = Math.min(level + 1, 5);
  this.range = st.range;
  this.atkSpeed = st.atkSpeed;
  this.cooldown = 0;
  this.dead = false;
  this.target = null;
  this.el = null;
  this.isSoldier = true;
  this.tier = Math.min(level + 1, 5);
  this.weaponType = st.weaponType;
  this.attackType = st.attackType;
  this.aoeMax = st.aoeMax || 3;
  this.damageType = st.damageType;
  // Buff 獨立生命週期系統（與 Unit 建構子同步）
  this.buffs = [];
  this._defBuffBaseMaxHp = 0;
  this.buffAtkPct = 0;
  this.buffDuration = 0;
  this.buffDefPct = 0;
  this.buffHpPct = 0;
  this.upgradeStats();
}

SoldierUnit.prototype = Object.create(Unit.prototype);

SoldierUnit.prototype.upgradeStats = function() {
  var st = SOLDIER_TYPES[this.soldierType];
  var idx = Math.min(this.level - 1, 4);
  this.atk = st.baseAtk[idx];
  this.maxHp = st.baseHp[idx];
  this.hp = this.maxHp;
  this.def = st.baseDef[idx];
  this.name = this.soldierName + ' Lv' + this.level;
};

SoldierUnit.prototype.attack = function(target) {
  Combat.doUnitAttack(this, target);
};
