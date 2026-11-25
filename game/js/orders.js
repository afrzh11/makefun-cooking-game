// Warung Kilat — orders.js
// One job: the order board. Spawning orders, patience timers, serving and
// expiring them. Pure logic, no DOM, no canvas.

import { RECIPES } from './recipes.js';

export const MAX_ORDERS = 4;

let nextOrderId = 1;

export function makeOrder(day, rng) {
  const recipe = RECIPES[Math.floor(rng() * RECIPES.length)];
  // Patience shrinks as days pass, never below 28 seconds.
  const patienceMax = Math.max(28, 58 - (day - 1) * 5);
  return {
    id: nextOrderId++,
    recipeId: recipe.id,
    patience: patienceMax,
    patienceMax,
    state: 'waiting', // waiting | served | expired
  };
}

export function createOrderBoard() {
  return { orders: [], spawnIn: 1.5 };
}

export function spawnIntervalForDay(day) {
  // Orders arrive faster on later days, never faster than one per 7 seconds.
  return Math.max(7, 13 - (day - 1) * 1.4);
}

export function updateOrders(board, dt, day, rng) {
  board.spawnIn -= dt;
  if (board.spawnIn <= 0 && board.orders.length < MAX_ORDERS) {
    board.orders.push(makeOrder(day, rng));
    board.spawnIn = spawnIntervalForDay(day);
  }
  for (const order of board.orders) {
    if (order.state === 'waiting') {
      order.patience -= dt;
      if (order.patience <= 0) {
        order.patience = 0;
        order.state = 'expired';
      }
    }
  }
  // Expired orders are removed by the caller after it reads them.
  return board.orders.filter((o) => o.state === 'expired');
}

export function removeOrder(board, id) {
  const at = board.orders.findIndex((o) => o.id === id);
  if (at >= 0) board.orders.splice(at, 1);
}

export function findOrder(board, id) {
  return board.orders.find((o) => o.id === id) || null;
}

// Serve a finished plate: the plate's recipe must match a waiting order.
// Returns the served order or null.
export function servePlate(board, recipeId) {
  const order = board.orders.find((o) => o.state === 'waiting' && o.recipeId === recipeId);
  if (!order) return null;
  order.state = 'served';
  const patienceLeft = order.patience / order.patienceMax;
  removeOrder(board, order.id);
  return { order, patienceLeft };
}

// Fraction of patience left, for the ticket bar and the tip.
export function patienceFraction(order) {
  if (order.patienceMax <= 0) return 0;
  return Math.max(0, order.patience / order.patienceMax);
}
