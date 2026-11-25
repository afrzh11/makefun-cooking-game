// Warung Kilat — input.js
// One job: keyboard and mouse. Turns raw events into a small state the
// game loop reads: movement keys, interact taps and holds, clicks.

export function createInput(canvas) {
  const input = {
    keys: { up: false, down: false, left: false, right: false },
    interactHeld: false,
    interactTap: false, // set on keydown, consumed by the loop
    click: null, // { x, y } in canvas pixels, consumed by the loop
    anyKey: false,
  };

  const KEYMAP = {
    ArrowUp: 'up', KeyW: 'up',
    ArrowDown: 'down', KeyS: 'down',
    ArrowLeft: 'left', KeyA: 'left',
    ArrowRight: 'right', KeyD: 'right',
  };

  window.addEventListener('keydown', (e) => {
    input.anyKey = true;
    const dir = KEYMAP[e.code];
    if (dir) {
      input.keys[dir] = true;
      e.preventDefault();
      return;
    }
    if (e.code === 'KeyE' || e.code === 'Space') {
      if (!input.interactHeld) input.interactTap = true;
      input.interactHeld = true;
      e.preventDefault();
    }
  });

  window.addEventListener('keyup', (e) => {
    const dir = KEYMAP[e.code];
    if (dir) input.keys[dir] = false;
    if (e.code === 'KeyE' || e.code === 'Space') input.interactHeld = false;
  });

  // Keep keys from sticking when the window loses focus.
  window.addEventListener('blur', () => {
    input.keys = { up: false, down: false, left: false, right: false };
    input.interactHeld = false;
  });

  canvas.addEventListener('pointerdown', (e) => {
    input.anyKey = true;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (canvas.width / rect.width);
    const y = (e.clientY - rect.top) * (canvas.height / rect.height);
    input.click = { x, y };
  });

  return input;
}
