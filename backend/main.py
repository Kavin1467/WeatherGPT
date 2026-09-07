"""
FastAPI Main Application for WeatherGPT
Ministry of Earth Sciences (MoES) & India Meteorological Department (IMD)
Unified API gateway serving Meteorological data, NWP models, Disaster Warnings,
Conversational AI, and Static Single Page Application.
"""

import os
import sys
from pathlib import Path
from fastapi import FastAPI, Query, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel
from typing import Optional, Dict, Any

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

from backend.weather_service import resolve_city_coords, reverse_geocode_coords, fetch_live_weather, get_indian_observatories
from backend.nwp_engine import calculate_nwp_comparison, get_historical_climate_trends
from backend.disaster_alerts import get_active_cyclone_system, get_regional_alerts, get_specialized_advisories, ALERT_LEVELS
from backend.ai_agent import WeatherGPTAgent, get_default_api_key

# Determine frontend directory for normal run and PyInstaller bundle
if getattr(sys, 'frozen', False):
    # PyInstaller creates a temp folder and stores path in _MEIPASS
    base_dir = Path(sys._MEIPASS)
else:
    base_dir = Path(__file__).resolve().parent.parent

frontend_dir = base_dir / "frontend"

app = FastAPI(
    title="WeatherGPT - MoES & IMD Conversational AI Platform",
    description="Conversational AI for Weather Forecasting, Alerts, and Climate Information",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.middleware("http")
async def add_cache_control_header(request: Request, call_next):
    response = await call_next(request)
    if request.url.path.startswith("/static/") or request.url.path == "/":
        response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
        response.headers["Pragma"] = "no-cache"
        response.headers["Expires"] = "0"
    return response

agent = WeatherGPTAgent()

class ChatRequest(BaseModel):
    query: str
    city: Optional[str] = "New Delhi"
    language: Optional[str] = "en"
    lat: Optional[float] = None
    lon: Optional[float] = None
    provider: Optional[str] = "builtin"
    api_key: Optional[str] = None
    model: Optional[str] = None

@app.get("/api/ai/providers")
async def get_ai_providers():
    """Returns all available AI providers, configuration status, and model metadata."""
    providers = {
        "builtin": {
            "name": "Built-in MoES Brain",
            "desc": "IMD Domain Neural Met-Engine (Offline & 100% Free)",
            "configured": True,
            "badge": "MoES Core",
            "icon": "🌐",
            "default_model": "MoES-MetBrain-v1"
        },
        "groq": {
            "name": "Groq Cloud (Qwen-3.8 27B)",
            "desc": "Ultra-fast low-latency LPU inference",
            "configured": bool(get_default_api_key("groq")),
            "badge": "Ultra Fast",
            "icon": "⚡",
            "default_model": "qwen/qwen3.8-27b"
        },
        "gemini": {
            "name": "Google Gemini (3.6 Flash)",
            "desc": "Google Multimodal Intelligence Engine",
            "configured": bool(get_default_api_key("gemini")),
            "badge": "Gemini",
            "icon": "✨",
            "default_model": "gemini-3.6-flash"
        },
        "openai": {
            "name": "OpenAI (GPT-4o / GPT-4o-mini)",
            "desc": "State-of-the-art conversational reasoning",
            "configured": bool(get_default_api_key("openai")),
            "badge": "GPT-4o",
            "icon": "🧠",
            "default_model": "gpt-4o-mini"
        },
        "anthropic": {
            "name": "Anthropic Claude (3.5 Sonnet)",
            "desc": "Advanced analytical and safety reasoning",
            "configured": bool(get_default_api_key("anthropic")),
            "badge": "Claude 3.5",
            "icon": "🤖",
            "default_model": "claude-3-5-sonnet-20241022"
        },
        "deepseek": {
            "name": "DeepSeek (DeepSeek-V3 / Chat)",
            "desc": "High-efficiency deep reasoning engine",
            "configured": bool(get_default_api_key("deepseek")),
            "badge": "DeepSeek",
            "icon": "🔮",
            "default_model": "deepseek-chat"
        },
        "mistral": {
            "name": "Mistral AI (Mistral Small / Large)",
            "desc": "European open-weight meteorological powerhouse",
            "configured": bool(get_default_api_key("mistral")),
            "badge": "Mistral",
            "icon": "🌊",
            "default_model": "mistral-small-latest"
        },
        "openrouter": {
            "name": "OpenRouter (Universal Gateway)",
            "desc": "Unified access to 200+ models with one key",
            "configured": bool(get_default_api_key("openrouter")),
            "badge": "Universal",
            "icon": "🔀",
            "default_model": "meta-llama/llama-3.3-70b-instruct"
        },
        "ollama": {
            "name": "Ollama Local (Localhost)",
            "desc": "Local private model running on 127.0.0.1:11434",
            "configured": True,
            "badge": "Local Host",
            "icon": "🦙",
            "default_model": "llama3"
        }
    }
    return {
        "providers": providers,
        "default_provider": "groq" if bool(get_default_api_key("groq")) else "builtin"
    }

@app.get("/api/health")
async def health_check():
    return {
        "status": "healthy",
        "service": "WeatherGPT MoES/IMD Core",
        "version": "1.0.0",
        "nwp_models": ["GFS_0.25", "WRF_3km", "ECMWF_IFS"],
        "languages_supported": 11,
        "ai_providers_integrated": ["openai", "anthropic", "gemini", "deepseek", "mistral", "openrouter", "groq", "ollama", "builtin"],
        "mode": "standalone_exe" if getattr(sys, 'frozen', False) else "development"
    }

@app.get("/api/weather/current")
async def get_current_weather(
    city: Optional[str] = "New Delhi",
    lat: Optional[float] = None,
    lon: Optional[float] = None
):
    try:
        if lat is not None and lon is not None:
            city_meta = reverse_geocode_coords(lat, lon)
            if city and city not in ["Observed Location", "Current Location", "New Delhi"]:
                city_meta["name"] = city
        else:
            city_meta = resolve_city_coords(city)
            lat = city_meta["lat"]
            lon = city_meta["lon"]

        weather_data = fetch_live_weather(lat, lon, city_meta)
        return weather_data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/radar/meta")
async def get_radar_meta():
    """Returns real-time global Doppler radar tile paths from RainViewer."""
    import requests
    try:
        res = requests.get("https://api.rainviewer.com/public/weather-maps.json", timeout=3.5)
        if res.status_code == 200:
            return res.json()
    except Exception:
        pass
    return {"host": "https://tilecache.rainviewer.com", "radar": {"past": []}}

@app.get("/api/nwp/compare")
async def get_nwp_comparison(
    city: Optional[str] = "New Delhi",
    lat: Optional[float] = None,
    lon: Optional[float] = None
):
    try:
        if lat is None or lon is None:
            city_meta = resolve_city_coords(city)
            lat = city_meta["lat"]
            lon = city_meta["lon"]
        
        weather = fetch_live_weather(lat, lon, resolve_city_coords(city))
        base_temp = weather["current"]["temperature"]
        base_rain = weather["current"]["precipitation"]
        
        comparison = calculate_nwp_comparison(lat, lon, base_temp, base_rain)
        return comparison
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/cyclone")
async def get_cyclone_system():
    """Returns active RSMC New Delhi tropical cyclone tracks and bulletins."""
    return get_active_cyclone_system()

@app.get("/api/alerts")
async def get_alerts(city: Optional[str] = "New Delhi"):
    """Returns IMD color-coded disaster warnings for the specified region."""
    city_meta = resolve_city_coords(city)
    weather = fetch_live_weather(city_meta["lat"], city_meta["lon"], city_meta)
    curr = weather["current"]
    alerts = get_regional_alerts(
        city_name=city_meta["name"],
        current_temp=curr["temperature"],
        humidity=curr["humidity"],
        rain_prob=weather.get("hourly", [{}])[0].get("pop", 20)
    )
    return {
        "city": city_meta["name"],
        "state": city_meta["state"],
        "alert_levels_schema": ALERT_LEVELS,
        "active_alerts": alerts
    }

@app.get("/api/advisory/{persona}")
async def get_advisories(persona: str, city: Optional[str] = "New Delhi"):
    """Returns specialized persona advisories (agriculture, aviation, marine, smart_city)."""
    city_meta = resolve_city_coords(city)
    weather = fetch_live_weather(city_meta["lat"], city_meta["lon"], city_meta)
    advisories = get_specialized_advisories(city_meta["name"], weather["current"])
    
    if persona not in advisories:
        return {"all_advisories": advisories}
    return {"city": city_meta["name"], "persona": persona, "advisory": advisories[persona]}

@app.get("/api/climate/trends")
async def get_climate_trends(city: Optional[str] = "New Delhi"):
    """Returns 50-year climate reanalysis and monsoon anomaly trends."""
    return get_historical_climate_trends(city)

@app.get("/api/observatories")
async def get_observatories():
    """Returns list of all active IMD observatories for GIS map plotting."""
    return get_indian_observatories()

@app.post("/api/chat")
async def chat_interaction(payload: ChatRequest):
    try:
        if payload.lat is not None and payload.lon is not None:
            city_meta = reverse_geocode_coords(payload.lat, payload.lon)
            if payload.city and payload.city not in ["Observed Location", "Current Location", "New Delhi"]:
                city_meta["name"] = payload.city
        else:
            city_meta = resolve_city_coords(payload.city or "New Delhi")

        weather = fetch_live_weather(city_meta["lat"], city_meta["lon"], city_meta)
        curr = weather["current"]
        
        alerts = get_regional_alerts(
            city_name=city_meta["name"],
            current_temp=curr["temperature"],
            humidity=curr["humidity"],
            rain_prob=weather.get("hourly", [{}])[0].get("pop", 20)
        )
        cyclone = get_active_cyclone_system()
        nwp = calculate_nwp_comparison(city_meta["lat"], city_meta["lon"], curr["temperature"], curr["precipitation"])
        
        context = {
            "weather": weather,
            "alerts": alerts,
            "cyclone": cyclone,
            "nwp": nwp
        }

        result = agent.process_query(
            query=payload.query,
            context=context,
            lang=payload.language or "en",
            provider=payload.provider or "builtin",
            api_key=payload.api_key,
            model=payload.model
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Static frontend files mounting
if frontend_dir.exists():
    app.mount("/static", StaticFiles(directory=str(frontend_dir)), name="static")

@app.get("/download/WeatherGPT.exe")
async def download_executable():
    """Serves the standalone Windows executable for direct download."""
    exe_path = base_dir / "WeatherGPT.exe"
    if not exe_path.exists():
        exe_path = base_dir / "dist" / "WeatherGPT.exe"
    
    if exe_path.exists() and exe_path.is_file():
        return FileResponse(
            path=str(exe_path),
            filename="WeatherGPT.exe",
            media_type="application/octet-stream",
            headers={"Content-Disposition": 'attachment; filename="WeatherGPT.exe"'}
        )
    raise HTTPException(status_code=404, detail="WeatherGPT.exe binary not found. Please compile using build_exe.py.")

@app.get("/api/download/info")
async def get_download_info():
    """Returns metadata for the downloadable Windows executable."""
    exe_path = base_dir / "WeatherGPT.exe"
    if not exe_path.exists():
        exe_path = base_dir / "dist" / "WeatherGPT.exe"
    
    if exe_path.exists():
        size_bytes = exe_path.stat().st_size
        size_mb = round(size_bytes / (1024 * 1024), 2)
        return {
            "available": True,
            "filename": "WeatherGPT.exe",
            "size_bytes": size_bytes,
            "size_mb": f"{size_mb} MB",
            "version": "3.7.0",
            "platform": "Windows 10 / 11 (64-bit)",
            "download_url": "/download/WeatherGPT.exe"
        }
    return {
        "available": False,
        "filename": "WeatherGPT.exe",
        "error": "Binary not yet compiled."
    }

@app.get("/landing")
@app.get("/download")
async def serve_landing_page():
    """Serves the dedicated product showcase and download landing webpage."""
    landing_file = frontend_dir / "landing.html"
    if landing_file.exists():
        return FileResponse(str(landing_file))
    index_file = frontend_dir / "index.html"
    if index_file.exists():
        return FileResponse(str(index_file))
    return JSONResponse({"message": "Landing page is initializing."})

@app.get("/")
async def serve_index():
    index_file = frontend_dir / "index.html"
    if index_file.exists():
        return FileResponse(str(index_file))
    return JSONResponse({"message": "WeatherGPT API is operational. Frontend initializing."})

@app.get("/{full_path:path}")
async def catch_all(full_path: str):
    file_path = frontend_dir / full_path
    if file_path.exists() and file_path.is_file():
        return FileResponse(str(file_path))
    index_file = frontend_dir / "index.html"
    if index_file.exists():
        return FileResponse(str(index_file))
    raise HTTPException(status_code=404, detail="Resource not found")

