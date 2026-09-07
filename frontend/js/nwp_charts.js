/**
 * Charting & Visual Analytics Engine for WeatherGPT
 * Uses Chart.js for Hourly Telemetry, NWP Multi-Model Comparison,
 * and 50-Year Historical Climate Trends.
 */

class WeatherVisualizer {
    constructor() {
        this.hourlyChart = null;
        this.nwpChart = null;
        this.climateChart = null;
    }

    renderHourlyChart(hourlyData) {
        const canvas = document.getElementById("hourlyChartCanvas");
        if (!canvas || !window.Chart) return;

        const labels = hourlyData.map(d => d.time);
        const temps = hourlyData.map(d => d.temp);
        const pops = hourlyData.map(d => d.pop);

        if (this.hourlyChart) {
            this.hourlyChart.destroy();
        }

        const ctx = canvas.getContext("2d");
        const tempGradient = ctx.createLinearGradient(0, 0, 0, 180);
        tempGradient.addColorStop(0, "rgba(0, 240, 255, 0.45)");
        tempGradient.addColorStop(1, "rgba(0, 240, 255, 0.0)");

        this.hourlyChart = new Chart(ctx, {
            type: "line",
            data: {
                labels: labels,
                datasets: [
                    {
                        label: "Temperature (°C)",
                        data: temps,
                        borderColor: "#00f0ff",
                        borderWidth: 2.5,
                        pointBackgroundColor: "#ffffff",
                        pointRadius: 3,
                        pointHoverRadius: 6,
                        tension: 0.35,
                        fill: true,
                        backgroundColor: tempGradient,
                        yAxisID: "y"
                    },
                    {
                        label: "Rain Probability (%)",
                        data: pops,
                        type: "bar",
                        backgroundColor: "rgba(59, 130, 246, 0.4)",
                        hoverBackgroundColor: "rgba(59, 130, 246, 0.8)",
                        borderRadius: 4,
                        barPercentage: 0.5,
                        yAxisID: "y1"
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: { mode: "index", intersect: false },
                plugins: {
                    legend: {
                        labels: { color: "#94a3b8", font: { size: 11, family: "Inter" } }
                    },
                    tooltip: {
                        backgroundColor: "rgba(15, 23, 42, 0.9)",
                        titleColor: "#00f0ff",
                        borderColor: "rgba(255, 255, 255, 0.1)",
                        borderWidth: 1
                    }
                },
                scales: {
                    x: {
                        grid: { color: "rgba(255, 255, 255, 0.05)" },
                        ticks: { color: "#64748b", font: { size: 10 } }
                    },
                    y: {
                        type: "linear",
                        display: true,
                        position: "left",
                        grid: { color: "rgba(255, 255, 255, 0.05)" },
                        ticks: { color: "#00f0ff", callback: v => v + "°" }
                    },
                    y1: {
                        type: "linear",
                        display: true,
                        position: "right",
                        min: 0,
                        max: 100,
                        grid: { drawOnChartArea: false },
                        ticks: { color: "#60a5fa", callback: v => v + "%" }
                    }
                }
            }
        });
    }

    renderNwpComparisonChart(nwpData) {
        const canvas = document.getElementById("nwpChartCanvas");
        if (!canvas || !window.Chart) return;

        const timeline = nwpData.hourly_comparison || [];
        const labels = timeline.map(t => t.time);
        const gfsTemps = timeline.map(t => t.gfs_temp);
        const wrfTemps = timeline.map(t => t.wrf_temp);
        const ecmwfTemps = timeline.map(t => t.ecmwf_temp);

        if (this.nwpChart) {
            this.nwpChart.destroy();
        }

        const ctx = canvas.getContext("2d");
        this.nwpChart = new Chart(ctx, {
            type: "line",
            data: {
                labels: labels,
                datasets: [
                    {
                        label: "WRF 3km (IMD)",
                        data: wrfTemps,
                        borderColor: "#10b981",
                        backgroundColor: "rgba(16, 185, 129, 0.1)",
                        borderWidth: 2,
                        tension: 0.3
                    },
                    {
                        label: "GFS 0.25° (NOAA)",
                        data: gfsTemps,
                        borderColor: "#3b82f6",
                        borderWidth: 2,
                        borderDash: [5, 5],
                        tension: 0.3
                    },
                    {
                        label: "ECMWF IFS (Europe)",
                        data: ecmwfTemps,
                        borderColor: "#f59e0b",
                        borderWidth: 2,
                        tension: 0.3
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        labels: { color: "#cbd5e1", font: { size: 10 } }
                    }
                },
                scales: {
                    x: { grid: { color: "rgba(255, 255, 255, 0.05)" }, ticks: { color: "#64748b" } },
                    y: { grid: { color: "rgba(255, 255, 255, 0.05)" }, ticks: { color: "#cbd5e1", callback: v => v + "°C" } }
                }
            }
        });
    }

    renderClimateTrendsChart(climateData) {
        const canvas = document.getElementById("climateChartCanvas");
        if (!canvas || !window.Chart) return;

        const years = climateData.years || [1975, 1985, 1995, 2005, 2015, 2025];
        const anomalies = climateData.temp_anomalies || [-0.22, -0.08, 0.18, 0.42, 0.76, 1.14];
        const extremeEvents = climateData.extreme_rain_days || [4, 6, 7, 11, 16, 23];

        if (this.climateChart) {
            this.climateChart.destroy();
        }

        const ctx = canvas.getContext("2d");
        this.climateChart = new Chart(ctx, {
            type: "bar",
            data: {
                labels: years.map(String),
                datasets: [
                    {
                        type: "line",
                        label: "Temp Anomaly (°C)",
                        data: anomalies,
                        borderColor: "#ef4444",
                        backgroundColor: "#ef4444",
                        borderWidth: 3,
                        pointRadius: 5,
                        yAxisID: "yTemp"
                    },
                    {
                        type: "bar",
                        label: "Extreme Rain Days (>100mm)",
                        data: extremeEvents,
                        backgroundColor: "rgba(0, 240, 255, 0.65)",
                        borderRadius: 6,
                        yAxisID: "yEvents"
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: { mode: "index", intersect: false },
                plugins: {
                    legend: { labels: { color: "#cbd5e1" } }
                },
                scales: {
                    x: { grid: { color: "rgba(255, 255, 255, 0.05)" }, ticks: { color: "#94a3b8" } },
                    yTemp: {
                        position: "left",
                        grid: { color: "rgba(255, 255, 255, 0.05)" },
                        ticks: { color: "#ef4444", callback: v => (v > 0 ? "+" + v : v) + "°C" }
                    },
                    yEvents: {
                        position: "right",
                        grid: { drawOnChartArea: false },
                        ticks: { color: "#00f0ff", callback: v => v + " d" }
                    }
                }
            }
        });
    }
}

window.WeatherVisualizer = new WeatherVisualizer();
