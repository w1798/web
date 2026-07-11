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

  var path = Game.mapLayout.path;
  if (this.pathIndex >= path.length - 1) {
    this.reachEnd();
    return;
  }

  this.moveProgress += this.speed * dt;
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
