/**
 * WeatherGPT Conversational UI & Multi-LLM AI Model Orchestrator
 * Supports:
 * - Built-in MoES Conversational Met-Brain (Zero-Key)
 * - Groq Cloud (Qwen-3.8 27B / Ultra Fast LPU)
 * - Google Gemini (Gemini 3.6 Flash)
 * - OpenRouter (Universal Gateway / Llama 3.3 70B)
 * - OpenAI (GPT-4o / GPT-4o-mini)
 * - Anthropic Claude (Claude 3.5 Sonnet)
 * - DeepSeek (DeepSeek-V3 Chat)
 * - Mistral AI (Mistral Small / Large)
 * - Ollama (Local)
 * - Web Speech API (STT Voice Input & TTS Voice Readout)
 */

class WeatherChat {
    constructor() {
        this.messagesContainer = document.getElementById("chatMessages");
        this.inputField = document.getElementById("chatInput");
        this.sendBtn = document.getElementById("chatSendBtn");
        this.micBtn = document.getElementById("chatMicBtn");
        this.ttsToggleBtn = document.getElementById("ttsToggleBtn");
        
        this.isListening = false;
        this.isTtsEnabled = true;
        this.recognition = null;
        this.serverProviders = {};

        // Load AI Settings from localStorage (default to 'groq' if available or 'builtin')
        this.aiSettings = {
            provider: localStorage.getItem("weathergpt_ai_provider") || "builtin",
            apiKey: localStorage.getItem("weathergpt_ai_key") || "",
            model: localStorage.getItem("weathergpt_ai_model") || ""
        };
        
        this.initSpeechRecognition();
        this.setupEventListeners();
        this.setupAiSettingsModal();
        this.setupQuickProviderBar();
        this.fetchServerProviders();
        this.updateAiEngineBadge();
    }

    async fetchServerProviders() {
        try {
            const res = await fetch("/api/ai/providers");
            if (res.ok) {
                const data = await res.json();
                this.serverProviders = data.providers || {};
                
                // If user hasn't chosen a custom provider yet and groq or gemini is configured, recommend it
                if (!localStorage.getItem("weathergpt_ai_provider") && data.default_provider) {
                    this.aiSettings.provider = data.default_provider;
                    this.updateAiEngineBadge();
                }
                this.refreshQuickBarStatus();
            }
        } catch (e) {
            console.warn("Could not fetch server AI providers", e);
        }
    }

    initSpeechRecognition() {
        const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (SpeechRec) {
            this.recognition = new SpeechRec();
            this.recognition.continuous = false;
            this.recognition.interimResults = false;

            this.recognition.onstart = () => {
                this.isListening = true;
                if (this.micBtn) {
                    this.micBtn.classList.add("listening");
                    this.micBtn.title = "Listening to speech...";
                }
                if (this.inputField) {
                    this.inputField.placeholder = window.I18N ? window.I18N.get("listening") : "Listening...";
                }
            };

            this.recognition.onresult = (event) => {
                const transcript = event.results[0][0].transcript;
                if (this.inputField) {
                    this.inputField.value = transcript;
                }
                this.handleSendMessage();
            };

            this.recognition.onerror = (event) => {
                console.warn("Speech recognition error:", event.error);
                this.stopListening();
            };

            this.recognition.onend = () => {
                this.stopListening();
            };
        }
    }

    toggleListening() {
        if (!this.recognition) {
            alert("Speech recognition is supported in Chromium/Edge browsers. You can type directly in the chat box!");
            return;
        }

        if (this.isListening) {
            this.recognition.stop();
            this.stopListening();
        } else {
            this.recognition.lang = window.I18N ? window.I18N.getSpeechCode() : "en-IN";
            try {
                this.recognition.start();
            } catch (e) {
                console.warn("Recognition start error", e);
            }
        }
    }

    stopListening() {
        this.isListening = false;
        if (this.micBtn) {
            this.micBtn.classList.remove("listening");
            this.micBtn.title = window.I18N ? window.I18N.get("speakPrompt") : "Click mic to speak";
        }
        if (this.inputField) {
            this.inputField.placeholder = window.I18N ? window.I18N.get("chatPlaceholder") : "Ask WeatherGPT...";
        }
    }

    toggleTTS() {
        this.isTtsEnabled = !this.isTtsEnabled;
        if (this.ttsToggleBtn) {
            this.ttsToggleBtn.classList.toggle("muted", !this.isTtsEnabled);
            this.ttsToggleBtn.title = this.isTtsEnabled ? "Audio Readout Enabled" : "Audio Readout Muted";
        }
        if (!this.isTtsEnabled && window.speechSynthesis) {
            window.speechSynthesis.cancel();
        }
    }

    speak(text) {
        if (!this.isTtsEnabled || !window.speechSynthesis || !text) return;
        window.speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = window.I18N ? window.I18N.getSpeechCode() : "en-IN";
        utterance.rate = this.ttsRate || 1.0;
        utterance.pitch = 1.0;

        utterance.onstart = () => {
            document.querySelectorAll(".speech-replay-btn").forEach(b => b.classList.add("speaking"));
        };
        utterance.onend = () => {
            document.querySelectorAll(".speech-replay-btn").forEach(b => b.classList.remove("speaking"));
        };
        utterance.onerror = () => {
            document.querySelectorAll(".speech-replay-btn").forEach(b => b.classList.remove("speaking"));
        };

        window.speechSynthesis.speak(utterance);
    }

    setupEventListeners() {
        if (this.sendBtn) {
            this.sendBtn.addEventListener("click", () => this.handleSendMessage());
        }
        if (this.inputField) {
            this.inputField.addEventListener("keydown", (e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    this.handleSendMessage();
                }
            });
        }
        if (this.micBtn) {
            this.micBtn.addEventListener("click", () => this.toggleListening());
        }
        if (this.ttsToggleBtn) {
            this.ttsToggleBtn.addEventListener("click", () => this.toggleTTS());
        }

        const clearBtn = document.getElementById("clearChatBtn");
        if (clearBtn) {
            clearBtn.addEventListener("click", () => {
                if (this.messagesContainer) {
                    this.messagesContainer.innerHTML = `
                        <div class="chat-bubble assistant">
                            <div class="chat-bubble-header">
                                <span class="chat-avatar">🌐</span> <strong>WeatherGPT (MoES Met-AI)</strong>
                            </div>
                            <div class="chat-bubble-body">
                                Conversation cleared. How may I assist you with meteorological intelligence, alerts, or farming advisories today?
                            </div>
                        </div>
                    `;
                }
            });
        }

        const ttsSlider = document.getElementById("ttsRateSlider");
        if (ttsSlider) {
            ttsSlider.addEventListener("input", (e) => {
                this.ttsRate = parseFloat(e.target.value) || 1.0;
            });
        }

        // Quick action prompt chips
        document.querySelectorAll(".prompt-chip").forEach(chip => {
            chip.addEventListener("click", () => {
                const query = chip.getAttribute("data-query") || chip.textContent;
                if (this.inputField) {
                    this.inputField.value = query.trim();
                }
                this.handleSendMessage();
            });
        });
    }

    setupQuickProviderBar() {
        const bar = document.getElementById("aiProviderQuickBar");
        if (!bar) return;

        bar.querySelectorAll(".provider-pill").forEach(pill => {
            pill.addEventListener("click", () => {
                const provider = pill.getAttribute("data-provider");
                this.switchProvider(provider);
            });
        });
    }

    switchProvider(provider) {
        this.aiSettings.provider = provider;
        localStorage.setItem("weathergpt_ai_provider", provider);
        this.updateAiEngineBadge();

        const pMeta = this.serverProviders[provider] || {};
        const pName = pMeta.name || provider.toUpperCase();
        this.appendMessage("assistant", `✨ Switched active AI Engine to **${pName}**.`);
    }

    refreshQuickBarStatus() {
        const bar = document.getElementById("aiProviderQuickBar");
        if (!bar) return;

        bar.querySelectorAll(".provider-pill").forEach(pill => {
            const p = pill.getAttribute("data-provider");
            const isConfigured = this.serverProviders[p]?.configured;
            pill.classList.toggle("configured", Boolean(isConfigured));
            pill.classList.toggle("active", p === this.aiSettings.provider);
        });
    }

    setupAiSettingsModal() {
        const openBtn = document.getElementById("openAiSettingsBtn");
        const modal = document.getElementById("aiSettingsModal");
        const closeBtn = document.getElementById("closeAiSettingsBtn");
        const saveBtn = document.getElementById("saveAiSettingsBtn");
        const providerSelect = document.getElementById("aiProviderSelect");
        const apiKeyInput = document.getElementById("aiApiKeyInput");
        const modelInput = document.getElementById("aiModelInput");
        const keyHelpLink = document.getElementById("apiKeyHelpLink");

        if (!modal) return;

        const defaultModels = {
            builtin: "MoES-MetBrain-v1",
            groq: "qwen/qwen3.8-27b",
            gemini: "gemini-3.6-flash",
            openrouter: "meta-llama/llama-3.3-70b-instruct",
            openai: "gpt-4o-mini",
            anthropic: "claude-3-5-sonnet-20241022",
            deepseek: "deepseek-chat",
            mistral: "mistral-small-latest",
            ollama: "llama3"
        };

        const updateFieldsForProvider = (provider) => {
            const isServerConfigured = Boolean(this.serverProviders[provider]?.configured);
            const defModel = defaultModels[provider] || "";

            if (provider === "builtin") {
                apiKeyInput.disabled = true;
                apiKeyInput.placeholder = "Not required for Built-in MoES Neural Engine";
                modelInput.disabled = true;
                modelInput.value = defModel;
                if (keyHelpLink) keyHelpLink.innerHTML = "⚡ 100% offline & zero-latency meteorological domain engine.";
            } else if (provider === "ollama") {
                apiKeyInput.disabled = true;
                apiKeyInput.placeholder = "Localhost daemon (no key needed)";
                modelInput.disabled = false;
                modelInput.value = this.aiSettings.model || defModel;
                if (keyHelpLink) keyHelpLink.innerHTML = "Local Ollama daemon running on <code>http://127.0.0.1:11434</code>";
            } else {
                apiKeyInput.disabled = false;
                modelInput.disabled = false;
                modelInput.value = this.aiSettings.model || defModel;
                
                const serverKeyNote = isServerConfigured ? " <strong style='color: #10b981;'>(Server Pre-Configured Key Active)</strong>" : "";
                apiKeyInput.placeholder = isServerConfigured ? "Pre-configured in .env (or enter override key)" : `Enter ${provider.toUpperCase()} API Key...`;

                const helpMap = {
                    groq: '👉 Free high-speed keys at <a href="https://console.groq.com/keys" target="_blank" style="color: #00f0ff;">console.groq.com</a>',
                    gemini: '👉 Free API key at <a href="https://aistudio.google.com/app/apikey" target="_blank" style="color: #00f0ff;">Google AI Studio</a>',
                    openrouter: '👉 Universal access at <a href="https://openrouter.ai/keys" target="_blank" style="color: #00f0ff;">openrouter.ai</a>',
                    openai: '👉 OpenAI developer keys at <a href="https://platform.openai.com/api-keys" target="_blank" style="color: #00f0ff;">platform.openai.com</a>',
                    anthropic: '👉 Anthropic Console at <a href="https://console.anthropic.com/settings/keys" target="_blank" style="color: #00f0ff;">console.anthropic.com</a>',
                    deepseek: '👉 DeepSeek Platform at <a href="https://platform.deepseek.com" target="_blank" style="color: #00f0ff;">platform.deepseek.com</a>',
                    mistral: '👉 Mistral La Plateforme at <a href="https://console.mistral.ai/api-keys" target="_blank" style="color: #00f0ff;">console.mistral.ai</a>'
                };

                if (keyHelpLink) {
                    keyHelpLink.innerHTML = `${helpMap[provider] || ""} ${serverKeyNote}`;
                }
            }
        };

        if (openBtn) {
            openBtn.addEventListener("click", () => {
                if (providerSelect) providerSelect.value = this.aiSettings.provider;
                if (apiKeyInput) apiKeyInput.value = this.aiSettings.apiKey;
                if (modelInput) modelInput.value = this.aiSettings.model;
                updateFieldsForProvider(this.aiSettings.provider);
                modal.classList.add("open");
            });
        }

        if (closeBtn) {
            closeBtn.addEventListener("click", () => modal.classList.remove("open"));
        }

        if (providerSelect) {
            providerSelect.addEventListener("change", (e) => {
                updateFieldsForProvider(e.target.value);
            });
        }

        if (saveBtn) {
            saveBtn.addEventListener("click", () => {
                this.aiSettings.provider = providerSelect.value;
                this.aiSettings.apiKey = apiKeyInput.value.trim();
                this.aiSettings.model = modelInput.value.trim();

                localStorage.setItem("weathergpt_ai_provider", this.aiSettings.provider);
                localStorage.setItem("weathergpt_ai_key", this.aiSettings.apiKey);
                localStorage.setItem("weathergpt_ai_model", this.aiSettings.model);

                this.updateAiEngineBadge();
                modal.classList.remove("open");
                this.appendMessage("assistant", `✨ AI settings saved! Active Engine: **${this.getProviderLabel()}**.`);
            });
        }
    }

    getProviderLabel() {
        const meta = {
            groq: "Groq Cloud (Qwen-3.8 27B / Llama 3.3)",
            gemini: "Google Gemini 3.6 Flash",
            openrouter: "OpenRouter Universal Gateway",
            openai: "OpenAI GPT-4o",
            anthropic: "Anthropic Claude 3.5 Sonnet",
            deepseek: "DeepSeek-V3 Chat",
            mistral: "Mistral AI Small",
            ollama: "Ollama Localhost",
            builtin: "MoES Built-in Neural Brain"
        };
        return meta[this.aiSettings.provider] || "MoES Built-in Met-Brain";
    }

    updateAiEngineBadge() {
        const badge = document.getElementById("aiEngineStatusBadge");
        const tag = document.getElementById("activeModelTag");
        const avatar = document.getElementById("activeAiAvatar");
        const bar = document.getElementById("aiProviderQuickBar");

        const styles = {
            groq: { label: "⚡ Groq Active", modelTag: "Groq Qwen-3.8", color: "#f59e0b", icon: "⚡" },
            gemini: { label: "✨ Gemini Active", modelTag: "Gemini 3.6 Flash", color: "#38bdf8", icon: "✨" },
            openrouter: { label: "🔀 OpenRouter Active", modelTag: "OpenRouter Llama 3.3", color: "#a855f7", icon: "🔀" },
            openai: { label: "🧠 OpenAI Active", modelTag: "GPT-4o-mini", color: "#10b981", icon: "🧠" },
            anthropic: { label: "🤖 Claude Active", modelTag: "Claude 3.5 Sonnet", color: "#f97316", icon: "🤖" },
            deepseek: { label: "🔮 DeepSeek Active", modelTag: "DeepSeek-V3", color: "#3b82f6", icon: "🔮" },
            mistral: { label: "🌊 Mistral Active", modelTag: "Mistral Small", color: "#ec4899", icon: "🌊" },
            ollama: { label: "🦙 Ollama Active", modelTag: "Ollama Local", color: "#64748b", icon: "🦙" },
            builtin: { label: "🌐 MoES Met-AI (Free)", modelTag: "MoES Met-Brain", color: "var(--accent-cyan)", icon: "🌐" }
        };

        const current = styles[this.aiSettings.provider] || styles.builtin;

        if (badge) {
            badge.innerHTML = current.label;
            badge.style.borderColor = current.color;
            badge.style.color = current.color;
        }

        if (tag) {
            tag.textContent = current.modelTag;
        }

        if (avatar) {
            avatar.textContent = current.icon;
        }

        if (bar) {
            bar.querySelectorAll(".provider-pill").forEach(p => {
                p.classList.toggle("active", p.getAttribute("data-provider") === this.aiSettings.provider);
            });
        }
    }

    async handleSendMessage() {
        if (!this.inputField) return;
        const query = this.inputField.value.trim();
        if (!query) return;

        this.inputField.value = "";
        this.appendMessage("user", query);

        const typingIndicator = this.showTypingIndicator();

        try {
            const currentCity = window.WeatherApp?.currentCity || "New Delhi";
            const currentCoords = window.WeatherApp?.currentCoords || null;
            const currentLang = window.I18N?.currentLang || "en";

            const payload = {
                query: query,
                city: currentCity,
                lat: currentCoords?.lat || null,
                lon: currentCoords?.lon || null,
                language: currentLang,
                provider: this.aiSettings.provider,
                api_key: this.aiSettings.apiKey || null,
                model: this.aiSettings.model || null
            };

            const res = await fetch("/api/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });

            typingIndicator.remove();

            if (res.ok) {
                const data = await res.json();
                this.appendMessage("assistant", data.response, data.speech_text, data.provider, data.model);
                this.speak(data.speech_text);
            } else {
                this.appendMessage("assistant", "⚠️ Error processing meteorological reasoning. Falling back to local IMD intelligence.");
            }
        } catch (e) {
            typingIndicator.remove();
            this.appendMessage("assistant", "⚠️ Communication issue with backend service. Please ensure the server is active.");
        }
    }

    appendMessage(sender, text, speech = "", provider = "", model = "") {
        if (!this.messagesContainer) return;

        const msgDiv = document.createElement("div");
        msgDiv.className = `chat-bubble ${sender}`;

        let providerBadge = "";
        if (sender === "assistant" && provider) {
            const badgeMeta = {
                groq: { name: "Groq", bg: "rgba(245,158,11,0.15)", border: "#f59e0b", color: "#f59e0b" },
                gemini: { name: "Gemini", bg: "rgba(56,189,248,0.15)", border: "#38bdf8", color: "#38bdf8" },
                openrouter: { name: "OpenRouter", bg: "rgba(168,85,247,0.15)", border: "#a855f7", color: "#a855f7" },
                openai: { name: "GPT-4o", bg: "rgba(16,185,129,0.15)", border: "#10b981", color: "#10b981" },
                anthropic: { name: "Claude", bg: "rgba(249,115,22,0.15)", border: "#f97316", color: "#f97316" },
                deepseek: { name: "DeepSeek", bg: "rgba(59,130,246,0.15)", border: "#3b82f6", color: "#3b82f6" },
                mistral: { name: "Mistral", bg: "rgba(236,72,153,0.15)", border: "#ec4899", color: "#ec4899" },
                builtin_neural: { name: "MoES Met-Brain", bg: "rgba(0,240,255,0.12)", border: "rgba(0,240,255,0.4)", color: "#00f0ff" }
            };
            const b = badgeMeta[provider] || badgeMeta.builtin_neural;
            providerBadge = `<span class="message-provider-tag" style="background: ${b.bg}; border-color: ${b.border}; color: ${b.color};">${b.name}</span>`;
        }

        const headerDiv = document.createElement("div");
        headerDiv.className = "chat-bubble-header";
        headerDiv.innerHTML = sender === "user" 
            ? `<span class="chat-avatar">👤</span> <strong>You</strong>`
            : `<span class="chat-avatar">🌐</span> <strong>WeatherGPT</strong> ${providerBadge}`;

        const bodyDiv = document.createElement("div");
        bodyDiv.className = "chat-bubble-body";
        bodyDiv.innerHTML = this.renderMarkdown(text);

        msgDiv.appendChild(headerDiv);
        msgDiv.appendChild(bodyDiv);

        // Actions Footer (Audio Readout & Copy Button)
        if (sender === "assistant") {
            const actionsFooter = document.createElement("div");
            actionsFooter.className = "chat-actions-footer";

            if (speech) {
                const audioAction = document.createElement("button");
                audioAction.className = "speech-replay-btn";
                audioAction.title = "Listen aloud";
                audioAction.innerHTML = `<span class="audio-icon">🔊</span> <span>Read Out Loud</span>`;
                audioAction.onclick = () => this.speak(speech);
                actionsFooter.appendChild(audioAction);
            }

            const copyBtn = document.createElement("button");
            copyBtn.className = "copy-msg-btn";
            copyBtn.title = "Copy message text";
            copyBtn.innerHTML = `📋 Copy`;
            copyBtn.onclick = () => {
                navigator.clipboard.writeText(text);
                copyBtn.innerHTML = `✅ Copied!`;
                setTimeout(() => { copyBtn.innerHTML = `📋 Copy`; }, 2000);
            };
            actionsFooter.appendChild(copyBtn);

            msgDiv.appendChild(actionsFooter);
        }

        this.messagesContainer.appendChild(msgDiv);
        this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
    }

    showTypingIndicator() {
        const ind = document.createElement("div");
        ind.className = "chat-bubble assistant typing";
        const providerName = this.getProviderLabel();
        ind.innerHTML = `
            <span class="chat-avatar">🌐</span>
            <div class="typing-dots">
                <span></span><span></span><span></span>
            </div>
            <span class="typing-label">${providerName} is analyzing meteorological telemetry...</span>
        `;
        this.messagesContainer.appendChild(ind);
        this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
        return ind;
    }

    renderMarkdown(text) {
        if (!text) return "";

        let lines = text.split("\n");
        let htmlLines = [];
        let inTable = false;
        let tableRows = [];
        let inList = false;
        let listType = "ul";

        const flushTable = () => {
            if (!tableRows.length) return "";
            let thead = "";
            let tbody = "";

            // Check if second row is separator
            let hasHeader = tableRows.length > 1 && tableRows[1].some(c => c.includes("---"));
            
            if (hasHeader) {
                thead = "<thead><tr>" + tableRows[0].map(c => `<th>${c}</th>`).join("") + "</tr></thead>";
                tbody = "<tbody>" + tableRows.slice(2).map(r => "<tr>" + r.map(c => `<td>${c}</td>`).join("") + "</tr>").join("") + "</tbody>";
            } else {
                tbody = "<tbody>" + tableRows.map(r => "<tr>" + r.map(c => `<td>${c}</td>`).join("") + "</tr>").join("") + "</tbody>";
            }

            tableRows = [];
            inTable = false;
            return `<div class="chat-table-wrapper"><table class="chat-table">${thead}${tbody}</table></div>`;
        };

        const flushList = () => {
            if (!inList) return "";
            inList = false;
            return `</${listType}>`;
        };

        for (let i = 0; i < lines.length; i++) {
            let line = lines[i];

            // 1. Table lines (| ... |)
            if (/^\s*\|.*\|\s*$/.test(line)) {
                if (inList) {
                    htmlLines.push(flushList());
                }
                inTable = true;
                const cells = line.split("|").map(c => c.trim()).slice(1, -1);
                tableRows.push(cells);
                continue;
            } else if (inTable) {
                htmlLines.push(flushTable());
            }

            // 2. Unordered lists (- item or * item)
            let ulMatch = line.match(/^(\s*)[-*]\s+(.*)$/);
            if (ulMatch) {
                if (!inList || listType !== "ul") {
                    if (inList) htmlLines.push(flushList());
                    htmlLines.push("<ul>");
                    inList = true;
                    listType = "ul";
                }
                htmlLines.push(`<li>${ulMatch[2]}</li>`);
                continue;
            }

            // 3. Ordered lists (1. item)
            let olMatch = line.match(/^(\s*)\d+\.\s+(.*)$/);
            if (olMatch) {
                if (!inList || listType !== "ol") {
                    if (inList) htmlLines.push(flushList());
                    htmlLines.push("<ol>");
                    inList = true;
                    listType = "ol";
                }
                htmlLines.push(`<li>${olMatch[2]}</li>`);
                continue;
            }

            // Normal text line - flush list if open
            if (inList) {
                htmlLines.push(flushList());
            }

            // Headers
            if (/^### (.*$)/.test(line)) {
                htmlLines.push(line.replace(/^### (.*$)/, '<h4>$1</h4>'));
            } else if (/^## (.*$)/.test(line)) {
                htmlLines.push(line.replace(/^## (.*$)/, '<h3>$1</h3>'));
            } else if (/^# (.*$)/.test(line)) {
                htmlLines.push(line.replace(/^# (.*$)/, '<h2>$1</h2>'));
            } else if (/^> (.*$)/.test(line)) {
                htmlLines.push(line.replace(/^> (.*$)/, '<blockquote class="chat-quote">$1</blockquote>'));
            } else if (line.trim().length === 0) {
                htmlLines.push('<div class="chat-line-break"></div>');
            } else {
                htmlLines.push(`<p>${line}</p>`);
            }
        }

        if (inTable) htmlLines.push(flushTable());
        if (inList) htmlLines.push(flushList());

        let result = htmlLines.join("");

        // Inline formatting
        result = result
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/`([^`]+)`/g, '<code class="chat-inline-code">$1</code>');

        return result;
    }
}

window.WeatherChat = WeatherChat;
