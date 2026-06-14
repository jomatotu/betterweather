# Requirements: BetterWeather Website

**Generated:** 2026-06-14T19:31:00Z
**Status:** complete

## Overview

BetterWeather ist eine statische Wetter-Website, die echte Wetterdaten von Open-Meteo abruft und diese transparent in optimistische Werte transformiert. Der Nutzer sieht stets gutes Wetter — unabhängig vom tatsächlichen Wetter am gewählten Standort. Die Seite wirkt dabei wie eine vollständige, seriöse Wetterseite (kein Hinweis auf die Transformation). Das Projekt läuft komplett im Browser (kein Backend), unterstützt Dark Mode und ist responsive.

---

## Functional Requirements

- **FR-01:** Nutzer kann einen Standort per Texteingabe (Stadtname) suchen
- **FR-02:** Aktuelles Wetter wird angezeigt: Icon, Temperatur, gefühlte Temperatur, Wind, Luftfeuchtigkeit, Luftdruck, Niederschlagswahrscheinlichkeit
- **FR-03:** 7-Tage-Vorhersage wird als Cards angezeigt (Min/Max-Temp, Icon, Wetterlage-Text)
- **FR-04:** Stündliche Vorhersage für die nächsten 24 Stunden wird angezeigt (horizontales Scroll-Element)
- **FR-05:** Alle angezeigten Wetterdaten werden durch die Transformations-Logik gefiltert — es gibt kein schlechtes Wetter auf BetterWeather
- **FR-06:** Die Website ist vollständig responsive (Mobile-first)
- **FR-07:** Dark Mode wird unterstützt (toggle oder automatisch via `prefers-color-scheme`)
- **FR-08:** Kein Hinweis auf die Transformation — die Seite wirkt wie eine echte Wetterseite

---

## Transformations-Logik (Kernfunktion)

| Eingabe (echt) | Ausgabe (BetterWeather) |
|----------------|------------------------|
| Regen, Gewitter, Schnee, Nieselregen, Nebel | → "Heiter bis wolkig" (WMO-Code: 2) |
| Stark bewölkt | → "Leicht bewölkt" (WMO-Code: 1) |
| Temperatur < 15°C | → +4°C (min. 16°C angezeigt) |
| Temperatur 15–20°C | → +2°C |
| Temperatur > 25°C | → unverändert |
| Wind > 30 km/h | → auf 15 km/h gekappt |
| Luftfeuchtigkeit > 75% | → auf 60% gesetzt |
| Niederschlagswahrsch. > 20% | → auf 5% gesetzt |
| Niederschlagsmenge > 0 | → auf 0 gesetzt |

---

## Technical Requirements

### Tech Stack
- **Sprache:** Vanilla HTML5 / CSS3 / JavaScript (ES2020+), kein Framework-Overhead
- **Wetter-API:** [Open-Meteo](https://open-meteo.com/) — kostenlos, kein API-Key
  - Geocoding: `https://geocoding-api.open-meteo.com/v1/search?name={city}`
  - Wetter: `https://api.open-meteo.com/v1/forecast` mit Parametern für current, hourly, daily
- **Icons:** Meteocons (SVG, open source) oder WMO-Code-basiertes Icon-Mapping
- **Deployment:** GitHub Pages (statische Files, kein Build-Step nötig)

### Neue Dateien / Komponenten

```
index.html              — Hauptseite
style.css               — Styles inkl. Dark Mode (CSS custom properties)
app.js                  — Einstiegspunkt, Event-Handling, UI-Updates
api.js                  — Open-Meteo API-Calls (fetch wrapper)
transform.js            — Transformations-Logik (reale → optimistische Daten)
icons/                  — Wetter-Icon-Set (SVG)
```

### API-Endpunkte (Open-Meteo)

```
# Geocoding
GET https://geocoding-api.open-meteo.com/v1/search
  ?name=Berlin&count=5&language=de&format=json

# Forecast
GET https://api.open-meteo.com/v1/forecast
  ?latitude=52.52&longitude=13.41
  &current=temperature_2m,relative_humidity_2m,apparent_temperature,
           precipitation_probability,weather_code,wind_speed_10m,
           surface_pressure
  &hourly=temperature_2m,weather_code,precipitation_probability
  &daily=weather_code,temperature_2m_max,temperature_2m_min,
         precipitation_probability_max
  &wind_speed_unit=kmh&timezone=auto&forecast_days=7
```

### Datenbank-Änderungen
- Keine (pure frontend, kein persistenter Speicher)
- Optional: `localStorage` für zuletzt gesuchten Standort

---

## Assumptions
- ASSUMED: Standort-Suche liefert Autovervollständigung (max. 5 Vorschläge via Geocoding-API)
- ASSUMED: Standard-Standort beim ersten Aufruf: kein Auto-GPS — Nutzer muss aktiv suchen
- ASSUMED: Sprache der UI: Deutsch
- ASSUMED: WMO Weather Interpretation Codes werden als Basis für Icon-Mapping verwendet

---

## Implementation Notes

1. **`transform.js`** ist das Herzstück — alle API-Responses laufen durch diese Funktion bevor sie an die UI übergeben werden. Die Rohdaten werden nie direkt angezeigt.
2. **Dark Mode** via CSS custom properties (`--bg`, `--text`, etc.) und `data-theme="dark"` auf `<html>`. Toggle-Button in der Header-Leiste.
3. **Stündliche Vorhersage** als horizontales Scroll-Container mit Snap-Points (CSS `scroll-snap-type`).
4. **Icon-Mapping:** WMO-Code → Icon-Datei. Nach Transformation zeigen alle schlechten Codes (≥51) auf "heiter-wolkig"-Icon.
5. **Fehlerbehandlung:** Bei API-Fehler oder unbekanntem Standort freundliche Fehlermeldung anzeigen (kein JS-Fehler sichtbar).

---

## Acceptance Criteria

- [ ] Stadtname eingeben → Wetterdaten werden geladen und angezeigt
- [ ] Kein Regen, Schnee, Gewitter oder Nebel ist je sichtbar (weder Icon noch Text)
- [ ] Temperaturen liegen immer bei mindestens 16°C (nach Transformation)
- [ ] 7-Tage-Forecast korrekt transformiert angezeigt
- [ ] Stündliche 24h-Vorhersage transformiert angezeigt
- [ ] Responsive: Mobile (375px) und Desktop (1280px) sehen gut aus
- [ ] Dark Mode togglebar, Farben korrekt
- [ ] Kein API-Key im Code exponiert
- [ ] Kein Hinweis auf Transformation in der UI sichtbar
- [ ] Deploybar auf GitHub Pages (kein Build-Step)
