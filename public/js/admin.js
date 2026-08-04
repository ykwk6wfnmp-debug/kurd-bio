/* Admin panel: list, ban, unban, credit balance. Passwords are never shown.
   Cells carry data-label so the CSS can turn rows into cards on phones. */
(function () {
    'use strict';
    var KB = window.KB;

    function head(labels) {
        return KB.el('thead', {}, [
            KB.el('tr', {}, labels.map(function (label) { return KB.el('th', { text: label }); }))
        ]);
    }

    function cell(label, content) {
        var td = KB.el('td', { 'data-label': label });
        td.appendChild(typeof content === 'string' ? document.createTextNode(content) : content);
        return td;
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
        var actions = [
            actionButton('باڵانس +', 'credit-btn', function () {
                var amount = window.prompt('چەند دۆلار زیاد بکرێت بۆ ' + user.username + '؟', '5');
                if (amount === null) return;
                post('/api/admin/balance', { username: user.username, amount: Number(amount) }, 'باڵانس نوێکرایەوە ✅');
            })
        ];

        if (user.role !== 'admin') {
            actions.push(
                actionButton('بانکردن', 'ban-btn', function () {
                    if (!window.confirm('دڵنیایت لە بانکردنی ' + user.username + '؟')) return;
                    post('/api/admin/ban', { username: user.username }, 'بەکارهێنەر بان کرا 🚫');
                })
            );
        }

        var name = KB.el('span', {}, [
            KB.el('span', { text: user.username }),
            user.role === 'admin' ? KB.el('span', { class: 'role-tag', text: ' 👑' }) : document.createTextNode('')
        ]);

        return KB.el('tr', {}, [
            cell('بەکارهێنەر', name),
            cell('باڵانس', KB.num(user.balance) + ' $'),
            cell('لینک', KB.num(user.links)),
            cell('دیزاین', KB.num(user.ownedThemes)),
            cell('', KB.el('div', { class: 'row-actions' }, actions))
        ]);
    }

    function bannedRow(user) {
        return KB.el('tr', {}, [
            cell('بەکارهێنەر', user.username),
            cell('', KB.el('div', { class: 'row-actions' }, [
                actionButton('لادانی بان', 'unban-btn', function () {
                    post('/api/admin/unban', { username: user.username }, 'بان لادرا ✅');
                })
            ]))
        ]);
    }

    function fill(table, headers, rows, emptyText) {
        table.textContent = '';
        table.appendChild(head(headers));
        if (!rows.length) {
            var td = KB.el('td', { colspan: String(headers.length), class: 'grid-end', text: emptyText });
            table.appendChild(KB.el('tbody', {}, [KB.el('tr', {}, [td])]));
            return;
        }
        table.appendChild(KB.el('tbody', {}, rows));
    }

    async function load() {
        var data = await KB.api('/api/admin/users');
        if (!data.success) return KB.toast(data.message, true);

        fill(
            document.getElementById('users-table'),
            ['بەکارهێنەر', 'باڵانس', 'لینک', 'دیزاین', 'کردار'],
            data.users.map(activeRow),
            'هیچ بەکارهێنەرێک نییە.'
        );
        fill(
            document.getElementById('banned-table'),
            ['بەکارهێنەر', 'کردار'],
            data.banned.map(bannedRow),
            'هیچ بەکارهێنەرێکی بانکراو نییە.'
        );
    }

    load();
})();
