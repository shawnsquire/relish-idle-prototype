import { Config } from '../game/Config';

export class Player {
  x: number;
  y: number;
  size: number;
  color: string;
  summonCooldown: number = 0;
  maxSummonCooldown: number;
  castTime: number;
  currentCastProgress: number = 0;
  isCasting: boolean = false;

  constructor(canvasWidth: number, canvasHeight: number) {
    this.x = canvasWidth * Config.PLAYER.X;
    this.y = canvasHeight * Config.PLAYER.Y;
    this.size = Config.PLAYER.SIZE;
    this.color = Config.PLAYER.COLOR;
    this.maxSummonCooldown = Config.PLAYER.SUMMON_COOLDOWN;
    this.castTime = Config.PLAYER.CAST_TIME;
  }

  update(deltaTime: number) {
    // Update cooldown
    if (this.summonCooldown > 0) {
      this.summonCooldown -= deltaTime;
      if (this.summonCooldown < 0) this.summonCooldown = 0;
    }

    // Update cast progress
    if (this.isCasting) {
      this.currentCastProgress += deltaTime;
    }
  }

  canStartCast(): boolean {
    return this.summonCooldown <= 0 && !this.isCasting;
  }

  startCast() {
    if (this.canStartCast()) {
      this.isCasting = true;
      this.currentCastProgress = 0;
    }
  }

  cancelCast() {
    this.isCasting = false;
    this.currentCastProgress = 0;
  }

  finishCast(): boolean {
    const success = this.currentCastProgress >= this.castTime;
    if (success) {
      this.summonCooldown = this.maxSummonCooldown;
    }
    this.isCasting = false;
    this.currentCastProgress = 0;
    return success;
  }

  getCastProgress(): number {
    return Math.min(this.currentCastProgress / this.castTime, 1);
  }

  isClicked(mouseX: number, mouseY: number): boolean {
    return (
      mouseX >= this.x - this.size / 2 &&
      mouseX <= this.x + this.size / 2 &&
      mouseY >= this.y - this.size / 2 &&
      mouseY <= this.y + this.size / 2
    );
  }

  draw(ctx: CanvasRenderingContext2D) {
    // Draw player as a simple blue block
    ctx.fillStyle = this.color;
    ctx.fillRect(
      this.x - this.size / 2,
      this.y - this.size / 2,
      this.size,
      this.size
    );

    // Draw border
    ctx.strokeStyle = this.isCasting ? '#00ff00' : (this.canStartCast() ? '#ffff00' : '#666');
    ctx.lineWidth = this.isCasting ? 3 : 2;
    ctx.strokeRect(
      this.x - this.size / 2,
      this.y - this.size / 2,
      this.size,
      this.size
    );
  }
}
