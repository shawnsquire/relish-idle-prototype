import { Config } from '../game/Config';
import { Enemy } from './Enemy';

export class Minion {
  x: number;
  y: number;
  size: number;
  color: string;
  speed: number;
  damage: number;
  health: number;
  maxHealth: number;
  hitChance: number;
  attackCooldown: number = 0;
  target: Enemy | null = null;
  isDead: boolean = false;

  constructor(x: number, y: number, speedMultiplier: number, damageMultiplier: number) {
    this.x = x;
    this.y = y;

    // Randomize stats
    this.size = Config.MINION.SIZE + (Math.random() * 2 - 1) * Config.MINION.SIZE_VARIANCE;
    this.speed = (Config.MINION.SPEED + (Math.random() * 2 - 1) * Config.MINION.SPEED_VARIANCE) * speedMultiplier;
    this.damage = (Config.MINION.DAMAGE + (Math.random() * 2 - 1) * Config.MINION.DAMAGE_VARIANCE) * damageMultiplier;
    const healthRoll = Config.MINION.BASE_HEALTH + (Math.random() * 2 - 1) * Config.MINION.HEALTH_VARIANCE;
    this.health = healthRoll;
    this.maxHealth = healthRoll;
    this.hitChance = Math.min(1, Math.max(0, Config.MINION.HIT_CHANCE + (Math.random() * 2 - 1) * Config.MINION.HIT_CHANCE_VARIANCE));

    this.color = Config.MINION.COLOR;
  }

  takeDamage(amount: number) {
    if (this.isDead) return;
    this.health -= amount;
    if (this.health <= 0) {
      this.health = 0;
      this.isDead = true;
    }
  }

  update(deltaTime: number, enemies: Enemy[], minions: Minion[], playerX: number, playerY: number) {
    if (this.isDead) return;

    // Update attack cooldown
    if (this.attackCooldown > 0) {
      this.attackCooldown -= deltaTime;
    }

    // Lock onto current target until dead, or find new target
    if (!this.target || this.target.isDead) {
      if (enemies.length > 0) {
        this.target = this.findNearestEnemy(enemies);
      } else {
        this.target = null;
      }
    }

    // Move towards target or player
    if (this.target && !this.target.isDead) {
      const distance = this.distanceTo(this.target.x, this.target.y);
      const collisionDist = (this.size + this.target.size) / 2;
      const attackRange = collisionDist + Config.MINION.ATTACK_RANGE;

      // Only move if not in attack range
      if (distance > attackRange) {
        const moved = this.moveTowards(this.target.x, this.target.y, deltaTime, enemies, minions);

        // If can't reach target (blocked), find new one
        if (!moved && distance > attackRange + 10) {
          this.target = this.findAccessibleEnemy(enemies, minions);
        }
      }
      // If in attack range, stop moving and just attack

      // Attack if in range
      if (distance <= attackRange && this.attackCooldown <= 0) {
        // Roll for hit
        if (Math.random() < this.hitChance) {
          this.target.takeDamage(this.damage);
        }
        this.attackCooldown = 1 / Config.MINION.ATTACK_SPEED;
      }
    } else {
      // Return to player
      this.moveTowards(playerX, playerY, deltaTime, enemies, minions);
    }
  }

  moveTowards(targetX: number, targetY: number, deltaTime: number, enemies: Enemy[], minions: Minion[]): boolean {
    const dx = targetX - this.x;
    const dy = targetY - this.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance > 5) {
      const moveDistance = this.speed * deltaTime;

      // Try direct path first
      let newX = this.x + (dx / distance) * moveDistance;
      let newY = this.y + (dy / distance) * moveDistance;

      if (!this.checkCollision(newX, newY, enemies, minions)) {
        this.x = newX;
        this.y = newY;
        return true;
      }

      // If blocked, try sliding around obstacles
      // Try moving along the tangent (perpendicular to collision)
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

        if (!this.checkCollision(newX, newY, enemies, minions)) {
          this.x = newX;
          this.y = newY;
          return true;
        }
      }

      // Still blocked - try smaller movement
      newX = this.x + (dx / distance) * moveDistance * 0.5;
      newY = this.y + (dy / distance) * moveDistance * 0.5;
      if (!this.checkCollision(newX, newY, enemies, minions)) {
        this.x = newX;
        this.y = newY;
        return true;
      }
    }
    return false;
  }

  checkCollision(newX: number, newY: number, enemies: Enemy[], minions: Minion[]): boolean {
    // Check collision with enemies
    for (const enemy of enemies) {
      if (enemy.isDead) continue;
      const dist = Math.sqrt((newX - enemy.x) ** 2 + (newY - enemy.y) ** 2);
      if (dist < (this.size + enemy.size) / 2) {
        return true;
      }
    }

    // Check collision with other minions
    for (const minion of minions) {
      if (minion === this || minion.isDead) continue;
      const dist = Math.sqrt((newX - minion.x) ** 2 + (newY - minion.y) ** 2);
      if (dist < this.size) {
        return true;
      }
    }

    return false;
  }

  findNearestEnemy(enemies: Enemy[]): Enemy {
    let nearest = enemies[0];
    let nearestDist = this.distanceTo(nearest.x, nearest.y);

    for (const enemy of enemies) {
      if (enemy.isDead) continue;
      const dist = this.distanceTo(enemy.x, enemy.y);
      if (dist < nearestDist) {
        nearest = enemy;
        nearestDist = dist;
      }
    }

    return nearest;
  }

  findAccessibleEnemy(enemies: Enemy[], minions: Minion[]): Enemy | null {
    // Try to find an enemy that isn't completely surrounded
    const liveEnemies = enemies.filter(e => !e.isDead);
    if (liveEnemies.length === 0) return null;

    // Sort by distance
    const sorted = liveEnemies.sort((a, b) => {
      return this.distanceTo(a.x, a.y) - this.distanceTo(b.x, b.y);
    });

    return sorted[0];
  }

  distanceTo(x: number, y: number): number {
    const dx = x - this.x;
    const dy = y - this.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  draw(ctx: CanvasRenderingContext2D) {
    if (this.isDead) return;

    // Draw minion body
    ctx.fillStyle = this.color;
    ctx.fillRect(
      this.x - this.size / 2,
      this.y - this.size / 2,
      this.size,
      this.size
    );

    // Draw health bar if damaged
    if (this.health < this.maxHealth) {
      const healthBarWidth = this.size;
      const healthBarHeight = 2;
      const healthPercent = this.health / this.maxHealth;

      // Background
      ctx.fillStyle = '#333';
      ctx.fillRect(
        this.x - healthBarWidth / 2,
        this.y - this.size / 2 - healthBarHeight - 1,
        healthBarWidth,
        healthBarHeight
      );

      // Health
      ctx.fillStyle = '#00ff00';
      ctx.fillRect(
        this.x - healthBarWidth / 2,
        this.y - this.size / 2 - healthBarHeight - 1,
        healthBarWidth * healthPercent,
        healthBarHeight
      );
    }
  }
}
