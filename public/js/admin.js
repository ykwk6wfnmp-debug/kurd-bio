/* Admin panel: stats, list, ban, unban, balance adjustment.
   Passwords are never shown. Email is admin-only and appears nowhere else.
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

    /* ---------- stats ---------- */

    function tile(label, value, tone) {
        return KB.el('div', { class: 'stat' + (tone ? ' ' + tone : '') }, [
            KB.el('div', { class: 'stat-value', text: KB.num(value) }),
            KB.el('div', { class: 'stat-label', text: label })
        ]);
    }

    async function loadStats() {
        var data = await KB.api('/api/admin/stats');
        if (!data.success) return;
        var s = data.stats;

        var box = document.getElementById('stats-grid');
        box.textContent = '';
        [
            tile('کۆی بەکارهێنەران', s.totalUsers),
            tile('چالاک', s.activeUsers, 'good'),
            tile('بانکراو', s.bannedUsers, 'bad'),
            tile('ئەمڕۆ', s.newToday, 'accent'),
            tile('7 ڕۆژی ڕابردوو', s.newThisWeek, 'accent'),
            tile('بە ئیمەیڵ', s.withEmail)
        ].forEach(function (node) { box.appendChild(node); });

        document.getElementById('stats-note').textContent =
            'کاتی ناوخۆیی: ' + s.timezone + ' — «ئەمڕۆ» بەپێی ڕۆژی ناوخۆیی دەژمێردرێت.';

        renderStorageWarning(s.storage);
        loadDiagnostics();
    }

    /* Shows exactly which database this process is writing to, and an instance
       id that changes per boot. If the id flips between refreshes, more than one
       instance (or more than one deployment) is answering this URL. */
    async function loadDiagnostics() {
        var data = await KB.api('/api/admin/diagnostics');
        var note = document.getElementById('diag-note');
        if (!data.success) { note.textContent = ''; return; }
        var d = data.diagnostics;
        note.textContent =
            'کۆگا: ' + d.storage.kind +
            ' · ' + d.storage.host +
            ' · بنکەدراوە: ' + d.storage.database +
            (d.storage.rows !== null && d.storage.rows !== undefined ? ' · ڕیزەکان: ' + d.storage.rows : '') +
            ' · ڕیزی نیشاندراو: ' + d.listedUsers +
            ' · instance: ' + d.instanceId +
            ' · ' + d.nodeEnv;
    }

    /* If storage is not persistent, new signups disappear on every restart —
       the single most likely reason a user "does not show up". Say so loudly. */
    function renderStorageWarning(storage) {
        var box = document.getElementById('storage-warning');
        box.textContent = '';
        if (!storage || storage.persistent) return;

        box.appendChild(
            KB.el('div', { class: 'warning-banner' }, [
                KB.el('strong', { text: '⚠️ زانیارییەکان بە جێگیری هەڵناگیرێن' }),
                KB.el('div', {
                    text:
                        'ئێستا کۆگای فایلی (' + storage.kind + ') بەکاردێت. لەسەر Render ' +
                        'سیستەمی فایل کاتییە، بۆیە هەموو بەکارهێنەرێکی نوێ لەگەڵ هەر ' +
                        'ڕیستارت و بڵاوکردنەوەیەکدا دەسڕدرێتەوە. DATABASE_URL دابنێ.'
                })
            ])
        );
    }

    /* ---------- balance control ---------- */

    function balanceControl(user) {
        var input = KB.el('input', {
            type: 'number',
            class: 'amount-input',
            value: '10',
            step: '1',
            min: '-10000',
            max: '10000',
            'aria-label': 'بڕی باڵانس بۆ ' + user.username
        });

        var apply = actionButton('زیادکردن', 'credit-btn', async function () {
            var amount = Number(input.value);
            if (!isFinite(amount) || amount === 0) return KB.toast('بڕێکی دروست بنووسە.', true);

            apply.disabled = true;
            var data = await KB.api('/api/admin/balance', {
                method: 'POST',
                body: { username: user.username, amount: amount }
            });
            apply.disabled = false;

            if (!data.success) return KB.toast(data.message, true);
            KB.toast(user.username + ': باڵانس بوو بە ' + KB.num(data.balance) + ' $ ✅');
            load();
        });

        return KB.el('div', { class: 'balance-control' }, [input, apply]);
    }

    /* ---------- rows ---------- */

    function activeRow(user) {
        var actions = [balanceControl(user)];

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
            cell('ئیمەیڵ', KB.el('span', { class: 'email-cell', text: user.email || '—' })),
            cell('باڵانس', KB.num(user.balance) + ' $'),
            cell('لینک', KB.num(user.links)),
            cell('دیزاین', KB.num(user.ownedThemes)),
            cell('', KB.el('div', { class: 'row-actions' }, actions))
        ]);
    }

    function bannedRow(user) {
        return KB.el('tr', {}, [
            cell('بەکارهێنەر', user.username),
            cell('ئیمەیڵ', KB.el('span', { class: 'email-cell', text: user.email || '—' })),
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
            ['بەکارهێنەر', 'ئیمەیڵ', 'باڵانس', 'لینک', 'دیزاین', 'کردار'],
            data.users.map(activeRow),
            'هیچ بەکارهێنەرێک نییە.'
        );
        fill(
            document.getElementById('banned-table'),
            ['بەکارهێنەر', 'ئیمەیڵ', 'کردار'],
            data.banned.map(bannedRow),
            'هیچ بەکارهێنەرێکی بانکراو نییە.'
        );
        loadStats();
    }

    document.getElementById('refresh-btn').addEventListener('click', function () {
        load();
        KB.toast('نوێکرایەوە ✅');
    });

    // Pick up signups made elsewhere without needing a manual reload.
    setInterval(function () {
        if (!document.hidden) load();
    }, 30000);
    document.addEventListener('visibilitychange', function () {
        if (!document.hidden) load();
    });

    load();
})();
