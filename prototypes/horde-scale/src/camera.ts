import { Container } from 'pixi.js';
import { CONFIG } from './config.ts';

export class Camera {
  /** The PixiJS container that acts as the "world" layer. */
  readonly stage: Container;

  private _zoom = 1;
  private _targetZoom = 1;
  private _panX = 0;
  private _panY = 0;

  /** Whether auto-zoom is enabled (camera pulls back as army grows). */
  autoZoom = true;

  /** Viewport dimensions, updated on resize. */
  private vpW = 0;
  private vpH = 0;

  /* Drag-to-pan state */
  private dragging = false;
  private dragStartX = 0;
  private dragStartY = 0;
  private panStartX = 0;
  private panStartY = 0;

  constructor(stage: Container, canvas: HTMLCanvasElement) {
    this.stage = stage;
    this.resize(canvas.width, canvas.height);
    this.bindEvents(canvas);
  }

  get zoom(): number {
    return this._zoom;
  }

  set zoom(value: number) {
    this._zoom = Math.max(CONFIG.camera.minZoom, Math.min(CONFIG.camera.maxZoom, value));
    this._targetZoom = this._zoom;
  }

  /** Call when viewport resizes. */
  resize(width: number, height: number): void {
    this.vpW = width;
    this.vpH = height;
  }

  /**
   * Compute the ideal zoom level so the given bounding box
   * (of all player units) fits comfortably on screen.
   */
  computeAutoZoom(boundsWidth: number, boundsHeight: number): void {
    if (!this.autoZoom) return;

    const pad = CONFIG.camera.autoZoomPadding;
    const fitW = this.vpW / (boundsWidth * pad + 200);
    const fitH = this.vpH / (boundsHeight * pad + 200);
    const ideal = Math.min(fitW, fitH);
    this._targetZoom = Math.max(CONFIG.camera.minZoom, Math.min(CONFIG.camera.maxZoom, ideal));
  }

  /** Per-frame update: lerp zoom, apply transform. */
  update(centerX: number, centerY: number): void {
    // Smooth zoom
    const lerp = CONFIG.camera.autoZoomLerp;
    this._zoom += (this._targetZoom - this._zoom) * lerp;

    // Center camera on the given world coordinate, offset by pan
    const tx = this.vpW / 2 - centerX * this._zoom + this._panX;
    const ty = this.vpH / 2 - centerY * this._zoom + this._panY;

    this.stage.scale.set(this._zoom);
    this.stage.position.set(tx, ty);
  }

  private bindEvents(canvas: HTMLCanvasElement): void {
    // Mouse-wheel zoom
    canvas.addEventListener('wheel', (e: WheelEvent) => {
      e.preventDefault();
      const dir = e.deltaY > 0 ? -1 : 1;
      this._targetZoom = Math.max(
        CONFIG.camera.minZoom,
        Math.min(CONFIG.camera.maxZoom, this._targetZoom * (1 + dir * CONFIG.camera.zoomSpeed)),
      );
      // When manually zooming, disable auto-zoom
      if (this.autoZoom) {
        this.autoZoom = false;
        const cb = document.getElementById('auto-zoom') as HTMLInputElement | null;
        if (cb) cb.checked = false;
      }
    }, { passive: false });

    // Drag to pan
    canvas.addEventListener('pointerdown', (e: PointerEvent) => {
      this.dragging = true;
      this.dragStartX = e.clientX;
      this.dragStartY = e.clientY;
      this.panStartX = this._panX;
      this.panStartY = this._panY;
      canvas.setPointerCapture(e.pointerId);
    });

    canvas.addEventListener('pointermove', (e: PointerEvent) => {
      if (!this.dragging) return;
      this._panX = this.panStartX + (e.clientX - this.dragStartX);
      this._panY = this.panStartY + (e.clientY - this.dragStartY);
    });

    const endDrag = () => { this.dragging = false; };
    canvas.addEventListener('pointerup', endDrag);
    canvas.addEventListener('pointercancel', endDrag);
  }
}
