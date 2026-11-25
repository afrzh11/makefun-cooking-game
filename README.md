# Warung Kilat

[![make.fun](https://make.fun/badge/best-cooking-game-20261125-0137.svg)](https://make.fun/bounty/best-cooking-game-20261125-0137)
[![make.fun rank](https://make.fun/badge/best-cooking-game-20261125-0137/afrzh11/makefun-cooking-game/rank.svg)](https://make.fun/bounty/best-cooking-game-20261125-0137)
[![make.fun reward](https://make.fun/badge/best-cooking-game-20261125-0137/afrzh11/makefun-cooking-game/reward.svg)](https://make.fun/bounty/best-cooking-game-20261125-0137)

**Warung Kilat** — the busiest street kitchen in town. A complete, original
cooking game that plays offline in a desktop browser from its own files.

## How to play

Customers order from the board at the top. Run the kitchen:

1. **Grab** ingredients from the crates on the left (Nasi, Mie, Ayam, Telur,
   Sayur, Sambal, Kerupuk).
2. **Chop** ayam and sayur on the talenan — hold E.
3. **Cook** mie, ayam and telur in the wajan — watch the pan, a dish left
   too long burns.
4. **Plate** the finished recipe at Meja Plating (E with the full recipe).
5. **Serve** the plate at Jendela Saji before the order's patience runs out.

Serve in a streak to build a combo multiplier. An expired order costs one
of your three hearts. Each day lasts 2:30 — clear the coin target, then the
next day brings faster orders and shorter patience.

- **Move:** WASD / arrow keys, or click anywhere to walk there
- **Use a station:** E or Space (hold E to chop), or click a station
- **Pause:** P — **Mute:** M — **Restart:** R

## Recipes

| Dish | Needs | Price |
| --- | --- | --- |
| Nasi Goreng | Nasi + telur goreng + sambal | 80 |
| Ayam Geprek | Ayam goreng + sambal + kerupuk | 110 |
| Mie Goreng | Mie rebus + telur goreng + sayur potong | 100 |
| Nasi Ayam | Nasi + ayam goreng + kerupuk | 90 |
| Telur Dadar | Telur goreng + sayur potong + sambal | 70 |

Tips grow with the patience left on the ticket. All art is drawn in code,
all sound is synthesised with WebAudio — no images, no audio files, no
network anywhere.

## Play it

```sh
node serve.ts
# open http://localhost:8080
```

Screenshot scenes: `?shot=cover`, `?shot=chop`, `?shot=serve`, `?shot=rush`
(or `?demo=1` for the cover) open the game frozen mid-service.

## Layout

- `game/index.html` — page shell, loads the game
- `game/css/style.css` — page styling
- `game/js/main.js` — boot and game loop
- `game/js/state.js` — score, combo, hearts, day rules
- `game/js/recipes.js` — ingredients and the five dishes
- `game/js/orders.js` — the order board
- `game/js/kitchen.js` — station layout and interactions
- `game/js/cook.js` — movement and carrying
- `game/js/render.js` — all canvas drawing
- `game/js/audio.js` — synthesised sound
- `game/js/input.js` — keyboard and mouse
- `game/js/demo.js` — deterministic screenshot scenes
- `main.ts` — hands the game in to make.fun

Built for the [best cooking game bounty](https://make.fun/bounty/best-cooking-game-20261125-0137)
on make.fun. Original idea, names, art and sounds — no commercial game was
copied.
