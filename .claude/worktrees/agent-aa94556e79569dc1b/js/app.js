/**
 * BetterWeather — app.js
 * Main application logic: UI wiring, rendering, state management.
 */

import { searchCities, fetchForecast } from './api.js';
import { transformForecast, WMO_LABELS } from './transform.js';

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------
let currentLocation = null;
let autocompleteTimeout = null;

// ---------------------------------------------------------------------------
// DOM References
// ---------------------------------------------------------------------------
const searchInput = document.getElementById('search-input');
const searchBtn = document.getElementById('search-btn');
const autocompleteList = document.getElementById('autocomplete-list');
const darkToggle = document.getElementById('dark-toggle');
const loadingOverlay = document.getElementById('loading');
const errorSection = document.getElementById('error-section');
const errorMsg = document.getElementById('error-msg');
const weatherMain = document.getElementById('weather-main');

// Current
const cityName = document.getElementById('city-name');
const currentDate = document.getElementById('current-date');
const currentTemp = document.getElementById('current-temp');
const currentFeels = document.getElementById('current-feels');
const currentIcon = document.getElementById('current-icon');
const currentDesc = document.getElementById('current-desc');
const currentWind = document.getElementById('current-wind');
const currentHumidity = document.getElementById('current-humidity');
const currentPressure = document.getElementById('current-pressure');
const currentPrecip = document.getElementById('current-precip');

// Forecast containers
const hourlyStrip = document.getElementById('hourly-strip');
const dailyGrid = document.getElementById('daily-grid');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function wmo(code) {
  return WMO_LABELS[code] ?? WMO_LABELS[2];
}

function fmt(n, decimals = 0) {
  return typeof n === 'number' ? n.toFixed(decimals) : '—';
}

function dayName(dateStr, short = false) {
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('de-DE', { weekday: short ? 'short' : 'long' });
}

function formatHour(isoTime) {
  return isoTime.slice(11, 16); // "HH:MM"
}

function formatCurrentDate() {
  return new Date().toLocaleDateString('de-DE', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
}

// ---------------------------------------------------------------------------
// Loading / Error states
// ---------------------------------------------------------------------------
function showLoading(on) {
  loadingOverlay.hidden = !on;
}

function showError(msg) {
  errorSection.hidden = false;
  weatherMain.hidden = true;
  errorMsg.textContent = msg;
}

function hideError() {
  errorSection.hidden = true;
  weatherMain.hidden = false;
}

// ---------------------------------------------------------------------------
// Render functions
// ---------------------------------------------------------------------------
function renderCurrent(data, locationName) {
  const c = data.current;
  const info = wmo(c.weather_code);

  cityName.textContent = locationName;
  currentDate.textContent = formatCurrentDate();
  currentTemp.textContent = `${Math.round(c.temperature_2m)}°`;
  currentFeels.textContent = `Gefühlt ${Math.round(c.apparent_temperature)}°C`;
  currentIcon.textContent = info.emoji;
  currentDesc.textContent = info.text;
  currentWind.textContent = `${Math.round(c.wind_speed_10m)} km/h`;
  currentHumidity.textContent = `${Math.round(c.relative_humidity_2m)} %`;
  currentPressure.textContent = `${Math.round(c.surface_pressure)} hPa`;
  currentPrecip.textContent = `${Math.round(c.precipitation_probability)} %`;
}

function renderHourly(data) {
  // Show next 24 hours starting from current hour
  const now = new Date();
  const currentHour = now.getHours();
  const times = data.hourly.time;
  const temps = data.hourly.temperature_2m;
  const codes = data.hourly.weather_code;

  // Find index for current hour today
  const todayStr = now.toISOString().slice(0, 10);
  let startIdx = times.findIndex(t => t.startsWith(todayStr) && parseInt(t.slice(11, 13)) >= currentHour);
  if (startIdx < 0) startIdx = 0;

  const items = [];
  for (let i = startIdx; i < Math.min(startIdx + 24, times.length); i++) {
    const info = wmo(codes[i]);
    items.push(`
      <div class="hour-card">
        <span class="hour-time">${formatHour(times[i])}</span>
        <span class="hour-icon">${info.emoji}</span>
        <span class="hour-temp">${Math.round(temps[i])}°</span>
      </div>
    `);
  }
  hourlyStrip.innerHTML = items.join('');
}

function renderDaily(data) {
  const days = data.daily;
  const items = [];
  for (let i = 0; i < days.time.length; i++) {
    const info = wmo(days.weather_code[i]);
    const isToday = i === 0;
    items.push(`
      <div class="day-card ${isToday ? 'day-card--today' : ''}">
        <span class="day-name">${isToday ? 'Heute' : dayName(days.time[i], true)}</span>
        <span class="day-icon">${info.emoji}</span>
        <span class="day-desc">${info.text}</span>
        <div class="day-temps">
          <span class="day-max">${Math.round(days.temperature_2m_max[i])}°</span>
          <span class="day-sep">/</span>
          <span class="day-min">${Math.round(days.temperature_2m_min[i])}°</span>
        </div>
        <div class="day-precip">
          <span class="precip-icon">💧</span>
          <span>${Math.round(days.precipitation_probability_max[i])} %</span>
        </div>
      </div>
    `);
  }
  dailyGrid.innerHTML = items.join('');
}

// ---------------------------------------------------------------------------
// Load weather for a location
// ---------------------------------------------------------------------------
async function loadWeather(lat, lon, name) {
  showLoading(true);
  hideError();
  try {
    const raw = await fetchForecast(lat, lon);
    const data = transformForecast(raw);
    renderCurrent(data, name);
    renderHourly(data);
    renderDaily(data);
    weatherMain.hidden = false;
  } catch (err) {
    console.error(err);
    showError('Wetterdaten konnten nicht geladen werden. Bitte versuche es erneut.');
  } finally {
    showLoading(false);
  }
}

// ---------------------------------------------------------------------------
// Autocomplete
// ---------------------------------------------------------------------------
function closeAutocomplete() {
  autocompleteList.innerHTML = '';
  autocompleteList.hidden = true;
}

function openAutocomplete(results) {
  if (!results.length) { closeAutocomplete(); return; }
  autocompleteList.innerHTML = results.map((r, i) => {
    const sub = [r.admin1, r.country].filter(Boolean).join(', ');
    return `<li class="autocomplete-item" data-idx="${i}" tabindex="0">
      <span class="ac-city">${r.name}</span>
      ${sub ? `<span class="ac-sub">${sub}</span>` : ''}
    </li>`;
  }).join('');
  autocompleteList._results = results;
  autocompleteList.hidden = false;
}

async function handleSearchInput() {
  const q = searchInput.value.trim();
  if (q.length < 2) { closeAutocomplete(); return; }
  try {
    const results = await searchCities(q);
    openAutocomplete(results);
  } catch {
    closeAutocomplete();
  }
}

function selectCity(result) {
  currentLocation = result;
  searchInput.value = result.name;
  closeAutocomplete();
  loadWeather(result.latitude, result.longitude,
    [result.name, result.admin1, result.country].filter(Boolean).join(', '));
}

// ---------------------------------------------------------------------------
// Event listeners
// ---------------------------------------------------------------------------
searchInput.addEventListener('input', () => {
  clearTimeout(autocompleteTimeout);
  autocompleteTimeout = setTimeout(handleSearchInput, 280);
});

searchInput.addEventListener('keydown', e => {
  if (e.key === 'Enter') {
    clearTimeout(autocompleteTimeout);
    const items = autocompleteList.querySelectorAll('.autocomplete-item');
    if (items.length) {
      selectCity(autocompleteList._results[0]);
    } else {
      handleSearchInput();
    }
  }
  if (e.key === 'Escape') closeAutocomplete();
  if (e.key === 'ArrowDown') {
    const first = autocompleteList.querySelector('.autocomplete-item');
    if (first) first.focus();
  }
});

autocompleteList.addEventListener('click', e => {
  const item = e.target.closest('.autocomplete-item');
  if (!item) return;
  const idx = parseInt(item.dataset.idx, 10);
  selectCity(autocompleteList._results[idx]);
});

autocompleteList.addEventListener('keydown', e => {
  const item = e.target.closest('.autocomplete-item');
  if (!item) return;
  const idx = parseInt(item.dataset.idx, 10);
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    selectCity(autocompleteList._results[idx]);
  }
  if (e.key === 'ArrowDown') {
    const next = item.nextElementSibling;
    if (next) next.focus();
  }
  if (e.key === 'ArrowUp') {
    const prev = item.previousElementSibling;
    if (prev) prev.focus();
    else searchInput.focus();
  }
});

searchBtn.addEventListener('click', () => {
  clearTimeout(autocompleteTimeout);
  const q = searchInput.value.trim();
  if (!q) return;
  handleSearchInput().then(() => {
    const results = autocompleteList._results;
    if (results && results.length) selectCity(results[0]);
  });
});

document.addEventListener('click', e => {
  if (!e.target.closest('.search-wrapper')) closeAutocomplete();
});

// ---------------------------------------------------------------------------
// Dark mode toggle
// ---------------------------------------------------------------------------
const prefersDark = window.matchMedia('(prefers-color-scheme: dark)');

function applyDark(on) {
  document.documentElement.classList.toggle('dark', on);
  darkToggle.textContent = on ? '☀️' : '🌙';
  darkToggle.setAttribute('aria-label', on ? 'Hellmodus aktivieren' : 'Dunkelmodus aktivieren');
  localStorage.setItem('bw-dark', on ? '1' : '0');
}

darkToggle.addEventListener('click', () => {
  applyDark(!document.documentElement.classList.contains('dark'));
});

// Init dark mode
const savedDark = localStorage.getItem('bw-dark');
applyDark(savedDark !== null ? savedDark === '1' : prefersDark.matches);
prefersDark.addEventListener('change', e => {
  if (localStorage.getItem('bw-dark') === null) applyDark(e.matches);
});

// ---------------------------------------------------------------------------
// Boot: load default city (Berlin)
// ---------------------------------------------------------------------------
async function boot() {
  showLoading(true);
  try {
    const results = await searchCities('Berlin');
    const berlin = results.find(r => r.country_code === 'DE') ?? results[0];
    if (!berlin) throw new Error('Berlin nicht gefunden');
    searchInput.value = berlin.name;
    await loadWeather(berlin.latitude, berlin.longitude,
      [berlin.name, berlin.admin1, berlin.country].filter(Boolean).join(', '));
  } catch (err) {
    console.error(err);
    showLoading(false);
    showError('Standardort konnte nicht geladen werden.');
  }
}

boot();
