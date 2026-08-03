'use strict';

const { layout } = require('./layout');
const { LIMITS } = require('../lib/validation');

const backLink = '<a href="/dashboard" class="back-link">← گەڕانەوە بۆ داشبۆرد</a>';

function loginPage() {
    return layout({
        title: 'KurdBio - چوونەژوورەوە',
        script: '/js/login.js',
        body: `
<div class="container" style="max-width:400px;align-self:center;">
    <div class="card">
        <h2 class="gradient" id="form-title">چوونەژوورەوە بۆ KurdBio</h2>
        <form id="auth-form" autocomplete="on">
            <label for="username">ناوی بەکارهێنەر (Username)</label>
            <input type="text" id="username" name="username" autocomplete="username" placeholder="یوزەرنەمەکەت بنووسە" maxlength="20">
            <label for="password">وشەی تێپەڕ (Password)</label>
            <input type="password" id="password" name="password" autocomplete="current-password" placeholder="••••••••" maxlength="${LIMITS.passwordMax}">
            <button class="btn" id="action-btn" type="submit">چوونەژوورەوە 🚀</button>
        </form>
        <div class="toggle-link" id="toggle"><span id="toggle-text">هەژمارت نییە؟ خۆت تۆمار بکە</span></div>
    </div>
</div>`
    });
}

function dashboardPage({ shareUrl, isAdmin }) {
    return layout({
        title: 'KurdBio - داشبۆرد',
        data: { shareUrl },
        script: '/js/dashboard.js',
        body: `
<div class="container" style="align-self:center;text-align:center;">
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
        <a href="/themes" class="menu-btn btn-themes">🎨 هەڵبژاردنی لە نێوان ١٠٠ دیزاینی نایاب</a>
        <a href="/balance" class="menu-btn btn-balance">💰 باڵانس و پارەخستنە سەر</a>
        <a href="/settings" class="menu-btn btn-settings">🛠️ ڕێکخستنی هەژمار</a>
        ${isAdmin ? '<a href="/admin" class="menu-btn btn-admin">👑 پەنەلی ئەدمن</a>' : ''}
        <a href="#" id="preview-btn" class="menu-btn preview-btn">بینینی پڕۆفایلەکەم 🚀</a>
        <button class="menu-btn btn-logout" id="logout-btn" type="button">🚪 چوونە دەرەوە</button>
    </div>
</div>`
    });
}

function editorPage() {
    return layout({
        title: 'KurdBio - بەڕێوەبردنی پڕۆفایل',
        data: { limits: LIMITS },
        script: '/js/editor.js',
        body: `
<div class="container" style="max-width:500px;">
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
        <input type="text" id="whatsapp" placeholder="964750xxxxxxx" maxlength="20">
        <label for="snapchat">👻 سناپچات</label>
        <input type="text" id="snapchat" placeholder="username" maxlength="32">
        <label for="telegram">✈️ تێلیگرام</label>
        <input type="text" id="telegram" placeholder="username" maxlength="32">
        <label for="facebook">📘 فەیسبووک</label>
        <input type="text" id="facebook" placeholder="https://facebook.com/..." maxlength="${LIMITS.linkUrl}">
    </div>
    <div class="card">
        <h2 class="section">🔗 لینکە گشتییەکانی تر</h2>
        <label for="linkTitle">ناونیشانی لینک</label>
        <input type="text" id="linkTitle" maxlength="${LIMITS.linkTitle}" placeholder="یووتیوب">
        <label for="linkUrl">لینکی ڕاستەقینە (URL)</label>
        <input type="url" id="linkUrl" maxlength="${LIMITS.linkUrl}" placeholder="https://...">
        <button class="btn btn-add" id="add-link" type="button">زیادکردنی لینک ➕</button>
        <div id="links-container"></div>
    </div>
    <button class="btn" id="save-btn" type="button">💾 خەزنکردنی گۆڕانکارییەکان</button>
</div>`
    });
}

function themesPage() {
    return layout({
        title: 'KurdBio - ١٠٠ دیزاینی نایاب',
        script: '/js/themes.js',
        body: `
<div class="container wide">
    ${backLink}
    <h2 class="gradient">🎨 هەڵبژاردنی دیزاینە نایابەکان</h2>
    <div class="subtitle">
        لە نێوان بژاردەکاندا شێوازی دڵخوازی خۆت هەڵبژێرە —
        <span class="balance-pill" id="balance-pill">باڵانس: ٠ $</span>
    </div>
    <div class="themes-grid" id="grid"></div>
</div>`
    });
}

function settingsPage() {
    return layout({
        title: 'KurdBio - ڕێکخستنی هەژمار',
        data: { limits: LIMITS },
        script: '/js/settings.js',
        body: `
<div class="container" style="max-width:420px;align-self:center;">
    ${backLink}
    <div class="card">
        <h2 class="gradient">🛠️ گۆڕینی زانیارییەکانی هەژمار</h2>
        <label for="new-username">ناوی بەکارهێنەری نوێ</label>
        <input type="text" id="new-username" maxlength="20" autocomplete="username">
        <label for="current-password">وشەی تێپەڕی ئێستا</label>
        <input type="password" id="current-password" autocomplete="current-password" placeholder="••••••••">
        <label for="new-password">وشەی تێپەڕی نوێ (ئارەزوومەندانە)</label>
        <input type="password" id="new-password" autocomplete="new-password" placeholder="بەتاڵی بهێڵەوە ئەگەر ناتەوێت بیگۆڕیت">
        <button class="btn btn-blue" id="save-btn" type="button">نوێکردنەوە 💾</button>
    </div>
</div>`
    });
}

function balancePage() {
    return layout({
        title: 'KurdBio - باڵانس',
        script: '/js/balance.js',
        body: `
<div class="container" style="max-width:420px;align-self:center;">
    ${backLink}
    <div class="card" style="text-align:center;">
        <h2 class="gradient">💰 باڵانسی هەژمارەکەت</h2>
        <div class="balance-pill" id="balance-pill" style="font-size:20px;padding:14px 28px;">...</div>
        <p style="color:var(--muted);font-size:13px;margin-top:22px;line-height:1.9;">
            باڵانس بۆ کڕینی دیزاینە VIPـەکان بەکاردێت.<br>
            بۆ زیادکردنی باڵانس پەیوەندی بە بەڕێوەبەرەوە بکە،
            دواتر بڕەکە ڕاستەوخۆ دەخرێتە سەر هەژمارەکەت.
        </p>
    </div>
    <div class="card">
        <h2 class="section">✨ دیزاینە کڕدراوەکانت</h2>
        <div id="owned-list" style="font-size:13px;color:var(--muted);line-height:2;">...</div>
    </div>
</div>`
    });
}

function adminPage() {
    return layout({
        title: 'KurdBio - بەڕێوەبەری ئەدمن',
        script: '/js/admin.js',
        body: `
<div class="container wide">
    ${backLink}
    <h2 class="gradient">👑 پەنەلی کۆنترۆڵی ئەدمن</h2>
    <div class="card">
        <h2 class="section" style="color:var(--green);">📋 لیستی بەکارهێنەرە چالاکەکان</h2>
        <div class="table-scroll"><table id="users-table"></table></div>
    </div>
    <div class="card">
        <h2 class="section" style="color:var(--red);">🚫 لیستی بەکارهێنەرە بانکراوەکان</h2>
        <div class="table-scroll"><table id="banned-table"></table></div>
    </div>
</div>`
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
<div class="profile-card">
    <div>
        <img id="p-avatar" class="avatar-img" src="" alt="">
        <h1 id="p-name">بارکردن...</h1>
        <p class="bio" id="p-bio"></p>
    </div>
    <div style="width:100%;">
        <div id="p-socials" class="links-container" style="margin-bottom:12px;"></div>
        <div id="p-links" class="links-container"></div>
    </div>
    <div class="footer">دروستکراوە لە <span>Kurd Bio</span> 🚀</div>
</div>`
    });
}

function notFoundPage() {
    return layout({
        title: 'KurdBio - نەدۆزرایەوە',
        body: `
<div class="container" style="max-width:400px;align-self:center;text-align:center;">
    <div class="card">
        <h2 class="gradient">٤٠٤ — لاپەڕەکە نەدۆزرایەوە</h2>
        <p style="color:var(--muted);font-size:14px;">ئەم لینکە هەڵەیە یان سڕاوەتەوە.</p>
        <a href="/" class="menu-btn" style="margin-top:20px;">گەڕانەوە بۆ سەرەتا</a>
    </div>
</div>`
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
