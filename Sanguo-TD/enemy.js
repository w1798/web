/* ===== 敵軍系統 ===== */
function Enemy(data, startCol, startRow) {
   this.data = data;
   this.name = data.name;
   this.emoji = data.emoji;
   this.maxHp = data.hp;
   this.hp = data.hp;
   this.atk = data.atk;
   this.def = data.def;
   this.speed = data.speed;
   this.color = data.color || '#8a3a3a';
   this.col = startCol;
   this.row = startRow;
   this.pathIndex = 0;
   this.pixelX = 0;
   this.pixelY = 0;
   this.moveProgress = 0;
   this.dead = false;
   this.el = null;
   this.attackCooldown = 0;
   this.weaponType = data.weaponType || 'sword';
   this.stunnedTimer = 0; // 初始化眩暈計數器
   this.slowPct = 0;      // 緩速百分比
   this.slowTimer = 0;    // 緩速計時器

   this.syncPixelPos();
}

Enemy.prototype.syncPixelPos = function() {
  var pos = UI.cellToPixel(this.col, this.row);
  this.pixelX = pos.x;
  this.pixelY = pos.y;
};

Enemy.prototype.update = function(dt) {
  if (this.dead) return;
  this.hp = Math.max(0, this.hp);

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
      var hpBar = this.el.querySelector('.enemy-hp-fill');
      if (hpBar) {
        hpBar.style.width = (hpPct * 100) + '%';
        hpBar.style.background = hpPct < 0.3 ? '#e74c3c' : hpPct < 0.6 ? '#f39c12' : '#2ecc71';
      }
    }
    return; // 眩暈中，跳過行動
  } else {
    // 確保在超時時移除視覺效果
    if (this.el) {
      var stunDiv = this.el.querySelector('.stunned-effect');
      if (stunDiv) stunDiv.remove();
    }
  }

  // 緩速狀態處理
  var currentSpeed = this.speed;
  if (this.slowTimer > 0) {
    this.slowTimer -= dt;
    currentSpeed = this.speed * (1 - (this.slowPct || 0) / 100);
    if (this.el && !this.el.querySelector('.slow-effect')) {
      var slowDiv = document.createElement('div');
      slowDiv.className = 'slow-effect';
      slowDiv.textContent = '❄️';
      slowDiv.style.cssText = 'position:absolute;left:50%;top:-8px;transform:translateX(-50%);font-size:14px;z-index:5;pointer-events:none;';
      this.el.appendChild(slowDiv);
    }
  } else {
    if (this.el) {
      var slowDiv = this.el.querySelector('.slow-effect');
      if (slowDiv) slowDiv.remove();
    }
  }

  var path = Game.mapLayout.path;
  if (this.pathIndex >= path.length - 1) {
    this.reachEnd();
    return;
  }

  this.moveProgress += currentSpeed * dt;
  if (this.moveProgress >= 1) {
    this.moveProgress = 0;
    this.pathIndex++;
    if (this.pathIndex >= path.length - 1) {
      this.reachEnd();
      return;
    }
  }

  var cur = path[this.pathIndex];
  var next = path[Math.min(this.pathIndex + 1, path.length - 1)];
  this.col = cur.col + (next.col - cur.col) * this.moveProgress;
  this.row = cur.row + (next.row - cur.row) * this.moveProgress;

  this.syncPixelPos();

  this.attackCooldown -= dt;
  if (this.attackCooldown <= 0) {
    var target = Combat.findNearestUnit(this.col, this.row, this.data.range || 1);
    if (target) {
      Combat.doEnemyAttack(this, target);
      this.attackCooldown = 1.0 / (this.data.atkSpeed || 1.0);
    }
  }
};

Enemy.prototype.reachEnd = function() {
  Game.lives--;
  this.dead = true;
  UI.updateHUD();
};

Enemy.prototype.takeDamage = function(dmg) {
  var actualDmg = Math.max(1, dmg - this.def);
  this.hp -= actualDmg;
  UI.showDmgNum(this.pixelX, this.pixelY, '-' + actualDmg, '#ff6b6b');
  if (this.hp <= 0) {
    this.hp = 0;
    this.dead = true;
  }
};

Enemy.prototype.attackUnit = function(unit) {
  if (this.attackCooldown > 0) return;
  unit.takeDamage(this.atk);
  this.attackCooldown = 1.0;
};
