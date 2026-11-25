// Warung Kilat — demo.js
// One job: deterministic mid-service scenes for screenshots. ?demo=1 and
// ?shot=cover|chop|serve|rush open the game frozen mid-rush: a full order
// board, ingredients on the counters, one dish mid-assembly, a timer
// running and a plate ready to serve. Normal play (no parameter) is
// untouched — it always starts fresh from the title screen.

import { freshItem } from './recipes.js';
import { makeOrder } from './orders.js';

function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function baseScene(state, seed) {
  const r = rng(seed);
  state.screen = 'playing';
  state.frozen = true;
  state.dayTimeLeft = 107;
  state.score = 1240;
  state.coins = 260;
  state.combo = 3;
  state.bestCombo = 5;
  state.hearts = 3;
  state.servedToday = 9;
  state.servedTotal = 9;
  state.day = 1;
  state.dayTarget = 300;
  state.board.orders = [
    makeOrder(1, r),
    makeOrder(1, r),
    makeOrder(1, r),
    makeOrder(1, r),
  ];
  // Force a spread of recipes so the board reads at a glance.
  const spread = ['nasi_goreng', 'ayam_geprek', 'mie_goreng', 'nasi_ayam'];
  state.board.orders.forEach((o, i) => {
    o.recipeId = spread[i % spread.length];
  });
  state.board.orders[0].patience = 42;
  state.board.orders[0].patienceMax = 58;
  state.board.orders[1].patience = 31;
  state.board.orders[1].patienceMax = 58;
  state.board.orders[2].patience = 18;
  state.board.orders[2].patienceMax = 53;
  state.board.orders[3].patience = 47;
  state.board.orders[3].patienceMax = 58;
  return r;
}

export function applyShot(state, shot) {
  const kind = (shot || 'cover').toLowerCase();
  if (kind === 'cover' || kind === 'demo') {
    baseScene(state, 11);
    // One dish mid-assembly: a plate of Nasi Goreng ready on the counter,
    // the cook carrying the last two items for the next dish.
    state.plates = ['nasi_goreng'];
    state.cook.x = 700;
    state.cook.y = 430;
    state.cook.dirX = -1;
    state.cook.dirY = 0;
    state.cook.carrying = [freshItem('telur'), freshItem('sayur')];
    state.cook.carrying[0].cooked = true;
    state.cook.carrying[1].chopped = true;
    // Wok busy: noodles boiling, chicken frying.
    state.wok[0].item = freshItem('mie');
    state.wok[0].progress = 0.62;
    state.wok[1].item = freshItem('ayam');
    state.wok[1].item.chopped = true;
    state.wok[1].progress = 0.8;
    // Sayur half-chopped on the board.
    state.chopping.item = freshItem('sayur');
    state.chopping.progress = 0.55;
    return;
  }
  if (kind === 'chop') {
    baseScene(state, 23);
    state.plates = [];
    state.cook.x = 425;
    state.cook.y = 300;
    state.cook.dirX = 0;
    state.cook.dirY = -1;
    state.cook.carrying = [freshItem('ayam')];
    state.chopping.item = freshItem('sayur');
    state.chopping.progress = 0.68;
    state.wok[0].item = freshItem('telur');
    state.wok[0].progress = 0.45;
    state.wok[1].item = null;
    state.board.orders = state.board.orders.slice(0, 3);
    return;
  }
  if (kind === 'serve') {
    baseScene(state, 37);
    state.plates = [];
    state.combo = 5;
    state.bestCombo = 5;
    state.score = 1890;
    state.coins = 410;
    state.cook.x = 1010;
    state.cook.y = 440;
    state.cook.dirX = 1;
    state.cook.dirY = 0;
    state.cook.carrying = [{ plate: 'ayam_geprek' }];
    state.wok[0].item = freshItem('mie');
    state.wok[0].progress = 0.3;
    state.wok[1].item = null;
    state.chopping.item = null;
    state.floaters.push({ x: 1000, y: 330, text: '+152', color: '#ffd94d', life: 1.4 });
    state.floaters.push({ x: 1000, y: 356, text: 'Ayam Geprek tersaji!', color: '#ffffff', life: 1.4 });
    return;
  }
  // rush: the board nearly full, two tickets about to burn, timer low.
  baseScene(state, 51);
  state.dayTimeLeft = 32;
  state.score = 2310;
  state.coins = 480;
  state.combo = 7;
  state.bestCombo = 7;
  state.board.orders[1].patience = 7;
  state.board.orders[2].patience = 11;
  state.plates = ['mie_goreng', 'telur_dadar'];
  state.cook.x = 760;
  state.cook.y = 480;
  state.cook.dirX = 1;
  state.cook.dirY = -1;
  state.cook.carrying = [freshItem('ayam')];
  state.cook.carrying[0].chopped = true;
  state.cook.carrying[0].cooked = true;
  state.wok[0].item = freshItem('telur');
  state.wok[0].progress = 0.9;
  state.wok[1].item = freshItem('mie');
  state.wok[1].progress = 0.55;
  state.chopping.item = freshItem('sayur');
  state.chopping.progress = 0.3;
}

// Parse the page query: ?shot=cover|chop|serve|rush or ?demo=1.
export function shotFromLocation(search) {
  const params = new URLSearchParams(search || '');
  const shot = params.get('shot');
  if (shot) return shot;
  if (params.get('demo')) return 'cover';
  return null;
}
