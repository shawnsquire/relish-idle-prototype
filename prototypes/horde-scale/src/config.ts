/** Tunable constants for the horde-scale prototype. */

export const CONFIG = {
  /** World dimensions (logical pixels, before zoom). */
  world: {
    width: 2000,
    height: 2000,
  },

  /** Player unit properties. */
  player: {
    radius: 3,
    color: 0x00ccaa,
    speed: 1.2,
    hp: 3,
    /** Damage dealt per overlap frame. */
    damage: 1,
  },

  /** Enemy unit properties. */
  enemy: {
    radiusMin: 4,
    radiusMax: 6,
    color: 0xff4422,
    colorAlt: 0xff8833,
    speed: 0.6,
    hp: 2,
    damage: 1,
  },

  /** Boids flocking parameters. */
  boids: {
    separationDist: 12,
    alignmentDist: 40,
    cohesionDist: 60,
    separationWeight: 1.8,
    alignmentWeight: 1.0,
    cohesionWeight: 0.8,
    maxSpeed: 1.4,
    /** Only consider this many nearest neighbors (perf). */
    maxNeighbors: 12,
  },

  /** Enemy wave spawning. */
  spawn: {
    /** Base interval between waves (ms). */
    baseInterval: 2000,
    /** Units per wave at t=0. */
    baseCount: 3,
    /** Wave count growth per minute. */
    growthPerMinute: 2,
    /** Spawn margin outside the visible area. */
    edgeMargin: 60,
  },

  /** Camera / zoom. */
  camera: {
    minZoom: 0.05,
    maxZoom: 3.0,
    zoomSpeed: 0.1,
    /** Auto-zoom target: fit this many world-units across the viewport. */
    autoZoomPadding: 1.4,
    /** Auto-zoom interpolation speed (0-1, per frame). */
    autoZoomLerp: 0.03,
  },

  /** Default starting unit count. */
  defaultPlayerCount: 1000,
} as const;
