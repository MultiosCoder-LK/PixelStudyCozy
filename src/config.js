// ─── Edit these to make the room yours ───────────────────────────────

// Used for live weather until a visitor clicks "Use my location".
export const DEFAULT_LOCATION = { name: 'Seoul', lat: 37.57, lon: 126.98 };

// How often to re-check the live weather.
export const WEATHER_REFRESH_MINUTES = 15;

// Starting volumes (0–1). Rain and wind follow the weather when
// "Match the weather" is on.
export const DEFAULT_VOLUMES = { master: 0.8, rain: 0, wind: 0, fire: 0.25, lofi: 0.2, beats: 0 };

// The cat's name (shown when you hover over it).
export const CAT_NAME = 'Mochi';

// Your character. Draw it in Piskel (piskelapp.com) and export PNG
// spritesheets to public/art/. All frames sit side by side in one row
// and play in order as an idle loop. Visitors pick one with the
// Character button; their choice is remembered.
export const CHARACTER = {
  name: 'Me',              // shown when you hover over the character
  files: {
    female: 'art/character-female.png',
    male: 'art/character-male.png',
  },
  default: 'female',       // shown until a visitor picks one
  frameWidth: 32,
  frameHeight: 32,
  frameRate: 3,            // idle animation speed, frames per second
  x: 126,                  // where the character stands (bottom-center of the sprite)
  y: 166,
};
