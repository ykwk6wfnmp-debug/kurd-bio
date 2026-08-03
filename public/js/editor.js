/* Profile editor. */
(function () {
    'use strict';
    var KB = window.KB;
    var limits = KB.pageData().limits || {};
    var maxAvatar = limits.avatarBytes || 300 * 1024;
    var links = [];
    var avatar = '';

    var preview = document.getElementById('image-preview');
    var saveBtn = document.getElementById('save-btn');

    function showAvatar(dataUrl) {
        avatar = dataUrl;
        preview.src = dataUrl;
        preview.style.display = dataUrl ? 'block' : 'none';
    }

    function renderLinks() {
        var container = document.getElementById('links-container');
        container.textContent = '';
        links.forEach(function (item) {
            var deleteBtn = KB.el('button', { class: 'delete-btn', type: 'button', text: 'سڕینەوە' });
            deleteBtn.addEventListener('click', function () {
                links = links.filter(function (l) { return l.id !== item.id; });
                renderLinks();
            });
            container.appendChild(
                KB.el('div', { class: 'link-item' }, [
                    KB.el('div', {}, [
                        KB.el('strong', { text: item.title }),
                        KB.el('div', { class: 'link-url', text: item.url })
                    ]),
                    deleteBtn
                ])
            );
        });
    }

    document.getElementById('avatarFile').addEventListener('change', function (event) {
        var file = event.target.files[0];
        if (!file) return;
        if (!/^image\/(png|jpeg|webp|gif)$/.test(file.type)) {
            KB.toast('تەنها وێنەی PNG، JPG، WEBP یان GIF قبوڵ دەکرێت.', true);
            event.target.value = '';
            return;
        }
        var reader = new FileReader();
        reader.onload = function (e) {
            if (String(e.target.result).length > maxAvatar) {
                KB.toast('قەبارەی وێنەکە زۆر گەورەیە. وێنەیەکی بچووکتر هەڵبژێرە.', true);
                event.target.value = '';
                return;
            }
            showAvatar(e.target.result);
        };
        reader.readAsDataURL(file);
    });

    document.getElementById('add-link').addEventListener('click', function () {
        var titleEl = document.getElementById('linkTitle');
        var urlEl = document.getElementById('linkUrl');
        var title = titleEl.value.trim();
        var url = urlEl.value.trim();
        if (!title || !url) return KB.toast('تکایە خانەکان پڕبکەرەوە!', true);
        if (!/^https?:\/\//i.test(url)) return KB.toast('لینک دەبێت بە http:// یان https:// دەستپێبکات.', true);
        if (links.length >= (limits.maxLinks || 20)) return KB.toast('ژمارەی لینکەکان تەواو بووە.', true);

        links.push({ id: Date.now(), title: title, url: url });
        titleEl.value = '';
        urlEl.value = '';
        renderLinks();
    });

    saveBtn.addEventListener('click', async function () {
        saveBtn.disabled = true;
        var data = await KB.api('/api/save-bio', {
            method: 'POST',
            body: {
                name: document.getElementById('name').value,
                bio: document.getElementById('bio').value,
                avatar: avatar,
                socials: {
                    whatsapp: document.getElementById('whatsapp').value,
                    snapchat: document.getElementById('snapchat').value,
                    telegram: document.getElementById('telegram').value,
                    facebook: document.getElementById('facebook').value
                },
                links: links
            }
        });
        saveBtn.disabled = false;

        if (!data.success) return KB.toast(data.message, true);
        KB.toast('پاشەکەوت کرا! ✅');
        setTimeout(function () { window.location.href = data.redirect || '/dashboard'; }, 900);
    });

    (async function load() {
        var data = await KB.api('/api/me');
        if (!data.success) return;
        var p = data.user.profile;
        document.getElementById('name').value = p.name || '';
        document.getElementById('bio').value = p.bio || '';
        if (p.avatar) showAvatar(p.avatar);
        document.getElementById('whatsapp').value = p.socials.whatsapp || '';
        document.getElementById('snapchat').value = p.socials.snapchat || '';
        document.getElementById('telegram').value = p.socials.telegram || '';
        document.getElementById('facebook').value = p.socials.facebook || '';
        links = p.links || [];
        renderLinks();
    })();
})();
