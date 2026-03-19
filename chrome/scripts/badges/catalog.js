"use strict";

(function initShikimori4KCatalog() {
    const host = location.hostname;
    if (!host.includes('shikimori')) return;

    console.log("%c[4K-Extension] Catalog Module Loaded (v1.2.9)", "color: #818cf8; font-weight: bold;");

    let observer = null;
    let cachedData = null;

    async function get4KData() {
        if (!chrome.runtime?.id) return { ids: [], map: {}, selectedLabels: [] };
        if (cachedData !== null) return cachedData;
        try {
            const data = await chrome.storage.local.get(["shiki_4k_ids", "shiki_4k_map", "selected_libraries"]);

            const libLabels = {
                ilya1708: "ilya1708",
                yanima: "Yanima",
                krnzhnr: "krnzhnr"
            };
            const selectedKeys = data.selected_libraries || ["ilya1708"];
            const selectedLabels = selectedKeys.map(k => libLabels[k]).filter(Boolean);

            cachedData = {
                ids: data.shiki_4k_ids || [],
                map: data.shiki_4k_map || {},
                selectedLabels: selectedLabels
            };
            return cachedData;
        } catch (e) {
            console.error("[4K-Extension] Storage Error:", e);
            return { ids: [], map: {}, selectedLabels: ["ilya1708"] };
        }
    }

    async function addBadgesToCatalog() {
        const { ids: ids4K, map: map4K, selectedLabels } = await get4KData();
        if (ids4K.length === 0) return;

        // 1. Поиск карточек аниме
        const cards = document.querySelectorAll('article.c-anime:not(.badge-4k-processed)');

        cards.forEach(card => {
            let animeId = card.dataset.id;
            if (!animeId) {
                const link = card.querySelector('a.cover');
                const href = link?.getAttribute('href');
                const match = href?.match(/\/animes\/[a-z]*?(\d+)/);
                animeId = match ? match[1] : null;
            }

            if (animeId) {
                const itemLibs = map4K[animeId] || [];
                const hasInSelected = itemLibs.some(lib => selectedLabels.includes(lib));

                if (hasInSelected) {
                    const tooltip = itemLibs.length > 0 ? `В наличии у: ${itemLibs.join(', ')}` : '';
                    addBadgeToCard(card, tooltip);
                }
            }
            card.classList.add('badge-4k-processed');
        });

        // 2. Поиск в выпадающем списке поиска
        const searchItems = document.querySelectorAll('a.b-db_entry-variant-list_item:not(.badge-4k-processed)');
        searchItems.forEach(item => {
            const href = item.getAttribute('href');
            const match = href?.match(/\/animes\/[a-z]*?(\d+)/);
            const animeId = match ? match[1] : null;

            if (animeId) {
                const itemLibs = map4K[animeId] || [];
                const hasInSelected = itemLibs.some(lib => selectedLabels.includes(lib));

                if (hasInSelected) {
                    const tooltip = itemLibs.length > 0 ? `В наличии у: ${itemLibs.join(', ')}` : '';
                    addBadgeToSearchItem(item, tooltip);
                }
            }
            item.classList.add('badge-4k-processed');
        });
    }

    function show4KPopup(target, libraries) {
        const existing = document.querySelector('.ext-4k-popup');
        if (existing) {
            const isSameTarget = existing._target === target;
            existing.remove();
            if (isSameTarget) return;
        }

        const popup = document.createElement('div');
        popup.className = 'ext-4k-popup';
        popup._target = target;

        Object.assign(popup.style, {
            position: 'fixed', zIndex: '10001',
            background: 'rgba(26, 26, 26, 0.95)', border: '1px solid #444', borderRadius: '8px',
            padding: '12px', boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
            color: 'white', fontFamily: 'sans-serif', fontSize: '13px',
            width: 'max-content', maxWidth: '250px',
            opacity: '0', transition: 'opacity 0.2s ease, transform 0.2s ease', transform: 'translateY(5px)'
        });

        const titleDiv = document.createElement('div');
        titleDiv.textContent = 'В наличии у:';
        Object.assign(titleDiv.style, {
            fontWeight: 'bold',
            color: '#818cf8',
            marginBottom: '8px',
            borderBottom: '1px solid #333',
            paddingBottom: '4px'
        });
        popup.appendChild(titleDiv);

        const listDiv = document.createElement('div');
        Object.assign(listDiv.style, {
            display: 'flex',
            flexDirection: 'column',
            gap: '4px'
        });

        libraries.forEach(lib => {
            const item = document.createElement('div');
            Object.assign(item.style, {
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
            });
            const dot = document.createElement('span');
            Object.assign(dot.style, {
                width: '6px',
                height: '6px',
                background: '#6366f1',
                borderRadius: '50%'
            });
            item.appendChild(dot);
            item.appendChild(document.createTextNode(lib));
            listDiv.appendChild(item);
        });
        popup.appendChild(listDiv);

        document.body.appendChild(popup);
        const rect = target.getBoundingClientRect();
        const popupRect = popup.getBoundingClientRect();
        let top = rect.bottom + 8;
        let left = rect.left + (rect.width / 2) - (popupRect.width / 2);

        if (left < 10) left = 10;
        if (left + popupRect.width > window.innerWidth - 10) left = window.innerWidth - popupRect.width - 10;
        if (top + popupRect.height > window.innerHeight - 10) top = rect.top - popupRect.height - 8;

        popup.style.top = `${top}px`;
        popup.style.left = `${left}px`;

        requestAnimationFrame(() => { popup.style.opacity = '1'; popup.style.transform = 'translateY(0)'; });

        const closePopup = () => {
            popup.style.opacity = '0'; popup.style.transform = 'translateY(5px)';
            setTimeout(() => popup.remove(), 200);
            document.removeEventListener('click', closeHandler);
            window.removeEventListener('scroll', closePopup);
        };

        const closeHandler = (e) => {
            if (!popup.contains(e.target) && e.target !== target) closePopup();
        };

        setTimeout(() => {
            document.addEventListener('click', closeHandler);
            window.addEventListener('scroll', closePopup, { passive: true });
        }, 10);
    }

    function addBadgeToCard(card, tooltip = '') {
        const cover = card.querySelector('.cover');
        if (!cover || cover.querySelector('.badge-4k-catalog')) return;

        if (getComputedStyle(cover).position === 'static') {
            cover.style.position = 'relative';
        }

        const badge = document.createElement('span');
        badge.className = 'badge-4k-catalog';
        badge.textContent = '4K';

        if (tooltip) {
            badge.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                const libs = tooltip.replace('В наличии у: ', '').split(', ');
                show4KPopup(badge, libs);
            });
        }

        Object.assign(badge.style, {
            position: 'absolute',
            top: '8px',
            left: '8px',
            zIndex: '15',
            background: 'linear-gradient(135deg, #818cf8 0%, #6366f1 100%)',
            color: 'white',
            fontSize: '11px',
            fontWeight: 'bold',
            width: '22px',
            height: '22px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '4px',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.8), 0 0 3px rgba(99, 102, 241, 0.3)',
            pointerEvents: 'auto',
            textShadow: '0 1px 1px rgba(0, 0, 0, 0.9)',
            letterSpacing: '0.3px',
            cursor: tooltip ? 'pointer' : 'default',
            boxSizing: 'border-box',
            lineHeight: '1'
        });

        cover.appendChild(badge);
    }

    function addBadgeToSearchItem(item, tooltip = '') {
        const name = item.querySelector('.name');
        if (!name || name.querySelector('.badge-4k-search')) return;

        const badge = document.createElement('span');
        badge.className = 'badge-4k-search';
        badge.textContent = '4K';

        if (tooltip) {
            badge.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                const libs = tooltip.replace('В наличии у: ', '').split(', ');
                show4KPopup(badge, libs);
            });
        }

        Object.assign(badge.style, {
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(135deg, #818cf8 0%, #6366f1 100%)',
            color: 'white',
            fontSize: '11px',
            fontWeight: 'bold',
            width: '22px',
            height: '22px',
            borderRadius: '4px',
            marginRight: '7px',
            verticalAlign: 'text-top',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.4)',
            textShadow: '0 1px 1px rgba(0, 0, 0, 0.6)',
            cursor: tooltip ? 'pointer' : 'default',
            pointerEvents: 'auto',
            boxSizing: 'border-box',
            lineHeight: '1',
            flexShrink: '0'
        });

        name.prepend(badge);
    }

    function setup() {
        if (observer) observer.disconnect();
        observer = new MutationObserver(() => addBadgesToCatalog());
        observer.observe(document.body, { childList: true, subtree: true });
        addBadgesToCatalog();
    }

    setup();
    document.addEventListener('turbolinks:load', () => {
        cachedData = null;
        setup();
    });

    // Периодическая проверка — сбрасываем кэш чтобы перечитать id из стоража
    setInterval(() => {
        cachedData = null;
        document.querySelectorAll('.badge-4k-processed').forEach(el => el.classList.remove('badge-4k-processed'));
        addBadgesToCatalog();
    }, 5000);
})();
