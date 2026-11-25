// Warung Kilat — state.js
// One job: the single game state object and the rules that change it
// (score, coins, combo, hearts, day timer, day progression).

import { createOrderBoard } from './orders.js';

export const DAY_LENGTH = 150; // seconds of service per day
export const MAX_HEARTS = 3;
export const CARRY_LIMIT = 3;

export function createGameState() {
  return {
    screen: 'title', // title | playing | dayEnd | gameOver
    paused: false,
    muted: false,
    frozen: false, // demo/shot mode: render a fixed scene, never advance time
    time: 0,
    day: 1,
    dayTimeLeft: DAY_LENGTH,
    score: 0,
    coins: 0,
    combo: 0,
    bestCombo: 0,
    servedToday: 0,
    servedTotal: 0,
    hearts: MAX_HEARTS,
    dayTarget: 300, // coins to earn to clear the day with a smile
    message: '',
    messageAt: 0,
    messageKind: 'info',
    cook: {
      x: 640, y: 420, r: 20, speed: 270,
      dirX: 0, dirY: 1, moving: false,
      carrying: [], // items or { plate: recipeId }
      targetX: null, targetY: null,
      chopHeld: 0,
    },
    board: createOrderBoard(),
    wok: [
      { item: null, progress: 0, burnAt: 9 },
      { item: null, progress: 0, burnAt: 9 },
    ],
    chopping: { item: null, progress: 0 },
    plates: [], // finished plates waiting on the plating counter: recipeIds
    particles: [],
    floaters: [], // rising "+120" texts
    shake: 0,
  };
}

export function showMessage(state, text, kind) {
  state.message = text;
  state.messageAt = state.time;
  state.messageKind = kind || 'info';
}

export function messageVisible(state) {
  return state.message !== '' && state.time - state.messageAt < 2.2;
}

// Score a served dish. Tip grows with patience left; combo multiplies.
export function awardServe(state, recipe, patienceLeft) {
  const tip = Math.round(40 * patienceLeft);
  const comboMult = 1 + Math.min(state.combo, 10) * 0.1;
  const earned = Math.round((recipe.price + tip) * comboMult);
  state.score += earned;
  state.coins += earned;
  state.combo += 1;
  state.bestCombo = Math.max(state.bestCombo, state.combo);
  state.servedToday += 1;
  state.servedTotal += 1;
  return earned;
}

export function breakCombo(state) {
  state.combo = 0;
}

export function loseHeart(state) {
  state.hearts -= 1;
  breakCombo(state);
  if (state.hearts <= 0) {
    state.screen = 'gameOver';
  }
}

export function startDay(state, day) {
  state.day = day;
  state.dayTimeLeft = DAY_LENGTH;
  state.servedToday = 0;
  state.coins = 0;
  state.hearts = MAX_HEARTS;
  state.combo = 0;
  state.dayTarget = 300 + (day - 1) * 150;
  state.board = createOrderBoard();
  state.wok = [
    { item: null, progress: 0, burnAt: 9 },
    { item: null, progress: 0, burnAt: 9 },
  ];
  state.chopping = { item: null, progress: 0 };
  state.plates = [];
  state.cook.x = 640;
  state.cook.y = 420;
  state.cook.carrying = [];
  state.screen = 'playing';
}

export function endDayBonus(state) {
  // Clearing the day pays a bonus for every heart still standing.
  const bonus = state.hearts * 50 + Math.max(0, state.coins - state.dayTarget);
  state.score += bonus;
  return bonus;
}
