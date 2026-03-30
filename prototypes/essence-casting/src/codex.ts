import { ARCHETYPES, type ArchetypeDefinition, type BehaviorTag } from './spells.ts';
import { RUNES, type RuneId } from './runes.ts';

// ─── Rune layout for SVG diagrams ──────────────────────────────────────────

const RUNE_POS: Record<RuneId, { cx: number; cy: number }> = {
  breath: { cx: 40, cy: 12 },
  flesh:  { cx: 40, cy: 68 },
  veil:   { cx: 12, cy: 40 },
  chain:  { cx: 68, cy: 40 },
};

// ─── Behavior descriptions ──────────────────────────────────────────────────

function describeBehavior(b: BehaviorTag): string {
  switch (b.type) {
    case 'life_steal': return `Heals ${(b.percent * 100).toFixed(0)}% on hit`;
    case 'regen': return `Regenerates ${b.hpPerSecond} HP/s`;
    case 'fortified': return `Takes ${(b.damageReduction * 100).toFixed(0)}% less damage`;
    case 'dodge': return `${(b.chance * 100).toFixed(0)}% dodge chance`;
    case 'ambush': return `First hit deals ${b.damageMultiplier}\u00d7 damage`;
    case 'slow_on_hit': return `Slows enemies ${(b.percent * 100).toFixed(0)}% for ${b.duration}s`;
    case 'root_on_hit': return `Roots enemies for ${b.duration}s`;
    case 'aoe_slow': return `Slows nearby enemies ${(b.percent * 100).toFixed(0)}%`;
    case 'phase': return 'Phases through enemies';
    case 'stationary': return 'Cannot move';
    case 'life_tether': return `Drains ${b.dps} DPS from nearest enemy`;
    case 'rage': return `Up to ${b.maxAttackSpeedBonus}\u00d7 attack speed as HP drops`;
    case 'devour': return `On kill: heals ${(b.healPercent * 100).toFixed(0)}%, +${(b.damageBuff * 100).toFixed(0)}% dmg for ${b.buffDuration}s`;
    case 'aura_ally_buff': return `Allies in range deal +${(b.damageBuff * 100).toFixed(0)}% damage`;
    case 'aura_enemy_debuff': return `Enemies in range attack ${(b.attackSpeedReduction * 100).toFixed(0)}% slower`;
    case 'death_explode': return `Explodes for ${b.damage} damage on death`;
    case 'spawn_minions': return `Spawns a minion every ${b.interval}s`;
    case 'resurrect_nearby': return `Revives a fallen ally every ${b.cooldown}s`;
    case 'scaling_on_kill': return `+${b.damagePerKill} damage per kill`;
    case 'teleport_attack': return 'Teleports to attack';
    case 'decoy_on_hit': return 'Spawns a decoy when hit';
    case 'knockback': return `Knocks enemies back ${b.distance}px`;
    case 'damage_aura': return `Deals ${b.dps} DPS to nearby enemies`;
    case 'protection_aura': return `Allies in range take ${(b.reduction * 100).toFixed(0)}% less damage`;
    case 'taunt': return 'Forces nearby enemies to target this unit';
    case 'miss_aura': return `Enemies in range have ${(b.chance * 100).toFixed(0)}% miss chance`;
    case 'invulnerable_on_spawn': return `Invulnerable for ${b.duration}s after summoning`;
    default: return (b as BehaviorTag).type;
  }
}

function behaviorCategory(type: string): string {
  const cats: Record<string, string> = {
    fortified: 'defensive', dodge: 'defensive', invulnerable_on_spawn: 'defensive', protection_aura: 'defensive',
    ambush: 'offensive', rage: 'offensive', scaling_on_kill: 'offensive', damage_aura: 'offensive',
    slow_on_hit: 'utility', root_on_hit: 'utility', aoe_slow: 'utility', taunt: 'utility', knockback: 'utility',
    life_steal: 'support', regen: 'support', life_tether: 'support', devour: 'support', aura_ally_buff: 'support', resurrect_nearby: 'support',
    phase: 'special', stationary: 'special', teleport_attack: 'special', spawn_minions: 'special', decoy_on_hit: 'special', miss_aura: 'special', death_explode: 'special', aura_enemy_debuff: 'special',
  };
  return cats[type] || 'special';
}

const catClass: Record<string, string> = {
  defensive: 'bhv-defensive', offensive: 'bhv-offensive', utility: 'bhv-utility', support: 'bhv-support', special: 'bhv-special',
};

// ─── Stat formatting ────────────────────────────────────────────────────────

function statColor(v: number): string {
  if (v === 0) return 'stat-grey';
  if (v > 1.0) return 'stat-green';
  if (v === 1.0) return 'stat-white';
  return 'stat-red';
}

// ─── Rune SVG diagram ───────────────────────────────────────────────────────

function buildRuneSVG(runeSequence: RuneId[]): string {
  const w = 80, h = 80;
  const allRunes: RuneId[] = ['breath', 'flesh', 'veil', 'chain'];
  const usedSet = new Set(runeSequence);

  let svg = `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg">`;

  // Connection lines
  for (let i = 0; i < runeSequence.length - 1; i++) {
    const from = RUNE_POS[runeSequence[i]];
    const to = RUNE_POS[runeSequence[i + 1]];
    svg += `<line x1="${from.cx}" y1="${from.cy}" x2="${to.cx}" y2="${to.cy}" stroke="rgba(255,255,255,0.3)" stroke-width="1.5"/>`;
  }

  // Step numbers
  for (let i = 0; i < runeSequence.length; i++) {
    const pos = RUNE_POS[runeSequence[i]];
    svg += `<text x="${pos.cx + 9}" y="${pos.cy - 7}" fill="rgba(255,255,255,0.6)" font-size="8" font-family="monospace" text-anchor="middle">${i + 1}</text>`;
  }

  // Rune circles
  for (const rune of allRunes) {
    const p = RUNE_POS[rune];
    const lit = usedSet.has(rune);
    if (lit) {
      svg += `<circle cx="${p.cx}" cy="${p.cy}" r="7" fill="${RUNES[rune].color}" stroke="#fff" stroke-width="1"/>`;
    } else {
      svg += `<circle cx="${p.cx}" cy="${p.cy}" r="6" fill="#222" stroke="none"/>`;
    }
  }

  // Rune name labels for lit runes
  for (const rune of allRunes) {
    if (!usedSet.has(rune)) continue;
    const p = RUNE_POS[rune];
    const ty = rune === 'breath' ? p.cy - 11 : p.cy + 16;
    svg += `<text x="${p.cx}" y="${ty}" fill="${RUNES[rune].color}" font-size="6" font-family="monospace" text-anchor="middle" font-weight="bold">${RUNES[rune].name}</text>`;
  }

  svg += '</svg>';
  return svg;
}

// ─── Card building ──────────────────────────────────────────────────────────

function buildCard(a: ArchetypeDefinition): HTMLElement {
  const card = document.createElement('div');
  card.className = 'card';
  card.dataset.runes = String(a.runeSequence.length);
  card.style.borderTopColor = a.color;

  const seqHTML = a.runeSequence.map(r =>
    `<span class="rune-pill" style="background:${RUNES[r].color}">${RUNES[r].name}</span>`
  ).join('<span class="rune-arrow">\u2192</span>');

  const statNames = [
    { k: 'health' as const, l: 'HP' },
    { k: 'damage' as const, l: 'Dmg' },
    { k: 'speed' as const, l: 'Spd' },
    { k: 'size' as const, l: 'Size' },
  ];
  const statsHTML = statNames.map(s => {
    const v = a.stats[s.k];
    return `<div class="stat ${statColor(v)}"><span class="stat-label">${s.l}</span><span class="stat-value">${v.toFixed(1)}\u00d7</span></div>`;
  }).join('');

  const bhvHTML = a.behaviors.map(b => {
    const cat = behaviorCategory(b.type);
    return `<span class="behavior-pill ${catClass[cat]}">${describeBehavior(b)}</span>`;
  }).join('');

  card.innerHTML = `
    <div class="card-top">
      ${buildRuneSVG(a.runeSequence)}
      <div>
        <div class="creature-name" style="color:${a.color}">${a.name}</div>
        <div class="creature-desc">${a.description}</div>
      </div>
    </div>
    <div class="rune-seq">${seqHTML}</div>
    <div class="stats-bar">${statsHTML}</div>
    <div class="behaviors">${bhvHTML}</div>
  `;
  return card;
}

// ─── Render ─────────────────────────────────────────────────────────────────

const grid = document.getElementById('grid')!;
const countEl = document.getElementById('count')!;
let currentFilter = 'all';

function render() {
  grid.innerHTML = '';
  let shown = 0;
  for (const a of ARCHETYPES) {
    if (currentFilter !== 'all' && a.runeSequence.length !== parseInt(currentFilter)) continue;
    grid.appendChild(buildCard(a));
    shown++;
  }
  countEl.textContent = `${shown} creature${shown !== 1 ? 's' : ''}`;
}

document.querySelectorAll('.filter-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentFilter = (btn as HTMLElement).dataset.filter!;
    render();
  });
});

render();
