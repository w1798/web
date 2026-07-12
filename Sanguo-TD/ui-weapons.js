  /* ===== 武器管理 ===== */
UI.showWeapons = function() {
    this.showScreen('screen-weapons');
    this.renderWeaponsList();
    Game.state = 'weapons';
  };

UI.renderWeaponsList = function() {
    var container = document.getElementById('weapons-list');
    container.innerHTML = '';
    var d = Service.appData;
    var self = this;

    if (d.ownedHeroes.length === 0 && (!d.weaponStorage || d.weaponStorage.length === 0)) {
      container.innerHTML = '<div style="text-align:center;padding:40px;color:#6a5a4a;">尚無武將或武器，快去招募！</div>';
      return;
    }

    /* ===== 武將武器 ===== */
    if (d.ownedHeroes.length > 0) {
      var deployed = Service.getDeployedHeroes();
      var deployedList = [];
      var otherList = [];
      for (var i = 0; i < d.ownedHeroes.length; i++) {
        var hid = d.ownedHeroes[i];
        if (deployed.indexOf(hid) !== -1) {
          deployedList.push(hid);
        } else {
          otherList.push(hid);
        }
      }

      /* 其餘按戰力排序 */
      otherList.sort(function(a, b) {
        var ha = getHeroData(a), hb = getHeroData(b);
        if (!ha) return 1; if (!hb) return -1;
        var ta = Service.getHeroTier(a), tb = Service.getHeroTier(b);
        var sa = Service.getHeroStar(a), sb = Service.getHeroStar(b);
        return getHeroScore(hb, tb, sb, Service.getWeapon(b)) - getHeroScore(ha, ta, sa, Service.getWeapon(a));
      });

      function renderWeaponCard(hid, isDeployed) {
        var hd = getHeroData(hid);
        if (!hd) return null;
        var w = Service.getWeapon(hid);
        var card = document.createElement('div');
        card.className = 'weapon-card' + (isDeployed ? ' weapon-card-deployed' : '');
        var wType = Service.getHeroWeaponType(hd);
        var wIcon = WEAPON_TYPE_ICONS[wType] || '🗡️';
        var wLabel = WEAPON_TYPE_LABELS[wType] || '刀';
        var badge = isDeployed ? '<span class="deployed-badge">已上陣</span>' : '';
        var heroInfo = '<div class="wc-hero"><span class="wch-emoji">' + hd.emoji + '</span><span class="wch-name">' + hd.name + '</span>' + badge + '<span class="wch-type">(' + wLabel + ')</span></div>';
        if (w) {
          var qName = WEAPON_QUALITY[w.quality] ? WEAPON_QUALITY[w.quality].name : '?';
          var qColor = WEAPON_QUALITY[w.quality] ? WEAPON_QUALITY[w.quality].color : '#888';
          var stats = '<span style="color:' + qColor + ';font-weight:bold;">[' + qName + ']</span> ';
          stats += '⚔+' + w.atkPct + '%';
          if (w.hpPct) stats += ' ❤+' + w.hpPct + '%';
          if (w.spd) stats += ' 🏃+' + w.spd;
          card.innerHTML = heroInfo + '<div class="wc-weapon">' + wIcon + ' ' + stats + '</div>';
          var btnRow = document.createElement('div');
          btnRow.className = 'weapon-btn-row';

          var transferCandidates = [];
          for (var t = 0; t < d.ownedHeroes.length; t++) {
            if (d.ownedHeroes[t] === hid) continue;
            var hd2 = getHeroData(d.ownedHeroes[t]);
            if (hd2 && Service.getHeroWeaponType(hd2) === w.type) {
              transferCandidates.push(d.ownedHeroes[t]);
            }
          }
          if (transferCandidates.length > 0) {
            var transferBtn = document.createElement('span');
            transferBtn.className = 'weapon-recycle-btn';
            transferBtn.style.cssText = 'background:#1a2a3a;border-color:#2a4a6a;';
            transferBtn.textContent = '🔄 轉移';
            transferBtn.onclick = function(hid2, candidates) {
              return function() { self.showWeaponTransferDialog(hid2, candidates); };
            }(hid, transferCandidates);
            btnRow.appendChild(transferBtn);
          }

          var storageBtn = document.createElement('span');
          storageBtn.className = 'weapon-recycle-btn';
          storageBtn.style.cssText = 'background:#2a2a1a;border-color:#5a5a2a;';
          storageBtn.textContent = '📥 放回倉庫';
          storageBtn.onclick = function(hid2) {
            return function() {
              self.showConfirm('確定要將武器放回倉庫嗎？', function() {
                Service.unequipToStorage(hid2);
                self.showToast('武器已放回倉庫');
                self.renderWeaponsList();
              });
            };
          }(hid);
          btnRow.appendChild(storageBtn);

          var recycleGold = WEAPON_QUALITY[w.quality] ? WEAPON_QUALITY[w.quality].recycleGold : 0;
          var recycleBtn = document.createElement('span');
          recycleBtn.className = 'weapon-recycle-btn';
          recycleBtn.textContent = '🗑️ 回收 +' + recycleGold + '💰';
          recycleBtn.onclick = function(hid2, gold) {
            return function() {
              self.showConfirm('確定要回收這把武器嗎？可獲得 ' + gold + ' 金幣', function() {
                var g = Service.recycleWeapon(hid2);
                if (g > 0) self.showToast('回收成功，獲得 ' + g + ' 金幣！');
                self.renderWeaponsList();
              });
            };
          }(hid, recycleGold);
          btnRow.appendChild(recycleBtn);

          card.appendChild(btnRow);
        } else {
          card.innerHTML = heroInfo + '<div class="wc-weapon" style="color:#6a5a4a;">無裝備</div>';
        }
        return card;
      }

      if (deployedList.length > 0) {
        var dTitle = document.createElement('div');
        dTitle.style.cssText = 'padding:6px 12px;color:#ffd700;font-size:14px;font-weight:bold;';
        dTitle.textContent = '— 已上陣 (' + deployedList.length + '/6) —';
        container.appendChild(dTitle);
        for (var di = 0; di < deployedList.length; di++) {
          var card = renderWeaponCard(deployedList[di], true);
          if (card) container.appendChild(card);
        }
      }
    }

    /* ===== 武器倉庫 ===== */
    if (d.weaponStorage && d.weaponStorage.length > 0) {
      var storageTitle = document.createElement('div');
      storageTitle.style.cssText = 'padding:12px 12px 6px;color:#c0b0a0;font-size:14px;font-weight:bold;display:flex;align-items:center;gap:6px;flex-wrap:wrap;';
      storageTitle.innerHTML = '<span>— 武器倉庫 (' + d.weaponStorage.length + ') —</span>';
      container.appendChild(storageTitle);

      /* 批量回收按鈕 */
      var batchRow = document.createElement('div');
      batchRow.style.cssText = 'padding:0 12px 8px;display:flex;gap:6px;flex-wrap:wrap;';

      function countByQuality(q) {
        var c = 0;
        for (var x = 0; x < d.weaponStorage.length; x++) {
          if (d.weaponStorage[x].quality === q) c++;
        }
        return c;
      }

      function batchRecycle(q, label, color) {
        var cnt = countByQuality(q);
        if (cnt === 0) return;
        var btn = document.createElement('span');
        btn.className = 'weapon-recycle-btn';
        btn.style.cssText = 'background:' + color + ';border-color:rgba(255,255,255,0.2);';
        btn.textContent = '🗑️ 回收全' + label + ' (' + cnt + '件)';
        btn.onclick = function() {
          var gold = WEAPON_QUALITY[q] ? WEAPON_QUALITY[q].recycleGold : 0;
          self.showConfirm('確定回收全部 ' + cnt + ' 件' + label + '武器？可獲得 ' + (cnt * gold) + ' 金幣', function() {
            var total = 0, removed = 0;
            for (var k = d.weaponStorage.length - 1; k >= 0; k--) {
              if (d.weaponStorage[k].quality === q) {
                total += gold;
                d.weaponStorage.splice(k, 1);
                removed++;
              }
            }
            d.gold += total;
            Service.saveData();
            self.showToast('回收 ' + removed + ' 件' + label + '，獲得 ' + total + ' 金幣！');
            self.renderWeaponsList();
          });
        };
        batchRow.appendChild(btn);
      }

      batchRecycle(4, '黃', '#2a2a0a');
      batchRecycle(3, '紫', '#2a1a3a');
      batchRecycle(2, '藍', '#1a2a3a');
      batchRecycle(1, '白', '#2a2a2a');

      if (batchRow.children.length > 0) {
        container.appendChild(batchRow);
        /* 分組渲染 */
        var groups = [
          { q:4, label:'黃', color:'#ffd700' },
          { q:3, label:'紫', color:'#9b59b6' },
          { q:2, label:'藍', color:'#3498db' },
          { q:1, label:'白', color:'#b0b0b0' }
        ];
        for (var g = 0; g < groups.length; g++) {
          var grp = groups[g];
          var grpItems = [];
          for (var x = 0; x < d.weaponStorage.length; x++) {
            if (d.weaponStorage[x].quality === grp.q) {
              grpItems.push({ w: d.weaponStorage[x], i: x });
            }
          }
          if (grpItems.length === 0) continue;
          grpItems.sort(function(a, b) { return (b.w.atkPct || 0) - (a.w.atkPct || 0); });

          var grpTitle = document.createElement('div');
          grpTitle.style.cssText = 'padding:8px 12px 4px;font-size:13px;font-weight:bold;color:' + grp.color + ';';
          grpTitle.textContent = '■ ' + grp.label + ' (' + grpItems.length + ')';
          container.appendChild(grpTitle);

          for (var j = 0; j < grpItems.length; j++) {
            (function(item) {
              var idx = item.i;
              var w = item.w;
              var qName = WEAPON_QUALITY[w.quality] ? WEAPON_QUALITY[w.quality].name : '?';
              var qColor = WEAPON_QUALITY[w.quality] ? WEAPON_QUALITY[w.quality].color : '#888';
              var wIcon = WEAPON_TYPE_ICONS[w.type] || '🗡️';
              var wLabel = WEAPON_TYPE_LABELS[w.type] || '刀';
              var card = document.createElement('div');
              card.className = 'weapon-card';
              var stats = '<span style="color:' + qColor + ';font-weight:bold;">[' + qName + ']</span> ';
              stats += wIcon + ' ' + wLabel + ' ';
              stats += '⚔+' + w.atkPct + '%';
              if (w.hpPct) stats += ' ❤+' + w.hpPct + '%';
              if (w.spd) stats += ' 🏃+' + w.spd;
              card.innerHTML = '<div class="wc-weapon">' + stats + '</div>';
              var btnRow = document.createElement('div');
              btnRow.className = 'weapon-btn-row';
              var candidates = [];
              for (var k = 0; k < d.ownedHeroes.length; k++) {
                var hd2 = getHeroData(d.ownedHeroes[k]);
                if (hd2 && Service.getHeroWeaponType(hd2) === w.type) {
                  candidates.push(d.ownedHeroes[k]);
                }
              }
              var equipBtn = document.createElement('span');
                equipBtn.className = 'weapon-recycle-btn';
                equipBtn.style.cssText = 'background:#1a3a1a;border-color:#2a6a2a;';
                equipBtn.textContent = '📦 裝備';
                equipBtn.onclick = function() {
                  if (candidates.length === 0) {
                    self.showToast('沒有適合的人選');
                  } else if (candidates.length === 1) {
                    Service.equipStoredWeapon(idx, candidates[0]);
                    self.showToast('已裝備至武將！');
                    self.renderWeaponsList();
                  } else {
                    self.showWeaponEquipDialog(idx, candidates);
                  }
                };
                btnRow.appendChild(equipBtn);
              var recycleGold = WEAPON_QUALITY[w.quality] ? WEAPON_QUALITY[w.quality].recycleGold : 0;
              var recycleBtn = document.createElement('span');
              recycleBtn.className = 'weapon-recycle-btn';
              recycleBtn.textContent = '🗑️ 回收 +' + recycleGold + '💰';
              recycleBtn.onclick = function(i2, gold) {
                return function() {
                  self.showConfirm('確定要回收這把武器嗎？可獲得 ' + gold + ' 金幣', function() {
                    var g = Service.recycleStoredWeapon(i2);
                    if (g > 0) self.showToast('回收成功，獲得 ' + g + ' 金幣！');
                    self.renderWeaponsList();
                  });
                };
              }(idx, recycleGold);
              btnRow.appendChild(recycleBtn);
              card.appendChild(btnRow);
              container.appendChild(card);
            })(grpItems[j]);
          }
        }
      } else {
        /* 不分組，直接依品質+攻擊力排序 */
        var storageSorted = d.weaponStorage.map(function(w, i) { return { w: w, i: i }; });
        storageSorted.sort(function(a, b) {
          if (b.w.quality !== a.w.quality) return b.w.quality - a.w.quality;
          return (b.w.atkPct || 0) - (a.w.atkPct || 0);
        });
        for (var j = 0; j < storageSorted.length; j++) {
          (function(item) {
            var idx = item.i;
            var w = item.w;
            var qName = WEAPON_QUALITY[w.quality] ? WEAPON_QUALITY[w.quality].name : '?';
            var qColor = WEAPON_QUALITY[w.quality] ? WEAPON_QUALITY[w.quality].color : '#888';
            var wIcon = WEAPON_TYPE_ICONS[w.type] || '🗡️';
            var wLabel = WEAPON_TYPE_LABELS[w.type] || '刀';
            var card = document.createElement('div');
            card.className = 'weapon-card';
            var stats = '<span style="color:' + qColor + ';font-weight:bold;">[' + qName + ']</span> ';
            stats += wIcon + ' ' + wLabel + ' ';
            stats += '⚔+' + w.atkPct + '%';
            if (w.hpPct) stats += ' ❤+' + w.hpPct + '%';
            if (w.spd) stats += ' 🏃+' + w.spd;
            card.innerHTML = '<div class="wc-weapon">' + stats + '</div>';
            var btnRow = document.createElement('div');
            btnRow.className = 'weapon-btn-row';
            var candidates = [];
            for (var k = 0; k < d.ownedHeroes.length; k++) {
              var hd2 = getHeroData(d.ownedHeroes[k]);
              if (hd2 && Service.getHeroWeaponType(hd2) === w.type) {
                candidates.push(d.ownedHeroes[k]);
              }
            }
            var equipBtn = document.createElement('span');
              equipBtn.className = 'weapon-recycle-btn';
              equipBtn.style.cssText = 'background:#1a3a1a;border-color:#2a6a2a;';
              equipBtn.textContent = '📦 裝備';
              equipBtn.onclick = function() {
                if (candidates.length === 0) {
                  self.showToast('沒有適合的人選');
                } else if (candidates.length === 1) {
                  Service.equipStoredWeapon(idx, candidates[0]);
                  self.showToast('已裝備至武將！');
                  self.renderWeaponsList();
                } else {
                  self.showWeaponEquipDialog(idx, candidates);
                }
              };
              btnRow.appendChild(equipBtn);
            var recycleGold = WEAPON_QUALITY[w.quality] ? WEAPON_QUALITY[w.quality].recycleGold : 0;
            var recycleBtn = document.createElement('span');
            recycleBtn.className = 'weapon-recycle-btn';
            recycleBtn.textContent = '🗑️ 回收 +' + recycleGold + '💰';
            recycleBtn.onclick = function(i2, gold) {
              return function() {
                self.showConfirm('確定要回收這把武器嗎？可獲得 ' + gold + ' 金幣', function() {
                  var g = Service.recycleStoredWeapon(i2);
                  if (g > 0) self.showToast('回收成功，獲得 ' + g + ' 金幣！');
                  self.renderWeaponsList();
                });
              };
            }(idx, recycleGold);
            btnRow.appendChild(recycleBtn);
            card.appendChild(btnRow);
            container.appendChild(card);
          })(storageSorted[j]);
        }
      }
    }

    /* 其餘武將 */
    if (otherList.length > 0) {
      var oTitle = document.createElement('div');
      oTitle.style.cssText = 'padding:6px 12px;color:#c0b0a0;font-size:14px;font-weight:bold;';
      oTitle.textContent = '— 其餘武將 (' + otherList.length + ') —';
      container.appendChild(oTitle);
      for (var oi = 0; oi < otherList.length; oi++) {
        var card2 = renderWeaponCard(otherList[oi], false);
        if (card2) container.appendChild(card2);
      }
    }
  };

UI.showWeaponEquipDialog = function(storageIndex, candidates) {
    var self = this;
    var w = Service.appData.weaponStorage[storageIndex];
    if (!w) return;
    var qName = WEAPON_QUALITY[w.quality] ? WEAPON_QUALITY[w.quality].name : '?';
    var qColor = WEAPON_QUALITY[w.quality] ? WEAPON_QUALITY[w.quality].color : '#888';
    var wIcon = WEAPON_TYPE_ICONS[w.type] || '🗡️';
    var wLabel = WEAPON_TYPE_LABELS[w.type] || '刀';
    var overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.7);z-index:9999;display:flex;align-items:center;justify-content:center;';
    var html = '<div style="background:#1a1208;border:2px solid #4a3a2a;border-radius:12px;padding:16px;max-width:320px;width:90%;">';
    html += '<div style="text-align:center;font-size:18px;font-weight:bold;margin-bottom:12px;color:' + qColor + ';">' + wIcon + ' 選擇裝備武將</div>';
    html += '<div style="text-align:center;font-size:14px;margin-bottom:8px;color:#c0b0a0;">[' + qName + '] ' + wLabel + ' 武器 ⚔+' + w.atkPct + '%';
    if (w.hpPct) html += ' ❤+' + w.hpPct + '%';
    if (w.spd) html += ' 🏃+' + w.spd;
    html += '</div>';
    html += '<div style="max-height:300px;overflow-y:auto;">';
    var deployed = Service.getDeployedHeroes();
    var sortedCandidates = candidates.slice();
    sortedCandidates.sort(function(a, b) {
      var aD = deployed.indexOf(a) !== -1 ? 0 : 1;
      var bD = deployed.indexOf(b) !== -1 ? 0 : 1;
      if (aD !== bD) return aD - bD;
      var ha = getHeroData(a), hb = getHeroData(b);
      var ra = ha ? ha.rarity : 0, rb = hb ? hb.rarity : 0;
      if (ra !== rb) return rb - ra;
      return 0;
    });
    for (var i = 0; i < sortedCandidates.length; i++) {
      var hd = getHeroData(sortedCandidates[i]);
      if (!hd) continue;
      var tier = Service.getHeroTier(sortedCandidates[i]);
      var isD = deployed.indexOf(sortedCandidates[i]) !== -1;
      var hasW = Service.getWeapon(sortedCandidates[i]);
      var borderColor = isD ? '#8a7a20' : (hasW ? '#6a5a2a' : '#4a3a2a');
      html += '<div class="gacha-hero-card" style="cursor:pointer;padding:8px;margin:4px 0;border:1px solid ' + borderColor + ';border-radius:6px;background:#2a1a10;" data-idx="' + sortedCandidates[i] + '">';
      html += '<div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">';
      html += '<span style="font-size:20px;">' + hd.emoji + '</span> ';
      html += '<span style="font-size:15px;font-weight:bold;">' + hd.name + '</span> ';
      if (isD) html += '<span class="deployed-badge">已上陣</span> ';
      if (hasW) {
        var hqName = WEAPON_QUALITY[hasW.quality] ? WEAPON_QUALITY[hasW.quality].name : '?';
        var hqColor = WEAPON_QUALITY[hasW.quality] ? WEAPON_QUALITY[hasW.quality].color : '#888';
        html += '<span style="font-size:12px;color:' + hqColor + ';">(' + hqName + ' ⚔+' + hasW.atkPct + '%';
        if (hasW.hpPct) html += ' ❤+' + hasW.hpPct + '%';
        if (hasW.spd) html += ' 🏃+' + hasW.spd;
        html += ')</span>';
      }
      html += '<span style="font-size:12px;color:' + TIER_COLORS[tier] + ';margin-left:auto;">' + TIER_NAMES[tier] + '</span>';
      html += '</div></div>';
    }
    html += '</div>';
    html += '<div style="text-align:center;margin-top:12px;"><span class="gacha-skip-btn" style="cursor:pointer;color:#aaa;font-size:14px;">取消</span></div>';
    html += '</div>';
    overlay.innerHTML = html;
    document.body.appendChild(overlay);
    overlay.onclick = function(e) {
      if (e.target.classList.contains('gacha-skip-btn') || e.target === overlay) {
        overlay.remove();
      }
    };
    var cards = overlay.querySelectorAll('.gacha-hero-card');
    for (var j = 0; j < cards.length; j++) {
      cards[j].onclick = function() {
        var targetHero = this.getAttribute('data-idx');
        var oldW = Service.getWeapon(targetHero);
        Service.equipStoredWeapon(storageIndex, targetHero);
        overlay.remove();
        if (oldW) {
          self.showToast('已交換武器，舊武器放回倉庫！');
        } else {
          self.showToast('已裝備至武將！');
        }
        self.renderWeaponsList();
      };
    }
  };

UI.showConfirm = function(message, onConfirm) {
    var overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.7);z-index:9999;display:flex;align-items:center;justify-content:center;';
    var html = '<div style="background:#1a1208;border:2px solid #4a3a2a;border-radius:12px;padding:16px;max-width:300px;width:85%;text-align:center;">';
    html += '<div style="font-size:16px;color:#e0d4c0;margin-bottom:16px;line-height:1.5;">' + message + '</div>';
    html += '<div style="display:flex;gap:10px;justify-content:center;">';
    html += '<span class="confirm-yes" style="cursor:pointer;padding:6px 20px;background:#3a1a1a;border:1px solid #6a3a2a;border-radius:6px;color:#e0d4c0;font-size:14px;">確定</span>';
    html += '<span class="confirm-no" style="cursor:pointer;padding:6px 20px;background:#2a2a2a;border:1px solid #5a5a5a;border-radius:6px;color:#aaa;font-size:14px;">取消</span>';
    html += '</div></div>';
    overlay.innerHTML = html;
    document.body.appendChild(overlay);
    overlay.onclick = function(e) {
      if (e.target.classList.contains('confirm-no') || e.target === overlay) {
        overlay.remove();
      } else if (e.target.classList.contains('confirm-yes')) {
        overlay.remove();
        if (onConfirm) onConfirm();
      }
    };
  };

UI.showWeaponTransferDialog = function(fromHeroId, candidates) {
    var self = this;
    var w = Service.getWeapon(fromHeroId);
    if (!w) return;
    var fromHero = getHeroData(fromHeroId);
    var qName = WEAPON_QUALITY[w.quality] ? WEAPON_QUALITY[w.quality].name : '?';
    var qColor = WEAPON_QUALITY[w.quality] ? WEAPON_QUALITY[w.quality].color : '#888';
    var wIcon = WEAPON_TYPE_ICONS[w.type] || '🗡️';
    var wLabel = WEAPON_TYPE_LABELS[w.type] || '刀';
    var overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.7);z-index:9999;display:flex;align-items:center;justify-content:center;';
    var html = '<div style="background:#1a1208;border:2px solid #4a3a2a;border-radius:12px;padding:16px;max-width:320px;width:90%;">';
    html += '<div style="text-align:center;font-size:16px;font-weight:bold;margin-bottom:8px;color:' + qColor + ';">🔄 轉移武器</div>';
    html += '<div style="text-align:center;font-size:13px;margin-bottom:4px;color:#c0b0a0;">' + (fromHero ? fromHero.emoji + ' ' + fromHero.name : fromHeroId) + ' → ？</div>';
    html += '<div style="text-align:center;font-size:13px;margin-bottom:10px;color:#c0b0a0;">[' + qName + '] ' + wLabel + ' ⚔+' + w.atkPct + '%';
    if (w.hpPct) html += ' ❤+' + w.hpPct + '%';
    if (w.spd) html += ' 🏃+' + w.spd;
    html += '</div>';
    html += '<div style="max-height:250px;overflow-y:auto;">';
    var deployed2 = Service.getDeployedHeroes();
    var sortedCandidates = candidates.slice();
    sortedCandidates.sort(function(a, b) {
      var aD = deployed2.indexOf(a) !== -1 ? 0 : 1;
      var bD = deployed2.indexOf(b) !== -1 ? 0 : 1;
      if (aD !== bD) return aD - bD;
      var ha = getHeroData(a), hb = getHeroData(b);
      var ra = ha ? ha.rarity : 0, rb = hb ? hb.rarity : 0;
      if (ra !== rb) return rb - ra;
      return 0;
    });
    for (var i = 0; i < sortedCandidates.length; i++) {
      var hd = getHeroData(sortedCandidates[i]);
      if (!hd) continue;
      var tier = Service.getHeroTier(sortedCandidates[i]);
      var isD = deployed2.indexOf(sortedCandidates[i]) !== -1;
      html += '<div class="gacha-hero-card" style="cursor:pointer;padding:8px;margin:4px 0;border:1px solid ' + (isD ? '#8a7a20' : '#4a3a2a') + ';border-radius:6px;background:#2a1a10;" data-idx="' + sortedCandidates[i] + '">';
      html += '<span style="font-size:20px;">' + hd.emoji + '</span> ';
      html += '<span style="font-size:15px;font-weight:bold;">' + hd.name + '</span> ';
      if (isD) html += '<span class="deployed-badge">已上陣</span> ';
      html += '<span style="font-size:12px;color:' + TIER_COLORS[tier] + ';">' + TIER_NAMES[tier] + '</span>';
      html += '</div>';
    }
    html += '</div>';
    html += '<div style="text-align:center;margin-top:10px;"><span class="gacha-skip-btn" style="cursor:pointer;color:#aaa;font-size:14px;">取消</span></div>';
    html += '</div>';
    overlay.innerHTML = html;
    document.body.appendChild(overlay);
    overlay.onclick = function(e) {
      if (e.target.classList.contains('gacha-skip-btn') || e.target === overlay) {
        overlay.remove();
      }
    };
    var cards = overlay.querySelectorAll('.gacha-hero-card');
    for (var j = 0; j < cards.length; j++) {
      cards[j].onclick = function() {
        var toHeroId = this.getAttribute('data-idx');
        Service.transferWeapon(fromHeroId, toHeroId);
        overlay.remove();
        self.showToast('武器已轉移！');
        self.renderWeaponsList();
      };
    }
  };
