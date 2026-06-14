import { searchCity, fetchWeather } from './api.js';
import { transformCurrent, transformHourly, transformDaily } from './transform.js';

const WMO_TEXT = {
  0: 'Sonnig',
  1: 'Überwiegend sonnig',
  2: 'Heiter bis wolkig',
  3: 'Leicht bewölkt',
};

const WMO_EMOJI = {
  0: '☀️',
  1: '🌤️',
  2: '⛅',
  3: '🌥️',
};

const DAYS_DE = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
const DAYS_FULL = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];

function wmoText(code) { return WMO_TEXT[code] ?? 'Schönes Wetter'; }
function wmoEmoji(code) { return WMO_EMOJI[code] ?? '🌤️'; }
function round(n) { return Math.round(n); }

// --- DOM refs ---
const searchInput = document.getElementById('search-input');
const searchBtn = document.getElementById('search-btn');
const suggestions = document.getElementById('suggestions');
const themeToggle = document.getElementById('theme-toggle');
const mainContent = document.getElementById('main-content');
const errorBox = document.getElementById('error-box');
const loadingBox = document.getElementById('loading-box');
const cityTitle = document.getElementById('city-title');

// --- Theme ---
const savedTheme = localStorage.getItem('theme') ?? 'light';
document.documentElement.setAttribute('data-theme', savedTheme);
themeToggle.textContent = savedTheme === 'dark' ? '☀️' : '🌙';

themeToggle.addEventListener('click', () => {
  const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('theme', next);
  themeToggle.textContent = next === 'dark' ? '☀️' : '🌙';
});

// --- Search autocomplete ---
let debounceTimer;
searchInput.addEventListener('input', () => {
  clearTimeout(debounceTimer);
  const val = searchInput.value.trim();
  if (val.length < 2) { suggestions.innerHTML = ''; suggestions.hidden = true; return; }
  debounceTimer = setTimeout(async () => {
    try {
      const results = await searchCity(val);
      renderSuggestions(results);
    } catch { suggestions.hidden = true; }
  }, 300);
});

function renderSuggestions(results) {
  suggestions.innerHTML = '';
  if (!results.length) { suggestions.hidden = true; return; }
  results.forEach(r => {
    const li = document.createElement('li');
    li.textContent = `${r.name}${r.admin1 ? ', ' + r.admin1 : ''}, ${r.country}`;
    li.addEventListener('click', () => {
      searchInput.value = r.name;
      suggestions.innerHTML = '';
      suggestions.hidden = true;
      loadWeather(r.latitude, r.longitude, r.name, r.country);
    });
    suggestions.appendChild(li);
  });
  suggestions.hidden = false;
}

document.addEventListener('click', e => {
  if (!e.target.closest('.search-wrapper')) {
    suggestions.innerHTML = '';
    suggestions.hidden = true;
  }
});

searchBtn.addEventListener('click', doSearch);
searchInput.addEventListener('keydown', e => { if (e.key === 'Enter') doSearch(); });

async function doSearch() {
  const val = searchInput.value.trim();
  if (!val) return;
  suggestions.innerHTML = '';
  suggestions.hidden = true;
  try {
    const results = await searchCity(val);
    if (!results.length) { showError('Stadt nicht gefunden.'); return; }
    const r = results[0];
    loadWeather(r.latitude, r.longitude, r.name, r.country);
  } catch { showError('Suche fehlgeschlagen. Bitte erneut versuchen.'); }
}

// --- Weather loading ---
async function loadWeather(lat, lon, name, country) {
  showLoading();
  try {
    const raw = await fetchWeather(lat, lon);
    const current = transformCurrent(raw.current);
    const hourly = transformHourly(raw.hourly);
    const daily = transformDaily(raw.daily);
    render({ current, hourly, daily, name, country, timezone: raw.timezone });
    hideLoading();
    mainContent.hidden = false;
    errorBox.hidden = true;
  } catch (e) {
    showError('Wetter konnte nicht geladen werden.');
  }
}

function showLoading() {
  loadingBox.hidden = false;
  mainContent.hidden = true;
  errorBox.hidden = true;
}
function hideLoading() { loadingBox.hidden = true; }
function showError(msg) {
  loadingBox.hidden = true;
  mainContent.hidden = true;
  errorBox.hidden = false;
  errorBox.textContent = msg;
}

// --- Render ---
function render({ current, hourly, daily, name, country, timezone }) {
  cityTitle.textContent = `${name}, ${country}`;

  // Current
  document.getElementById('cur-temp').textContent = `${round(current.temperature_2m)}°`;
  document.getElementById('cur-feels').textContent = `Gefühlt ${round(current.apparent_temperature)}°`;
  document.getElementById('cur-desc').textContent = wmoText(current.weather_code);
  document.getElementById('cur-icon').textContent = wmoEmoji(current.weather_code);
  document.getElementById('cur-wind').textContent = `${round(current.wind_speed_10m)} km/h`;
  document.getElementById('cur-humidity').textContent = `${round(current.relative_humidity_2m)}%`;
  document.getElementById('cur-pressure').textContent = `${round(current.surface_pressure)} hPa`;
  document.getElementById('cur-precip').textContent = `${round(current.precipitation_probability)}%`;

  // Hourly (next 24h from current hour)
  const nowHour = new Date().getHours();
  const allTimes = hourly.time;
  const startIdx = allTimes.findIndex(t => new Date(t).getHours() === nowHour);
  const hourlyContainer = document.getElementById('hourly-list');
  hourlyContainer.innerHTML = '';
  for (let i = startIdx; i < startIdx + 24 && i < allTimes.length; i++) {
    const hour = new Date(allTimes[i]).getHours();
    const div = document.createElement('div');
    div.className = 'hour-card glass-card';
    div.innerHTML = `
      <span class="hour-time">${String(hour).padStart(2, '0')}:00</span>
      <span class="hour-icon">${wmoEmoji(hourly.weather_code[i])}</span>
      <span class="hour-temp">${round(hourly.temperature_2m[i])}°</span>
    `;
    hourlyContainer.appendChild(div);
  }

  // Daily
  const dailyContainer = document.getElementById('daily-list');
  dailyContainer.innerHTML = '';
  daily.time.forEach((dateStr, i) => {
    const d = new Date(dateStr);
    const isToday = i === 0;
    const div = document.createElement('div');
    div.className = 'day-card glass-card';
    div.innerHTML = `
      <span class="day-name">${isToday ? 'Heute' : DAYS_FULL[d.getDay()]}</span>
      <span class="day-icon">${wmoEmoji(daily.weather_code[i])}</span>
      <span class="day-desc">${wmoText(daily.weather_code[i])}</span>
      <span class="day-temps">
        <span class="day-max">${round(daily.temperature_2m_max[i])}°</span>
        <span class="day-min">${round(daily.temperature_2m_min[i])}°</span>
      </span>
    `;
    dailyContainer.appendChild(div);
  });
}

// --- Initial load ---
loadWeather(52.52, 13.405, 'Berlin', 'Deutschland');
