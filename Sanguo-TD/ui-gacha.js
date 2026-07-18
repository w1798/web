UI.showGacha = function() {
    this.showScreen('screen-gacha');
    var isWeaponMode = Service.allHeroesMaxed();
    document.querySelector('#screen-gacha .screen-header h2').textContent = isWeaponMode ? '⚒️ 打鐵鍛造' : '武將招募(全角滿星，改為「打鐵鍛造」)';
    var menuBtn = document.querySelector('#screen-menu .menu-btns .btn-secondary');
    if (menuBtn) menuBtn.textContent = isWeaponMode ? '⚒️ 打 鐵' : '📜 招 募';
    this.renderGacha();
    this._updateScrollTopBtn();
    Game.state = 'gacha';
  };

UI.renderGacha = function() {
    var d = Service.appData;
    document.getElementById('gacha-gold').textContent = d.gold;

    var isWeaponMode = Service.allHeroesMaxed();

    var btn = document.getElementById('btn-gacha');
    if (btn) {
      btn.innerHTML = isWeaponMode ? '<span class="gacha-btn-count">×1</span><span class="gacha-btn-cost">100 金</span>' : '<span class="gacha-btn-count">×1</span><span class="gacha-btn-cost">10 金</span>';
      var minGold = isWeaponMode ? 100 : 10;
      btn.disabled = !DEV_MODE && d.gold < minGold;
      btn.style.opacity = !DEV_MODE && d.gold < minGold ? '0.5' : '1';
    }
    var btn10 = document.getElementById('btn-gacha10');
    if (btn10) {
      btn10.innerHTML = isWeaponMode ? '<span class="gacha-btn-count">×10</span><span class="gacha-btn-cost">1000 金</span>' : '<span class="gacha-btn-count">×10</span><span class="gacha-btn-cost">100 金</span>';
      var minGold10 = isWeaponMode ? 1000 : 100;
      btn10.disabled = !DEV_MODE && d.gold < minGold10;
      btn10.style.opacity = !DEV_MODE && d.gold < minGold10 ? '0.5' : '1';
    }
    var btn100 = document.getElementById('btn-gacha100');
    if (btn100) {
      btn100.innerHTML = isWeaponMode ? '<span class="gacha-btn-count">×100</span><span class="gacha-btn-cost">10000 金</span>' : '<span class="gacha-btn-count">×100</span><span class="gacha-btn-cost">1000 金</span>';
      var minGold100 = isWeaponMode ? 10000 : 1000;
      btn100.disabled = !DEV_MODE && d.gold < minGold100;
      btn100.style.opacity = !DEV_MODE && d.gold < minGold100 ? '0.5' : '1';
    }

    var container = document.getElementById('gacha-heroes');
    if (!container) return;
    container.innerHTML = '';
    container.closest('.gacha-content').scrollTop = 0;

    if (isWeaponMode) {
      var sec = document.createElement('div');
      sec.className = 'gacha-section';
      sec.innerHTML = '<div class="gacha-section-header">武器機率</div>' +
        '<div class="gacha-pool-grid">' +
          '<div style="color:#ffd700;padding:8px;font-size:14px;">🌟黃 3%</div>' +
          '<div style="color:#9b59b6;padding:8px;font-size:14px;">🔮 紫 7%</div>' +
          '<div style="color:#3498db;padding:8px;font-size:14px;">🔵 藍 40%</div>' +
          '<div style="color:#b0b0b0;padding:8px;font-size:14px;">⚪ 白 50%</div>' +
        '</div>';
      container.appendChild(sec);
      return;
    }

    var rates = [
      { rarity: 5, label: '無雙', pct: '1%', color: '#ffd700' },
      { rarity: 4, label: '傳說', pct: '5%', color: '#9b59b6' },
      { rarity: 3, label: '名將', pct: '14%', color: '#3498db' },
      { rarity: 2, label: '優', pct: '30%', color: '#2ecc71' },
      { rarity: 1, label: '良', pct: '50%', color: '#8a8a8a' }
    ];

    var self = this;
    for (var r = 0; r < rates.length; r++) {
      var rd = rates[r];
      var list = [];
      for (var hi = 0; hi < HERO_DATA.length; hi++) {
        if (HERO_DATA[hi].rarity === rd.rarity) list.push(HERO_DATA[hi]);
      }
      if (list.length === 0) continue;

      var sec = document.createElement('div');
      sec.className = 'gacha-section';

      var hdr = document.createElement('div');
      hdr.className = 'gacha-section-header';
      hdr.innerHTML = '<span style="color:' + rd.color + ';">' + rd.label + '</span><span class="gacha-rate">' + rd.pct + '</span>';
      sec.appendChild(hdr);

      var grid = document.createElement('div');
      grid.className = 'gacha-pool-grid';
      for (var j = 0; j < list.length; j++) {
        (function(hero, rateData) {
          var card = document.createElement('div');
          card.className = 'gacha-pool-card rarity-' + hero.rarity;
          var owned = Service.hasHero(hero.id);
          if (owned) card.classList.add('owned');
          card.innerHTML = '<div class="gpc-emoji">' + hero.emoji + '</div><div class="gpc-name">' + hero.name + '</div><div class="gpc-atk">' + (ATTACK_ICON[hero.type] || '⚔️') + '</div>' +
            (owned ? '<div class="gpc-owned">✓ 已有</div>' : '<div class="gpc-new">✧ 未得</div>');
          card.onclick = function() { self.showGachaHeroInfo(hero, rateData); };
          grid.appendChild(card);
        })(list[j], rd);
      }
      sec.appendChild(grid);
      container.appendChild(sec);
    }
  };

UI.showGachaHeroInfo = function(hero, rateInfo) {
    var old = document.getElementById('gacha-hero-panel');
    if (old) old.remove();

    var weaponLabel = getWeaponAttackStr(HERO_WEAPON[hero.type]);
    var heroRange = SOLDIER_TYPES[HERO_WEAPON[hero.type]] ? SOLDIER_TYPES[HERO_WEAPON[hero.type]].range : 1;
    var heroSpd = SOLDIER_TYPES[HERO_WEAPON[hero.type]] ? (SOLDIER_TYPES[HERO_WEAPON[hero.type]].atkSpeed + (hero.rarity - 1) * 0.1).toFixed(2) : '1.00';

    var panel = document.createElement('div');
    panel.id = 'gacha-hero-panel';
    panel.className = 'gacha-hero-panel';
    panel.innerHTML =
      '<div class="ghp-close" id="ghp-close">✕</div>' +
      '<div style="font-size:13px;color:#b8a898;margin-bottom:4px;">— 武將資訊 —</div>' +
      '<div class="ghp-emoji">' + hero.emoji + '</div>' +
      '<div class="ghp-name" style="color:' + RARITY_COLORS[hero.rarity] + ';">' + hero.name + '</div>' +
      '<div class="ghp-faction">所屬：' + hero.faction + '</div>' +
      '<div class="ghp-rarity">' + rateInfo.label + '（' + rateInfo.pct + '）</div>' +
      '<div class="ghp-atk-type">' + weaponLabel + '</div>' +
      '<div class="ghp-desc">' + hero.desc + '</div>' +
      '<div class="ghp-stats">' +
        '<div>⚔️ 攻擊 ' + hero.baseAtk + '</div>' +
        '<div>❤️ 生命 ' + hero.baseHp + '</div>' +
        '<div>🛡️ 防禦 ' + hero.baseDef + '</div>' +
        '<div>🎯 範圍 ' + heroRange + '</div>' +
        '<div>🏃 攻速 ' + heroSpd + '次/秒</div>' +
      '</div>';
    document.body.appendChild(panel);

    document.getElementById('ghp-close').onclick = function() { panel.remove(); };
    panel.onclick = function(ev) { if (ev.target === panel) panel.remove(); };
  };


UI.doGacha = function() {
    if (Service.allHeroesMaxed()) { this.doWeaponGacha(); return; }
    this._handleGachaResult(Service.doGacha());
  };

UI.doGacha10 = function() {
    if (Service.allHeroesMaxed()) { this.doWeaponGacha10(); return; }
    this._handleMultiGachaResult(Service.doMultiGacha(10), 10);
  };

UI.doGacha100 = function() {
    if (Service.allHeroesMaxed()) { this.doWeaponGacha100(); return; }
    this._handleMultiGachaResult(Service.doMultiGacha(100), 100);
  };

UI._handleGachaResult = function(result) {
    if (!result) { this.showToast('金幣不足！'); return; }
    var d = Service.appData;
    document.getElementById('gacha-gold').textContent = d.gold;
    var container = document.getElementById('gacha-result');
    if (!container) return;
    var h = result.hero;
    var label = RARITY_NAMES[h.rarity];
    var color = RARITY_COLORS[h.rarity];
    var upgradeHtml = '';
    if (result.upgradeInfo) {
      if (result.upgradeInfo.upgraded) {
        upgradeHtml = '<div class="gc-frag" style="color:#2ecc71;">⬆ ' + result.upgradeInfo.msg + '</div>';
      } else {
        upgradeHtml = '<div class="gc-frag" style="color:#e67e22;">+1 碎片</div>';
      }
    }
    var html = '<div class="gacha-card rarity-' + h.rarity + '" style="border:2px solid ' + color + ';">' +
      '<div class="gc-emoji">' + h.emoji + '</div>' +
      '<div class="gc-name" style="color:' + color + ';">' + h.name + '</div>' +
      '<div class="gc-rarity">' + label + '</div>' +
      (result.isNew ? '<div class="gc-new">✧ 新武將！</div>' : upgradeHtml) +
      '</div>';
    container.innerHTML = html;
    this.renderGacha();
  };

UI._handleMultiGachaResult = function(results, count) {
    if (!results || results.length === 0) { this.showToast('金幣不足！'); return; }
    var d = Service.appData;
    document.getElementById('gacha-gold').textContent = d.gold;
    var container = document.getElementById('gacha-result');
    if (!container) return;
    var counts = {}, newCount = 0, upgrades = [];
    for (var i = 0; i < results.length; i++) {
      var r = results[i];
      if (!r) continue;
      var rn = RARITY_NAMES[r.hero.rarity] || '?';
      counts[rn] = (counts[rn] || 0) + 1;
      if (r.isNew) {
        newCount++;
      } else if (r.upgradeInfo && r.upgradeInfo.upgraded) {
        upgrades.push(r.hero.emoji + r.hero.name + ' ' + r.upgradeInfo.msg);
      }
    }
    var parts = [];
    var order = ['無雙','傳說','名將','優','良'];
    for (var i = 0; i < order.length; i++) {
      if (counts[order[i]]) parts.push(order[i] + ':' + counts[order[i]] + '人');
    }
    var html = '<div style="padding:12px;color:#f0e6d0;font-size:15px;line-height:1.8;">' +
      parts.join('　');
    if (newCount > 0) html += '<br><span style="color:#2ecc71;">✧ 新武將 ' + newCount + ' 隻</span>';
    if (upgrades.length > 0) html += '<br><span style="color:#e67e22;">⬆ ' + upgrades.join('、') + '</span>';
    html += '</div>';
    container.innerHTML = html;
    this.renderGacha();
  };

UI.doWeaponGacha = function() {
    var w = Service.doWeaponGacha ? Service.doWeaponGacha() : null;
    if (!w) { this.showToast('金幣不足！'); return; }
    var d = Service.appData;
    document.getElementById('gacha-gold').textContent = d.gold;
    var qn = WEAPON_QUALITY[w.quality] ? WEAPON_QUALITY[w.quality].name : '?';
    var qc = WEAPON_QUALITY[w.quality] ? WEAPON_QUALITY[w.quality].color : '#888';
    var wt = WEAPON_TYPE_LABELS[w.type] || '?';
    var container = document.getElementById('gacha-result');
    if (!container) return;
    container.innerHTML = '<div class="gacha-card" style="border:2px solid ' + qc + ';">' +
      '<div class="gc-rarity" style="color:' + qc + ';">[' + qn + wt + ']</div>' +
      '<div class="gc-name">⚔+' + w.atkPct + '%' + (w.hpPct ? ' ❤+' + w.hpPct + '%' : '') + (w.spd ? ' 🏃+' + (w.spd || 0).toFixed(2) : '') + '</div>' +
      '</div>';
    this.renderGacha();
  };

UI.doWeaponGacha10 = function() {
    var ws = Service.doMultiWeaponGacha ? Service.doMultiWeaponGacha(10) : [];
    if (ws.length === 0) { this.showToast('金幣不足！'); return; }
    var d = Service.appData;
    document.getElementById('gacha-gold').textContent = d.gold;
    var container = document.getElementById('gacha-result');
    if (!container) return;
    var counts = {};
    for (var i = 0; i < ws.length; i++) {
      var w = ws[i];
      if (!w) continue;
      var qn = WEAPON_QUALITY[w.quality] ? WEAPON_QUALITY[w.quality].name : '?';
      counts[qn] = (counts[qn] || 0) + 1;
    }
    var parts = [];
    var order = ['黃','紫','藍','白'];
    for (var i = 0; i < order.length; i++) {
      if (counts[order[i]]) parts.push(order[i] + ':' + counts[order[i]] + '把');
    }
    container.innerHTML = '<div style="padding:12px;color:#f0e6d0;font-size:15px;line-height:1.8;">' +
      parts.join('　') +
      '</div>';
    this.renderGacha();
  };

UI.doWeaponGacha100 = function() {
    var ws = Service.doMultiWeaponGacha ? Service.doMultiWeaponGacha(100) : [];
    if (ws.length === 0) { this.showToast('金幣不足！'); return; }
    var d = Service.appData;
    document.getElementById('gacha-gold').textContent = d.gold;
    var container = document.getElementById('gacha-result');
    if (!container) return;
    var counts = {};
    for (var i = 0; i < ws.length; i++) {
      var w = ws[i];
      if (!w) continue;
      var qn = WEAPON_QUALITY[w.quality] ? WEAPON_QUALITY[w.quality].name : '?';
      counts[qn] = (counts[qn] || 0) + 1;
    }
    var parts = [];
    var order = ['黃','紫','藍','白'];
    for (var i = 0; i < order.length; i++) {
      if (counts[order[i]]) parts.push(order[i] + ':' + counts[order[i]] + '把');
    }
    container.innerHTML = '<div style="padding:12px;color:#f0e6d0;font-size:15px;line-height:1.8;">' +
      parts.join('　') +
      '</div>';
    this.renderGacha();
  };
