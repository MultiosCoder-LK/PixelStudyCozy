// Live weather from Open-Meteo (free, no API key) + time-of-day helpers.

export const KIND_LABEL = {
  clear: 'Clear',
  cloudy: 'Cloudy',
  fog: 'Foggy',
  rain: 'Rain',
  storm: 'Thunderstorm',
  snow: 'Snow',
};

// WMO weather codes → the six kinds the room knows how to draw.
// https://open-meteo.com/en/docs (see "WMO Weather interpretation codes")
export function codeToKind(code) {
  if (code <= 1) return 'clear';
  if (code <= 3) return 'cloudy';
  if (code === 45 || code === 48) return 'fog';
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return 'snow';
  if (code >= 95) return 'storm';
  if (code >= 51 && code <= 82) return 'rain';
  return 'cloudy';
}

export async function fetchWeather(lat, lon) {
  const url =
    'https://api.open-meteo.com/v1/forecast' +
    `?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code&timezone=auto`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Weather request failed: ${res.status}`);
  const data = await res.json();
  return {
    kind: codeToKind(data.current.weather_code),
    temp: Math.round(data.current.temperature_2m),
  };
}

// hour is a decimal hour in the visitor's local time, e.g. 18.5 = 6:30pm
export function phaseForHour(hour) {
  if (hour < 5.5 || hour >= 20) return 'night';
  if (hour < 7.5) return 'dawn';
  if (hour < 17.5) return 'day';
  return 'dusk';
}
