import { searchCity, fetchWeather } from './api.js';
import { transformCurrent, transformHourly, transformDaily, getBoost, incrementBoost } from './transform.js';
import { LANGUAGES, getLang, setLang, tr } from './i18n.js';

// Curated Unsplash sunny-day photo IDs
const PHOTOS = [
  '1504701954957-2010ec3bcec1','1477959858617-67f85cf4f1df','1506905925346-21bda4d32df4',
  '1500534314209-a25ddb2bd429','1470071459604-3b5ec3a7fe05','1501854140801-50d01698950b',
  '1464822759023-fed622ff2c3b','1433086966358-54859d0ed716','1518173946687-a4c8892bbd9f',
  '1493246507139-91e8fad9978e',
];

const WMO_EMOJI = { 0:'☀️', 1:'🌤️', 2:'⛅', 3:'🌥️' };
const ri = n => Math.round(n);
const wmoEmoji = code => WMO_EMOJI[code] ?? '🌤️';
const wmoText  = code => tr('wmo')[code] ?? tr('wmo')[2];

// ── State ──────────────────────────────────────────────────────────────────
let state = { lat: 52.52, lon: 13.405, name: 'Berlin', country: 'Germany', raw: null, tz: 'auto' };
let leafletMap = null, leafletMarker = null, tempChart = null;

// ── DOM ────────────────────────────────────────────────────────────────────
const $ = id => document.getElementById(id);
const searchInput  = $('search-input');
const searchBtn    = $('search-btn');
const suggestions  = $('suggestions');
const themeToggle  = $('theme-toggle');
const langSelect   = $('lang-select');
const mainContent  = $('main-content');
const errorBox     = $('error-box');
const loadingBox   = $('loading-box');
const loadingText  = $('loading-text');
const cityTitle    = $('city-title');
const dislikeBtn   = $('dislike-btn');
const dislikeCount = $('dislike-count');
const modal        = $('legal-modal');
const modalBody    = $('modal-body');

// ── Language ───────────────────────────────────────────────────────────────
function buildLangSelect() {
  Object.entries(LANGUAGES).forEach(([code, label]) => {
    const opt = document.createElement('option');
    opt.value = code; opt.textContent = label;
    if (code === getLang()) opt.selected = true;
    langSelect.appendChild(opt);
  });
}

function applyUI() {
  $('tagline').textContent          = tr('tagline');
  searchInput.placeholder           = tr('search_placeholder');
  $('search-btn-text').textContent  = tr('search_btn');
  $('lbl-chart').textContent        = tr('chart_title');
  $('lbl-hourly').textContent       = tr('hourly');
  $('lbl-daily').textContent        = tr('daily');
  $('lbl-map').textContent          = tr('map_title');
  $('lbl-photos').textContent       = tr('photos_title');
  $('dislike-text').textContent     = tr('dislike_btn');
  $('btn-imprint').textContent      = tr('imprint');
  $('btn-privacy').textContent      = tr('privacy');
  $('btn-disclaimer').textContent   = tr('disclaimer');
  updateDislikeCount();
  if (state.raw) renderAll(state.raw);
}

langSelect.addEventListener('change', () => { setLang(langSelect.value); applyUI(); });

// ── Theme ──────────────────────────────────────────────────────────────────
{
  const saved = localStorage.getItem('theme') ?? 'light';
  document.documentElement.setAttribute('data-theme', saved);
  themeToggle.textContent = saved === 'dark' ? '☀️' : '🌙';
}
themeToggle.addEventListener('click', () => {
  const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('theme', next);
  themeToggle.textContent = next === 'dark' ? '☀️' : '🌙';
  if (state.raw) renderChart(transformHourly(state.raw.hourly));
});

// ── Dislike ────────────────────────────────────────────────────────────────
function updateDislikeCount() {
  const n = getBoost();
  dislikeCount.textContent = n > 0 ? tr('improved_n', n) : '';
  dislikeCount.hidden = n === 0;
}
dislikeBtn.addEventListener('click', () => {
  incrementBoost();
  updateDislikeCount();
  dislikeBtn.classList.add('bounce');
  setTimeout(() => dislikeBtn.classList.remove('bounce'), 400);
  if (state.raw) renderAll(state.raw);
});

// ── Search ─────────────────────────────────────────────────────────────────
let debounce;
searchInput.addEventListener('input', () => {
  clearTimeout(debounce);
  const val = searchInput.value.trim();
  if (val.length < 2) { suggestions.innerHTML = ''; suggestions.hidden = true; return; }
  debounce = setTimeout(async () => {
    try { showSuggestions(await searchCity(val)); } catch { suggestions.hidden = true; }
  }, 300);
});

function showSuggestions(results) {
  suggestions.innerHTML = '';
  if (!results.length) { suggestions.hidden = true; return; }
  results.forEach(r => {
    const li = document.createElement('li');
    li.textContent = [r.name, r.admin1, r.country].filter(Boolean).join(', ');
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
  if (!e.target.closest('.search-wrapper')) { suggestions.innerHTML = ''; suggestions.hidden = true; }
});
searchBtn.addEventListener('click', doSearch);
searchInput.addEventListener('keydown', e => { if (e.key === 'Enter') doSearch(); });

async function doSearch() {
  const val = searchInput.value.trim();
  if (!val) return;
  suggestions.innerHTML = ''; suggestions.hidden = true;
  try {
    const results = await searchCity(val);
    if (!results.length) { showError(tr('error_city')); return; }
    const r = results[0];
    loadWeather(r.latitude, r.longitude, r.name, r.country);
  } catch { showError(tr('error_fetch')); }
}

// ── Weather ────────────────────────────────────────────────────────────────
async function loadWeather(lat, lon, name, country) {
  Object.assign(state, { lat, lon, name, country });
  localStorage.setItem('last_city', JSON.stringify({ lat, lon, name, country }));
  showLoading();
  try {
    const raw = await fetchWeather(lat, lon);
    state.raw = raw;
    state.tz = raw.timezone ?? 'auto';
    renderAll(raw);
    hideLoading();
    mainContent.hidden = false;
    errorBox.hidden = true;
    updateMap(lat, lon, name);
    updatePhotos(name);
  } catch (e) {
    console.error(e);
    showError(tr('error_fetch'));
  }
}

function renderAll(raw) {
  renderCurrent(transformCurrent(raw.current));
  const hourly = transformHourly(raw.hourly);
  const daily  = transformDaily(raw.daily);
  renderHourly(hourly, raw.current.time);
  renderDaily(daily);
  renderChart(hourly, raw.current.time);
}

function showLoading() {
  loadingText.textContent = tr('loading');
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

// ── Render current ─────────────────────────────────────────────────────────
function renderCurrent(c) {
  cityTitle.textContent             = `${state.name}, ${state.country}`;
  $('cur-icon').textContent         = wmoEmoji(c.weather_code);
  $('cur-temp').textContent         = `${ri(c.temperature_2m)}°`;
  $('cur-feels').textContent        = `${tr('feels_like')} ${ri(c.apparent_temperature)}°`;
  $('cur-desc').textContent         = wmoText(c.weather_code);
  $('cur-wind').textContent         = `${ri(c.wind_speed_10m)} km/h`;
  $('cur-humidity').textContent     = `${ri(c.relative_humidity_2m)}%`;
  $('cur-pressure').textContent     = `${ri(c.surface_pressure)} hPa`;
  $('cur-precip').textContent       = `${ri(c.precipitation_probability ?? 0)}%`;
  $('lbl-wind').textContent         = tr('wind');
  $('lbl-humidity').textContent     = tr('humidity');
  $('lbl-pressure').textContent     = tr('pressure');
  $('lbl-precip').textContent       = tr('precipitation');
}

// Current time from API string e.g. "2026-06-14T19:00" → hour number
function currentHour(currentTime) {
  if (!currentTime) return new Date().getHours();
  return parseInt(currentTime.slice(11, 13), 10);
}

// Find index in hourly.time matching or just after currentTime
function findStartIdx(times, currentTime) {
  if (!currentTime) return 0;
  const prefix = currentTime.slice(0, 13); // "2026-06-14T19"
  let idx = times.findIndex(ts => ts.startsWith(prefix));
  return idx >= 0 ? idx : 0;
}

// ── Render hourly ──────────────────────────────────────────────────────────
function renderHourly(hourly, currentTime) {
  const startIdx = findStartIdx(hourly.time, currentTime);
  const container = $('hourly-list');
  container.innerHTML = '';
  for (let i = startIdx; i < startIdx + 24 && i < hourly.time.length; i++) {
    const hour = hourly.time[i].slice(11, 13);
    const div = document.createElement('div');
    div.className = 'hour-card glass-card';
    div.innerHTML = `
      <span class="hour-time">${hour}:00</span>
      <span class="hour-icon">${wmoEmoji(hourly.weather_code[i])}</span>
      <span class="hour-temp">${ri(hourly.temperature_2m[i])}°</span>
    `;
    container.appendChild(div);
  }
}

// ── Render daily ───────────────────────────────────────────────────────────
function renderDaily(daily) {
  const container = $('daily-list');
  container.innerHTML = '';
  const daysFull = tr('days_full');
  daily.time.forEach((dateStr, i) => {
    const dayIdx = new Date(dateStr + 'T12:00:00').getDay();
    const div = document.createElement('div');
    div.className = 'day-card glass-card';
    div.innerHTML = `
      <span class="day-name">${i === 0 ? tr('today') : daysFull[dayIdx]}</span>
      <span class="day-icon">${wmoEmoji(daily.weather_code[i])}</span>
      <span class="day-desc">${wmoText(daily.weather_code[i])}</span>
      <span class="day-temps">
        <span class="day-max">${ri(daily.temperature_2m_max[i])}°</span>
        <span class="day-min">${ri(daily.temperature_2m_min[i])}°</span>
      </span>
    `;
    container.appendChild(div);
  });
}

// ── Chart ──────────────────────────────────────────────────────────────────
function renderChart(hourly, currentTime) {
  const startIdx = findStartIdx(hourly.time, currentTime);
  const labels = [], data = [];
  for (let i = startIdx; i < startIdx + 24 && i < hourly.time.length; i++) {
    labels.push(hourly.time[i].slice(11, 16));
    data.push(ri(hourly.temperature_2m[i]));
  }

  const isDark    = document.documentElement.getAttribute('data-theme') === 'dark';
  const gridColor = 'rgba(255,255,255,' + (isDark ? '0.08' : '0.2') + ')';
  const tickColor = 'rgba(255,255,255,' + (isDark ? '0.5' : '0.75') + ')';

  const canvas = $('temp-chart');
  if (tempChart) { tempChart.destroy(); tempChart = null; }

  tempChart = new Chart(canvas, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        data,
        borderColor: '#7dd3fc',
        backgroundColor: 'rgba(125,211,252,0.12)',
        borderWidth: 2,
        pointRadius: 3,
        pointBackgroundColor: '#7dd3fc',
        fill: true,
        tension: 0.4,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: 'rgba(10,20,50,0.85)',
          titleColor: '#fff',
          bodyColor: '#7dd3fc',
          callbacks: { label: ctx => `${ctx.parsed.y}°C` },
        },
      },
      scales: {
        x: { grid: { color: gridColor }, ticks: { color: tickColor, maxTicksLimit: 8, font: { size: 11 } } },
        y: { grid: { color: gridColor }, ticks: { color: tickColor, callback: v => v + '°', font: { size: 11 } } },
      },
    },
  });
}

// ── Map ────────────────────────────────────────────────────────────────────
function initMap() {
  if (leafletMap) return;
  leafletMap = L.map('weather-map', { zoomControl: true }).setView([state.lat, state.lon], 10);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© <a href="https://openstreetmap.org">OpenStreetMap</a>',
    maxZoom: 18,
  }).addTo(leafletMap);
  const icon = L.divIcon({ className: 'map-sun-icon', html: '☀️', iconSize: [32, 32], iconAnchor: [16, 16] });
  leafletMarker = L.marker([state.lat, state.lon], { icon }).addTo(leafletMap);
}

function updateMap(lat, lon, name) {
  if (!leafletMap) initMap();
  leafletMap.setView([lat, lon], 10);
  leafletMarker.setLatLng([lat, lon]);
  leafletMarker.bindPopup(`<b>${name}</b><br>☀️ ${wmoText(0)}`).openPopup();
  setTimeout(() => leafletMap.invalidateSize(), 300);
}

// ── Photos ─────────────────────────────────────────────────────────────────
function updatePhotos(cityName) {
  const container = $('photos-container');
  container.innerHTML = '';
  const seed = [...cityName].reduce((a, c) => a + c.charCodeAt(0), 0);
  for (let i = 0; i < 3; i++) {
    const photoId = PHOTOS[(seed + i * 3) % PHOTOS.length];
    const img = document.createElement('img');
    img.className = 'weather-photo';
    img.src = `https://images.unsplash.com/photo-${photoId}?w=420&h=280&fit=crop&q=75&auto=format`;
    img.alt = 'Beautiful sunny day';
    img.loading = 'lazy';
    img.onerror = () => { img.src = `https://picsum.photos/seed/${seed + i}/420/280`; };
    container.appendChild(img);
  }
}

// ── Legal modals ───────────────────────────────────────────────────────────
function openModal(html) {
  modalBody.innerHTML = html;
  modal.hidden = false;
  document.body.style.overflow = 'hidden';
}
function closeModal() {
  modal.hidden = true;
  document.body.style.overflow = '';
}

$('btn-imprint').addEventListener('click',    () => openModal(tr('imprint_text')));
$('btn-privacy').addEventListener('click',    () => openModal(tr('privacy_text')));
$('btn-disclaimer').addEventListener('click', () => openModal(tr('disclaimer_text')));
$('modal-close').addEventListener('click', closeModal);
$('modal-backdrop').addEventListener('click', closeModal);
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

// ── Init ───────────────────────────────────────────────────────────────────
buildLangSelect();
applyUI();
initMap();

const saved = JSON.parse(localStorage.getItem('last_city') ?? 'null');
if (saved) {
  Object.assign(state, saved);
  searchInput.value = saved.name;
}
loadWeather(state.lat, state.lon, state.name, state.country);
