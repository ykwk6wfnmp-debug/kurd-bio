/* Themes gallery: 1000 designs across 10 families, loaded a page at a time. */
(function () {
    'use strict';
    var KB = window.KB;
    var PAGE_SIZE = 48;

    var grid = document.getElementById('grid');
    var status = document.getElementById('grid-status');
    var chipsBox = document.getElementById('family-chips');
    var pill = document.getElementById('balance-pill');

    var state = {
        family: '',
        page: 0,
        totalPages: 1,
        loading: false,
        current: null,
        owned: [],
        balance: 0,
        families: [],
        byId: {} // id -> theme, so a card can be re-rendered after a purchase
    };

    function priceLabel(theme, owned) {
        if (owned) return { text: 'کڕدراوە ✓', cls: 'free' };
        if (theme.tier === 'free') return { text: 'بەخۆڕایی', cls: 'free' };
        return { text: KB.num(theme.price) + ' $', cls: theme.tier };
    }

    /* A miniature of the actual theme rather than an icon on a swatch. */
    function preview(theme) {
        return KB.el(
            'div',
            {
                class: 'theme-preview',
                style: {
                    background: theme.bg,
                    backgroundImage: theme.bgImage || 'none'
                }
            },
            [
                KB.el('div', {
                    class: 'mini-avatar',
                    style: { background: theme.accent, color: theme.bg },
                    text: theme.icon
                }),
                KB.el('div', {
                    class: 'mini-bar',
                    style: {
                        background: theme.surface,
                        border: theme.borderWidth + 'px solid ' + theme.surfaceBorder,
                        borderRadius: Math.min(theme.radius, 12) + 'px'
                    }
                }),
                KB.el('div', {
                    class: 'mini-bar short',
                    style: {
                        background: theme.accent2,
                        borderRadius: Math.min(theme.radius, 12) + 'px'
                    }
                })
            ]
        );
    }

    function cardFor(theme, position) {
        var owned = state.owned.indexOf(theme.id) !== -1;
        var isCurrent = theme.id === state.current;
        var price = priceLabel(theme, owned);

        var children = [
            preview(theme),
            KB.el('div', { class: 'theme-title', text: theme.name }),
            KB.el('div', { class: 'theme-price ' + price.cls, text: price.text }),
            KB.el('button', {
                class: 'select-btn',
                type: 'button',
                text: isCurrent ? 'چالاکە ✓' : 'هەڵبژاردن'
            })
        ];

        if (owned && !isCurrent) children.unshift(KB.el('span', { class: 'badge owned', text: 'هی تۆ' }));
        else if (theme.tier === 'legendary') children.unshift(KB.el('span', { class: 'badge legendary', text: 'ئەفسانەیی' }));
        else if (theme.tier === 'vip') children.unshift(KB.el('span', { class: 'badge vip', text: 'VIP' }));

        var card = KB.el('div', {
            class: 'theme-card' + (isCurrent ? ' active' : ''),
            role: 'button',
            tabindex: '0',
            'aria-label': theme.name,
            // Staggered entrance, capped so late cards are not left waiting.
            style: { animationDelay: Math.min(position, 12) * 25 + 'ms' }
        }, children);

        card.addEventListener('click', function () { apply(theme); });
        card.addEventListener('keydown', function (event) {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                apply(theme);
            }
        });
        return card;
    }

    function updateBalance() {
        pill.textContent = 'باڵانس: ' + KB.num(state.balance) + ' $';
    }

    /* Update in place after a purchase — active state, label, badge and price —
       so the grid never re-flows or scrolls back to the top. */
    function refreshCards() {
        var cards = grid.querySelectorAll('.theme-card');
        for (var i = 0; i < cards.length; i += 1) {
            var card = cards[i];
            var theme = state.byId[card.getAttribute('data-id')];
            if (!theme) continue;

            var owned = state.owned.indexOf(theme.id) !== -1;
            var isCurrent = theme.id === state.current;
            card.classList.toggle('active', isCurrent);

            var btn = card.querySelector('.select-btn');
            if (btn) btn.textContent = isCurrent ? 'چالاکە ✓' : 'هەڵبژاردن';

            var price = priceLabel(theme, owned);
            var priceEl = card.querySelector('.theme-price');
            if (priceEl) {
                priceEl.textContent = price.text;
                priceEl.className = 'theme-price ' + price.cls;
            }

            var badge = card.querySelector('.badge');
            if (badge && owned && !isCurrent) {
                badge.className = 'badge owned';
                badge.textContent = 'هی تۆ';
            } else if (badge && isCurrent) {
                badge.remove();
            }
        }
    }

    function renderChips() {
        chipsBox.textContent = '';
        var all = [{ key: '', label: 'هەموو', icon: '🎨' }].concat(state.families);
        all.forEach(function (family) {
            var chip = KB.el('button', {
                class: 'chip',
                type: 'button',
                'aria-pressed': String(family.key === state.family),
                text: family.icon + ' ' + family.label
            });
            chip.addEventListener('click', function () {
                if (state.family === family.key || state.loading) return;
                state.family = family.key;
                state.page = 0;
                state.totalPages = 1;
                grid.textContent = '';
                resetSentinel();
                renderChips();
                window.scrollTo({ top: 0, behavior: 'smooth' });
                loadPage();
            });
            chipsBox.appendChild(chip);
        });
    }

    async function loadPage() {
        if (state.loading || state.page >= state.totalPages) return;
        state.loading = true;
        status.textContent = '';
        KB.skeletons(grid, 8);

        var query = '/api/themes?page=' + (state.page + 1) + '&pageSize=' + PAGE_SIZE;
        if (state.family) query += '&family=' + encodeURIComponent(state.family);

        var data = await KB.api(query);
        KB.clearSkeletons(grid);
        state.loading = false;

        if (!data.success) {
            status.textContent = '';
            return KB.toast(data.message, true);
        }

        state.page = data.page;
        state.totalPages = data.totalPages;
        state.current = data.current;
        state.owned = data.owned || [];
        state.balance = data.balance || 0;

        if (!state.families.length) {
            state.families = data.families;
            renderChips();
            document.getElementById('catalog-count').textContent =
                KB.num(data.catalogTotal) + ' دیزاین';
        }
        updateBalance();

        var frag = document.createDocumentFragment();
        data.themes.forEach(function (theme, i) {
            state.byId[theme.id] = theme;
            var card = cardFor(theme, i);
            card.setAttribute('data-id', theme.id);
            frag.appendChild(card);
        });
        grid.appendChild(frag);

        if (state.page >= state.totalPages) {
            status.appendChild(KB.el('div', { class: 'grid-end', text: 'کۆتایی لیستەکە 🎉' }));
        } else {
            observeSentinel();
        }
    }

    /* Infinite scroll where supported, an explicit button where it is not. */
    var sentinel = null;
    var observer = null;

    function resetSentinel() {
        if (observer) observer.disconnect();
        observer = null;
        sentinel = null;
        status.textContent = '';
    }

    function observeSentinel() {
        if (!('IntersectionObserver' in window)) {
            if (!document.getElementById('load-more')) {
                var button = KB.el('button', {
                    class: 'btn load-more',
                    id: 'load-more',
                    type: 'button',
                    text: 'زیاتر ببینە'
                });
                button.addEventListener('click', function () {
                    button.remove();
                    loadPage();
                });
                status.appendChild(button);
            }
            return;
        }
        if (!sentinel) {
            sentinel = KB.el('div', { style: { height: '1px' } });
            status.appendChild(sentinel);
            observer = new IntersectionObserver(function (entries) {
                if (entries[0].isIntersecting) loadPage();
            }, { rootMargin: '600px 0px' });
            observer.observe(sentinel);
        }
    }

    async function apply(theme) {
        var data = await KB.api('/api/save-theme', { method: 'POST', body: { theme: theme.id } });
        if (!data.success) return KB.toast(data.message, true);

        state.current = theme.id;
        state.owned = data.owned;
        state.balance = data.balance;
        updateBalance();
        refreshCards();

        KB.toast(
            data.charged
                ? 'دیزاینەکە کڕدرا! (-' + KB.num(data.charged) + ' $) 🎉'
                : 'دیزاینەکە گۆڕدرا! 🚀'
        );
    }

    loadPage();
})();
