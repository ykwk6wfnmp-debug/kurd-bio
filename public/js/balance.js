/* Balance overview and purchased VIP themes. */
(function () {
    'use strict';
    var KB = window.KB;

    (async function load() {
        var me = await KB.api('/api/me');
        if (!me.success) return;
        document.getElementById('balance-pill').textContent = me.user.balance + ' $';

        var list = document.getElementById('owned-list');
        list.textContent = '';

        var owned = me.user.ownedThemes || [];
        if (!owned.length) {
            list.appendChild(KB.el('div', { text: 'هێشتا هیچ دیزاینێکی VIPت نەکڕیوە.' }));
            return;
        }

        var catalog = await KB.api('/api/themes');
        var names = {};
        if (catalog.success) {
            catalog.themes.forEach(function (theme) { names[theme.id] = theme.name; });
        }
        owned.forEach(function (id) {
            list.appendChild(KB.el('div', { text: '✨ ' + (names[id] || id) }));
        });
    })();
})();
