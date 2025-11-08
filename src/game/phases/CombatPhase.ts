import { Config } from '../Config';
import { GameState } from '../GameState';
import { Player } from '../../entities/Player';
import { Minion } from '../../entities/Minion';
import { Enemy } from '../../entities/Enemy';

export class CombatPhase {
  player: Player;
  minions: Minion[] = [];
  enemies: Enemy[] = [];
  enemySpawnTimer: number = 0;
  gameOver: boolean = false;
  private mouseDownHandler: (e: MouseEvent) => void;
  private mouseUpHandler: (e: MouseEvent) => void;

  constructor(
    private canvas: HTMLCanvasElement,
    private ctx: CanvasRenderingContext2D,
    private gameState: GameState,
    private onGameOver: () => void
  ) {
    this.player = new Player(canvas.width, canvas.height);
    // Don't spawn minions automatically anymore
    // Spawn first enemy immediately
    this.spawnEnemy();

    // Setup mouse handlers for hold-to-cast
    this.mouseDownHandler = (e: MouseEvent) => this.handleMouseDown(e);
    this.mouseUpHandler = (e: MouseEvent) => this.handleMouseUp(e);
    canvas.addEventListener('mousedown', this.mouseDownHandler);
    canvas.addEventListener('mouseup', this.mouseUpHandler);
    // Also handle touch events for mobile
    canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      const touch = e.touches[0];
      const mouseEvent = new MouseEvent('mousedown', {
        clientX: touch.clientX,
        clientY: touch.clientY,
      });
      this.handleMouseDown(mouseEvent);
    });
    canvas.addEventListener('touchend', (e) => {
      e.preventDefault();
      const mouseEvent = new MouseEvent('mouseup', {});
      this.handleMouseUp(mouseEvent);
    });
  }

  handleMouseDown(e: MouseEvent) {
    if (this.gameOver) return;

    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (this.player.isClicked(x, y)) {
      this.player.startCast();
    }
  }

  handleMouseUp(e: MouseEvent) {
    if (this.gameOver) return;

    if (this.player.isCasting) {
      const success = this.player.finishCast();
      if (success) {
        this.summonMinion();
      }
      // If not successful, it just fizzles (does nothing)
    }
  }

  summonMinion() {
    // Check if we can summon more minions
    if (this.minions.length >= this.gameState.availableMinions) {
      return; // Can't summon more than available
    }

    // Spawn a new minion near the player
    const angle = Math.random() * Math.PI * 2;
    const distance = 30;
    const x = this.player.x + Math.cos(angle) * distance;
    const y = this.player.y + Math.sin(angle) * distance;

    this.minions.push(
      new Minion(
        x,
        y,
        this.gameState.speedMultiplier,
        this.gameState.damageMultiplier
      )
    );

    this.gameState.liveMinionsInCombat = this.minions.length;
  }

  spawnEnemy() {
    const x = Math.random() * this.canvas.width;
    const enemy = new Enemy(x);
    this.enemies.push(enemy);
  }

  cleanup() {
    this.canvas.removeEventListener('mousedown', this.mouseDownHandler);
    this.canvas.removeEventListener('mouseup', this.mouseUpHandler);
  }

  update(deltaTime: number) {
    if (this.gameOver) return;

    // Update player (cooldown)
    this.player.update(deltaTime);

    // Update combat timer
    this.gameState.combatTimer -= deltaTime * 1000;
    if (this.gameState.combatTimer <= 0) {
      this.cleanup();
      this.gameState.endCombat();
      return;
    }

    // Spawn enemies
    this.enemySpawnTimer += deltaTime * 1000;
    if (this.enemySpawnTimer >= Config.COMBAT.ENEMY_SPAWN_INTERVAL) {
      this.spawnEnemy();
      this.enemySpawnTimer = 0;
    }

    // Update minions
    for (const minion of this.minions) {
      minion.update(deltaTime, this.enemies, this.minions, this.player.x, this.player.y);
    }

    // Update enemies
    for (const enemy of this.enemies) {
      enemy.update(deltaTime, this.player.x, this.player.y, this.minions, this.enemies);

      // Check if enemy reached player (game over)
      if (!this.gameOver) {
        const distance = Math.sqrt(
          (enemy.x - this.player.x) ** 2 + (enemy.y - this.player.y) ** 2
        );
        if (distance < (this.player.size + enemy.size) / 2) {
          this.gameOver = true;
          this.cleanup();
          this.onGameOver();
          return;
        }
      }
    }

    // Remove dead enemies and drop bones
    const deadEnemies = this.enemies.filter((e) => e.isDead);
    if (deadEnemies.length > 0) {
      this.gameState.currentQuestKills += deadEnemies.length;

      // Roll for bone drops
      for (const enemy of deadEnemies) {
        if (Math.random() < Config.ENEMY.BONE_DROP_CHANCE) {
          this.gameState.bones += Config.ENEMY.BONES_PER_DROP;
        }
      }

      this.enemies = this.enemies.filter((e) => !e.isDead);
    }

    // Track and remove dead minions
    const deadMinions = this.minions.filter((m) => m.isDead);
    if (deadMinions.length > 0) {
      // Permanently lose these minions
      this.gameState.loseMinionsPermanently(deadMinions.length);
    }
    this.minions = this.minions.filter((m) => !m.isDead);

    // Update live minion count
    this.gameState.liveMinionsInCombat = this.minions.length;
  }

  draw() {
    // Clear canvas
    this.ctx.fillStyle = '#0a0a0a';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Draw player
    this.player.draw(this.ctx);

    // Draw minions
    for (const minion of this.minions) {
      minion.draw(this.ctx);
    }

    // Draw enemies
    for (const enemy of this.enemies) {
      enemy.draw(this.ctx);
    }

    // Debug info
    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = '16px Arial';
    this.ctx.fillText(`Minions: ${this.minions.length} | Enemies: ${this.enemies.length}`, 10, this.canvas.height - 10);

    // Game over overlay
    if (this.gameOver) {
      this.ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
      this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

      this.ctx.fillStyle = '#ff4444';
      this.ctx.font = 'bold 48px Arial';
      this.ctx.textAlign = 'center';
      this.ctx.fillText('GAME OVER', this.canvas.width / 2, this.canvas.height / 2 - 40);

      this.ctx.fillStyle = '#ffffff';
      this.ctx.font = '24px Arial';
      this.ctx.fillText('An enemy reached your base!', this.canvas.width / 2, this.canvas.height / 2 + 10);

      this.ctx.font = '20px Arial';
      this.ctx.fillText('Click anywhere to restart', this.canvas.width / 2, this.canvas.height / 2 + 50);

      this.ctx.textAlign = 'left';
    }
  }
}
