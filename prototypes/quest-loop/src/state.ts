import type { Undead, Body, EnemyTag } from './types.ts';
import { generateStartingUndead } from './data.ts';

export interface GameState {
  collection: Undead[];
  jar: { capacity: number; slots: Set<string> };
  bodiesOnField: Body[];
  questUndead: Undead[];
  questLog: string[];
  waveNumber: number;
  waveEnemiesRemaining: number;
  waveHp: number;
  bossDefeated: boolean;
  specialDrops: string[];
  questOutcome: 'ongoing' | 'boss_killed' | 'retreated' | 'wiped';
  lastChance: boolean;
  nextUndeadId: number;
  currentWaveTags: EnemyTag[];
}

export function createInitialState(): GameState {
  return {
    collection: generateStartingUndead(),
    jar: { capacity: 5, slots: new Set() },
    bodiesOnField: [],
    questUndead: [],
    questLog: [],
    waveNumber: 0,
    waveEnemiesRemaining: 0,
    waveHp: 0,
    bossDefeated: false,
    specialDrops: [],
    questOutcome: 'ongoing',
    lastChance: false,
    nextUndeadId: 200,
    currentWaveTags: [],
  };
}

export const state: GameState = createInitialState();

export function resetState(): void {
  const fresh = createInitialState();
  Object.assign(state, fresh);
  state.jar.slots = new Set();
}
