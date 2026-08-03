/* Login / register form. */
(function () {
    'use strict';
    var KB = window.KB;
    var isRegister = false;

    var title = document.getElementById('form-title');
    var actionBtn = document.getElementById('action-btn');
    var toggleText = document.getElementById('toggle-text');
    var form = document.getElementById('auth-form');
    var passwordInput = document.getElementById('password');

    document.getElementById('toggle').addEventListener('click', function () {
        isRegister = !isRegister;
        title.textContent = isRegister ? 'دروستکردنی هەژماری نوێ' : 'چوونەژوورەوە بۆ KurdBio';
        actionBtn.textContent = isRegister ? 'دروستکردنی هەژمار ✨' : 'چوونەژوورەوە 🚀';
        toggleText.textContent = isRegister ? 'هەژمارت هەیە؟ بچۆ ژوورەوە' : 'هەژمارت نییە؟ خۆت تۆمار بکە';
        passwordInput.setAttribute('autocomplete', isRegister ? 'new-password' : 'current-password');
    });

    form.addEventListener('submit', async function (event) {
        event.preventDefault();
        var username = document.getElementById('username').value.trim().toLowerCase();
        var password = passwordInput.value;
        if (!username || !password) return KB.toast('تکایە هەردوو خانەکە پڕبکەرەوە!', true);

        actionBtn.disabled = true;
        var data = await KB.api(isRegister ? '/api/register' : '/api/login', {
            method: 'POST',
            body: { username: username, password: password }
        });
        actionBtn.disabled = false;

        if (data.success) window.location.href = data.redirect || '/dashboard';
        else if (data.message) KB.toast(data.message, true);
    });
})();
