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
