UI.calcCellSize = function() {
    if (!Game.mapLayout) return;
    var cols = Game.mapLayout.cols;
    var rows = Game.mapLayout.rows;
    var el = document.getElementById('battle-grid');
    var rect = el ? el.getBoundingClientRect() : null;
    var availW = (rect ? rect.width : window.innerWidth) - 8 - Math.max(0, cols - 1);
    var availH = (rect ? rect.height : window.innerHeight - 170) - 8 - Math.max(0, rows - 1);
    this.cellSize = Math.max(32, Math.min(
      Math.floor(availW / cols),
      Math.floor(availH / rows),
      100
    ));
    if (el) {
      var totalW = this.cellSize * cols + Math.max(0, cols - 1);
      var totalH = this.cellSize * rows + Math.max(0, rows - 1);
      this.gridOffsetX = Math.floor((rect.width - totalW) / 2);
      this.gridOffsetY = Math.floor((rect.height - totalH) / 2);
    } else {
      this.gridOffsetX = 0;
      this.gridOffsetY = 0;
    }
  };

UI.cellToPixel = function(col, row) {
    var gap = 1;
    return {
      x: this.gridOffsetX + col * (this.cellSize + gap) + this.cellSize / 2,
      y: this.gridOffsetY + row * (this.cellSize + gap) + this.cellSize / 2
    };
  };

UI.showDmgNum = function(x, y, text, color) {
    var el = document.createElement('div');
    var grid = document.getElementById('battle-grid');
    if (grid) {
      var r = grid.getBoundingClientRect();
      x += r.left;
      y += r.top;
    }
    el.style.cssText = 'position:fixed;left:' + x + 'px;top:' + y + 'px;color:' + (color || '#fff') + ';font-size:18px;font-weight:bold;pointer-events:none;z-index:999;text-shadow:1px 1px 2px rgba(0,0,0,0.8);';
    el.textContent = text;
    document.body.appendChild(el);
    var dy = -40;
    var start = performance.now();
    function anim(t) {
      var p = Math.min((t - start) / 600, 1);
      el.style.top = (y + dy * p) + 'px';
      el.style.opacity = 1 - p;
      if (p < 1) requestAnimationFrame(anim);
      else el.remove();
    }
    requestAnimationFrame(anim);
  };


UI.renderBattle = function() {
    var el = document.getElementById('battle-grid');
    if (!el) return;
    var stale = document.querySelectorAll('.drag-ghost');
    for (var si = 0; si < stale.length; si++) stale[si].remove();
    el.innerHTML = '';
    for (var _i = 0; _i < Game.units.length; _i++) { var _u = Game.units[_i]; _u.el = null; _u.gridEl = null; }
    for (var _i = 0; _i < Game.enemies.length; _i++) { var _e = Game.enemies[_i]; _e.el = null; }
    if (!Game.mapLayout || !Game.grid) return;
    this.calcCellSize();
    if (this.cellSize < 32) this.cellSize = 60;
    el.style.display = 'grid';
    el.style.gridTemplateColumns = 'repeat(' + Game.mapLayout.cols + ', ' + this.cellSize + 'px)';
    el.style.gridTemplateRows = 'repeat(' + Game.mapLayout.rows + ', ' + this.cellSize + 'px)';
    for (var r = 0; r < Game.mapLayout.rows; r++) {
      for (var c = 0; c < Game.mapLayout.cols; c++) {
        var cell = Game.grid[r][c];
        if (!cell) continue;
        var div = document.createElement('div');
        div.className = 'grid-cell';
        div.dataset.col = c;
        div.dataset.row = r;
        if (cell.isPath) div.className += ' path';
        else if (cell.isBuildable) {
          div.className += ' buildable' + (cell.isDug ? ' dug' : ' locked');
          div.onclick = function(c, r) { return function(ev) {
            if (UI._touchHandled && (Date.now() - UI._touchHandled) < 500) { UI._touchHandled = 0; return; }
            ev.stopPropagation();
            UI.onCellClick(c, r);
          }; }(c, r);
          div.ontouchstart = function(c, r) { return function(ev) {
            ev.preventDefault();
            ev.stopPropagation();
            UI._touchHandled = Date.now();
            UI.onCellClick(c, r);
          }; }(c, r);
          div.onmouseenter = function(c, r) { return function(ev) {
            if (UI.selectedUnitIdx >= 0 && UI.selectedUnitIdx < Game.units.length) {
              var su = Game.units[UI.selectedUnitIdx];
              if (su && !su.dead) {
                UI.showHoverRange(c, r, su.range || 2);
              }
            }
          }; }(c, r);
          div.onmouseleave = function() {
            UI.hideHoverRange();
          };
}
        else div.className += ' blocked';
        if (cell.unit) {
          var uu = cell.unit;
          div.dataset.occupied = 'true';
          div.className += ' occupied';
          div.dataset.unitId = uu.heroId || '';
          div.onclick = function(c, r) { return function(ev) {
            if (UI._touchHandled && (Date.now() - UI._touchHandled) < 500) { UI._touchHandled = 0; return; }
            ev.stopPropagation();
            UI.onCellClick(c, r);
          }; }(c, r);
          div.onmousedown = function(uObj) { return function(ev) {
            if (ev.button !== 0) return;
            ev.stopPropagation();
            ev.preventDefault();
            UI.startBattleUnitDrag(uObj, ev.clientX, ev.clientY, ev.currentTarget);
          }; }(uu);
          div.ontouchstart = function(uObj, c, r) { return function(ev) {
            ev.preventDefault();
            ev.stopPropagation();
            var tapStart = Date.now();
            var tap = true;

            function onCellMove(ev2) {
              if (tap && Date.now() - tapStart > 200) {
                tap = false;
                document.removeEventListener('touchmove', onCellMove);
                document.removeEventListener('touchend', onCellEnd);
                UI.startBattleUnitDrag(uObj, ev.touches[0].clientX, ev.touches[0].clientY, ev.currentTarget);
              }
            }
            function onCellEnd(ev2) {
              document.removeEventListener('touchmove', onCellMove);
              document.removeEventListener('touchend', onCellEnd);
              if (tap) {
                UI._touchHandled = Date.now();
                UI.onCellClick(c, r);
              }
            }
            document.addEventListener('touchmove', onCellMove, {passive:true});
            document.addEventListener('touchend', onCellEnd);
          }; }(uu, c, r);
          div.onmouseenter = function(unitData) { return function(e) {
            UI.showUnitTooltip(unitData);
            var el = document.getElementById('unit-tooltip');
            if (el) { el.style.left = (e.clientX + 12) + 'px'; el.style.top = (e.clientY - 10) + 'px'; }
            UI.showHoverRange(unitData.col, unitData.row, unitData.range || 2);
          }; }(uu);
          div.onmousemove = function(e) {
            var el = document.getElementById('unit-tooltip');
            if (el) { el.style.left = (e.clientX + 12) + 'px'; el.style.top = (e.clientY - 10) + 'px'; }
          };
          div.onmouseleave = function() {
            UI.hideUnitTooltip();
            UI.hideHoverRange();
          };
        }
        el.appendChild(div);
      }
    }
    if (this.selectedUnitIdx >= 0 && this.selectedUnitIdx < Game.units.length) {
      var sel = Game.units[this.selectedUnitIdx];
      var rng = sel.range || 2;
      var pp = this.cellToPixel(Math.floor(sel.col), Math.floor(sel.row));
      var circle = document.createElement('div');
      var diam = rng * 2 * this.cellSize;
      circle.style.cssText = 'position:absolute;left:' + (pp.x - diam/2) + 'px;top:' + (pp.y - diam/2) + 'px;width:' + diam + 'px;height:' + diam + 'px;border-radius:50%;border:2px dashed rgba(255,215,0,0.6);pointer-events:none;z-index:5;';
      el.appendChild(circle);
    }
    var ec = document.createElement('div');
    ec.id = 'enemy-container';
    ec.style.cssText = 'position:absolute;left:0;top:0;width:100%;height:100%;pointer-events:none;overflow:hidden;';
    el.appendChild(ec);
    var uc = document.createElement('div');
    uc.id = 'unit-container';
    uc.style.cssText = 'position:absolute;left:0;top:0;width:100%;height:100%;pointer-events:none;overflow:hidden;';
    el.appendChild(uc);
    this.updateUnitActions();
    this.renderUnits();
    this.renderEnemies();
  };

UI.doRecruit = function() {
    var count = Game.batchRecruit();
    if (count === null) {
      this.showToast('食物不足或無可用單位！');
      return;
    }
    this.selectedWaitingIdx = -1;
    this.selectedUnitIdx = -1;
    this.renderBattle();
    this.renderWaitingArea();
    this.updateHUD();
    var btn = document.getElementById('btn-recruit');
    if (btn) btn.innerHTML = '征招 🍖<span id="recruit-cost">' + Game.recruitCost + '</span>';
  };

UI.selectUnitAt = function(col, row) {
    for (var i = 0; i < Game.units.length; i++) {
      var u = Game.units[i];
      if (!u.dead && Math.floor(u.col) === col && Math.floor(u.row) === row) {
        if (this.selectedUnitIdx === i) {
          this.selectedUnitIdx = -1;
        } else {
          this.selectedUnitIdx = i;
          this.selectedWaitingIdx = -1;
        }
        this.renderBattle();
        this.updateUnitActions();
        return;
      }
    }
  };

UI.onCellClick = function(col, row) {
    this.hideUnitTooltip();
    this.hideHoverRange();
    if (this.selectedWaitingIdx >= 0 && this.selectedWaitingIdx < Game.waitingUnits.length) {
      var wu = Game.waitingUnits[this.selectedWaitingIdx];
      var target = Game.grid[row] && Game.grid[row][col];
      if (target && target.unit && this._canMerge(wu, target.unit)) {
        var tu = target.unit;
        if (wu.soldierType && tu.isSoldier) {
          tu.level++;
          tu.battleLevel = tu.level;
          tu.upgradeStats();
        } else if (wu.type === 'hero' && tu.heroId) {
          tu.battleLevel++;
          tu.level = tu.battleLevel;
          var hd = getHeroData(tu.heroId);
          if (hd) tu.applyTierStats(hd, tu.battleLevel);
          tu.applyWeaponStats();
          tu.applySynergyBonuses();
        }
        Game.waitingUnits.splice(this.selectedWaitingIdx, 1);
        this.selectedWaitingIdx = -1;
        this.selectedUnitIdx = -1;
        this._clearDeployHighlights();
        this._clearMergeHighlights();
        this.hideUnitTooltip();
        this.hideHoverRange();
        this.renderBattle();
        this.renderWaitingArea();
        this.showToast('合成成功！');
        return;
      }
      var ok = Game.deployFromWaitingIndex(this.selectedWaitingIdx, col, row);
      if (ok) {
        this.selectedWaitingIdx = -1;
        this.selectedUnitIdx = -1;
        this._clearDeployHighlights();
        this._clearMergeHighlights();
        this.hideUnitTooltip();
        this.hideHoverRange();
        this.renderBattle();
        this.renderWaitingArea();
      } else {
        this.showToast('無法部署到此位置！');
      }
      return;
    }
    var cell = Game.grid[row] && Game.grid[row][col];
    if (this.selectedUnitIdx >= 0 && this.selectedUnitIdx < Game.units.length) {
      var u = Game.units[this.selectedUnitIdx];
      if (Math.floor(u.col) === col && Math.floor(u.row) === row) {
        this.selectedUnitIdx = -1;
        this.hideUnitTooltip();
        this.hideHoverRange();
        this.renderBattle();
        return;
      }
      if (cell && cell.unit) {
        this.hideUnitTooltip();
        this.hideHoverRange();
        this.selectUnitAt(col, row);
        this.showUnitTooltip(cell.unit);
        return;
      }
      var ok = Game.moveUnit(u, col, row);
      if (ok) {
        this.selectedUnitIdx = -1;
        this.hideUnitTooltip();
        this.hideHoverRange();
        this.renderBattle();
      } else {
        this.showToast('無法移動到此位置！');
      }
      return;
    }
    if (cell && cell.unit) {
      this.selectUnitAt(col, row);
      this.showUnitTooltip(cell.unit);
      return;
    }
    if (cell && cell.isBuildable && !cell.isDug) {
      var hasShovel = false;
      for (var si = 0; si < Game.waitingUnits.length; si++) {
        if (Game.waitingUnits[si].type === 'shovel') { hasShovel = true; break; }
      }
      if (!hasShovel) {
        this.showToast('需要鏟子解鎖！');
        return;
      }
      for (var si = 0; si < Game.waitingUnits.length; si++) {
        if (Game.waitingUnits[si].type === 'shovel') {
          Game.deployFromWaitingIndex(si, col, row);
          this.renderBattle();
          this.renderWaitingArea();
          return;
        }
      }
    }
    /* 無動作 → 清除選取和資訊 */
    this.selectedUnitIdx = -1;
    this.selectedWaitingIdx = -1;
    this.hideUnitTooltip();
    this.hideHoverRange();
    this.renderBattle();
    this.renderWaitingArea();
  };

UI.showHoverRange = function(col, row, range) {
    var old = document.getElementById('hover-range');
    if (old) old.remove();
    var grid = document.getElementById('battle-grid');
    if (!grid) return;
    var pp = this.cellToPixel(Math.floor(col), Math.floor(row));
    var diam = range * 2 * this.cellSize;
    var circle = document.createElement('div');
    circle.id = 'hover-range';
    circle.style.cssText = 'position:absolute;left:' + (pp.x - diam/2) + 'px;top:' + (pp.y - diam/2) + 'px;width:' + diam + 'px;height:' + diam + 'px;border-radius:50%;border:2px dashed rgba(255,100,100,0.4);pointer-events:none;z-index:4;';
    grid.appendChild(circle);
  };

UI.hideHoverRange = function() {
    var el = document.getElementById('hover-range');
    if (el) el.remove();
  };

UI._canMerge = function(wu, unit) {
    if (wu.soldierType && unit.isSoldier) {
      return wu.soldierType === unit.soldierType && wu.level === unit.level && unit.level < 5;
    }
    if (wu.type === 'hero' && unit.heroId) {
      return wu.heroId === unit.heroId && unit.battleLevel < 5;
    }
    return false;
  };

UI._clearMergeHighlights = function() {
    var cells = document.querySelectorAll('.grid-cell.highlight-merge');
    for (var i = 0; i < cells.length; i++) {
      cells[i].classList.remove('highlight-merge');
    }
  };

UI._showDeployHighlights = function(wu) {
    if (!Game.grid) return;
    var isShovel = wu && wu.type === 'shovel';
    for (var r = 0; r < Game.mapLayout.rows; r++) {
      for (var c = 0; c < Game.mapLayout.cols; c++) {
        var cell = Game.grid[r][c];
        if (!cell || !cell.isBuildable) continue;
        var el = document.querySelector('.grid-cell[data-col="' + c + '"][data-row="' + r + '"]');
        if (!el) continue;
        if (isShovel) {
          if (!cell.isDug) el.classList.add('highlight-deploy');
        } else {
          if (cell.isDug && !cell.unit) {
            el.classList.add('highlight-deploy');
          } else if (cell.unit && wu && UI._canMerge(wu, cell.unit)) {
            el.classList.add('highlight-merge');
          }
        }
      }
    }
  };

UI._clearDeployHighlights = function() {
    var cells = document.querySelectorAll('.grid-cell.highlight-deploy');
    for (var i = 0; i < cells.length; i++) {
      cells[i].classList.remove('highlight-deploy');
    }
  };

  UI.showUnitTooltip = function(u) {
    var old = document.getElementById('unit-tooltip');
    if (old) old.remove();
    var info = [];
    if (u.isSoldier) {
      var st = SOLDIER_TYPES[u.weaponType];
      info.push(st ? getSoldierAttackStr(u.weaponType) : (u.soldierName || '士兵'));
      info.push('Lv.' + u.level);
    } else {
      var hd = getHeroData(u.heroId);
      if (hd) {
        var wt = HERO_WEAPON[hd.type];
        info.push(hd.name + ' ' + getWeaponAttackStr(wt));
      }
      info.push('★' + (hd ? hd.rarity : '?') + '  Lv.' + (u.battleLevel || 1));
    }
    info.push('HP: ' + Math.floor(u.hp) + '/' + Math.floor(u.maxHp));
    info.push('ATK: ' + Math.floor(u.atk));
    info.push('DEF: ' + Math.floor(u.def || 0));
    info.push('範圍: ' + (u.range || 2));
    var el = document.createElement('div');
    el.id = 'unit-tooltip';
    el.style.cssText = 'position:fixed;background:rgba(0,0,0,0.85);color:#f0e6d0;padding:8px 12px;border-radius:8px;border:1px solid #ffd700;font-size:13px;line-height:1.5;z-index:10000;pointer-events:none;white-space:nowrap;';
    el.innerHTML = info.join('<br>');
    document.body.appendChild(el);
    var pp = UI.cellToPixel(Math.floor(u.col), Math.floor(u.row));
    var grid = document.getElementById('battle-grid');
    var gx = 0, gy = 0;
    if (grid) { var gr = grid.getBoundingClientRect(); gx = gr.left; gy = gr.top; }
    var cx = gx + pp.x;
    var cy = gy + pp.y;
    var tw = el.offsetWidth || 160;
    var th = el.offsetHeight || 100;
    var vw = window.innerWidth;
    var vh = window.innerHeight;
    var tx = cx + UI.cellSize / 2 + 8;
    var ty = cy - UI.cellSize / 2 - th - 4;
    if (tx + tw > vw - 8) tx = cx - UI.cellSize / 2 - tw - 8;
    if (tx < 8) tx = 8;
    if (ty < 8) ty = cy + UI.cellSize / 2 + 4;
    if (ty + th > vh - 8) ty = vh - th - 8;
    el.style.left = tx + 'px';
    el.style.top = ty + 'px';
  };

UI.showWaitingUnitTooltip = function(wu, ev) {
    var old = document.getElementById('unit-tooltip');
    if (old) old.remove();
    var info = [];
    if (wu.type === 'hero') {
      var hd = getHeroData(wu.heroId);
      if (hd) {
        var wt = HERO_WEAPON[hd.type];
        info.push(hd.name + ' ' + getWeaponAttackStr(wt));
        var tier = Service.getHeroTier(wu.heroId);
        var star = Service.getHeroStar(wu.heroId);
        info.push('★' + hd.rarity + '  Lv.' + (wu.level || 1));
        var lv = wu.level || 1;
        var lvMult = 1 + (lv - 1) * 0.5;
        var tm = 1.0 + star * (PROMO_STAR[tier] || 0);
        var std = STANDARD_STATS[wt];
        if (std) {
          var eAtk = std.atk[tier] + (hd.baseAtk - std.atk[hd.rarity]);
          var eDef = std.def[tier] + (hd.baseDef - std.def[hd.rarity]);
          var eHp = std.hp[tier] + (hd.baseHp - std.hp[hd.rarity]);
          var atk = Math.floor(eAtk * tm * lvMult);
          var def = Math.floor(eDef * tm * lvMult);
          var maxHp = Math.floor(eHp * tm * lvMult);
          var w = Service.getWeapon(wu.heroId);
          if (w && w.type === wt) {
            atk = Math.floor(atk * (1 + (w.atkPct || 0) / 100));
            maxHp = Math.floor(maxHp * (1 + (w.hpPct || 0) / 100));
          }
          info.push('HP: ' + (wu.hp != null ? Math.floor(wu.hp) : maxHp) + '/' + maxHp);
          info.push('ATK: ' + atk);
          info.push('DEF: ' + def);
        }
        var st = SOLDIER_TYPES[wt];
        info.push('範圍: ' + (st ? st.range : 2));
      }
    } else if (wu.soldierType) {
      var st = SOLDIER_TYPES[wu.soldierType];
      if (st) {
        var idx = Math.min((wu.level || 1) - 1, 4);
        var atk = st.baseAtk[idx];
        var maxHp = st.baseHp[idx];
        var def = st.baseDef[idx];
        info.push(getSoldierAttackStr(wu.soldierType));
        info.push('Lv.' + (wu.level || 1));
        info.push('HP: ' + (wu.hp != null ? Math.floor(wu.hp) : maxHp) + '/' + maxHp);
        info.push('ATK: ' + atk);
        info.push('DEF: ' + def);
        info.push('範圍: ' + st.range);
      } else {
        info.push(wu.emoji + ' ' + (wu.name || '士兵'));
        if (wu.level) info.push('Lv.' + wu.level);
      }
    } else if (wu.type === 'shovel') {
      info.push('🛠️ 鏟子 - 可挖開已佔用的格子');
    } else {
      if (wu.name) info.push(wu.name);
      if (wu.level) info.push('Lv.' + wu.level);
    }
    if (!info.length) info.push(wu.name || '??');
    var el = document.createElement('div');
    el.id = 'unit-tooltip';
    el.style.cssText = 'position:fixed;left:' + (ev.clientX - 10) + 'px;bottom:calc(100vh - ' + (ev.clientY - 10) + 'px);background:rgba(0,0,0,0.85);color:#f0e6d0;padding:8px 12px;border-radius:8px;border:1px solid #ffd700;font-size:13px;line-height:1.5;z-index:10000;pointer-events:none;white-space:nowrap;';
    el.innerHTML = info.join('<br>');
    document.body.appendChild(el);
  };

UI.hideUnitTooltip = function() {
    var el = document.getElementById('unit-tooltip');
    if (el) el.remove();
  };

UI.startDrag = function(idx, cx, cy, el) {
    var ghost = document.createElement('div');
    ghost.className = 'drag-ghost';
    ghost.innerHTML = el.innerHTML;
    ghost.style.cssText = 'position:fixed;left:' + cx + 'px;top:' + cy + 'px;transform:translate(-50%,-50%);width:56px;height:56px;box-sizing:border-box;display:flex;flex-direction:column;align-items:center;justify-content:center;background:#2a1a10;border:2px solid #ffd700;border-radius:8px;pointer-events:none;z-index:9999;font-size:24px;';
    var emoji = ghost.querySelector('.wc-emoji');
    if (emoji) emoji.style.cssText = 'font-size:20px;line-height:1;';
    var name = ghost.querySelector('.wc-name');
    if (name) name.style.cssText = 'font-size:10px;color:#e0d4c0;';
    var lv = ghost.querySelector('.wc-lv');
    if (lv) lv.style.cssText = 'font-size:8px;color:#f1c40f;';
    document.body.appendChild(ghost);
    this.dragData = { idx: idx, ghost: ghost };
    this.selectedWaitingIdx = idx;
    this.renderWaitingArea();
    this._showDeployHighlights(Game.waitingUnits[idx]);
    var self = this;
function onMove(e) {
      if (e.cancelable) e.preventDefault();
      var cx2 = e.clientX || (e.touches && e.touches[0].clientX);
      var cy2 = e.clientY || (e.touches && e.touches[0].clientY);
      if (cx2 != null) {
        ghost.style.left = cx2 + 'px';
        ghost.style.top = cy2 + 'px';
        var target = document.elementFromPoint(cx2, cy2);
        if (target) {
          var cell = target.closest('.grid-cell.buildable');
          if (cell && self.dragData && self.dragData.idx >= 0) {
            var wu = Game.waitingUnits[self.dragData.idx];
            if (wu) {
              var range = 2;
              if (wu.type === 'hero' && wu.heroId) {
                var hd = getHeroData(wu.heroId);
                if (hd) {
                  range = hd.range !== undefined ? hd.range : (SOLDIER_TYPES[HERO_WEAPON[hd.type]] ? SOLDIER_TYPES[HERO_WEAPON[hd.type]].range : 2);
                }
              } else if (wu.soldierType && SOLDIER_TYPES[wu.soldierType]) {
                range = SOLDIER_TYPES[wu.soldierType].range || 2;
              }
              var col = parseInt(cell.dataset.col);
              var row = parseInt(cell.dataset.row);
              if (!isNaN(col) && !isNaN(row)) {
                UI.showHoverRange(col, row, range);
              }
            }
          } else {
            UI.hideHoverRange();
          }
        } else {
          UI.hideHoverRange();
        }
      }
    }
    function onUp(e) {
      self._clearMergeHighlights();
      self._clearDeployHighlights();
      UI.hideHoverRange();
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      document.removeEventListener('touchmove', onMove);
      document.removeEventListener('touchend', onUp);
      document.removeEventListener('touchcancel', onUp);
      try {
        var ghostRect = ghost.getBoundingClientRect();
        var last = UI.dragData;
        UI.dragData = null;
        var cx3 = e.clientX || (e.changedTouches && e.changedTouches[0].clientX);
        var cy3 = e.clientY || (e.changedTouches && e.changedTouches[0].clientY);
        if (cx3 == null || !last) return;
        var waitingArea = document.getElementById('waiting-area');
        if (waitingArea) {
          var waRect = waitingArea.getBoundingClientRect();
          var onWA = (cx3 >= waRect.left && cx3 <= waRect.right && cy3 >= waRect.top && cy3 <= waRect.bottom) ||
                     (ghostRect && ghostRect.left < waRect.right && ghostRect.right > waRect.left &&
                      ghostRect.top < waRect.bottom && ghostRect.bottom > waRect.top);
          if (onWA) {
            var bestCard = null;
            var bestOverlap = 0;
            var cards = waitingArea.querySelectorAll('.waiting-card');
            for (var ci = 0; ci < cards.length; ci++) {
              var cr = cards[ci].getBoundingClientRect();
              var overlapX = Math.max(0, Math.min(ghostRect.right, cr.right) - Math.max(ghostRect.left, cr.left));
              var overlapY = Math.max(0, Math.min(ghostRect.bottom, cr.bottom) - Math.max(ghostRect.top, cr.top));
              var overlap = overlapX * overlapY;
              if (overlap > bestOverlap) {
                bestOverlap = overlap;
                bestCard = cards[ci];
              }
            }
            if (bestCard && bestCard.dataset.idx !== undefined) {
              var tIdx = parseInt(bestCard.dataset.idx);
              if (!isNaN(tIdx) && tIdx !== last.idx) {
                var src = Game.waitingUnits[last.idx];
                var tgt = Game.waitingUnits[tIdx];
                if (src && tgt) {
                  if (src.soldierType && tgt.soldierType && src.soldierType === tgt.soldierType &&
                      src.level === tgt.level && tgt.level < 5) {
                    tgt.level++;
                    Game.waitingUnits.splice(last.idx, 1);
                    if (UI.selectedWaitingIdx >= last.idx) UI.selectedWaitingIdx--;
                    UI.renderWaitingArea();
                    return;
                  }
                  if (src.type === 'hero' && tgt.type === 'hero' && src.heroId === tgt.heroId && tgt.level < 5) {
                    tgt.level = Math.max(tgt.level || 1, src.level || 1) + 1;
                    if (tgt.level > 5) tgt.level = 5;
                    Game.waitingUnits.splice(last.idx, 1);
                    if (UI.selectedWaitingIdx >= last.idx) UI.selectedWaitingIdx--;
                    UI.renderWaitingArea();
                    return;
                  }
                }
              }
            }
          }
        }
        var target = document.elementFromPoint(cx3, cy3);
        if (target) {
          var cell = target.closest('.grid-cell.buildable');
          if (cell) {
            var col = parseInt(cell.dataset.col);
            var row = parseInt(cell.dataset.row);
            if (!isNaN(col) && !isNaN(row)) {
              var ok = Game.deployFromWaitingIndex(last.idx, col, row);
              if (ok) {
                UI.selectedWaitingIdx = -1;
                UI.renderBattle();
                UI.renderWaitingArea();
                return;
              }
            }
          }
        }
        UI.selectedWaitingIdx = -1;
        UI.renderWaitingArea();
        UI.hideHoverRange();
      } finally {
        if (ghost.parentNode) ghost.remove();
      }
    }
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    document.addEventListener('touchmove', onMove, {passive:false});
    document.addEventListener('touchend', onUp);
    document.addEventListener('touchcancel', onUp);
  };

UI.startBattleUnitDrag = function(unitObj, cx, cy, el) {
    var ghost = document.createElement('div');
    ghost.className = 'drag-ghost';
    ghost.style.cssText = 'position:fixed;left:' + cx + 'px;top:' + cy + 'px;transform:translate(-50%,-50%);width:56px;height:56px;box-sizing:border-box;display:flex;flex-direction:column;align-items:center;justify-content:center;font-size:22px;background:rgba(0,0,0,0.8);border:2px solid #ffd700;border-radius:10px;padding:2px;pointer-events:none;z-index:9999;';
    ghost.innerHTML = '<span>' + (unitObj.emoji || '?') + '</span><span class="unit-name-label" style="font-size:10px!important">' + (unitObj.isSoldier ? (unitObj.soldierName || '兵') : (unitObj.name || '').substring(0, 2)) + '</span>';
    document.body.appendChild(ghost);
    this.dragData = { unit: unitObj, ghost: ghost };
    this.renderBattle();
    var wu = unitObj.isSoldier
      ? { soldierType: unitObj.soldierType, level: unitObj.level }
      : { type: 'hero', heroId: unitObj.heroId };
    this._showDeployHighlights(wu);
    var self = this;
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    document.addEventListener('touchmove', onMove, {passive:false});
    document.addEventListener('touchend', onUp);
    document.addEventListener('touchcancel', onUp);
    function onMove(e) {
      if (e.cancelable) e.preventDefault();
      var cx2 = e.clientX || (e.touches && e.touches[0].clientX);
      var cy2 = e.clientY || (e.touches && e.touches[0].clientY);
      if (cx2 != null) {
        ghost.style.left = cx2 + 'px';
        ghost.style.top = cy2 + 'px';
        var target = document.elementFromPoint(cx2, cy2);
        if (target) {
          var cell = target.closest('.grid-cell.buildable');
          if (cell && self.dragData && self.dragData.unit) {
            var col = parseInt(cell.dataset.col);
            var row = parseInt(cell.dataset.row);
            if (!isNaN(col) && !isNaN(row)) {
              UI.showHoverRange(col, row, self.dragData.unit.range || 2);
            } else {
              UI.hideHoverRange();
            }
          } else {
            UI.hideHoverRange();
          }
        } else {
          UI.hideHoverRange();
        }
      }
    }
    function onUp(e) {
      UI.hideHoverRange();
      self._clearDeployHighlights();
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      document.removeEventListener('touchmove', onMove);
      document.removeEventListener('touchend', onUp);
      document.removeEventListener('touchcancel', onUp);
      try {
        var ghostRect = ghost.getBoundingClientRect();
        var last = self.dragData;
        self.dragData = null;
        var cx3 = e.clientX || (e.changedTouches && e.changedTouches[0].clientX);
        var cy3 = e.clientY || (e.changedTouches && e.changedTouches[0].clientY);
        if (cx3 == null || !last) return;
        e.stopPropagation();
        e.preventDefault();
        var target = document.elementFromPoint(cx3, cy3);
        if (target) {
          var cell = target.closest('.grid-cell.buildable');
          if (cell) {
            var col = parseInt(cell.dataset.col);
            var row = parseInt(cell.dataset.row);
            if (!isNaN(col) && !isNaN(row)) {
              var ok = Game.moveUnit(last.unit, col, row);
              if (ok) {
                self.renderBattle();
                return;
              }
            }
          }
          var recycleBin = document.getElementById('recycle-bin');
          if (recycleBin) {
            var rRect = recycleBin.getBoundingClientRect();
            if (cx3 >= rRect.left - 8 && cx3 <= rRect.right + 8 && cy3 >= rRect.top - 8 && cy3 <= rRect.bottom + 8) {
              Game.removeUnit(last.unit);
              Game.food += 1;
              self.renderBattle();
              self.renderWaitingArea();
              self.updateHUD();
              self.showToast('回收 +1🍖');
              return;
            }
          }
          var waitingArea = document.getElementById('waiting-area');
          if (waitingArea) {
            var wRect = waitingArea.getBoundingClientRect();
            var onWA = (cx3 >= wRect.left && cx3 <= wRect.right && cy3 >= wRect.top && cy3 <= wRect.bottom) ||
                       (ghostRect && ghostRect.left < wRect.right && ghostRect.right > wRect.left &&
                        ghostRect.top < wRect.bottom && ghostRect.bottom > wRect.top);
            if (onWA) {
              var bestCard = null;
              var bestOverlap = 0;
              var cards = waitingArea.querySelectorAll('.waiting-card');
              for (var ci = 0; ci < cards.length; ci++) {
                var cr = cards[ci].getBoundingClientRect();
                var ox = Math.max(0, Math.min(ghostRect.right, cr.right) - Math.max(ghostRect.left, cr.left));
                var oy = Math.max(0, Math.min(ghostRect.bottom, cr.bottom) - Math.max(ghostRect.top, cr.top));
                var ov = ox * oy;
                if (ov > bestOverlap) {
                  bestOverlap = ov;
                  bestCard = cards[ci];
                }
              }
              if (bestCard && bestCard.dataset.idx !== undefined) {
                var tIdx = parseInt(bestCard.dataset.idx);
                if (!isNaN(tIdx)) {
                  var wu = Game.waitingUnits[tIdx];
                  var u = last.unit;
                  if (wu && u) {
                    var merged = false;
                    if (u.isSoldier && wu.soldierType && u.soldierType === wu.soldierType && u.level === wu.level && wu.level < 5) {
                      wu.level++;
                      Game.removeUnit(u);
                      UI.renderBattle();
                      UI.renderWaitingArea();
                      self.showToast('合成 Lv' + wu.level);
                      merged = true;
                    } else if (!u.isSoldier && wu.type === 'hero' && u.heroId === wu.heroId && wu.level < 5) {
                      wu.level = Math.max(wu.level || 1, u.battleLevel || 1) + 1;
                      if (wu.level > 5) wu.level = 5;
                      Game.removeUnit(u);
                      UI.renderBattle();
                      UI.renderWaitingArea();
                      self.showToast('合成 Lv' + wu.level);
                      merged = true;
                    }
                    if (!merged) {
                      var ucol = u.col, urow = u.row;
                      var wuCopy = u.isSoldier
                        ? {type:u.soldierType, soldierType:u.soldierType, level:u.level, emoji:u.emoji, name:u.soldierName}
                        : {type:'hero', heroId:u.heroId, emoji:u.emoji, name:u.name, level:u.battleLevel || 1};
                      wuCopy.hp = u.hp;
                      wuCopy.maxHp = u.maxHp;
                      Game.removeUnit(u);
                      Game.waitingUnits.splice(tIdx, 1);
                      Game.deployFromWaiting(wu, ucol, urow);
                      Game.waitingUnits.splice(tIdx, 0, wuCopy);
                      UI.renderBattle();
                      UI.renderWaitingArea();
                      self.showToast('交換位置');
                    }
                    return;
                  }
                }
              }
              var ok = Game.retreatToWaiting(last.unit);
              if (ok) {
                self.renderWaitingArea();
                self.updateHUD();
                self.showToast('送回等待區');
                return;
              }
              self.showToast('等待區已滿！');
              self.renderBattle();
              return;
            }
          }
        }
        self.renderBattle();
      } finally {
        if (ghost.parentNode) ghost.remove();
      }
    }
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    document.addEventListener('touchmove', onMove, {passive:false});
    document.addEventListener('touchend', onUp);
    document.addEventListener('touchcancel', onUp);
  };

UI.renderEnemies = function() {
    var container = document.getElementById('enemy-container');
    if (!container) return;
    for (var i = 0; i < Game.enemies.length; i++) {
      var e = Game.enemies[i];
      if (e.dead) {
        if (e.el) { e.el.remove(); e.el = null; }
        continue;
      }
      if (!e.el) {
        e.el = document.createElement('div');
        e.el.className = 'enemy-unit';
        var eEmoji = document.createElement('span');
        eEmoji.textContent = e.emoji || '👹';
        e.el.appendChild(eEmoji);
        var eHpBar = document.createElement('div');
        eHpBar.className = 'enemy-hp-bar';
        var eHpFill = document.createElement('div');
        eHpFill.className = 'enemy-hp-fill';
        eHpFill.style.width = '100%';
        eHpBar.appendChild(eHpFill);
        e.el.appendChild(eHpBar);
        e.el._hpFill = eHpFill;
        container.appendChild(e.el);
      } else if (e.el._hpFill) {
        e.el._hpFill.style.width = Math.max(0, Math.min(100, (e.hp / e.maxHp) * 100)) + '%';
      }
      var pp = this.cellToPixel(e.col, e.row);
      e.el.style.left = pp.x + 'px';
      e.el.style.top = pp.y + 'px';
    }
    for (var i = 0; i < Game.enemies.length; i++) {
      var e = Game.enemies[i];
      if (e.dead && e.el) { e.el.remove(); e.el = null; }
    }
  };

UI.renderUnits = function() {
    var container = document.getElementById('unit-container');
    if (!container) return;
    for (var i = 0; i < Game.units.length; i++) {
      var u = Game.units[i];
      if (u.dead) {
        if (u.el) { u.el.remove(); u.el = null; }
        if (u.gridEl) { u.gridEl.remove(); u.gridEl = null; }
        continue;
      }
      if (!u.el) {
        u.el = document.createElement('div');
        u.el.className = 'battle-unit lv-' + (u.battleLevel || u.level || 1);
        var eSpan = document.createElement('span');
        eSpan.textContent = u.emoji || '?';
        u.el.appendChild(eSpan);
        var nSpan = document.createElement('span');
        nSpan.className = 'unit-name-label';
        nSpan.textContent = u.isSoldier ? (u.soldierName || '兵') : (u.name || '').substring(0, 2);
        u.el.appendChild(nSpan);
        var hBar = document.createElement('div');
        hBar.className = 'unit-hp-bar';
        var hFill = document.createElement('div');
        hFill.className = 'unit-hp-fill';
        hFill.style.width = Math.max(0, Math.min(100, (u.hp / u.maxHp) * 100)) + '%';
        hBar.appendChild(hFill);
        u.el.appendChild(hBar);
        u.el.onmousedown = function(uObj) { return function(ev) {
          if (ev.button !== 0) return;
          ev.stopPropagation();
          ev.preventDefault();
          UI.startBattleUnitDrag(uObj, ev.clientX, ev.clientY, this);
        }; }(u);
        u.el.ontouchstart = function(uObj) { return function(ev) {
          ev.stopPropagation();
          ev.preventDefault();
          var t = ev.touches[0];
          UI.startBattleUnitDrag(uObj, t.clientX, t.clientY, this);
        }; }(u);
        container.appendChild(u.el);
      } else {
        var hf = u.el.querySelector('.unit-hp-fill');
        if (hf) hf.style.width = Math.max(0, Math.min(100, (u.hp / u.maxHp) * 100)) + '%';
        var lvClass = 'lv-' + (u.battleLevel || u.level || 1);
        if (u.el.className.indexOf(lvClass) === -1) {
          u.el.className = 'battle-unit ' + lvClass;
        }
      }
      var pp = this.cellToPixel(u.col, u.row);
      u.el.style.left = pp.x + 'px';
      u.el.style.top = pp.y + 'px';
    }
    for (var i = 0; i < Game.units.length; i++) {
      var u = Game.units[i];
      if (u.dead) {
        if (u.el) { u.el.remove(); u.el = null; }
        if (u.gridEl) { u.gridEl.remove(); u.gridEl = null; }
      }
    }
  };

UI.renderBarUnits = function() {
    var bar = document.getElementById('bar-units');
    if (!bar) return;
    bar.innerHTML = '';
    var remaining = Game.spawnedCount || 0;
    for (var i = remaining; i < Game.currentWaveEnemies.length; i++) {
      var etype = Game.currentWaveEnemies[i];
      var ed = getEnemyData(etype);
      var dot = document.createElement('span');
      dot.className = 'wave-dot';
      dot.textContent = ed ? (ed.emoji || '👹') : '👹';
      dot.title = ed ? ed.name : '';
      bar.appendChild(dot);
    }
  };

UI.recycleUnit = function() {
    if (Game.waitingUnits.length === 0) return;
    var wu = Game.waitingUnits.pop();
    Game.food += 1;
    if (this.selectedWaitingIdx >= Game.waitingUnits.length) this.selectedWaitingIdx = -1;
    this.renderWaitingArea();
    this.updateHUD();
    this.showToast('回收 ' + (wu.name || '單位') + ' +1🍖');
  };

UI.sendUnitToWaiting = function() {
    if (this.selectedUnitIdx < 0 || this.selectedUnitIdx >= Game.units.length) return;
    var u = Game.units[this.selectedUnitIdx];
    if (u.dead) return;
    var ok = Game.retreatToWaiting(u);
    if (!ok) {
      this.showToast('等待區已滿！');
      return;
    }
    this.selectedUnitIdx = -1;
    this.renderWaitingArea();
    this.updateHUD();
    this.updateUnitActions();
    this.showToast('送回等待區');
  };

UI.recycleBattleUnit = function() {
    if (this.selectedUnitIdx < 0 || this.selectedUnitIdx >= Game.units.length) return;
    var u = Game.units[this.selectedUnitIdx];
    if (u.dead) return;
    Game.removeUnit(u);
    Game.food += 1;
    this.selectedUnitIdx = -1;
    this.renderBattle();
    this.renderWaitingArea();
    this.updateHUD();
    this.updateUnitActions();
    this.showToast('回收 +1🍖');
  };

UI.updateUnitActions = function() {
    var panel = document.getElementById('unit-actions');
    if (!panel) return;
    if (this.selectedUnitIdx >= 0 && this.selectedUnitIdx < Game.units.length && !Game.units[this.selectedUnitIdx].dead) {
      panel.style.display = 'flex';
      var u = Game.units[this.selectedUnitIdx];
      var infoDiv = document.getElementById('unit-action-info');
      if (!infoDiv) {
        infoDiv = document.createElement('div');
        infoDiv.id = 'unit-action-info';
        panel.insertBefore(infoDiv, panel.firstChild);
      }
      var levelText = u.isSoldier ? 'Lv.' + u.level : 'Lv.' + (u.battleLevel || 1);
      infoDiv.textContent = (u.name || u.soldierName || '') + '  ' + levelText;
    } else {
      panel.style.display = 'none';
    }
  };

UI.renderWaitingArea = function() {
    var area = document.getElementById('waiting-area');
    if (!area) return;
    var recycleHtml = '';
    var rb = area.querySelector('.recycle-bin');
    if (rb) recycleHtml = rb.outerHTML;
    area.innerHTML = '';
    for (var i = 0; i < Game.waitingUnits.length; i++) {
      var wu = Game.waitingUnits[i];
      var card = document.createElement('div');
      card.className = 'waiting-card' + (i === this.selectedWaitingIdx ? ' selected' : '');
      card.dataset.idx = i;
      card.title = wu.name || '';
      var emojiSpan = document.createElement('span');
      emojiSpan.className = 'wc-emoji';
      emojiSpan.textContent = wu.emoji || '?';
      card.appendChild(emojiSpan);
      var nameSpan = document.createElement('span');
      nameSpan.className = 'wc-name';
      nameSpan.textContent = (wu.name || '').substring(0, 4);
      card.appendChild(nameSpan);
      if (wu.level) {
        var lvBadge = document.createElement('span');
        lvBadge.className = 'wc-lv';
        lvBadge.textContent = 'Lv' + wu.level;
        card.appendChild(lvBadge);
      }
      card.onmousedown = function(idx, el) { return function(e) {
        e.preventDefault();
        UI.startDrag(idx, e.clientX, e.clientY, el);
      }; }(i, card);
      card.ontouchstart = function(idx, el) { return function(e) {
        e.preventDefault();
        e.stopPropagation();
        var tapStart = Date.now();
        var dragStarted = false;

        function onCardTouchMove(ev2) {
          if (dragStarted) return;
          if (Date.now() - tapStart > 200) {
            dragStarted = true;
            document.removeEventListener('touchmove', onCardTouchMove);
            document.removeEventListener('touchend', onCardTouchEnd);
            UI.startDrag(idx, e.touches[0].clientX, e.touches[0].clientY, el);
          }
        }
        function onCardTouchEnd(ev2) {
          document.removeEventListener('touchmove', onCardTouchMove);
          document.removeEventListener('touchend', onCardTouchEnd);
          if (!dragStarted) {
            UI._touchHandled = Date.now();
            UI.selectedWaitingIdx = (UI.selectedWaitingIdx === idx) ? -1 : idx;
            UI.renderWaitingArea();
            if (UI.selectedWaitingIdx >= 0) {
              UI._showDeployHighlights(Game.waitingUnits[UI.selectedWaitingIdx]);
            } else {
              UI._clearDeployHighlights();
            }
          }
        }
        document.addEventListener('touchmove', onCardTouchMove, {passive:true});
        document.addEventListener('touchend', onCardTouchEnd);
      }; }(i, card);
      card.onmouseenter = function(w) { return function(e) {
        UI.showWaitingUnitTooltip(w, e);
      }; }(wu);
      card.onmouseleave = function() {
        UI.hideUnitTooltip();
      };
      card.onclick = function(idx) { return function() {
        if (UI.dragData) return;
        if (UI._touchHandled && (Date.now() - UI._touchHandled) < 500) { UI._touchHandled = 0; return; }
        UI.selectedWaitingIdx = (UI.selectedWaitingIdx === idx) ? -1 : idx;
        UI.renderWaitingArea();
      }; }(i);
      area.appendChild(card);
    }
    if (recycleHtml) {
      var temp = document.createElement('div');
      temp.innerHTML = recycleHtml;
      area.appendChild(temp.firstChild);
    }
  };

UI.updateHUD = function() {
    var livesEl = document.getElementById('hud-lives');
    if (livesEl) livesEl.textContent = '❤️ ' + Game.lives;
    var foodEl = document.getElementById('hud-food');
    if (foodEl) foodEl.textContent = '🍖 ' + Game.food;
    var goldEl = document.getElementById('hud-gold');
    if (goldEl) goldEl.textContent = '💰 ' + Service.appData.gold;
    var waveEl = document.getElementById('hud-wave');
    if (waveEl) waveEl.textContent = '🌊 ' + Game.waveIndex + '/' + Game.stage.waves.length;
    var nameEl = document.getElementById('hud-stage-name');
    if (nameEl && Game.stage) nameEl.textContent = Game.stage.name;
  };

/* 點擊空白取消選取 */
document.getElementById('battle-grid').addEventListener('click', function(ev) {
  if (ev.target === this) {
    UI.hideUnitTooltip();
    UI.hideHoverRange();
    UI.selectedUnitIdx = -1;
    UI.selectedWaitingIdx = -1;
    UI._clearDeployHighlights();
    UI._clearMergeHighlights();
    UI.renderBattle();
    UI.renderWaitingArea();
  }
});
document.getElementById('battle-grid').addEventListener('touchstart', function(ev) {
    if (ev.target === this || ev.target.classList.contains('path') || ev.target.classList.contains('blocked') || ev.target.classList.contains('buildable') || ev.target.classList.contains('occupied')) {
      var isInteract = ev.target.classList.contains('buildable') || ev.target.classList.contains('occupied');
      if (isInteract && UI.selectedUnitIdx >= 0) { return; }
      if (isInteract && UI.selectedWaitingIdx >= 0) { return; }
      if (isInteract && UI.dragData) { return; }
      UI.hideUnitTooltip();
      UI.hideHoverRange();
      if (!isInteract) {
        UI.selectedUnitIdx = -1;
        UI.selectedWaitingIdx = -1;
        UI._clearDeployHighlights();
        UI._clearMergeHighlights();
        UI.renderBattle();
        UI.renderWaitingArea();
      }
    }
});
