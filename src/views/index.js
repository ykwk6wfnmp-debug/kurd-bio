'use strict';

const { layout } = require('./layout');
const { LIMITS } = require('../lib/validation');

const backLink = '<a href="/dashboard" class="back-link">← گەڕانەوە بۆ داشبۆرد</a>';

function loginPage() {
    return layout({
        title: 'KurdBio - چوونەژوورەوە',
        script: '/js/login.js',
        body: `
<main class="app center">
    <div class="container sm">
        <div class="card">
            <h2 class="gradient" id="form-title">چوونەژوورەوە بۆ KurdBio</h2>
            <form id="auth-form" autocomplete="on">
                <label for="username">ناوی بەکارهێنەر (Username)</label>
                <input type="text" id="username" name="username" autocomplete="username"
                       inputmode="latin" autocapitalize="none" spellcheck="false"
                       placeholder="یوزەرنەمەکەت بنووسە" maxlength="20">
                <label for="password">وشەی تێپەڕ (Password)</label>
                <input type="password" id="password" name="password" autocomplete="current-password"
                       placeholder="••••••••" maxlength="${LIMITS.passwordMax}">
                <button class="btn" id="action-btn" type="submit">چوونەژوورەوە 🚀</button>
            </form>
            <div class="toggle-link" id="toggle" role="button" tabindex="0">
                <span id="toggle-text">هەژمارت نییە؟ خۆت تۆمار بکە</span>
            </div>
        </div>
    </div>
</main>`
    });
}

function dashboardPage({ shareUrl, isAdmin }) {
    return layout({
        title: 'KurdBio - داشبۆرد',
        data: { shareUrl },
        script: '/js/dashboard.js',
        body: `
<main class="app center">
    <div class="container sm">
        <div class="card">
            <h2 class="gradient">بەخێر هاتیت بۆ داشبۆردەکەت ✨</h2>
            <div class="link-box">
                <label for="profile-link">🔗 لینکی گشتی پڕۆفایلەکەت بۆ خەڵکی:</label>
                <div class="link-input-group">
                    <input type="text" id="profile-link" readonly>
                    <button class="copy-btn" id="copy-btn" type="button">کۆپی</button>
                </div>
            </div>
            <a href="/editor" class="menu-btn">⚙️ ڕێکخستنی پڕۆفایل و وێنە</a>
            <a href="/themes" class="menu-btn btn-themes">🎨 گالەری ١٠٠٠ دیزاین</a>
            <a href="/balance" class="menu-btn btn-balance">💰 باڵانس و پارەخستنە سەر</a>
            <a href="/settings" class="menu-btn btn-settings">🛠️ ڕێکخستنی هەژمار</a>
            ${isAdmin ? '<a href="/admin" class="menu-btn btn-admin">👑 پەنەلی ئەدمن</a>' : ''}
            <a href="#" id="preview-btn" class="menu-btn preview-btn">بینینی پڕۆفایلەکەم 🚀</a>
            <button class="menu-btn btn-logout" id="logout-btn" type="button">🚪 چوونە دەرەوە</button>
        </div>
    </div>
</main>`
    });
}

function editorPage() {
    return layout({
        title: 'KurdBio - بەڕێوەبردنی پڕۆفایل',
        data: { limits: LIMITS },
        script: '/js/editor.js',
        body: `
<main class="app">
    <div class="container md">
        ${backLink}
        <div class="card">
            <h2 class="section">👤 زانیارییەکانی پڕۆفایل و وێنە</h2>
            <label for="name">ناوی تەواو یان پەیج</label>
            <input type="text" id="name" maxlength="${LIMITS.name}" placeholder="مەبەست عەلی">
            <label for="bio">کورتە دەق (Bio)</label>
            <input type="text" id="bio" maxlength="${LIMITS.bio}" placeholder="دروستکەری ناوەڕۆک 🎬">
            <label for="avatarFile">🖼️ وێنەی پڕۆفایل لە مۆبایلەوە</label>
            <input type="file" id="avatarFile" accept="image/png,image/jpeg,image/webp,image/gif">
            <img id="image-preview" class="preview-avatar" alt="پێشبینینی وێنە">
        </div>
        <div class="card">
            <h2 class="section">💬 بەستەری تۆڕە کۆمەڵایەتییەکان</h2>
            <label for="whatsapp">📱 واتسئەپ</label>
            <input type="tel" id="whatsapp" inputmode="numeric" placeholder="964750xxxxxxx" maxlength="20">
            <label for="snapchat">👻 سناپچات</label>
            <input type="text" id="snapchat" autocapitalize="none" spellcheck="false" placeholder="username" maxlength="32">
            <label for="telegram">✈️ تێلیگرام</label>
            <input type="text" id="telegram" autocapitalize="none" spellcheck="false" placeholder="username" maxlength="32">
            <label for="facebook">📘 فەیسبووک</label>
            <input type="url" id="facebook" inputmode="url" autocapitalize="none" spellcheck="false"
                   placeholder="https://facebook.com/..." maxlength="${LIMITS.linkUrl}">
        </div>
        <div class="card">
            <h2 class="section">🔗 لینکە گشتییەکانی تر</h2>
            <label for="linkTitle">ناونیشانی لینک</label>
            <input type="text" id="linkTitle" maxlength="${LIMITS.linkTitle}" placeholder="یووتیوب">
            <label for="linkUrl">لینکی ڕاستەقینە (URL)</label>
            <input type="url" id="linkUrl" inputmode="url" autocapitalize="none" spellcheck="false"
                   maxlength="${LIMITS.linkUrl}" placeholder="https://...">
            <button class="btn btn-add" id="add-link" type="button">زیادکردنی لینک ➕</button>
            <div id="links-container"></div>
        </div>
        <div class="sticky-actions">
            <button class="btn" id="save-btn" type="button">💾 خەزنکردنی گۆڕانکارییەکان</button>
        </div>
    </div>
</main>`
    });
}

function themesPage() {
    return layout({
        title: 'KurdBio - ١٠٠٠ دیزاین',
        script: '/js/themes.js',
        body: `
<main class="app">
    <div class="container lg">
        ${backLink}
        <h2 class="gradient">🎨 گالەری دیزاینەکان</h2>
        <div class="subtitle">
            <span id="catalog-count">١٠٠٠ دیزاین</span> لە ١٠ خێزانی جیاواز —
            <span class="balance-pill" id="balance-pill">باڵانس: ٠ $</span>
        </div>
        <div class="themes-bar">
            <div class="chips" id="family-chips" role="group" aria-label="جۆرەکانی دیزاین"></div>
        </div>
        <div class="themes-grid" id="grid"></div>
        <div id="grid-status"></div>
    </div>
</main>`
    });
}

function settingsPage() {
    return layout({
        title: 'KurdBio - ڕێکخستنی هەژمار',
        data: { limits: LIMITS },
        script: '/js/settings.js',
        body: `
<main class="app center">
    <div class="container sm">
        ${backLink}
        <div class="card">
            <h2 class="gradient">🛠️ گۆڕینی زانیارییەکانی هەژمار</h2>
            <label for="new-username">ناوی بەکارهێنەری نوێ</label>
            <input type="text" id="new-username" maxlength="20" autocomplete="username"
                   autocapitalize="none" spellcheck="false">
            <label for="current-password">وشەی تێپەڕی ئێستا</label>
            <input type="password" id="current-password" autocomplete="current-password" placeholder="••••••••">
            <label for="new-password">وشەی تێپەڕی نوێ (ئارەزوومەندانە)</label>
            <input type="password" id="new-password" autocomplete="new-password"
                   placeholder="بەتاڵی بهێڵەوە ئەگەر ناتەوێت بیگۆڕیت">
            <button class="btn btn-blue" id="save-btn" type="button">نوێکردنەوە 💾</button>
        </div>
    </div>
</main>`
    });
}

function balancePage() {
    return layout({
        title: 'KurdBio - باڵانس',
        script: '/js/balance.js',
        body: `
<main class="app center">
    <div class="container sm">
        ${backLink}
        <div class="card notice">
            <h2 class="gradient">💰 باڵانسی هەژمارەکەت</h2>
            <div class="balance-pill" id="balance-pill">...</div>
            <p class="hint">
                باڵانس بۆ کڕینی دیزاینە VIP و ئەفسانەییەکان بەکاردێت.<br>
                بۆ زیادکردنی باڵانس پەیوەندی بە بەڕێوەبەرەوە بکە.
            </p>
        </div>
        <div class="card">
            <h2 class="section">✨ دیزاینە کڕدراوەکانت</h2>
            <div id="owned-list" class="hint">...</div>
        </div>
    </div>
</main>`
    });
}

function adminPage() {
    return layout({
        title: 'KurdBio - بەڕێوەبەری ئەدمن',
        script: '/js/admin.js',
        body: `
<main class="app">
    <div class="container lg">
        ${backLink}
        <h2 class="gradient">👑 پەنەلی کۆنترۆڵی ئەدمن</h2>
        <div class="card">
            <h2 class="section" style="color:var(--green)">📋 بەکارهێنەرە چالاکەکان</h2>
            <table class="data-table" id="users-table"></table>
        </div>
        <div class="card">
            <h2 class="section" style="color:var(--red)">🚫 بەکارهێنەرە بانکراوەکان</h2>
            <table class="data-table" id="banned-table"></table>
        </div>
    </div>
</main>`
    });
}

function profilePage({ username }) {
    return layout({
        title: 'KurdBio - پڕۆفایل',
        data: { username },
        script: '/js/profile.js',
        bodyClass: 'profile',
        head: '<meta name="robots" content="index, follow">',
        body: `
<main class="profile-shell">
    <article class="profile-card">
        <header class="profile-head">
            <img id="p-avatar" class="avatar-img" src="" alt="">
            <h1 id="p-name">بارکردن...</h1>
            <p class="bio" id="p-bio"></p>
        </header>
        <div class="links-container" id="p-socials"></div>
        <div class="links-container" id="p-links"></div>
        <footer class="footer">دروستکراوە لە <span>Kurd Bio</span> 🚀</footer>
    </article>
</main>`
    });
}

function notFoundPage() {
    return layout({
        title: 'KurdBio - نەدۆزرایەوە',
        body: `
<main class="app center">
    <div class="container sm">
        <div class="card notice">
            <h2 class="gradient">٤٠٤ — لاپەڕەکە نەدۆزرایەوە</h2>
            <p>ئەم لینکە هەڵەیە یان سڕاوەتەوە.</p>
            <a href="/" class="menu-btn">گەڕانەوە بۆ سەرەتا</a>
        </div>
    </div>
</main>`
    });
}

module.exports = {
    loginPage,
    dashboardPage,
    editorPage,
    themesPage,
    settingsPage,
    balancePage,
    adminPage,
    profilePage,
    notFoundPage
};
