import { Config } from '../game/Config';
import { Minion } from './Minion';

export class Enemy {
  x: number;
  y: number;
  size: number;
  color: string;
  speed: number;
  health: number;
  maxHealth: number;
  damage: number;
  attackCooldown: number = 0;
  isDead: boolean = false;

  constructor(x: number) {
    this.x = x;
    this.y = Config.COMBAT.ENEMY_SPAWN_Y;
    this.size = Config.ENEMY.SIZE;
    this.color = Config.ENEMY.COLOR;
    this.speed = Config.ENEMY.SPEED;
    this.health = Config.ENEMY.BASE_HEALTH;
    this.maxHealth = Config.ENEMY.BASE_HEALTH;
    this.damage = Config.ENEMY.DAMAGE;
  }

  update(deltaTime: number, playerX: number, playerY: number, minions: Minion[], enemies: Enemy[]) {
    if (this.isDead) return;

    // Update attack cooldown
    if (this.attackCooldown > 0) {
      this.attackCooldown -= deltaTime;
    }

    // Attack nearby minions
    for (const minion of minions) {
      if (minion.isDead) continue;
      const distance = this.distanceTo(minion.x, minion.y);
      if (distance <= Config.ENEMY.ATTACK_RANGE + (this.size + minion.size) / 2) {
        if (this.attackCooldown <= 0) {
          minion.takeDamage(this.damage);
          this.attackCooldown = 1 / Config.ENEMY.ATTACK_SPEED;
        }
        return; // Stop moving if attacking
      }
    }

    // Move towards player with collision detection and sliding
    const dx = playerX - this.x;
    const dy = playerY - this.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance > this.size) {
      const moveDistance = this.speed * deltaTime;

      // Try direct path first
      let newX = this.x + (dx / distance) * moveDistance;
      let newY = this.y + (dy / distance) * moveDistance;

      if (!this.checkEnemyCollision(newX, newY, enemies)) {
        this.x = newX;
        this.y = newY;
        return;
      }

      // If blocked, try sliding around
      const angles = [
        Math.PI / 4,   // 45 degrees right
        -Math.PI / 4,  // 45 degrees left
        Math.PI / 2,   // 90 degrees right
        -Math.PI / 2,  // 90 degrees left
      ];

      for (const angleOffset of angles) {
        const angle = Math.atan2(dy, dx) + angleOffset;
        newX = this.x + Math.cos(angle) * moveDistance;
        newY = this.y + Math.sin(angle) * moveDistance;

        if (!this.checkEnemyCollision(newX, newY, enemies)) {
          this.x = newX;
          this.y = newY;
          return;
        }
      }
    }
  }

  checkEnemyCollision(newX: number, newY: number, enemies: Enemy[]): boolean {
    for (const enemy of enemies) {
      if (enemy === this || enemy.isDead) continue;
      const dist = Math.sqrt((newX - enemy.x) ** 2 + (newY - enemy.y) ** 2);
      if (dist < (this.size + enemy.size) / 2) {
        return true;
      }
    }
    return false;
  }

  distanceTo(x: number, y: number): number {
    const dx = x - this.x;
    const dy = y - this.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  takeDamage(amount: number) {
    if (this.isDead) return;

    this.health -= amount;
    if (this.health <= 0) {
      this.health = 0;
      this.isDead = true;
    }
  }

  draw(ctx: CanvasRenderingContext2D) {
    if (this.isDead) return;

    // Draw enemy body
    ctx.fillStyle = this.color;
    ctx.fillRect(
      this.x - this.size / 2,
      this.y - this.size / 2,
      this.size,
      this.size
    );

    const barWidth = this.size;
    const healthBarHeight = Config.ENEMY.HEALTH_BAR_HEIGHT;
    const attackBarHeight = 2;
    const healthPercent = this.health / this.maxHealth;

    let yOffset = this.y - this.size / 2;

    // Only show health bar if damaged
    if (healthPercent < 1) {
      yOffset -= healthBarHeight + 2;

      // Health bar background
      ctx.fillStyle = '#D00';
      ctx.fillRect(
        this.x - barWidth / 2,
        yOffset,
        barWidth,
        healthBarHeight
      );

      // Health bar foreground
      ctx.fillStyle = '#00ff00';
      ctx.fillRect(
        this.x - barWidth / 2,
        yOffset,
        barWidth * healthPercent,
        healthBarHeight
      );
    }

    // Only show attack bar if has attacked (cooldown started)
    const maxCooldown = 1 / Config.ENEMY.ATTACK_SPEED;
    const hasAttacked = this.attackCooldown > 0 || this.attackCooldown < maxCooldown * 0.95;

    if (hasAttacked) {
      yOffset -= attackBarHeight + 1;
      const cooldownPercent = 1 - (this.attackCooldown / maxCooldown);

      // Attack bar background
      ctx.fillStyle = '#222';
      ctx.fillRect(
        this.x - barWidth / 2,
        yOffset,
        barWidth,
        attackBarHeight
      );

      // Attack bar foreground (yellow when filling, orange when full)
      ctx.fillStyle = cooldownPercent >= 1 ? '#ff8800' : '#ffff00';
      ctx.fillRect(
        this.x - barWidth / 2,
        yOffset,
        barWidth * cooldownPercent,
        attackBarHeight
      );
    }
  }
}
