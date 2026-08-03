/* Account settings: change username and/or password. */
(function () {
    'use strict';
    var KB = window.KB;
    var saveBtn = document.getElementById('save-btn');
    var usernameInput = document.getElementById('new-username');

    saveBtn.addEventListener('click', async function () {
        var currentPassword = document.getElementById('current-password').value;
        if (!currentPassword) return KB.toast('بۆ گۆڕانکاری وشەی تێپەڕی ئێستات پێویستە.', true);

        saveBtn.disabled = true;
        var data = await KB.api('/api/account', {
            method: 'POST',
            body: {
                currentPassword: currentPassword,
                newUsername: usernameInput.value.trim().toLowerCase(),
                newPassword: document.getElementById('new-password').value
            }
        });
        saveBtn.disabled = false;

        if (!data.success) return KB.toast(data.message, true);
        KB.toast('زانیارییەکان نوێکرانەوە! ✅');
        setTimeout(function () { window.location.href = data.redirect || '/dashboard'; }, 900);
    });

    (async function load() {
        var data = await KB.api('/api/me');
        if (data.success) usernameInput.value = data.user.username;
    })();
})();
