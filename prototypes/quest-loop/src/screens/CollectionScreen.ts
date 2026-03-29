import { state } from '../state.ts';
import type { ScreenName } from '../types.ts';

export class CollectionScreen {
  private el: HTMLElement;
  private navigate: (screen: ScreenName) => void;

  constructor(navigate: (screen: ScreenName) => void) {
    this.navigate = navigate;
    this.el = document.createElement('div');
    this.el.id = 'screen-collection';
    document.getElementById('app')!.appendChild(this.el);
  }

  show(): void {
    this.el.style.display = 'block';
    this.render();
  }

  hide(): void {
    this.el.style.display = 'none';
  }

  private render(): void {
    const jarCount = state.jar.slots.size;
    const cap = state.jar.capacity;
    const sorted = [...state.collection].sort((a, b) => b.power - a.power);
    const jarPower = sorted.filter(u => state.jar.slots.has(u.id)).reduce((s, u) => s + u.power, 0);

    let html = `<h2>Your Undead</h2>`;
    html += `<p>Jar: <strong>${jarCount} / ${cap}</strong> · Total power: <strong>${jarPower}</strong></p>`;
    html += `<button id="btn-start-quest" style="margin:8px 0;padding:8px 24px;font-size:16px;" ${jarCount === 0 ? 'disabled' : ''}>Start Quest (${jarCount} undead)</button>`;

    html += `<div class="collection-grid">`;
    for (const u of sorted) {
      const inJar = state.jar.slots.has(u.id);
      const full = jarCount >= cap;
      html += `<button class="undead-btn ${inJar ? 'in-jar' : ''}" data-uid="${u.id}" ${!inJar && full ? 'disabled' : ''}>`;
      html += `<span class="ub-name">${u.name}</span>`;
      html += `<span class="ub-type">${u.type}</span>`;
      html += `<span class="ub-power">pow ${u.power}</span>`;
      if (inJar) html += `<span class="ub-jar">JAR</span>`;
      html += `</button>`;
    }
    html += `</div>`;

    html += `<div class="debug-panel"><strong>DEBUG</strong>`;
    html += `<label>Jar capacity: <input type="range" id="debug-jar-cap" min="1" max="15" value="${cap}"> <span id="debug-jar-cap-val">${cap}</span></label>`;
    html += `</div>`;

    this.el.innerHTML = html;

    // Toggle jar
    this.el.querySelectorAll('.undead-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const uid = (btn as HTMLElement).dataset.uid!;
        if (state.jar.slots.has(uid)) {
          state.jar.slots.delete(uid);
        } else if (state.jar.slots.size < state.jar.capacity) {
          state.jar.slots.add(uid);
        }
        this.render();
      });
    });

    // Start quest
    this.el.querySelector('#btn-start-quest')?.addEventListener('click', () => {
      state.questUndead = state.collection.filter(u => state.jar.slots.has(u.id)).map(u => ({ ...u }));
      state.questLog = [];
      state.waveNumber = 0;
      state.waveEnemiesRemaining = 0;
      state.waveHp = 0;
      state.bossDefeated = false;
      state.specialDrops = [];
      state.questOutcome = 'ongoing';
      state.lastChance = false;
      state.bodiesOnField = [];
      state.currentWaveTags = [];
      this.navigate('quest');
    });

    // Debug
    this.el.querySelector('#debug-jar-cap')?.addEventListener('input', (e) => {
      const val = parseInt((e.target as HTMLInputElement).value);
      state.jar.capacity = val;
      this.el.querySelector('#debug-jar-cap-val')!.textContent = String(val);
      if (state.jar.slots.size > val) {
        const arr = [...state.jar.slots];
        state.jar.slots = new Set(arr.slice(0, val));
      }
      this.render();
    });
  }
}
