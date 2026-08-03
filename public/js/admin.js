/* Admin panel: list, ban, unban, credit balance. Passwords are never shown. */
(function () {
    'use strict';
    var KB = window.KB;

    function headerRow(labels) {
        return KB.el('tr', {}, labels.map(function (label) { return KB.el('th', { text: label }); }));
    }

    function actionButton(label, className, handler) {
        var btn = KB.el('button', { class: className, type: 'button', text: label });
        btn.addEventListener('click', handler);
        return btn;
    }

    async function post(url, body, done) {
        var data = await KB.api(url, { method: 'POST', body: body });
        if (!data.success) return KB.toast(data.message, true);
        KB.toast(done);
        load();
    }

    function activeRow(user) {
        var actions = KB.el('td', {}, [
            actionButton('باڵانس +', 'credit-btn', function () {
                var amount = window.prompt('چەند دۆلار زیاد بکرێت بۆ ' + user.username + '؟', '5');
                if (amount === null) return;
                post('/api/admin/balance', { username: user.username, amount: Number(amount) }, 'باڵانس نوێکرایەوە ✅');
            })
        ]);

        if (user.role !== 'admin') {
            actions.appendChild(document.createTextNode(' '));
            actions.appendChild(
                actionButton('بانکردن', 'ban-btn', function () {
                    if (!window.confirm('دڵنیایت لە بانکردنی ' + user.username + '؟')) return;
                    post('/api/admin/ban', { username: user.username }, 'بەکارهێنەر بان کرا 🚫');
                })
            );
        }

        return KB.el('tr', {}, [
            KB.el('td', {}, [
                KB.el('span', { text: user.username }),
                user.role === 'admin' ? KB.el('span', { class: 'role-tag', text: ' 👑' }) : document.createTextNode('')
            ]),
            KB.el('td', { text: user.balance + ' $' }),
            KB.el('td', { text: String(user.links) }),
            KB.el('td', { text: String(user.ownedThemes) }),
            actions
        ]);
    }

    function bannedRow(user) {
        return KB.el('tr', {}, [
            KB.el('td', { text: user.username }),
            KB.el('td', {}, [
                actionButton('لادانی بان', 'unban-btn', function () {
                    post('/api/admin/unban', { username: user.username }, 'بان لادرا ✅');
                })
            ])
        ]);
    }

    async function load() {
        var data = await KB.api('/api/admin/users');
        if (!data.success) return KB.toast(data.message, true);

        var usersTable = document.getElementById('users-table');
        usersTable.textContent = '';
        usersTable.appendChild(headerRow(['ناوی بەکارهێنەر', 'باڵانس', 'لینک', 'دیزاینی VIP', 'کردار']));
        data.users.forEach(function (user) { usersTable.appendChild(activeRow(user)); });

        var bannedTable = document.getElementById('banned-table');
        bannedTable.textContent = '';
        bannedTable.appendChild(headerRow(['ناوی بەکارهێنەر', 'کردار']));
        data.banned.forEach(function (user) { bannedTable.appendChild(bannedRow(user)); });
    }

    load();
})();
