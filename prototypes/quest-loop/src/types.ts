export interface Undead {
  id: string;
  name: string;
  type: string;
  power: number;
}

export interface Body {
  type: string;
  quality: number;
}

export type EnemyTag = 'armored' | 'fast' | 'holy' | 'demonic' | 'beast';

export interface Spell {
  id: string;
  name: string;
  bodyCost: number;
  undeadType: string;
  basePower: number;
  strongVs: EnemyTag[];  // what this undead counters
}

export interface WavePreview {
  description: string;  // "A small Crusader patrol" / "Huge demon horde"
  tags: EnemyTag[];     // what the player learns to associate
}

export interface EnemyWave {
  name: string;
  strength: number;
  bodyType: string;
  bodyQuality: number;
  count: number;
  tags: EnemyTag[];
}

export type ScreenName = 'collection' | 'quest' | 'loot';
