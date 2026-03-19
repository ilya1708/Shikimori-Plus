"use strict";

const darkThemeCSS = `
:root {
  --sp-bg-primary: #0a0a0a;
  --sp-bg-secondary: #1a1a1a;
  --sp-bg-tertiary: #252525;
  --sp-bg-hover: #2a2a2a;
  --sp-text-primary: #e0e0e0;
  --sp-text-secondary: #b0b0b0;
  --sp-text-muted: #808080;
  --sp-accent: #6366f1;
  --sp-accent-hover: #818cf8;
  --sp-error: #ef4444;
  --sp-border-color: #333333;
  --sp-radius-md: 8px;
  --sp-radius-lg: 12px;
  --sp-spacing-sm: 8px;
  --sp-spacing-md: 10px;
  --sp-transition-fast: 150ms ease;
  --sp-transition-normal: 250ms ease;
}
.sp-outer-wrapper { margin: 24px 0 !important; animation: fadeInUp 0.5s ease-out !important; }
.sp-wrapper { background: var(--sp-bg-primary) !important; border: 1px solid var(--sp-border-color) !important; border-radius: var(--sp-radius-lg) !important; overflow: hidden !important; transition: all var(--sp-transition-normal) !important; position: relative !important; }
.sp-container { background: var(--sp-bg-secondary) !important; border-radius: var(--sp-radius-lg) !important; overflow: hidden !important; }
.sp-header { background: linear-gradient(135deg, #2b2a39eb 0%, #2b2a39eb 100%) !important; padding: var(--sp-spacing-md) !important; border-bottom: 1px solid var(--sp-border-color) !important; display: flex !important; align-items: center !important; justify-content: space-between !important; }
.sp-title { color: var(--sp-text-primary) !important; font-size: 18px !important; font-weight: 600 !important; margin: 0 !important; }
.sp-viewer { background: var(--sp-bg-primary) !important; min-height: 500px !important; height: 500px !important; position: relative !important; overflow: hidden !important; }
.sp-viewer iframe { border: none !important; width: 100% !important; height: 100% !important; }
.sp-loading-overlay { position: absolute !important; top: 0 !important; left: 0 !important; right: 0 !important; bottom: 0 !important; background: rgba(10, 10, 10, 0.9) !important; display: flex !important; align-items: center !important; justify-content: center !important; z-index: 100 !important; backdrop-filter: blur(4px) !important; }
.sp-loading-overlay::after { content: "" !important; width: 40px !important; height: 40px !important; border: 3px solid var(--sp-border-color) !important; border-top: 3px solid var(--sp-accent) !important; border-radius: 50% !important; animation: spin 1s linear infinite !important; }
@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
@keyframes fadeInUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
.sp-wrapper * { box-sizing: border-box !important; }
`;

function injectDarkTheme() {
  if (document.getElementById("shikiplayer-dark-theme")) return;
  const style = document.createElement("style");
  style.id = "shikiplayer-dark-theme";
  style.textContent = darkThemeCSS;
  document.head.appendChild(style);
}

class KodikApi {
  constructor(token) {
    this._token = token;
  }
  async search(shikimoriId) {
    return new Promise((resolve) => {
      let url = new URL("https://kodikapi.com/search");
      url.searchParams.set("token", this._token);
      url.searchParams.set("shikimori_id", shikimoriId);

      chrome.runtime.sendMessage({
        type: "FETCH",
        url: url.toString()
      }, (result) => {
        if (result && result.ok && result.data) {
          resolve(result.data.results || []);
        } else {
          console.error("Kodik search error:", result ? result.error : "Unknown error");
          resolve([]);
        }
      });
    });
  }
}

class Shikiplayer {
  constructor(api) {
    this._api = api;
    this.element = document.createElement("div");
    this.element.className = "sp-outer-wrapper";

    const wrapper = document.createElement("div");
    wrapper.className = "sp-wrapper";

    const container = document.createElement("div");
    container.className = "sp-container";

    const header = document.createElement("div");
    header.className = "sp-header";

    const title = document.createElement("div");
    title.className = "sp-title";
    title.textContent = "Онлайн-просмотр";
    header.appendChild(title);

    const viewer = document.createElement("div");
    viewer.className = "sp-viewer";

    const loading = document.createElement("div");
    loading.className = "sp-loading-overlay";
    viewer.appendChild(loading);

    container.appendChild(header);
    container.appendChild(viewer);
    wrapper.appendChild(container);

    this.element.appendChild(wrapper);

    this._viewer = viewer;
    this._loadingOverlay = loading;
  }

  async start() {
    injectDarkTheme();
    const existing = document.querySelector(".sp-outer-wrapper");
    if (existing) existing.remove();

    const entryElement = document.querySelector(".b-db_entry .b-user_rate");
    if (!entryElement) return;

    let entry;
    try {
      entry = JSON.parse(entryElement.getAttribute("data-entry"));
    } catch (e) { return; }

    if (!entry || !entry.id) return;

    const before = document.querySelector(".b-db_entry");
    if (before) before.after(this.element);

    const results = await this._api.search(entry.id);
    if (results && results.length > 0) {
      this.loadPlayer(results[0].link);
    } else {
      while (this._viewer.firstChild) this._viewer.removeChild(this._viewer.firstChild);
      const errorDiv = document.createElement("div");
      Object.assign(errorDiv.style, {
        color: 'var(--sp-text-muted)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%'
      });
      errorDiv.textContent = 'Плеер Kodik не найден';
      this._viewer.appendChild(errorDiv);
      this._loadingOverlay.style.display = "none";
    }
  }

  loadPlayer(link) {
    this._loadingOverlay.style.display = "flex";
    while (this._viewer.firstChild) this._viewer.removeChild(this._viewer.firstChild);

    const iframe = document.createElement("iframe");
    iframe.allowFullscreen = true;
    iframe.width = "100%";
    iframe.style.aspectRatio = "16 / 9";
    iframe.src = link.startsWith("http") ? link : `https:${link}`;

    this._viewer.appendChild(iframe);
    setTimeout(() => { this._loadingOverlay.style.display = "none"; }, 500);
  }
}

(function initPlayerModule() {
  const allowedHostnames = ["shikimori.one", "shikimori.io", "shiki.one"];
  if (!allowedHostnames.includes(location.hostname)) return;
  if (location.pathname.startsWith('/mangas/')) return;

  const api = new KodikApi("a0457eb45312af80bbb9f3fb33de3e93");
  let shikiplayer = null;

  async function boot() {
    const data = await chrome.storage.local.get("feature_player");
    if (data.feature_player === false) return; // По умолчанию true, отключаем только если явно false

    if (document.querySelector(".sp-outer-wrapper")) return;
    shikiplayer = new Shikiplayer(api);
    await shikiplayer.start();
  }

  boot();
  document.addEventListener("turbolinks:load", boot);

  setInterval(boot, 5000);

  // Мгновенная реакция на изменение настроек
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes.feature_player) {
      if (changes.feature_player.newValue === false) {
        const existing = document.querySelector(".sp-outer-wrapper");
        if (existing) existing.remove();
      } else {
        boot();
      }
    }
  });
})();
