  /* ===== 武將管理 ===== */
UI.showHeroes = function() {
    this.showScreen('screen-heroes');
    Service.autoFillDeploy();
    this.sortMode = 'tier';
    this.deployTargetSlot = -1;
    this.filterFaction = '';
    this.filterType = '';
    this.filterRarity = '';
    this.renderHeroList();
    this._updateScrollTopBtn();
    Game.state = 'heroes';
  };


UI.renderHeroList = function() {
    var container = document.getElementById('heroes-list');
    container.innerHTML = '';
    container.scrollTop = 0;
    var d = Service.appData;
    if (d.ownedHeroes.length === 0) {
      container.innerHTML = '<div style="text-align:center;padding:40px;color:#6a5a4a;">尚無武將，快去招募！</div>';
      return;
    }

    var self = this;
    var deployed = Service.getDeployedHeroes();

    /* --- 上陣欄位（6格） --- */
    var slotRow = document.createElement('div');
    slotRow.className = 'deploy-slots';
    for (var i = 0; i < 6; i++) {
      var slot = document.createElement('div');
      slot.className = 'deploy-slot';
      if (i < deployed.length) {
        var hd = getHeroData(deployed[i]);
        if (hd) {
          var wType = HERO_WEAPON[hd.type] || '';
          var wLabel = WEAPON_TYPE_LABELS[wType] || '';
          slot.innerHTML = '<span class="ds-emoji">' + hd.emoji + '</span><span class="ds-name">' + hd.name + '<span class="ds-type">' + wLabel + '</span></span>';
          slot.dataset.heroId = deployed[i];
        }
      } else {
        slot.innerHTML = '<span class="ds-empty">空</span>';
      }
      if (d.ownedHeroes.length > 6 && i < deployed.length) {
        (function(slotEl, hid) {
          slotEl.onclick = function(ev) {
            ev.stopPropagation();
            Service.toggleDeploy(hid);
            self.renderHeroList();
          };
        })(slot, deployed[i]);
      }
      slotRow.appendChild(slot);
    }
    container.appendChild(slotRow);

    /* --- 上陣確認 / 一鍵上陣（僅 >6 時顯示） --- */
    if (d.ownedHeroes.length > 6) {
      var confirmBar = document.createElement('div');
      confirmBar.className = 'deploy-confirm-bar';
      if (deployed.length < 6) {
        confirmBar.innerHTML = '<span class="deploy-hint">上陣 ' + deployed.length + '/6</span>';
        var autoBtn = document.createElement('div');
        autoBtn.className = 'deploy-confirm-btn';
        autoBtn.textContent = '⚔ 一鍵上陣';
        autoBtn.onclick = function() {
          Service.autoFillDeploy();
          self.renderHeroList();
          self.showToast('已以武力排序自動補滿上陣！');
        };
        confirmBar.appendChild(autoBtn);
        if (deployed.length > 0) {
          var clearBtn = document.createElement('div');
          clearBtn.className = 'deploy-confirm-btn deploy-clear-btn';
          clearBtn.textContent = '✕ 全部取消';
          clearBtn.onclick = function() {
            Service.clearDeploy();
            self.renderHeroList();
            self.showToast('已取消全部上陣！');
          };
          confirmBar.appendChild(clearBtn);
        }
      } else {
        confirmBar.innerHTML = '<span class="deploy-hint">點擊已上陣武將取消，點擊未上陣武將上陣</span>';
        var confirmBtn = document.createElement('div');
        confirmBtn.className = 'deploy-confirm-btn';
        confirmBtn.textContent = '✓ 確認上陣';
        confirmBtn.onclick = function() {
          self.showToast('上陣陣容已更新！');
          self.renderHeroList();
        };
        confirmBar.appendChild(confirmBtn);
      }
      if (deployed.length >= 2) {
        var synergyInfo = self.getDeployedSynergySummary(deployed);
        if (synergyInfo) {
          var synDiv = document.createElement('div');
          synDiv.className = 'deploy-synergy-info';
          synDiv.innerHTML = synergyInfo;
          confirmBar.appendChild(synDiv);
        }
      }
      container.appendChild(confirmBar);
    }

    /* --- 總戰力（含加乘） --- */
    if (deployed.length > 0) {
      var bonuses = Service.getDeployedSynergyBonuses(deployed);
      var totalWithSynergy = 0;
      for (var si = 0; si < deployed.length; si++) {
        var shd = getHeroData(deployed[si]);
        if (!shd) continue;
        var stag = Service.getHeroTier(deployed[si]);
        var sstar = Service.getHeroStar(deployed[si]);
        var sw = Service.getWeapon(deployed[si]);
        var heroAtkPct = bonuses.atkPct;
        var heroHpPct = 0;
        for (var bi = 0; bi < bonuses.bonds.length; bi++) {
          if (bonuses.bonds[bi].members.indexOf(deployed[si]) !== -1) {
            heroAtkPct += bonuses.bonds[bi].atkPct;
            heroHpPct += bonuses.bonds[bi].hpPct;
          }
        }
        totalWithSynergy += getHeroScoreWithSynergy(shd, stag, sstar, sw, heroAtkPct, heroHpPct);
      }
      var totalDiv = document.createElement('div');
      totalDiv.className = 'deploy-total-score';
      var bonusLabel = '';
      if (bonuses.atkPct > 0 || bonuses.bonds.length > 0) {
        bonusLabel = '（必然ATK+' + bonuses.atkPct + '%';
        var bondAtk = 0, bondHp = 0;
        for (var bi2 = 0; bi2 < bonuses.bonds.length; bi2++) {
          bondAtk += bonuses.bonds[bi2].atkPct;
          bondHp += bonuses.bonds[bi2].hpPct;
        }
        if (bondAtk > 0) bonusLabel += ' 限定ATK+' + bondAtk + '%';
        if (bondHp > 0) bonusLabel += ' HP+' + bondHp + '%';
        bonusLabel += '）';
      }
      totalDiv.innerHTML = '⚔ 總戰力 <span class="total-score-num">' + totalWithSynergy + '</span> 分 ' + bonusLabel;
      container.appendChild(totalDiv);
    }

    /* --- 篩選按鈕 --- */
    var filterRow = document.createElement('div');
    filterRow.className = 'filter-row';

    var filterGroups = [
      { key:'filterFaction', label:'陣營', options:[{id:'',label:'全部'},{id:'蜀',label:'蜀'},{id:'魏',label:'魏'},{id:'吳',label:'吳'},{id:'群',label:'群'}] },
      { key:'filterType', label:'兵種', options:[{id:'',label:'全部'},{id:'warrior',label:'刀'},{id:'spearman',label:'槍'},{id:'archer',label:'弓'},{id:'horse',label:'騎'},{id:'mage',label:'法'},{id:'healer',label:'僧'}] },
      { key:'filterRarity', label:'軍階', options:[{id:'',label:'全部'},{id:'1',label:'良'},{id:'2',label:'優'},{id:'3',label:'名將'},{id:'4',label:'傳說'},{id:'5',label:'無雙'}] }
    ];
    for (var fi = 0; fi < filterGroups.length; fi++) {
      (function(fg) {
        var group = document.createElement('span');
        group.className = 'filter-group';
        var label = document.createElement('span');
        label.className = 'filter-label';
        label.textContent = fg.label;
        group.appendChild(label);
        for (var oi = 0; oi < fg.options.length; oi++) {
          (function(opt) {
            var btn = document.createElement('span');
            btn.className = 'filter-btn' + ((self[fg.key] || '') === opt.id ? ' active' : '');
            btn.textContent = opt.label;
            btn.onclick = function() {
              self[fg.key] = (self[fg.key] === opt.id && opt.id !== '') ? '' : opt.id;
              self.renderHeroList();
            };
            group.appendChild(btn);
          })(fg.options[oi]);
        }
        filterRow.appendChild(group);
      })(filterGroups[fi]);
    }
    container.appendChild(filterRow);

    /* --- 排列按鈕 --- */
    var sortRow = document.createElement('div');
    sortRow.className = 'sort-row';
    var sortModes = [
      { id:'tier', label:'現軍階' },
      { id:'rarity', label:'原軍階' },
      { id:'score', label:'戰力' },
      { id:'faction', label:'陣營' },
      { id:'type', label:'兵種' }
    ];
    for (var si = 0; si < sortModes.length; si++) {
      (function(sm) {
        var btn = document.createElement('span');
        btn.className = 'sort-btn' + (self.sortMode === sm.id ? ' active' : '');
        btn.textContent = sm.label;
        btn.onclick = function() { self.sortMode = sm.id; self.renderHeroList(); };
        sortRow.appendChild(btn);
      })(sortModes[si]);
    }
    container.appendChild(sortRow);

    /* --- 武將列表（可排列） --- */
    var sorted = d.ownedHeroes.slice();

    /* 套用篩選 */
    if (this.filterFaction) {
      sorted = sorted.filter(function(hid) {
        var hd = getHeroData(hid);
        return hd && hd.faction === self.filterFaction;
      });
    }
    if (this.filterType) {
      sorted = sorted.filter(function(hid) {
        var hd = getHeroData(hid);
        return hd && hd.type === self.filterType;
      });
    }
    if (this.filterRarity) {
      sorted = sorted.filter(function(hid) {
        var hd = getHeroData(hid);
        return hd && String(hd.rarity) === self.filterRarity;
      });
    }

    if (this.sortMode === 'tier') {
      sorted.sort(function(a, b) {
        var ta = Service.getHeroTier(a), tb = Service.getHeroTier(b);
        if (ta !== tb) return tb - ta;
        var sa = Service.getHeroStar(a), sb = Service.getHeroStar(b);
        return sb - sa;
      });
    } else if (this.sortMode === 'rarity') {
      sorted.sort(function(a, b) {
        var ha = getHeroData(a), hb = getHeroData(b);
        var ra = ha ? ha.rarity : 0, rb = hb ? hb.rarity : 0;
        if (ra !== rb) return rb - ra;
        return (hb ? hb.baseAtk : 0) - (ha ? ha.baseAtk : 0);
      });
    } else if (this.sortMode === 'score') {
      sorted.sort(function(a, b) {
        var ha = getHeroData(a), hb = getHeroData(b);
        if (!ha) return 1; if (!hb) return -1;
        var ta = Service.getHeroTier(a), tb = Service.getHeroTier(b);
        var sa = Service.getHeroStar(a), sb = Service.getHeroStar(b);
        return getHeroScore(hb, tb, sb, Service.getWeapon(b)) - getHeroScore(ha, ta, sa, Service.getWeapon(a));
      });
    } else if (this.sortMode === 'faction') {
      var factionOrder = { '蜀':0, '魏':1, '吳':2, '群':3 };
      sorted.sort(function(a, b) {
        var ha = getHeroData(a), hb = getHeroData(b);
        var fa = ha ? (factionOrder[ha.faction] || 99) : 99;
        var fb = hb ? (factionOrder[hb.faction] || 99) : 99;
        if (fa !== fb) return fa - fb;
        return (hb ? hb.baseAtk : 0) - (ha ? ha.baseAtk : 0);
      });
    } else if (this.sortMode === 'type') {
      var typeOrder = { warrior:0, spearman:1, archer:2, horse:3, mage:4, healer:5 };
      sorted.sort(function(a, b) {
        var ha = getHeroData(a), hb = getHeroData(b);
        var ta2 = ha ? (typeOrder[ha.type] || 99) : 99;
        var tb2 = hb ? (typeOrder[hb.type] || 99) : 99;
        if (ta2 !== tb2) return ta2 - tb2;
        return (hb ? hb.baseAtk : 0) - (ha ? ha.baseAtk : 0);
      });
    }

    for (var i = 0; i < sorted.length; i++) {
      var hid = sorted[i];
      var hd = getHeroData(hid);
      if (!hd) continue;
      var tier = Service.getHeroTier(hid);
      var star = Service.getHeroStar(hid);
      var frags = Service.getHeroFrags(hid);
      var deployed2 = Service.isDeployed(hid);
      var tm = 1.0 + star * (PROMO_STAR[tier] || 0);
      var canToggle = d.ownedHeroes.length > 6 && (deployed2 || Service.getDeployedHeroes().length < 6);
      var tierShow = TIER_NAMES[tier] + (tier >= 4 && star > 0 ? '+' + star + '⭐' : '');
      var lv = (Service.appData.heroLevel && Service.appData.heroLevel[hid]) || 0;
      var exp = (Service.appData.heroExp && Service.appData.heroExp[hid]) || 0;
      var nextLvCost = lv >= 20 ? 0 : (lv || 1) * 100;
      var globalLvBonus = 1 + lv * 0.02;

      var card = document.createElement('div');
      card.className = 'hero-card' + (deployed2 ? '' : ' not-deployed');

      var nextPromo = getNextPromotion(hd.rarity, tier, star);
      var nextCost = nextPromo ? nextPromo.cost : 3;
      var fragBar = document.createElement('div');
      fragBar.className = 'frag-bar';
      var pct = nextCost ? Math.min(frags / nextCost * 100, 100) : 100;
      fragBar.innerHTML = '<div class="frag-fill" style="width:' + pct + '%;background:' + TIER_COLORS[tier] + ';"></div>';

      var fragLabel = document.createElement('div');
      fragLabel.className = 'frag-label';
      fragLabel.textContent = frags + '/' + nextCost + ' 碎片' + (nextPromo && frags >= nextCost ? ' ✨可晉升！' : '');

      var bondsHtml = '';
      for (var bi = 0; bi < BOND_DATA.length; bi++) {
        var bd = BOND_DATA[bi];
        if (bd.type === 'bond' && bd.members.indexOf(hid) !== -1) {
          var memberNames = [];
          for (var mi = 0; mi < bd.members.length; mi++) {
            var mhd = getHeroData(bd.members[mi]);
            memberNames.push(mhd ? mhd.emoji + mhd.name : bd.members[mi]);
          }
          var tip = bd.name + '\n' + memberNames.join(' + ') + '\n';
          if (bd.atkPct) tip += '攻擊 +' + bd.atkPct + '%';
          if (bd.atkPct && bd.hpPct) tip += '  ';
          if (bd.hpPct) tip += '生命 +' + bd.hpPct + '%';
          bondsHtml += '<span class="hc-bond" data-tooltip="' + tip.replace(/"/g, '&quot;') + '">' + bd.name + '</span> ';
        }
      }

      var cardBody = document.createElement('div');
      cardBody.className = 'hc-body';
      cardBody.innerHTML =
        '<div class="hc-emoji">' + hd.emoji + '</div>' +
        '<div class="hc-info">' +
           '<div class="hc-name-row"><span class="hc-name">' + hd.name + '</span><span class="hc-lv" style="color:#3498db;font-weight:bold;font-size:13px;margin-left:4px;">Lv.' + lv + '</span><span class="hc-faction">[' + (FACTION_LABELS[hd.faction] || hd.faction) + ']</span><span class="hc-original-rarity" data-tip="原軍階" style="color:' + RARITY_COLORS[hd.rarity] + ';">' + RARITY_NAMES[hd.rarity] + '</span><span class="hc-rarity" data-tip="現軍階" style="color:' + TIER_COLORS[tier] + ';">' + tierShow + '</span><span class="hc-score">戰力 ' + getHeroScore(hd, tier, star, Service.getWeapon(hid)) + '分</span></div>' +
           '<div class="hc-stats">' +
             (function() {
               var _w = Service.getWeapon(hid);
               var _wAtkMult = (_w && _w.type === Service.getHeroWeaponType(hd)) ? (1 + (_w.atkPct || 0) / 100) : 1;
               var _wHpMult = (_w && _w.type === Service.getHeroWeaponType(hd)) ? (1 + (_w.hpPct || 0) / 100) : 1;
               var _wSpd = (_w && _w.type === Service.getHeroWeaponType(hd)) ? (_w.spd || 0) : 0;
               var _baseAs = SOLDIER_TYPES[HERO_WEAPON[hd.type]] ? SOLDIER_TYPES[HERO_WEAPON[hd.type]].atkSpeed : 1;
               var _wt = HERO_WEAPON[hd.type];
               var _std = STANDARD_STATS[_wt];
               var _offAtk = hd.baseAtk - _std.atk[hd.rarity];
               var _offDef = hd.baseDef - _std.def[hd.rarity];
               var _offHp = hd.baseHp - _std.hp[hd.rarity];
                var _effAtk = (_std.atk[tier] + _offAtk) * tm * globalLvBonus;
                var _effDef = (_std.def[tier] + _offDef) * tm * globalLvBonus;
                var _effHp = (_std.hp[tier] + _offHp) * tm * globalLvBonus;
               return '⚔️' + Math.floor(_effAtk * _wAtkMult) +
                 ' 🛡' + Math.floor(_effDef) +
                 ' ❤' + Math.floor(_effHp * _wHpMult) +
                 ' 🎯' + (SOLDIER_TYPES[HERO_WEAPON[hd.type]] ? SOLDIER_TYPES[HERO_WEAPON[hd.type]].range : '?') +
                 ' 🏃' + (_baseAs + (tier - 1) * 0.1 + _wSpd).toFixed(2) + '次/秒';
             })() +
           '</div>' +
           (function() { var _w = Service.getWeapon(hid); if (!_w) return '<div class="hc-weapon">' + getWeaponAttackStr(HERO_WEAPON[hd.type]) + ' ' + hd.desc + '</div>'; var _qn = WEAPON_QUALITY[_w.quality] ? WEAPON_QUALITY[_w.quality].name : '?'; var _qc = WEAPON_QUALITY[_w.quality] ? WEAPON_QUALITY[_w.quality].color : '#888'; var _wt = WEAPON_TYPE_LABELS[_w.type] || '?'; var _s = '<span style="color:' + _qc + ';font-weight:bold;">[' + _qn + _wt + ']</span> ⚔+' + _w.atkPct + '%'; if (_w.hpPct) _s += ' ❤+' + _w.hpPct + '%'; if (_w.spd) _s += ' 🏃+' + (_w.spd || 0).toFixed(2); return '<div class="hc-weapon">' + _s + '</div>'; })() +
           (bondsHtml ? '<div class="hc-bonds">' + bondsHtml + '</div>' : '') +
            (hd.skill ? '<div class="hc-skill" style="margin-top:4px;font-size:12px;color:#ffd700;">\u2726\u5927\u62db \u3010' + hd.skill.name + '\u3011: ' + hd.skill.desc + ' (CD: ' + hd.skill.cd + '\u79d2)</div>' : '') +
         '</div>';

      var expBar = document.createElement('div');
      expBar.className = 'frag-bar';
      var expPct = nextLvCost ? Math.min(exp / nextLvCost * 100, 100) : 100;
      expBar.innerHTML = '<div class="frag-fill" style="width:' + expPct + '%;background:#3498db;"></div>';

      var expLabel = document.createElement('div');
      expLabel.className = 'frag-label';
      expLabel.textContent = '等級: ' + lv + '/20 經驗值: ' + exp + (nextLvCost ? '/' + nextLvCost : ' (已滿級)');

      var info = cardBody.querySelector('.hc-info');
      info.appendChild(fragBar);
      info.appendChild(fragLabel);
      info.appendChild(expBar);
      info.appendChild(expLabel);
      card.appendChild(cardBody);

      /* 上陣/下陣按鈕 */
      if (canToggle) {
        var deployBtn = document.createElement('button');
        deployBtn.className = 'hc-deploy-btn' + (deployed2 ? ' deployed' : '');
        deployBtn.textContent = deployed2 ? '下陣' : '上陣';
        (function(id) {
          deployBtn.onclick = function(ev) {
            ev.stopPropagation();
            Service.toggleDeploy(id);
            self.renderHeroList();
          };
        })(hid);
        card.appendChild(deployBtn);
      }

      container.appendChild(card);
    }

    /* --- 未上陣提示（>6 且格未滿） --- */
    if (d.ownedHeroes.length > 6 && deployed.length < 6) {
      var hint = document.createElement('div');
      hint.className = 'deploy-hint-bottom';
      hint.textContent = '尚需 ' + (6 - deployed.length) + ' 名武將上陣（共需 6 名）';
      container.appendChild(hint);
    }
  };

UI.getDeployedSynergySummary = function(deployed) {
    var typeCount = {}, rarityCount = {}, factionCount = {};
    for (var i = 0; i < deployed.length; i++) {
      var hd = getHeroData(deployed[i]);
      if (!hd) continue;
      typeCount[hd.type] = (typeCount[hd.type] || 0) + 1;
      rarityCount[hd.rarity] = (rarityCount[hd.rarity] || 0) + 1;
      factionCount[hd.faction] = (factionCount[hd.faction] || 0) + 1;
    }
    var lines = [];
    var distinctTypes = Object.keys(typeCount).length;
    if (distinctTypes >= 3) lines.push('<span class="synergy-tag auto" data-tip="全員生效">【必然】</span>不同兵種≥' + distinctTypes + '種 → ATK+' + (2 * distinctTypes - 2) + '%');
    var rarityMax = 0;
    for (var r in rarityCount) { if (rarityCount[r] > rarityMax) rarityMax = rarityCount[r]; }
    if (rarityMax >= 3) lines.push('<span class="synergy-tag auto" data-tip="全員生效">【必然】</span>同原軍階≥' + rarityMax + '人 → ATK+' + (4 + rarityMax * 2) + '%');
    var distinctRarities = Object.keys(rarityCount).length;
    if (distinctRarities >= 5) lines.push('<span class="synergy-tag auto" data-tip="全員生效">【必然】</span>原軍階都不同≥5人 → ATK+' + DISTINCT_RARITY_BONUS_ATK + '%');
    var factionMax = 0;
    for (var f in factionCount) { if (factionCount[f] > factionMax) factionMax = factionCount[f]; }
    if (factionMax >= 3) lines.push('<span class="synergy-tag auto" data-tip="全員生效">【必然】</span>同陣營≥' + factionMax + '人 → 全體ATK+' + (4 + 2 * factionMax) + '%');
    for (var b = 0; b < BOND_DATA.length; b++) {
      var bond = BOND_DATA[b];
      if (bond.type !== 'bond') continue;
      var allOk = true;
      for (var m = 0; m < bond.members.length; m++) {
        if (deployed.indexOf(bond.members[m]) === -1) { allOk = false; break; }
      }
      if (allOk) {
        var s = '<span class="synergy-tag limited" data-tip="只有限定成員生效">【限定】</span>' + bond.name;
        if (bond.atkPct) s += ' ATK+' + bond.atkPct + '%';
        if (bond.hpPct) s += ' HP+' + bond.hpPct + '%';
        lines.push(s);
      }
    }
    return lines.length > 0 ? lines.join('<br>') : '';
  };
