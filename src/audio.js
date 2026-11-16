// Ambient sound engine.
//
// Rain plays a real recording from public/sounds/. Every other sound is
// generated live with the Web Audio API. To swap in more recordings
// (e.g. CC0 loops from freesound.org), see the README.

import { DEFAULT_VOLUMES } from './config.js';

let ctx = null;
let master = null;
const channels = {};
const volumes = { ...DEFAULT_VOLUMES };
delete volumes.master;
let masterVolume = DEFAULT_VOLUMES.master;

// Per-channel loudness balance so 100% on each slider feels similar.
const MIX = { rain: 0.9, wind: 0.7, fire: 0.9, lofi: 0.45 };

// Which rain/wind levels each weather kind should have.
const WEATHER_MIX = {
  clear: { rain: 0, wind: 0.05 },
  cloudy: { rain: 0, wind: 0.2 },
  fog: { rain: 0, wind: 0.15 },
  rain: { rain: 0.65, wind: 0.04 },
  storm: { rain: 0.9, wind: 0.25 },
  snow: { rain: 0, wind: 0.35 },
};

export const weatherMix = (kind) => WEATHER_MIX[kind] ?? WEATHER_MIX.clear;
export const isStarted = () => ctx !== null;

// Browsers only allow audio after a click, so call this from a click handler.
export function start() {
  if (ctx) return;
  ctx = new AudioContext();
  master = ctx.createGain();
  master.gain.value = masterVolume;
  master.connect(ctx.destination);

  for (const name of Object.keys(MIX)) {
    channels[name] = ctx.createGain();
    channels[name].gain.value = 0;
    channels[name].connect(master);
  }

  buildRain();
  buildWind();
  buildFire();
  buildLofi();

  for (const name of Object.keys(volumes)) setVolume(name, volumes[name]);
  ctx.resume();
}

export function setVolume(name, value) {
  volumes[name] = value;
  if (!ctx || !channels[name]) return;
  channels[name].gain.setTargetAtTime(value * MIX[name], ctx.currentTime, 0.4);
}

export function setMaster(value) {
  masterVolume = value;
  if (master) master.gain.setTargetAtTime(value, ctx.currentTime, 0.1);
}

// ─── Noise helpers ───────────────────────────────────────────────────

// Builds a seamlessly looping stereo noise buffer (white, pink or brown).
function noiseBuffer(type, seconds = 6) {
  const rate = ctx.sampleRate;
  const len = Math.floor(rate * seconds);
  const fade = Math.floor(rate * 0.5);
  const buffer = ctx.createBuffer(2, len, rate);

  for (let c = 0; c < 2; c++) {
    const raw = new Float32Array(len + fade);
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0, last = 0;
    for (let i = 0; i < raw.length; i++) {
      const w = Math.random() * 2 - 1;
      if (type === 'white') {
        raw[i] = w;
      } else if (type === 'pink') {
        b0 = 0.99886 * b0 + w * 0.0555179;
        b1 = 0.99332 * b1 + w * 0.0750759;
        b2 = 0.969 * b2 + w * 0.153852;
        b3 = 0.8665 * b3 + w * 0.3104856;
        b4 = 0.55 * b4 + w * 0.5329522;
        b5 = -0.7616 * b5 - w * 0.016898;
        raw[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11;
        b6 = w * 0.115926;
      } else {
        last = (last + 0.02 * w) / 1.02;
        raw[i] = last * 3.5;
      }
    }
    // Crossfade the tail into the head so the loop has no click.
    const out = buffer.getChannelData(c);
    for (let i = 0; i < len; i++) out[i] = raw[i];
    for (let i = 0; i < fade; i++) {
      const t = i / fade;
      out[i] = raw[i] * t + raw[len + i] * (1 - t);
    }
  }
  return buffer;
}

function loop(buffer) {
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  src.loop = true;
  src.start();
  return src;
}

function filter(type, frequency, Q = 0.7) {
  const f = ctx.createBiquadFilter();
  f.type = type;
  f.frequency.value = frequency;
  f.Q.value = Q;
  return f;
}

function gain(value) {
  const g = ctx.createGain();
  g.gain.value = value;
  return g;
}

function lfo(rate, depth, target) {
  const osc = ctx.createOscillator();
  osc.frequency.value = rate;
  const amount = gain(depth);
  osc.connect(amount).connect(target);
  osc.start();
}

// ─── Channels ────────────────────────────────────────────────────────

// A real recording: "Light Rain Distant Thunder July 5th 2016", recorded in
// deep woods in the US Midwest (CC0, Wikimedia Commons). Trimmed and normalized.
async function buildRain() {
  const data = await fetch('sounds/rain.mp3').then((r) => r.arrayBuffer());
  loop(seamless(await ctx.decodeAudioData(data))).connect(channels.rain);
}

// MP3s carry a few ms of silence at each end, which clicks when looped.
// Trim the edges and crossfade the tail into the head for a smooth loop.
function seamless(buffer, fadeSeconds = 1.5) {
  const rate = buffer.sampleRate;
  const trim = Math.floor(rate * 0.1);
  const fade = Math.floor(rate * fadeSeconds);
  const len = buffer.length - trim * 2 - fade;
  const out = ctx.createBuffer(buffer.numberOfChannels, len, rate);
  for (let c = 0; c < buffer.numberOfChannels; c++) {
    const src = buffer.getChannelData(c).subarray(trim);
    const dst = out.getChannelData(c);
    dst.set(src.subarray(0, len));
    for (let i = 0; i < fade; i++) {
      const t = i / fade;
      dst[i] = src[i] * Math.sqrt(t) + src[len + i] * Math.sqrt(1 - t);
    }
  }
  return out;
}

function buildWind() {
  const band = filter('bandpass', 450, 0.8);
  const swell = gain(0.6);
  loop(noiseBuffer('brown', 8)).connect(band).connect(swell).connect(channels.wind);
  lfo(0.06, 250, band.frequency);
  lfo(0.11, 0.35, swell.gain);
}

function buildFire() {
  loop(noiseBuffer('brown')).connect(filter('lowpass', 380)).connect(gain(0.8)).connect(channels.fire);

  // Random crackles and pops.
  const crackle = () => {
    if (volumes.fire > 0.02) {
      const t = ctx.currentTime;
      const src = ctx.createBufferSource();
      src.buffer = crackleBuffer;
      const band = filter('bandpass', 1500 + Math.random() * 3500, 1.2);
      const env = gain(0.0001);
      env.gain.setValueAtTime(0.0001, t);
      env.gain.exponentialRampToValueAtTime(0.25 + Math.random() * 0.75, t + 0.002);
      env.gain.exponentialRampToValueAtTime(0.0001, t + 0.02 + Math.random() * 0.05);
      src.connect(band).connect(env).connect(channels.fire);
      src.start(t);
      src.stop(t + 0.1);
    }
    setTimeout(crackle, 40 + Math.random() * (Math.random() < 0.25 ? 700 : 200));
  };
  const crackleBuffer = noiseBuffer('white', 0.1);
  crackle();
}

// Soft, slow lo-fi chords: Fmaj7 → Em7 → Dm7 → Cmaj7.
const CHORDS = [
  [53, 57, 60, 64],
  [52, 55, 59, 62],
  [50, 53, 57, 60],
  [48, 52, 55, 59],
];
const PENTATONIC = [72, 74, 76, 79, 81];
const midiToHz = (m) => 440 * Math.pow(2, (m - 69) / 12);

function buildLofi() {
  const tone = filter('lowpass', 1300);
  tone.connect(channels.lofi);
  const chordLength = 3.6;
  let nextTime = ctx.currentTime + 0.2;
  let index = 0;

  const note = (freq, startAt, length, type, level) => {
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.value = freq;
    osc.detune.value = (Math.random() - 0.5) * 12; // a little tape wobble
    const env = gain(0);
    env.gain.setValueAtTime(0, startAt);
    env.gain.linearRampToValueAtTime(level, startAt + 0.5);
    env.gain.setTargetAtTime(0, startAt + length - 0.6, 0.4);
    osc.connect(env).connect(tone);
    osc.start(startAt);
    osc.stop(startAt + length + 2);
  };

  // Schedule a little ahead of time so playback never stutters.
  setInterval(() => {
    while (nextTime < ctx.currentTime + 1) {
      if (volumes.lofi > 0.01) {
        const chord = CHORDS[index % CHORDS.length];
        chord.forEach((m) => note(midiToHz(m), nextTime, chordLength, 'triangle', 0.09));
        note(midiToHz(chord[0] - 12), nextTime, chordLength, 'sine', 0.18);
        if (Math.random() < 0.7) {
          const m = PENTATONIC[Math.floor(Math.random() * PENTATONIC.length)];
          note(midiToHz(m), nextTime + 0.9 + Math.random(), 1.4, 'sine', 0.06);
        }
      }
      index++;
      nextTime += chordLength;
    }
  }, 250);
}

// ─── One-shots ───────────────────────────────────────────────────────

export function thunder() {
  if (!ctx) return;
  const t = ctx.currentTime;
  const level = 0.5 + Math.max(volumes.rain, 0.2) * 0.6;

  // The initial crack.
  const crack = ctx.createBufferSource();
  crack.buffer = noiseBuffer('white', 0.5);
  const crackEnv = gain(0);
  crackEnv.gain.setValueAtTime(level * 0.35, t);
  crackEnv.gain.exponentialRampToValueAtTime(0.0001, t + 0.45);
  crack.connect(filter('lowpass', 2500)).connect(crackEnv).connect(master);
  crack.start(t);

  // The long rumble.
  const rumble = ctx.createBufferSource();
  rumble.buffer = noiseBuffer('brown', 6);
  rumble.playbackRate.value = 0.8 + Math.random() * 0.3;
  const low = filter('lowpass', 420);
  low.frequency.setValueAtTime(420, t);
  low.frequency.exponentialRampToValueAtTime(110, t + 5);
  const env = gain(0);
  env.gain.setValueAtTime(0.0001, t);
  env.gain.exponentialRampToValueAtTime(level * 1.6, t + 0.2);
  env.gain.exponentialRampToValueAtTime(0.0001, t + 5.5);
  rumble.connect(low).connect(env).connect(master);
  rumble.start(t);
  rumble.stop(t + 6);
}

export function click() {
  if (!ctx) return;
  const t = ctx.currentTime;
  const osc = ctx.createOscillator();
  osc.type = 'square';
  osc.frequency.setValueAtTime(1800, t);
  osc.frequency.exponentialRampToValueAtTime(600, t + 0.03);
  const env = gain(0.06);
  env.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
  osc.connect(env).connect(master);
  osc.start(t);
  osc.stop(t + 0.06);
}
