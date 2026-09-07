"""
Convenient Developer & Local Runner for WeatherGPT
Run this with: python run_app.py
"""

import sys
import webbrowser
import threading
import time
import uvicorn
from backend.main import app

def open_browser():
    time.sleep(1.2)
    print("Launching WeatherGPT interface at http://127.0.0.1:8765 ...")
    webbrowser.open("http://127.0.0.1:8765")

if __name__ == "__main__":
    if "--no-browser" not in sys.argv:
        threading.Thread(target=open_browser, daemon=True).start()
    uvicorn.run("backend.main:app", host="127.0.0.1", port=8765, reload=False)
