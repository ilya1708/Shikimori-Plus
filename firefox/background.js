"use strict";

const LIBRARY_CONFIGS = {
    ilya1708: {
        label: "ilya1708",
        sheetUrl: "https://docs.google.com/spreadsheets/d/1jXKEy7e_58TV1qhR8ED80rzn5NLLqck0_frBIgDabaA/export?format=csv&gid=0",
        colIndex: 3
    },
    yanima: {
        label: "Yanima",
        sheetUrl: "https://docs.google.com/spreadsheets/d/1hhZquzgpxPCe_lsSSdUdwWFLdPPAQbo8_qos2pQSj-0/export?format=csv&gid=0",
        colIndex: 2
    },
    krnzhnr: {
        label: "krnzhnr",
        sheetUrl: "https://docs.google.com/spreadsheets/d/1F9R-zmYwJ2rgG-iFQLtkngIBXHKMUs6a1tve_SJ2hpc/export?format=csv&gid=1165100109",
        colIndex: 2
    }
};

async function sync4KData() {
    const data = await chrome.storage.local.get("selected_libraries");
    const selected = data.selected_libraries || ["ilya1708"];

    console.log(`%c[4K-Extension] Синхронизация всех доступных библиотек...`, "color: #10b981; font-weight: bold;");

    const shiki4KMap = {}; // ID -> [Library Labels]
    const allLibKeys = Object.keys(LIBRARY_CONFIGS);

    for (const libKey of allLibKeys) {
        const config = LIBRARY_CONFIGS[libKey];
        if (!config) continue;

        try {
            const response = await fetch(config.sheetUrl);
            if (!response.ok) throw new Error(`Ошибка сети (${libKey}): ${response.status}`);

            const csvText = await response.text();
            const lines = csvText.split(/\r?\n/);

            for (let i = 1; i < lines.length; i++) {
                const line = lines[i].trim();
                if (!line) continue;
                const columns = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
                const animeId = columns[config.colIndex]?.trim();

                if (animeId && !isNaN(animeId)) {
                    if (!shiki4KMap[animeId]) {
                        shiki4KMap[animeId] = [];
                    }
                    if (!shiki4KMap[animeId].includes(config.label)) {
                        shiki4KMap[animeId].push(config.label);
                    }
                }
            }
        } catch (error) {
            console.error(`[4K-Extension] Ошибка синхронизации (${libKey}):`, error);
        }
    }

    const allIds = Object.keys(shiki4KMap);
    if (allIds.length > 0) {
        await chrome.storage.local.set({
            "shiki_4k_ids": allIds,
            "shiki_4k_map": shiki4KMap,
            "last_sync": Date.now()
        });
        console.log(`%c[4K-Extension] Синхронизация завершена! Всего тайтлов: ${allIds.length}`, "color: #10b981; font-weight: bold;");
    } else {
        console.warn("[4K-Extension] Данные не найдены ни в одной библиотеке.");
    }
}

// Инициализация при установке
chrome.runtime.onInstalled.addListener(() => {
    chrome.alarms.create("sync4k", { periodInMinutes: 1 });
    sync4KData();
});

// Дополнительный запуск при старте бэкграунда/браузера
sync4KData();

chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === "sync4k") {
        sync4KData();
    }
});

// Если пользователь поменял библиоткеки — синхронизируемся сразу
chrome.storage.onChanged.addListener((changes, area) => {
    if (area === "local" && changes.selected_libraries) {
        sync4KData();
    }
});

// Слушатель сообщений
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === "FETCH") {
        fetch(message.url, message.options)
            .then(async r => {
                const data = await r.json().catch(() => r.text());
                sendResponse({ ok: r.ok, status: r.status, data });
            })
            .catch(e => sendResponse({ ok: false, error: e.message }));
        return true;
    }
    if (message.type === "FORCE_SYNC") {
        sync4KData().then(() => sendResponse({ success: true }));
        return true;
    }
});
