"use strict";

function formatTime(ts) {
    if (!ts) return "—";
    const d = new Date(ts);
    return d.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
}

function setActiveBtn(lib) {
    document.querySelectorAll(".library-btn").forEach(btn => {
        btn.classList.toggle("active", btn.dataset.lib === lib);
    });
}

async function loadState() {
    const features = ["feature_player", "feature_copy_title", "feature_shiki_buttons", "feature_yanima_buttons", "feature_display_id", "feature_mal_rating", "feature_search_links"];
    const data = await chrome.storage.local.get([...features, "selected_libraries", "last_sync"]);

    features.forEach(f => {
        const el = document.getElementById(f.replace(/-/g, "_").replace(/_/g, "-")); // маппинг feature_player -> feature-player
        if (el) el.checked = data[f] !== false;
    });

    const selected = data.selected_libraries || ["ilya1708"];
    setActiveBtns(selected);
    document.getElementById("last-sync").textContent = formatTime(data.last_sync);
}

function setActiveBtns(selected) {
    document.querySelectorAll(".library-btn").forEach(btn => {
        btn.classList.toggle("active", selected.includes(btn.dataset.lib));
    });
}

function markAsChanged() {
    document.getElementById("btn-refresh").classList.add("active");
}

async function toggleLibrary(lib) {
    const data = await chrome.storage.local.get("selected_libraries");
    let selected = data.selected_libraries || ["ilya1708"];

    if (selected.includes(lib)) {
        selected = selected.filter(id => id !== lib);
    } else {
        selected.push(lib);
    }

    await chrome.storage.local.set({ selected_libraries: selected });
    setActiveBtns(selected);
    markAsChanged();

    const statusEl = document.getElementById("status-msg");
    statusEl.textContent = "Синхронизация...";

    try {
        await chrome.runtime.sendMessage({ type: "FORCE_SYNC" });
        const dataSync = await chrome.storage.local.get("last_sync");
        document.getElementById("last-sync").textContent = formatTime(dataSync.last_sync);
        statusEl.textContent = "✅ Обновлено!";
    } catch (e) {
        statusEl.textContent = "⚠️ Ошибка";
    }

    setTimeout(() => { statusEl.textContent = ""; }, 2000);
}

document.querySelectorAll(".library-btn").forEach(btn => {
    btn.addEventListener("click", () => toggleLibrary(btn.dataset.lib));
});

// Слушаем изменения переключателей функций
document.querySelectorAll(".switch input").forEach(input => {
    input.addEventListener("change", (e) => {
        const key = e.target.id.replace(/-/g, "_");
        chrome.storage.local.set({ [key]: e.target.checked });
        markAsChanged();
    });
});

// Кнопка перезагрузки
document.getElementById("btn-refresh").addEventListener("click", async () => {
    const btn = document.getElementById("btn-refresh");
    if (!btn.classList.contains("active")) return;

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab) {
        chrome.tabs.reload(tab.id);
        window.close();
    }
});

loadState();
