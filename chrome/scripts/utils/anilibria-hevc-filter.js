"use strict";

(function initAnilibriaHevcFilter() {
    console.log("%c[Shikimori Plus] Anilibria HEVC Filter v2.5.1 Loaded", "color: #f59e0b; font-weight: bold;");

    // Only run on torrent pages
    function isTorrentPage() {
        return location.pathname.includes('/anime/torrents') ||
               location.pathname.includes('/torrents');
    }

    async function applyHevcFilter() {
        if (!chrome.runtime?.id) return;
        if (!isTorrentPage()) return;

        const data = await chrome.storage.local.get("feature_hevc_filter");
        if (data.feature_hevc_filter === false) return;

        removeHevcBlocks();
    }

    function removeHevcBlocks() {
        // Various selectors anilibria uses for torrent rows/cards
        const selectors = [
            'tr',
            '.torrent-item',
            '.release-item',
            '.table-row',
            '[class*="torrent"]',
            '[class*="release"]',
            'li'
        ];

        let removed = 0;

        // Strategy 1: find table rows or list items containing HEVC text
        document.querySelectorAll('tr, li, .torrent-item, [class*="torrent-row"], [class*="torrent_row"]').forEach(row => {
            if (row.dataset.hevcChecked) return;
            row.dataset.hevcChecked = '1';

            const text = row.textContent || '';
            if (/\bHEVC\b/i.test(text)) {
                row.style.display = 'none';
                removed++;
            }
        });

        // Strategy 2: find any block that has a prominent HEVC badge/label
        document.querySelectorAll('[class*="card"], [class*="Card"], article, .item, [class*="item"]').forEach(card => {
            if (card.dataset.hevcChecked) return;
            card.dataset.hevcChecked = '1';

            const text = card.textContent || '';
            if (/\bHEVC\b/i.test(text)) {
                card.style.display = 'none';
                removed++;
            }
        });

        if (removed > 0) {
            console.log(`%c[Shikimori Plus] Скрыто HEVC блоков: ${removed}`, "color: #f59e0b;");
        }
    }

    // Listen for storage changes (toggle in popup)
    chrome.storage.onChanged.addListener((changes, area) => {
        if (!chrome.runtime?.id) return;
        if (area === 'local' && changes.feature_hevc_filter) {
            if (changes.feature_hevc_filter.newValue === false) {
                // Restore hidden rows
                document.querySelectorAll('[data-hevc-checked]').forEach(el => {
                    el.style.display = '';
                    delete el.dataset.hevcChecked;
                });
            } else {
                applyHevcFilter();
            }
        }
    });

    // Initial run
    applyHevcFilter();

    // Re-run on navigation changes (SPA support)
    const observer = new MutationObserver(() => {
        if (isTorrentPage()) {
            applyHevcFilter();
        }
    });

    observer.observe(document.body, { childList: true, subtree: true });

    // Also listen for turbolinks / pushstate navigation
    document.addEventListener('turbolinks:load', applyHevcFilter);
    window.addEventListener('popstate', applyHevcFilter);
})();
