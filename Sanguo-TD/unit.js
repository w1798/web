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
  this.applyTierStats(heroData);
}

Unit.prototype.applyTierStats = function(heroData, battleLv) {
  var weaponType = HERO_WEAPON[heroData.type];
  var std = STANDARD_STATS[weaponType] || STANDARD_STATS.sword;
  var lv = battleLv || this.battleLevel || 1;
  var lvMult = 1 + (lv - 1) * 0.5;
  var tm = 1.0 + (this.star || 0) * (PROMO_STAR[this.tier] || 0);
  var offsetAtk = heroData.baseAtk - std.atk[heroData.rarity];
  var offsetDef = heroData.baseDef - std.def[heroData.rarity];
  var offsetHp = heroData.baseHp - std.hp[heroData.rarity];
  var effectiveAtk = std.atk[this.tier] + offsetAtk;
  var effectiveDef = std.def[this.tier] + offsetDef;
  var effectiveHp = std.hp[this.tier] + offsetHp;
  this.atk = Math.floor(effectiveAtk * tm * lvMult);
  this.def = Math.floor(effectiveDef * tm * lvMult);
  this.maxHp = Math.floor(effectiveHp * tm * lvMult);
  this.hp = this.maxHp;
  this.name = heroData.name + (lv > 1 ? ' Lv' + lv : '');
};

Unit.prototype.applyWeaponStats = function() {
  var w = Service.getWeapon(this.heroId);
  if (!w) return;
  var wType = Service.getHeroWeaponType({ type: this.type });
  if (w.type !== wType) return;
  var heroData = getHeroData(this.heroId);
  if (heroData) {
    var weaponType = HERO_WEAPON[heroData.type];
    var std = STANDARD_STATS[weaponType] || STANDARD_STATS.sword;
    var tm = 1.0 + (this.star || 0) * (PROMO_STAR[this.tier] || 0);
    var lvMult = 1 + (this.battleLevel - 1) * 0.5;
    var offsetAtk = heroData.baseAtk - std.atk[heroData.rarity];
    var effectiveAtk = std.atk[this.tier] + offsetAtk;
    this.atk = Math.floor(effectiveAtk * tm * lvMult * (1 + (w.atkPct || 0) / 100));
    var effectiveHp = std.hp[this.tier] + (heroData.baseHp - std.hp[heroData.rarity]);
    this.maxHp = Math.floor(effectiveHp * tm * lvMult * (1 + (w.hpPct || 0) / 100));
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

Unit.prototype.update = function(dt) {
  if (this.dead) return;
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
