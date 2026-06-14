/**
 * BetterWeather — transform.js
 * Optimistically adjusts weather data to always show the best possible outlook.
 */

/**
 * Maps WMO weather codes to display info (German).
 */
export const WMO_LABELS = {
  0: { text: 'Sonnig', emoji: '☀️' },
  1: { text: 'Überwiegend sonnig', emoji: '🌤️' },
  2: { text: 'Heiter bis wolkig', emoji: '⛅' },
  3: { text: 'Bewölkt', emoji: '☁️' },
};

/**
 * Transforms a single WMO weather code into a pleasant one.
 * @param {number} code
 * @returns {number}
 */
export function transformWeatherCode(code) {
  if (code >= 51) return 2;   // rain, drizzle, snow, storm, fog → "Heiter bis wolkig"
  if (code === 3) return 1;   // overcast → "Leicht bewölkt"
  return code;                // 0, 1, 2 stay as-is
}

/**
 * Transforms a temperature value upwards if necessary.
 * @param {number} temp  °C
 * @returns {number}
 */
export function transformTemperature(temp) {
  if (temp < 15) return Math.max(16, temp + 4);
  if (temp <= 20) return temp + 2;
  return temp;
}

/**
 * Transforms wind speed.
 * @param {number} speed  km/h
 * @returns {number}
 */
export function transformWind(speed) {
  return speed > 30 ? 15 : speed;
}

/**
 * Transforms relative humidity.
 * @param {number} humidity  %
 * @returns {number}
 */
export function transformHumidity(humidity) {
  return humidity > 75 ? 60 : humidity;
}

/**
 * Transforms precipitation probability.
 * @param {number} prob  %
 * @returns {number}
 */
export function transformPrecipProb(prob) {
  return prob > 20 ? 5 : prob;
}

/**
 * Applies all transformations to the raw Open-Meteo API response.
 * Returns a new object — never mutates the original.
 * @param {object} raw  Raw API response from Open-Meteo forecast endpoint
 * @returns {object}    Transformed copy
 */
export function transformForecast(raw) {
  const data = JSON.parse(JSON.stringify(raw)); // deep clone

  // --- Current weather ---
  const c = data.current;
  if (c) {
    c.temperature_2m = transformTemperature(c.temperature_2m);
    c.apparent_temperature = transformTemperature(c.apparent_temperature);
    c.weather_code = transformWeatherCode(c.weather_code);
    c.wind_speed_10m = transformWind(c.wind_speed_10m);
    c.relative_humidity_2m = transformHumidity(c.relative_humidity_2m);
    c.precipitation_probability = transformPrecipProb(c.precipitation_probability ?? 0);
  }

  // --- Hourly ---
  const h = data.hourly;
  if (h) {
    h.temperature_2m = h.temperature_2m.map(transformTemperature);
    h.weather_code = h.weather_code.map(transformWeatherCode);
    h.precipitation_probability = h.precipitation_probability.map(transformPrecipProb);
  }

  // --- Daily ---
  const d = data.daily;
  if (d) {
    d.temperature_2m_max = d.temperature_2m_max.map(transformTemperature);
    d.temperature_2m_min = d.temperature_2m_min.map(transformTemperature);
    d.weather_code = d.weather_code.map(transformWeatherCode);
    d.precipitation_probability_max = d.precipitation_probability_max.map(transformPrecipProb);
  }

  return data;
}
