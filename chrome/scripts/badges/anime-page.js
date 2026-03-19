"use strict";

(function initShikimori4KAnimePage() {
    const host = location.hostname;
    if (!host.includes('shikimori')) return;

    console.log("%c[4K-Extension] Anime Page Module Loaded (v1.7.2)", "color: #818cf8; font-weight: bold;");

    const animeUrlRegex = /\/animes\/[a-z]*?(\d+)/i;
    let observer = null;
    let cachedData = null;

    async function get4KData() {
        if (!chrome.runtime?.id) return { ids: [], map: {}, selectedLabels: [] };
        if (cachedData !== null) return cachedData;
        try {
            const data = await chrome.storage.local.get(["shiki_4k_ids", "shiki_4k_map", "selected_libraries"]);

            // Получаем метки (labels) для выбранных ключей (ilya1708 -> ilya1708, yanima -> Yanima, krnzhnr -> krnzhnr)
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

    // Универсальная функция извлечения ID из ссылки
    function extractAnimeId(href) {
        if (!href) return null;
        // Паттерн: /animes/123-slug или /animes/z123
        const match = href.match(/\/animes\/[a-z]*?(\d+)/i);
        return match ? match[1] : null;
    }

    async function checkAndAddBadge() {
        const { ids: ids4K, map: map4K, selectedLabels } = await get4KData();
        if (ids4K.length === 0) return;

        // 1. Основной заголовок на странице аниме (включая Хронологию)
        if (document.querySelector('.b-db_entry') || document.body.classList.contains('p-animes-chronology')) {
            const match = location.href.match(animeUrlRegex);
            if (match) {
                const animeId = match[1];
                const itemLibs = map4K[animeId] || [];

                // Показываем плашку только если аниме есть в ОДНОЙ ИЗ ВЫБРАННЫХ библиотек
                const hasInSelected = itemLibs.some(lib => selectedLabels.includes(lib));

                if (hasInSelected) {
                    const titleElement = document.querySelector('h1') || document.querySelector('.current-info h1');
                    if (titleElement && !titleElement.querySelector('.badge-4k-ext')) {
                        const tooltip = itemLibs.length > 0 ? `В наличии у: ${itemLibs.join(', ')}` : '';
                        const badge = createBadge('14px', '28px', '5px', '12px', tooltip);

                        // Если в H1 есть кнопка "назад" (span.back), вставляем ПОСЛЕ нее
                        const backButton = titleElement.querySelector('.back');
                        if (backButton) {
                            backButton.after(badge);
                        } else {
                            titleElement.prepend(badge);
                        }
                    }
                }
            }
        }

        // 2. Блок "Связанное" (Related) и страницы Хронологии/Франшизы
        const relatedItemSelectors = [
            '.b-db_entry-variant-listing_item:not(.badge-4k-related-processed)',
            'div.b-db_entry-variant-list_item:not(.badge-4k-related-processed)',
            '.cc-chronology .b-link:not(.badge-4k-related-processed)',
            '.p-db_entries-chronology .b-link:not(.badge-4k-related-processed)',
            '.cc-chronology .image:not(.badge-4k-related-processed)',
            '.cc-franchise .b-link:not(.badge-4k-related-processed)',
            '.cc-related .b-link:not(.badge-4k-related-processed)',
            '.breadcrumbs .b-link:not(.badge-4k-related-processed)',
            '.b-ajax-link:not(.badge-4k-related-processed)'
        ];

        const elements = document.querySelectorAll(relatedItemSelectors.join(', '));

        elements.forEach(item => {
            const link = item.tagName === 'A' ? item : item.querySelector('a.b-link');

            if (link) {
                const href = link.getAttribute('href');
                const animeId = extractAnimeId(href);
                const itemLibs = map4K[animeId] || [];
                const hasInSelected = itemLibs.some(lib => selectedLabels.includes(lib));

                if (animeId && hasInSelected) {
                    if (!link.querySelector('.badge-4k-related')) {
                        const tooltip = itemLibs.length > 0 ? `В наличии у: ${itemLibs.join(', ')}` : '';

                        // Если это хлебные крошки, еще меньше
                        const isBreadcrumb = link.closest('.breadcrumbs');
                        const fSize = isBreadcrumb ? '9px' : '11px';
                        const side = isBreadcrumb ? '18px' : '22px';
                        const rad = isBreadcrumb ? '3px' : '4px';
                        const marg = isBreadcrumb ? '6px' : '8px';

                        const badge = createBadge(fSize, side, rad, marg, tooltip);
                        badge.className += ' badge-4k-related';
                        link.prepend(badge);
                    }
                }
            }
            item.classList.add('badge-4k-related-processed');
        });
    }

    function show4KPopup(target, libraries) {
        const existing = document.querySelector('.ext-4k-popup');
        if (existing) {
            const isSameTarget = existing._target === target;
            existing.remove();
            if (isSameTarget) return; // Повторный клик — просто закрываем
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

    function createBadge(fontSize, size, borderRadius, marginRight, tooltip = '') {
        const badge = document.createElement('span');
        badge.className = 'badge-4k-ext';
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
            fontSize: fontSize,
            fontWeight: 'bold',
            width: size,
            height: size,
            borderRadius: borderRadius,
            marginRight: marginRight,
            verticalAlign: 'middle',
            boxShadow: '0 2px 6px rgba(0, 0, 0, 0.6), 0 0 4px rgba(99, 102, 241, 0.2)',
            textShadow: '0 1px 1px rgba(0, 0, 0, 0.8)',
            userSelect: 'none',
            letterSpacing: '0.5px',
            cursor: tooltip ? 'pointer' : 'default',
            pointerEvents: 'auto',
            flexShrink: '0',
            boxSizing: 'border-box',
            lineHeight: '1'
        });
        return badge;
    }

    function setup() {
        if (observer) observer.disconnect();
        observer = new MutationObserver((mutations) => {
            // При изменениях в DOM перезапускаем проверку
            checkAndAddBadge();
        });
        observer.observe(document.body, { childList: true, subtree: true });

        // Слушаем клики по кнопке "Показать остальное"
        document.addEventListener('click', (e) => {
            if (e.target.closest('.js-show_more')) {
                console.log("[4K-Extension] Show more clicked, re-checking...");
                setTimeout(checkAndAddBadge, 500);
            }
        });

        checkAndAddBadge();
    }

    setup();
    document.addEventListener('turbolinks:load', () => {
        cachedData = null; // Сбрасываем кэш при навигации
        setup();
    });

    // Периодическая проверка — также сбрасываем кэш чтобы перечитать из стоража после синхронизации
    setInterval(() => { cachedData = null; checkAndAddBadge(); }, 5000);
})();
