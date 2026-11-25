// Warung Kilat — kitchen.js
// One job: the kitchen itself. Station layout, and every interaction the
// cook can do at a station (grab, chop, cook, plate, serve, trash).

import { INGREDIENTS, INGREDIENT_ORDER, freshItem, itemIsReady, itemLabel, recipeById, carriedFillsRecipe } from './recipes.js';
import { servePlate } from './orders.js';
import { awardServe, loseHeart, showMessage, CARRY_LIMIT } from './state.js';

// The cook walks the open floor; stations sit around its edges.
export const FLOOR = { x: 205, y: 245, w: 870, h: 375 };

function crateStations() {
  return INGREDIENT_ORDER.map((base, i) => ({
    kind: 'crate',
    id: 'crate-' + base,
    base,
    name: INGREDIENTS[base].name,
    x: 24, y: 132 + i * 66, w: 152, h: 58,
    ax: 218, ay: 132 + i * 66 + 29,
  }));
}

export const STATIONS = [
  ...crateStations(),
  { kind: 'board', id: 'board', name: 'Talenan', x: 330, y: 140, w: 190, h: 76, ax: 425, ay: 248 },
  { kind: 'wok', id: 'wok-0', name: 'Wajan 1', x: 560, y: 140, w: 124, h: 76, ax: 622, ay: 248, slot: 0 },
  { kind: 'wok', id: 'wok-1', name: 'Wajan 2', x: 696, y: 140, w: 124, h: 76, ax: 758, ay: 248, slot: 1 },
  { kind: 'plate', id: 'plate', name: 'Meja Plating', x: 1104, y: 150, w: 152, h: 180, ax: 1072, ay: 240 },
  { kind: 'serve', id: 'serve', name: 'Jendela Saji', x: 1104, y: 360, w: 152, h: 160, ax: 1072, ay: 440 },
  { kind: 'trash', id: 'trash', name: 'Tong Sampah', x: 1130, y: 560, w: 96, h: 60, ax: 1072, ay: 590 },
];

export function stationById(id) {
  return STATIONS.find((s) => s.id === id) || null;
}

function distToRect(x, y, r) {
  const cx = Math.max(r.x, Math.min(x, r.x + r.w));
  const cy = Math.max(r.y, Math.min(y, r.y + r.h));
  return Math.hypot(x - cx, y - cy);
}

// Nearest station within reach of the cook, or null.
export function nearestStation(state) {
  const { x, y } = state.cook;
  let best = null;
  let bestD = 82;
  for (const s of STATIONS) {
    const d = distToRect(x, y, s);
    if (d < bestD) {
      bestD = d;
      best = s;
    }
  }
  return best;
}

function carryingPlate(state) {
  const c = state.cook.carrying;
  return c.length === 1 && c[0].plate ? c[0].plate : null;
}

function carryingItems(state) {
  return state.cook.carrying.filter((c) => !c.plate);
}

// One tap of the interact key (or a click) at the nearest station.
export function interact(state, sfx) {
  const station = nearestStation(state);
  if (!station) return false;
  const cook = state.cook;

  if (station.kind === 'crate') {
    if (carryingPlate(state)) {
      showMessage(state, 'Tangan penuh piring — antar dulu!', 'warn');
      return true;
    }
    if (cook.carrying.length >= CARRY_LIMIT) {
      showMessage(state, 'Tangan penuh! Maksimal ' + CARRY_LIMIT + ' bahan.', 'warn');
      return true;
    }
    cook.carrying.push(freshItem(station.base));
    sfx('pickup');
    return true;
  }

  if (station.kind === 'board') {
    const board = state.chopping;
    if (!board.item) {
      const idx = cook.carrying.findIndex((c) => !c.plate && INGREDIENTS[c.base].needsChop && !c.chopped);
      if (idx < 0) {
        showMessage(state, 'Bawa bahan yang perlu dipotong (ayam / sayur).', 'info');
        return true;
      }
      board.item = cook.carrying.splice(idx, 1)[0];
      board.progress = 0;
      sfx('place');
      return true;
    }
    if (board.item.chopped) {
      if (cook.carrying.length >= CARRY_LIMIT) {
        showMessage(state, 'Tangan penuh!', 'warn');
        return true;
      }
      cook.carrying.push(board.item);
      board.item = null;
      board.progress = 0;
      sfx('pickup');
      return true;
    }
    showMessage(state, 'Tahan E untuk memotong…', 'info');
    return true;
  }

  if (station.kind === 'wok') {
    const slot = state.wok[station.slot];
    if (!slot.item) {
      const idx = cook.carrying.findIndex((c) => !c.plate && INGREDIENTS[c.base].needsCook && !c.cooked);
      if (idx < 0) {
        showMessage(state, 'Bawa bahan yang perlu dimasak (mie / ayam / telur).', 'info');
        return true;
      }
      slot.item = cook.carrying.splice(idx, 1)[0];
      slot.progress = 0;
      sfx('place');
      return true;
    }
    if (cook.carrying.length >= CARRY_LIMIT) {
      showMessage(state, 'Tangan penuh!', 'warn');
      return true;
    }
    cook.carrying.push(slot.item);
    slot.item = null;
    slot.progress = 0;
    sfx('pickup');
    return true;
  }

  if (station.kind === 'plate') {
    const plate = carryingPlate(state);
    if (plate) {
      showMessage(state, 'Bawa piringnya ke Jendela Saji!', 'info');
      return true;
    }
    if (state.plates.length > 0 && cook.carrying.length === 0) {
      const recipeId = state.plates.shift();
      cook.carrying.push({ plate: recipeId });
      sfx('pickup');
      return true;
    }
    const items = carryingItems(state);
    if (items.length === 0) {
      showMessage(state, 'Bawa bahan resep ke sini untuk dirakit.', 'info');
      return true;
    }
    const openRecipes = state.board.orders
      .filter((o) => o.state === 'waiting')
      .map((o) => recipeById(o.recipeId));
    const match = openRecipes.find((r) => r && carriedFillsRecipe(items, r));
    if (!match) {
      showMessage(state, 'Belum jadi resep pesanan yang ada!', 'warn');
      state.shake = 6;
      sfx('wrong');
      return true;
    }
    // Remove exactly the items the recipe used.
    const used = new Set();
    for (const nd of match.needs) {
      for (let i = 0; i < items.length; i++) {
        if (used.has(i)) continue;
        const it = items[i];
        if (it.base === nd.base && (!nd.chopped || it.chopped) && (!nd.cooked || it.cooked) && !it.burnt) {
          used.add(i);
          break;
        }
      }
    }
    cook.carrying = items.filter((_, i) => !used.has(i));
    state.plates.push(match.id);
    sfx('ding');
    showMessage(state, match.name + ' siap! Antar ke Jendela Saji.', 'good');
    return true;
  }

  if (station.kind === 'serve') {
    const plate = carryingPlate(state);
    if (!plate) {
      showMessage(state, 'Bawa piring jadi ke sini untuk disajikan.', 'info');
      return true;
    }
    const served = servePlate(state.board, plate);
    if (!served) {
      showMessage(state, 'Pesanan itu sudah hangus — buang piringnya.', 'warn');
      return true;
    }
    const recipe = recipeById(plate);
    const earned = awardServe(state, recipe, served.patienceLeft);
    cook.carrying = [];
    state.floaters.push({ x: station.ax - 40, y: station.y - 10, text: '+' + earned, color: '#ffd94d', life: 1.4 });
    state.floaters.push({ x: station.ax - 40, y: station.y + 16, text: recipe.name + ' tersaji!', color: '#ffffff', life: 1.4 });
    sfx('serve');
    return true;
  }

  if (station.kind === 'trash') {
    if (cook.carrying.length === 0) return true;
    cook.carrying = [];
    sfx('trash');
    showMessage(state, 'Dibuang.', 'info');
    return true;
  }

  return false;
}

// Per-frame kitchen work: chopping while E is held, wok cooking and burning.
export function updateKitchen(state, dt, interactHeld, sfx) {
  const station = nearestStation(state);
  const board = state.chopping;
  if (board.item && !board.item.chopped && interactHeld && station && station.kind === 'board') {
    board.progress += dt / 1.5;
    if (Math.random() < dt * 6) {
      state.particles.push({ x: 425 + (Math.random() - 0.5) * 60, y: 178, vx: (Math.random() - 0.5) * 40, vy: -30 - Math.random() * 30, life: 0.4, color: '#ffffff', size: 3 });
    }
    if (board.progress >= 1) {
      board.item.chopped = true;
      board.progress = 1;
      sfx('chopDone');
      showMessage(state, itemLabel(board.item) + ' — ambil lagi!', 'good');
    }
  }
  for (const slot of state.wok) {
    if (!slot.item) continue;
    slot.progress += dt / 4.2; // about 4 seconds to cook
    if (!slot.item.cooked && slot.progress >= 1) {
      slot.item.cooked = true;
      sfx('ding');
    }
    if (slot.progress >= slot.burnAt / 4.2 && !slot.item.burnt) {
      slot.item.burnt = true;
      sfx('burn');
      showMessage(state, itemLabel(slot.item) + ' — gosong! Buang!', 'warn');
    }
    if (slot.item && !slot.item.burnt && Math.random() < dt * 8) {
      state.particles.push({ x: 622 + (Math.random() - 0.5) * 70, y: 165, vx: (Math.random() - 0.5) * 16, vy: -46 - Math.random() * 24, life: 0.8, color: 'rgba(255,255,255,0.7)', size: 4 });
    }
  }
}

// Expired orders cost a heart; call with the list updateOrders returned.
export function applyExpired(state, expired, sfx) {
  for (const order of expired) {
    loseHeart(state);
    sfx('expire');
    const recipe = recipeById(order.recipeId);
    showMessage(state, 'Pesanan ' + (recipe ? recipe.name : '') + ' hangus! -1 hati', 'bad');
  }
}

export { itemIsReady };
