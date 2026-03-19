"use strict";

(function initYanimaModule() {
    const host = location.hostname;
    if (host !== 'yanima.space') return;

    console.log("Yanima Buttons Module Initialized");

    let observer = null;
    let lastUrl = location.href;

    async function createShikiButton() {
        const data = await chrome.storage.local.get("feature_yanima_buttons");
        if (data.feature_yanima_buttons === false) return;

        if (document.querySelector('#shiki-btn')) return;
        const watchLink = document.querySelector('a[href^="/play/"]');
        if (!watchLink) return;
        const parent = watchLink.parentElement;
        if (!parent) return;

        parent.style.display = 'flex';
        parent.style.alignItems = 'center';
        parent.style.gap = '8px';

        // Извлекаем ID аниме из URL Yanima (обычно это /anime/ID или /play/ID)
        const pathParts = location.pathname.split('/').filter(p => p !== "");
        const animeId = pathParts[pathParts.length - 1];

        if (!animeId || isNaN(parseInt(animeId))) {
            return;
        }

        const url = `https://shikimori.one/animes/${animeId}`;
        const watchBtn = watchLink.querySelector('.style-module__vb1Hpa__button_base_style');
        if (!watchBtn) return;

        const btn = watchBtn.cloneNode(true);
        btn.id = 'shiki-btn';
        const icon = btn.querySelector('.materialIcon-module__AAwZJq__material_symbols');
        if (icon) {
            icon.textContent = 'open_in_new';
            icon.style.opacity = '1';
        }
        const text = btn.querySelector('.style-module__vb1Hpa__text');
        if (text) text.textContent = 'Shikimori';

        const link = document.createElement('a');
        link.href = url;
        link.target = '_blank';
        link.style.textDecoration = 'none';
        link.style.color = 'inherit';
        link.appendChild(btn);
        watchLink.after(link);
        console.log("Shikimori button added to Yanima");
    }

    function startObserver() {
        if (observer) observer.disconnect();
        observer = new MutationObserver(() => {
            if (location.href !== lastUrl) {
                lastUrl = location.href;
                document.querySelector('#shiki-btn')?.remove();
            }
            createShikiButton();
        });
        observer.observe(document.body, { childList: true, subtree: true });
        createShikiButton();
    }

    // Handle SPA navigation
    const pushState = history.pushState;
    history.pushState = function () {
        pushState.apply(this, arguments);
        startObserver();
    };
    window.addEventListener('popstate', startObserver);
    startObserver();

    // Принудительная проверка
    setInterval(createShikiButton, 5000);
})();
