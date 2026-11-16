import Phaser from 'phaser';
import './style.css';
import { RoomScene } from './scenes/RoomScene.js';
import { state, on, emit } from './state.js';
import * as audio from './audio.js';
import { fetchWeather, phaseForHour, KIND_LABEL } from './weather.js';
import { DEFAULT_LOCATION, DEFAULT_VOLUMES, WEATHER_REFRESH_MINUTES } from './config.js';

const $ = (selector) => document.querySelector(selector);

// ─── Time of day ─────────────────────────────────────────────────────

function currentPhase() {
  if (state.timeMode !== 'live') return state.timeMode;
  const now = new Date();
  return phaseForHour(now.getHours() + now.getMinutes() / 60);
}

function refreshPhase() {
  const phase = currentPhase();
  if (phase !== state.phase) {
    state.phase = phase;
    emit('phase', phase);
  }
}

// ─── Weather ─────────────────────────────────────────────────────────

let place = loadSavedPlace() ?? DEFAULT_LOCATION;

function loadSavedPlace() {
  try {
    return JSON.parse(localStorage.getItem('psc-location'));
  } catch {
    return null;
  }
}

async function refreshLiveWeather() {
  try {
    state.liveWeather = await fetchWeather(place.lat, place.lon);
  } catch (err) {
    console.warn(err);
    state.liveWeather = null;
  }
  applyWeather();
}

function applyWeather() {
  const kind = state.weatherMode === 'live' ? (state.liveWeather?.kind ?? 'clear') : state.weatherMode;
  if (kind !== state.weather) {
    state.weather = kind;
    emit('weather', kind);
  }
  if ($('#match-weather').checked) matchSoundsToWeather();
  updateStatus();
}

function updateStatus() {
  const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const parts = [time, KIND_LABEL[state.weather]];
  if (state.weatherMode === 'live') {
    if (state.liveWeather) parts.push(`${state.liveWeather.temp}°C`, place.name);
    else parts.push('live weather unavailable');
  } else {
    parts.push('manual');
  }
  $('#status').textContent = parts.join(' · ');
}

$('#weather-mode').addEventListener('change', (e) => {
  state.weatherMode = e.target.value;
  applyWeather();
});

$('#time-mode').addEventListener('change', (e) => {
  state.timeMode = e.target.value;
  refreshPhase();
});

$('#use-location').addEventListener('click', () => {
  const note = $('#location-note');
  if (!navigator.geolocation) {
    note.textContent = 'Your browser does not support location.';
    return;
  }
  note.textContent = 'Finding you…';
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      // Rounded to ~1 km: plenty for weather, kinder for privacy.
      place = {
        name: 'your location',
        lat: Number(pos.coords.latitude.toFixed(2)),
        lon: Number(pos.coords.longitude.toFixed(2)),
      };
      localStorage.setItem('psc-location', JSON.stringify(place));
      note.textContent = 'Using your location.';
      refreshLiveWeather();
    },
    () => {
      note.textContent = `Couldn't get your location, so using ${place.name}.`;
    },
    { timeout: 10000 },
  );
});

// ─── Sound ───────────────────────────────────────────────────────────

const CHANNELS = ['rain', 'wind', 'fire', 'lofi'];
const slider = (name) => $(`#vol-${name}`);

for (const name of ['master', ...CHANNELS]) slider(name).value = Math.round(DEFAULT_VOLUMES[name] * 100);

function matchSoundsToWeather() {
  const mix = audio.weatherMix(state.weather);
  for (const name of ['rain', 'wind']) {
    slider(name).value = Math.round(mix[name] * 100);
    audio.setVolume(name, mix[name]);
  }
}

for (const name of CHANNELS) {
  slider(name).addEventListener('input', () => {
    audio.setVolume(name, slider(name).value / 100);
    // Moving rain/wind by hand means "I'll choose", so stop auto-matching.
    if (name === 'rain' || name === 'wind') $('#match-weather').checked = false;
  });
}
slider('master').addEventListener('input', () => audio.setMaster(slider('master').value / 100));
$('#match-weather').addEventListener('change', (e) => {
  if (e.target.checked) matchSoundsToWeather();
});

on('thunder', () => audio.thunder());
on('lamp', () => audio.click());

$('#enter').addEventListener('click', () => {
  for (const name of CHANNELS) audio.setVolume(name, slider(name).value / 100);
  audio.setMaster(slider('master').value / 100);
  audio.start();
  $('#intro').classList.add('hidden');
});

// ─── Panels ──────────────────────────────────────────────────────────

const closeAll = () => document.querySelectorAll('.panel.open').forEach((p) => p.classList.remove('open'));

on('open-panel', (id) => {
  closeAll();
  $(`#panel-${id}`)?.classList.add('open');
});

document.querySelectorAll('[data-close]').forEach((btn) => btn.addEventListener('click', closeAll));
document.querySelectorAll('[data-toggle]').forEach((btn) =>
  btn.addEventListener('click', () => {
    const panel = $(`#panel-${btn.dataset.toggle}`);
    const wasOpen = panel.classList.contains('open');
    closeAll();
    if (!wasOpen) panel.classList.add('open');
  }),
);
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeAll();
});

// ─── Start ───────────────────────────────────────────────────────────

refreshPhase();
applyWeather();
refreshLiveWeather();
setInterval(() => {
  refreshPhase();
  updateStatus();
}, 30_000);
setInterval(refreshLiveWeather, WEATHER_REFRESH_MINUTES * 60_000);

// Wait for the pixel font so in-game labels don't render in a fallback font.
document.fonts
  .load('8px "Pixelify Sans"')
  .catch(() => {})
  .finally(() => {
    new Phaser.Game({
      type: Phaser.AUTO,
      parent: 'game',
      width: 320,
      height: 180,
      pixelArt: true,
      backgroundColor: '#0b0d18',
      scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
      scene: [RoomScene],
    });
  });
