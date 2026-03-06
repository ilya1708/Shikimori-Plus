"use strict";

(function initExtraFeatures() {
    console.log("%c[Yanima] Extra Features Module v2.4.4 Loaded", "color: #10b981; font-weight: bold;");

    function showToast(message) {
        let oldToast = document.getElementById('yanima-copy-toast');
        if (oldToast) oldToast.remove();

        const toast = document.createElement('div');
        toast.id = 'yanima-copy-toast';
        toast.textContent = message;

        Object.assign(toast.style, {
            position: 'fixed',
            bottom: '20px',
            right: '20px',
            backgroundColor: '#10b981',
            color: 'white',
            padding: '10px 20px',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: 'bold',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
            zIndex: '999999',
            opacity: '0',
            transition: 'opacity 0.3s ease, transform 0.3s ease',
            transform: 'translateY(20px)',
            pointerEvents: 'none',
            fontFamily: 'sans-serif'
        });

        document.body.appendChild(toast);

        requestAnimationFrame(() => {
            toast.style.opacity = '1';
            toast.style.transform = 'translateY(0)';
        });

        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateY(20px)';
            setTimeout(() => toast.remove(), 300);
        }, 2000);
    }

    async function applyFeatures() {
        if ((!location.hostname.includes('shikimori') && !location.hostname.includes('shiki.one'))) return;

        const data = await chrome.storage.local.get(["feature_mal_rating", "feature_search_links"]);

        // 1. РЕАЛЬНЫЙ РЕЙТИНГ (Расчет из статистики)
        if (data.feature_mal_rating !== false) {
            injectRealRating();
        }

        // 2. ССЫЛКИ ДЛЯ ПОИСКА
        if (data.feature_search_links !== false) {
            injectSearchLinks();
        }

        // 3. СТРОКА КОПИРОВАНИЯ В ТАБЛИЦУ (Зависит от "Копирование информации")
        const idData = await chrome.storage.local.get("feature_display_id");
        if (idData.feature_display_id !== false) {
            injectCopyTableButton();
        }
    }

    function calculateAverage() {
        const statsEl = document.getElementById('rates_scores_stats');
        if (!statsEl) return null;

        try {
            const dataStats = JSON.parse(statsEl.getAttribute('data-stats'));
            let totalVotes = 0;
            let totalWeightedScore = 0;

            dataStats.forEach(([score, count]) => {
                const s = parseInt(score);
                const c = parseInt(count);
                if (!isNaN(s) && !isNaN(c)) {
                    totalWeightedScore += s * c;
                    totalVotes += c;
                }
            });

            if (totalVotes === 0) return null;
            return (totalWeightedScore / totalVotes).toFixed(2);
        } catch (e) {
            console.error("[Yanima] Error parsing stats:", e);
            return null;
        }
    }

    function injectRealRating() {
        const scoresBlock = document.querySelector('.scores');
        if (!scoresBlock || document.querySelector('.yanima-real-rate')) return;

        const originalRate = scoresBlock.querySelector('.b-rate');
        if (!originalRate) return;

        originalRate.style.display = 'flex';
        originalRate.style.alignItems = 'center';
        originalRate.style.gap = '8px';

        const malNotice = originalRate.querySelector('.score-notice');
        if (malNotice) {
            malNotice.textContent = "MAL";
            malNotice.style.color = '#888';
            malNotice.style.minWidth = '50px';
        }

        const averageScore = calculateAverage();
        if (!averageScore) return;

        const realRate = originalRate.cloneNode(true);
        realRate.classList.add('yanima-real-rate');
        realRate.style.marginTop = '4px';
        realRate.style.borderTop = 'none';
        realRate.style.paddingTop = '0';
        realRate.style.display = 'flex';
        realRate.style.alignItems = 'center';
        realRate.style.gap = '8px';

        const trigger = realRate.querySelector('.hoverable-trigger');
        if (trigger) trigger.remove();

        const scoreVal = realRate.querySelector('.score-value');
        if (scoreVal) {
            scoreVal.textContent = averageScore;
            const scoreInt = Math.floor(parseFloat(averageScore));
            scoreVal.className = `score-value score-${scoreInt}`;
        }

        const stars = realRate.querySelector('.stars.score');
        if (stars) {
            const scoreInt = Math.floor(parseFloat(averageScore));
            stars.className = `stars score score-${scoreInt}`;
        }

        const scoreNotice = realRate.querySelector('.score-notice');
        if (scoreNotice) {
            scoreNotice.textContent = "Shikimori";
            scoreNotice.style.fontSize = '11px';
            scoreNotice.style.color = '#888';
            scoreNotice.style.minWidth = '50px';
        }

        scoresBlock.appendChild(realRate);
    }

    function injectCopyTableButton() {
        if (!location.pathname.match(/\/animes\/[a-z]*\d+/)) return;
        if (document.querySelector('.yanima-copy-table-line')) return;

        // Реальный контейнер блока информации Shikimori
        const entryInfo = document.querySelector('.b-entry-info');
        if (!entryInfo) return;

        // Ждём пока copy-title.js вставит строку ID
        const idLine = entryInfo.querySelector('.yanima-id-line');
        if (!idLine) return;

        // ID: из data-атрибута строки ID (вставленной copy-title.js) или из URL
        let animeId = '';
        const idValueEl = entryInfo.querySelector('.yanima-id-line .value[data-yanima-copy-text]');
        if (idValueEl) {
            animeId = idValueEl.dataset.yanimaCopyText;
        } else {
            const m = location.pathname.match(/\/animes\/[a-z]*(\d+)/);
            if (m) animeId = m[1];
        }
        if (!animeId) return;

        // РУССКОЕ название: берем из главного заголовка H1 (самый полный источник)
        let title = '';
        const h1 = document.querySelector('header.head h1');
        if (h1) {
            // Клонируем H1, чтобы очистить его от лишних элементов (4K баджи, кнопка назад и т.д.)
            const h1Clone = h1.cloneNode(true);

            // Удаляем 4K-баджи расширения
            h1Clone.querySelectorAll('.badge-4k-ext').forEach(el => el.remove());

            // Удаляем кнопку "Назад" (span.back), если она есть внутри H1
            h1Clone.querySelectorAll('.back').forEach(el => el.remove());

            const h1Text = h1Clone.textContent.trim();
            // Формат обычно "Русское название / English Title" или просто "Русское название"
            title = h1Text.split(' / ')[0].trim();
        }

        // Фолбек на og:title, если H1 не найден
        if (!title) {
            const meta = document.querySelector('meta[property="og:title"]');
            if (meta) {
                title = meta.getAttribute('content').split(' / ')[0].trim();
            }
        }

        // Эпизоды: ищем строку «Эпизоды» в .b-entry-info
        let episodes = '1';
        const allLines = entryInfo.querySelectorAll('.line-container .line');
        for (const line of allLines) {
            const key = line.querySelector('.key');
            const val = line.querySelector('.value');
            if (!key || !val) continue;
            const k = key.textContent.trim().toLowerCase();
            if (k.includes('эпизод') && !k.includes('длительность')) {
                const valText = val.textContent.trim();
                // «10 / 13» → «13»; «150 / ?» → «?»
                const slashMatch = valText.match(/[\d?]+\s*\/\s*([\d?]+)/);
                if (slashMatch) {
                    episodes = slashMatch[1];
                } else {
                    const num = valText.match(/(\d+)/);
                    if (num) episodes = num[1];
                }
                break;
            }
        }

        // Создаём строку В СТИЛЕ .line-container .line (как строка «Id аниме»)
        const lineContainer = document.createElement('div');
        lineContainer.className = 'line-container yanima-copy-table-line';

        const line = document.createElement('div');
        line.className = 'line';

        const keyEl = document.createElement('div');
        keyEl.className = 'key';
        keyEl.textContent = 'В таблицу:\u00A0';

        const valueEl = document.createElement('div');
        valueEl.className = 'value';

        // Кликабельный span — точно как processSidePanelTitles() в copy-title.js
        const copyText = `${title}\t${episodes}\t${animeId}`;
        const span = document.createElement('span');
        span.textContent = 'Скопировать';
        span.title = `${title} | ${episodes} эп. | ID: ${animeId}`;
        Object.assign(span.style, {
            cursor: 'pointer',
            transition: 'opacity 0.15s ease, transform 0.1s ease',
            display: 'inline-block'
        });

        span.addEventListener('mouseenter', () => { span.style.opacity = '0.7'; });
        span.addEventListener('mouseleave', () => { span.style.opacity = '1'; span.style.transform = 'scale(1)'; });
        span.addEventListener('mousedown', () => { span.style.transform = 'scale(0.96)'; });
        span.addEventListener('mouseup', () => { span.style.transform = 'scale(1)'; });

        span.addEventListener('click', async (e) => {
            e.preventDefault();
            e.stopPropagation();
            try {
                await navigator.clipboard.writeText(copyText);
                showToast(`Скопировано для таблицы`);
            } catch (err) {
                console.error('[Yanima] Ошибка копирования:', err);
            }
        });

        valueEl.appendChild(span);
        line.appendChild(keyEl);
        line.appendChild(valueEl);
        lineContainer.appendChild(line);

        // Вставляем сразу после строки с ID аниме
        if (idLine.nextSibling) {
            entryInfo.insertBefore(lineContainer, idLine.nextSibling);
        } else {
            entryInfo.appendChild(lineContainer);
        }
    }

    function injectSearchLinks() {
        const subheadlines = document.querySelectorAll('.subheadline');
        let targetSubheadline = null;
        for (const sub of subheadlines) {
            if (sub.textContent.trim().toLowerCase().includes('на других сайтах')) {
                targetSubheadline = sub;
                break;
            }
        }

        if (!targetSubheadline || document.querySelector('.yanima-search-links-group')) return;

        const container = targetSubheadline.parentElement;
        if (!container) return;

        let title = document.querySelector('meta[property="og:title"]')?.getAttribute('content');
        if (title && title.includes(' / ')) {
            title = title.split(' / ')[1].trim();
        } else {
            const h1 = document.querySelector('header.head h1');
            if (h1) {
                const parts = h1.textContent.split(' / ');
                title = (parts[1] || parts[0]).trim();
            }
        }

        if (!title) return;

        const searchGroup = document.createElement('div');
        searchGroup.className = 'yanima-search-links-group';
        searchGroup.style.marginTop = '4px';

        const rutrackerIcon = chrome.runtime.getURL('icons/Rutraker.png');
        const nyaaIcon = chrome.runtime.getURL('icons/Nyaa.png');

        function makeLink(href, iconSrc, label) {
            const outer = document.createElement('div');
            outer.className = 'b-external_link b-menu-line';
            const a = document.createElement('a');
            a.href = href;
            a.target = '_blank';
            a.className = 'b-link';
            a.style.cssText = 'display:flex;align-items:center;gap:7px';
            const img = document.createElement('img');
            img.src = iconSrc;
            img.style.cssText = 'width:16px;height:16px;object-fit:contain';
            const span = document.createElement('span');
            span.textContent = label;
            a.append(img, span);
            outer.appendChild(a);
            return outer;
        }

        const enc = encodeURIComponent(title);
        searchGroup.append(
            makeLink(`https://rutracker.org/forum/tracker.php?nm=${enc}`, rutrackerIcon, 'Rutracker'),
            makeLink(`https://nyaa.si/?f=0&c=0_0&q=${enc}`, nyaaIcon, 'Nyaa.si')
        );

        container.appendChild(searchGroup);
    }

    applyFeatures();
    document.addEventListener('turbolinks:load', applyFeatures);
    setInterval(applyFeatures, 4000);

    // Мгновенная реакция на изменение настроек
    chrome.storage.onChanged.addListener((changes, area) => {
        if (area === 'local' && (changes.feature_mal_rating || changes.feature_search_links || changes.feature_display_id)) {
            applyFeatures();
        }
    });
})();
