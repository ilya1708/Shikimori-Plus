"use strict";

(function initShikimoriModule() {
    const host = location.hostname;
    if ((!host.includes('shikimori') && !host.includes('shiki.one'))) return;

    console.log("Shikimori Buttons Module V2.4.4 Initialized");

    const animeUrlRegex = /\/animes\/[a-z]*?(\d+)/i;
    let observer = null;

    async function insertInitialUI() {
        const data = await chrome.storage.local.get("feature_shiki_buttons");
        if (data.feature_shiki_buttons === false) return;

        const match = location.href.match(animeUrlRegex);
        if (!match) return;

        const animeId = match[1];
        const poster = document.querySelector('.c-image');
        if (!poster) return;

        // Проверка на текущее аниме, чтобы не пересоздавать
        if (poster.dataset.lastId === animeId && poster.querySelector('.ext-btn-added')) return;

        // Очищаем старое
        poster.querySelectorAll('.ext-btn-added').forEach(el => el.remove());
        poster.dataset.lastId = animeId;

        console.log("Мгновенное добавление кнопок для:", animeId);

        // 1. Создаем Yanima (мгновенно)
        const btnYanima = document.createElement('a');
        btnYanima.className = 'b-link_button ext-btn-added yanima-link';
        btnYanima.textContent = 'Yanima';
        btnYanima.href = 'https://yanima.space/anime/' + animeId;
        btnYanima.target = '_blank';
        btnYanima.style.marginBottom = '10px';
        poster.append(btnYanima);

        // 2. Запускаем фоновый запрос
        chrome.runtime.sendMessage({
            type: "FETCH",
            url: 'https://smotret-anime.com/api/series/?myAnimeListId=' + animeId
        }, (result) => {
            if (chrome.runtime.lastError) {
                console.error("Background script connection error:", chrome.runtime.lastError);
                return;
            }

            // Если аниме сменилось пока шел запрос, не трогаем ничего
            if (poster.dataset.lastId !== animeId) return;

            if (result && result.ok && result.data?.data?.[0]) {
                const url = result.data.data[0].url;

                // Проверяем, нет ли уже этой кнопки
                if (poster.querySelector('.anime365-link')) return;

                const btn365 = document.createElement('a');
                btn365.className = 'b-link_button ext-btn-added anime365-link';
                btn365.textContent = 'Anime365';
                btn365.href = url.startsWith('http') ? url : `https://smotret-anime.com${url}`;
                btn365.target = '_blank';
                btn365.style.marginTop = '8px';

                // Вставляем строго ПОСЛЕ Yanima
                btnYanima.after(btn365);
                console.log("Anime365 загружен и добавлен под Yanima:", btn365.href);
            } else {
                console.log("Anime365 не найден для этого аниме");
            }
        });
    }

    function setup() {
        if (observer) observer.disconnect();
        observer = new MutationObserver((mutations) => {
            insertInitialUI();
        });
        observer.observe(document.body, { childList: true, subtree: true });
        insertInitialUI();
    }

    setup();
    document.addEventListener('turbolinks:load', setup);

    // Принудительная проверка каждые 5 сек, чтобы кнопки не пропадали
    setInterval(insertInitialUI, 5000);
})();
