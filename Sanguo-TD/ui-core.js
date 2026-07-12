/* ===== UI 層：渲染、事件、畫面切換 ===== */
var UI = {
  gridEl: null,
  cellSize: 0,
  gridOffsetX: 0,
  gridOffsetY: 0,
  selectedInfoUnit: null,
  selectedWaitingIdx: -1,
  selectedUnitIdx: -1,
  dragData: null,

  init: function() {
    Service.loadData();
    Service.getStamina();
    Sound.init();
    this.showMenu();
    Game.start();
    this.updateMenuInfo();

    var self = this;
    document.addEventListener('touchmove', function(e) {
      if (document.querySelector('.drag-ghost')) e.preventDefault();
    }, {passive: false});
    document.addEventListener('click', function(ev) {
      if (!ev.target.closest('.grid-unit') && !ev.target.closest('.waiting-card') && !ev.target.closest('.recruit-btn') && !ev.target.closest('.unit-stats-panel') && !ev.target.closest('.unit-actions')) {
        UI.hideUnitInfo();
        if (UI.selectedWaitingIdx >= 0 || UI.selectedUnitIdx >= 0) {
          UI.selectedWaitingIdx = -1;
          UI.selectedUnitIdx = -1;
          UI.renderBattle();
          UI.renderWaitingArea();
        }
      }
    });
  },

  /* ===== 畫面切換 ===== */
  showScreen: function(id) {
    var all = document.querySelectorAll('.screen');
    for (var i = 0; i < all.length; i++) all[i].classList.remove('active');
    var el = document.getElementById(id);
    if (el) el.classList.add('active');
  },

  showMenu: function() {
    this.showScreen('screen-menu');
    this.updateMenuInfo();
    Game.state = 'menu';
  },

  showCampaign: function() {
    this.showScreen('screen-campaign');
    if (Game && Game.setSpeed) Game.setSpeed(1);
    var stamina = Service.getStamina();
    var staminaEl = document.getElementById('campaign-stamina');
    if (staminaEl) staminaEl.textContent = '⚡ 體力 ' + stamina + '/' + STAMINA_MAX;
    if (!Game.difficulty) Game.difficulty = 'normal';
    this.updateDifficultyTabs();
    this.renderCampaignList();
    var list = document.getElementById('campaign-list');
    if (list) {
      var stages = list.querySelectorAll('.campaign-stage');
      var target = null;
      for (var si = 0; si < stages.length; si++) {
        if (!stages[si].classList.contains('cleared')) { target = stages[si]; break; }
      }
      if (!target && stages.length) target = stages[stages.length - 1];
      if (target) target.scrollIntoView({ block:'center', behavior:'smooth' });
    }
    Game.state = 'campaign';
  },

  showBattle: function(stageId) {
    if (!Service.isStageUnlocked(stageId, Game.difficulty)) {
      this.showToast('此關卡尚未解鎖！'); return;
    }
    if (!DEV_MODE) {
      var stamina = Service.getStamina();
      if (stamina < STAMINA_COST) { this.showToast('體力不足！'); return; }
      Service.spendStamina(STAMINA_COST);
    }
    this.showScreen('screen-battle');
    window.scrollTo(0, 0);
    Game.state = 'battle';
    Game.initStage(stageId);
    this.selectedWaitingIdx = -1;
    this.selectedUnitIdx = -1;
    this.renderWaitingArea();
    this.updateHUD();
    var btn = document.getElementById('btn-recruit');
    if (btn) btn.innerHTML = '征招 🍖<span id="recruit-cost">' + Game.recruitCost + '</span>';
    var overlay = document.getElementById('pause-overlay');
    if (overlay) overlay.style.display = 'none';
    var btn = document.getElementById('btn-pause');
    if (btn) btn.textContent = '⏸';
  },

  showSettings: function() {
    this.showScreen('screen-settings');
    Game.state = 'settings';
    var soundToggle = document.getElementById('setting-sound');
    if (soundToggle) soundToggle.checked = Sound.enabled;
    var devItem = document.getElementById('setting-dev-item');
    if (devItem) devItem.style.display = DEV_MODE ? '' : 'none';
    var devToggle = document.getElementById('setting-dev');
    if (devToggle) devToggle.checked = DEV_MODE;
  },

  toggleSound: function(on) {
    Sound.toggle(on);
    this.showToast(on ? '音效已開啟' : '音效已關閉');
  },

  toggleDevMode: function(on) {
    if (on) {
      var backup = Service.clone(Service.appData);
      localStorage.setItem(STORAGE_KEY + '_devbackup', JSON.stringify(backup));
      DEV_MODE = true;
      Service.getStamina();
      Service.appData.stamina = STAMINA_MAX;
      Service.saveData();
    } else {
      DEV_MODE = false;
      var raw = localStorage.getItem(STORAGE_KEY + '_devbackup');
      if (raw) {
        try {
          var backup = JSON.parse(raw);
          Service.appData = Service.mergeDefaults(backup);
          localStorage.removeItem(STORAGE_KEY + '_devbackup');
          Service.saveData();
        } catch(e) {}
      }
    }
    this.showToast(on ? '開發模式已開啟' : '開發模式已關閉');
    this.renderCampaignList();
  },

  showResetConfirm: function() {
    var overlay = document.createElement('div');
    overlay.className = 'reset-overlay';
    overlay.innerHTML =
      '<div class="reset-dialog">' +
        '<div class="reset-title">⚠️ 確認重置</div>' +
        '<div class="reset-msg">所有遊戲資料將被清除，此操作無法復原！</div>' +
        '<div class="reset-btns">' +
          '<button class="btn btn-cancel" onclick="this.parentElement.parentElement.parentElement.remove()">取消</button>' +
          '<button class="btn btn-danger" onclick="Service.resetData(); this.parentElement.parentElement.parentElement.remove()">確認重置</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(overlay);
  },

  showResult: function(won, gold, weapon, extraWeapons) {
    this.showScreen('screen-result');
    var title = document.getElementById('result-title');
    title.textContent = won ? '勝 利！' : '敗 北...';
    title.className = won ? 'victory' : 'defeat';
    var html = won ? '👑 金幣 +' + gold : '下次再戰！';
    if (weapon) {
      var qName = WEAPON_QUALITY[weapon.quality] ? WEAPON_QUALITY[weapon.quality].name : '?';
      var qColor = WEAPON_QUALITY[weapon.quality] ? WEAPON_QUALITY[weapon.quality].color : '#888';
      var wLabel = WEAPON_TYPE_LABELS[weapon.type] || '?';
      var wIcon = WEAPON_TYPE_ICONS[weapon.type] || '🗡️';
      html += '<br><div class="weapon-drop" style="margin-top:8px;padding:6px;border:1px solid ' + qColor + ';border-radius:6px;display:inline-block;">';
      html += wIcon + ' ' + wLabel + '武器 <span style="color:' + qColor + ';font-weight:bold;">[' + qName + ']</span> 掉落！';
      html += '<br><span style="font-size:12px;">⚔+' + weapon.atkPct + '%';
      if (weapon.hpPct) html += ' ❤+' + weapon.hpPct + '%';
      if (weapon.spd) html += ' 🏃+' + weapon.spd;
      html += '　<span style="color:#8a7a20;">已存入倉庫</span></span></div>';
    }
    if (extraWeapons && extraWeapons.length) {
      for (var i = 0; i < extraWeapons.length; i++) {
        var ew = extraWeapons[i];
        var eqName = WEAPON_QUALITY[ew.quality] ? WEAPON_QUALITY[ew.quality].name : '?';
        var eqColor = WEAPON_QUALITY[ew.quality] ? WEAPON_QUALITY[ew.quality].color : '#888';
        var ewLabel = WEAPON_TYPE_LABELS[ew.type] || '?';
        var ewIcon = WEAPON_TYPE_ICONS[ew.type] || '🗡️';
        html += '<br><div class="weapon-drop" style="margin-top:6px;padding:6px;border:1px solid ' + eqColor + ';border-radius:6px;display:inline-block;">';
        html += '🎁 ' + ewIcon + ' ' + ewLabel + '武器 <span style="color:' + eqColor + ';font-weight:bold;">[' + eqName + ']</span> 首通獎勵！';
        html += '<br><span style="font-size:12px;">⚔+' + ew.atkPct + '%';
        if (ew.hpPct) html += ' ❤+' + ew.hpPct + '%';
        if (ew.spd) html += ' 🏃+' + ew.spd;
        html += '　<span style="color:#8a7a20;">已存入倉庫</span></span></div>';
      }
    }
    document.getElementById('result-rewards').innerHTML = html;
  },

  afterResult: function() {
    this.showCampaign();
  },

  exitBattle: function() {
    if (!confirm('確定退出戰鬥？')) return;
    Game.battlePhase = 'idle';
    Game.paused = false;
    var overlay = document.getElementById('pause-overlay');
    if (overlay) overlay.style.display = 'none';
    var btn = document.getElementById('btn-pause');
    if (btn) btn.textContent = '⏸';
    this.showCampaign();
  },

  showSynergyHelp: function() {
    var modal = document.getElementById('synergy-help-modal');
    var body = document.getElementById('synergy-help-body');
    if (!modal || !body) return;
    var html = '';
    html += '<div class="sh-section"><h4 class="sh-auto">必然加乘（全員生效）</h4>';
    for (var n = 3; n <= 6; n++) {
      html += '<div class="sh-item"><span class="sh-label">不同兵種 ≥' + n + ' 種</span><span class="sh-desc">全體攻擊力 +' + (2 * n - 2) + '%</span></div>';
    }
    for (var n = 3; n <= 6; n++) {
      html += '<div class="sh-item"><span class="sh-label">同原軍階 ≥' + n + ' 人</span><span class="sh-desc">全體攻擊力 +' + (4 + n * 2) + '%</span></div>';
    }
    html += '<div class="sh-item"><span class="sh-label">原軍階都不同 ≥5 人</span><span class="sh-desc">全體攻擊力 +' + DISTINCT_RARITY_BONUS_ATK + '%</span></div>';
    for (var n = 3; n <= 6; n++) {
      html += '<div class="sh-item"><span class="sh-label">同陣營 ≥' + n + ' 人</span><span class="sh-desc">全體攻擊力 +' + (4 + n * 2) + '%</span></div>';
    }
    html += '</div>';
    html += '<div class="sh-section"><h4 class="sh-limited">限定加乘（只有限定成員生效）</h4>';
    for (var b = 0; b < BOND_DATA.length; b++) {
      var bond = BOND_DATA[b];
      if (bond.type !== 'bond') continue;
      var memberNames = [];
      for (var m = 0; m < bond.members.length; m++) {
        var mhd = getHeroData(bond.members[m]);
        memberNames.push(mhd ? mhd.emoji + mhd.name : bond.members[m]);
      }
      var effect = '';
      if (bond.atkPct) effect += '攻擊 +' + bond.atkPct + '%';
      if (bond.hpPct) effect += (effect ? '  ' : '') + '生命 +' + bond.hpPct + '%';
      html += '<div class="sh-item"><span class="sh-label">' + bond.name + '</span><span class="sh-desc">' + effect + '</span></div>';
      html += '<div class="sh-members">' + memberNames.join(' + ') + '</div>';
    }
    html += '</div>';
    body.innerHTML = html;
    modal.style.display = 'flex';
  },

  hideSynergyHelp: function() {
    var modal = document.getElementById('synergy-help-modal');
    if (modal) modal.style.display = 'none';
  },

  /* ===== 選單資訊 ===== */
  updateMenuInfo: function() {
      var d = Service.appData;
      document.getElementById('menu-gold').textContent = '金幣：' + d.gold;
      document.getElementById('menu-heroes').textContent = '武將：' + d.ownedHeroes.length;
      var wc = 0; for (var k in d.weapons) { if (d.weapons[k]) wc++; }
      wc += d.weaponStorage ? d.weaponStorage.length : 0;
      document.getElementById('menu-weapons').textContent = '兵器：' + wc;
      var menuBtn = document.querySelector('#screen-menu .menu-btns .btn-secondary');
        if (menuBtn) menuBtn.textContent = Service.allHeroesMaxed() ? '⚒️ 打 鐵' : '📜 招 募';
    },

  showToast: function(msg) {
    var el = document.getElementById('toast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'toast';
      el.style.cssText = 'position:fixed;bottom:80px;left:50%;transform:translateX(-50%);background:rgba(0,0,0,0.85);color:#f0e6d0;padding:10px 24px;border-radius:8px;font-size:16px;z-index:9999;pointer-events:none;transition:opacity 0.3s;border:1px solid #e67e22;';
      document.body.appendChild(el);
    }
    el.textContent = msg;
    el.style.opacity = '1';
    clearTimeout(el._timer);
    el._timer = setTimeout(function() { el.style.opacity = '0'; }, 2000);
  },

  hideUnitInfo: function() {
    var panel = document.getElementById('unit-info-panel');
    if (panel) panel.remove();
  },

  selectDifficulty: function(diff) {
    Game.difficulty = diff;
    this.updateDifficultyTabs();
    this.renderCampaignList();
  },

  updateDifficultyTabs: function() {
    var hardLocked = !Service.isDifficultyAllCleared('normal');
    var hellLocked = hardLocked || !Service.isDifficultyAllCleared('hard');
    if (hellLocked && Game.difficulty === 'hell') Game.difficulty = 'hard';
    if (hardLocked && Game.difficulty === 'hard') Game.difficulty = 'normal';
    if (hardLocked && Game.difficulty === 'hell') Game.difficulty = 'normal';
    var tabs = document.querySelectorAll('.diff-btn');
    for (var i = 0; i < tabs.length; i++) {
      var t = tabs[i];
      t.classList.toggle('active', t.dataset.diff === Game.difficulty);
      t.disabled = (t.dataset.diff === 'hard' && hardLocked) || (t.dataset.diff === 'hell' && hellLocked);
    }
  },

  renderCampaignList: function() {
    var container = document.getElementById('campaign-list');
    if (!container) return;
    var html = '';
    var flatIdx = 0;
    for (var c = 0; c < CAMPAIGNS.length; c++) {
      var camp = CAMPAIGNS[c];
      html += '<div class="campaign-chapter">' + camp.name + '</div>';
      var stages = camp.stages;
      for (var i = 0; i < stages.length; i++) {
        var s = stages[i];
        var clearedKey = Game.difficulty === 'hard' ? 'completedHard' : (Game.difficulty === 'hell' ? 'completedHell' : 'completedStages');
        var cleared = Service.appData[clearedKey] && Service.appData[clearedKey].indexOf(s.id) !== -1;
        var locked = false;
        if (!DEV_MODE && flatIdx > 0) {
          var prevStage = getStageByFlatIndex(flatIdx - 1);
          if (prevStage) {
            locked = !Service.appData[clearedKey] || Service.appData[clearedKey].indexOf(prevStage.id) === -1;
          }
        }
        var clearStars = Service.getStageStars ? Service.getStageStars(s.id, Game.difficulty) : 0;
        var rates = getDropRates(s.id, Game.difficulty);
        html += '<div class="campaign-stage' + (cleared ? ' cleared' : '') + (locked ? ' locked' : '') + '" onclick="' + (locked ? '' : 'UI.showBattle(\'' + s.id + '\')') + '">' +
          '<div class="stage-name">' + (cleared ? '✅ ' : '') + s.name + '</div>' +
          (clearStars ? '<div class="stage-stars">' + '⭐'.repeat(clearStars) + '</div>' : '');
        if (rates) {
          html += '<div class="stage-drop-rates">掉落 白' + Math.round(rates.white*100) + '% 藍' + Math.round(rates.blue*100) + '% 紫' + Math.round(rates.purple*100) + '% 黃' + Math.round(rates.yellow*100) + '%</div>';
          if (!cleared) {
            var goldStr = '首通+' + getStageGold(flatIdx, Game.difficulty, true) + '金';
            var bonusStr = ' + 白武器×1';
            if (flatIdx % 3 === 2) {
              bonusStr += (Game.difficulty === 'hard') ? ' + 藍武器×1' : (Game.difficulty === 'hell') ? ' + 紫武器×1' : '';
            }
            if (s.id === 'hell') {
              bonusStr += (Game.difficulty === 'normal') ? ' + 藍武器×1' : (Game.difficulty === 'hard') ? ' + 紫武器×1' : ' + 黃武器×1';
            }
            html += '<div class="stage-reward">' + goldStr + bonusStr + '</div>';
          } else {
            html += '<div class="stage-reward">重複+' + getStageGold(flatIdx, Game.difficulty, false) + '金</div>';
          }
        }
        html += '</div>';
        flatIdx++;
      }
    }
    container.innerHTML = html;
  },

  showUnitInfo: function(heroId) {
    var old = document.getElementById('unit-info-panel');
    if (old) old.remove();
    var hd = getHeroData(heroId);
    if (!hd) return;
    var pp = this.cellToPixel(0, 0);
    var panel = document.createElement('div');
    panel.id = 'unit-info-panel';
    panel.style.cssText = 'position:fixed;bottom:10px;left:50%;transform:translateX(-50%);background:rgba(20,10,5,0.95);border:1px solid #e67e22;border-radius:8px;padding:12px 20px;color:#f0e6d0;z-index:900;min-width:200px;text-align:center;';
    panel.innerHTML =
      '<div style="font-size:24px;">' + hd.emoji + '</div>' +
      '<div style="font-size:18px;font-weight:bold;">' + hd.name + '</div>' +
      '<div style="font-size:13px;color:#8a7a6a;">' + RARITY_NAMES[hd.rarity] + ' ' + getWeaponAttackStr(HERO_WEAPON[hd.type]) + '</div>' +
      '<div style="font-size:13px;color:#8a7a6a;">所屬：' + hd.faction + '</div>' +
      '<div style="font-size:13px;margin-top:6px;">' + hd.desc + '</div>';
    document.body.appendChild(panel);
  }
};
