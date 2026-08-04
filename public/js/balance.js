/* Balance overview and purchased themes. */
(function () {
    'use strict';
    var KB = window.KB;

    (async function load() {
        var me = await KB.api('/api/me');
        if (!me.success) return;
        document.getElementById('balance-pill').textContent = KB.num(me.user.balance) + ' $';

        var list = document.getElementById('owned-list');
        list.textContent = '';

        var owned = me.user.ownedThemes || [];
        if (!owned.length) {
            list.appendChild(KB.el('div', { text: 'هێشتا هیچ دیزاینێکی VIPت نەکڕیوە.' }));
            return;
        }

        // Resolve just the owned ids instead of pulling the 1000-theme catalog.
        var catalog = await KB.api('/api/themes?ids=' + encodeURIComponent(owned.join(',')));
        if (!catalog.success) return;

        catalog.themes.forEach(function (theme) {
            list.appendChild(
                KB.el('div', {}, [
                    KB.el('span', { text: theme.icon + ' ' + theme.name + ' ' }),
                    KB.el('span', {
                        class: 'theme-price ' + theme.tier,
                        text: '(' + KB.num(theme.price) + ' $)'
                    })
                ])
            );
        });

        if (owned.length > catalog.themes.length) {
            list.appendChild(
                KB.el('div', { text: '… و ' + KB.num(owned.length - catalog.themes.length) + ' دیزاینی تر' })
            );
        }
    })();
})();
