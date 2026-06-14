/**
 * api.js — Open-Meteo API calls for BetterWeather
 */

const GEO_BASE = 'https://geocoding-api.open-meteo.com/v1';
const FORECAST_BASE = 'https://api.open-meteo.com/v1';

/**
 * Search for cities by name.
 * @param {string} query
 * @returns {Promise<Array>} array of location objects
 */
export async function searchCities(query) {
  if (!query || query.trim().length < 2) return [];
  const url = `${GEO_BASE}/search?name=${encodeURIComponent(query.trim())}&count=5&language=de&format=json`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Geocoding error: ${res.status}`);
  const data = await res.json();
  return data.results || [];
}

/**
 * Fetch weather forecast for a location.
 * @param {number} latitude
 * @param {number} longitude
 * @returns {Promise<Object>} raw Open-Meteo forecast response
 */
export async function fetchForecast(latitude, longitude) {
  const params = new URLSearchParams({
    latitude,
    longitude,
    current: 'temperature_2m,relative_humidity_2m,apparent_temperature,precipitation_probability,weather_code,wind_speed_10m,surface_pressure',
    hourly: 'temperature_2m,weather_code,precipitation_probability',
    daily: 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max',
    wind_speed_unit: 'kmh',
    timezone: 'auto',
    forecast_days: '7',
  });

  const url = `${FORECAST_BASE}/forecast?${params}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Forecast error: ${res.status}`);
  return res.json();
}
