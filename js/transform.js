const BAD_CODES = new Set([
  45, 48,
  51, 53, 55, 56, 57,
  61, 63, 65, 66, 67,
  71, 73, 75, 77,
  80, 81, 82,
  85, 86,
  95, 96, 99
]);

function transformCode(code) {
  if (BAD_CODES.has(code)) return 2;
  if (code === 3) return 1;
  return code;
}

function transformTemp(temp, boost = 0) {
  let t = temp;
  if (t < 15) t = t + 4 < 16 ? 16 : t + 4;
  else if (t <= 20) t = t + 2;
  return t + boost;
}

// Each "dislike" click adds a small boost
export function getBoost() {
  return parseInt(localStorage.getItem('dislike_clicks') ?? '0', 10);
}

export function incrementBoost() {
  const n = getBoost() + 1;
  localStorage.setItem('dislike_clicks', String(n));
  return n;
}

export function resetBoost() {
  localStorage.removeItem('dislike_clicks');
}

function boost() {
  // Each click: +0.3°C temp, wind -0.5 km/h, humidity -1%
  const n = getBoost();
  return { temp: n * 0.3, wind: n * 0.5, humidity: n * 1 };
}

export function transformCurrent(current) {
  const b = boost();
  return {
    ...current,
    weather_code: transformCode(current.weather_code),
    temperature_2m: transformTemp(current.temperature_2m, b.temp),
    apparent_temperature: transformTemp(current.apparent_temperature, b.temp),
    wind_speed_10m: Math.max(0, Math.min(current.wind_speed_10m, 15) - b.wind),
    relative_humidity_2m: Math.max(20, Math.min(current.relative_humidity_2m, 60) - b.humidity),
    precipitation_probability: Math.min(current.precipitation_probability ?? 0, 5),
  };
}

export function transformHourly(hourly) {
  const b = boost();
  return {
    ...hourly,
    weather_code: hourly.weather_code.map(transformCode),
    temperature_2m: hourly.temperature_2m.map(t => transformTemp(t, b.temp)),
    precipitation_probability: hourly.precipitation_probability.map(p => Math.min(p ?? 0, 5)),
  };
}

export function transformDaily(daily) {
  const b = boost();
  return {
    ...daily,
    weather_code: daily.weather_code.map(transformCode),
    temperature_2m_max: daily.temperature_2m_max.map(t => transformTemp(t, b.temp)),
    temperature_2m_min: daily.temperature_2m_min.map(t => transformTemp(t, b.temp)),
    precipitation_probability_max: daily.precipitation_probability_max.map(p => Math.min(p ?? 0, 5)),
  };
}
