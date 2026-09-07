"""
WeatherGPT Desktop Application Launcher
Ministry of Earth Sciences (MoES) & India Meteorological Department (IMD)
Spawns embedded FastAPI backend in a background thread and presents
a native Windows Edge WebView2 window via pywebview (with fallback to default browser).
"""

import os
import sys
import time
import socket
import threading
import webbrowser
import uvicorn
from pathlib import Path

# Adjust path for PyInstaller bundle
if getattr(sys, 'frozen', False):
    bundle_dir = Path(sys._MEIPASS)
else:
    bundle_dir = Path(__file__).resolve().parent

sys.path.insert(0, str(bundle_dir))

from backend.main import app

def find_free_port(start_port=8765):
    """Finds an available TCP port."""
    for port in range(start_port, start_port + 50):
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            try:
                s.bind(('127.0.0.1', port))
                return port
            except OSError:
                continue
    return start_port

def run_server(port):
    """Runs Uvicorn server synchronously."""
    uvicorn.run(app, host="127.0.0.1", port=port, log_level="warning")

def main():
    port = find_free_port(8765)
    app_url = f"http://127.0.0.1:{port}"

    # Start FastAPI server in a background daemon thread
    server_thread = threading.Thread(target=run_server, args=(port,), daemon=True)
    server_thread.start()

    # Wait for server initialization
    time.sleep(1.2)

    # Check CLI arguments
    if "--server-only" in sys.argv:
        print(f"WeatherGPT Server running at: {app_url}")
        try:
            while True:
                time.sleep(1)
        except KeyboardInterrupt:
            print("Shutting down...")
            sys.exit(0)

    # Attempt to open native pywebview desktop window
    use_webview = True
    if "--web" in sys.argv:
        use_webview = False

    if use_webview:
        try:
            import webview
            print(f"Launching WeatherGPT Desktop Window on {app_url}...")
            window = webview.create_window(
                title="WeatherGPT - Ministry of Earth Sciences (MoES) & IMD",
                url=app_url,
                width=1380,
                height=850,
                min_size=(1024, 700),
                background_color='#070b14'
            )
            webview.start()
            return
        except Exception as e:
            print(f"PyWebview window initialization fallback: {e}")

    # Fallback to browser
    print(f"Opening WeatherGPT in default browser: {app_url}")
    webbrowser.open(app_url)
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("WeatherGPT stopped.")

if __name__ == "__main__":
    main()
