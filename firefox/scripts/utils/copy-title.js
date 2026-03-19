"use strict";

(function initCopyTitleV190() {
    console.log("%c[Copy-Title v2.5.1] Module Loaded", "color: #eab308; font-weight: bold;");

    function showToast(message) {
        let oldToast = document.getElementById('yanima-copy-toast');
        if (oldToast) oldToast.remove();

        const toast = document.createElement('div');
        toast.id = 'yanima-copy-toast';
        toast.textContent = message;

        // Inline стили для надежности (чтобы CSP не блочил тег <style>)
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

    // Создаем кликабельный элемент и переносим в него текст
    function createClickablePart(text) {
        const span = document.createElement('span');
        span.textContent = text;
        span.title = 'Скопировать: ' + text.trim();
        span.dataset.yanimaCopyText = text.trim();

        // Добавляем инлайн-эффекты взаимодействия
        Object.assign(span.style, {
            cursor: 'pointer',
            transition: 'opacity 0.15s ease, transform 0.1s ease',
            display: 'inline-block'
        });

        span.addEventListener('mouseenter', () => span.style.opacity = '0.7');
        span.addEventListener('mouseleave', () => span.style.opacity = '1');

        span.addEventListener('mousedown', () => span.style.transform = 'scale(0.96)');
        span.addEventListener('mouseup', () => span.style.transform = 'scale(1)');
        span.addEventListener('mouseleave', () => span.style.transform = 'scale(1)');

        span.addEventListener('click', async (e) => {
            e.preventDefault();
            e.stopPropagation();
            try {
                const textToCopy = span.dataset.yanimaCopyText;
                await navigator.clipboard.writeText(textToCopy);
                showToast(`Скопировано: ${textToCopy}`);
            } catch (err) {
                console.error('[Copy-Title] Ошибка копирования:', err);
                showToast('Ошибка при копировании!');
            }
        });

        return span;
    }

    function processMainTitleSafely(h1) {
        if (h1.dataset.copyInitialized === 'true') return;
        h1.dataset.copyInitialized = 'true';

        h1.style.position = 'relative';

        const nodes = Array.from(h1.childNodes);
        nodes.forEach(node => {
            // Ищем ТОЛЬКО чистый текст внутри H1
            if (node.nodeType === Node.TEXT_NODE) {
                const text = node.textContent;
                if (text.trim().length > 0) {
                    // Заменяем сырой текст на наш кликабельный span, не трогая другие элементы
                    const clickableSpan = createClickablePart(text);
                    h1.replaceChild(clickableSpan, node);
                }
            }
        });
    }

    function processSidePanelTitles(element, copyText) {
        if (!element || element.dataset.copyInitialized === 'true') return;
        element.dataset.copyInitialized = 'true';

        const text = copyText || element.textContent.trim();
        element.title = 'Скопировать: ' + text;
        element.dataset.yanimaCopyText = text;

        Object.assign(element.style, {
            cursor: 'pointer',
            transition: 'opacity 0.15s ease'
            // НЕ меняем display — сохраняем block, чтобы не ломать вёрстку
        });

        element.addEventListener('mouseenter', () => element.style.opacity = '0.7');
        element.addEventListener('mouseleave', () => element.style.opacity = '1');

        element.addEventListener('click', async (e) => {
            e.preventDefault();
            e.stopPropagation();
            try {
                await navigator.clipboard.writeText(text);
                showToast(`Скопировано: ${text}`);
            } catch (err) {
                console.error('[Copy-Title] Ошибка копирования:', err);
                showToast('Ошибка при копировании!');
            }
        });
    }

    async function scanAndApply() {
        if (!chrome.runtime?.id) return;
        if ((!location.hostname.includes('shikimori') && !location.hostname.includes('shiki.one'))) return;

        // --- ЛОГИКА ОТОБРАЖЕНИЯ ID + КОПИРОВАНИЕ ИНФОБЛОКА (переключатель "Копирование информации") ---
        const displayIdData = await chrome.storage.local.get("feature_display_id");
        if (displayIdData.feature_display_id !== false) {
            const infoBlock = document.querySelector('.b-entry-info');
            if (infoBlock && !infoBlock.querySelector('.yanima-id-line')) {
                // Пытаемся получить ID двумя способами
                const bodyEntry = document.querySelector('body[data-db_entry-id]');
                let animeId = bodyEntry ? bodyEntry.getAttribute('data-db_entry-id') : null;

                // Фолбек: если в body нет ID, пробуем вытащить из URL (типичный URL /animes/59978-...)
                if (!animeId) {
                    const match = location.pathname.match(/\/animes\/[a-z]*?(\d+)/);
                    if (match) animeId = match[1];
                }

                if (animeId) {
                    console.info(`[Yanima] Вставка ID аниме: ${animeId}`);
                    const idLineContainer = document.createElement('div');
                    idLineContainer.className = 'line-container yanima-id-line';

                    const idLine = document.createElement('div');
                    idLine.className = 'line';

                    const key = document.createElement('div');
                    key.className = 'key';
                    key.textContent = 'Id аниме:\u00A0';

                    const value = document.createElement('div');
                    value.className = 'value';
                    value.textContent = animeId;

                    processSidePanelTitles(value); // Навешиваем эффект копирования

                    idLine.appendChild(key);
                    idLine.appendChild(value);
                    idLineContainer.appendChild(idLine);

                    // Вставляем В САМОЕ НАЧАЛО блока .b-entry-info
                    infoBlock.insertBefore(idLineContainer, infoBlock.firstChild);
                    console.info('[Yanima] ID успешно вставлен');
                } else {
                    console.warn('[Yanima] Не удалось найти ID аниме на странице');
                }
            }

            // Копируемые значения инфоблока
            const infoLines = document.querySelectorAll('.b-entry-info .line-container .line');
            infoLines.forEach(line => {
                const keyEl = line.querySelector('.key');
                const valEl = line.querySelector('.value');
                if (!keyEl || !valEl || valEl.dataset.copyInitialized) return;

                const k = keyEl.textContent.trim().toLowerCase();

                // Пропускаем строчку "Альтернативные названия:" (разворачивающая кнопка ···)
                if (k.includes('альтернатив')) return;

                // Жанры: вытащиваем только кириллические последовательности
                // (работает даже если англ. и рус. слиты без пробела: "ShounenСёнен")
                if (k.includes('жанр')) {
                    const tags = valEl.querySelectorAll('.b-tag, a');
                    if (tags.length > 0) {
                        const cyrillicParts = Array.from(tags).map(tag => {
                            const m = tag.textContent.match(/[а-яёА-ЯЁ]+/g);
                            return m ? m.join('') : '';
                        }).filter(s => s.length > 0);
                        if (cyrillicParts.length > 0) {
                            processSidePanelTitles(valEl, cyrillicParts.join(' '));
                            return;
                        }
                    }
                }

                processSidePanelTitles(valEl);
            });
        }

        // --- ЛОГИКА КОПИРОВАНИЯ НАЗВАНИЯ H1 (переключатель "Копирование названия") ---
        const copyTitleData = await chrome.storage.local.get("feature_copy_title");
        if (copyTitleData.feature_copy_title !== false) {
            const mainTitleH1 = document.querySelector('header.head h1');
            if (mainTitleH1) processMainTitleSafely(mainTitleH1);
        }
    }

    scanAndApply();
    document.addEventListener('turbolinks:load', scanAndApply);
    setInterval(scanAndApply, 1500);
})();
