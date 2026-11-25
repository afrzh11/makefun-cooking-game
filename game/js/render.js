// Warung Kilat — render.js
// One job: everything the player sees. All art is drawn in code with the
// canvas 2D API — no images, no fonts from the network. Warm warung look:
// terracotta walls, wooden counters, bright food.

import { INGREDIENTS, recipeById, itemLabel, itemMatchesNeed } from './recipes.js';
import { STATIONS, FLOOR } from './kitchen.js';
import { patienceFraction, MAX_ORDERS } from './orders.js';
import { DAY_LENGTH, messageVisible } from './state.js';

const W = 1280;
const H = 720;

// ---------- small drawing helpers ----------

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function text(ctx, str, x, y, size, color, align, weight) {
  ctx.fillStyle = color;
  ctx.font = (weight || '700') + ' ' + size + 'px Arial, sans-serif';
  ctx.textAlign = align || 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(str, x, y);
}

function shadow(ctx, x, y, rx, ry) {
  ctx.fillStyle = 'rgba(0,0,0,0.18)';
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
}

// ---------- food drawing ----------

export function drawIngredientIcon(ctx, base, x, y, s) {
  // s = half-size of the icon box. Each ingredient has its own shape.
  ctx.save();
  ctx.translate(x, y);
  if (base === 'nasi') {
    ctx.fillStyle = '#f5f0dc';
    ctx.beginPath();
    ctx.arc(0, 2, s * 0.72, Math.PI, 0);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#d8cfae';
    ctx.fillRect(-s * 0.7, 2, s * 1.4, s * 0.18);
    ctx.fillStyle = '#fff8e0';
    for (let i = 0; i < 5; i++) {
      ctx.beginPath();
      ctx.arc(-s * 0.4 + i * s * 0.2, -s * 0.25 + (i % 2) * s * 0.15, s * 0.09, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (base === 'mie') {
    ctx.strokeStyle = '#f7c948';
    ctx.lineWidth = s * 0.22;
    ctx.lineCap = 'round';
    for (let i = -1; i <= 1; i++) {
      ctx.beginPath();
      ctx.moveTo(-s * 0.7, i * s * 0.42);
      ctx.bezierCurveTo(-s * 0.3, i * s * 0.42 - s * 0.3, s * 0.3, i * s * 0.42 + s * 0.3, s * 0.7, i * s * 0.42);
      ctx.stroke();
    }
  } else if (base === 'ayam') {
    ctx.fillStyle = '#e8a06a';
    ctx.beginPath();
    ctx.ellipse(-s * 0.08, -s * 0.08, s * 0.62, s * 0.48, -0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#f5f0dc';
    ctx.lineWidth = s * 0.2;
    ctx.beginPath();
    ctx.moveTo(s * 0.4, s * 0.3);
    ctx.lineTo(s * 0.75, s * 0.62);
    ctx.stroke();
    ctx.fillStyle = '#f5f0dc';
    ctx.beginPath();
    ctx.arc(s * 0.78, s * 0.66, s * 0.16, 0, Math.PI * 2);
    ctx.fill();
  } else if (base === 'telur') {
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(0, 0, s * 0.8, s * 0.62, 0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#f7b731';
    ctx.beginPath();
    ctx.arc(s * 0.08, 0, s * 0.34, 0, Math.PI * 2);
    ctx.fill();
  } else if (base === 'sayur') {
    ctx.fillStyle = '#4d9a55';
    for (let i = -1; i <= 1; i++) {
      ctx.beginPath();
      ctx.ellipse(i * s * 0.42, i * i * s * 0.18, s * 0.34, s * 0.52, i * 0.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = '#7dc383';
    ctx.beginPath();
    ctx.ellipse(0, -s * 0.1, s * 0.3, s * 0.42, 0, 0, Math.PI * 2);
    ctx.fill();
  } else if (base === 'sambal') {
    ctx.fillStyle = '#8a5a3b';
    ctx.beginPath();
    ctx.arc(0, s * 0.1, s * 0.72, 0, Math.PI);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#d9382b';
    ctx.beginPath();
    ctx.ellipse(0, s * 0.08, s * 0.7, s * 0.34, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ff6b5e';
    ctx.beginPath();
    ctx.arc(-s * 0.2, -s * 0.05, s * 0.14, 0, Math.PI * 2);
    ctx.fill();
  } else if (base === 'kerupuk') {
    ctx.fillStyle = '#f2a7c3';
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      const r = s * (i % 2 === 0 ? 0.78 : 0.6);
      const px = Math.cos(a) * r;
      const py = Math.sin(a) * r;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#d67ba0';
    ctx.beginPath();
    ctx.arc(0, 0, s * 0.2, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

// One carried item, with its preparation state shown.
export function drawCarriedItem(ctx, item, x, y, s) {
  if (item.plate) {
    drawPlate(ctx, item.plate, x, y, s + 4);
    return;
  }
  const def = INGREDIENTS[item.base];
  // Backing chip so the item reads on any background.
  ctx.fillStyle = 'rgba(255,255,255,0.92)';
  ctx.beginPath();
  ctx.arc(x, y, s + 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = item.burnt ? '#333333' : def.dark;
  ctx.lineWidth = 2;
  ctx.stroke();
  if (item.burnt) {
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = '#222222';
    ctx.beginPath();
    ctx.arc(0, 0, s * 0.62, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#555555';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-s * 0.4, -s * 0.4);
    ctx.lineTo(s * 0.4, s * 0.4);
    ctx.moveTo(s * 0.4, -s * 0.4);
    ctx.lineTo(-s * 0.4, s * 0.4);
    ctx.stroke();
    ctx.restore();
    return;
  }
  drawIngredientIcon(ctx, item.base, x, y, s);
  if (item.chopped) {
    ctx.strokeStyle = '#2e7d32';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(x - s * 0.5, y + s * 0.55);
    ctx.lineTo(x - s * 0.1, y + s * 0.95);
    ctx.lineTo(x + s * 0.35, y + s * 0.45);
    ctx.stroke();
  }
  if (item.cooked) {
    ctx.strokeStyle = 'rgba(255,255,255,0.9)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x - s * 0.5, y - s * 0.75);
    ctx.quadraticCurveTo(x - s * 0.2, y - s * 1.05, x, y - s * 0.75);
    ctx.quadraticCurveTo(x + s * 0.3, y - s * 1.05, x + s * 0.55, y - s * 0.75);
    ctx.stroke();
  }
}

export function drawPlate(ctx, recipeId, x, y, r) {
  const recipe = recipeById(recipeId);
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#d9d4c5';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = '#f0ead8';
  ctx.beginPath();
  ctx.arc(x, y, r * 0.72, 0, Math.PI * 2);
  ctx.fill();
  if (!recipe) return;
  // Compose the dish from its needs, small icons arranged on the plate.
  const needs = recipe.needs;
  needs.forEach((nd, i) => {
    const a = -Math.PI / 2 + (i / needs.length) * Math.PI * 2;
    const px = x + Math.cos(a) * r * 0.36;
    const py = y + Math.sin(a) * r * 0.36;
    drawIngredientIcon(ctx, nd.base, px, py, r * 0.3);
  });
  ctx.fillStyle = recipe.color;
  ctx.beginPath();
  ctx.arc(x, y, r * 0.16, 0, Math.PI * 2);
  ctx.fill();
}

// ---------- stations ----------

function drawCrate(ctx, s) {
  ctx.fillStyle = '#8a5a3b';
  roundRect(ctx, s.x, s.y, s.w, s.h, 8);
  ctx.fill();
  ctx.fillStyle = '#a9744f';
  roundRect(ctx, s.x + 4, s.y + 4, s.w - 8, s.h - 8, 6);
  ctx.fill();
  ctx.fillStyle = '#fff8e0';
  roundRect(ctx, s.x + 8, s.y + 8, 44, 42, 6);
  ctx.fill();
  drawIngredientIcon(ctx, s.base, s.x + 30, s.y + 29, 15);
  text(ctx, s.name, s.x + 62, s.y + 20, 15, '#ffffff', 'left');
  const def = INGREDIENTS[s.base];
  const prep = def.needsChop && def.needsCook ? 'potong + masak'
    : def.needsChop ? 'potong dulu'
    : def.needsCook ? 'masak dulu' : 'siap pakai';
  text(ctx, prep, s.x + 62, s.y + 40, 11, '#ffe1b3', 'left', '600');
}

function drawBoard(ctx, s, state) {
  ctx.fillStyle = '#5d4037';
  roundRect(ctx, s.x - 6, s.y - 6, s.w + 12, s.h + 12, 10);
  ctx.fill();
  ctx.fillStyle = '#d9b380';
  roundRect(ctx, s.x, s.y, s.w, s.h, 8);
  ctx.fill();
  ctx.strokeStyle = '#b98d5e';
  ctx.lineWidth = 2;
  for (let i = 1; i < 4; i++) {
    ctx.beginPath();
    ctx.moveTo(s.x + 10, s.y + i * 18);
    ctx.lineTo(s.x + s.w - 10, s.y + i * 18);
    ctx.stroke();
  }
  text(ctx, 'TALENAN', s.x + s.w / 2, s.y - 18, 13, '#ffe1b3');
  const board = state.chopping;
  if (board.item) {
    drawIngredientIcon(ctx, board.item.base, s.x + s.w / 2 - 30, s.y + s.h / 2, 22);
    if (!board.item.chopped) {
      // Chopping progress bar.
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      roundRect(ctx, s.x + 18, s.y + s.h - 16, s.w - 36, 9, 4);
      ctx.fill();
      ctx.fillStyle = '#7dc383';
      roundRect(ctx, s.x + 18, s.y + s.h - 16, (s.w - 36) * board.progress, 9, 4);
      ctx.fill();
      text(ctx, 'TAHAN E', s.x + s.w / 2 + 42, s.y + s.h / 2, 12, '#5d4037');
    } else {
      text(ctx, 'SIAP ✓', s.x + s.w / 2 + 42, s.y + s.h / 2, 13, '#2e7d32');
    }
  } else {
    text(ctx, 'taruh ayam / sayur', s.x + s.w / 2, s.y + s.h / 2, 12, '#8a6a45');
  }
}

function drawWok(ctx, s, slot) {
  ctx.fillStyle = '#3d3d3d';
  roundRect(ctx, s.x - 6, s.y - 6, s.w + 12, s.h + 12, 10);
  ctx.fill();
  // Flame under the pan.
  const flick = 3 + Math.sin(Date.now() / 90 + s.slot * 2) * 2;
  ctx.fillStyle = slot.item && !slot.item.burnt ? '#ff9d2e' : '#7a7a7a';
  ctx.beginPath();
  ctx.ellipse(s.x + s.w / 2, s.y + s.h - 12, 26, 8 + flick, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#222222';
  ctx.beginPath();
  ctx.ellipse(s.x + s.w / 2, s.y + s.h / 2 - 4, 44, 26, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#555555';
  ctx.lineWidth = 3;
  ctx.stroke();
  text(ctx, s.name, s.x + s.w / 2, s.y - 18, 13, '#ffe1b3');
  if (slot.item) {
    drawIngredientIcon(ctx, slot.item.base, s.x + s.w / 2, s.y + s.h / 2 - 4, 18);
    if (slot.item.burnt) {
      text(ctx, 'GOSONG!', s.x + s.w / 2, s.y + s.h - 26, 12, '#ff5252');
    } else if (slot.item.cooked) {
      text(ctx, 'MATANG ✓', s.x + s.w / 2, s.y + s.h - 26, 12, '#7dc383');
    } else {
      ctx.fillStyle = 'rgba(0,0,0,0.4)';
      roundRect(ctx, s.x + 14, s.y + s.h - 16, s.w - 28, 8, 4);
      ctx.fill();
      ctx.fillStyle = '#ff9d2e';
      roundRect(ctx, s.x + 14, s.y + s.h - 16, (s.w - 28) * Math.min(1, slot.progress), 8, 4);
      ctx.fill();
    }
  } else {
    text(ctx, 'kosong', s.x + s.w / 2, s.y + s.h / 2 - 4, 12, '#999999');
  }
}

function drawPlating(ctx, s, state) {
  ctx.fillStyle = '#b8c4cc';
  roundRect(ctx, s.x - 6, s.y - 6, s.w + 12, s.h + 12, 10);
  ctx.fill();
  ctx.fillStyle = '#e8eef2';
  roundRect(ctx, s.x, s.y, s.w, s.h, 8);
  ctx.fill();
  text(ctx, 'MEJA PLATING', s.x + s.w / 2, s.y + 16, 13, '#5a6b76');
  if (state.plates.length === 0) {
    text(ctx, 'rakit resep di sini', s.x + s.w / 2, s.y + s.h / 2, 12, '#8a9aa5');
    text(ctx, 'tekan E bila lengkap', s.x + s.w / 2, s.y + s.h / 2 + 20, 11, '#8a9aa5', 'center', '600');
  } else {
    state.plates.forEach((recipeId, i) => {
      const px = s.x + s.w / 2 + (i - (state.plates.length - 1) / 2) * 62;
      drawPlate(ctx, recipeId, px, s.y + 66, 26);
    });
    // Dish names as a short list under the plates, so two names never collide.
    state.plates.forEach((recipeId, i) => {
      const recipe = recipeById(recipeId);
      if (recipe) text(ctx, '• ' + recipe.name, s.x + 16, s.y + 116 + i * 18, 12, '#33414c', 'left');
    });
    text(ctx, 'SIAP DIANTAR ✓', s.x + s.w / 2, s.y + s.h - 18, 13, '#2e7d32');
  }
}

function drawServe(ctx, s) {
  ctx.fillStyle = '#7a4a2b';
  roundRect(ctx, s.x - 6, s.y - 6, s.w + 12, s.h + 12, 10);
  ctx.fill();
  ctx.fillStyle = '#fff3d6';
  roundRect(ctx, s.x, s.y, s.w, s.h, 8);
  ctx.fill();
  text(ctx, 'JENDELA SAJI', s.x + s.w / 2, s.y + 18, 13, '#7a4a2b');
  // A little bell and a happy customer peeking over the counter.
  ctx.fillStyle = '#f7c948';
  ctx.beginPath();
  ctx.arc(s.x + s.w / 2, s.y + 62, 16, Math.PI, 0);
  ctx.closePath();
  ctx.fill();
  ctx.fillRect(s.x + s.w / 2 - 20, s.y + 62, 40, 5);
  ctx.fillStyle = '#ffcc9e';
  ctx.beginPath();
  ctx.arc(s.x + s.w / 2 - 34, s.y + 108, 20, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(s.x + s.w / 2 + 34, s.y + 108, 20, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#333333';
  ctx.beginPath();
  ctx.arc(s.x + s.w / 2 - 40, s.y + 104, 3, 0, Math.PI * 2);
  ctx.arc(s.x + s.w / 2 - 28, s.y + 104, 3, 0, Math.PI * 2);
  ctx.arc(s.x + s.w / 2 + 28, s.y + 104, 3, 0, Math.PI * 2);
  ctx.arc(s.x + s.w / 2 + 40, s.y + 104, 3, 0, Math.PI * 2);
  ctx.fill();
  text(ctx, 'antar piring ke sini', s.x + s.w / 2, s.y + s.h - 16, 12, '#8a6a45');
}

function drawTrash(ctx, s) {
  ctx.fillStyle = '#4a4a4a';
  roundRect(ctx, s.x, s.y, s.w, s.h, 8);
  ctx.fill();
  ctx.fillStyle = '#666666';
  roundRect(ctx, s.x - 4, s.y - 8, s.w + 8, 12, 6);
  ctx.fill();
  text(ctx, 'SAMPAH', s.x + s.w / 2, s.y + s.h / 2 + 2, 12, '#ffffff');
}

// ---------- order board ----------

function drawOrderBoard(ctx, state) {
  ctx.fillStyle = '#6d4c2f';
  roundRect(ctx, 12, 6, W - 24, 108, 12);
  ctx.fill();
  ctx.fillStyle = '#8a5a3b';
  roundRect(ctx, 16, 10, W - 32, 100, 10);
  ctx.fill();
  text(ctx, 'PESANAN', 30, 60, 16, '#ffe1b3', 'left');
  text(ctx, 'WARUNG KILAT', 30, 84, 11, '#d9b380', 'left', '600');
  const slotW = 252;
  const startX = 150;
  for (let i = 0; i < MAX_ORDERS; i++) {
    const x = startX + i * (slotW + 10);
    const order = state.board.orders[i];
    if (!order) {
      ctx.fillStyle = 'rgba(255,255,255,0.08)';
      roundRect(ctx, x, 18, slotW, 84, 8);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.25)';
      ctx.setLineDash([5, 5]);
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.setLineDash([]);
      text(ctx, 'menunggu pesanan…', x + slotW / 2, 60, 12, 'rgba(255,255,255,0.45)', 'center', '600');
      continue;
    }
    const recipe = recipeById(order.recipeId);
    const frac = patienceFraction(order);
    const urgent = frac < 0.3;
    const pulse = urgent ? 0.5 + 0.5 * Math.sin(Date.now() / 160) : 0;
    ctx.fillStyle = '#fff8e0';
    roundRect(ctx, x, 18, slotW, 84, 8);
    ctx.fill();
    ctx.strokeStyle = urgent ? 'rgba(217,56,43,' + (0.5 + pulse * 0.5) + ')' : recipe.color;
    ctx.lineWidth = urgent ? 3 : 2;
    ctx.stroke();
    text(ctx, recipe.name, x + 12, 36, 15, '#333333', 'left');
    text(ctx, recipe.blurb, x + 12, 56, 10.5, '#8a6a45', 'left', '600');
    // Needed ingredients as icons.
    recipe.needs.forEach((nd, j) => {
      const ix = x + 24 + j * 34;
      ctx.fillStyle = '#e3d6b4';
      ctx.beginPath();
      ctx.arc(ix, 78, 13, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#c9b98a';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      drawIngredientIcon(ctx, nd.base, ix, 78, 9);
    });
    // Patience bar.
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    roundRect(ctx, x + 128, 70, 112, 12, 6);
    ctx.fill();
    ctx.fillStyle = frac > 0.5 ? '#7dc383' : frac > 0.3 ? '#f7c948' : '#d9382b';
    roundRect(ctx, x + 128, 70, 112 * frac, 12, 6);
    ctx.fill();
    text(ctx, Math.ceil(order.patience) + ' dtk', x + 184, 78, 10, '#333333');
    if (urgent) text(ctx, 'SEGERA!', x + slotW - 10, 36, 12, '#d9382b', 'right');
  }
}

// ---------- cook ----------

function drawCook(ctx, state) {
  const c = state.cook;
  const bob = c.moving ? Math.sin(Date.now() / 90) * 2 : 0;
  shadow(ctx, c.x, c.y + 20, 20, 7);
  // Body + apron.
  ctx.fillStyle = '#2e7d32';
  ctx.beginPath();
  ctx.arc(c.x, c.y + 6 + bob, 19, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  roundRect(ctx, c.x - 13, c.y - 2 + bob, 26, 18, 6);
  ctx.fill();
  ctx.fillStyle = '#2e7d32';
  ctx.fillRect(c.x - 2, c.y - 2 + bob, 4, 18);
  // Head.
  ctx.fillStyle = '#ffcc9e';
  ctx.beginPath();
  ctx.arc(c.x, c.y - 18 + bob, 14, 0, Math.PI * 2);
  ctx.fill();
  // Chef hat.
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(c.x - 8, c.y - 30 + bob, 7, 0, Math.PI * 2);
  ctx.arc(c.x, c.y - 33 + bob, 8, 0, Math.PI * 2);
  ctx.arc(c.x + 8, c.y - 30 + bob, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(c.x - 12, c.y - 32 + bob, 24, 7);
  // Face.
  ctx.fillStyle = '#333333';
  ctx.beginPath();
  ctx.arc(c.x - 5 + c.dirX * 2, c.y - 19 + bob, 1.8, 0, Math.PI * 2);
  ctx.arc(c.x + 5 + c.dirX * 2, c.y - 19 + bob, 1.8, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#333333';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(c.x + c.dirX * 2, c.y - 14 + bob, 4, 0.15 * Math.PI, 0.85 * Math.PI);
  ctx.stroke();
  // Carried items above the head.
  if (c.carrying.length > 0) {
    const n = c.carrying.length;
    c.carrying.forEach((item, i) => {
      const ix = c.x + (i - (n - 1) / 2) * 34;
      drawCarriedItem(ctx, item, ix, c.y - 58 + bob, 12);
    });
  }
  // Interaction prompt.
  if (state.nearStation) {
    text(ctx, '[ E ]  ' + state.nearStation.name, c.x, c.y - 84 + bob, 13, '#ffffff');
    ctx.strokeStyle = 'rgba(255,255,255,0.85)';
    ctx.lineWidth = 2;
    const s = state.nearStation;
    roundRect(ctx, s.x - 5, s.y - 5, s.w + 10, s.h + 10, 12);
    ctx.stroke();
  }
}

// ---------- HUD ----------

function drawHud(ctx, state) {
  ctx.fillStyle = '#3a2a1a';
  ctx.fillRect(0, 640, W, 80);
  ctx.fillStyle = '#6d4c2f';
  ctx.fillRect(0, 640, W, 4);
  text(ctx, 'SKOR', 30, 662, 12, '#d9b380', 'left', '600');
  text(ctx, String(state.score), 30, 690, 26, '#ffd94d', 'left');
  text(ctx, 'HARI ' + state.day, 200, 662, 12, '#d9b380', 'left', '600');
  const mins = Math.max(0, Math.floor(state.dayTimeLeft / 60));
  const secs = Math.max(0, Math.floor(state.dayTimeLeft % 60));
  text(ctx, mins + ':' + String(secs).padStart(2, '0'), 200, 690, 26, '#ffffff', 'left');
  // Day timer bar.
  ctx.fillStyle = 'rgba(255,255,255,0.15)';
  roundRect(ctx, 330, 668, 220, 14, 7);
  ctx.fill();
  ctx.fillStyle = state.dayTimeLeft < 30 ? '#d9382b' : '#7dc383';
  roundRect(ctx, 330, 668, 220 * Math.max(0, state.dayTimeLeft / DAY_LENGTH), 14, 7);
  ctx.fill();
  text(ctx, 'target ' + state.dayTarget + ' koin', 330, 700, 11, '#d9b380', 'left', '600');
  text(ctx, state.coins + ' koin hari ini', 550, 700, 11, '#ffffff', 'right', '600');
  // Combo.
  if (state.combo >= 2) {
    text(ctx, 'KOMBO x' + (1 + Math.min(state.combo, 10) * 0.1).toFixed(1), 640, 676, 22, '#ff9d2e');
    text(ctx, state.combo + ' sajian beruntun', 640, 700, 11, '#ffe1b3', 'center', '600');
  } else {
    text(ctx, 'sajikan beruntun untuk kombo', 640, 676, 13, '#d9b380');
  }
  // Hearts.
  for (let i = 0; i < 3; i++) {
    ctx.fillStyle = i < state.hearts ? '#ff5252' : 'rgba(255,255,255,0.2)';
    ctx.beginPath();
    const hx = 820 + i * 34;
    const hy = 676;
    ctx.moveTo(hx, hy + 8);
    ctx.bezierCurveTo(hx - 12, hy - 4, hx - 6, hy - 12, hx, hy - 5);
    ctx.bezierCurveTo(hx + 6, hy - 12, hx + 12, hy - 4, hx, hy + 8);
    ctx.fill();
  }
  text(ctx, 'hati', 820, 700, 11, '#d9b380', 'left', '600');
  text(ctx, 'WASD gerak • E pakai • klik stasiun', 1000, 664, 12, '#ffffff', 'left', '600');
  text(ctx, 'P jeda • M suara ' + (state.muted ? 'mati' : 'nyala') + ' • R ulang', 1000, 686, 12, '#d9b380', 'left', '600');
}

// ---------- background ----------

function drawBackground(ctx) {
  // Wall.
  ctx.fillStyle = '#c96f4a';
  ctx.fillRect(0, 0, W, 130);
  ctx.fillStyle = '#b25a38';
  ctx.fillRect(0, 126, W, 6);
  // Floor tiles.
  for (let y = 0; y < 6; y++) {
    for (let x = 0; x < 16; x++) {
      ctx.fillStyle = (x + y) % 2 === 0 ? '#e8d5b0' : '#dfc89a';
      ctx.fillRect(0 + x * 80, 132 + y * 82, 80, 82);
    }
  }
  // Floor rug in the middle.
  ctx.fillStyle = '#a33d2d';
  roundRect(ctx, 480, 300, 320, 220, 16);
  ctx.fill();
  ctx.strokeStyle = '#ffd94d';
  ctx.lineWidth = 3;
  roundRect(ctx, 494, 314, 292, 192, 12);
  ctx.stroke();
  // Hanging lamps.
  for (const lx of [440, 640, 840]) {
    ctx.strokeStyle = '#5d4037';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(lx, 132);
    ctx.lineTo(lx, 168);
    ctx.stroke();
    ctx.fillStyle = '#ffd94d';
    ctx.beginPath();
    ctx.arc(lx, 178, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,217,77,0.25)';
    ctx.beginPath();
    ctx.arc(lx, 178, 26, 0, Math.PI * 2);
    ctx.fill();
  }
  // Potted plant in the bottom-left corner of the floor.
  ctx.fillStyle = '#b25a38';
  roundRect(ctx, 222, 584, 34, 26, 5);
  ctx.fill();
  ctx.fillStyle = '#4d9a55';
  ctx.beginPath();
  ctx.ellipse(232, 572, 9, 18, -0.4, 0, Math.PI * 2);
  ctx.ellipse(248, 568, 9, 20, 0.3, 0, Math.PI * 2);
  ctx.ellipse(239, 564, 8, 18, 0, 0, Math.PI * 2);
  ctx.fill();
  // Wall sign above the crates: the warung's name, painted on the wall.
  text(ctx, 'WARUNG KILAT', 100, 124, 13, '#ffe1b3');
}

// ---------- overlays ----------

function drawToast(ctx, state) {
  if (!messageVisible(state)) return;
  const colors = { info: '#333333', good: '#2e7d32', warn: '#b25a38', bad: '#a11f16' };
  ctx.fillStyle = colors[state.messageKind] || '#333333';
  const w = Math.min(560, ctx.measureText(state.message).width + 48);
  roundRect(ctx, W / 2 - w / 2, 596, w, 34, 17);
  ctx.fill();
  text(ctx, state.message, W / 2, 614, 15, '#ffffff');
}

function drawCenterPanel(ctx, lines) {
  ctx.fillStyle = 'rgba(20,12,6,0.55)';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#fff8e0';
  roundRect(ctx, W / 2 - 330, H / 2 - 190, 660, 380, 18);
  ctx.fill();
  ctx.strokeStyle = '#d9382b';
  ctx.lineWidth = 4;
  ctx.stroke();
  let y = H / 2 - 140;
  for (const line of lines) {
    text(ctx, line.text, W / 2, y, line.size, line.color, 'center', line.weight || '700');
    y += line.gap;
  }
}

function fmtTime(s) {
  const m = Math.floor(s / 60);
  const ss = Math.floor(s % 60);
  return m + ':' + String(ss).padStart(2, '0');
}

// ---------- main render ----------

export function render(ctx, state) {
  ctx.save();
  if (state.shake > 0) {
    ctx.translate((Math.random() - 0.5) * state.shake, (Math.random() - 0.5) * state.shake);
    state.shake = Math.max(0, state.shake - 0.5);
  }
  drawBackground(ctx);
  drawOrderBoard(ctx, state);
  for (const s of STATIONS) {
    if (s.kind === 'crate') drawCrate(ctx, s);
    else if (s.kind === 'board') drawBoard(ctx, s, state);
    else if (s.kind === 'wok') drawWok(ctx, s, state.wok[s.slot]);
    else if (s.kind === 'plate') drawPlating(ctx, s, state);
    else if (s.kind === 'serve') drawServe(ctx, s);
    else if (s.kind === 'trash') drawTrash(ctx, s);
  }
  // Particles (steam, chop bits).
  for (const p of state.particles) {
    ctx.globalAlpha = Math.max(0, p.life);
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  // Floating score texts.
  for (const f of state.floaters) {
    ctx.globalAlpha = Math.max(0, Math.min(1, f.life));
    text(ctx, f.text, f.x, f.y, 20, f.color);
  }
  ctx.globalAlpha = 1;
  drawCook(ctx, state);
  drawHud(ctx, state);
  drawToast(ctx, state);
  ctx.restore();

  if (state.screen === 'title') {
    drawCenterPanel(ctx, [
      { text: 'WARUNG KILAT', size: 52, color: '#d9382b', gap: 62 },
      { text: 'Dapur jalanan paling sibuk sedunia', size: 18, color: '#5d4037', gap: 34 },
      { text: 'Ambil bahan • potong • masak • rakit • sajikan', size: 16, color: '#333333', gap: 30 },
      { text: 'Jangan biarkan pesanan hangus — 3 hati saja!', size: 16, color: '#333333', gap: 44 },
      { text: 'Tekan ENTER atau klik untuk mulai', size: 20, color: '#2e7d32', gap: 40 },
      { text: 'WASD / panah gerak  •  E pakai stasiun  •  klik stasiun untuk jalan ke sana', size: 13, color: '#8a6a45', gap: 0 },
    ]);
  } else if (state.paused) {
    drawCenterPanel(ctx, [
      { text: 'JEDA', size: 44, color: '#333333', gap: 56 },
      { text: 'Dapur sedang istirahat sebentar.', size: 17, color: '#5d4037', gap: 40 },
      { text: 'Tekan P untuk lanjut', size: 19, color: '#2e7d32', gap: 0 },
    ]);
  } else if (state.screen === 'dayEnd') {
    drawCenterPanel(ctx, [
      { text: 'HARI ' + state.day + ' SELESAI!', size: 40, color: '#2e7d32', gap: 52 },
      { text: state.servedToday + ' pesanan tersaji  •  skor ' + state.score, size: 19, color: '#333333', gap: 36 },
      { text: 'Besok pesanan datang lebih cepat dan sabar lebih pendek.', size: 16, color: '#5d4037', gap: 48 },
      { text: 'Tekan ENTER untuk hari berikutnya', size: 20, color: '#d9382b', gap: 0 },
    ]);
  } else if (state.screen === 'gameOver') {
    drawCenterPanel(ctx, [
      { text: 'DAPUR TUTUP', size: 44, color: '#a11f16', gap: 52 },
      { text: 'Tiga pesanan hangus — pelanggan pulang.', size: 18, color: '#333333', gap: 36 },
      { text: 'Skor akhir: ' + state.score + '  •  ' + state.servedTotal + ' pesanan tersaji', size: 19, color: '#333333', gap: 34 },
      { text: 'Kombo terbaik: x' + (1 + Math.min(state.bestCombo, 10) * 0.1).toFixed(1), size: 16, color: '#5d4037', gap: 48 },
      { text: 'Tekan R untuk buka warung lagi', size: 20, color: '#2e7d32', gap: 0 },
    ]);
  }
}

export { fmtTime };
