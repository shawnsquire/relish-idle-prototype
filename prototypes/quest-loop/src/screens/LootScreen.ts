import { state } from '../state.ts';
import type { ScreenName } from '../types.ts';

export class LootScreen {
  private el: HTMLElement;
  private navigate: (screen: ScreenName) => void;
  private selected: Set<string> = new Set();

  constructor(navigate: (screen: ScreenName) => void) {
    this.navigate = navigate;
    this.el = document.createElement('div');
    this.el.id = 'screen-loot';
    document.getElementById('app')!.appendChild(this.el);
  }

  show(): void {
    this.el.style.display = 'block';
    this.selected = new Set();

    if (state.questOutcome === 'wiped') {
      this.renderWipeSummary();
    } else {
      // Pre-select survivors up to jar capacity, best power first
      const survivors = [...state.questUndead].sort((a, b) => b.power - a.power);
      for (let i = 0; i < Math.min(survivors.length, state.jar.capacity); i++) {
        this.selected.add(survivors[i].id);
      }
      this.renderLoot();
    }
  }

  hide(): void {
    this.el.style.display = 'none';
  }

  private renderWipeSummary(): void {
    // Factual summary, not celebratory
    const jarCount = state.jar.slots.size;

    let html = `<h2>Quest Failed</h2>`;
    html += `<p>Made it to wave ${state.waveNumber}.</p>`;
    html += `<p>${jarCount} undead lost from jar.</p>`;
    if (state.questLog.length > 0) {
      // Count summons from log
      const summonCount = state.questLog.filter(l => l.includes('joins!')).length;
      if (summonCount > 0) html += `<p>${summonCount} undead summoned during quest (lost).</p>`;
    }
    html += `<p style="color:#999;margin-top:12px;">Your remaining collection is safe at home.</p>`;
    html += `<button id="btn-return-home" style="margin-top:12px;">Return Home</button>`;

    this.el.innerHTML = html;

    this.el.querySelector('#btn-return-home')?.addEventListener('click', () => {
      // Remove jar contents from collection — they died
      state.collection = state.collection.filter(u => !state.jar.slots.has(u.id));
      state.jar.slots = new Set();
      this.navigate('collection');
    });
  }

  private renderLoot(): void {
    const cap = state.jar.capacity;
    const survivors = [...state.questUndead].sort((a, b) => b.power - a.power);
    const outcomeText = state.questOutcome === 'boss_killed' ? 'Boss Killed' : 'Retreated';

    let html = `<h2>Quest Complete: ${outcomeText}</h2>`;

    if (state.specialDrops.length > 0) {
      html += `<p><strong>Special drops:</strong> ${state.specialDrops.join(', ')}</p>`;
    }

    html += `<p><strong>${this.selected.size} / ${cap}</strong> to bring home. Click to toggle.</p>`;

    html += `<table><thead><tr><th>Keep</th><th>Name</th><th>Type</th><th>Power</th></tr></thead><tbody>`;
    for (const u of survivors) {
      const kept = this.selected.has(u.id);
      const rowClass = kept ? 'selected clickable' : 'clickable';
      html += `<tr class="${rowClass}" data-uid="${u.id}"><td>${kept ? '[X]' : '[ ]'}</td><td>${u.name}</td><td>${u.type}</td><td>${u.power}</td></tr>`;
    }
    html += `</tbody></table>`;

    html += `<button id="btn-return-home">Return Home</button>`;
    this.el.innerHTML = html;

    // Toggle selection
    this.el.querySelectorAll('tr[data-uid]').forEach(row => {
      row.addEventListener('click', () => {
        const uid = (row as HTMLElement).dataset.uid!;
        if (this.selected.has(uid)) {
          this.selected.delete(uid);
        } else if (this.selected.size < cap) {
          this.selected.add(uid);
        }
        this.renderLoot();
      });
    });

    // Return home
    this.el.querySelector('#btn-return-home')?.addEventListener('click', () => {
      // Remove original jar members from collection
      state.collection = state.collection.filter(u => !state.jar.slots.has(u.id));
      // Add back kept survivors
      const kept = state.questUndead.filter(u => this.selected.has(u.id));
      state.collection.push(...kept);
      state.jar.slots = new Set();
      this.navigate('collection');
    });
  }
}
