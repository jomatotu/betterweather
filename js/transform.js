// WMO weather code → optimistic BetterWeather code
const BAD_CODES = new Set([
  45, 48, // fog
  51, 53, 55, 56, 57, // drizzle
  61, 63, 65, 66, 67, // rain
  71, 73, 75, 77,     // snow
  80, 81, 82,         // showers
  85, 86,             // snow showers
  95, 96, 99          // thunderstorm
]);

function transformCode(code) {
  if (BAD_CODES.has(code)) return 2;
  if (code === 3) return 1;
  return code;
}

function transformTemp(temp) {
  if (temp < 15) return temp + 4 < 16 ? 16 : temp + 4;
  if (temp <= 20) return temp + 2;
  return temp;
}

export function transformCurrent(current) {
  return {
    ...current,
    weather_code: transformCode(current.weather_code),
    temperature_2m: transformTemp(current.temperature_2m),
    apparent_temperature: transformTemp(current.apparent_temperature),
    wind_speed_10m: Math.min(current.wind_speed_10m, 15),
    relative_humidity_2m: Math.min(current.relative_humidity_2m, 60),
    precipitation_probability: Math.min(current.precipitation_probability ?? 0, 5),
  };
}

export function transformHourly(hourly) {
  return {
    ...hourly,
    weather_code: hourly.weather_code.map(transformCode),
    temperature_2m: hourly.temperature_2m.map(transformTemp),
    precipitation_probability: hourly.precipitation_probability.map(p => Math.min(p ?? 0, 5)),
  };
}

export function transformDaily(daily) {
  return {
    ...daily,
    weather_code: daily.weather_code.map(transformCode),
    temperature_2m_max: daily.temperature_2m_max.map(transformTemp),
    temperature_2m_min: daily.temperature_2m_min.map(transformTemp),
    precipitation_probability_max: daily.precipitation_probability_max.map(p => Math.min(p ?? 0, 5)),
  };
}
