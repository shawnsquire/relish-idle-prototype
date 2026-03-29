import { state } from '../state.ts';
import { SPELLS, getWaveForNumber, getBossWaveNumber, getWavePreview, getEffectiveness, TAG_DISPLAY } from '../data.ts';
import type { ScreenName, Spell, Body } from '../types.ts';

export class QuestScreen {
  private el: HTMLElement;
  private navigate: (screen: ScreenName) => void;
  private interval: ReturnType<typeof setInterval> | null = null;
  private tickSpeed = 1000;
  private enemyStrengthMult = 1;
  private bestFirst = true;
  private hpMult = 5;       // multiply enemy HP for longer fights
  private dmgScale = 0.08;  // army damage as fraction of army power per tick
  private deathChance = 0.3; // base chance of your undead dying when enemy wins roll

  constructor(navigate: (screen: ScreenName) => void) {
    this.navigate = navigate;
    this.el = document.createElement('div');
    this.el.id = 'screen-quest';
    document.getElementById('app')!.appendChild(this.el);
  }

  show(): void {
    this.el.style.display = 'block';
    this.render();
    this.startCombat();
  }

  hide(): void {
    this.el.style.display = 'none';
    this.stopCombat();
  }

  private log(msg: string, cls?: string): void {
    state.questLog.push(msg);
    const logEl = this.el.querySelector('#quest-log');
    if (logEl) {
      const div = document.createElement('div');
      div.textContent = msg;
      if (cls) div.className = cls;
      logEl.appendChild(div);
      logEl.scrollTop = logEl.scrollHeight;
    }
  }

  private startCombat(): void {
    this.stopCombat();
    this.interval = setInterval(() => this.tick(), this.tickSpeed);
  }

  private stopCombat(): void {
    if (this.interval !== null) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }

  private restartCombat(): void {
    this.stopCombat();
    this.interval = setInterval(() => this.tick(), this.tickSpeed);
  }

  // --- Body helpers ---

  private bodyCountSummary(): string {
    const counts: Record<string, number> = {};
    for (const b of state.bodiesOnField) {
      counts[b.type] = (counts[b.type] || 0) + 1;
    }
    if (Object.keys(counts).length === 0) return 'none';
    return Object.entries(counts).map(([t, n]) => `${t} x${n}`).join(', ');
  }

  private canAfford(spell: Spell): boolean {
    return state.bodiesOnField.length >= spell.bodyCost;
  }

  private canCastAnything(): boolean {
    return SPELLS.some(s => this.canAfford(s));
  }

  private consumeBodies(count: number): Body[] {
    const sorted = [...state.bodiesOnField].sort((a, b) =>
      this.bestFirst ? b.quality - a.quality : a.quality - b.quality
    );
    const consumed = sorted.slice(0, count);
    const consumedSet = new Set(consumed);
    const remaining: Body[] = [];
    for (const b of state.bodiesOnField) {
      if (consumedSet.has(b)) {
        consumedSet.delete(b);
      } else {
        remaining.push(b);
      }
    }
    state.bodiesOnField = remaining;
    return consumed;
  }

  private castSpell(spell: Spell): void {
    if (!this.canAfford(spell)) return;
    const consumed = this.consumeBodies(spell.bodyCost);
    const avgQuality = consumed.reduce((s, b) => s + b.quality, 0) / consumed.length;
    const power = Math.round(spell.basePower * avgQuality);
    const bodyDesc = consumed.map(b => b.type).join(', ');

    const id = `summon_${state.nextUndeadId++}`;
    const undead = { id, name: `${spell.undeadType} (raised)`, type: spell.undeadType, power };
    state.questUndead.push(undead);
    this.log(`>> Cast ${spell.name} on [${bodyDesc}] → ${undead.name} (pow ${power}) joins!`, 'log-cast');
    this.refreshUI();
  }

  // --- Combat tick ---

  private tick(): void {
    if (state.questOutcome !== 'ongoing') return;

    // Spawn next wave if current is done
    if (state.waveEnemiesRemaining <= 0 && state.waveHp <= 0) {
      state.waveNumber++;
      const bossAt = getBossWaveNumber();
      const isBoss = state.waveNumber >= bossAt;
      const wave = getWaveForNumber(state.waveNumber);
      const effectiveStrength = Math.round(wave.strength * this.enemyStrengthMult);
      state.waveEnemiesRemaining = wave.count;
      state.waveHp = Math.round(effectiveStrength * this.hpMult);
      state.currentWaveTags = wave.tags;

      if (isBoss) {
        this.log(`=== BOSS: ${wave.name} emerges! ===`, 'log-boss');
      } else {
        const preview = getWavePreview(wave);
        const tagStr = wave.tags.length > 0 ? ` [${wave.tags.join(', ')}]` : '';
        this.log(`--- ${preview.description}${tagStr} ---`, 'log-wave');
      }
      this.refreshUI();
      return; // Give the player a beat to see the new wave before combat starts
    }

    const armyPower = state.questUndead.reduce((s, u) => s + u.power, 0);

    // Wipe check
    if (armyPower <= 0) {
      if (!this.canCastAnything()) {
        state.questOutcome = 'wiped';
        this.log('*** Your army is gone. Quest FAILED. ***', 'log-death');
        this.stopCombat();
        this.refreshUI();
        return;
      }
      this.refreshUI();
      return;
    }

    const wave = getWaveForNumber(state.waveNumber);
    const effectiveStrength = Math.round(wave.strength * this.enemyStrengthMult);

    // Combat: one exchange per tick. Damage is small — waves take multiple ticks.
    const roll = Math.random();
    const armyChance = armyPower / (armyPower + effectiveStrength);

    if (roll < armyChance) {
      // Army hits the enemy — tunable chip damage
      const damage = Math.max(1, Math.ceil(armyPower * this.dmgScale * (0.5 + Math.random())));
      state.waveHp -= damage;

      if (state.waveHp <= 0) {
        state.waveHp = 0;
        state.waveEnemiesRemaining--;

        // Body drops
        const body: Body = { type: wave.bodyType, quality: wave.bodyQuality };
        state.bodiesOnField.push(body);

        const enemyName = wave.count === 1 ? wave.name : wave.name.replace(/s$/, '');
        this.log(`${enemyName} slain! +${wave.bodyType} body (q${wave.bodyQuality})`, 'log-kill');

        // Boss check
        if (state.waveNumber >= getBossWaveNumber() && state.waveEnemiesRemaining <= 0) {
          state.bossDefeated = true;
          state.specialDrops.push('Dragon Heart');
          this.log('*** DRAGON SLAIN! Dragon body + Dragon Heart! ***', 'log-boss');
          this.enterLastChance('boss_killed');
          return;
        }

        // Next enemy in wave
        if (state.waveEnemiesRemaining > 0) {
          state.waveHp = Math.round(wave.strength * this.enemyStrengthMult * this.hpMult);
        }
      }
    } else {
      // Enemy hits your army
      const isBoss = state.waveNumber >= getBossWaveNumber();
      // Boss almost always kills; regular enemies use tunable death chance
      const baseChance = isBoss ? 0.85 : this.deathChance;
      const relativeStr = effectiveStrength / (effectiveStrength + armyPower * 1.5);
      if (Math.random() < baseChance * relativeStr && state.questUndead.length > 0) {
        // Prefer killing weaker undead (weighted random)
        const weights = state.questUndead.map(u => 1 / u.power);
        const totalW = weights.reduce((s, w) => s + w, 0);
        let pick = Math.random() * totalW;
        let idx = 0;
        for (let i = 0; i < weights.length; i++) {
          pick -= weights[i];
          if (pick <= 0) { idx = i; break; }
        }
        const dead = state.questUndead.splice(idx, 1)[0];
        const msg = isBoss
          ? `The Dragon devours ${dead.name} (pow ${dead.power})!`
          : `${dead.name} (pow ${dead.power}) fell!`;
        this.log(msg, 'log-death');
      }
    }

    this.refreshUI();
  }

  private enterLastChance(outcome: 'boss_killed' | 'retreated'): void {
    this.stopCombat();
    if (state.bodiesOnField.length > 0) {
      state.lastChance = true;
      state.questOutcome = outcome;
      this.log(`--- LAST CHANCE: ${state.bodiesOnField.length} bodies remain ---`, 'log-wave');
      this.refreshUI();
    } else {
      state.questOutcome = outcome;
      this.refreshUI();
    }
  }

  // --- Rendering (fixed layout) ---

  private refreshUI(): void {
    this.renderStatus();
    this.renderArmy();
    this.renderBodyCounter();
    this.renderSpells();
    this.renderControls();
  }

  private render(): void {
    this.el.innerHTML = `
      <div class="quest-layout">
        <div class="quest-top">
          <div class="quest-col-left">
            <div id="quest-status-bar" class="quest-status"></div>
            <div id="quest-army" class="quest-army"></div>
            <div id="body-counter" class="body-counter"></div>
          </div>
          <div class="quest-col-right">
            <div id="quest-log" class="quest-log"></div>
          </div>
        </div>
        <div id="spell-panel" class="quest-spells"></div>
        <div id="last-chance-overlay" class="last-chance" style="display:none;"></div>
        <div id="quest-controls" class="quest-controls"></div>
      </div>
      <div id="quest-debug" class="debug-float">
        <button id="debug-toggle" class="debug-toggle-btn">DEBUG</button>
        <div id="debug-body" class="debug-body"></div>
      </div>
    `;

    // Populate log from state
    const logEl = this.el.querySelector('#quest-log')!;
    for (const msg of state.questLog) {
      const div = document.createElement('div');
      div.textContent = msg;
      logEl.appendChild(div);
    }
    logEl.scrollTop = logEl.scrollHeight;

    this.refreshUI();
    this.renderDebug();
  }

  private renderStatus(): void {
    const bar = this.el.querySelector('#quest-status-bar');
    if (!bar) return;

    const bossAt = getBossWaveNumber();
    const waveDisplay = state.waveNumber >= bossAt ? 'BOSS' : `${state.waveNumber}/${bossAt - 1}`;

    // Enemy HP bar
    const wave = state.waveNumber > 0 ? getWaveForNumber(state.waveNumber) : null;
    const maxHp = wave ? Math.round(wave.strength * this.enemyStrengthMult * this.hpMult) : 0;
    const hpPct = maxHp > 0 ? Math.max(0, state.waveHp / maxHp * 100) : 0;

    let html = `<div>Wave ${waveDisplay}`;
    if (state.currentWaveTags.length > 0) {
      html += ` · `;
      html += state.currentWaveTags.map(t => {
        const info = TAG_DISPLAY[t];
        return info ? `<span style="color:${info.color}">${info.label}</span>` : t;
      }).join(' ');
    }
    html += `</div>`;

    if (maxHp > 0) {
      html += `<div class="enemy-hp-bar"><div class="enemy-hp-fill" style="width:${hpPct}%"></div><span class="enemy-hp-text">${state.waveHp}/${maxHp}</span></div>`;
    }

    // Upcoming
    const upcoming: string[] = [];
    for (let i = 1; i <= 2; i++) {
      const n = state.waveNumber + i;
      if (n >= bossAt) { upcoming.push('<span style="color:#c44040">BOSS</span>'); break; }
      if (n > 0) {
        const w = getWaveForNumber(n);
        const p = getWavePreview(w);
        const tags = w.tags.map(t => TAG_DISPLAY[t]?.label || t).join(', ');
        upcoming.push(`${p.description}${tags ? ' [' + tags + ']' : ''}`);
      }
    }
    if (upcoming.length > 0) {
      html += `<div class="upcoming">Next: ${upcoming.join(' → ')}</div>`;
    }

    bar.innerHTML = html;
  }

  private renderArmy(): void {
    const el = this.el.querySelector('#quest-army');
    if (!el) return;

    const sorted = [...state.questUndead].sort((a, b) => b.power - a.power);
    const totalPower = sorted.reduce((s, u) => s + u.power, 0);

    let html = `<div class="army-header">Army: ${sorted.length} undead · power ${totalPower}</div>`;
    html += `<div class="army-list">`;
    for (const u of sorted) {
      html += `<span class="army-unit" title="${u.type}">${u.name} <small>(${u.power})</small></span>`;
    }
    html += `</div>`;
    el.innerHTML = html;
  }

  private renderBodyCounter(): void {
    const el = this.el.querySelector('#body-counter');
    if (!el) return;
    const count = state.bodiesOnField.length;
    el.innerHTML = `BODIES: ${count > 0 ? this.bodyCountSummary() : 'none'}`;
  }

  private renderSpells(): void {
    const panel = this.el.querySelector('#spell-panel');
    if (!panel) return;

    if (state.lastChance) {
      this.renderLastChance();
      panel.innerHTML = '';
      return;
    }

    const waveTags = state.currentWaveTags;
    let html = `<div class="spell-grid">`;
    for (const spell of SPELLS) {
      const afford = this.canAfford(spell);
      const isStrong = getEffectiveness(spell, waveTags) === 'strong';
      const active = afford && state.questOutcome === 'ongoing';
      const cls = active ? (isStrong ? 'spell-card strong' : 'spell-card available') : 'spell-card disabled';

      html += `<button class="${cls}" data-spell-id="${spell.id}" ${active ? '' : 'disabled'}>`;
      html += `<div class="sc-name">${spell.name}</div>`;
      html += `<div class="sc-cost">${spell.bodyCost} bod${spell.bodyCost > 1 ? 'ies' : 'y'}</div>`;
      html += `<div class="sc-tags">${spell.strongVs.map(t => {
        const info = TAG_DISPLAY[t];
        return `<span class="sc-tag" style="color:${info?.color || '#aaa'}">${info?.label || t}</span>`;
      }).join(' ')}</div>`;
      html += `</button>`;
    }
    html += `</div>`;
    panel.innerHTML = html;

    panel.querySelectorAll('.spell-card[data-spell-id]').forEach(btn => {
      const spellId = (btn as HTMLElement).dataset.spellId!;
      const spell = SPELLS.find(s => s.id === spellId)!;
      btn.addEventListener('click', () => this.castSpell(spell));
    });
  }

  private renderLastChance(): void {
    const overlay = this.el.querySelector('#last-chance-overlay') as HTMLElement;
    if (!overlay) return;
    overlay.style.display = 'block';

    let html = `<h3>LAST CHANCE</h3>`;
    html += `<p>Bodies: ${this.bodyCountSummary()} (${state.bodiesOnField.length} total). Cast one spell or leave.</p>`;
    html += `<div class="spell-grid">`;
    for (const spell of SPELLS) {
      const afford = this.canAfford(spell);
      const cls = afford ? 'spell-card available' : 'spell-card disabled';
      html += `<button class="${cls} lc-btn" data-spell-id="${spell.id}" ${afford ? '' : 'disabled'}>`;
      html += `<div class="sc-name">${spell.name}</div>`;
      html += `<div class="sc-cost">${spell.bodyCost} bod${spell.bodyCost > 1 ? 'ies' : 'y'}</div>`;
      html += `</button>`;
    }
    html += `</div>`;
    html += `<button id="btn-skip-lc" style="margin-top:8px">Skip — Leave Now</button>`;
    overlay.innerHTML = html;

    overlay.querySelectorAll('.lc-btn').forEach(btn => {
      const spellId = (btn as HTMLElement).dataset.spellId!;
      const spell = SPELLS.find(s => s.id === spellId)!;
      btn.addEventListener('click', () => {
        this.castSpell(spell);
        state.lastChance = false;
        overlay.style.display = 'none';
        this.refreshUI();
      });
    });

    overlay.querySelector('#btn-skip-lc')?.addEventListener('click', () => {
      state.lastChance = false;
      overlay.style.display = 'none';
      state.bodiesOnField = [];
      this.refreshUI();
    });
  }

  private renderControls(): void {
    const ctrl = this.el.querySelector('#quest-controls');
    if (!ctrl) return;

    let html = '';
    if (state.questOutcome === 'ongoing') {
      html = `<button id="btn-retreat">Retreat</button>`;
    } else if (!state.lastChance) {
      const msg = state.questOutcome === 'boss_killed' ? 'VICTORY!' : state.questOutcome === 'retreated' ? 'Retreated.' : 'Wiped out.';
      html = `<strong>${msg}</strong> <button id="btn-to-loot">Continue to Loot →</button>`;
    }
    ctrl.innerHTML = html;

    ctrl.querySelector('#btn-retreat')?.addEventListener('click', () => {
      this.log('*** Retreating... ***', 'log-wave');
      this.enterLastChance('retreated');
    });
    ctrl.querySelector('#btn-to-loot')?.addEventListener('click', () => this.navigate('loot'));
  }

  private renderDebug(): void {
    const dbg = this.el.querySelector('#debug-body');
    if (!dbg) return;

    // Wire toggle
    this.el.querySelector('#debug-toggle')?.addEventListener('click', () => {
      dbg.classList.toggle('collapsed');
    });

    dbg.innerHTML = `
      <label>Tick speed <input type="range" id="d-speed" min="100" max="3000" step="100" value="${this.tickSpeed}"><span id="d-speed-v">${this.tickSpeed}ms</span></label>
      <label>Enemy strength <input type="range" id="d-str" min="0.1" max="5" step="0.1" value="${this.enemyStrengthMult}"><span id="d-str-v">${this.enemyStrengthMult}x</span></label>
      <label>HP multiplier <input type="range" id="d-hp" min="1" max="20" step="1" value="${this.hpMult}"><span id="d-hp-v">${this.hpMult}x</span></label>
      <label>Dmg scale <input type="range" id="d-dmg" min="0.01" max="0.3" step="0.01" value="${this.dmgScale}"><span id="d-dmg-v">${this.dmgScale}</span></label>
      <label>Death chance <input type="range" id="d-death" min="0" max="1" step="0.05" value="${this.deathChance}"><span id="d-death-v">${this.deathChance}</span></label>
      <label>Body order <button id="d-order">${this.bestFirst ? 'Best first' : 'Worst first'}</button></label>
      <button id="d-skip">Skip to Boss</button>
      <button id="d-bodies">+5 Bodies</button>
      <button id="d-reset">Reset</button>
    `;

    const bind = (id: string, cb: (e: Event) => void) =>
      dbg.querySelector(id)?.addEventListener('input', cb);
    const click = (id: string, cb: () => void) =>
      dbg.querySelector(id)?.addEventListener('click', cb);

    bind('#d-speed', (e) => {
      this.tickSpeed = parseInt((e.target as HTMLInputElement).value);
      dbg.querySelector('#d-speed-v')!.textContent = `${this.tickSpeed}ms`;
      if (state.questOutcome === 'ongoing') this.restartCombat();
    });
    bind('#d-str', (e) => {
      this.enemyStrengthMult = parseFloat((e.target as HTMLInputElement).value);
      dbg.querySelector('#d-str-v')!.textContent = `${this.enemyStrengthMult}x`;
    });
    bind('#d-hp', (e) => {
      this.hpMult = parseInt((e.target as HTMLInputElement).value);
      dbg.querySelector('#d-hp-v')!.textContent = `${this.hpMult}x`;
    });
    bind('#d-dmg', (e) => {
      this.dmgScale = parseFloat((e.target as HTMLInputElement).value);
      dbg.querySelector('#d-dmg-v')!.textContent = `${this.dmgScale}`;
    });
    bind('#d-death', (e) => {
      this.deathChance = parseFloat((e.target as HTMLInputElement).value);
      dbg.querySelector('#d-death-v')!.textContent = `${this.deathChance}`;
    });
    click('#d-order', () => {
      this.bestFirst = !this.bestFirst;
      this.renderDebug();
    });
    click('#d-skip', () => {
      state.waveNumber = getBossWaveNumber() - 1;
      state.waveEnemiesRemaining = 0;
      state.waveHp = 0;
      this.log('DEBUG: Skipped to boss.');
    });
    click('#d-bodies', () => {
      const types = ['villager', 'guard', 'knight', 'paladin', 'demon'];
      for (let i = 0; i < 5; i++) {
        const idx = Math.floor(Math.random() * types.length);
        state.bodiesOnField.push({ type: types[idx], quality: idx + 1 });
      }
      this.refreshUI();
    });
    click('#d-reset', () => {
      this.stopCombat();
      this.navigate('collection');
    });
  }
}
