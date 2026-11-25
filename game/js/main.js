// Warung Kilat — main.js
// One job: boot the game and run the loop. Wires input to the kitchen,
// advances orders and the day clock, and hands every frame to render.js.

import { createGameState, startDay, endDayBonus, showMessage } from './state.js';
import { createInput } from './input.js';
import { createAudio } from './audio.js';
import { moveCook, stopCook } from './cook.js';
import { nearestStation, interact, updateKitchen, applyExpired, stationById, STATIONS } from './kitchen.js';
import { updateOrders } from './orders.js';
import { render } from './render.js';
import { applyShot, shotFromLocation } from './demo.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

function fitCanvas() {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = 1280 * dpr;
  canvas.height = 720 * dpr;
  // Draw in 1280x720 logical units; the backing store is denser on HiDPI.
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

const state = createGameState();
const input = createInput(canvas);
const audio = createAudio();
audio.setMuted(state.muted);

// Demo / screenshot mode: freeze a mid-service scene, never advance time.
const shot = shotFromLocation(window.location.search);
if (shot) {
  applyShot(state, shot);
  fitCanvas();
  render(ctx, state);
} else {
  fitCanvas();
  window.addEventListener('resize', fitCanvas);
  requestAnimationFrame(loop);
}

let last = performance.now();

function stationAtPoint(x, y) {
  for (const s of STATIONS) {
    if (x >= s.x - 6 && x <= s.x + s.w + 6 && y >= s.y - 6 && y <= s.y + s.h + 6) return s;
  }
  return null;
}

function loop(now) {
  requestAnimationFrame(loop);
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  if (state.frozen) {
    render(ctx, state);
    return;
  }
  state.time += dt;

  // Global keys: pause, mute, restart, start.
  if (input.anyKey) {
    audio.unlock();
    input.anyKey = false;
  }

  if (state.screen === 'title') {
    if (input.interactTap || input.click) {
      audio.play('click');
      startDay(state, 1);
    }
    input.interactTap = false;
    input.click = null;
    render(ctx, state);
    return;
  }

  if (state.screen === 'dayEnd') {
    if (input.interactTap || input.click) {
      audio.play('click');
      startDay(state, state.day + 1);
      showMessage(state, 'Hari ' + state.day + ' — pesanan makin cepat!', 'info');
    }
    input.interactTap = false;
    input.click = null;
    render(ctx, state);
    return;
  }

  if (state.screen === 'gameOver') {
    if (input.interactTap || input.click) {
      audio.play('click');
      const fresh = createGameState();
      Object.assign(state, fresh);
      state.screen = 'title';
    }
    input.interactTap = false;
    input.click = null;
    render(ctx, state);
    return;
  }

  // Playing.
  if (state.paused) {
    render(ctx, state);
    return;
  }

  // Click: walk to a station (and interact on arrival) or just walk there.
  if (input.click) {
    const hit = stationAtPoint(input.click.x, input.click.y);
    if (hit) {
      state.cook.targetX = hit.ax;
      state.cook.targetY = hit.ay;
      state.pendingStation = hit.id;
    } else {
      state.cook.targetX = input.click.x;
      state.cook.targetY = input.click.y;
      state.pendingStation = null;
    }
    input.click = null;
  }

  // Arrived at a clicked station: interact once.
  if (state.pendingStation) {
    const s = stationById(state.pendingStation);
    if (s) {
      const d = Math.hypot(state.cook.x - s.ax, state.cook.y - s.ay);
      if (d < 26) {
        state.pendingStation = null;
        stopCook(state.cook);
        interact(state, (n) => audio.play(n));
      }
    } else {
      state.pendingStation = null;
    }
  }

  // Keyboard movement (cancels a click target).
  if (input.keys.up || input.keys.down || input.keys.left || input.keys.right) {
    state.cook.targetX = null;
    state.cook.targetY = null;
    state.pendingStation = null;
  }
  moveCook(state.cook, dt, input.keys);

  // Interact tap.
  if (input.interactTap) {
    input.interactTap = false;
    interact(state, (n) => audio.play(n));
  }

  // Hold-to-chop and wok cooking.
  state.nearStation = nearestStation(state);
  updateKitchen(state, dt, input.interactHeld, (n) => audio.play(n));

  // Orders and the day clock.
  const expired = updateOrders(state.board, dt, state.day, Math.random);
  if (expired.length > 0) applyExpired(state, expired, (n) => audio.play(n));
  state.dayTimeLeft -= dt;
  if (state.dayTimeLeft <= 0) {
    state.dayTimeLeft = 0;
    const bonus = endDayBonus(state);
    audio.play('dayEnd');
    showMessage(state, 'Hari selesai! Bonus ' + bonus, 'good');
    state.screen = 'dayEnd';
  }

  // Particles and floaters.
  for (const p of state.particles) {
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.life -= dt;
  }
  state.particles = state.particles.filter((p) => p.life > 0);
  for (const f of state.floaters) {
    f.y -= 34 * dt;
    f.life -= dt;
  }
  state.floaters = state.floaters.filter((f) => f.life > 0);

  render(ctx, state);
}

// Pause / mute / restart keys live outside the loop's input state.
window.addEventListener('keydown', (e) => {
  if (e.code === 'KeyP' && state.screen === 'playing') {
    state.paused = !state.paused;
    audio.play('click');
  }
  if (e.code === 'KeyM') {
    state.muted = !state.muted;
    audio.setMuted(state.muted);
  }
  if (e.code === 'KeyR' && (state.screen === 'playing' || state.screen === 'gameOver')) {
    const fresh = createGameState();
    Object.assign(state, fresh);
    state.screen = 'title';
    audio.play('click');
  }
  if (e.code === 'Enter' && state.screen === 'title') {
    audio.unlock();
    audio.play('click');
    startDay(state, 1);
  }
  if (e.code === 'Enter' && state.screen === 'dayEnd') {
    audio.play('click');
    startDay(state, state.day + 1);
  }
});
