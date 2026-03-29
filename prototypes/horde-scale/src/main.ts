import { Application, Graphics } from 'pixi.js';
import { CONFIG } from './config.ts';
import { Camera } from './camera.ts';
import { Horde } from './horde.ts';
import './style.css';

async function main(): Promise<void> {
  // ── PixiJS setup ──────────────────────────────────────────────────────

  const app = new Application();
  await app.init({
    background: 0x0a0a0a,
    resizeTo: window,
    antialias: false,
    resolution: Math.min(window.devicePixelRatio, 2),
    autoDensity: true,
  });

  const container = document.getElementById('canvas-container')!;
  container.appendChild(app.canvas);

  // Graphics layers — one per team for batched drawing
  const playerGfx = new Graphics();
  const enemyGfx = new Graphics();
  app.stage.addChild(enemyGfx);
  app.stage.addChild(playerGfx);

  // ── Systems ───────────────────────────────────────────────────────────

  const camera = new Camera(app.stage, app.canvas as HTMLCanvasElement);
  const horde = new Horde(playerGfx, enemyGfx);

  // Initial spawn
  horde.spawnPlayers(CONFIG.defaultPlayerCount);

  // ── DOM controls ──────────────────────────────────────────────────────

  const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

  const zoomSlider = $<HTMLInputElement>('zoom-slider');
  const zoomValue = $<HTMLSpanElement>('zoom-value');
  const spawnSlider = $<HTMLInputElement>('spawn-slider');
  const spawnValue = $<HTMLSpanElement>('spawn-value');
  const autoZoomCb = $<HTMLInputElement>('auto-zoom');
  const statPlayer = $<HTMLSpanElement>('stat-player');
  const statEnemies = $<HTMLSpanElement>('stat-enemies');
  const statFps = $<HTMLSpanElement>('stat-fps');
  const statZoom = $<HTMLSpanElement>('stat-zoom');
  const resetBtn = $<HTMLButtonElement>('reset-btn');

  // Preset buttons
  const presetBtns = document.querySelectorAll<HTMLButtonElement>('.preset-btn');
  let activePreset: number = CONFIG.defaultPlayerCount;

  presetBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      const count = parseInt(btn.dataset.count!, 10);
      activePreset = count;
      horde.setPlayerCount(count);
      presetBtns.forEach((b) => b.classList.toggle('active', b === btn));
    });
  });

  // Zoom slider
  zoomSlider.addEventListener('input', () => {
    const val = parseFloat(zoomSlider.value);
    camera.zoom = val;
    camera.autoZoom = false;
    autoZoomCb.checked = false;
    zoomValue.textContent = val.toFixed(2);
  });

  // Spawn rate slider
  spawnSlider.addEventListener('input', () => {
    const val = parseFloat(spawnSlider.value);
    horde.spawnRateMultiplier = val;
    spawnValue.textContent = val.toFixed(1);
  });

  // Auto-zoom toggle
  autoZoomCb.addEventListener('change', () => {
    camera.autoZoom = autoZoomCb.checked;
  });

  // Reset
  resetBtn.addEventListener('click', () => {
    horde.reset();
    horde.spawnPlayers(activePreset);
    camera.autoZoom = autoZoomCb.checked;
  });

  // ── Resize handler ────────────────────────────────────────────────────

  window.addEventListener('resize', () => {
    camera.resize(window.innerWidth, window.innerHeight);
  });

  // ── Game loop ─────────────────────────────────────────────────────────

  let statsTimer = 0;

  app.ticker.add((ticker) => {
    const dt = ticker.deltaTime;

    // Update simulation
    horde.update(dt, window.innerWidth, window.innerHeight, camera.zoom);

    // Auto-zoom based on player army spread
    const [minX, minY, maxX, maxY] = horde.getPlayerBounds();
    camera.computeAutoZoom(maxX - minX, maxY - minY);

    // Camera follows player centroid
    const [cx, cy] = horde.getPlayerCenter();
    camera.update(cx, cy);

    // Draw units
    horde.draw();

    // Update stats at reduced frequency
    statsTimer += dt;
    if (statsTimer > 10) {
      statsTimer = 0;
      statPlayer.textContent = horde.players.count.toLocaleString();
      statEnemies.textContent = horde.enemies.count.toLocaleString();
      statFps.textContent = Math.round(ticker.FPS).toString();
      const z = camera.zoom;
      statZoom.textContent = z.toFixed(2);
      zoomSlider.value = z.toString();
      zoomValue.textContent = z.toFixed(2);
    }
  });
}

main().catch(console.error);
