// Warung Kilat — cook.js
// One job: the cook. Keyboard movement, click-to-move, and carrying.

import { FLOOR } from './kitchen.js';

export function createCook() {
  return {
    x: 640, y: 420, r: 20, speed: 270,
    dirX: 0, dirY: 1, moving: false,
    carrying: [],
    targetX: null, targetY: null,
    chopHeld: 0,
  };
}

// Move the cook one frame. keys: {up,down,left,right} booleans.
// A click target overrides keys until reached.
export function moveCook(cook, dt, keys) {
  let vx = 0;
  let vy = 0;
  if (cook.targetX !== null && cook.targetY !== null) {
    const dx = cook.targetX - cook.x;
    const dy = cook.targetY - cook.y;
    const d = Math.hypot(dx, dy);
    if (d < 8) {
      cook.targetX = null;
      cook.targetY = null;
    } else {
      vx = dx / d;
      vy = dy / d;
    }
  } else {
    if (keys.left) vx -= 1;
    if (keys.right) vx += 1;
    if (keys.up) vy -= 1;
    if (keys.down) vy += 1;
    const len = Math.hypot(vx, vy);
    if (len > 0) {
      vx /= len;
      vy /= len;
    }
  }
  cook.moving = vx !== 0 || vy !== 0;
  if (cook.moving) {
    cook.dirX = vx;
    cook.dirY = vy;
  }
  cook.x += vx * cook.speed * dt;
  cook.y += vy * cook.speed * dt;
  // Stay on the open floor.
  cook.x = Math.max(FLOOR.x + cook.r, Math.min(FLOOR.x + FLOOR.w - cook.r, cook.x));
  cook.y = Math.max(FLOOR.y + cook.r, Math.min(FLOOR.y + FLOOR.h - cook.r, cook.y));
}

// Walk toward a station's approach point; returns true when arrived.
export function walkTo(cook, ax, ay, dt, keys) {
  cook.targetX = ax;
  cook.targetY = ay;
  moveCook(cook, dt, keys);
  return cook.targetX === null;
}

export function stopCook(cook) {
  cook.targetX = null;
  cook.targetY = null;
}
