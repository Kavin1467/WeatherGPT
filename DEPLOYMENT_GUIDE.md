# WeatherGPT Web & Desktop Deployment Guide
### Ministry of Earth Sciences (MoES) & India Meteorological Department (IMD)

This guide walks you through publishing **WeatherGPT** to the internet so anyone in the world can visit your website, try the web application online, and click **Download** to get `WeatherGPT.exe`.

---

## 🌟 Available URLs Once Deployed
- **Product Showcase & Download Landing Page**: `https://your-domain.com/landing` (or `/download`)
- **Direct Windows .EXE Download**: `https://your-domain.com/download/WeatherGPT.exe`
- **Live Interactive Web App**: `https://your-domain.com/`

---

## 🚀 Option 1: 1-Click Free Cloud Deployment on Render.com (Recommended)

Render offers free cloud web hosting with automatic HTTPS SSL, continuous deployment from GitHub, and file-serving capabilities.

### Steps:
1. **Push your code to GitHub**:
   ```bash
   git init
   git add .
   git commit -m "WeatherGPT v3.7 Release with Landing Page & Windows Executable"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/WeatherGPT.git
   git push -u origin main
   ```
   *(Note: Make sure `WeatherGPT.exe` is included in the commit so Render can serve the download directly, or use Git LFS if your repo prefers).*

2. **Deploy on Render**:
   - Go to [render.com](https://render.com) and Sign In with your GitHub account.
   - Click **New +** &rarr; **Web Service**.
   - Select your **WeatherGPT** GitHub repository.
   - Set:
     - **Name**: `weathergpt`
     - **Runtime**: `Python 3`
     - **Build Command**: `pip install -r requirements.txt`
     - **Start Command**: `uvicorn backend.main:app --host 0.0.0.0 --port $PORT`
     - **Instance Type**: `Free`
   - Click **Deploy Web Service**.
3. **Done!**
   - Render gives you a public URL like: `https://weathergpt.onrender.com`
   - Share `https://weathergpt.onrender.com/landing` with anyone. When they click **Download for Windows**, it downloads `WeatherGPT.exe` directly!

---

## 🚂 Option 2: 1-Click Deployment on Railway.app

1. Go to [railway.app](https://railway.app) and sign in.
2. Click **New Project** &rarr; **Deploy from GitHub repo**.
3. Select your `WeatherGPT` repository.
4. Railway automatically detects `railway.toml` and `Procfile` and deploys the application.
5. In your project settings, click **Generate Domain** to get your public `https://xxx.up.railway.app` URL.

---

## 🐙 Option 3: Free Zero-Cost Hosting via GitHub Releases + GitHub Pages

If you want **unlimited fast downloads** of `WeatherGPT.exe` backed by GitHub's global CDN:

1. **Create a GitHub Release**:
   - On your GitHub repo page, click **Releases** &rarr; **Draft a new release**.
   - Tag version: `v3.7.0`
   - Title: `WeatherGPT v3.7.0 Pro Release`
   - Drag and drop `WeatherGPT.exe` into the binary upload box.
   - Click **Publish release**.
   - Right-click the uploaded `WeatherGPT.exe` asset and select **Copy link address** (e.g. `https://github.com/USERNAME/REPO/releases/download/v3.7.0/WeatherGPT.exe`).
2. **Update the Download Link**:
   - In `frontend/landing.html`, you can paste this direct GitHub release URL into `heroDownloadBtn` href:
     ```html
     <a href="https://github.com/USERNAME/REPO/releases/download/v3.7.0/WeatherGPT.exe" class="btn-primary-download" download>
     ```
3. **Enable GitHub Pages**:
   - In your repo settings, go to **Pages** &rarr; Select `main` branch &rarr; `/ (root)` or `frontend/` folder &rarr; Save.
   - Your landing page will be live at `https://USERNAME.github.io/REPO/frontend/landing.html`.

---

## 🐳 Option 4: Docker Container Deployment (Self-Hosted / VPS)

If you have a Linux VPS (DigitalOcean, AWS EC2, GCP Compute Engine, Linode):

1. **Build the Docker image**:
   ```bash
   docker build -t weathergpt:latest .
   ```
2. **Run the container**:
   ```bash
   docker run -d -p 80:8000 --name weathergpt --restart always weathergpt:latest
   ```
3. Your server is live on your VPS IP address or domain:
   - Landing page: `http://YOUR_SERVER_IP/landing`
   - Web application: `http://YOUR_SERVER_IP/`
   - Direct download: `http://YOUR_SERVER_IP/download/WeatherGPT.exe`

---

## 💻 Running Locally on Windows
To run and test the complete suite locally anytime:
```powershell
# Run standalone desktop executable:
.\WeatherGPT.exe

# Or run local web server with landing page & API:
.\.venv\Scripts\python.exe run_desktop.py --server-only
```
Then visit in your browser:
- `http://127.0.0.1:8765/landing` (Showcase and Download page)
- `http://127.0.0.1:8765/download/WeatherGPT.exe` (Direct executable download)
- `http://127.0.0.1:8765/` (Interactive Web Application)
