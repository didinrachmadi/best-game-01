// All sound is synthesized with WebAudio: no audio files, no network. Effects are
// short oscillator and noise envelopes; the music is a slow pad with sparse plucked
// notes on a pentatonic scale. Everything no-ops until unlock() runs from a user
// gesture, and M toggles mute.

const PENTA = [220, 261.63, 293.66, 329.63, 392, 440];

export function createAudio() {
  let ctx = null;
  let master = null;
  let musicBus = null;
  let noiseBuffer = null;
  let musicTimer = null;
  let nextNoteAt = 0;
  let muted = false;

  function tone({ freq, freqEnd = null, type = 'sine', dur = 0.15, vol = 0.2, when = 0, attack = 0.005 }) {
    if (!ctx) return;
    const t0 = ctx.currentTime + when;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (freqEnd !== null) osc.frequency.exponentialRampToValueAtTime(Math.max(1, freqEnd), t0 + dur);
    gain.gain.setValueAtTime(0, t0);
    gain.gain.linearRampToValueAtTime(vol, t0 + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain).connect(master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }

  function noise({ dur = 0.15, vol = 0.2, freq = 1200, when = 0 }) {
    if (!ctx) return;
    const t0 = ctx.currentTime + when;
    const src = ctx.createBufferSource();
    src.buffer = noiseBuffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(freq, t0);
    filter.frequency.exponentialRampToValueAtTime(Math.max(40, freq * 0.2), t0 + dur);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(vol, t0);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(filter).connect(gain).connect(master);
    src.start(t0);
    src.stop(t0 + dur + 0.05);
  }

  function startPad() {
    const padGain = ctx.createGain();
    padGain.gain.value = 0.05;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 420;
    padGain.connect(filter).connect(musicBus);
    for (const [freq, detune] of [[110, -4], [110, 5], [164.81, 0]]) {
      const osc = ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.value = freq;
      osc.detune.value = detune;
      osc.connect(padGain);
      osc.start();
    }
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.07;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 160;
    lfo.connect(lfoGain).connect(filter.frequency);
    lfo.start();
  }

  function schedulePlucks() {
    // A sparse, wandering melody: one soft pluck every 1.5-3.5 seconds.
    if (!ctx) return;
    const now = ctx.currentTime;
    if (nextNoteAt < now + 0.6) {
      const freq = PENTA[Math.floor(Math.random() * PENTA.length)] * (Math.random() < 0.25 ? 2 : 1);
      const t0 = Math.max(nextNoteAt, now + 0.05);
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = freq;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0, t0);
      gain.gain.linearRampToValueAtTime(0.09, t0 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 1.6);
      osc.connect(gain).connect(musicBus);
      osc.start(t0);
      osc.stop(t0 + 1.7);
      nextNoteAt = t0 + 1.5 + Math.random() * 2;
    }
  }

  return {
    /** Create the context from a user gesture. Safe to call repeatedly. */
    unlock() {
      if (ctx) {
        if (ctx.state === 'suspended') ctx.resume();
        return;
      }
      try {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        ctx = new AC();
        master = ctx.createGain();
        master.gain.value = muted ? 0 : 0.9;
        master.connect(ctx.destination);
        musicBus = ctx.createGain();
        musicBus.gain.value = 0.8;
        musicBus.connect(master);
        noiseBuffer = ctx.createBuffer(1, ctx.sampleRate * 0.3, ctx.sampleRate);
        const data = noiseBuffer.getChannelData(0);
        for (let i = 0; i < data.length; i += 1) data[i] = Math.random() * 2 - 1;
        startPad();
        nextNoteAt = ctx.currentTime + 1;
        musicTimer = window.setInterval(schedulePlucks, 400);
      } catch {
        ctx = null;
      }
    },
    setMuted(value) {
      muted = value;
      if (master && ctx) master.gain.setTargetAtTime(muted ? 0 : 0.9, ctx.currentTime, 0.02);
    },
    isMuted() {
      return muted;
    },
    click() { tone({ freq: 660, freqEnd: 880, type: 'sine', dur: 0.07, vol: 0.12 }); },
    shoot() { tone({ freq: 740, freqEnd: 340, type: 'square', dur: 0.07, vol: 0.05 }); },
    hit() { noise({ dur: 0.06, vol: 0.1, freq: 2600 }); },
    kill() {
      tone({ freq: 300, freqEnd: 82, type: 'triangle', dur: 0.18, vol: 0.16 });
      noise({ dur: 0.14, vol: 0.1, freq: 900 });
    },
    pickup() { tone({ freq: 880, freqEnd: 1320, type: 'sine', dur: 0.09, vol: 0.1 }); },
    heart() {
      tone({ freq: 523, type: 'sine', dur: 0.12, vol: 0.12 });
      tone({ freq: 784, type: 'sine', dur: 0.18, vol: 0.12, when: 0.09 });
    },
    levelup() {
      [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
        tone({ freq, type: 'sine', dur: 0.22, vol: 0.13, when: i * 0.08 });
      });
    },
    dash() { noise({ dur: 0.16, vol: 0.12, freq: 3400 }); },
    hurt() {
      tone({ freq: 170, freqEnd: 64, type: 'sawtooth', dur: 0.22, vol: 0.18 });
      noise({ dur: 0.12, vol: 0.12, freq: 500 });
    },
    nova() {
      tone({ freq: 120, freqEnd: 38, type: 'sine', dur: 0.4, vol: 0.3 });
      tone({ freq: 980, freqEnd: 1560, type: 'sine', dur: 0.25, vol: 0.06 });
    },
    elite() {
      tone({ freq: 110, type: 'sawtooth', dur: 0.5, vol: 0.12 });
      tone({ freq: 165, type: 'sawtooth', dur: 0.5, vol: 0.08 });
    },
    win() {
      [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((freq, i) => {
        tone({ freq, type: 'triangle', dur: 0.5, vol: 0.14, when: i * 0.13 });
      });
    },
    lose() {
      [392, 329.63, 261.63, 196].forEach((freq, i) => {
        tone({ freq, type: 'triangle', dur: 0.42, vol: 0.13, when: i * 0.17 });
      });
    },
    stopMusic() {
      if (musicTimer !== null) {
        window.clearInterval(musicTimer);
        musicTimer = null;
      }
    },
  };
}
