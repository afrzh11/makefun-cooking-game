// Warung Kilat — audio.js
// One job: all sound, synthesised with WebAudio. No audio files, no
// network. Every effect is a short oscillator blip so it stays tiny.

export function createAudio() {
  let ctx = null;
  let muted = false;

  function ensure() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function tone(freq, dur, type, vol, slideTo) {
    if (muted) return;
    const ac = ensure();
    if (!ac) return;
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = type || 'sine';
    osc.frequency.setValueAtTime(freq, ac.currentTime);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, ac.currentTime + dur);
    gain.gain.setValueAtTime(vol || 0.12, ac.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + dur);
    osc.connect(gain);
    gain.connect(ac.destination);
    osc.start();
    osc.stop(ac.currentTime + dur + 0.02);
  }

  const sounds = {
    pickup() { tone(520, 0.09, 'triangle', 0.12, 760); },
    place() { tone(300, 0.08, 'triangle', 0.1, 220); },
    chop() { tone(190, 0.05, 'square', 0.06); },
    chopDone() { tone(660, 0.1, 'triangle', 0.12); tone(880, 0.12, 'triangle', 0.1); },
    ding() { tone(1180, 0.16, 'sine', 0.12); tone(1560, 0.2, 'sine', 0.08); },
    serve() { tone(660, 0.1, 'triangle', 0.12); tone(880, 0.1, 'triangle', 0.12); tone(1320, 0.22, 'sine', 0.12); },
    wrong() { tone(180, 0.16, 'sawtooth', 0.08, 120); },
    expire() { tone(320, 0.3, 'sawtooth', 0.1, 140); },
    burn() { tone(140, 0.35, 'sawtooth', 0.1, 90); },
    trash() { tone(240, 0.12, 'triangle', 0.09, 130); },
    click() { tone(700, 0.05, 'triangle', 0.08); },
    dayEnd() { tone(523, 0.12, 'triangle', 0.12); tone(659, 0.12, 'triangle', 0.12); tone(784, 0.24, 'triangle', 0.12); },
    gameOver() { tone(392, 0.2, 'triangle', 0.11); tone(330, 0.2, 'triangle', 0.11); tone(262, 0.4, 'triangle', 0.11); },
  };

  return {
    play(name) {
      const fn = sounds[name];
      if (fn) fn();
    },
    setMuted(m) { muted = m; },
    isMuted() { return muted; },
    unlock() { ensure(); },
  };
}
