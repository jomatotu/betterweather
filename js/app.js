/**
 * app.js — BetterWeather entry point
 * Handles UI, event wiring, and rendering.
 */

import { searchCities, fetchForecast } from './api.js';
import { transformForecast } from './transform.js';

// ─── WMO code → label + emoji ────────────────────────────────────────────────
const WMO_LABELS = {
  0: { label: 'Sonnig', emoji: '☀️' },
  1: { label: 'Überwiegend sonnig', emoji: '🌤️' },
  2: { label: 'Heiter bis wolkig', emoji: '⛅' },
  3: { label: 'Bewölkt', emoji: '☁️' },
};

function wmo(code) {
  return WMO_LABELS[code] ?? WMO_LABELS[2];
}

// ─── Day names ────────────────────────────────────────────────────────────────
const DAYS_DE = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
const DAYS_FULL_DE = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];

function dayLabel(isoDate, index) {
  if (index === 0) return 'Heute';
  if (index === 1) return 'Morgen';
  const d = new Date(isoDate + 'T12:00:00');
  return DAYS_FULL_DE[d.getDay()];
}

function shortDayLabel(isoDate) {
  const d = new Date(isoDate + 'T12:00:00');
  return DAYS_DE[d.getDay()];
}

// ─── DOM refs ─────────────────────────────────────────────────────────────────
const searchInput   = document.getElementById('search-input');
const autocompleteEl = document.getElementById('autocomplete');
const darkToggle    = document.getElementById('dark-toggle');
const loadingEl     = document.getElementById('loading');
const errorEl       = document.getElementById('error');
const weatherEl     = document.getElementById('weather');

// ─── State ────────────────────────────────────────────────────────────────────
let autocompleteResults = [];
let activeIndex = -1;
let debounceTimer = null;
let currentLocation = null;

// ─── Dark mode ────────────────────────────────────────────────────────────────
function applyTheme(dark) {
  document.documentElement.classList.toggle('dark', dark);
  darkToggle.textContent = dark ? '☀️' : '🌙';
  darkToggle.setAttribute('aria-label', dark ? 'Hellmodus aktivieren' : 'Dunkelmodus aktivieren');
  localStorage.setItem('bw-dark', dark ? '1' : '0');
}

darkToggle.addEventListener('click', () => {
  applyTheme(!document.documentElement.classList.contains('dark'));
});

// Restore saved preference
const savedDark = localStorage.getItem('bw-dark');
if (savedDark === '1') applyTheme(true);
else if (savedDark === '0') applyTheme(false);
else applyTheme(window.matchMedia('(prefers-color-scheme: dark)').matches);

// ─── Autocomplete ─────────────────────────────────────────────────────────────
searchInput.addEventListener('input', () => {
  clearTimeout(debounceTimer);
  const q = searchInput.value.trim();
  if (q.length < 2) { closeAutocomplete(); return; }
  debounceTimer = setTimeout(() => fetchAutocomplete(q), 280);
});

searchInput.addEventListener('keydown', (e) => {
  if (!autocompleteResults.length) return;
  if (e.key === 'ArrowDown') {
    e.preventDefault();
    activeIndex = Math.min(activeIndex + 1, autocompleteResults.length - 1);
    renderAutocomplete();
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    activeIndex = Math.max(activeIndex - 1, -1);
    renderAutocomplete();
  } else if (e.key === 'Enter') {
    e.preventDefault();
    if (activeIndex >= 0) selectCity(autocompleteResults[activeIndex]);
    else if (autocompleteResults.length) selectCity(autocompleteResults[0]);
  } else if (e.key === 'Escape') {
    closeAutocomplete();
  }
});

document.addEventListener('click', (e) => {
  if (!e.target.closest('.search-wrapper')) closeAutocomplete();
});

async function fetchAutocomplete(q) {
  try {
    autocompleteResults = await searchCities(q);
    activeIndex = -1;
    renderAutocomplete();
  } catch {
    closeAutocomplete();
  }
}

function renderAutocomplete() {
  if (!autocompleteResults.length) { closeAutocomplete(); return; }
  autocompleteEl.innerHTML = autocompleteResults.map((r, i) => {
    const parts = [r.name];
    if (r.admin1) parts.push(r.admin1);
    if (r.country) parts.push(r.country);
    const active = i === activeIndex ? ' active' : '';
    return `<li class="autocomplete-item${active}" data-index="${i}">
      <span class="city-name">${r.name}</span>
      <span class="city-meta">${parts.slice(1).join(', ')}</span>
    </li>`;
  }).join('');
  autocompleteEl.classList.add('open');

  autocompleteEl.querySelectorAll('.autocomplete-item').forEach(li => {
    li.addEventListener('mousedown', (e) => {
      e.preventDefault();
      selectCity(autocompleteResults[+li.dataset.index]);
    });
  });
}

function closeAutocomplete() {
  autocompleteEl.classList.remove('open');
  autocompleteEl.innerHTML = '';
  autocompleteResults = [];
  activeIndex = -1;
}

// ─── Load weather ─────────────────────────────────────────────────────────────
async function selectCity(city) {
  closeAutocomplete();
  searchInput.value = city.name;
  currentLocation = city;
  await loadWeather(city.latitude, city.longitude, city.name, city.country);
}

async function loadWeather(lat, lon, name, country) {
  showLoading();
  try {
    const raw = await fetchForecast(lat, lon);
    const data = transformForecast(raw);
    renderWeather(data, name, country);
    showWeather();
  } catch (err) {
    console.error(err);
    showError('Wetterdaten konnten nicht geladen werden. Bitte versuche es erneut.');
  }
}

// ─── Render ───────────────────────────────────────────────────────────────────
function renderWeather(data, cityName, country) {
  renderCurrent(data.current, cityName, country);
  renderHourly(data.hourly, data.current_units);
  renderDaily(data.daily);
}

function renderCurrent(c, cityName, country) {
  const { label, emoji } = wmo(c.weather_code);
  const temp = Math.round(c.temperature_2m);
  const feelsLike = Math.round(c.apparent_temperature);
  const wind = Math.round(c.wind_speed_10m);
  const pressure = Math.round(c.surface_pressure);
  const humidity = Math.round(c.relative_humidity_2m);
  const precipProb = Math.round(c.precipitation_probability);

  document.getElementById('current-city').textContent = cityName;
  document.getElementById('current-country').textContent = country ?? '';
  document.getElementById('current-icon').textContent = emoji;
  document.getElementById('current-temp').textContent = `${temp}°`;
  document.getElementById('current-label').textContent = label;
  document.getElementById('current-feels').textContent = `Gefühlt ${feelsLike}°C`;
  document.getElementById('stat-wind').textContent = `${wind} km/h`;
  document.getElementById('stat-humidity').textContent = `${humidity} %`;
  document.getElementById('stat-pressure').textContent = `${pressure} hPa`;
  document.getElementById('stat-precip').textContent = `${precipProb} %`;
}

function renderHourly(hourly) {
  const now = new Date();
  const strip = document.getElementById('hourly-strip');
  const items = [];

  for (let i = 0; i < hourly.time.length && i < 48; i++) {
    const t = new Date(hourly.time[i]);
    if (t < now - 30 * 60 * 1000) continue; // skip past hours
    const hour = t.getHours().toString().padStart(2, '0') + ':00';
    const temp = Math.round(hourly.temperature_2m[i]);
    const { emoji } = wmo(hourly.weather_code[i]);
    const isNow = items.length === 0;
    items.push(`
      <div class="hourly-item${isNow ? ' now' : ''}">
        <span class="h-time">${isNow ? 'Jetzt' : hour}</span>
        <span class="h-icon">${emoji}</span>
        <span class="h-temp">${temp}°</span>
      </div>
    `);
    if (items.length >= 24) break;
  }

  strip.innerHTML = items.join('');
}

function renderDaily(daily) {
  const grid = document.getElementById('daily-grid');
  grid.innerHTML = daily.time.map((date, i) => {
    const { emoji } = wmo(daily.weather_code[i]);
    const max = Math.round(daily.temperature_2m_max[i]);
    const min = Math.round(daily.temperature_2m_min[i]);
    const label = dayLabel(date, i);
    const shortDay = shortDayLabel(date);
    const precip = Math.round(daily.precipitation_probability_max[i]);
    return `
      <div class="daily-card">
        <span class="d-day" title="${label}">${i === 0 ? 'Heute' : i === 1 ? 'Morgen' : shortDay}</span>
        <span class="d-icon">${emoji}</span>
        <span class="d-max">${max}°</span>
        <span class="d-min">${min}°</span>
        <span class="d-precip" title="Niederschlagswahrscheinlichkeit">${precip}%</span>
      </div>
    `;
  }).join('');
}

// ─── UI states ────────────────────────────────────────────────────────────────
function showLoading() {
  loadingEl.hidden = false;
  errorEl.hidden = true;
  weatherEl.hidden = true;
}

function showWeather() {
  loadingEl.hidden = true;
  errorEl.hidden = true;
  weatherEl.hidden = false;
}

function showError(msg) {
  loadingEl.hidden = true;
  errorEl.hidden = false;
  weatherEl.hidden = true;
  document.getElementById('error-msg').textContent = msg;
}

// ─── Default city on load ─────────────────────────────────────────────────────
(async () => {
  try {
    const results = await searchCities('Berlin');
    if (results.length) await selectCity(results[0]);
    else showError('Standardort konnte nicht geladen werden.');
  } catch {
    showError('Keine Verbindung zur Wetter-API. Bitte Internetverbindung prüfen.');
  }
})();
