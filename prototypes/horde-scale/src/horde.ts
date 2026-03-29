import { Graphics } from 'pixi.js';
import { CONFIG } from './config.ts';

// ─── Unit data stored as parallel arrays for cache-friendly iteration ────────

interface UnitArrays {
  x: Float32Array;
  y: Float32Array;
  vx: Float32Array;
  vy: Float32Array;
  hp: Float32Array;
  radius: Float32Array;
  count: number;
  capacity: number;
}

function createUnitArrays(capacity: number): UnitArrays {
  return {
    x: new Float32Array(capacity),
    y: new Float32Array(capacity),
    vx: new Float32Array(capacity),
    vy: new Float32Array(capacity),
    hp: new Float32Array(capacity),
    radius: new Float32Array(capacity),
    count: 0,
    capacity,
  };
}

function growIfNeeded(units: UnitArrays, needed: number): UnitArrays {
  if (units.count + needed <= units.capacity) return units;
  const newCap = Math.max(units.capacity * 2, units.count + needed);
  const grown = createUnitArrays(newCap);
  grown.x.set(units.x.subarray(0, units.count));
  grown.y.set(units.y.subarray(0, units.count));
  grown.vx.set(units.vx.subarray(0, units.count));
  grown.vy.set(units.vy.subarray(0, units.count));
  grown.hp.set(units.hp.subarray(0, units.count));
  grown.radius.set(units.radius.subarray(0, units.count));
  grown.count = units.count;
  grown.capacity = newCap;
  return grown;
}

// ─── Spatial hash for O(n) neighbor queries ──────────────────────────────────

class SpatialHash {
  private cellSize: number;
  private cells = new Map<number, number[]>();

  constructor(cellSize: number) {
    this.cellSize = cellSize;
  }

  clear(): void {
    this.cells.clear();
  }

  private key(cx: number, cy: number): number {
    // Szudzik pairing, shifted to handle negatives
    const a = cx >= 0 ? 2 * cx : -2 * cx - 1;
    const b = cy >= 0 ? 2 * cy : -2 * cy - 1;
    return a >= b ? a * a + a + b : a + b * b;
  }

  insert(index: number, x: number, y: number): void {
    const cx = Math.floor(x / this.cellSize);
    const cy = Math.floor(y / this.cellSize);
    const k = this.key(cx, cy);
    let cell = this.cells.get(k);
    if (!cell) {
      cell = [];
      this.cells.set(k, cell);
    }
    cell.push(index);
  }

  query(x: number, y: number, radius: number, out: number[]): void {
    const cxMin = Math.floor((x - radius) / this.cellSize);
    const cxMax = Math.floor((x + radius) / this.cellSize);
    const cyMin = Math.floor((y - radius) / this.cellSize);
    const cyMax = Math.floor((y + radius) / this.cellSize);

    // Guard against absurdly large queries
    if ((cxMax - cxMin) * (cyMax - cyMin) > 400) return;

    for (let cx = cxMin; cx <= cxMax; cx++) {
      for (let cy = cyMin; cy <= cyMax; cy++) {
        const k = this.key(cx, cy);
        const cell = this.cells.get(k);
        if (cell) {
          for (let i = 0; i < cell.length; i++) {
            out.push(cell[i]);
          }
        }
      }
    }
  }
}

// ─── Horde Manager ───────────────────────────────────────────────────────────

export class Horde {
  players: UnitArrays;
  enemies: UnitArrays;

  private playerGfx: Graphics;
  private enemyGfx: Graphics;

  private playerHash: SpatialHash;
  private enemyHash: SpatialHash;

  /** Reusable neighbor buffer to avoid allocation. */
  private neighborBuf: number[] = [];

  /** World center (for spawning / boids target). */
  private worldCx: number;
  private worldCy: number;

  /** Elapsed time in seconds (for wave scaling). */
  private elapsed = 0;
  private spawnAccum = 0;
  spawnRateMultiplier = 1;

  constructor(playerGfx: Graphics, enemyGfx: Graphics) {
    this.players = createUnitArrays(16384);
    this.enemies = createUnitArrays(16384);
    this.playerGfx = playerGfx;
    this.enemyGfx = enemyGfx;
    this.worldCx = CONFIG.world.width / 2;
    this.worldCy = CONFIG.world.height / 2;
    this.playerHash = new SpatialHash(CONFIG.boids.cohesionDist);
    this.enemyHash = new SpatialHash(CONFIG.boids.cohesionDist);
  }

  // ── Spawning ─────────────────────────────────────────────────────────────

  spawnPlayers(count: number): void {
    this.players = growIfNeeded(this.players, count);
    const cx = this.worldCx;
    const cy = this.worldCy;
    const spread = Math.min(300, 20 + count * 0.3);

    for (let i = 0; i < count; i++) {
      const idx = this.players.count++;
      const angle = Math.random() * Math.PI * 2;
      const dist = Math.random() * spread;
      this.players.x[idx] = cx + Math.cos(angle) * dist;
      this.players.y[idx] = cy + Math.sin(angle) * dist;
      this.players.vx[idx] = (Math.random() - 0.5) * 0.5;
      this.players.vy[idx] = (Math.random() - 0.5) * 0.5;
      this.players.hp[idx] = CONFIG.player.hp;
      this.players.radius[idx] = CONFIG.player.radius;
    }
  }

  /** Set exact player count (add or cull). */
  setPlayerCount(target: number): void {
    const diff = target - this.players.count;
    if (diff > 0) {
      this.spawnPlayers(diff);
    } else if (diff < 0) {
      this.players.count = target;
    }
  }

  private spawnEnemyWave(count: number, vpW: number, vpH: number, zoom: number): void {
    this.enemies = growIfNeeded(this.enemies, count);
    const halfW = (vpW / zoom) / 2 + CONFIG.spawn.edgeMargin;
    const halfH = (vpH / zoom) / 2 + CONFIG.spawn.edgeMargin;

    for (let i = 0; i < count; i++) {
      const idx = this.enemies.count++;
      // Pick a random edge
      const edge = Math.floor(Math.random() * 4);
      let ex: number, ey: number;
      switch (edge) {
        case 0: ex = this.worldCx - halfW; ey = this.worldCy + (Math.random() - 0.5) * halfH * 2; break;
        case 1: ex = this.worldCx + halfW; ey = this.worldCy + (Math.random() - 0.5) * halfH * 2; break;
        case 2: ex = this.worldCx + (Math.random() - 0.5) * halfW * 2; ey = this.worldCy - halfH; break;
        default: ex = this.worldCx + (Math.random() - 0.5) * halfW * 2; ey = this.worldCy + halfH; break;
      }
      this.enemies.x[idx] = ex;
      this.enemies.y[idx] = ey;
      this.enemies.vx[idx] = 0;
      this.enemies.vy[idx] = 0;
      this.enemies.hp[idx] = CONFIG.enemy.hp;
      const r = CONFIG.enemy.radiusMin + Math.random() * (CONFIG.enemy.radiusMax - CONFIG.enemy.radiusMin);
      this.enemies.radius[idx] = r;
    }
  }

  // ── Core update ──────────────────────────────────────────────────────────

  update(dt: number, vpW: number, vpH: number, zoom: number): void {
    this.elapsed += dt / 60;

    // Spawn enemy waves
    const interval = CONFIG.spawn.baseInterval / this.spawnRateMultiplier;
    this.spawnAccum += dt * (1000 / 60);
    if (this.spawnAccum >= interval) {
      this.spawnAccum -= interval;
      const minutes = this.elapsed / 60;
      const waveSize = Math.floor(CONFIG.spawn.baseCount + minutes * CONFIG.spawn.growthPerMinute);
      this.spawnEnemyWave(waveSize, vpW, vpH, zoom);
    }

    // Build spatial hashes
    this.playerHash.clear();
    for (let i = 0; i < this.players.count; i++) {
      this.playerHash.insert(i, this.players.x[i], this.players.y[i]);
    }
    this.enemyHash.clear();
    for (let i = 0; i < this.enemies.count; i++) {
      this.enemyHash.insert(i, this.enemies.x[i], this.enemies.y[i]);
    }

    // Update player units: boids flocking + drift toward enemies
    this.updateBoids(this.players, this.playerHash, CONFIG.player.speed);

    // Update enemy units: move toward centroid of player army
    this.updateEnemies();

    // Combat: player-enemy overlap
    this.resolveCombat();

    // Remove dead units
    this.compact(this.players);
    this.compact(this.enemies);
  }

  private updateBoids(units: UnitArrays, hash: SpatialHash, speed: number): void {
    const sep = CONFIG.boids.separationDist;
    const ali = CONFIG.boids.alignmentDist;
    const coh = CONFIG.boids.cohesionDist;
    const wSep = CONFIG.boids.separationWeight;
    const wAli = CONFIG.boids.alignmentWeight;
    const wCoh = CONFIG.boids.cohesionWeight;
    const maxSpd = CONFIG.boids.maxSpeed * speed;
    const maxN = CONFIG.boids.maxNeighbors;

    for (let i = 0; i < units.count; i++) {
      const px = units.x[i];
      const py = units.y[i];

      let sepX = 0, sepY = 0;
      let aliVx = 0, aliVy = 0, aliCount = 0;
      let cohX = 0, cohY = 0, cohCount = 0;

      // Query neighbors
      this.neighborBuf.length = 0;
      hash.query(px, py, coh, this.neighborBuf);

      let checked = 0;
      for (let n = 0; n < this.neighborBuf.length && checked < maxN; n++) {
        const j = this.neighborBuf[n];
        if (j === i) continue;
        checked++;

        const dx = px - units.x[j];
        const dy = py - units.y[j];
        const distSq = dx * dx + dy * dy;

        if (distSq < sep * sep && distSq > 0.01) {
          const dist = Math.sqrt(distSq);
          sepX += (dx / dist) / dist;
          sepY += (dy / dist) / dist;
        }

        if (distSq < ali * ali) {
          aliVx += units.vx[j];
          aliVy += units.vy[j];
          aliCount++;
        }

        if (distSq < coh * coh) {
          cohX += units.x[j];
          cohY += units.y[j];
          cohCount++;
        }
      }

      let ax = sepX * wSep;
      let ay = sepY * wSep;

      if (aliCount > 0) {
        ax += (aliVx / aliCount - units.vx[i]) * wAli;
        ay += (aliVy / aliCount - units.vy[i]) * wAli;
      }

      if (cohCount > 0) {
        ax += (cohX / cohCount - px) * 0.005 * wCoh;
        ay += (cohY / cohCount - py) * 0.005 * wCoh;
      }

      // Gentle drift toward center so the army doesn't wander off
      ax += (this.worldCx - px) * 0.0001;
      ay += (this.worldCy - py) * 0.0001;

      units.vx[i] += ax;
      units.vy[i] += ay;

      // Clamp speed
      const spd = Math.sqrt(units.vx[i] ** 2 + units.vy[i] ** 2);
      if (spd > maxSpd) {
        units.vx[i] = (units.vx[i] / spd) * maxSpd;
        units.vy[i] = (units.vy[i] / spd) * maxSpd;
      }

      units.x[i] += units.vx[i];
      units.y[i] += units.vy[i];
    }
  }

  private updateEnemies(): void {
    // Compute player centroid
    let cx = this.worldCx;
    let cy = this.worldCy;
    if (this.players.count > 0) {
      cx = 0; cy = 0;
      for (let i = 0; i < this.players.count; i++) {
        cx += this.players.x[i];
        cy += this.players.y[i];
      }
      cx /= this.players.count;
      cy /= this.players.count;
    }

    const spd = CONFIG.enemy.speed;
    for (let i = 0; i < this.enemies.count; i++) {
      const dx = cx - this.enemies.x[i];
      const dy = cy - this.enemies.y[i];
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > 1) {
        this.enemies.vx[i] = (dx / dist) * spd;
        this.enemies.vy[i] = (dy / dist) * spd;
      }

      // Add slight separation from other enemies
      this.neighborBuf.length = 0;
      this.enemyHash.query(this.enemies.x[i], this.enemies.y[i], 10, this.neighborBuf);
      for (let n = 0; n < this.neighborBuf.length && n < 6; n++) {
        const j = this.neighborBuf[n];
        if (j === i) continue;
        const ex = this.enemies.x[i] - this.enemies.x[j];
        const ey = this.enemies.y[i] - this.enemies.y[j];
        const ed = ex * ex + ey * ey;
        if (ed > 0.01 && ed < 100) {
          const edist = Math.sqrt(ed);
          this.enemies.vx[i] += (ex / edist) * 0.15;
          this.enemies.vy[i] += (ey / edist) * 0.15;
        }
      }

      this.enemies.x[i] += this.enemies.vx[i];
      this.enemies.y[i] += this.enemies.vy[i];
    }
  }

  private resolveCombat(): void {
    const pDmg = CONFIG.player.damage;
    const eDmg = CONFIG.enemy.damage;

    // For each enemy, check nearby players
    for (let ei = 0; ei < this.enemies.count; ei++) {
      if (this.enemies.hp[ei] <= 0) continue;

      this.neighborBuf.length = 0;
      this.playerHash.query(
        this.enemies.x[ei], this.enemies.y[ei],
        this.enemies.radius[ei] + CONFIG.player.radius + 2,
        this.neighborBuf,
      );

      for (let n = 0; n < this.neighborBuf.length; n++) {
        const pi = this.neighborBuf[n];
        if (this.players.hp[pi] <= 0) continue;

        const dx = this.players.x[pi] - this.enemies.x[ei];
        const dy = this.players.y[pi] - this.enemies.y[ei];
        const touchDist = this.players.radius[pi] + this.enemies.radius[ei];

        if (dx * dx + dy * dy < touchDist * touchDist) {
          this.enemies.hp[ei] -= pDmg * 0.05;
          this.players.hp[pi] -= eDmg * 0.03;
        }
      }
    }
  }

  /** Remove dead units by swapping with end. */
  private compact(units: UnitArrays): void {
    let i = 0;
    while (i < units.count) {
      if (units.hp[i] <= 0) {
        const last = units.count - 1;
        if (i < last) {
          units.x[i] = units.x[last];
          units.y[i] = units.y[last];
          units.vx[i] = units.vx[last];
          units.vy[i] = units.vy[last];
          units.hp[i] = units.hp[last];
          units.radius[i] = units.radius[last];
        }
        units.count--;
      } else {
        i++;
      }
    }
  }

  // ── Rendering ────────────────────────────────────────────────────────────

  draw(): void {
    this.drawUnits(this.playerGfx, this.players, CONFIG.player.color);
    this.drawEnemies();
  }

  private drawUnits(gfx: Graphics, units: UnitArrays, color: number): void {
    gfx.clear();
    // For very large counts, reduce alpha slightly so overlaps create density
    const alpha = units.count > 2000 ? 0.7 : units.count > 500 ? 0.85 : 1;
    gfx.fill({ color, alpha });

    for (let i = 0; i < units.count; i++) {
      gfx.circle(units.x[i], units.y[i], units.radius[i]);
    }
    gfx.fill();
  }

  private drawEnemies(): void {
    const gfx = this.enemyGfx;
    gfx.clear();

    const c1 = CONFIG.enemy.color;
    const c2 = CONFIG.enemy.colorAlt;
    const alpha = this.enemies.count > 2000 ? 0.7 : this.enemies.count > 500 ? 0.85 : 1;

    gfx.fill({ color: c1, alpha });
    for (let i = 0; i < this.enemies.count; i++) {
      // Alternate colors for visual variety
      if (i % 3 === 0) {
        gfx.fill();
        gfx.fill({ color: c2, alpha });
      }
      gfx.circle(this.enemies.x[i], this.enemies.y[i], this.enemies.radius[i]);
    }
    gfx.fill();
  }

  // ── Queries ──────────────────────────────────────────────────────────────

  /** Get bounding box of player units. Returns [minX, minY, maxX, maxY]. */
  getPlayerBounds(): [number, number, number, number] {
    if (this.players.count === 0) {
      return [this.worldCx - 100, this.worldCy - 100, this.worldCx + 100, this.worldCy + 100];
    }
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (let i = 0; i < this.players.count; i++) {
      if (this.players.x[i] < minX) minX = this.players.x[i];
      if (this.players.y[i] < minY) minY = this.players.y[i];
      if (this.players.x[i] > maxX) maxX = this.players.x[i];
      if (this.players.y[i] > maxY) maxY = this.players.y[i];
    }
    return [minX, minY, maxX, maxY];
  }

  /** Get centroid of player army. */
  getPlayerCenter(): [number, number] {
    if (this.players.count === 0) return [this.worldCx, this.worldCy];
    let cx = 0, cy = 0;
    for (let i = 0; i < this.players.count; i++) {
      cx += this.players.x[i];
      cy += this.players.y[i];
    }
    return [cx / this.players.count, cy / this.players.count];
  }

  reset(): void {
    this.players.count = 0;
    this.enemies.count = 0;
    this.elapsed = 0;
    this.spawnAccum = 0;
    this.playerGfx.clear();
    this.enemyGfx.clear();
  }
}
