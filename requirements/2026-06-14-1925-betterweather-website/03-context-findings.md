# Context Findings (Phase 3)

## Projektstand
- Leeres Repository (nur .git, keine bestehende Codebasis)
- Neues Projekt from scratch

## Technische Rahmenbedingungen

### Wetter-API
- **OpenWeatherMap** (free tier): aktuelles Wetter + 5-Tage-Forecast, JSON, kostenlos bis 1000 req/day
  - `GET /weather?q={city}` → aktuelles Wetter
  - `GET /forecast?q={city}` → 5-Tage in 3h-Schritten
- Alternativ: Open-Meteo (kostenlos, kein API-Key nötig, gute Abdeckung)
- Geo-Suche: OpenWeatherMap Geocoding API oder Nominatim (OpenStreetMap, kostenlos)

### Transformations-Logik (Kernfunktion)
Mapping: echte Wetterdaten → optimistische Darstellung

| Echt | BetterWeather |
|------|--------------|
| Regen, Gewitter, Schnee, Nebel | → "Heiter bis wolkig" |
| Bewölkt | → "Leicht bewölkt" |
| Temperatur < 15°C | → +3–6°C angehoben |
| Temperatur 15–20°C | → +1–3°C angehoben |
| Temperatur > 25°C | → unverändert |
| Windstärke > 30 km/h | → auf max. 15 km/h reduziert |
| Luftfeuchtigkeit > 80% | → auf max. 60% reduziert |
| Niederschlagswahrsch. > 30% | → auf max. 10% gesetzt |

### Frontend-Architektur
Da kein Backend-Zwang: **Static Site / Pure Frontend** (HTML + CSS + vanilla JS oder leichtes Framework)
- Option A: Vanilla HTML/CSS/JS (einfach, keine Dependencies)
- Option B: React/Vue/Svelte (komponentenbasiert, gut für Forecast-Cards)
- Wetter-Icons: z.B. `weathericons`, `meteocons` oder SVG-Set

### Typische Wetter-Website-Features (für Authentizität)
- Aktuelles Wetter: Icon, Temperatur, Gefühlte Temperatur, Wind, Luftfeuchtigkeit, Luftdruck, Sichtweite
- Forecast: 7-Tage-Cards mit Min/Max-Temp, Icon, Kurztext
- Stündliche Vorhersage (optional)
- Standortsuche mit Autovervollständigung

### Sicherheitshinweis
API-Key darf nicht im Frontend-Code exponiert sein → entweder Open-Meteo (kein Key nötig) oder kleines Backend/Proxy verwenden.

## Entscheidungsoffene Punkte für Phase 4
- Welches Framework / Tech Stack?
- Open-Meteo vs. OpenWeatherMap (API-Key-Problematik)?
- Humor/Easter-Egg versteckt oder komplett straight?
- Stündliche Vorhersage ja/nein?
- Dark Mode?
