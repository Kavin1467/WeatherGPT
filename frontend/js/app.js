/**
   WeatherGPT - Main Application Orchestrator
   Coordinates Telemetry, Navigation Views, GIS Radar Map,
   Conversational AI Studio, Personalize/Themes, Auth, and Multi-Model NWP.
*/

class WeatherAppOrchestrator {
    constructor() {
        this.currentCity = "New Delhi";
        this.currentCoords = { lat: 28.6139, lon: 77.2090 };
        this.activePersona = "farmer";
        this.currentView = "dashboard";
        this.gisMap = null;
        this.chat = null;
        this.weatherData = null;
        this.nwpData = null;
        this.alertsData = null;

        // User Preferences & State
        this.units = JSON.parse(localStorage.getItem("weathergpt_units") || '{"temp":"c","wind":"kmh","pressure":"hpa"}');
        this.favoriteCities = JSON.parse(localStorage.getItem("weathergpt_favorites") || '["New Delhi", "Mumbai", "Kolkata", "Chennai", "Bengaluru", "Bhubaneswar", "Shimla", "Guwahati"]');
        this.currentUser = JSON.parse(localStorage.getItem("weathergpt_user") || 'null');

        this.init();
    }

    async init() {
        // Initialize i18n
        if (window.I18N) window.I18N.init = true;

        this.applyTheme(localStorage.getItem("weathergpt_theme") || "cyber");
        this.setupNavigation();
        this.setupMobileShell();
        this.setupLanguageSelector();
        this.setupSearch();
        this.setupPersonaTabs();
        this.setupClock();
        this.setupModals();
        this.setupPersonalize();
        this.setupAuth();
        this.renderFavoriteChips();

        // Initialize GIS Map and Chat
        this.gisMap = new window.MeteorologicalGISMap("gisMapCanvas");
        this.gisMap.init();

        this.chat = new window.WeatherChat();

        // Automatically detect user's location on startup (GPS or IP)
        await this.autoDetectStartupLocation();
    }

    /* ==========================================================================
       1. Top Navigation & View Switcher
       ========================================================================== */

    setupNavigation() {
        const navButtons = document.querySelectorAll(".nav-tab");
        navButtons.forEach(btn => {
            btn.addEventListener("click", () => {
                const targetView = btn.getAttribute("data-view");
                this.switchView(targetView);
            });
        });

        // Quick Launch Buttons from Dashboard
        const launchFullChatBtn = document.getElementById("launchFullChatBtn");
        if (launchFullChatBtn) {
            launchFullChatBtn.addEventListener("click", () => this.switchView("chat"));
        }

        const quickAskSendBtn = document.getElementById("quickAskSendBtn");
        const quickAskInput = document.getElementById("quickAskInput");
        if (quickAskSendBtn && quickAskInput) {
            const handleQuickAsk = () => {
                const q = quickAskInput.value.trim();
                if (q) {
                    this.switchView("chat");
                    const chatInput = document.getElementById("chatInput");
                    if (chatInput) {
                        chatInput.value = q;
                        document.getElementById("chatSendBtn")?.click();
                    }
                    quickAskInput.value = "";
                }
            };
            quickAskSendBtn.addEventListener("click", handleQuickAsk);
            quickAskInput.addEventListener("keydown", (e) => {
                if (e.key === "Enter") handleQuickAsk();
            });
        }

        document.querySelectorAll(".quick-ask-tag").forEach(tag => {
            tag.addEventListener("click", () => {
                const q = tag.getAttribute("data-query");
                if (q) {
                    this.switchView("chat");
                    const chatInput = document.getElementById("chatInput");
                    if (chatInput) {
                        chatInput.value = q;
                        document.getElementById("chatSendBtn")?.click();
                    }
                }
            });
        });

        const refreshClimateBtn = document.getElementById("refreshClimateBtn");
        if (refreshClimateBtn) {
            refreshClimateBtn.addEventListener("click", () => {
                this.loadClimateTrends();
                this.showToast("Refreshed 50-Year Climate Analysis data", "📈");
            });
        }
    }

    switchView(viewName) {
        this.currentView = viewName;

        // Update nav buttons (desktop tabs, drawer items & bottom bar)
        document.querySelectorAll(".nav-tab, .mobile-nav-item, .drawer-nav-card, .bottom-nav-item").forEach(btn => {
            btn.classList.toggle("active", btn.getAttribute("data-view") === viewName);
        });

        // Update header active view indicator pill
        const viewMetaMap = {
            dashboard: { icon: "📊", label: "Dashboard" },
            map: { icon: "🛰️", label: "Live Map & Radar" },
            chat: { icon: "🤖", label: "WeatherGPT AI" },
            climate: { icon: "📈", label: "Climate Trends" }
        };
        const currentMeta = viewMetaMap[viewName] || { icon: "🌐", label: viewName };
        const iconEl = document.getElementById("headerViewIcon");
        const labelEl = document.getElementById("headerViewLabel");
        if (iconEl) iconEl.textContent = currentMeta.icon;
        if (labelEl) labelEl.textContent = currentMeta.label;

        // View containers
        const viewsMap = {
            dashboard: document.getElementById("viewDashboard"),
            map: document.getElementById("viewMap"),
            chat: document.getElementById("viewWeatherGPT"),
            climate: document.getElementById("viewClimate")
        };

        Object.keys(viewsMap).forEach(key => {
            const el = viewsMap[key];
            if (el) {
                if (key === viewName) {
                    el.classList.add("active");
                } else {
                    el.classList.remove("active");
                }
            }
        });

        // View-specific actions
        if (viewName === "map") {
            setTimeout(() => {
                if (this.gisMap && this.gisMap.map) {
                    this.gisMap.map.invalidateSize();
                    this.gisMap.focusUserLocation();
                }
            }, 80);
        } else if (viewName === "climate") {
            this.loadClimateTrends();
        }

        window.scrollTo({ top: 0, behavior: "smooth" });
    }

    /* ==========================================================================
       1b. Master Application Navigation Drawer & Shell
       ========================================================================== */

    setupMobileShell() {
        const overlay = document.getElementById("mobileDrawerOverlay");
        const menuBtn = document.getElementById("mobileMenuBtn");
        const appDrawerBtn = document.getElementById("appDrawerBtn");
        const currentViewBadge = document.getElementById("currentViewBadge");
        const closeBtn = document.getElementById("closeMobileDrawerBtn");

        const openDrawer = () => {
            if (!overlay) return;
            overlay.classList.add("open");
            overlay.setAttribute("aria-hidden", "false");
            document.body.style.overflow = "hidden";
            if (menuBtn) menuBtn.setAttribute("aria-expanded", "true");
            if (appDrawerBtn) appDrawerBtn.setAttribute("aria-expanded", "true");
        };

        const closeDrawer = () => {
            if (!overlay) return;
            overlay.classList.remove("open");
            overlay.setAttribute("aria-hidden", "true");
            document.body.style.overflow = "";
            if (menuBtn) menuBtn.setAttribute("aria-expanded", "false");
            if (appDrawerBtn) appDrawerBtn.setAttribute("aria-expanded", "false");
        };

        if (menuBtn) menuBtn.addEventListener("click", openDrawer);
        if (appDrawerBtn) appDrawerBtn.addEventListener("click", openDrawer);
        if (currentViewBadge) currentViewBadge.addEventListener("click", openDrawer);
        if (closeBtn) closeBtn.addEventListener("click", closeDrawer);
        if (overlay) overlay.addEventListener("click", (e) => {
            if (e.target === overlay) closeDrawer();
        });
        document.addEventListener("keydown", (e) => {
            if (e.key === "Escape") closeDrawer();
        });

        // Drawer & bottom bar navigation items
        document.querySelectorAll(".mobile-nav-item, .drawer-nav-card, .bottom-nav-item").forEach(btn => {
            btn.addEventListener("click", () => {
                const view = btn.getAttribute("data-view");
                if (view) this.switchView(view);
                closeDrawer();
            });
        });

        // Drawer quick actions forward to the desktop header buttons
        const forwards = {
            drawerTtsToggleBtn: "ttsToggleBtn",
            drawerOpenPersonalizeBtn: "openPersonalizeBtn",
            drawerOpenAiSettingsBtn: "openAiSettingsBtn",
            drawerSignInBtn: "openSignInBtn"
        };
        Object.entries(forwards).forEach(([fromId, toId]) => {
            const el = document.getElementById(fromId);
            if (el) {
                el.addEventListener("click", () => {
                    const target = document.getElementById(toId);
                    if (target) target.click();
                    closeDrawer();
                });
            }
        });

        const drawerLogoutBtn = document.getElementById("drawerLogoutBtn");
        if (drawerLogoutBtn) {
            drawerLogoutBtn.addEventListener("click", () => {
                this.logoutUser();
                closeDrawer();
            });
        }

        // Keep the drawer language selector in sync with the header one
        const drawerLang = document.getElementById("drawerLanguageSelect");
        const headerLang = document.getElementById("languageSelect");
        if (drawerLang) {
            drawerLang.addEventListener("change", (e) => {
                if (headerLang) {
                    headerLang.value = e.target.value;
                    headerLang.dispatchEvent(new Event("change"));
                }
            });
        }
        if (headerLang && drawerLang) {
            headerLang.addEventListener("change", () => {
                drawerLang.value = headerLang.value;
            });
        }
    }

    /* ==========================================================================
       2. Personalize & Customize Manager (Themes, Units, Favorites)
       ========================================================================== */

    setupPersonalize() {
        const openBtn = document.getElementById("openPersonalizeBtn");
        const modal = document.getElementById("personalizeModal");
        const closeBtn = document.getElementById("closePersonalizeModalBtn");
        const saveBtn = document.getElementById("saveCustomizerBtn");
        const resetBtn = document.getElementById("resetCustomizerBtn");

        if (openBtn && modal) {
            openBtn.addEventListener("click", () => {
                modal.classList.add("open");
                this.renderFavoriteListInModal();
            });
        }

        if (closeBtn && modal) {
            closeBtn.addEventListener("click", () => modal.classList.remove("open"));
        }

        // Theme Pickers
        document.querySelectorAll(".theme-card").forEach(card => {
            card.addEventListener("click", () => {
                document.querySelectorAll(".theme-card").forEach(c => c.classList.remove("active"));
                card.classList.add("active");
                const themeVal = card.getAttribute("data-theme-val");
                this.applyTheme(themeVal);
                this.showToast(`Theme changed to ${card.querySelector("strong")?.textContent || themeVal}`, "🎨");
            });
        });

        // Unit Toggles
        this.setupUnitToggleGroup("unitTempGroup", "temp", () => {
            if (this.weatherData) this.updateCurrentWeatherUI(this.weatherData);
        });
        this.setupUnitToggleGroup("unitWindGroup", "wind", () => {
            if (this.weatherData) this.updateCurrentWeatherUI(this.weatherData);
        });
        this.setupUnitToggleGroup("unitPressureGroup", "pressure", () => {
            if (this.weatherData) this.updateCurrentWeatherUI(this.weatherData);
        });

        // Quick Unit Toggle on Dashboard Hero
        const quickUnit = document.getElementById("quickUnitToggle");
        if (quickUnit) {
            quickUnit.addEventListener("click", () => {
                this.units.temp = this.units.temp === "c" ? "f" : "c";
                localStorage.setItem("weathergpt_units", JSON.stringify(this.units));
                this.syncUnitsUI();
                if (this.weatherData) this.updateCurrentWeatherUI(this.weatherData);
                this.showToast(`Temperature units: °${this.units.temp.toUpperCase()}`, "🌡️");
            });
        }

        // Add Favorite City in Modal
        const addFavBtn = document.getElementById("addFavoriteBtn");
        const newFavInput = document.getElementById("newFavoriteInput");
        if (addFavBtn && newFavInput) {
            const handleAdd = () => {
                const city = newFavInput.value.trim();
                if (city && !this.favoriteCities.includes(city)) {
                    this.favoriteCities.push(city);
                    localStorage.setItem("weathergpt_favorites", JSON.stringify(this.favoriteCities));
                    newFavInput.value = "";
                    this.renderFavoriteListInModal();
                    this.renderFavoriteChips();
                    this.showToast(`Added ${city} to favorites`, "⭐");
                }
            };
            addFavBtn.addEventListener("click", handleAdd);
            newFavInput.addEventListener("keydown", (e) => {
                if (e.key === "Enter") handleAdd();
            });
        }

        // Pin Current City Button in Hero
        const pinCurrentCityBtn = document.getElementById("pinCurrentCityBtn");
        if (pinCurrentCityBtn) {
            pinCurrentCityBtn.addEventListener("click", () => {
                if (this.favoriteCities.includes(this.currentCity)) {
                    this.favoriteCities = this.favoriteCities.filter(c => c !== this.currentCity);
                    this.showToast(`Removed ${this.currentCity} from favorites`, "☆");
                } else {
                    this.favoriteCities.unshift(this.currentCity);
                    this.showToast(`Pinned ${this.currentCity} to favorites!`, "⭐");
                }
                localStorage.setItem("weathergpt_favorites", JSON.stringify(this.favoriteCities));
                this.renderFavoriteChips();
                this.updatePinButtonState();
            });
        }

        // Default Persona selector in customizer
        document.querySelectorAll(".persona-chip-select").forEach(chip => {
            chip.addEventListener("click", () => {
                document.querySelectorAll(".persona-chip-select").forEach(c => c.classList.remove("active"));
                chip.classList.add("active");
                const persona = chip.getAttribute("data-persona");
                this.activePersona = persona;
                localStorage.setItem("weathergpt_persona", persona);
                // Sync with dashboard persona tabs
                document.querySelectorAll(".persona-tab").forEach(tab => {
                    tab.classList.toggle("active", tab.getAttribute("data-persona") === persona);
                });
                this.loadPersonaAdvisory(persona);
            });
        });

        if (saveBtn && modal) {
            saveBtn.addEventListener("click", () => {
                modal.classList.remove("open");
                this.showToast("Preferences saved successfully!", "✅");
            });
        }

        if (resetBtn) {
            resetBtn.addEventListener("click", () => {
                this.applyTheme("cyber");
                this.units = { temp: "c", wind: "kmh", pressure: "hpa" };
                localStorage.setItem("weathergpt_units", JSON.stringify(this.units));
                this.favoriteCities = ["New Delhi", "Mumbai", "Kolkata", "Chennai", "Bengaluru", "Bhubaneswar", "Shimla", "Guwahati"];
                localStorage.setItem("weathergpt_favorites", JSON.stringify(this.favoriteCities));
                this.syncUnitsUI();
                this.renderFavoriteChips();
                this.renderFavoriteListInModal();
                if (this.weatherData) this.updateCurrentWeatherUI(this.weatherData);
                this.showToast("Preferences reset to defaults", "🔄");
            });
        }

        this.syncUnitsUI();
    }

    applyTheme(themeName) {
        document.documentElement.setAttribute("data-theme", themeName);
        localStorage.setItem("weathergpt_theme", themeName);
        document.querySelectorAll(".theme-card").forEach(c => {
            c.classList.toggle("active", c.getAttribute("data-theme-val") === themeName);
        });
    }

    setupUnitToggleGroup(groupId, unitKey, onChangeCallback) {
        const group = document.getElementById(groupId);
        if (!group) return;
        group.querySelectorAll(".toggle-pill").forEach(pill => {
            pill.addEventListener("click", () => {
                group.querySelectorAll(".toggle-pill").forEach(p => p.classList.remove("active"));
                pill.classList.add("active");
                this.units[unitKey] = pill.getAttribute("data-unit");
                localStorage.setItem("weathergpt_units", JSON.stringify(this.units));
                if (onChangeCallback) onChangeCallback();
            });
        });
    }

    syncUnitsUI() {
        ["temp", "wind", "pressure"].forEach(key => {
            const val = this.units[key];
            const groupMap = { temp: "unitTempGroup", wind: "unitWindGroup", pressure: "unitPressureGroup" };
            const group = document.getElementById(groupMap[key]);
            if (group) {
                group.querySelectorAll(".toggle-pill").forEach(pill => {
                    pill.classList.toggle("active", pill.getAttribute("data-unit") === val);
                });
            }
        });
    }

    renderFavoriteChips() {
        const container = document.getElementById("quickCityChips");
        if (!container) return;
        container.innerHTML = "";

        this.favoriteCities.forEach(city => {
            const chip = document.createElement("span");
            chip.className = "city-chip";
            chip.setAttribute("data-city", city);
            chip.textContent = city;
            chip.addEventListener("click", () => this.searchCity(city));
            container.appendChild(chip);
        });

        this.updatePinButtonState();
    }

    renderFavoriteListInModal() {
        const list = document.getElementById("favoriteCitiesList");
        if (!list) return;
        list.innerHTML = "";

        this.favoriteCities.forEach(city => {
            const item = document.createElement("div");
            item.className = "favorite-tag-item";
            item.innerHTML = `
                <span>${city}</span>
                <span class="remove-tag-btn" title="Remove">&times;</span>
            `;
            item.querySelector(".remove-tag-btn").addEventListener("click", (e) => {
                e.stopPropagation();
                this.favoriteCities = this.favoriteCities.filter(c => c !== city);
                localStorage.setItem("weathergpt_favorites", JSON.stringify(this.favoriteCities));
                this.renderFavoriteListInModal();
                this.renderFavoriteChips();
            });
            list.appendChild(item);
        });
    }

    updatePinButtonState() {
        const pinBtn = document.getElementById("pinCurrentCityBtn");
        if (!pinBtn) return;
        const isPinned = this.favoriteCities.includes(this.currentCity);
        pinBtn.textContent = isPinned ? "★" : "☆";
        pinBtn.title = isPinned ? "Unpin from favorites" : "Pin to favorites";
        pinBtn.style.color = isPinned ? "var(--accent-amber)" : "var(--text-dim)";
    }

    /* ==========================================================================
       3. Authentication & User Profile Management
       ========================================================================== */

    setupAuth() {
        const openBtn = document.getElementById("openSignInBtn");
        const modal = document.getElementById("authModal");
        const closeBtn = document.getElementById("closeAuthModalBtn");
        const userPillBtn = document.getElementById("userPillBtn");
        const dropdown = document.getElementById("userDropdownPopover");

        if (openBtn && modal) {
            openBtn.addEventListener("click", () => modal.classList.add("open"));
        }
        if (closeBtn && modal) {
            closeBtn.addEventListener("click", () => modal.classList.remove("open"));
        }

        // Tabs inside auth modal
        const tabs = ["authTabSignIn", "authTabSignUp", "authTabGuest"];
        const forms = {
            authTabSignIn: document.getElementById("signInForm"),
            authTabSignUp: document.getElementById("signUpForm"),
            authTabGuest: document.getElementById("guestInfoPanel")
        };

        tabs.forEach(tabId => {
            const tabBtn = document.getElementById(tabId);
            if (tabBtn) {
                tabBtn.addEventListener("click", () => {
                    tabs.forEach(t => document.getElementById(t)?.classList.remove("active"));
                    tabBtn.classList.add("active");
                    Object.values(forms).forEach(f => { if (f) f.style.display = "none"; });
                    if (forms[tabId]) forms[tabId].style.display = "block";
                });
            }
        });

        // Sign In Form Submit
        const signInForm = document.getElementById("signInForm");
        if (signInForm) {
            signInForm.addEventListener("submit", (e) => {
                e.preventDefault();
                const emailOrUser = document.getElementById("signInEmail").value.trim() || "User";
                const displayName = emailOrUser.includes("@") ? emailOrUser.split("@")[0] : emailOrUser;
                this.loginUser({
                    name: displayName,
                    email: emailOrUser.includes("@") ? emailOrUser : `${emailOrUser}@weathergpt.in`,
                    role: "Citizen / Farmer",
                    avatar: displayName.charAt(0).toUpperCase()
                });
                modal.classList.remove("open");
                this.showToast(`Welcome back, ${displayName}!`, "👋");
            });
        }

        // Sign Up Form Submit
        const signUpForm = document.getElementById("signUpForm");
        if (signUpForm) {
            signUpForm.addEventListener("submit", (e) => {
                e.preventDefault();
                const fullName = document.getElementById("signUpFullName").value.trim() || "Officer";
                const email = document.getElementById("signUpEmail").value.trim() || "user@weathergpt.in";
                const role = document.getElementById("signUpRole").value;
                this.loginUser({
                    name: fullName,
                    email: email,
                    role: role,
                    avatar: fullName.charAt(0).toUpperCase()
                });
                modal.classList.remove("open");
                this.showToast(`Account created! Welcome, ${fullName}`, "🎉");
            });
        }

        // Instant Guest Login
        const quickGuestBtn = document.getElementById("quickGuestLoginBtn");
        const confirmGuestBtn = document.getElementById("confirmGuestBtn");
        const handleGuest = () => {
            this.loginUser({
                name: "Guest Explorer",
                email: "guest@weathergpt.in",
                role: "Citizen / Guest",
                avatar: "G"
            });
            modal.classList.remove("open");
            this.showToast("Signed in as Guest User", "⚡");
        };
        if (quickGuestBtn) quickGuestBtn.addEventListener("click", handleGuest);
        if (confirmGuestBtn) confirmGuestBtn.addEventListener("click", handleGuest);

        // Toggle User Badge Dropdown
        if (userPillBtn && dropdown) {
            userPillBtn.addEventListener("click", (e) => {
                e.stopPropagation();
                dropdown.classList.toggle("open");
            });
        }

        // Close dropdown when clicking outside
        document.addEventListener("click", (e) => {
            if (dropdown && !dropdown.contains(e.target) && e.target !== userPillBtn) {
                dropdown.classList.remove("open");
            }
        });

        // Dropdown actions
        document.getElementById("dropdownActionPersonalize")?.addEventListener("click", () => {
            dropdown?.classList.remove("open");
            document.getElementById("openPersonalizeBtn")?.click();
        });

        document.getElementById("dropdownActionSettings")?.addEventListener("click", () => {
            dropdown?.classList.remove("open");
            document.getElementById("openAiSettingsBtn")?.click();
        });

        document.getElementById("dropdownActionFavorites")?.addEventListener("click", () => {
            dropdown?.classList.remove("open");
            document.getElementById("openPersonalizeBtn")?.click();
        });

        // Logout Action
        const logoutBtn = document.getElementById("userLogoutBtn");
        if (logoutBtn) {
            logoutBtn.addEventListener("click", () => {
                this.logoutUser();
                dropdown?.classList.remove("open");
            });
        }

        // Render initial auth UI
        this.updateAuthUI();
    }

    loginUser(userData) {
        this.currentUser = userData;
        localStorage.setItem("weathergpt_user", JSON.stringify(userData));
        this.updateAuthUI();
    }

    logoutUser() {
        this.currentUser = null;
        localStorage.removeItem("weathergpt_user");
        this.updateAuthUI();
        this.showToast("Logged out successfully.", "🚪");
    }    updateAuthUI() {
        const signInBtn = document.getElementById("openSignInBtn");
        const userBadge = document.getElementById("userBadgeContainer");
        const drawerSignIn = document.getElementById("drawerSignInBtn");
        const drawerUserBox = document.getElementById("drawerUserBox");

        if (this.currentUser) {
            if (signInBtn) signInBtn.style.display = "none";
            if (userBadge) userBadge.style.display = "block";

            const name = this.currentUser.name || "User";
            const role = this.currentUser.role || "Citizen";
            const avatar = this.currentUser.avatar || name.charAt(0).toUpperCase();

            document.getElementById("headerUserName").textContent = name;
            document.getElementById("headerUserRole").textContent = role;
            document.getElementById("headerUserAvatar").textContent = avatar;


            document.getElementById("dropdownName").textContent = name;
            document.getElementById("dropdownRoleLabel").textContent = role;
            document.getElementById("dropdownEmail").textContent = this.currentUser.email || "";
            document.getElementById("dropdownAvatar").textContent = avatar;

            // Sync mobile drawer auth section
            if (drawerSignIn) drawerSignIn.style.display = "none";
            if (drawerUserBox) {
                drawerUserBox.style.display = "flex";
                const dn = document.getElementById("drawerUserName");
                if (dn) dn.textContent = name;
                const dr = document.getElementById("drawerUserRole");
                if (dr) dr.textContent = role;
                const da = document.getElementById("drawerUserAvatar");
                if (da) da.textContent = avatar;
            }
        } else {
            if (signInBtn) signInBtn.style.display = "flex";
            if (userBadge) userBadge.style.display = "none";
            if (drawerSignIn) drawerSignIn.style.display = "flex";
            if (drawerUserBox) drawerUserBox.style.display = "none";
        }
    }

    /* ==========================================================================
       4. Toast Notifications
       ========================================================================== */

    showToast(message, icon = "✨") {
        const container = document.getElementById("toastContainer");
        if (!container) return;

        const toast = document.createElement("div");
        toast.className = "toast-message";
        toast.innerHTML = `<span>${icon}</span> <span>${message}</span>`;
        container.appendChild(toast);

        setTimeout(() => {
            toast.style.opacity = "0";
            toast.style.transform = "translateY(10px)";
            setTimeout(() => toast.remove(), 300);
        }, 3200);
    }

    /* ==========================================================================
       5. Language Selector & Clock
       ========================================================================== */

    setupLanguageSelector() {
        const selector = document.getElementById("languageSelect");
        if (!selector) return;

        selector.addEventListener("change", (e) => {
            const lang = e.target.value;
            if (window.I18N) window.I18N.setLang(lang);
            if (this.weatherData) {
                this.updateCurrentWeatherUI(this.weatherData);
            }
            this.showToast(`Language updated`, "🌐");
        });
    }

    setupClock() {
        const timeEl = document.getElementById("liveTimeIst");
        const updateClock = () => {
            const now = new Date();
            const istTime = now.toLocaleTimeString("en-IN", { 
                timeZone: "Asia/Kolkata", 
                hour: '2-digit', 
                minute: '2-digit', 
                second: '2-digit', 
                hour12: true 
            });
            const istDate = now.toLocaleDateString("en-IN", { 
                timeZone: "Asia/Kolkata", 
                weekday: 'short', 
                day: 'numeric', 
                month: 'short',
                year: 'numeric'
            });
            if (timeEl) {
                timeEl.textContent = `${istTime} IST • ${istDate}`;
            }
        };
        updateClock();
        setInterval(updateClock, 1000);
    }

    /* ==========================================================================
       6. Search & Location Management
       ========================================================================== */

    setupSearch() {
        const input = document.getElementById("citySearchInput");
        const btn = document.getElementById("citySearchBtn");
        const gpsBtn = document.getElementById("detectGpsBtn");

        if (btn && input) {
            btn.addEventListener("click", () => {
                const val = input.value.trim();
                if (val) this.searchCity(val);
            });
            input.addEventListener("keydown", (e) => {
                if (e.key === "Enter") {
                    const val = input.value.trim();
                    if (val) this.searchCity(val);
                }
            });
        }

        if (gpsBtn) {
            gpsBtn.addEventListener("click", () => this.detectLocation());
        }
    }

    setupPersonaTabs() {
        document.querySelectorAll(".persona-tab").forEach(tab => {
            tab.addEventListener("click", () => {
                document.querySelectorAll(".persona-tab").forEach(t => t.classList.remove("active"));
                tab.classList.add("active");
                this.activePersona = tab.getAttribute("data-persona");
                this.loadPersonaAdvisory(this.activePersona);
            });
        });
    }

    setupModals() {
        // Cyclone Detail Modal
        const cycloneBtn = document.getElementById("viewCycloneDetailsBtn");
        const cycloneModal = document.getElementById("cycloneModal");
        const closeCycloneBtn = document.getElementById("closeCycloneModalBtn");

        if (cycloneBtn && cycloneModal) {
            cycloneBtn.addEventListener("click", () => cycloneModal.classList.add("open"));
        }
        if (closeCycloneBtn && cycloneModal) {
            closeCycloneBtn.addEventListener("click", () => cycloneModal.classList.remove("open"));
        }

        // Close on backdrop click
        window.addEventListener("click", (e) => {
            if (e.target === cycloneModal) cycloneModal.classList.remove("open");
            const aiModal = document.getElementById("aiSettingsModal");
            if (e.target === aiModal) aiModal.classList.remove("open");
            const persModal = document.getElementById("personalizeModal");
            if (e.target === persModal) persModal.classList.remove("open");
            const authModal = document.getElementById("authModal");
            if (e.target === authModal) authModal.classList.remove("open");
        });
    }

    async autoDetectStartupLocation() {
        const gpsBtn = document.getElementById("detectGpsBtn");
        if (gpsBtn) {
            gpsBtn.innerHTML = "<span>📡</span> Finding Location...";
            gpsBtn.classList.add("loading");
        }

        const browserGeoPromise = new Promise((resolve, reject) => {
            if (!navigator.geolocation) return reject("No geolocation API");
            navigator.geolocation.getCurrentPosition(
                (pos) => resolve({
                    lat: pos.coords.latitude,
                    lon: pos.coords.longitude,
                    accuracy: pos.coords.accuracy || 25,
                    source: "GPS"
                }),
                (err) => reject(err),
                { timeout: 15000, enableHighAccuracy: true, maximumAge: 0 }
            );
        });

        try {
            const loc = await browserGeoPromise;
            if (gpsBtn) gpsBtn.classList.remove("loading");
            await this.searchByCoords(loc.lat, loc.lon, loc.accuracy, "GPS");
            this.showToast("🎯 High-accuracy GPS location locked!", "📍");
            return;
        } catch (e) {
            console.info("Browser GPS unavailable or timed out, trying IP geolocation fallback...", e);
        }

        // IP Geolocation fallback (ISP regional gateway)
        try {
            const ipRes = await fetch("https://get.geojs.io/v1/ip/geo.json");
            if (ipRes.ok) {
                const data = await ipRes.json();
                const lat = parseFloat(data.latitude);
                const lon = parseFloat(data.longitude);
                if (!isNaN(lat) && !isNaN(lon)) {
                    if (gpsBtn) gpsBtn.classList.remove("loading");
                    await this.searchByCoords(lat, lon, 5000, "IP Approx");
                    this.showToast("⚠️ ISP gateway detected (Approx). Click anywhere on the map or drag green pin to set your exact location!", "📍");
                    return;
                }
            }
        } catch (e) {
            console.warn("IP Geolocation fallback failed", e);
        }

        if (gpsBtn) {
            gpsBtn.classList.remove("loading");
            gpsBtn.innerHTML = "<span>📍</span> My Location";
        }
        await this.searchCity("New Delhi");
    }

    async detectLocation() {
        const gpsBtn = document.getElementById("detectGpsBtn");
        if (gpsBtn) {
            gpsBtn.innerHTML = "<span>📡</span> Locating GPS...";
            gpsBtn.classList.add("loading");
        }

        if (!navigator.geolocation) {
            this.showToast("Geolocation is not supported by your browser. Please search your city or click on the map.", "⚠️");
            if (gpsBtn) gpsBtn.classList.remove("loading");
            return;
        }

        this.showToast("📡 Requesting precise GPS/Wi-Fi positioning. Click 'Allow' if prompted by your browser...", "📡");

        navigator.geolocation.getCurrentPosition(
            async (pos) => {
                const lat = pos.coords.latitude;
                const lon = pos.coords.longitude;
                const acc = pos.coords.accuracy || 20;
                if (gpsBtn) gpsBtn.classList.remove("loading");
                await this.searchByCoords(lat, lon, acc, "GPS");
                this.showToast(`🎯 High-accuracy GPS locked (±${Math.round(acc)}m)!`, "🎯");
            },
            async (err) => {
                console.warn("GPS access failed or denied, trying IP geo", err);
                if (gpsBtn) gpsBtn.classList.remove("loading");
                
                try {
                    const ipRes = await fetch("https://get.geojs.io/v1/ip/geo.json");
                    if (ipRes.ok) {
                        const data = await ipRes.json();
                        const lat = parseFloat(data.latitude);
                        const lon = parseFloat(data.longitude);
                        if (!isNaN(lat) && !isNaN(lon)) {
                            await this.searchByCoords(lat, lon, 5000, "IP Approx");
                            this.showToast("⚠️ Browser GPS permission denied. Used ISP approximate location. Click anywhere on the map to pinpoint!", "⚠️");
                            return;
                        }
                    }
                } catch (e) {}

                this.showToast("GPS location unavailable. You can click anywhere on the map or type your city/coordinates.", "⚠️");
            },
            { timeout: 20000, enableHighAccuracy: true, maximumAge: 0 }
        );
    }

    async searchCity(cityName) {
        if (!cityName || !cityName.trim()) return;
        cityName = cityName.trim();

        // Check if user entered coordinates directly like "13.0827, 80.2707" or "10.82 78.69"
        const coordMatch = cityName.match(/^\s*([+-]?\d+(?:\.\d+)?)[,\s]+([+-]?\d+(?:\.\d+)?)\s*$/);
        if (coordMatch) {
            const lat = parseFloat(coordMatch[1]);
            const lon = parseFloat(coordMatch[2]);
            if (!isNaN(lat) && !isNaN(lon) && lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180) {
                await this.searchByCoords(lat, lon, 10, "Manual GPS Input");
                return;
            }
        }

        try {
            document.getElementById("stationStatusBadge")?.classList.add("loading");
            const gpsBtn = document.getElementById("detectGpsBtn");
            if (gpsBtn) {
                gpsBtn.classList.remove("active-pulse");
                gpsBtn.innerHTML = "<span>📍</span> My Location";
            }
            
            const res = await fetch(`/api/weather/current?city=${encodeURIComponent(cityName)}`);
            if (res.ok) {
                this.weatherData = await res.json();
                this.currentCity = this.weatherData.city;
                this.currentCoords = { lat: this.weatherData.lat, lon: this.weatherData.lon };

                this.updateCurrentWeatherUI(this.weatherData);
                this.updatePinButtonState();

                if (this.gisMap) {
                    this.gisMap.setUserLocation(this.weatherData.lat, this.weatherData.lon, `${this.weatherData.city}, ${this.weatherData.state}`, 300, "City Search");
                    this.gisMap.panToCity(this.weatherData.lat, this.weatherData.lon, this.weatherData.city);
                }

                this.fetchNwpComparison();
                this.fetchAlerts();
                this.loadPersonaAdvisory(this.activePersona);
            }
        } catch (e) {
            console.error("Error fetching city weather", e);
        } finally {
            document.getElementById("stationStatusBadge")?.classList.remove("loading");
        }
    }

    async searchByCoords(lat, lon, accuracy = 50, source = "GPS") {
        try {
            document.getElementById("stationStatusBadge")?.classList.add("loading");
            const res = await fetch(`/api/weather/current?lat=${lat}&lon=${lon}`);
            if (res.ok) {
                this.weatherData = await res.json();
                this.currentCity = this.weatherData.city;
                this.currentCoords = { lat, lon };

                const gpsBtn = document.getElementById("detectGpsBtn");
                if (gpsBtn) {
                    const isApprox = source.toLowerCase().includes("approx") || source.toLowerCase().includes("ip");
                    gpsBtn.innerHTML = `<span>📍</span> ${this.weatherData.city} ${isApprox ? '(Approx)' : ''}`;
                    gpsBtn.classList.add("active-pulse");
                }

                this.updateCurrentWeatherUI(this.weatherData);
                this.updatePinButtonState();

                if (this.gisMap) {
                    this.gisMap.setUserLocation(lat, lon, `${this.weatherData.city}, ${this.weatherData.state}`, accuracy, source);
                }

                this.fetchNwpComparison();
                this.fetchAlerts();
                this.loadPersonaAdvisory(this.activePersona);
            }
        } catch (e) {
            console.error("Error fetching coords weather", e);
        } finally {
            document.getElementById("stationStatusBadge")?.classList.remove("loading");
        }
    }

    /* ==========================================================================
       7. UI Telemetry Rendering with Unit Conversion
       ========================================================================== */

    formatTemp(celsius) {
        if (celsius === undefined || celsius === null) return "--";
        if (this.units.temp === "f") {
            const f = Math.round((celsius * 9/5) + 32);
            return `${f}°F`;
        }
        return `${Math.round(celsius)}°`;
    }

    formatWind(kmh) {
        if (kmh === undefined || kmh === null) return "--";
        if (this.units.wind === "mph") {
            return `${Math.round(kmh * 0.621371)} mph`;
        } else if (this.units.wind === "knots") {
            return `${Math.round(kmh * 0.539957)} knots`;
        }
        return `${kmh} km/h`;
    }

    formatPressure(hpa) {
        if (hpa === undefined || hpa === null) return "--";
        if (this.units.pressure === "inhg") {
            return `${(hpa * 0.02953).toFixed(2)} inHg`;
        }
        return `${hpa} hPa`;
    }

    updateCurrentWeatherUI(data) {
        if (!data || !data.current) return;
        const curr = data.current;
        const aqi = data.aqi || {};

        // City & Station ID
        const cityNameEl = document.getElementById("currCityName");
        if (cityNameEl) cityNameEl.textContent = `${data.city}, ${data.state}`;
        const stationIdEl = document.getElementById("currStationId");
        if (stationIdEl) stationIdEl.textContent = `Station: ${data.station_id} (Elev. ${data.elevation}m)`;

        // Temperature & Condition
        const tempEl = document.getElementById("currTemp");
        if (tempEl) tempEl.textContent = this.formatTemp(curr.temperature);
        const feelsLikeEl = document.getElementById("currFeelsLike");
        if (feelsLikeEl) feelsLikeEl.textContent = `${window.I18N ? window.I18N.get("feelsLike") : "Feels like"}: ${this.formatTemp(curr.apparent_temperature)}`;
        
        const condText = window.I18N && window.I18N.currentLang === "hi" ? (curr.condition_hi || curr.condition) : curr.condition;
        const condTextEl = document.getElementById("currConditionText");
        if (condTextEl) condTextEl.textContent = condText;
        const weatherIconEl = document.getElementById("currWeatherIcon");
        if (weatherIconEl) weatherIconEl.textContent = curr.icon || "🌤️";

        // Telemetry Grid
        const humidityEl = document.getElementById("currHumidity");
        if (humidityEl) humidityEl.textContent = `${curr.humidity}%`;
        const pressureEl = document.getElementById("currPressure");
        if (pressureEl) pressureEl.textContent = this.formatPressure(curr.pressure);
        const windEl = document.getElementById("currWind");
        if (windEl) windEl.textContent = this.formatWind(curr.wind_speed);
        const windDirEl = document.getElementById("currWindDir");
        if (windDirEl) windDirEl.style.transform = `rotate(${curr.wind_direction || 0}deg)`;
        const uvEl = document.getElementById("currUv");
        if (uvEl) uvEl.textContent = curr.uv_index;
        const cloudEl = document.getElementById("currCloud");
        if (cloudEl) cloudEl.textContent = `${curr.cloud_cover || 0}%`;
        const precipEl = document.getElementById("currPrecipitation");
        if (precipEl) precipEl.textContent = `${curr.precipitation !== undefined ? curr.precipitation : 0.0} mm`;

        // AQI Meter
        const aqiVal = document.getElementById("currAqiValue");
        const aqiCat = document.getElementById("currAqiCategory");
        const aqiHealth = document.getElementById("currAqiHealth");
        if (aqiVal) {
            aqiVal.textContent = aqi.aqi || "--";
            aqiVal.style.color = aqi.color || "var(--accent-emerald)";
        }
        if (aqiCat) {
            aqiCat.textContent = aqi.category || "Moderate";
            aqiCat.style.backgroundColor = aqi.color || "var(--accent-emerald)";
        }
        if (aqiHealth) {
            aqiHealth.textContent = aqi.health_advisory || "Air quality normal.";
        }
        const pm25El = document.getElementById("currPm25");
        if (pm25El) pm25El.textContent = `${aqi.pm2_5 || 0} µg/m³`;
        const pm10El = document.getElementById("currPm10");
        if (pm10El) pm10El.textContent = `${aqi.pm10 || 0} µg/m³`;

        // AQI Spectrum Marker Position
        const aqiIndicator = document.getElementById("aqiSpectrumIndicator");
        if (aqiIndicator && aqi.aqi !== undefined) {
            const pct = Math.min(98, Math.max(2, (aqi.aqi / 500) * 100));
            aqiIndicator.style.left = `${pct}%`;
            aqiIndicator.style.backgroundColor = aqi.color || "#10b981";
            aqiIndicator.style.boxShadow = `0 0 10px ${aqi.color || "#10b981"}`;
        }

        // Render Hourly Chart
        if (window.WeatherVisualizer && data.hourly) {
            window.WeatherVisualizer.renderHourlyChart(data.hourly);
        }

        // Render 7-Day Outlook Cards
        this.renderDailyOutlook(data.daily || []);
    }

    renderDailyOutlook(dailyList) {
        const container = document.getElementById("dailyOutlookCards");
        if (!container) return;
        container.innerHTML = "";

        dailyList.forEach((d, idx) => {
            const card = document.createElement("div");
            card.className = "daily-card";
            card.innerHTML = `
                <div class="daily-card-day">${idx === 0 ? "Today" : d.day}</div>
                <div class="daily-card-icon">${d.icon}</div>
                <div class="daily-card-temps">
                    <span class="daily-card-max">${this.formatTemp(d.temp_max)}</span>
                    <span class="daily-card-min" style="color: var(--text-dim); margin-left: 4px;">${this.formatTemp(d.temp_min)}</span>
                </div>
                <div class="daily-card-pop">💧 ${d.pop}%</div>
            `;
            container.appendChild(card);
        });
    }

    /* ==========================================================================
       8. NWP Multi-Model Telemetry & Forecasts
       ========================================================================== */

    async fetchNwpComparison() {
        try {
            const res = await fetch(`/api/nwp/compare?city=${encodeURIComponent(this.currentCity)}&lat=${this.currentCoords.lat}&lon=${this.currentCoords.lon}`);
            if (res.ok) {
                this.nwpData = await res.json();
                this.updateNwpUI(this.nwpData);
            }
        } catch (e) {
            console.error("NWP fetch error", e);
        }
    }

    updateNwpUI(nwp) {
        const scoreEl = document.getElementById("nwpConsensusScore");
        if (scoreEl) scoreEl.textContent = `${nwp.confidence_score}% Match`;
        const labelEl = document.getElementById("nwpConsensusLabel");
        if (labelEl) labelEl.textContent = nwp.confidence;
        const descEl = document.getElementById("nwpConsensusDesc");
        if (descEl) descEl.textContent = nwp.consensus_summary;

        const conv = nwp.convective_analysis || {};
        const capeEl = document.getElementById("nwpMaxCape");
        if (capeEl) capeEl.textContent = `${conv.max_cape_j_kg} J/kg`;
        const capeRisk = document.getElementById("nwpCapeRisk");
        if (capeRisk) {
            capeRisk.textContent = conv.severe_convective_risk;
            capeRisk.style.color = conv.risk_color;
        }

        // Models 24h rain & temp
        const models = nwp.models || {};
        const gfsEl = document.getElementById("gfsRain");
        if (gfsEl) gfsEl.textContent = `${models.gfs?.precip_24h} mm`;
        const wrfEl = document.getElementById("wrfRain");
        if (wrfEl) wrfEl.textContent = `${models.wrf?.precip_24h} mm`;
        const ecmwfEl = document.getElementById("ecmwfRain");
        if (ecmwfEl) ecmwfEl.textContent = `${models.ecmwf?.precip_24h} mm`;

        // Render Comparison Chart
        if (window.WeatherVisualizer) {
            window.WeatherVisualizer.renderNwpComparisonChart(nwp);
        }
    }

    /* ==========================================================================
       9. Alerts & Disaster Warnings
       ========================================================================== */

    async fetchAlerts() {
        try {
            const res = await fetch(`/api/alerts?city=${encodeURIComponent(this.currentCity)}`);
            if (res.ok) {
                this.alertsData = await res.json();
                this.updateAlertsUI(this.alertsData);
            }
        } catch (e) {
            console.error("Alerts fetch error", e);
        }
    }

    updateAlertsUI(data) {
        const ticker = document.getElementById("alertTickerContent");
        const alertsList = data.active_alerts || [];

        if (alertsList.length === 0) {
            if (ticker) ticker.innerHTML = `<span>🟢 ${window.I18N ? window.I18N.get("noAlerts") : "No severe weather warnings. Conditions normal."}</span>`;
            return;
        }

        let tickerHtml = "";
        alertsList.forEach(a => {
            tickerHtml += `<span class="alert-badge ${a.level.toLowerCase()}">🚨 [${a.level}] ${a.title}: ${a.description}</span> `;
        });
        if (ticker) ticker.innerHTML = tickerHtml;

        // Warning banner (only activate for critical RED or ORANGE emergency disasters to avoid duplicate yellow alert clutter)
        const banner = document.getElementById("disasterWarningBanner");
        if (banner) {
            const emergencyAlert = alertsList.find(a => a.level === "RED" || a.level === "ORANGE");
            if (emergencyAlert) {
                banner.className = `disaster-banner ${emergencyAlert.level.toLowerCase()}`;
                banner.innerHTML = `
                    <div class="banner-icon">${emergencyAlert.icon}</div>
                    <div class="banner-body">
                        <strong>IMD EARLY WARNING [${emergencyAlert.level}]: ${emergencyAlert.title}</strong>
                        <p>${emergencyAlert.description}</p>
                    </div>
                    <button class="banner-action-btn" onclick="window.WeatherApp.showActiveAlertDetails()">Action Protocol</button>
                `;
                banner.style.display = "flex";
            } else {
                banner.style.display = "none";
            }
        }
    }

    showActiveAlertDetails() {
        if (!this.alertsData?.active_alerts?.length) return;
        const top = this.alertsData.active_alerts[0];
        const instruction = top.instructions?.[0] || top.description || "Stay indoors and observe local safety directives.";
        this.showToast(`IMD Protocol [${top.level}]: ${instruction}`, "🚨");
    }

    /* ==========================================================================
       10. Persona Advisories
       ========================================================================== */

    async loadPersonaAdvisory(persona) {
        try {
            const res = await fetch(`/api/advisory/${persona}?city=${encodeURIComponent(this.currentCity)}`);
            if (res.ok) {
                const data = await res.json();
                this.renderPersonaContent(persona, data.advisory);
            }
        } catch (e) {
            console.error("Advisory error", e);
        }
    }

    renderPersonaContent(persona, adv) {
        const container = document.getElementById("personaAdvisoryContent");
        if (!container || !adv) return;

        let html = `<h4>${adv.title}</h4>`;

        if (persona === "farmer") {
            html += `
                <div class="advisory-grid">
                    <div class="adv-item"><strong>🚜 Irrigation Advice:</strong> ${adv.irrigation_advice}</div>
                    <div class="adv-item"><strong>🌿 Pesticide Spraying:</strong> ${adv.pesticide_spraying}</div>
                    <div class="adv-item"><strong>🐛 Pest Forewarning:</strong> ${adv.pest_disease_alert}</div>
                    <div class="adv-item"><strong>🌾 Harvest Handling:</strong> ${adv.harvest_handling}</div>
                </div>
            `;
        } else if (persona === "aviation") {
            html += `
                <div class="advisory-grid">
                    <div class="adv-item"><strong>📋 Raw METAR:</strong> <code>${adv.raw_metar}</code></div>
                    <div class="adv-item"><strong>✈️ Flight Category:</strong> <span class="badge-vfr">${adv.flight_category}</span></div>
                    <div class="adv-item"><strong>👀 Ceiling & Visibility:</strong> ${adv.ceiling_visibility}</div>
                    <div class="adv-item"><strong>💨 Crosswind Limit:</strong> ${adv.crosswind_component}</div>
                </div>
            `;
        } else if (persona === "marine") {
            html += `
                <div class="advisory-grid">
                    <div class="adv-item"><strong>🌊 Sea State:</strong> ${adv.sea_state}</div>
                    <div class="adv-item"><strong>📏 Wave Height:</strong> ${adv.wave_height_meters}</div>
                    <div class="adv-item"><strong>⏱️ Swell Period:</strong> ${adv.swell_period_seconds}</div>
                    <div class="adv-item"><strong>⚠️ Fishermen Warning:</strong> ${adv.fishermen_warning}</div>
                </div>
            `;
        } else {
            html += `
                <div class="advisory-grid">
                    <div class="adv-item"><strong>🏙️ Hotspots:</strong> ${adv.waterlogging_hotspots.join(", ")}</div>
                    <div class="adv-item"><strong>🚰 Drainage & Pumps:</strong> ${adv.pumping_readiness}</div>
                    <div class="adv-item"><strong>🚗 Traffic Protocol:</strong> ${adv.traffic_guidance}</div>
                    <div class="adv-item"><strong>🌡️ Urban Heat Index:</strong> ${adv.urban_heat_index}</div>
                </div>
            `;
        }

        container.innerHTML = html;
    }

    /* ==========================================================================
       11. Climate Trends
       ========================================================================== */

    async loadClimateTrends() {
        try {
            const res = await fetch(`/api/climate/trends?city=${encodeURIComponent(this.currentCity)}`);
            if (res.ok) {
                const data = await res.json();
                const sumEl = document.getElementById("climateSummaryText");
                if (sumEl) sumEl.textContent = data.trend_summary;
                const onsetEl = document.getElementById("monsoonOnsetText");
                if (onsetEl) onsetEl.textContent = data.monsoon_onset_trend;
                const ensoEl = document.getElementById("ensoStatusText");
                if (ensoEl) ensoEl.textContent = data.enso_status;
                if (window.WeatherVisualizer) {
                    window.WeatherVisualizer.renderClimateTrendsChart(data);
                }
            }
        } catch (e) {
            console.error("Climate trends error", e);
        }
    }
}

document.addEventListener("DOMContentLoaded", () => {
    window.WeatherApp = new WeatherAppOrchestrator();
});
