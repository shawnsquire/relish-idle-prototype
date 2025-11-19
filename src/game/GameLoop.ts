import { GameState } from './GameState';
import { CombatPhase } from './phases/CombatPhase';
import { TownPhase } from './phases/TownPhase';

export class GameLoop {
  private gameState: GameState;
  private combatPhase: CombatPhase | null = null;
  private townPhase: TownPhase;
  private lastTime: number = 0;
  private animationId: number = 0;
  private hudElement: HTMLElement;
  private summonBarElement: HTMLElement;
  private gameOverActive: boolean = false;
  private restartClickHandler: ((e: MouseEvent) => void) | null = null;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;

  constructor(
    canvas: HTMLCanvasElement,
    ctx: CanvasRenderingContext2D
  ) {
    this.canvas = canvas;
    this.ctx = ctx;
    this.gameState = new GameState();
    this.hudElement = document.getElementById('hud')!;
    this.summonBarElement = document.getElementById('summonBar')!;

    // Initialize town phase
    this.townPhase = new TownPhase(this.gameState, () => this.startCombat());

    // Start with combat
    this.startCombat();
  }

  startCombat() {
    console.log('Starting combat phase');
    this.gameState.startCombat();
    this.combatPhase = new CombatPhase(
      this.canvas,
      this.ctx,
      this.gameState,
      () => this.handleGameOver()
    );
    this.townPhase.hide();
    this.gameOverActive = false;
  }

  handleGameOver() {
    this.gameOverActive = true;
    // Setup restart click handler
    this.restartClickHandler = () => this.restart();
    this.canvas.addEventListener('click', this.restartClickHandler);
  }

  restart() {
    if (this.restartClickHandler) {
      this.canvas.removeEventListener('click', this.restartClickHandler);
      this.restartClickHandler = null;
    }

    // Reset game state
    this.gameState = new GameState();
    this.townPhase = new TownPhase(this.gameState, () => this.startCombat());

    // Start new combat
    this.startCombat();
  }

  start() {
    this.lastTime = performance.now();
    this.loop();
  }

  stop() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
  }

  loop = () => {
    const currentTime = performance.now();
    const deltaTime = (currentTime - this.lastTime) / 1000; // Convert to seconds
    this.lastTime = currentTime;

    this.update(deltaTime);
    this.draw();
    this.updateHUD();
    this.updateSummonBar();

    this.animationId = requestAnimationFrame(this.loop);
  };

  update(deltaTime: number) {
    if (this.gameState.phase === 'combat' && this.combatPhase) {
      this.combatPhase.update(deltaTime);
    }

    // Check if combat ended
    if (this.gameState.phase === 'town') {
        this.townPhase.show();
    }
  }

  draw() {
    if (this.gameState.phase === 'combat' && this.combatPhase) {
      this.combatPhase.draw();
    }
  }

  updateHUD() {
    if (this.gameState.phase === 'combat' && this.combatPhase && !this.gameOverActive) {
      const timeLeft = Math.ceil(this.gameState.combatTimer / 1000);
      const kills = this.gameState.currentQuestKills;
      const minions = this.combatPhase.minions.length;

      this.hudElement.innerHTML = `
        <div class="hud-stat">
          <div class="hud-stat-label">Time</div>
          <div class="hud-stat-value">${timeLeft}s</div>
        </div>
        <div class="hud-stat">
          <div class="hud-stat-label">Kills</div>
          <div class="hud-stat-value">${kills}</div>
        </div>
        <div class="hud-stat">
          <div class="hud-stat-label">Minions</div>
          <div class="hud-stat-value">${minions}/${this.gameState.availableMinions}</div>
        </div>
      `;
    } else {
      this.hudElement.innerHTML = '';
    }
  }

  updateSummonBar() {
    if (this.gameState.phase === 'combat' && this.combatPhase && !this.gameOverActive) {
      this.summonBarElement.classList.remove('hidden');

      const player = this.combatPhase.player;
      const castProgress = player.getCastProgress();
      const cooldownPercent = 1 - (player.summonCooldown / player.maxSummonCooldown);

      // Update class for styling
      if (player.isCasting) {
        this.summonBarElement.className = 'casting';
      } else if (player.canStartCast()) {
        this.summonBarElement.className = 'ready';
      } else {
        this.summonBarElement.className = '';
      }

      // Update content
      if (player.isCasting) {
        const heightPercent = castProgress * 100;
        this.summonBarElement.innerHTML = `
          <div class="summon-fill" style="height: ${heightPercent}%"></div>
          <div class="summon-label">CASTING<br>${Math.floor(castProgress * 100)}%</div>
        `;
      } else if (player.summonCooldown > 0) {
        const heightPercent = cooldownPercent * 100;
        this.summonBarElement.innerHTML = `
          <div class="summon-cooldown" style="height: ${heightPercent}%"></div>
          <div class="summon-label">COOLDOWN</div>
        `;
      } else {
        this.summonBarElement.innerHTML = `
          <div class="summon-cooldown" style="height: 100%"></div>
          <div class="summon-label">READY!</div>
        `;
      }
    } else {
      this.summonBarElement.classList.add('hidden');
    }
  }
}
