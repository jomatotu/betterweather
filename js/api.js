const GEO_URL = 'https://geocoding-api.open-meteo.com/v1/search';
const WEATHER_URL = 'https://api.open-meteo.com/v1/forecast';

export async function searchCity(name) {
  const res = await fetch(`${GEO_URL}?name=${encodeURIComponent(name)}&count=5&language=de&format=json`);
  if (!res.ok) throw new Error('Geocoding fehlgeschlagen');
  const data = await res.json();
  return data.results ?? [];
}

export async function fetchWeather(lat, lon) {
  const params = new URLSearchParams({
    latitude: lat,
    longitude: lon,
    current: 'temperature_2m,relative_humidity_2m,apparent_temperature,precipitation_probability,weather_code,wind_speed_10m,surface_pressure',
    hourly: 'temperature_2m,weather_code,precipitation_probability',
    daily: 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max',
    wind_speed_unit: 'kmh',
    timezone: 'auto',
    forecast_days: 7,
  });
  const res = await fetch(`${WEATHER_URL}?${params}`);
  if (!res.ok) throw new Error('Wetterdaten konnten nicht geladen werden');
  return res.json();
}
