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
    var emailRow = document.getElementById('email-row');
    var emailInput = document.getElementById('email');

    document.getElementById('toggle').addEventListener('click', function () {
        isRegister = !isRegister;
        title.textContent = isRegister ? 'دروستکردنی هەژماری نوێ' : 'چوونەژوورەوە بۆ KurdBio';
        actionBtn.textContent = isRegister ? 'دروستکردنی هەژمار ✨' : 'چوونەژوورەوە 🚀';
        toggleText.textContent = isRegister ? 'هەژمارت هەیە؟ بچۆ ژوورەوە' : 'هەژمارت نییە؟ خۆت تۆمار بکە';
        passwordInput.setAttribute('autocomplete', isRegister ? 'new-password' : 'current-password');
        // Email is only meaningful when creating an account.
        emailRow.hidden = !isRegister;
    });

    form.addEventListener('submit', async function (event) {
        event.preventDefault();
        var username = document.getElementById('username').value.trim().toLowerCase();
        var password = passwordInput.value;
        if (!username || !password) return KB.toast('تکایە هەردوو خانەکە پڕبکەرەوە!', true);

        document.getElementById('auth-error').hidden = true;
        var originalLabel = actionBtn.textContent;
        actionBtn.disabled = true;
        // The first request after the server sleeps can take 30-60s.
        actionBtn.textContent = 'چاوەڕێ بکە…';
        var slow = setTimeout(function () {
            actionBtn.textContent = 'سێرڤەرەکە هەڵدەستێت، تکایە چاوەڕێ بکە…';
        }, 4000);
        var body = { username: username, password: password };
        if (isRegister) body.email = emailInput.value.trim();

        var data = await KB.api(isRegister ? '/api/register' : '/api/login', {
            method: 'POST',
            body: body
        });
        clearTimeout(slow);
        actionBtn.disabled = false;
        actionBtn.textContent = originalLabel;

        if (data.success) {
            window.location.href = data.redirect || '/dashboard';
            return;
        }
        if (data.message) {
            // Stays on screen: a toast that fades after 2.6s is easy to miss on
            // a phone, which makes a rejected signup look like a successful one.
            var box = document.getElementById('auth-error');
            box.textContent = data.message;
            box.hidden = false;
            KB.toast(data.message, true);
        }
    });
})();
