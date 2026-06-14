import { searchCity, fetchWeather } from './api.js';
import { transformCurrent, transformHourly, transformDaily, getBoost, incrementBoost } from './transform.js';
import { LANGUAGES, getLang, setLang, t } from './i18n.js';

// Sunny Unsplash photo IDs (curated)
const SUNNY_PHOTOS = [
  'photo-1504701954957-2010ec3bcec1',
  'photo-1477959858617-67f85cf4f1df',
  'photo-1506905925346-21bda4d32df4',
  'photo-1500534314209-a25ddb2bd429',
  'photo-1470071459604-3b5ec3a7fe05',
  'photo-1501854140801-50d01698950b',
  'photo-1464822759023-fed622ff2c3b',
  'photo-1433086966358-54859d0ed716',
  'photo-1518173946687-a4c8892bbd9f',
  'photo-1493246507139-91e8fad9978e',
];

function wmoText(code) { return (t('wmo')[code]) ?? t('wmo')[2]; }
function wmoEmoji(code) {
  return { 0: '☀️', 1: '🌤️', 2: '⛅', 3: '🌥️' }[code] ?? '🌤️';
}
function round(n) { return Math.round(n * 10) / 10; }
function roundInt(n) { return Math.round(n); }

// --- State ---
let currentLat = 52.52, currentLon = 13.405, currentName = 'Berlin', currentCountry = 'Germany';
let rawWeatherData = null;
let leafletMap = null;
let leafletMarker = null;
let tempChart = null;

// --- DOM refs ---
const searchInput = document.getElementById('search-input');
const searchBtn = document.getElementById('search-btn');
const suggestions = document.getElementById('suggestions');
const themeToggle = document.getElementById('theme-toggle');
const langSelect = document.getElementById('lang-select');
const mainContent = document.getElementById('main-content');
const errorBox = document.getElementById('error-box');
const loadingBox = document.getElementById('loading-box');
const cityTitle = document.getElementById('city-title');
const dislikeBtn = document.getElementById('dislike-btn');
const dislikeCount = document.getElementById('dislike-count');
const modal = document.getElementById('legal-modal');
const modalBody = document.getElementById('modal-body');
const modalClose = document.getElementById('modal-close');

// --- Language ---
function populateLangSelect() {
  Object.entries(LANGUAGES).forEach(([code, name]) => {
    const opt = document.createElement('option');
    opt.value = code;
    opt.textContent = name;
    if (code === getLang()) opt.selected = true;
    langSelect.appendChild(opt);
  });
}

function applyTranslations() {
  document.getElementById('tagline').textContent = t('tagline');
  searchInput.placeholder = t('search_placeholder');
  document.querySelector('#search-btn span').textContent = t('search_btn');
  document.getElementById('label-hourly').textContent = t('hourly');
  document.getElementById('label-daily').textContent = t('daily');
  document.getElementById('label-map').textContent = t('map_title');
  document.getElementById('label-photos').textContent = t('photos_title');
  document.getElementById('label-chart').textContent = t('chart_title');
  dislikeBtn.querySelector('.dislike-text').textContent = t('dislike_btn');
  document.getElementById('footer-imprint').textContent = t('imprint');
  document.getElementById('footer-privacy').textContent = t('privacy');
  document.getElementById('footer-disclaimer').textContent = t('disclaimer');
  updateDislikeCount();
}

langSelect.addEventListener('change', () => {
  setLang(langSelect.value);
  applyTranslations();
  if (rawWeatherData) renderAll(rawWeatherData);
});

// --- Theme ---
const savedTheme = localStorage.getItem('theme') ?? 'light';
document.documentElement.setAttribute('data-theme', savedTheme);
themeToggle.textContent = savedTheme === 'dark' ? '☀️' : '🌙';
themeToggle.addEventListener('click', () => {
  const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('theme', next);
  themeToggle.textContent = next === 'dark' ? '☀️' : '🌙';
  if (tempChart) updateChartTheme();
});

// --- Dislike button ---
function updateDislikeCount() {
  const n = getBoost();
  dislikeCount.textContent = n > 0 ? t('improved_n', n) : '';
  dislikeCount.hidden = n === 0;
}

dislikeBtn.addEventListener('click', () => {
  incrementBoost();
  updateDislikeCount();
  dislikeBtn.classList.add('bounce');
  setTimeout(() => dislikeBtn.classList.remove('bounce'), 400);
  if (rawWeatherData) renderAll(rawWeatherData);
});

// --- Search ---
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
  if (!e.target.closest('.search-wrapper')) { suggestions.innerHTML = ''; suggestions.hidden = true; }
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
    if (!results.length) { showError(t('error_city')); return; }
    const r = results[0];
    loadWeather(r.latitude, r.longitude, r.name, r.country);
  } catch { showError(t('error_fetch')); }
}

// --- Weather loading ---
async function loadWeather(lat, lon, name, country) {
  currentLat = lat; currentLon = lon; currentName = name; currentCountry = country;
  localStorage.setItem('last_city', JSON.stringify({ lat, lon, name, country }));
  showLoading();
  try {
    const raw = await fetchWeather(lat, lon);
    rawWeatherData = raw;
    renderAll(raw);
    hideLoading();
    mainContent.hidden = false;
    errorBox.hidden = true;
    updateMap(lat, lon, name);
    updatePhotos(name);
  } catch { showError(t('error_fetch')); }
}

function renderAll(raw) {
  const current = transformCurrent(raw.current);
  const hourly = transformHourly(raw.hourly);
  const daily = transformDaily(raw.daily);
  renderCurrent(current);
  renderHourly(hourly);
  renderDaily(daily);
  renderChart(hourly);
}

function showLoading() { loadingBox.textContent = t('loading'); loadingBox.hidden = false; mainContent.hidden = true; errorBox.hidden = true; }
function hideLoading() { loadingBox.hidden = true; }
function showError(msg) { loadingBox.hidden = true; mainContent.hidden = true; errorBox.hidden = false; errorBox.textContent = msg; }

// --- Render current ---
function renderCurrent(current) {
  cityTitle.textContent = `${currentName}, ${currentCountry}`;
  document.getElementById('cur-temp').textContent = `${roundInt(current.temperature_2m)}°`;
  document.getElementById('cur-feels').textContent = `${t('feels_like')} ${roundInt(current.apparent_temperature)}°`;
  document.getElementById('cur-desc').textContent = wmoText(current.weather_code);
  document.getElementById('cur-icon').textContent = wmoEmoji(current.weather_code);
  document.getElementById('cur-wind').textContent = `${roundInt(current.wind_speed_10m)} km/h`;
  document.getElementById('cur-humidity').textContent = `${roundInt(current.relative_humidity_2m)}%`;
  document.getElementById('cur-pressure').textContent = `${roundInt(current.surface_pressure)} hPa`;
  document.getElementById('cur-precip').textContent = `${roundInt(current.precipitation_probability)}%`;
  document.getElementById('label-wind').textContent = t('wind');
  document.getElementById('label-humidity').textContent = t('humidity');
  document.getElementById('label-pressure').textContent = t('pressure');
  document.getElementById('label-precip').textContent = t('precipitation');
}

// --- Render hourly ---
function renderHourly(hourly) {
  const nowHour = new Date().getHours();
  const startIdx = hourly.time.findIndex(t => new Date(t).getHours() === nowHour);
  const container = document.getElementById('hourly-list');
  container.innerHTML = '';
  for (let i = startIdx; i < startIdx + 24 && i < hourly.time.length; i++) {
    const hour = new Date(hourly.time[i]).getHours();
    const div = document.createElement('div');
    div.className = 'hour-card glass-card';
    div.innerHTML = `
      <span class="hour-time">${String(hour).padStart(2, '0')}:00</span>
      <span class="hour-icon">${wmoEmoji(hourly.weather_code[i])}</span>
      <span class="hour-temp">${roundInt(hourly.temperature_2m[i])}°</span>
    `;
    container.appendChild(div);
  }
}

// --- Render daily ---
function renderDaily(daily) {
  const container = document.getElementById('daily-list');
  container.innerHTML = '';
  const days = t('days_full');
  daily.time.forEach((dateStr, i) => {
    const d = new Date(dateStr);
    const div = document.createElement('div');
    div.className = 'day-card glass-card';
    div.innerHTML = `
      <span class="day-name">${i === 0 ? t('today') : days[d.getDay()]}</span>
      <span class="day-icon">${wmoEmoji(daily.weather_code[i])}</span>
      <span class="day-desc">${wmoText(daily.weather_code[i])}</span>
      <span class="day-temps">
        <span class="day-max">${roundInt(daily.temperature_2m_max[i])}°</span>
        <span class="day-min">${roundInt(daily.temperature_2m_min[i])}°</span>
      </span>
    `;
    container.appendChild(div);
  });
}

// --- Chart ---
function renderChart(hourly) {
  const nowHour = new Date().getHours();
  const startIdx = hourly.time.findIndex(t => new Date(t).getHours() === nowHour);
  const labels = [];
  const data = [];
  for (let i = startIdx; i < startIdx + 24 && i < hourly.time.length; i++) {
    labels.push(String(new Date(hourly.time[i]).getHours()).padStart(2, '0') + ':00');
    data.push(Math.round(hourly.temperature_2m[i] * 10) / 10);
  }
  const ctx = document.getElementById('temp-chart').getContext('2d');
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  const gridColor = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.3)';
  const textColor = isDark ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.8)';

  if (tempChart) tempChart.destroy();
  tempChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: t('chart_label'),
        data,
        borderColor: '#7dd3fc',
        backgroundColor: 'rgba(125,211,252,0.15)',
        borderWidth: 2.5,
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
          backgroundColor: 'rgba(0,0,0,0.6)',
          titleColor: '#fff',
          bodyColor: '#7dd3fc',
          callbacks: { label: ctx => `${ctx.parsed.y}°C` }
        }
      },
      scales: {
        x: { grid: { color: gridColor }, ticks: { color: textColor, maxTicksLimit: 8 } },
        y: { grid: { color: gridColor }, ticks: { color: textColor, callback: v => `${v}°` } }
      }
    }
  });
}

function updateChartTheme() {
  if (!rawWeatherData) return;
  renderChart(transformHourly(rawWeatherData.hourly));
}

// --- Map (Leaflet) ---
function initMap() {
  if (leafletMap) return;
  leafletMap = L.map('weather-map', { zoomControl: true, attributionControl: true }).setView([52.52, 13.405], 11);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© <a href="https://openstreetmap.org">OpenStreetMap</a>',
    maxZoom: 18,
  }).addTo(leafletMap);
  const icon = L.divIcon({ className: 'map-marker', html: '☀️', iconSize: [32, 32], iconAnchor: [16, 16] });
  leafletMarker = L.marker([52.52, 13.405], { icon }).addTo(leafletMap);
}

function updateMap(lat, lon, name) {
  if (!leafletMap) { initMap(); }
  leafletMap.setView([lat, lon], 11);
  leafletMarker.setLatLng([lat, lon]).bindPopup(`<b>${name}</b><br>☀️ ${wmoText(0)}`).openPopup();
  setTimeout(() => leafletMap.invalidateSize(), 200);
}

// --- Photos ---
function updatePhotos(cityName) {
  const container = document.getElementById('photos-container');
  container.innerHTML = '';
  // Pick 3 deterministic photos based on city name hash
  const hash = [...cityName].reduce((a, c) => a + c.charCodeAt(0), 0);
  for (let i = 0; i < 3; i++) {
    const idx = (hash + i * 3) % SUNNY_PHOTOS.length;
    const img = document.createElement('img');
    img.className = 'weather-photo';
    img.src = `https://images.unsplash.com/${SUNNY_PHOTOS[idx]}?w=400&h=260&fit=crop&q=80`;
    img.alt = `Beautiful sunny day`;
    img.loading = 'lazy';
    container.appendChild(img);
  }
}

// --- Legal modals ---
document.getElementById('footer-imprint').addEventListener('click', () => openModal(t('imprint_text')));
document.getElementById('footer-privacy').addEventListener('click', () => openModal(t('privacy_text')));
document.getElementById('footer-disclaimer').addEventListener('click', () => openModal(t('disclaimer_text')));
modalClose.addEventListener('click', closeModal);
modal.addEventListener('click', e => { if (e.target === modal) closeModal(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

function openModal(html) { modalBody.innerHTML = html; modal.hidden = false; document.body.style.overflow = 'hidden'; }
function closeModal() { modal.hidden = true; document.body.style.overflow = ''; }

// --- Init ---
populateLangSelect();
applyTranslations();
initMap();

const lastCity = JSON.parse(localStorage.getItem('last_city') ?? 'null');
if (lastCity) {
  currentLat = lastCity.lat; currentLon = lastCity.lon;
  currentName = lastCity.name; currentCountry = lastCity.country;
  searchInput.value = lastCity.name;
}
loadWeather(currentLat, currentLon, currentName, currentCountry);
