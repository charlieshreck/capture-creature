// ============================================================================
//  HUD — the on-screen interface. Plain DOM over the 3D canvas (no framework,
//  easy to read and tweak). Subscribes to the Economy for live updates.
//
//  Minecraft-style inventory:
//   • a HOTBAR of 9 slots along the bottom of the screen — your held items.
//     Pick a slot with a click or the number keys 1–9.
//   • a BACKPACK (press E) showing your 27 storage slots and the 9 hotbar
//     slots along the bottom.
//   • a CRAFTING screen — opened by clicking a Crafting Table you've PLACED in
//     the world — same inventory plus a 3×3 crafting grid and a recipe list.
//   • move items by dragging them: hold an item and drop it on another slot.
// ============================================================================
import './ui.css';
import { ITEMS, STARTING_INVENTORY, RECIPES } from './data.js';

const HOTBAR = 9;          // hotbar slots (Minecraft has 9)
const STORE_ROWS = 3;      // backpack storage rows
const TOTAL = HOTBAR + STORE_ROWS * HOTBAR; // 36 inventory slots in all
const CRAFT = 9;           // the 3×3 crafting grid

// The 3×3 ingredient pattern for a recipe (item id per slot, or null = empty).
const patternOf = (r) => r.shape || (r.all ? new Array(9).fill(r.all) : new Array(9).fill(null));

const iconOf = (id) => (id && ITEMS[id] ? ITEMS[id].icon : '');
const nameOf = (id) => (id && ITEMS[id] ? ITEMS[id].name : '');
// A slot's picture: a drawn SVG image if the item has one, else its emoji.
const iconHTML = (id) => {
  const it = ITEMS[id];
  if (it && it.svg) return `<img class="sloticon img" alt="" src="data:image/svg+xml,${encodeURIComponent(it.svg)}">`;
  return `<span class="sloticon">${it ? it.icon : ''}</span>`;
};
// A small inline icon for use inside sentences/labels (toasts, recipe needs):
// items with a drawn picture (wood, stone, wall) show their coloured image.
const tagHTML = (id) => {
  const it = ITEMS[id];
  if (it && it.svg) return `<img class="itemtag" alt="${it.name}" src="data:image/svg+xml,${encodeURIComponent(it.svg)}">`;
  return `<span class="itemtag">${it ? it.icon : ''}</span>`;
};

export class HUD {
  constructor(game) {
    this.game = game;
    this.economy = game.economy;
    this.open = false;       // is the backpack/crafting screen showing?
    this.mode = 'backpack';  // 'backpack' or 'table'

    // The inventory: one entry per slot (0–8 = hotbar, 9–35 = storage).
    // null = empty; otherwise { id, count }.
    this.inventory = new Array(TOTAL).fill(null);
    for (const [slot, id] of Object.entries(STARTING_INVENTORY)) {
      this.inventory[Number(slot)] = { id, count: 1 };
    }
    this.craft = new Array(CRAFT).fill(null); // the 3×3 grid (only used at a table)
    this.held = 0; // which hotbar slot is selected

    // drag-and-drop state
    this._drag = null;
    this._ghost = null;
    this._carry = null;   // a single item picked up with the I key
    this._cursor = null;  // last known mouse position (for the I key)
    this._onDragMove = (e) => this._moveGhost(e);
    this._onDragUp = (e) => this._endDrag(e);

    this._build();

    this.economy.onChange(() => this._refresh());
    this.economy.onMilestone((m) => this.toast(`🏆 ${m.title}`, m.desc, 'milestone'));

    this._renderAll();
    this._renderRecipeList();
    this._refresh();
  }

  _build() {
    const root = document.createElement('div');
    root.id = 'hud';
    root.innerHTML = `
      <div id="topbar">
        <div id="brand">Eonsmith</div>
        <div id="popwrap"><span class="popicon">👥</span><span id="population">0</span></div>
      </div>

      <div id="toasts"></div>

      <!-- mining progress, shown in the centre while you chop/mine -->
      <div id="mine" class="hidden">
        <div id="minelabel"></div>
        <div id="minebar"><div id="minefill"></div></div>
      </div>

      <!-- shown when a held wall can snap onto another wall -->
      <button id="attachbtn" class="hidden">🔗 Attach <b>(E)</b></button>

      <!-- BACKPACK / CRAFTING screen -->
      <div id="backpack" class="hidden">
        <div id="packpanel">
          <div id="packhead">
            <span class="packtitle" id="packtitle">🎒 Backpack</span>
            <span class="packsub">drag to move a stack · point + <b>I</b> to take one · <b>E</b> to close</span>
            <button id="packclose" title="Close (E)">✕</button>
          </div>

          <!-- crafting area: only shown when you open a placed table -->
          <div id="craftsection" class="hidden">
            <div class="craftwrap">
              <div class="craftgrid" id="craftgrid"></div>
              <div class="craftarrow">➜</div>
              <button class="slot result" id="craftresult" data-loc="result">
                <span class="resulthint">make</span>
              </button>
            </div>
            <div class="recipeside">
              <div class="sectionlabel">Things you can make</div>
              <div id="recipelist"><div class="recipeempty">No recipes yet — coming soon!</div></div>
            </div>
          </div>

          <div class="sectionlabel">Backpack</div>
          <div class="invgrid" id="store"></div>
          <div class="invgrid invhot" id="invhot"></div>
        </div>
      </div>

      <div id="bottombar">
        <div id="helditem"></div>
        <div id="hotbar"></div>
        <div id="hint">
          <b>↑↓ / WS</b> walk · <b>←→ / AD</b> turn · <b>Right-drag</b> look ·
          <b>1–9</b> select · <b>E</b> backpack ·
          hold <b>⛏️</b> + <b>Left-mouse</b> on a tree/rock to harvest ·
          place a <b>🧰 table</b> then click it to craft · <b>Y</b> rotate before placing
        </div>
      </div>
    `;
    document.body.appendChild(root);

    this.elPopulation = root.querySelector('#population');
    this.elHotbar = root.querySelector('#hotbar');
    this.elHeld = root.querySelector('#helditem');
    this.elBackpack = root.querySelector('#backpack');
    this.elPackTitle = root.querySelector('#packtitle');
    this.elCraftSection = root.querySelector('#craftsection');
    this.elStore = root.querySelector('#store');
    this.elInvHot = root.querySelector('#invhot');
    this.elCraftGrid = root.querySelector('#craftgrid');
    this.elCraftResult = root.querySelector('#craftresult');
    this.elCraftResult.addEventListener('click', () => this._doCraft());
    this.elRecipeList = root.querySelector('#recipelist');
    this.elRecipeList.addEventListener('click', (e) => {
      const el = e.target.closest('.recipe');
      if (el && el.dataset.ri != null) this._fillRecipe(RECIPES[Number(el.dataset.ri)]);
    });
    this.elToasts = root.querySelector('#toasts');
    this.elMine = root.querySelector('#mine');
    this.elMineLabel = root.querySelector('#minelabel');
    this.elMineFill = root.querySelector('#minefill');
    this.elAttach = root.querySelector('#attachbtn');
    this.elAttach.addEventListener('click', () => this.game._attachWall());

    root.querySelector('#packclose').addEventListener('click', () => this.closeInventory());
    this.elBackpack.addEventListener('click', (e) => {
      if (e.target === this.elBackpack) this.closeInventory();
    });

    // track the mouse so "press I" knows which item you're pointing at, and so
    // a carried item follows the cursor.
    window.addEventListener('pointermove', (e) => {
      this._cursor = { x: e.clientX, y: e.clientY };
      if (this._carry && this._ghost) this._moveGhost(e);
    });

    // keyboard: E toggles the backpack, I takes one item, 1–9 select, Esc closes
    window.addEventListener('keydown', (e) => {
      if (e.repeat) return;
      if (e.code === 'KeyE') {
        e.preventDefault();
        // if a wall is ready to snap onto another, E attaches it; otherwise E
        // opens/closes the backpack as usual.
        if (!this.open && this.game._attachTarget) { this.game._attachWall(); return; }
        this.open ? this.closeInventory() : this.openInventory('backpack');
        return;
      }
      if (e.code === 'KeyI' && this.open) { e.preventDefault(); this._takeOne(); return; }
      if (e.code === 'Escape' && this.open) { this.closeInventory(); return; }
      const m = e.code.match(/^Digit([1-9])$/);
      if (m) this._select(Number(m[1]) - 1);
    });
  }

  // ---- top bar ---------------------------------------------------------------
  _refresh() {
    const pop = this.economy.population;
    if (pop !== this._lastPop) { this._lastPop = pop; this.elPopulation.textContent = pop; }
  }

  // ---- slot model access -----------------------------------------------------
  _get(loc, idx) { return loc === 'craft' ? this.craft[idx] : this.inventory[idx]; }
  _set(loc, idx, v) { if (loc === 'craft') this.craft[idx] = v; else this.inventory[idx] = v; }

  // ---- rendering -------------------------------------------------------------
  // Build one slot button. loc is 'inv' or 'craft'; idx is the array index.
  _slot(loc, idx, { number = false, draggable = false, selectable = false } = {}) {
    const stack = this._get(loc, idx);
    const btn = document.createElement('button');
    btn.className = 'slot';
    btn.dataset.loc = loc;
    btn.dataset.idx = idx;
    if (stack) btn.title = nameOf(stack.id);
    btn.innerHTML = `
      ${number && idx < 9 ? `<span class="slotnum">${idx + 1}</span>` : ''}
      ${stack ? iconHTML(stack.id) : ''}
      ${stack && stack.count > 1 ? `<span class="slotcount">${stack.count}</span>` : ''}
    `;
    if (draggable) btn.addEventListener('pointerdown', (e) => { if (e.button === 0) this._startDrag(e, loc, idx); });
    if (selectable) btn.addEventListener('click', () => this._select(idx));
    return btn;
  }

  _renderAll() {
    // on-screen hotbar (click to select; not draggable)
    this.elHotbar.innerHTML = '';
    for (let i = 0; i < HOTBAR; i++) {
      this.elHotbar.appendChild(this._slot('inv', i, { number: true, selectable: true }));
    }
    // backpack storage (slots 9–35) — draggable
    this.elStore.innerHTML = '';
    for (let i = HOTBAR; i < TOTAL; i++) this.elStore.appendChild(this._slot('inv', i, { draggable: true }));
    // backpack hotbar row (slots 0–8) — draggable, shown at the bottom
    this.elInvHot.innerHTML = '';
    for (let i = 0; i < HOTBAR; i++) this.elInvHot.appendChild(this._slot('inv', i, { number: true, draggable: true }));
    // the 3×3 crafting grid — draggable
    this.elCraftGrid.innerHTML = '';
    for (let i = 0; i < CRAFT; i++) this.elCraftGrid.appendChild(this._slot('craft', i, { draggable: true }));

    this._renderResult();
    this._highlight();
  }

  // A small inline coloured icon for an item (used in toasts etc).
  itemTag(id) { return tagHTML(id); }

  // ---- crafting --------------------------------------------------------------
  // What the grid currently makes: the recipe, the output, how many items per
  // craft, and how many crafts the grid holds (smallest required stack).
  _craftResult() {
    for (const r of RECIPES) {
      const pat = patternOf(r);
      let crafts = Infinity, ok = true;
      for (let i = 0; i < CRAFT; i++) {
        const need = pat[i], s = this.craft[i];
        if (need) {
          if (!s || s.id !== need) { ok = false; break; }
          crafts = Math.min(crafts, s.count);
        } else if (s) { ok = false; break; } // required-empty slot has something
      }
      if (ok && crafts > 0 && crafts !== Infinity) return { recipe: r, id: r.out, perCraft: r.count || 1, crafts };
    }
    return null;
  }

  // Count how many of an item are in the backpack, and remove some across stacks.
  _count(id) {
    return this.inventory.reduce((sum, s) => sum + (s && s.id === id ? s.count : 0), 0);
  }

  _remove(id, n) {
    for (let i = 0; i < this.inventory.length && n > 0; i++) {
      const s = this.inventory[i];
      if (s && s.id === id) {
        const take = Math.min(n, s.count);
        s.count -= take; n -= take;
        if (s.count <= 0) this.inventory[i] = null;
      }
    }
  }

  // Click a recipe to load its ingredients into the grid. Each click adds one
  // more set (so two clicks = make two), if you have the materials.
  _fillRecipe(recipe) {
    if (!recipe) return;
    const pat = patternOf(recipe);
    // the grid must be empty, or already an even layer of this exact pattern
    let level = null;
    for (let i = 0; i < CRAFT; i++) {
      const need = pat[i], s = this.craft[i];
      if (need) {
        if (s && s.id !== need) { this.toast('Grid in use', 'Take the other items out first', ''); return; }
        const c = s ? s.count : 0;
        if (level === null) level = c;
        else if (c !== level) { this.toast('Grid uneven', 'Take items out and try again', ''); return; }
      } else if (s) { this.toast('Grid in use', 'Take the other items out first', ''); return; }
    }
    // how many of each ingredient one set needs
    const need = {};
    for (const id of pat) if (id) need[id] = (need[id] || 0) + 1;
    for (const [id, cnt] of Object.entries(need)) {
      if (this._count(id) < cnt) { this.toast('Not enough materials', `You need more ${nameOf(id)}`, ''); return; }
    }
    for (const [id, cnt] of Object.entries(need)) this._remove(id, cnt);
    for (let i = 0; i < CRAFT; i++) {
      const id = pat[i];
      if (id) { if (this.craft[i]) this.craft[i].count += 1; else this.craft[i] = { id, count: 1 }; }
    }
    this._renderAll();
  }

  // Fill the "Things you can make" panel with every recipe's picture + name.
  _renderRecipeList() {
    if (!this.elRecipeList) return;
    if (!RECIPES.length) { this.elRecipeList.innerHTML = '<div class="recipeempty">No recipes yet — coming soon!</div>'; return; }
    this.elRecipeList.innerHTML = RECIPES.map((r, i) => {
      const need = Object.entries(r.needs || {}).map(([k, v]) => `${v}× ${tagHTML(k)}`).join(' ');
      return `
        <div class="recipe" data-ri="${i}" title="Click to load ${nameOf(r.out)}">
          <span class="recipeicon">${iconHTML(r.out)}</span>
          <div class="recipetext">
            <div class="recipename">${nameOf(r.out)}</div>
            <div class="recipeneed">${need}</div>
          </div>
        </div>`;
    }).join('');
  }

  // Show the craftable item (or the "make" hint) in the result slot.
  _renderResult() {
    if (!this.elCraftResult) return;
    const out = this._craftResult();
    if (out) {
      this.elCraftResult.innerHTML = iconHTML(out.id) + (out.crafts > 1 ? `<span class="slotcount">×${out.crafts}</span>` : '');
      this.elCraftResult.classList.add('craftable');
      this.elCraftResult.title = `Click to take all (${out.crafts}× ${nameOf(out.id)})`;
    } else {
      this.elCraftResult.innerHTML = '<span class="resulthint">make</span>';
      this.elCraftResult.classList.remove('craftable');
      this.elCraftResult.title = '';
    }
  }

  // Click the result to craft: take one of each input, give the output.
  // One click takes ALL of them — make everything the grid can make at once.
  _doCraft() {
    const out = this._craftResult();
    if (!out) return;
    const n = out.crafts;                 // how many the grid can make
    const pat = patternOf(out.recipe);
    for (let i = 0; i < CRAFT; i++) {
      if (!pat[i]) continue;              // only consume the required slots
      this.craft[i].count -= n;
      if (this.craft[i].count <= 0) this.craft[i] = null;
    }
    const total = out.perCraft * n;
    this.addItem(out.id, total);          // collect them all (also re-renders)
    this.toast('🔨 Crafted', `${total}× ${nameOf(out.id)}`, 'built');
  }

  // Select hotbar slot `i`. Click/press the one that's already selected to
  // turn it off again (back to nothing held).
  _select(i) {
    this.held = (this.held === i) ? null : i;
    this._highlight();
  }

  _highlight() {
    for (const s of this.elHotbar.querySelectorAll('.slot')) {
      s.classList.toggle('selected', Number(s.dataset.idx) === this.held);
    }
    const stack = this.held == null ? null : this.inventory[this.held];
    this.elHeld.textContent = stack ? nameOf(stack.id) : '';
  }

  // ---- drag and drop ---------------------------------------------------------
  _startDrag(e, loc, idx) {
    // If you're carrying a single item (picked up with the I key), a click on a
    // slot drops it there instead of starting a drag.
    if (this._carry) { e.preventDefault(); this._dropCarry(loc, idx); return; }

    const stack = this._get(loc, idx);
    if (!stack) return;
    e.preventDefault();
    this._drag = { loc, idx };
    const g = document.createElement('div');
    g.className = 'draghost';
    g.innerHTML = iconHTML(stack.id) + (stack.count > 1 ? `<span class="slotcount">${stack.count}</span>` : '');
    document.body.appendChild(g);
    this._ghost = g;
    this._moveGhost(e);
    window.addEventListener('pointermove', this._onDragMove);
    window.addEventListener('pointerup', this._onDragUp);
  }

  _moveGhost(e) {
    if (this._ghost) {
      this._ghost.style.left = `${e.clientX}px`;
      this._ghost.style.top = `${e.clientY}px`;
    }
  }

  _endDrag(e) {
    window.removeEventListener('pointermove', this._onDragMove);
    window.removeEventListener('pointerup', this._onDragUp);
    if (this._ghost) { this._ghost.remove(); this._ghost = null; }
    const drag = this._drag;
    this._drag = null;
    if (!drag) return;

    // which slot is under the pointer? (the ghost ignores pointer events)
    const el = document.elementFromPoint(e.clientX, e.clientY);
    const slot = el && el.closest('.slot');
    if (!slot || slot.dataset.loc == null || slot.dataset.loc === 'result') return; // dropped nowhere
    this._moveStack(drag.loc, drag.idx, slot.dataset.loc, Number(slot.dataset.idx));
  }

  // Move a whole stack from one slot to another: fill empty, merge same item,
  // or swap two different items.
  _moveStack(sLoc, sIdx, dLoc, dIdx) {
    if (sLoc === dLoc && sIdx === dIdx) return;
    const src = this._get(sLoc, sIdx);
    const dst = this._get(dLoc, dIdx);
    if (!src) return;
    if (!dst) {
      this._set(dLoc, dIdx, src);
      this._set(sLoc, sIdx, null);
    } else if (dst.id === src.id) {
      dst.count += src.count;
      this._set(sLoc, sIdx, null);
    } else {
      this._set(dLoc, dIdx, src);
      this._set(sLoc, sIdx, dst);
    }
    this._renderAll();
  }

  // ---- "take one" with the I key ---------------------------------------------
  // Point at a stack and press I to peel ONE item onto the cursor; it follows
  // the mouse until you click a slot to drop it.
  _takeOne() {
    if (!this.open || !this._cursor) return;
    const el = document.elementFromPoint(this._cursor.x, this._cursor.y);
    const slot = el && el.closest('.slot');
    if (!slot || slot.dataset.loc == null || slot.dataset.loc === 'result') return;
    const loc = slot.dataset.loc;
    const idx = Number(slot.dataset.idx);
    const stack = this._get(loc, idx);
    if (!stack) return;
    if (this._carry && this._carry.id !== stack.id) return; // one item type at a time

    stack.count -= 1;
    if (stack.count <= 0) this._set(loc, idx, null);
    if (this._carry) this._carry.count += 1;
    else this._carry = { id: stack.id, count: 1 };

    this._showGhost();
    this._renderAll();
  }

  _dropCarry(loc, idx) {
    const c = this._carry;
    if (!c) return;
    const dst = this._get(loc, idx);
    if (!dst) this._set(loc, idx, { id: c.id, count: c.count });
    else if (dst.id === c.id) dst.count += c.count;
    else return; // different item under the cursor — keep carrying
    this._carry = null;
    this._clearGhost();
    this._renderAll();
  }

  _showGhost() {
    if (!this._ghost) {
      this._ghost = document.createElement('div');
      this._ghost.className = 'draghost';
      document.body.appendChild(this._ghost);
    }
    const c = this._carry;
    this._ghost.innerHTML = iconHTML(c.id) + (c.count > 1 ? `<span class="slotcount">${c.count}</span>` : '');
    if (this._cursor) {
      this._ghost.style.left = `${this._cursor.x}px`;
      this._ghost.style.top = `${this._cursor.y}px`;
    }
  }

  _clearGhost() {
    if (this._ghost) { this._ghost.remove(); this._ghost = null; }
  }

  // ---- add / remove items (used by harvesting) -------------------------------
  heldItemId() {
    const stack = this.held == null ? null : this.inventory[this.held];
    return stack ? stack.id : null;
  }

  addItem(id, count = 1) {
    let slot = this.inventory.findIndex((s) => s && s.id === id);
    if (slot === -1) slot = this.inventory.findIndex((s) => s === null);
    if (slot === -1) return false; // full
    if (this.inventory[slot]) this.inventory[slot].count += count;
    else this.inventory[slot] = { id, count };
    this._renderAll();
    return true;
  }

  removeItem(id, count = 1) {
    const slot = this.inventory.findIndex((s) => s && s.id === id && s.count >= count);
    if (slot === -1) return false;
    this.inventory[slot].count -= count;
    if (this.inventory[slot].count <= 0) this.inventory[slot] = null;
    this._renderAll();
    return true;
  }

  // ---- opening / closing -----------------------------------------------------
  openInventory(mode = 'backpack') {
    this.mode = mode;
    this.open = true;
    this.elCraftSection.classList.toggle('hidden', mode !== 'table');
    this.elPackTitle.textContent = mode === 'table' ? '🛠️ Crafting Table' : '🎒 Backpack';
    this._renderAll();
    this.elBackpack.classList.remove('hidden');
  }

  // Called by the game when you click a placed crafting table.
  openCrafting() { this.openInventory('table'); }

  closeInventory() {
    if (!this.open) return;
    // put a carried item (from the I key) safely back in the backpack
    if (this._carry) { this.addItem(this._carry.id, this._carry.count); this._carry = null; this._clearGhost(); }
    // tip any items left in the crafting grid back into the backpack
    for (let i = 0; i < CRAFT; i++) {
      const s = this.craft[i];
      if (s) { this.addItem(s.id, s.count); this.craft[i] = null; }
    }
    this.open = false;
    this.elBackpack.classList.add('hidden');
  }

  // Show/hide the "Attach" button (a held wall can snap onto another).
  setAttach(on) { this.elAttach.classList.toggle('hidden', !on); }

  // ---- mining progress -------------------------------------------------------
  setMineProgress(frac, label = '') {
    if (frac == null) { this.elMine.classList.add('hidden'); return; }
    this.elMine.classList.remove('hidden');
    const txt = label === 'stone' ? 'Mining…' : (label === 'sand' || label === 'dirt') ? 'Digging…' : 'Chopping…';
    if (txt !== this._mineTxt) { this._mineTxt = txt; this.elMineLabel.textContent = txt; }
    this.elMineFill.style.width = `${Math.min(100, frac * 100)}%`;
  }

  // ---- toasts ----------------------------------------------------------------
  toast(title, body, kind = '') {
    const el = document.createElement('div');
    el.className = `toast ${kind}`;
    el.innerHTML = `<div class="ttitle">${title}</div><div class="tbody">${body}</div>`;
    this.elToasts.appendChild(el);
    requestAnimationFrame(() => el.classList.add('show'));
    setTimeout(() => {
      el.classList.remove('show');
      setTimeout(() => el.remove(), 400);
    }, kind === 'milestone' ? 4500 : 2500);
  }
}
