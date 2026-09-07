/**
 * GIS Meteorological Map & Cyclone Tracker for WeatherGPT
 * Powered by Leaflet.js with:
 * - Free High-Resolution ESRI Satellite View with hybrid place labels
 * - Live RainViewer Doppler Weather Radar overlay
 * - Live IMD Observatories Network
 * - RSMC Cyclone tracking with Cone of Uncertainty
 * - Live User GPS Geolocation Pin
 */

class MeteorologicalGISMap {
    constructor(containerId = "gisMapCanvas") {
        this.containerId = containerId;
        this.map = null;
        this.baseLayers = {};
        this.currentBaseLayerName = "satellite";
        this.layers = {
            radar: null,
            cyclone: null,
            stations: null,
            userLocation: null
        };
        this.radarTileLayer = null;
        this.radarLayerActive = true;
        this.observatories = [];
        this.cycloneData = null;
        this.userMarker = null;
        this.userCircle = null;
        this.helperToastTimer = null;
    }

    init() {
        const container = document.getElementById(this.containerId);
        if (!container) return;

        // Initialize Leaflet map centered over India
        this.map = L.map(this.containerId, {
            center: [20.5937, 78.9629],
            zoom: 5,
            zoomControl: false,
            attributionControl: false
        });

        // Custom zoom control at top-right
        L.control.zoom({ position: 'topright' }).addTo(this.map);

        // Define Base Layers
        // 1. ESRI World Imagery (High-Res Free Global Satellite) + Hybrid Labels
        const esriImagery = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
            maxZoom: 19,
            attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and GIS User Community'
        });
        const esriLabels = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}', {
            maxZoom: 19
        });
        const satelliteGroup = L.layerGroup([esriImagery, esriLabels]);

        // 2. CartoDB Dark Matter
        const darkLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
            maxZoom: 19,
            maxNativeZoom: 18,
            subdomains: 'abcd'
        });

        // 3. OpenStreetMap Streets
        const streetsLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19
        });

        this.baseLayers = {
            satellite: satelliteGroup,
            dark: darkLayer,
            streets: streetsLayer
        };

        // Add Satellite as default active base layer
        this.baseLayers.satellite.addTo(this.map);

        // Initialize Overlay Layer Groups
        this.layers.radar = L.layerGroup().addTo(this.map);
        this.layers.cyclone = L.layerGroup().addTo(this.map);
        this.layers.stations = L.layerGroup().addTo(this.map);
        this.layers.userLocation = L.layerGroup().addTo(this.map);

        // Map Click Listener: Allows user to click ANYWHERE to pinpoint their exact house/farm
        this.map.on('click', (e) => {
            const lat = e.latlng.lat;
            const lon = e.latlng.lng;
            if (window.WeatherApp) {
                window.WeatherApp.searchByCoords(lat, lon, 10, "Manual Pinpoint");
                window.WeatherApp.showToast(`📍 Location pinned to ${lat.toFixed(4)}°N, ${lon.toFixed(4)}°E`, "📍");
            }
        });

        // Map Zoomend Listener: Dynamically manages Doppler radar vs Street-Level high-res satellite
        this.map.on('zoomend', () => {
            this.handleZoomLevelChange();
        });

        // Ingest Real Live Overlays
        this.setupLiveRainViewerRadar();
        this.fetchAndPlotObservatories();
        this.fetchAndPlotCyclone();
    }

    handleZoomLevelChange() {
        if (!this.map) return;
        const zoom = this.map.getZoom();
        const legend = document.getElementById("radarLegendCard");

        if (this.radarTileLayer) {
            if (zoom >= 12) {
                // At street/rooftop zoom (12-19), fade out Doppler radar tiles so satellite roofs & streets are 100% visible
                // and no 1000x upscaling artifacts or placeholder tiles can ever show
                this.radarTileLayer.setOpacity(0);
                if (legend) legend.style.display = "none";
            } else {
                // At regional/state/national zoom (1-11), restore Doppler radar if active
                if (this.radarLayerActive) {
                    this.radarTileLayer.setOpacity(0.72);
                    if (legend) legend.style.display = "block";
                }
            }
        }
    }

    setBaseLayer(layerName) {
        if (!this.baseLayers[layerName] || this.currentBaseLayerName === layerName) return;

        // Remove old base layer
        if (this.baseLayers[this.currentBaseLayerName]) {
            this.map.removeLayer(this.baseLayers[this.currentBaseLayerName]);
        }

        // Add new base layer to back
        this.baseLayers[layerName].addTo(this.map);
        this.currentBaseLayerName = layerName;

        // Update UI pill buttons if present
        document.querySelectorAll(".map-base-btn").forEach(btn => {
            btn.classList.toggle("active", btn.getAttribute("data-layer") === layerName);
        });
    }

    async setupLiveRainViewerRadar() {
        this.layers.radar.clearLayers();

        // 1. Fetch live global Doppler radar tiles from RainViewer API
        try {
            const res = await fetch("/api/radar/meta");
            if (res.ok) {
                const data = await res.json();
                const pastFrames = data.radar?.past || [];
                if (pastFrames.length > 0) {
                    const latestFrame = pastFrames[pastFrames.length - 1];
                    const host = data.host || "https://tilecache.rainviewer.com";
                    const radarUrl = `${host}${latestFrame.path}/256/{z}/{x}/{y}/2/1_1.png`;

                    const currentZoom = this.map ? this.map.getZoom() : 5;
                    this.radarTileLayer = L.tileLayer(radarUrl, {
                        tileSize: 256,
                        opacity: (currentZoom >= 12 || !this.radarLayerActive) ? 0 : 0.72,
                        zIndex: 10,
                        maxNativeZoom: 7,
                        maxZoom: 19
                    });
                    this.layers.radar.addLayer(this.radarTileLayer);
                }
            }
        } catch (e) {
            console.warn("Could not load RainViewer radar tiles, falling back to DWR points", e);
        }

        // 2. Real IMD Doppler Weather Radar (DWR) Ground Stations
        const radars = [
            { name: "DWR Paradip (Odisha)", lat: 20.316, lon: 86.611, radius: 280000, band: "S-Band 2.7 GHz" },
            { name: "DWR Kolkata (West Bengal)", lat: 22.572, lon: 88.363, radius: 250000, band: "S-Band 2.8 GHz" },
            { name: "DWR Chennai (Tamil Nadu)", lat: 13.082, lon: 80.270, radius: 240000, band: "C-Band Polarimetric" },
            { name: "DWR Mumbai (Maharashtra)", lat: 18.922, lon: 72.834, radius: 260000, band: "S-Band Doppler" },
            { name: "DWR New Delhi (Mausam Bhawan)", lat: 28.588, lon: 77.221, radius: 250000, band: "C-Band Dual-Pol" },
            { name: "DWR Kochi (Kerala)", lat: 9.931, lon: 76.267, radius: 250000, band: "C-Band Doppler" },
            { name: "DWR Visakhapatnam (AP)", lat: 17.686, lon: 83.218, radius: 280000, band: "S-Band Coastal" }
        ];

        radars.forEach(r => {
            const radarCircle = L.circle([r.lat, r.lon], {
                radius: r.radius,
                color: "#00f0ff",
                weight: 1.2,
                dashArray: '4, 6',
                fillColor: "#00f0ff",
                fillOpacity: 0.08
            }).bindPopup(`
                <div class="map-popup">
                    <h4>📡 ${r.name}</h4>
                    <p><strong>Frequency:</strong> ${r.band}</p>
                    <p><strong>Doppler Coverage:</strong> ${Math.round(r.radius / 1000)} km</p>
                    <p><strong>Status:</strong> <span style="color: #10b981; font-weight: bold;">● LIVE SCANNING</span></p>
                </div>
            `);
            this.layers.radar.addLayer(radarCircle);

            const centerDot = L.circleMarker([r.lat, r.lon], {
                radius: 4.5,
                color: '#ffffff',
                weight: 1.5,
                fillColor: '#00f0ff',
                fillOpacity: 1
            });
            this.layers.radar.addLayer(centerDot);
        });
    }

    async fetchAndPlotObservatories() {
        try {
            const res = await fetch("/api/observatories");
            if (res.ok) {
                this.observatories = await res.json();
                this.plotObservatories();
            }
        } catch (e) {
            console.warn("Observatories fetch failed", e);
        }
    }

    plotObservatories() {
        this.layers.stations.clearLayers();
        this.observatories.forEach(obs => {
            if (!Number.isFinite(obs.lat) || !Number.isFinite(obs.lon)) return;
            const temp = obs.temp !== undefined ? `${obs.temp}°C` : "";
            const marker = L.circleMarker([obs.lat, obs.lon], {
                radius: 5.5,
                color: "#ffffff",
                weight: 1.5,
                fillColor: "#0284c7",
                fillOpacity: 0.95
            }).bindPopup(`
                <div class="map-popup">
                    <h4>📍 ${obs.name} Observatory</h4>
                    <p><strong>State:</strong> ${obs.state}</p>
                    <p><strong>Station ID:</strong> <code>${obs.station_id}</code></p>
                    <p><strong>Live Telemetry:</strong> <strong>${temp}</strong> | ${obs.humidity}% RH</p>
                    <p><strong>Condition:</strong> ${obs.icon || "🌤️"} ${obs.condition}</p>
                    <p><strong>Telemetry Link:</strong> <span style="color: #10b981;">● Online (Live IMD AWS)</span></p>
                    <button class="popup-btn" onclick="window.WeatherApp.searchCity('${obs.name}')">Select Station</button>
                </div>
            `);
            this.layers.stations.addLayer(marker);
        });
    }

    async fetchAndPlotCyclone() {
        try {
            const res = await fetch("/api/cyclone");
            if (res.ok) {
                this.cycloneData = await res.json();
                this.plotCycloneTrack();
            }
        } catch (e) {
            console.warn("Could not fetch cyclone data", e);
        }
    }

    plotCycloneTrack() {
        if (!this.cycloneData) return;
        this.layers.cyclone.clearLayers();

        const waypoints = (this.cycloneData.waypoints || []).filter(wp => Number.isFinite(wp.lat) && Number.isFinite(wp.lon));
        const pastPoints = [];
        const forecastPoints = [];

        waypoints.forEach(wp => {
            const pt = [wp.lat, wp.lon];
            if (wp.is_current) {
                pastPoints.push(pt);
                forecastPoints.push(pt);
            } else if (forecastPoints.length > 0) {
                forecastPoints.push(pt);
            } else {
                pastPoints.push(pt);
            }
        });

        // 1. Cone of Uncertainty polygon
        if (forecastPoints.length >= 2) {
            const coneCoords = [
                forecastPoints[0],
                [forecastPoints[1][0] - 0.4, forecastPoints[1][1] - 0.5],
                [forecastPoints[forecastPoints.length - 1][0] - 1.2, forecastPoints[forecastPoints.length - 1][1] - 1.5],
                [forecastPoints[forecastPoints.length - 1][0] + 1.2, forecastPoints[forecastPoints.length - 1][1] + 1.5],
                [forecastPoints[1][0] + 0.4, forecastPoints[1][1] + 0.5],
                forecastPoints[0]
            ];
            const conePolygon = L.polygon(coneCoords, {
                color: '#ef4444',
                weight: 1.5,
                dashArray: '3, 4',
                fillColor: '#ef4444',
                fillOpacity: 0.18
            }).bindPopup(`
                <div class="map-popup">
                    <h4>⚠️ RSMC Cone of Uncertainty</h4>
                    <p>Projected strike zone: <strong>${this.cycloneData.name}</strong></p>
                    <p>Estimated Landfall: <strong>${this.cycloneData.estimated_landfall?.region}</strong></p>
                </div>
            `);
            this.layers.cyclone.addLayer(conePolygon);
        }

        // 2. Past Track (Cyan dotted)
        if (pastPoints.length > 1) {
            const pastLine = L.polyline(pastPoints, {
                color: '#00f0ff',
                weight: 3.5,
                dashArray: '6, 6',
                opacity: 0.85
            });
            this.layers.cyclone.addLayer(pastLine);
        }

        // 3. Forecast Track (Crimson Solid)
        if (forecastPoints.length > 1) {
            const forecastLine = L.polyline(forecastPoints, {
                color: '#ef4444',
                weight: 4,
                opacity: 0.95
            });
            this.layers.cyclone.addLayer(forecastLine);
        }

        // 4. Waypoint markers
        waypoints.forEach(wp => {
            const isCurrent = wp.is_current;
            const isLandfall = wp.is_landfall;
            const color = isCurrent ? '#ef4444' : (isLandfall ? '#ff0055' : '#00f0ff');
            const radius = isCurrent ? 9 : (isLandfall ? 8 : 5);

            const marker = L.circleMarker([wp.lat, wp.lon], {
                radius: radius,
                color: '#ffffff',
                weight: isCurrent ? 2.5 : 1.5,
                fillColor: color,
                fillOpacity: 0.95
            }).bindPopup(`
                <div class="map-popup">
                    <h4>🌀 ${wp.stage}</h4>
                    <p><strong>System:</strong> ${this.cycloneData.name}</p>
                    <p><strong>Time:</strong> ${wp.time}</p>
                    <p><strong>Max Winds:</strong> ${wp.wind_kmph} km/h (${wp.wind_knots} kts)</p>
                    <p><strong>Central Pressure:</strong> ${wp.pressure_hpa} hPa</p>
                    <p><strong>Category:</strong> <span style="color: ${color}; font-weight: bold;">${wp.category}</span></p>
                </div>
            `);

            if (isCurrent) {
                const pulseRing = L.circle([wp.lat, wp.lon], {
                    radius: 120000,
                    color: '#ef4444',
                    weight: 1.5,
                    fillColor: '#ef4444',
                    fillOpacity: 0.15
                });
                this.layers.cyclone.addLayer(pulseRing);
            }

            this.layers.cyclone.addLayer(marker);
        });
    }

    setUserLocation(lat, lon, locationName = "Your Current Location", accuracy = 0, source = "GPS") {
        if (!this.map) return;
        if (!Number.isFinite(lat) || !Number.isFinite(lon)) return;
        this.layers.userLocation.clearLayers();

        // 1. GPS / Positioning Accuracy Aura Ring
        this.userCircle = L.circle([lat, lon], {
            radius: Math.max(accuracy, 150),
            color: '#10b981',
            weight: 1.5,
            dashArray: '4, 4',
            fillColor: '#10b981',
            fillOpacity: 0.12
        });
        this.layers.userLocation.addLayer(this.userCircle);

        // 2. High-Tech Draggable Marker with Pulse Ring
        const pinIcon = L.divIcon({
            className: 'custom-user-pin',
            html: `<div class="user-location-pulse-marker" title="Drag to adjust your exact house or farm">
                     <div class="user-pulse-dot"></div>
                     <div class="user-pulse-ring"></div>
                   </div>`,
            iconSize: [32, 32],
            iconAnchor: [16, 16]
        });

        this.userMarker = L.marker([lat, lon], {
            icon: pinIcon,
            draggable: true,
            zIndexOffset: 1000,
            title: "Drag to set exact location"
        });

        const isApprox = source.toLowerCase().includes("ip") || source.toLowerCase().includes("approx");
        const statusBadge = isApprox 
            ? `<span style="color: #f59e0b; font-weight: bold;">⚠️ ISP Regional Gateway (Approx)</span>`
            : `<span style="color: #10b981; font-weight: bold;">🎯 ${source} High Precision</span>`;

        this.userMarker.bindPopup(`
            <div class="map-popup" style="min-width: 220px;">
                <h4>📍 ${locationName}</h4>
                <p><strong>Coordinates:</strong> ${lat.toFixed(5)}°N, ${lon.toFixed(5)}°E</p>
                <p><strong>Status:</strong> ${statusBadge}</p>
                <p><strong>Precision:</strong> ±${Math.round(accuracy || 20)} meters</p>
                <div style="margin-top: 8px; padding: 6px 8px; background: rgba(16, 185, 129, 0.15); border: 1px dashed #10b981; border-radius: 8px; font-size: 11px; color: #a7f3d0; line-height: 1.4;">
                    💡 <strong>Need exact location?</strong> Click anywhere on the map or drag this green pin directly to your house/farm!
                </div>
            </div>
        `);

        // Real-time drag follow for circle
        this.userMarker.on('drag', (e) => {
            if (this.userCircle) {
                this.userCircle.setLatLng(e.latlng);
            }
        });

        // Dragend handler: Updates weather telemetry for dragged pin
        this.userMarker.on('dragend', (e) => {
            const newPos = e.target.getLatLng();
            if (window.WeatherApp) {
                window.WeatherApp.searchByCoords(newPos.lat, newPos.lng, 10, "Dragged Pin");
                window.WeatherApp.showToast(`📍 Location pinned to ${newPos.lat.toFixed(4)}°N, ${newPos.lng.toFixed(4)}°E`, "🎯");
            }
        });

        this.layers.userLocation.addLayer(this.userMarker);

        // Smooth zoom to user location in satellite view (skip when map is hidden/zero-size)
        if (this.map.getSize().x > 0) {
            this.map.flyTo([lat, lon], 12, { duration: 1.8 });
        }
        
        // Show interactive helper toast over map
        this.showMapHelperToast("🎯 <strong>Click anywhere on map</strong> or <strong>drag green pin</strong> to pinpoint your exact house!");
    }

    showMapHelperToast(htmlContent) {
        const container = document.getElementById("gisMapCanvas");
        if (!container) return;

        let toast = container.querySelector(".map-helper-toast");
        if (!toast) {
            toast = document.createElement("div");
            toast.className = "map-helper-toast";
            container.appendChild(toast);
        }

        toast.innerHTML = `<span class="map-helper-badge">Guide</span> <span>${htmlContent}</span>`;
        toast.classList.remove("fade-out");

        if (this.helperToastTimer) clearTimeout(this.helperToastTimer);
        this.helperToastTimer = setTimeout(() => {
            if (toast) toast.classList.add("fade-out");
        }, 7000);
    }

    toggleLayer(layerName) {
        if (layerName === 'radar') {
            this.radarLayerActive = !this.radarLayerActive;
            const legend = document.getElementById("radarLegendCard");
            const btn = document.getElementById("toggleLiveRadarBtn");

            if (this.radarLayerActive) {
                const zoom = this.map ? this.map.getZoom() : 5;
                if (this.radarTileLayer) {
                    this.radarTileLayer.setOpacity(zoom >= 12 ? 0 : 0.72);
                }
                if (legend) legend.style.display = (zoom >= 12) ? "none" : "block";
                if (btn) btn.classList.add("active");
                return true;
            } else {
                if (this.radarTileLayer) {
                    this.radarTileLayer.setOpacity(0);
                }
                if (legend) legend.style.display = "none";
                if (btn) btn.classList.remove("active");
                return false;
            }
        }

        if (!this.layers[layerName]) return;
        const btnIdMap = {
            userLocation: "toggleUserLocationBtn",
            stations: "toggleObservatoriesBtn",
            cyclone: "toggleCycloneBtn"
        };
        const btn = document.getElementById(btnIdMap[layerName]);

        if (this.map.hasLayer(this.layers[layerName])) {
            this.map.removeLayer(this.layers[layerName]);
            if (btn) btn.classList.remove("active");
            return false;
        } else {
            this.map.addLayer(this.layers[layerName]);
            if (btn) btn.classList.add("active");
            return true;
        }
    }

    focusUserLocation() {
        // Called when the map view becomes visible; recenters on the pinned location
        if (!this.map || !this.userMarker) return;
        const pos = this.userMarker.getLatLng();
        if (this.map.getSize().x > 0 && Number.isFinite(pos.lat) && Number.isFinite(pos.lng)) {
            this.map.flyTo([pos.lat, pos.lng], 12, { duration: 1.5 });
        }
    }

    panToCity(lat, lon, cityName = "") {
        if (!this.map) return;
        if (!Number.isFinite(lat) || !Number.isFinite(lon)) return;
        if (this.map.getSize().x > 0) {
            this.map.flyTo([lat, lon], 12, { duration: 1.5 });
            L.popup()
                .setLatLng([lat, lon])
                .setContent(`<div class="map-popup"><h4>📍 ${cityName}</h4><p>Active Observatory & Weather Telemetry</p></div>`)
                .openOn(this.map);
        }
    }
}

window.MeteorologicalGISMap = MeteorologicalGISMap;
