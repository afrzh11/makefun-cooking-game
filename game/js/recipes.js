// Warung Kilat — recipes.js
// One job: the ingredients, how each one must be prepared, and the five
// dishes customers can order. Pure data and pure helpers, no DOM, no canvas,
// so this file can be tested on its own in Node.

export const INGREDIENTS = {
  nasi:    { id: 'nasi',    name: 'Nasi',    color: '#f5f0dc', dark: '#d8cfae', needsChop: false, needsCook: false, label: 'Nasi' },
  mie:     { id: 'mie',     name: 'Mie',     color: '#f7c948', dark: '#d9a521', needsChop: false, needsCook: true,  label: 'Mie' },
  ayam:    { id: 'ayam',    name: 'Ayam',    color: '#e8a06a', dark: '#c47a3e', needsChop: true,  needsCook: true,  label: 'Ayam' },
  telur:   { id: 'telur',   name: 'Telur',   color: '#fff3c4', dark: '#e8c96a', needsChop: false, needsCook: true,  label: 'Telur' },
  sayur:   { id: 'sayur',   name: 'Sayur',   color: '#7dc383', dark: '#4d9a55', needsChop: true,  needsCook: false, label: 'Sayur' },
  sambal:  { id: 'sambal',  name: 'Sambal',  color: '#d9382b', dark: '#a11f16', needsChop: false, needsCook: false, label: 'Sambal' },
  kerupuk: { id: 'kerupuk', name: 'Kerupuk', color: '#f2a7c3', dark: '#d67ba0', needsChop: false, needsCook: false, label: 'Kerupuk' },
};

export const INGREDIENT_ORDER = ['nasi', 'mie', 'ayam', 'telur', 'sayur', 'sambal', 'kerupuk'];

// A carried item: { base, chopped, cooked, burnt }
export function freshItem(base) {
  return { base, chopped: false, cooked: false, burnt: false };
}

export function itemIsReady(item) {
  const def = INGREDIENTS[item.base];
  if (!def) return false;
  if (item.burnt) return false;
  if (def.needsChop && !item.chopped) return false;
  if (def.needsCook && !item.cooked) return false;
  return true;
}

// Short human label for a carried item, e.g. "Ayam potong" or "Mie rebus".
export function itemLabel(item) {
  const def = INGREDIENTS[item.base];
  if (!def) return '?';
  if (item.burnt) return def.name + ' gosong';
  if (def.needsChop && def.needsCook) {
    if (item.chopped && item.cooked) return def.name + ' goreng';
    if (item.chopped) return def.name + ' potong';
    return def.name;
  }
  if (def.needsChop) return item.chopped ? def.name + ' potong' : def.name;
  if (def.needsCook) return item.cooked ? def.name + ' matang' : def.name;
  return def.name;
}

// A recipe need: { base, chopped, cooked }
function need(base, chopped, cooked) {
  return { base, chopped, cooked };
}

export const RECIPES = [
  {
    id: 'nasi_goreng', name: 'Nasi Goreng', price: 80, color: '#e8b64c',
    needs: [need('nasi', false, false), need('telur', false, true), need('sambal', false, false)],
    blurb: 'Nasi + telur goreng + sambal',
  },
  {
    id: 'ayam_geprek', name: 'Ayam Geprek', price: 110, color: '#d9382b',
    needs: [need('ayam', true, true), need('sambal', false, false), need('kerupuk', false, false)],
    blurb: 'Ayam goreng + sambal + kerupuk',
  },
  {
    id: 'mie_goreng', name: 'Mie Goreng', price: 100, color: '#f7c948',
    needs: [need('mie', false, true), need('telur', false, true), need('sayur', true, false)],
    blurb: 'Mie rebus + telur + sayur',
  },
  {
    id: 'nasi_ayam', name: 'Nasi Ayam', price: 90, color: '#e8a06a',
    needs: [need('nasi', false, false), need('ayam', true, true), need('kerupuk', false, false)],
    blurb: 'Nasi + ayam goreng + kerupuk',
  },
  {
    id: 'telur_dadar', name: 'Telur Dadar', price: 70, color: '#fff3c4',
    needs: [need('telur', false, true), need('sayur', true, false), need('sambal', false, false)],
    blurb: 'Telur goreng + sayur + sambal',
  },
];

export function recipeById(id) {
  return RECIPES.find((r) => r.id === id) || null;
}

// Does a carried item satisfy one recipe need?
export function itemMatchesNeed(item, nd) {
  if (item.base !== nd.base) return false;
  if (item.burnt) return false;
  if (nd.chopped && !item.chopped) return false;
  if (nd.cooked && !item.cooked) return false;
  return true;
}

// Do the carried items (a multiset) exactly fill a recipe's needs?
export function carriedFillsRecipe(carried, recipe) {
  if (carried.length !== recipe.needs.length) return false;
  const used = new Array(carried.length).fill(false);
  for (const nd of recipe.needs) {
    let found = false;
    for (let i = 0; i < carried.length; i++) {
      if (!used[i] && itemMatchesNeed(carried[i], nd)) {
        used[i] = true;
        found = true;
        break;
      }
    }
    if (!found) return false;
  }
  return true;
}

// Which open orders could these carried items complete? Returns recipe ids.
export function matchingRecipes(carried) {
  return RECIPES.filter((r) => carriedFillsRecipe(carried, r)).map((r) => r.id);
}

// How many of a recipe's needs are already covered by carried items (for hints)?
export function recipeProgress(carried, recipe) {
  const used = new Array(carried.length).fill(false);
  let done = 0;
  for (const nd of recipe.needs) {
    for (let i = 0; i < carried.length; i++) {
      if (!used[i] && itemMatchesNeed(carried[i], nd)) {
        used[i] = true;
        done++;
        break;
      }
    }
  }
  return done;
}
