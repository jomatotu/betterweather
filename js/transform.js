/**
 * transform.js — BetterWeather transformation logic
 * Converts real weather data into optimistic, pleasant weather.
 */

/**
 * Transform a WMO weather code into a BetterWeather-approved code.
 * @param {number} code - WMO weather code
 * @returns {number}
 */
export function transformWeatherCode(code) {
  if (code >= 51) return 2; // rain, storm, snow, fog, drizzle → "Heiter bis wolkig"
  if (code === 3) return 1; // overcast → "Leicht bewölkt"
  return code;
}

/**
 * Transform a temperature value (°C).
 * @param {number} temp
 * @returns {number}
 */
export function transformTemperature(temp) {
  if (temp < 15) return Math.max(temp + 4, 16);
  if (temp <= 20) return temp + 2;
  // 20–25 and > 25: unchanged
  return temp;
}

/**
 * Transform wind speed (km/h).
 * @param {number} speed
 * @returns {number}
 */
export function transformWindSpeed(speed) {
  return Math.min(speed, 15);
}

/**
 * Transform relative humidity (%).
 * @param {number} humidity
 * @returns {number}
 */
export function transformHumidity(humidity) {
  return humidity > 75 ? 60 : humidity;
}

/**
 * Transform precipitation probability (%).
 * @param {number} prob
 * @returns {number}
 */
export function transformPrecipitationProbability(prob) {
  return prob > 20 ? 5 : prob;
}

/**
 * Transform a current weather object from the API.
 * @param {Object} current - raw current weather from Open-Meteo
 * @returns {Object}
 */
export function transformCurrent(current) {
  return {
    ...current,
    temperature_2m: transformTemperature(current.temperature_2m),
    apparent_temperature: transformTemperature(current.apparent_temperature),
    weather_code: transformWeatherCode(current.weather_code),
    wind_speed_10m: transformWindSpeed(current.wind_speed_10m),
    relative_humidity_2m: transformHumidity(current.relative_humidity_2m),
    precipitation_probability: transformPrecipitationProbability(current.precipitation_probability),
  };
}

/**
 * Transform hourly forecast arrays.
 * @param {Object} hourly - raw hourly object from Open-Meteo
 * @returns {Object}
 */
export function transformHourly(hourly) {
  return {
    time: hourly.time,
    temperature_2m: hourly.temperature_2m.map(transformTemperature),
    weather_code: hourly.weather_code.map(transformWeatherCode),
    precipitation_probability: hourly.precipitation_probability.map(transformPrecipitationProbability),
  };
}

/**
 * Transform daily forecast arrays.
 * @param {Object} daily - raw daily object from Open-Meteo
 * @returns {Object}
 */
export function transformDaily(daily) {
  return {
    time: daily.time,
    weather_code: daily.weather_code.map(transformWeatherCode),
    temperature_2m_max: daily.temperature_2m_max.map(transformTemperature),
    temperature_2m_min: daily.temperature_2m_min.map(transformTemperature),
    precipitation_probability_max: daily.precipitation_probability_max.map(transformPrecipitationProbability),
  };
}

/**
 * Transform the full API response.
 * @param {Object} data - raw Open-Meteo forecast response
 * @returns {Object}
 */
export function transformForecast(data) {
  return {
    ...data,
    current: transformCurrent(data.current),
    hourly: transformHourly(data.hourly),
    daily: transformDaily(data.daily),
  };
}
