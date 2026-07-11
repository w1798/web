/* ===== 戰鬥系統 ===== */
var Combat = {
  getSynergyBonus: function(heroId) {
    if (!Game || !Game.units) return { atkPct:0, hpPct:0, defPct:0, activeBonds:[] };
    var deployed = [];
    for (var i = 0; i < Game.units.length; i++) {
      var u = Game.units[i];
      if (!u.dead && !u.isSoldier) deployed.push(u);
    }
    var heroIds = [];
    for (var i = 0; i < deployed.length; i++) heroIds.push(deployed[i].heroId);

    var typeCount = {}, rarityCount = {}, factionCount = {};
    for (var i = 0; i < deployed.length; i++) {
      var hd = getHeroData(deployed[i].heroId);
      if (!hd) continue;
      typeCount[hd.type] = (typeCount[hd.type] || 0) + 1;
      rarityCount[hd.rarity] = (rarityCount[hd.rarity] || 0) + 1;
      factionCount[hd.faction] = (factionCount[hd.faction] || 0) + 1;
    }

    var atkPct = 0, hpPct = 0, defPct = 0, activeBonds = [];

    /* 必然：不同兵種 ≥3 開始（每多一種 +2%）: base=4, 總和=2*種類-2 */
    var distinctTypes = Object.keys(typeCount).length;
    if (distinctTypes >= 3) atkPct += 2 * distinctTypes - 2;

    /* 必然：同原軍階 ≥3 開始（每多一人 +2%）: base=10, 總和=4+count*2 */
    for (var r in rarityCount) {
      if (rarityCount[r] >= 3) { atkPct += 4 + rarityCount[r] * 2; break; }
    }

    /* 必然：原軍階都不同 ≥5 → +30% */
    var distinctRarities = Object.keys(rarityCount).length;
    if (distinctRarities >= 5) atkPct += DISTINCT_RARITY_BONUS_ATK;

    /* 必然：同陣營（每多一人 +2%）: base=10, 總和=4+count*2，全體生效 */
    var factionMax = 0;
    for (var f in factionCount) { if (factionCount[f] > factionMax) factionMax = factionCount[f]; }
    if (factionMax >= 3) atkPct += 4 + 2 * factionMax;

    /* 限定：羈絆 — 僅 bond members 生效 */
    for (var b = 0; b < BOND_DATA.length; b++) {
      var bond = BOND_DATA[b];
      if (bond.type !== 'bond') continue;
      var allOk = true;
      for (var m = 0; m < bond.members.length; m++) {
        if (heroIds.indexOf(bond.members[m]) === -1) { allOk = false; break; }
      }
      if (allOk && bond.members.indexOf(heroId) !== -1) {
        if (bond.atkPct) atkPct += bond.atkPct;
        if (bond.hpPct) hpPct += bond.hpPct;
        activeBonds.push(bond);
      }
    }

    return { atkPct: atkPct, hpPct: hpPct, defPct: defPct, activeBonds: activeBonds };
  },

  getAdvMult: function(attacker, defender) {
    var atkWeapon = attacker.weaponType || getWeaponType(attacker);
    var defWeapon = defender.weaponType || getWeaponType(defender);
    var adv = TYPE_ADVANTAGE[atkWeapon];
    if (Array.isArray(adv) ? adv.indexOf(defWeapon) !== -1 : adv === defWeapon) return 1.5;
    return 1.0;
  },

  doUnitAttack: function(unit, enemy) {
    if (unit.attackType === 'heal') {
      var targets = [];
      for (var i = 0; i < Game.units.length; i++) {
        var u = Game.units[i];
        if (u.dead || u.hp >= u.maxHp) continue;
        var dx = u.col - unit.col;
        var dy = u.row - unit.row;
        if (Math.sqrt(dx*dx + dy*dy) <= (unit.range || 2)) {
          targets.push(u);
        }
      }
      targets.sort(function(a, b) { return (a.hp / a.maxHp) - (b.hp / b.maxHp); });
      for (var j = 0; j < targets.length && j < (unit.aoeMax || 3); j++) {
        var healAmt = Math.floor(unit.atk * 1.0);
        targets[j].hp = Math.min(targets[j].hp + healAmt, targets[j].maxHp);
        var pp = UI.cellToPixel(targets[j].col, targets[j].row);
        UI.showDmgNum(pp.x, pp.y, '+' + healAmt + '❤', '#2ecc71');
      }
      return;
    }
    if (!enemy || enemy.dead) return;
    if (unit.isSoldier) {
      Sound.play('soldier');
    } else {
      Sound.play(unit.weaponType);
    }
    var adv = this.getAdvMult(unit, enemy);
    var dmg = Math.floor(unit.atk * adv);
    var crit = Math.random() < 0.1;
    if (crit) dmg = Math.floor(dmg * 1.5);

    if (unit.attackType === 'aoe') {
      var hitCnt = 0;
      var maxTargets = unit.aoeMax || 3;
      for (var i = 0; i < Game.enemies.length && hitCnt < maxTargets; i++) {
        var e = Game.enemies[i];
        if (e.dead) continue;
        var dx = e.col - enemy.col;
        var dy = e.row - enemy.row;
        if (Math.sqrt(dx*dx + dy*dy) <= 1.5) {
          e.takeDamage(dmg);
          UI.showDmgNum(e.pixelX, e.pixelY, '-' + dmg, '#ff6b6b');
          if (e.dead) {
            UI.showDmgNum(e.pixelX, e.pixelY, '💀', '#ffd700');
          }
          hitCnt++;
        }
      }
    } else {
      enemy.takeDamage(dmg);
      if (crit) {
        UI.showDmgNum(enemy.pixelX, enemy.pixelY, '暴擊!' + dmg, '#ffd700');
      } else {
        UI.showDmgNum(enemy.pixelX, enemy.pixelY, '-' + dmg, '#ff6b6b');
      }
      if (enemy.dead) {
        UI.showDmgNum(enemy.pixelX, enemy.pixelY, '💀', '#ffd700');
      }
      /* 槍兵連擊：第二次 50% 傷害 */
      if (unit.weaponType === 'spear' && !enemy.dead) {
        var dmg2 = Math.floor(dmg * 1);
        enemy.takeDamage(dmg2);
        UI.showDmgNum(enemy.pixelX, enemy.pixelY, '-' + dmg2, '#ffaa6b');
        if (enemy.dead) {
          UI.showDmgNum(enemy.pixelX, enemy.pixelY, '💀', '#ffd700');
        }
      }
    }

    var attackerPos = UI.cellToPixel(unit.col, unit.row);
    var grid = document.getElementById('battle-grid');
    if (grid) {
      var r = grid.getBoundingClientRect();
      attackerPos.x += r.left;
      attackerPos.y += r.top;
    }
    var flash = document.createElement('div');
    flash.className = 'attack-flash';
    flash.textContent = unit.attackType === 'heal' ? '💚' : '⚔️';
    flash.style.left = (attackerPos.x - 10) + 'px';
    flash.style.top = (attackerPos.y - 20) + 'px';
    document.body.appendChild(flash);
    setTimeout(function() { flash.remove(); }, 350);
  },

  doEnemyAttack: function(enemy, unit) {
    if (unit.dead) return;
    var adv = this.getAdvMult(enemy, unit);
    var dmg = Math.max(1, Math.floor(enemy.atk * adv - unit.def * 0.5));
    unit.takeDamage(dmg);
  },

  findNearestEnemy: function(col, row, range) {
    var best = null;
    var bestDist = Infinity;
    for (var i = 0; i < Game.enemies.length; i++) {
      var e = Game.enemies[i];
      if (e.dead) continue;
      var dx = e.col - col;
      var dy = e.row - row;
      var dist = Math.sqrt(dx * dx + dy * dy);
      if (dist <= range && dist < bestDist) {
        bestDist = dist;
        best = e;
      }
    }
    return best;
  },

  findNearestUnit: function(col, row, range) {
    var best = null;
    var bestDist = Infinity;
    for (var i = 0; i < Game.units.length; i++) {
      var u = Game.units[i];
      if (u.dead) continue;
      var dx = u.col - col;
      var dy = u.row - row;
      var dist = Math.sqrt(dx * dx + dy * dy);
      if (dist <= range && dist < bestDist) {
        bestDist = dist;
        best = u;
      }
    }
    return best;
  }
};
