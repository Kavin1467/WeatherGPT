# WeatherGPT 🌐
### Conversational AI for Weather Forecasting, Alerts, and Climate Information
**Ministry of Earth Sciences (MoES) | India Meteorological Department (IMD)**  
**Problem Statement ID:** 26068 | **Theme:** Disaster Management

---

## 🌟 Executive Overview
**WeatherGPT** is an intelligent conversational platform developed for the **Ministry of Earth Sciences (MoES)** and **India Meteorological Department (IMD)**. It integrates meteorological datasets, Numerical Weather Prediction (NWP) models (GFS, WRF, ECMWF), Doppler Weather Radar (DWR) telemetry, and RSMC tropical cyclone warning systems to provide accurate, contextual, and multilingual weather intelligence.

The application is delivered as a **standalone Windows executable (`WeatherGPT.exe`)** that runs natively with zero manual dependencies.

---

## 🚀 Instant Launch (Executable)

### Option 1: Standalone Windows `.exe` (Recommended)
1. Double-click **`WeatherGPT.exe`** directly in this folder or `dist/WeatherGPT.exe`.
2. A sleek native desktop window will launch instantly, loading the WeatherGPT AI interface and local engine.
3. **Shareable:** You can copy `WeatherGPT.exe` to a USB drive or send it to any Windows 10/11 machine.

### Option 2: Python Web Application
```bash
python run_app.py
```

## ✨ Key Capabilities & Features

### 1. Real-Time Meteorological Telemetry & CPCB AQI
- Live automated weather station (AWS) feeds: Temperature, Feels Like, Relative Humidity, Barometric Pressure, Wind Speed/Direction, UV Radiation Index, Cloud Cover, and Precipitation.
- Indian CPCB Air Quality Index (AQI) standard calculations for PM2.5, PM10, and NO2 with health advisories (Good, Satisfactory, Moderate, Poor, Very Poor, Severe).

### 2. Conversational AI Met-Engine (WeatherGPT)
- Natural language query understanding for current conditions, rain forecasts, cyclone bulletins, agricultural decisions, and climate trends.
- **Dual AI Mode:** Built-in meteorological reasoning core that works 100% offline with zero latency, plus support for external LLM connectors.

### 3. Numerical Weather Prediction (NWP) Multi-Model Integration
- Real-time comparison across:
  - **GFS (Global Forecast System - 0.25°)**: NCEP/NOAA global model.
  - **WRF-ARW (Regional Meso-Scale 3km)**: IMD high-resolution model.
  - **ECMWF IFS (Integrated Forecasting System - 9km)**: European Centre.
- Multi-model ensemble consensus scoring (e.g., 92% High Confidence) and Convective Available Potential Energy (**CAPE**) index for severe thunderstorm and hail risk assessment.

### 4. Extreme Weather Alerts & Disaster Management
- **IMD 4-Stage Color Warning Protocol:**
  - 🟢 Green: Normal
  - 🟡 Yellow: Watch / Be Updated
  - 🟠 Orange: Alert / Be Prepared
  - 🔴 Red: Warning / Take Immediate Action
- **RSMC New Delhi Tropical Cyclone Tracking:**
  - Real-time tracking of simulated Severe Cyclonic Storm 'VARUNA' in the Bay of Bengal.
  - Cone of uncertainty, past trajectory, forecast landfall coordinates, central pressure (hPa), maximum sustained winds, and coastal danger signals (LC-IV).
- Cloudburst and flash flood guidance for mountainous catchments (Shimla, Dehradun).
- Heatwave / Coldwave departures and Damini lightning early warnings.

### 5. Multilingual Indian Language Support (11 Languages)
Native scripts, UI localization, and speech codes for:
- English (`en-IN`)
- हिन्दी (Hindi - `hi-IN`)
- বাংলা (Bengali - `bn-IN`)
- தமிழ் (Tamil - `ta-IN`)
- తెలుగు (Telugu - `te-IN`)
- मराठी (Marathi - `mr-IN`)
- ગુજરાતી (Gujarati - `gu-IN`)
- ಕನ್ನಡ (Kannada - `kn-IN`)
- മലയാളം (Malayalam - `ml-IN`)
- ਪੰਜਾਬੀ (Punjabi - `pa-IN`)
- ଓଡ଼ିଆ (Odia - `or-IN`)

### 6. Voice-Enabled Accessibility (STT & TTS)
- **Speech-to-Text (STT):** Rural farmers and users can speak queries in regional languages using the microphone button.
- **Text-to-Speech (TTS):** Automated voice readout speaking forecasts, alerts, and farming advice aloud in regional accents.

### 7. Specialized Persona Advisories
- **🌾 Agriculture (GKMS - Gramin Krishi Mausam Sewa):** Sowing guidelines, irrigation scheduling, pesticide spraying windows (wind & rain constraints), and post-harvest storage.
- **✈️ Aviation Briefing:** Decoded ICAO METAR / TAF, flight categories (VFR/MVFR/IFR), cloud base ceiling, and crosswind limits.
- **⚓ Marine & Coastal Fishermen:** Significant wave height, swell period, sea state (rough/moderate), and small craft venturing advisories.
- **🏙️ Smart City Disaster Operations:** Urban waterlogging hotspots, pumping station readiness, and traffic advisories.

### 8. 50-Year Historical Climate Analysis (1975–2025)
- Decadal warming anomaly (+1.14°C trend line).
- Extreme rainfall event (>100mm/day) frequency charts.
- Southwest Monsoon onset variability and ENSO (El Niño / La Niña) status.

---

## 🛠️ Project Structure
```
Prototype/
├── WeatherGPT.exe         # Single standalone Windows Executable (17.1 MB)
├── run_desktop.py         # Desktop launcher using PyWebview / Edge WebView2
├── run_app.py             # Web browser launcher (python run_app.py)
├── build_exe.py           # PyInstaller automated build pipeline
├── build_exe.bat          # Windows 1-click batch build script
├── test_api.py            # Automated test suite (11 test suites)
│
├── backend/               # FastAPI Meteorological Engine
│   ├── main.py            # API Gateway & Static Asset Server
│   ├── weather_service.py # Live Open-Meteo & IMD AWS telemetry ingestion
│   ├── nwp_engine.py      # GFS / WRF / ECMWF multi-model comparisons
│   ├── disaster_alerts.py # IMD 4-Stage Alerts & RSMC Cyclone Tracker
│   └── ai_agent.py        # Conversational AI & Multilingual NLP Brain
│
└── frontend/              # Glassmorphic UI & Client Logic
    ├── index.html         # MoES & IMD Single Page Application
    ├── css/
    │   └── styles.css     # Glassmorphism, animations & design system
    └── js/
        ├── app.js         # Core coordinator & telemetry updater
        ├── chat.js        # Conversational UI & Web Speech STT/TTS
        ├── gis_map.js     # Leaflet GIS, Doppler Radar & Cyclone layers
        ├── nwp_charts.js  # Chart.js telemetry & climate charts
        └── i18n.js        # 11 Indian languages dictionary
```

---

## 🧪 Verification & Testing
To run the automated verification suite:
```bash
python test_api.py
```
All 11 automated test suites validate city resolution, AWS telemetry, CPCB AQI calculations, NWP models, RSMC cyclone tracking, disaster alerts, GKMS agro-advisories, climate trends, and conversational AI responses in both English and Indian languages.

---

## 👥 Organization & Credits
- **Organization:** Ministry of Earth Sciences (MoES), Government of India
- **Department:** India Meteorological Department (IMD)
- **Developed for:** Smart India Hackathon / MoES Innovation Initiative
