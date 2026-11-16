// Tiny shared state + event bus so the Phaser scene and the HTML UI
// can talk to each other without knowing about each other.

export const state = {
  weather: 'clear', // what the window currently shows
  weatherMode: 'live', // 'live' or a fixed kind
  liveWeather: null, // { kind, temp } from Open-Meteo
  phase: 'day', // dawn | day | dusk | night
  timeMode: 'live', // 'live' or a fixed phase
  lamp: true,
};

const listeners = {};

export function on(event, fn) {
  (listeners[event] ||= []).push(fn);
}

export function emit(event, data) {
  (listeners[event] || []).forEach((fn) => fn(data));
}
