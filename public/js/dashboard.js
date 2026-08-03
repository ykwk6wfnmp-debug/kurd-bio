/* Dashboard: share link, navigation, logout. */
(function () {
    'use strict';
    var KB = window.KB;
    // The share URL is built server-side; the client only displays it.
    var shareUrl = KB.pageData().shareUrl || '';

    var input = document.getElementById('profile-link');
    input.value = shareUrl;
    document.getElementById('preview-btn').setAttribute('href', shareUrl);

    document.getElementById('copy-btn').addEventListener('click', async function () {
        var ok = await KB.copyText(shareUrl, input);
        KB.toast(ok ? 'لینکی پڕۆفایلەکەت کۆپیکرا! 📋' : 'کۆپی نەکرا، دەستی کۆپی بکە.', !ok);
    });

    document.getElementById('logout-btn').addEventListener('click', async function () {
        var data = await KB.api('/api/logout', { method: 'POST' });
        window.location.href = (data && data.redirect) || '/';
    });
})();
