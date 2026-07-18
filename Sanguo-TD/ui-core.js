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
    LeaderboardAPI.init();
    this.showMenu();
    Game.start();
    this.updateMenuInfo();

    // 強制設定回頂部按鈕定位到 #app 右下角
    this._positionScrollTopBtn();

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

    window.addEventListener('resize', function() { self._positionScrollTopBtn(); });

    // 回頂部按鈕：使用定時輪詢取代 scroll 事件監聽，確保在 mobile WebView 中即時更新
    if (!self._scrollTopTimer) {
      self._scrollTopTimer = setInterval(function() {
        self._updateScrollTopBtn();
      }, 100);
    }

  },

  /* ===== 畫面切換 ===== */
  showScreen: function(id) {
    this.hideUnitTooltip();
    var all = document.querySelectorAll('.screen');
    for (var i = 0; i < all.length; i++) all[i].classList.remove('active');
    var el = document.getElementById(id);
    if (el) el.classList.add('active');
    this._updateScrollTopBtn();
  },

  showMenu: function() {
    this.showScreen('screen-menu');
    this.updateMenuInfo();
    Game.state = 'menu';
    if (!DEV_MODE) {
      var now = Date.now();
      if (!Service.appData.playerName) {
        this._nameDialogMode = 'firstTime';
        document.getElementById('name-dialog').style.display = 'flex';
        document.getElementById('name-input').value = '';
        var self = this;
        setTimeout(function() { document.getElementById('name-input').focus(); }, 100);
        return;
      }
      if (now - (Service.appData.lastScoreUploadTime || 0) > 60000) {
        this.uploadCurrentScore(true);
        Service.appData.lastScoreUploadTime = now;
        Service.saveData();
      }
    }
  },

  showCampaign: function() {
    this.showScreen('screen-campaign');
    if (Game && Game.setSpeed) Game.setSpeed(1);
    Game.state = 'campaign';
  },

  showCampaignStages: function() {
    this.showScreen('screen-campaign-stages');
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
      if (target) {
        var listRect = list.getBoundingClientRect();
        var targetRect = target.getBoundingClientRect();
        list.scrollTop += targetRect.top - listRect.top - listRect.height / 3;
      }
    }
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
    this.renderSkillBar();
  },

  showChallenge: function() {
    this.showScreen('screen-challenge');
    var bestEl = document.getElementById('challenge-best');
    if (bestEl) bestEl.textContent = Service.appData.challengeHighWave || 0;
    var waveEl = document.getElementById('challenge-wave');
    if (waveEl) waveEl.textContent = '0';
    var goldEl = document.getElementById('challenge-gold');
    if (goldEl) goldEl.textContent = '0';
  },

  startChallenge: function() {
    if (!DEV_MODE) {
      var stamina = Service.getStamina();
      if (stamina < STAMINA_COST) { this.showToast('體力不足！'); return; }
    }
    Game.gameMode = 'challenge';
    var layoutKey = getRandomMapLayout();
    Game.stage = { id: 'challenge', name: '挑戰模式', map: layoutKey, waves: [] };
    Game.mapLayout = MAP_LAYOUTS[layoutKey];
    Game.units = [];
    Game.enemies = [];
    Game.food = 10;
    Game.lives = Game.maxLives;
    Game.waveIndex = 0;
    Game.spawnedCount = 0;
    Game.currentWaveEnemies = [];
    Game.waveActive = false;
    Game.spawnTimer = 0;
    Game.spawnInterval = 0.8;
    Game.waveDelay = 0;
    Game.battlePhase = 'fighting';
    Game.selectedUnit = null;
    Game.gameEnded = false;
    Game.paused = false;
    Game.speed = 1;
    Game.autoWaveTimer = 10;
    Game.waitingUnits = [];
    Game.recruitCount = 0;
    Game.recruitCost = CHALLENGE_CONFIG.recruitCostBase;
    Game.challengeWave = 0;
    Game.challengeGold = 0;
    this.showScreen('screen-battle');
    window.scrollTo(0, 0);
    Game.state = 'battle';
    Game.buildGrid();
    UI.renderBattle();
    this.selectedWaitingIdx = -1;
    this.selectedUnitIdx = -1;
    this.renderWaitingArea();
    this.updateHUD();
    var btn = document.getElementById('btn-recruit');
    if (btn) btn.innerHTML = '征招 🍖<span id="recruit-cost">' + Game.recruitCost + '</span>';
    var overlay = document.getElementById('pause-overlay');
    if (overlay) overlay.style.display = 'none';
    var btnPause = document.getElementById('btn-pause');
    if (btnPause) btnPause.textContent = '⏸';
    this.renderSkillBar();
  },

  showBossRush: function() {
    this.showScreen('screen-bossrush');
    var killsEl = document.getElementById('bossrush-kills');
    if (killsEl) killsEl.textContent = Service.appData.bossRushKills || 0;
    var bestEl = document.getElementById('bossrush-best');
    if (bestEl) bestEl.textContent = Service.appData.bossRushKills || 0;
    this.renderBossRushProgress(-1);
  },

  renderBossRushProgress: function(currentIdx) {
    var el = document.getElementById('bossrush-progress');
    if (!el) return;
    var html = '';
    for (var i = 0; i < BOSS_RUSH_ORDER.length; i++) {
      var cls = 'br-dot';
      if (i < currentIdx) cls += ' cleared';
      else if (i === currentIdx) cls += ' current';
      var boss = BOSS_RUSH_ORDER[i];
      var enemyData = getEnemyData(boss.heroId);
      var emoji = enemyData ? enemyData.emoji : '?';
      html += '<div class="' + cls + '">' + emoji + '</div>';
    }
    el.innerHTML = html;
  },

  startBossRush: function() {
    if (!DEV_MODE) {
      var stamina = Service.getStamina();
      if (stamina < STAMINA_COST) { this.showToast('體力不足！'); return; }
    }
    Game.gameMode = 'bossrush';
    Game.bossRushIndex = 0;
    Game.bossRushKills = 0;
    Game.bossRushUnits = [];
    this.showScreen('screen-battle');
    window.scrollTo(0, 0);
    Game.state = 'battle';
    Game.initBossRushStage(0);
    this.selectedWaitingIdx = -1;
    this.selectedUnitIdx = -1;
    this.renderWaitingArea();
    this.updateHUD();
    var btn = document.getElementById('btn-recruit');
    if (btn) btn.innerHTML = '征招 🍖<span id="recruit-cost">' + Game.recruitCost + '</span>';
    var overlay = document.getElementById('pause-overlay');
    if (overlay) overlay.style.display = 'none';
    var btnPause = document.getElementById('btn-pause');
    if (btnPause) btnPause.textContent = '⏸';
    this.renderSkillBar();
  },

  showBossRest: function() {
    Game.paused = true;
    this.showScreen('screen-boss-rest');
    var killsEl = document.getElementById('rest-kills');
    if (killsEl) killsEl.textContent = Game.bossRushKills;
    this.renderRestProgress();
    // 恢復存活單位 50% HP
    for (var i = 0; i < Game.units.length; i++) {
      var u = Game.units[i];
      if (!u.dead) {
        var heal = Math.round(u.maxHp * 0.5);
        u.hp = Math.min(u.hp + heal, u.maxHp);
      }
    }
    // 保存存活單位到 bossRushUnits
    Game.bossRushUnits = [];
    for (var i = 0; i < Game.units.length; i++) {
      var u = Game.units[i];
      if (!u.dead) {
        if (u.isSoldier) {
          Game.bossRushUnits.push({
            soldierType: u.soldierType, level: u.level,
            emoji: u.emoji, name: u.soldierName, hp: u.hp, maxHp: u.maxHp
          });
        } else {
          Game.bossRushUnits.push({
            heroId: u.heroId, level: u.battleLevel || u.level,
            emoji: u.emoji, name: u.name, hp: u.hp, maxHp: u.maxHp
          });
        }
      }
    }
    this.renderRestDeploySlots();
  },

  renderRestProgress: function() {
    var el = document.getElementById('rest-progress');
    if (!el) return;
    var html = '';
    for (var i = 0; i < BOSS_RUSH_ORDER.length; i++) {
      var cls = 'br-dot';
      if (i < Game.bossRushIndex) cls += ' cleared';
      else if (i === Game.bossRushIndex) cls += ' current';
      var boss = BOSS_RUSH_ORDER[i];
      var enemyData = getEnemyData(boss.heroId);
      var emoji = enemyData ? enemyData.emoji : '?';
      html += '<div class="' + cls + '">' + emoji + '</div>';
    }
    el.innerHTML = html;
  },

  renderRestDeploySlots: function() {
    var el = document.getElementById('rest-deploy-slots');
    if (!el) return;
    var html = '';
    for (var i = 0; i < Game.bossRushUnits.length; i++) {
      var u = Game.bossRushUnits[i];
      var hpPct = u.maxHp ? Math.round(u.hp / u.maxHp * 100) : 100;
      html += '<div class="rest-unit-card">';
      html += '<div class="rest-unit-emoji">' + (u.emoji || '?') + '</div>';
      html += '<div class="rest-unit-name">' + (u.name || '?') + '</div>';
      html += '<div class="rest-unit-hp">❤ ' + hpPct + '%</div>';
      html += '</div>';
    }
    if (Game.bossRushUnits.length === 0) {
      html = '<div style="color:#8a7a6a;text-align:center;padding:12px;">無存活單位</div>';
    }
    el.innerHTML = html;
  },

  continueBossRush: function() {
    Game.paused = false;
    this.showScreen('screen-battle');
    window.scrollTo(0, 0);
    Game.state = 'battle';
    // 恢復存活單位到戰場
    Game.units = [];
    Game.enemies = [];
    Game.waveIndex = 0;
    Game.spawnedCount = 0;
    Game.currentWaveEnemies = [];
    Game.waveActive = false;
    Game.waveDelay = 0;
    Game.spawnTimer = 0;
    Game.autoWaveTimer = 10;
    Game.waitingUnits = [];
    Game.recruitCount = 0;
    Game.recruitCost = CHALLENGE_CONFIG.recruitCostBase;
    if (Game.food < Game.recruitCost) Game.food = Game.recruitCost;
    Game.battlePhase = 'fighting';
    Game.gameEnded = false;
    Game.paused = false;
    // 用新的地圖初始化
    var layoutKey = getRandomMapLayout();
    Game.stage = {
      id: 'bossrush_' + Game.bossRushIndex,
      name: 'Boss Rush ' + (Game.bossRushIndex + 1),
      map: layoutKey,
      waves: []
    };
    Game.mapLayout = MAP_LAYOUTS[layoutKey];
    Game.buildGrid();
    // 把保存的單位放回等待區（避免重疊）
    for (var i = 0; i < Game.bossRushUnits.length; i++) {
      var wu = Game.bossRushUnits[i];
      Game.waitingUnits.push(wu);
    }
    Game.bossRushUnits = [];
    UI.renderBattle();
    this.selectedWaitingIdx = -1;
    this.selectedUnitIdx = -1;
    this.renderWaitingArea();
    this.updateHUD();
    var btn = document.getElementById('btn-recruit');
    if (btn) btn.innerHTML = '征招 🍖<span id="recruit-cost">' + Game.recruitCost + '</span>';
    var overlay = document.getElementById('pause-overlay');
    if (overlay) overlay.style.display = 'none';
    var btnPause = document.getElementById('btn-pause');
    if (btnPause) btnPause.textContent = '⏸';
    this.renderSkillBar();
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
    var lbNameEl = document.getElementById('setting-lb-name');
    if (lbNameEl) lbNameEl.textContent = Service.appData.playerName || '(未設定)';
    var cloudNameEl = document.getElementById('cloud-name');
    if (cloudNameEl) cloudNameEl.value = Service.appData.playerName || '';
    var cloudStatusEl = document.getElementById('cloud-status');
    if (cloudStatusEl) cloudStatusEl.textContent = '';
    document.getElementById('cloud-password').value = '';
    // 排行榜清理按鈕（僅在本地 file 協定時顯示）
    var lbCleanItem = document.getElementById('setting-lb-clean-item');
    if (lbCleanItem) {
      lbCleanItem.style.display = (location.protocol === 'file:') ? '' : 'none';
    }
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

  showResult: function(won, gold, weapon, extraWeapons, gainedExp, levelUpList) {
    this.showScreen('screen-result');
    var title = document.getElementById('result-title');
    title.textContent = won ? '勝 利！' : '敗 北...';
    title.className = won ? 'victory' : 'defeat';
    var html = won ? '👑 金幣 +' + gold : '下次再戰！';
    
    // 顯示經驗值收益
    if (won && gainedExp > 0) {
      html += '<br><div class="exp-reward">✨ 存活英雄各獲得 <span style="color:#ffd700;font-weight:bold;">' + gainedExp + '</span> 點經驗</div>';
    }
    if (levelUpList && levelUpList.length > 0) {
      html += '<div class="levelup-list">';
      for (var li = 0; li < levelUpList.length; li++) {
        html += '<div class="levelup-item">⬆ ' + levelUpList[li] + '</div>';
      }
      html += '</div>';
    }
    if (weapon) {
      var qName = WEAPON_QUALITY[weapon.quality] ? WEAPON_QUALITY[weapon.quality].name : '?';
      var qColor = WEAPON_QUALITY[weapon.quality] ? WEAPON_QUALITY[weapon.quality].color : '#888';
      var wLabel = WEAPON_TYPE_LABELS[weapon.type] || '?';
      var wIcon = WEAPON_TYPE_ICONS[weapon.type] || '🗡️';
      html += '<br><div class="weapon-drop" style="margin-top:8px;padding:6px;border:1px solid ' + qColor + ';border-radius:6px;display:inline-block;">';
      html += wIcon + ' ' + wLabel + '武器 <span style="color:' + qColor + ';font-weight:bold;">[' + qName + ']</span> 掉落！';
      html += '<br><span style="font-size:12px;">⚔+' + weapon.atkPct + '%';
      if (weapon.hpPct) html += ' ❤+' + weapon.hpPct + '%';
      if (weapon.spd) html += ' 🏃+' + (weapon.spd || 0).toFixed(2);
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
        if (ew.spd) html += ' 🏃+' + (ew.spd || 0).toFixed(2);
        html += '　<span style="color:#8a7a20;">已存入倉庫</span></span></div>';
      }
    }
    document.getElementById('result-rewards').innerHTML = html;
  },

  afterResult: function() {
    Game.gameMode = 'campaign';
    this.showCampaign();
  },

  exitBattle: function() {
    if (!confirm('確定退出戰鬥？')) return;
    if (Game.gameMode === 'challenge') {
      var gold = Math.floor(Game.challengeWave * CHALLENGE_CONFIG.goldRewardBase * 0.5);
      Service.addGold(gold);
      if (Game.challengeWave > (Service.appData.challengeHighWave || 0)) {
        Service.appData.challengeHighWave = Game.challengeWave;
      }
      Service.saveData();
    }
    if (Game.gameMode === 'bossrush') {
      if (Game.bossRushKills > (Service.appData.bossRushKills || 0)) {
        Service.appData.bossRushKills = Game.bossRushKills;
      }
      Service.saveData();
    }
    Game.battlePhase = 'idle';
    Game.gameMode = 'campaign';
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

  /* ===== 回頂部按鈕 ===== */
  _positionScrollTopBtn: function() {
    var btn = document.getElementById('scroll-top');
    if (!btn) return;
    var app = document.getElementById('app');
    if (!app) return;
    var rect = app.getBoundingClientRect();
    btn.style.cssText = 'position:fixed;bottom:24px;left:' + (rect.right - 76) + 'px;width:52px;height:52px;font-size:26px;line-height:52px;text-align:center;background:#e67e22;color:#fff;border-radius:50%;cursor:pointer;z-index:99999;border:2px solid rgba(255,255,255,0.3);box-shadow:0 4px 16px rgba(230,126,34,0.5);transition:opacity 0.3s,transform 0.3s;user-select:none;';
    this._updateScrollTopBtn();
  },
  _findScrollContainer: function() {
    var activeScreen = document.querySelector('.screen.active');
    if (!activeScreen) return null;
    // 優先找明確的滾動容器（只要元素存在就回傳，不檢查高度避免誤差）
    var selectors = ['.settings-content', '.leaderboard-content', '.campaign-list', '.heroes-list', '.weapons-list', '.gacha-content'];
    for (var i = 0; i < selectors.length; i++) {
      var el = activeScreen.querySelector(selectors[i]);
      if (el) return el;
    }
    // fallback: 整個 active screen
    return activeScreen;
  },

  _updateScrollTopBtn: function() {
    var btn = document.getElementById('scroll-top');
    if (!btn) return;
    var scrollEl = this._findScrollContainer();
    if (!scrollEl) { btn.style.opacity = '0'; btn.style.pointerEvents = 'none'; return; }
    if (scrollEl.scrollTop > 200) {
      btn.style.opacity = '1';
      btn.style.pointerEvents = 'auto';
    } else {
      btn.style.opacity = '0';
      btn.style.pointerEvents = 'none';
    }
  },

  scrollToTop: function() {
    var scrollEl = this._findScrollContainer();
    if (scrollEl) {
      if (scrollEl.scrollTo) {
        scrollEl.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        scrollEl.scrollTop = 0;
      }
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
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
  },

  /* ===== 排行榜 ===== */
  showLeaderboard: function() {
    this.showScreen('screen-leaderboard');
    Game.state = 'leaderboard';
    var self = this;
    if (!DEV_MODE) {
      if (!Service.appData.playerName) {
        this._nameDialogMode = 'firstTime';
        document.getElementById('name-dialog').style.display = 'flex';
        document.getElementById('name-input').value = '';
        var self = this;
        setTimeout(function() { document.getElementById('name-input').focus(); }, 100);
        return;
      }
      var now = Date.now();
      var last = Service.appData.lastScoreUploadTime || 0;
      if (now - last > 60000) {
        self.uploadCurrentScore(true);
        Service.appData.lastScoreUploadTime = now;
        Service.saveData();
      }
    }
    this.renderLeaderboard('totalScore');
  },

  showNameDialog: function() {
    this._nameDialogMode = 'edit';
    document.getElementById('name-dialog').style.display = 'flex';
    document.getElementById('name-input').value = Service.appData.playerName || '';
    var self = this;
    setTimeout(function() { document.getElementById('name-input').focus(); }, 100);
  },
  closeNameDialog: function() {
    document.getElementById('name-dialog').style.display = 'none';
    if (this._nameDialogMode === 'firstTime') {
      var rand = 'user' + Math.floor(Math.random() * 90000 + 10000);
      document.getElementById('name-input').value = rand;
      this.submitPlayerName();
    }
  },

  submitPlayerName: function() {
    if (DEV_MODE) { this.showToast('本機模式無法設定排行榜'); return; }
    var name = document.getElementById('name-input').value.trim();
    if (!name) { this.showToast('請輸入名稱'); return; }
    var hasNonAscii = false;
    for (var ci = 0; ci < name.length; ci++) {
      if (name.charCodeAt(ci) > 127) { hasNonAscii = true; break; }
    }
    if (hasNonAscii && name.length > 8) { this.showToast('名稱最多8個中文字'); return; }
    if (!hasNonAscii && name.length > 16) { this.showToast('名稱最多16個字母'); return; }
    var badWords = ['幹','操','屌','肏','fuck','shit','ass','bitch','王八','垃圾','白痴','智障'];
    for (var b = 0; b < badWords.length; b++) {
      if (name.indexOf(badWords[b]) !== -1) { this.showToast('名稱包含不雅字詞'); return; }
    }
    var self = this;
    LeaderboardAPI.checkNameExists(name, function(exists) {
      if (exists) {
        if (self._nameDialogMode === 'edit') {
          document.getElementById('name-dialog').style.display = 'none';
          self.showToast('已有相同的名字');
          return;
        }
        var rand = 'user' + Math.floor(Math.random() * 90000 + 10000);
        Service.appData.playerName = rand;
        Service.saveData();
        document.getElementById('name-dialog').style.display = 'none';
        var lbNameEl = document.getElementById('setting-lb-name');
        if (lbNameEl) lbNameEl.textContent = rand;
        self.showToast('此名稱已有人使用，已為您取名：' + rand);
        self.uploadCurrentScore();
        self.renderLeaderboard('totalScore');
        return;
      }
      Service.appData.playerName = name;
      Service.saveData();
      document.getElementById('name-dialog').style.display = 'none';
      var lbNameEl = document.getElementById('setting-lb-name');
      if (lbNameEl) lbNameEl.textContent = name;
      self.showToast('名稱已設定：' + name);
      self.uploadCurrentScore();
      self.renderLeaderboard('totalScore');
    });
  },

  uploadCurrentScore: function(silent) {
    if (DEV_MODE) return;
    var name = Service.appData.playerName;
    if (!name) {
      document.getElementById('name-dialog').style.display = 'flex';
      return;
    }
    var deployed = Service.getDeployedHeroes();
    var heroes = [];
    var totalScore = 0;
    var bonuses = Service.getDeployedSynergyBonuses(deployed);
    for (var i = 0; i < deployed.length; i++) {
      var hid = deployed[i];
      var hd = getHeroData(hid);
      if (!hd) continue;
      var tier = Service.getHeroTier(hid);
      var star = Service.getHeroStar(hid);
      var w = Service.getWeapon(hid);
      var heroAtkPct = bonuses.atkPct;
      var heroHpPct = 0;
      for (var bi = 0; bi < bonuses.bonds.length; bi++) {
        if (bonuses.bonds[bi].members.indexOf(hid) !== -1) {
          heroAtkPct += bonuses.bonds[bi].atkPct;
          heroHpPct += bonuses.bonds[bi].hpPct;
        }
      }
      var score = getHeroScoreWithSynergy(hd, tier, star, w, heroAtkPct, heroHpPct);
      totalScore += score;
      var tierShow = TIER_NAMES[tier] + (tier >= 4 && star > 0 ? '+' + star + '⭐' : '');
      var wInfo = {};
      if (w) {
        wInfo = {
          qualityName: WEAPON_QUALITY[w.quality] ? WEAPON_QUALITY[w.quality].name : '?',
          qualityColor: WEAPON_QUALITY[w.quality] ? WEAPON_QUALITY[w.quality].color : '#fff',
          typeLabel: WEAPON_TYPE_LABELS[w.type] || '?',
          typeIcon: WEAPON_TYPE_ICONS[w.type] || '?',
          atkPct: w.atkPct,
          hpPct: w.hpPct,
          spd: w.spd
        };
      }
      heroes.push({
        name: hd.name,
        emoji: hd.emoji,
        tierShow: tierShow,
        heroScore: score,
        weapon: wInfo
      });
    }
    var self = this;
    var extraData = {
      challengeHighWave: Service.appData.challengeHighWave || 0,
      bossRushKills: Service.appData.bossRushKills || 0
    };
    LeaderboardAPI.submitScore(name, totalScore, heroes, extraData, function(ok) {
      if (ok) {
        if (!silent) self.showToast('戰力已上傳！');
        // 清除排行榜快取，確保下次進入時顯示最新資料
        localStorage.removeItem(LB_CACHE_KEY);
        // 如果目前在排行榜畫面，重新渲染
        if (Game.state === 'leaderboard') {
          self.renderLeaderboard('totalScore');
        }
      }
      else if (!silent) self.showToast('上傳失敗，請稍後再試');
    });
  },

  /* ===== 資料轉移 ===== */
  cloudUpload: function() {
    if (DEV_MODE) { this.showToast('本機模式無法使用資料轉移'); return; }
    var password = document.getElementById('cloud-password').value;
    if (!password) { this.showToast('請輸入密碼'); return; }
    var name = Service.appData.playerName;
    if (!name) { this.showToast('請先設定排行榜名稱'); return; }
    if (!confirm('確定要將本裝置資料轉移到雲端？(本裝置資料會清除！)')) return;
    var self = this;
    var statusEl = document.getElementById('cloud-status');
    statusEl.textContent = '⏳ 加密上傳中...';
    CloudSaveAPI.checkExists(name).then(function(exists) {
      if (exists && !confirm('已有存檔，確定覆蓋？')) {
        statusEl.textContent = '';
        return;
      }
      CloudSaveAPI.upload(name, Service.appData, password).then(function(ok) {
        if (ok) {
          statusEl.textContent = '✅ 上傳成功，本地資料已清除';
          self.showToast('資料已上傳，本地已重置');
          localStorage.removeItem(STORAGE_KEY);
          Service.loadData();
          self.showMenu();
        } else {
          statusEl.textContent = '❌ 上傳失敗';
          self.showToast('上傳失敗');
        }
      });
    });
  },

  cloudDownload: function() {
    if (DEV_MODE) { this.showToast('本機模式無法使用資料轉移'); return; }
    var name = document.getElementById('cloud-name').value.trim();
    var password = document.getElementById('cloud-password').value;
    if (!name || !password) { this.showToast('請輸入名稱和密碼'); return; }
    if (!confirm('確定要將雲端資料轉移到本裝置？(雲端資料會清除！)')) return;
    var statusEl = document.getElementById('cloud-status');
    statusEl.textContent = '⏳ 解密下載中...';
    var self = this;
    CloudSaveAPI.download(name, password).then(function(result) {
      if (!result.ok) {
        var msg = result.reason === 'not_found' ? '❌ 無此存檔' : '❌ 密碼錯誤';
        statusEl.textContent = msg;
        self.showToast(msg);
        return;
      }
      Service.appData = Service.mergeDefaults(result.data);
      Service.getStamina();
      Service.saveData();
      CloudSaveAPI.deleteDoc(name).then(function() {
        var lbNameEl = document.getElementById('setting-lb-name');
        if (lbNameEl) lbNameEl.textContent = Service.appData.playerName || '(未設定)';
        document.getElementById('cloud-name').value = Service.appData.playerName || '';
        statusEl.textContent = '✅ 下載成功，雲端已清除';
        self.showToast('下載成功，請重整頁面');
      });
    });
  },

  renderLeaderboard: function(sortBy) {
    var container = document.getElementById('leaderboard-content');
    var cacheRaw = localStorage.getItem(LB_CACHE_KEY);
    var cache = cacheRaw ? JSON.parse(cacheRaw) : null;
    if (cache && cache.data && Date.now() - cache.timestamp < 300000) {
      this._renderLBList(container, cache.data, sortBy);
      return;
    }
    container.innerHTML = '<div style="text-align:center;padding:20px;color:#8a7a6a;">載入中...</div>';
    LeaderboardAPI.getLeaderboard(50, sortBy, function(list) {
      if (!list || list.length === 0) {
        container.innerHTML = '<div style="text-align:center;padding:40px;color:#8a7a6a;">尚無排行資料</div>';
        return;
      }
      localStorage.setItem(LB_CACHE_KEY, JSON.stringify({data:list, timestamp:Date.now()}));
      UI._renderLBList(container, list, sortBy);
    });
  },

  _renderLBList: function(container, list, sortBy) {
    var filtered = [];
    for (var fi = 0; fi < list.length; fi++) {
      if (!list[fi].totalScore) continue;
      filtered.push(list[fi]);
    }
    if (filtered.length === 0) {
      container.innerHTML = '<div style="text-align:center;padding:40px;color:#8a7a6a;">尚無排行資料</div>';
      return;
    }
    var dedup = {};
    for (var di = 0; di < filtered.length; di++) {
      var e = filtered[di];
      var key = e.playerName;
      var existing = dedup[key];
      if (!existing) { dedup[key] = e; continue; }
      var eTime = e.updatedAt ? (e.updatedAt.toDate ? e.updatedAt.toDate().getTime() : (e.updatedAt.seconds ? e.updatedAt.seconds * 1000 : 0)) : 0;
      var xTime = existing.updatedAt ? (existing.updatedAt.toDate ? existing.updatedAt.toDate().getTime() : (existing.updatedAt.seconds ? existing.updatedAt.seconds * 1000 : 0)) : 0;
      if (eTime > xTime) dedup[key] = e;
    }
    var unique = [];
    for (var k in dedup) unique.push(dedup[k]);
    var field = sortBy || 'totalScore';
    unique.sort(function(a,b) { return (b[field]||0) - (a[field]||0); });
    var html = '';
    
    // Add sort bar
    html += '<div class="lb-sort-bar">';
    html += '<button class="btn btn-small lb-sort-btn' + (sortBy === 'totalScore' ? ' active' : '') + '" onclick="UI.sortLeaderboard(\'totalScore\')">戰力</button>';
    html += '<button class="btn btn-small lb-sort-btn' + (sortBy === 'challengeHighWave' ? ' active' : '') + '" onclick="UI.sortLeaderboard(\'challengeHighWave\')">🌊 挑戰波數</button>';
    html += '<button class="btn btn-small lb-sort-btn' + (sortBy === 'bossRushKills' ? ' active' : '') + '" onclick="UI.sortLeaderboard(\'bossRushKills\')">👹 Boss Rush</button>';
    html += '</div>';
    
    for (var i = 0; i < unique.length; i++) {
      var entry = unique[i];
      var rank = i + 1;
      var medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : rank;
      var isMe = entry.playerName === Service.appData.playerName;
      html += '<div class="lb-entry' + (isMe ? ' lb-me' : '') + '" onclick="UI.toggleLbDetail(this)">';
      html += '<div class="lb-rank">' + medal + '</div>';
      html += '<div class="lb-info">';
      html += '<div class="lb-name-row" style="display:flex;justify-content:space-between;align-items:center;">';
      html += '<div class="lb-name">' + entry.playerName + '</div>';
      // Add challenge/bossrush data
      var extraInfo = [];
      if ((entry.challengeHighWave || 0) > 0) {
        extraInfo.push('🌊 第' + entry.challengeHighWave + '波');
      }
      if ((entry.bossRushKills || 0) > 0) {
        extraInfo.push('👹 第' + entry.bossRushKills + '關');
      }
      if (extraInfo.length > 0) {
        html += '<div class="lb-extra">' + extraInfo.join(' ') + '</div>';
      }
      html += '</div>';
      html += '<div class="lb-score">戰力 ' + (entry.totalScore || 0) + '</div>';
      if (entry.updatedAt) {
        var d = entry.updatedAt.toDate ? entry.updatedAt.toDate() : (entry.updatedAt.seconds ? new Date(entry.updatedAt.seconds * 1000) : new Date(entry.updatedAt));
        html += '<div class="lb-time">🕐 ' + d.getFullYear() + '/' + (d.getMonth()+1) + '/' + d.getDate() + ' ' + ('0'+d.getHours()).slice(-2) + ':' + ('0'+d.getMinutes()).slice(-2) + '</div>';
      }
      html += '</div>';
      html += '<div class="lb-detail" style="display:none;">';
      if (entry.heroes && entry.heroes.length) {
        for (var j = 0; j < entry.heroes.length; j++) {
          var h = entry.heroes[j];
          html += '<div class="lb-hero-row">';
          html += '<span>' + (h.emoji || '') + ' ' + (h.name || '') + '</span>';
          html += '<span style="color:#9b59b6;">' + (h.tierShow || '') + '</span>';
          html += '<span style="color:#ffd700;">' + (h.heroScore || 0) + '</span>';
          if (h.weapon && h.weapon.typeLabel) {
            var w = h.weapon;
            html += '<div class="lb-weapon">';
            html += w.typeIcon + ' <span style="color:' + w.qualityColor + ';">' + w.qualityName + w.typeLabel + '</span>';
            html += ' <span style="color:#e74c3c;">攻+' + (w.atkPct || 0) + '%</span>';
            html += ' <span style="color:#27ae60;">血+' + (w.hpPct || 0) + '%</span>';
            html += ' <span style="color:#f39c12;">速+' + (w.spd ? w.spd.toFixed(2) : '0.00') + '</span>';
            html += '</div>';
          }
          html += '</div>';
        }
      }
      html += '</div>';
      html += '</div>';
    }
    container.innerHTML = html;
  },

  toggleLbDetail: function(el) {
    var detail = el.querySelector('.lb-detail');
    if (!detail) return;
    var show = detail.style.display === 'none';
    detail.style.display = show ? 'block' : 'none';
    if (show) el.classList.add('open');
    else el.classList.remove('open');
  },

  sortLeaderboard: function(sortBy) {
    localStorage.removeItem(LB_CACHE_KEY);
    LeaderboardAPI.getLeaderboard(50, sortBy, function(list) {
      var container = document.getElementById('leaderboard-content');
      UI._renderLBList(container, list, sortBy);
    });
  },

  cleanupLeaderboard: function() {
    if (!confirm('確定要清理排行榜？\n\n將刪除：\n1. 戰力為 0 且超過 1 天的紀錄\n2. 同一玩家名稱只保留最新一筆\n\n此操作無法復原！')) return;
    var self = this;
    this.showToast('⏳ 清理中...');
    LeaderboardAPI.cleanupLeaderboard().then(function(deleted) {
      if (deleted > 0) {
        self.showToast('已清理 ' + deleted + ' 筆紀錄');
        // 清除排行榜快取
        localStorage.removeItem(LB_CACHE_KEY);
      } else {
        self.showToast('沒有需要清理的紀錄');
      }
    }).catch(function(e) {
      self.showToast('清理失敗：' + (e && e.message || '未知錯誤'));
    });
  }
};
