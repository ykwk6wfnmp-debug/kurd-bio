/* Themes gallery: 100 designs, VIP purchases charged once. */
(function () {
    'use strict';
    var KB = window.KB;
    var grid = document.getElementById('grid');
    var pill = document.getElementById('balance-pill');
    var state = { current: null, owned: [], balance: 0, themes: [] };

    function updateBalance() {
        pill.textContent = 'باڵانس: ' + state.balance + ' $';
    }

    function cardFor(theme) {
        var owned = state.owned.indexOf(theme.id) !== -1;
        var isCurrent = theme.id === state.current;

        var desc = theme.vip
            ? (owned ? 'کڕدراوە ✓' : 'دیزاینی VIP — ' + theme.price + ' $')
            : 'شێوازی مۆدێرن و ناوازە';

        var children = [
            KB.el('div', { class: 'mini-preview', style: { background: theme.background, color: theme.accent }, text: theme.icon }),
            KB.el('div', { class: 'theme-title', text: theme.name }),
            KB.el('div', { class: 'theme-desc', text: desc }),
            KB.el('button', { class: 'select-btn', type: 'button', text: isCurrent ? 'ئێستا چالاکە ✓' : 'هەڵبژاردن ✨' })
        ];
        if (theme.vip) children.unshift(KB.el('span', { class: 'vip-badge', text: 'VIP' }));

        var card = KB.el('div', { class: 'theme-card' + (isCurrent ? ' active' : '') }, children);
        card.addEventListener('click', function () { apply(theme); });
        return card;
    }

    function render() {
        grid.textContent = '';
        var frag = document.createDocumentFragment();
        state.themes.forEach(function (theme) { frag.appendChild(cardFor(theme)); });
        grid.appendChild(frag);
        updateBalance();
    }

    async function apply(theme) {
        var data = await KB.api('/api/save-theme', { method: 'POST', body: { theme: theme.id } });
        if (!data.success) return KB.toast(data.message, true);

        state.current = theme.id;
        state.owned = data.owned;
        state.balance = data.balance;
        render();
        KB.toast(data.charged ? 'دیزاینەکە کڕدرا! (-' + data.charged + ' $) 🎉' : 'دیزاینەکە گۆڕدرا! 🚀');
    }

    (async function load() {
        var data = await KB.api('/api/themes');
        if (!data.success) return;
        state.themes = data.themes;
        state.current = data.current;
        state.owned = data.owned || [];
        state.balance = data.balance || 0;
        render();
    })();
})();
