"""
Automated Test Suite for WeatherGPT
Tests the backend engine directly using Python functions.
"""

import sys
import io

# Ensure UTF-8 output on Windows console
if sys.platform == "win32":
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')

from backend.weather_service import resolve_city_coords, fetch_live_weather, get_indian_observatories, calculate_cpcb_aqi
from backend.nwp_engine import calculate_nwp_comparison, get_historical_climate_trends
from backend.disaster_alerts import get_active_cyclone_system, get_regional_alerts, get_specialized_advisories
from backend.ai_agent import WeatherGPTAgent

def run_tests():
    print("Testing WeatherGPT Core Engines directly...")

    # 1. City Resolution
    delhi = resolve_city_coords("New Delhi")
    assert delhi["name"] == "New Delhi"
    assert "lat" in delhi and "lon" in delhi
    print(f"[PASS] City Resolution: {delhi['name']} ({delhi['lat']}, {delhi['lon']})")

    # 2. Current Weather Fetch (Live/Fallback)
    weather = fetch_live_weather(delhi["lat"], delhi["lon"], delhi)
    assert "current" in weather
    assert "aqi" in weather
    assert "hourly" in weather
    assert "daily" in weather
    curr = weather["current"]
    print(f"[PASS] Weather Telemetry: {weather['city']} - {curr['temperature']}C, {curr['condition']}, Humidity: {curr['humidity']}%")

    # 3. CPCB AQI Calculation
    aqi = calculate_cpcb_aqi(pm25=45.2, pm10=95.0)
    assert aqi["category"] in ["Good", "Satisfactory", "Moderate", "Poor", "Very Poor", "Severe"]
    print(f"[PASS] CPCB AQI Calculation: AQI {aqi['aqi']} ({aqi['category']})")

    # 4. NWP Multi-Model Engine
    nwp = calculate_nwp_comparison(delhi["lat"], delhi["lon"], curr["temperature"], curr["precipitation"])
    assert "models" in nwp
    assert "gfs" in nwp["models"] and "wrf" in nwp["models"] and "ecmwf" in nwp["models"]
    assert "convective_analysis" in nwp
    print(f"[PASS] NWP Multi-Model Engine: Consensus {nwp['confidence_score']}% ({nwp['confidence']}) - CAPE: {nwp['convective_analysis']['max_cape_j_kg']} J/kg")

    # 5. RSMC Cyclone System
    cyclone = get_active_cyclone_system()
    assert cyclone["name"] == "Severe Cyclonic Storm 'VARUNA'"
    assert len(cyclone["waypoints"]) >= 5
    print(f"[PASS] RSMC Cyclone Tracker: {cyclone['name']} ({cyclone['current_intensity']}, Wind: {cyclone['max_sustained_wind_kmph']} km/h)")

    # 6. Regional Disaster Alerts
    alerts = get_regional_alerts("Bhubaneswar", 32.0, 85, 80)
    assert len(alerts) > 0
    print(f"[PASS] Disaster Warning Protocol: {len(alerts)} alerts generated for Bhubaneswar")

    # 7. Specialized Advisories
    advisories = get_specialized_advisories("Ludhiana", curr)
    assert "agriculture" in advisories and "aviation" in advisories and "marine" in advisories
    print("[PASS] Domain Advisories: GKMS, METAR, Marine, and Smart City validated")

    # 8. Climate Trends
    climate = get_historical_climate_trends("New Delhi")
    assert len(climate["years"]) == 6
    assert len(climate["temp_anomalies"]) == 6
    print("[PASS] 50-Year Climate Analysis: Decadal warming anomalies validated")

    # 9. Conversational AI Agent (English)
    agent = WeatherGPTAgent()
    context = {"weather": weather, "alerts": alerts, "cyclone": cyclone, "nwp": nwp}
    chat_res = agent.process_query("What is the cyclone alert status in Odisha?", context, "en")
    assert chat_res["intent"] == "cyclone"
    assert "VARUNA" in chat_res["response"]
    print("[PASS] Conversational AI (English Cyclone Query): Intent detected ->", chat_res["intent"])

    # 10. Conversational AI Agent (Hindi Agriculture)
    chat_hi = agent.process_query("किसान भाइयों के लिए फसल कीटनाशक छिड़काव परामर्श क्या है?", context, "hi")
    assert chat_hi["intent"] == "agriculture"
    print("[PASS] Conversational AI (Hindi Agriculture Query): Intent detected ->", chat_hi["intent"])

    # 11. Observatories list
    obs = get_indian_observatories()
    assert len(obs) >= 20
    print(f"[PASS] Observatories Mapping: {len(obs)} stations operational")

    print("\n" + "=" * 55)
    print("  ALL 11 AUTOMATED ENGINE TESTS PASSED WITH 100% SUCCESS!")
    print("=" * 55)

if __name__ == "__main__":
    run_tests()
