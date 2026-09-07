# WeatherGPT Docker Container
# Ministry of Earth Sciences (MoES) & India Meteorological Department (IMD)
FROM python:3.11-slim

WORKDIR /app

# Set environment variables
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PORT=8000

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy dependency requirements
COPY requirements.txt .

# Install Python requirements (excluding desktop GUI libs if not available)
RUN pip install --no-cache-dir \
    fastapi>=0.110.0 \
    uvicorn>=0.28.0 \
    requests>=2.31.0 \
    pydantic>=2.6.0 \
    python-dotenv>=1.0.1 \
    httpx>=0.27.0

# Copy application files
COPY backend/ ./backend/
COPY frontend/ ./frontend/
COPY WeatherGPT.exe ./WeatherGPT.exe

# Expose server port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:${PORT}/api/observatories || exit 1

# Launch FastAPI web server via Uvicorn
CMD ["sh", "-c", "uvicorn backend.main:app --host 0.0.0.0 --port ${PORT}"]
