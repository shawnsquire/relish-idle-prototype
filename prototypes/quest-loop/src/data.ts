import type { Undead, Spell, EnemyWave, WavePreview, EnemyTag } from './types.ts';

// 20 varied undead, sorted by power in render
export function generateStartingUndead(): Undead[] {
  let id = 0;
  const u = (name: string, type: string, power: number): Undead =>
    ({ id: `u${id++}`, name, type, power });

  return [
    u('Rattles', 'Skeleton', 1),
    u('Dusty', 'Skeleton', 1),
    u('Clickjaw', 'Skeleton', 2),
    u('Bonepile', 'Skeleton', 2),
    u('Skullcap', 'Skeleton', 3),
    u('Rot', 'Zombie', 2),
    u('Shambler', 'Zombie', 3),
    u('Bloat', 'Zombie', 4),
    u('Mawfist', 'Zombie', 5),
    u('Gnasher', 'Ghoul', 4),
    u('Ripper', 'Ghoul', 5),
    u('Hollowshriek', 'Ghoul', 6),
    u('Flickerwisp', 'Shade', 3),
    u('Dimveil', 'Shade', 5),
    u('Chainrattle', 'Soul Shackle', 4),
    u('Graspwound', 'Life Leech', 3),
    u('Bonefort', 'Bone Construct', 6),
    u('Creeping Maw', 'Lurker', 4),
    u('Dreadwall', 'Bone Wall', 7),
    u('Blightclaw', 'Revenant', 8),
  ];
}

export const SPELLS: Spell[] = [
  { id: 's1',  name: 'Revenant',       bodyCost: 1, undeadType: 'Revenant',       basePower: 3, strongVs: ['armored'] },
  { id: 's2',  name: 'Soul Shackle',   bodyCost: 1, undeadType: 'Soul Shackle',   basePower: 2, strongVs: ['holy'] },
  { id: 's3',  name: 'Ghoul',          bodyCost: 2, undeadType: 'Ghoul',          basePower: 4, strongVs: ['beast'] },
  { id: 's4',  name: 'Bone Construct', bodyCost: 4, undeadType: 'Bone Construct', basePower: 5, strongVs: ['armored', 'beast'] },
  { id: 's5',  name: 'Lurker',         bodyCost: 1, undeadType: 'Lurker',         basePower: 3, strongVs: ['fast'] },
  { id: 's6',  name: 'Life Leech',     bodyCost: 2, undeadType: 'Life Leech',     basePower: 3, strongVs: ['holy'] },
  { id: 's7',  name: 'Bone Wall',      bodyCost: 6, undeadType: 'Bone Wall',      basePower: 6, strongVs: ['fast', 'beast'] },
  { id: 's8',  name: 'Shadow Snare',   bodyCost: 2, undeadType: 'Shadow Snare',   basePower: 2, strongVs: ['fast', 'armored'] },
  { id: 's9',  name: 'Shade',          bodyCost: 1, undeadType: 'Shade',          basePower: 4, strongVs: ['holy', 'demonic'] },
  { id: 's10', name: 'Whisper',        bodyCost: 1, undeadType: 'Whisper',        basePower: 2, strongVs: ['demonic'] },
  { id: 's11', name: 'Doppelganger',   bodyCost: 3, undeadType: 'Doppelganger',   basePower: 5, strongVs: ['holy', 'armored'] },
  { id: 's12', name: 'Flesh Golem',    bodyCost: 5, undeadType: 'Flesh Golem',    basePower: 7, strongVs: ['demonic', 'beast'] },
];

// Wave definitions — count reduced for scarcity (bodies are precious)
// Scaled for a 5-unit jar (total power ~15-25)
const WAVE_TABLE: EnemyWave[] = [
  // Early: weak, few bodies
  { name: 'Villagers',    strength: 3,  bodyType: 'villager',   bodyQuality: 1, count: 2, tags: [] },
  { name: 'Militia',      strength: 4,  bodyType: 'militia',    bodyQuality: 1, count: 1, tags: ['armored'] },
  { name: 'Scouts',       strength: 3,  bodyType: 'scout',      bodyQuality: 2, count: 2, tags: ['fast'] },
  // Mid: tagged, scarce
  { name: 'Guards',       strength: 6,  bodyType: 'guard',      bodyQuality: 2, count: 1, tags: ['armored'] },
  { name: 'Crusaders',    strength: 8,  bodyType: 'crusader',   bodyQuality: 3, count: 1, tags: ['armored', 'holy'] },
  { name: 'Wolf Riders',  strength: 7,  bodyType: 'wolf_rider', bodyQuality: 3, count: 1, tags: ['fast', 'beast'] },
  // Late: tough, valuable
  { name: 'Knights',      strength: 10, bodyType: 'knight',     bodyQuality: 3, count: 1, tags: ['armored'] },
  { name: 'Templars',     strength: 12, bodyType: 'templar',    bodyQuality: 4, count: 1, tags: ['holy', 'armored'] },
  { name: 'Hellhounds',   strength: 10, bodyType: 'hellhound',  bodyQuality: 4, count: 1, tags: ['beast', 'demonic'] },
  // Pre-boss: dangerous
  { name: 'Inquisitors',  strength: 14, bodyType: 'inquisitor', bodyQuality: 5, count: 1, tags: ['holy', 'fast'] },
  { name: 'Demon Scouts', strength: 15, bodyType: 'demon',      bodyQuality: 5, count: 1, tags: ['demonic', 'fast'] },
  { name: 'Archon Guard', strength: 18, bodyType: 'archon',     bodyQuality: 6, count: 1, tags: ['holy', 'armored'] },
];

const BOSS_WAVE: EnemyWave = {
  name: 'Elder Dragon', strength: 120, bodyType: 'dragon', bodyQuality: 7, count: 1,
  tags: ['beast', 'demonic'],
};

export function getWaveForNumber(waveNumber: number): EnemyWave {
  if (waveNumber > WAVE_TABLE.length) return BOSS_WAVE;
  return WAVE_TABLE[waveNumber - 1];
}

export function getBossWaveNumber(): number {
  return WAVE_TABLE.length + 1;
}

// Vague descriptors for wave previews — player learns to associate these
const SIZE_WORDS = ['A small', 'A', 'A tactical', 'A large', 'A huge', 'An overwhelming'];
const FLAVOR: Record<string, string[]> = {
  '': ['group', 'band'],
  'armored': ['shield wall', 'column', 'regiment'],
  'fast': ['raiding party', 'skirmish line', 'flanking squad'],
  'holy': ['procession', 'crusade', 'blessed host'],
  'demonic': ['summoning circle', 'warband', 'fiend pack'],
  'beast': ['pack', 'stampede', 'hunting party'],
};

export function getWavePreview(wave: EnemyWave): WavePreview {
  const sizeIdx = Math.min(Math.floor(wave.strength / 5), SIZE_WORDS.length - 1);
  const sizeWord = SIZE_WORDS[sizeIdx];

  // Pick a flavor word based on the first tag (or generic)
  const tagKey = wave.tags[0] || '';
  const flavors = FLAVOR[tagKey] || FLAVOR[''];
  const flavor = flavors[Math.floor(Math.random() * flavors.length)];

  const description = `${sizeWord} ${wave.name} ${flavor}`;
  return { description, tags: wave.tags };
}

// Tag display names and colors for the UI
export const TAG_DISPLAY: Record<string, { label: string; color: string }> = {
  'armored': { label: 'Armored', color: '#8a8a8a' },
  'fast':    { label: 'Fast',    color: '#e8a435' },
  'holy':    { label: 'Holy',    color: '#f0e060' },
  'demonic': { label: 'Demonic', color: '#c44040' },
  'beast':   { label: 'Beast',   color: '#6aaa40' },
};

// Check if a spell's undead counters any of the given enemy tags
export function getEffectiveness(spell: Spell, enemyTags: EnemyTag[]): 'strong' | 'neutral' {
  const matches = spell.strongVs.filter(t => enemyTags.includes(t));
  return matches.length > 0 ? 'strong' : 'neutral';
}
