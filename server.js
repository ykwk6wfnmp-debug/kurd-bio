const express = require('express');
const cors = require('cors');

const app = express();
app.use(express.json({ limit: '10mb' }));
app.use(cors());

let users = {}; 
let userProfiles = {}; 

app.get('/', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html lang="ckb" dir="rtl">
        <head>
            <meta charset="UTF-8">
            <title>KurdBio - چوونەژوورەوە</title>
            <style>
                * { box-sizing: border-box; margin: 0; padding: 0; font-family: system-ui, sans-serif; }
                body { background: #0d1117; color: #fff; display: flex; justify-content: center; align-items: center; min-height: 100vh; padding: 20px; }
                .card { background: #161b22; border: 1px solid #30363d; border-radius: 20px; padding: 30px; width: 100%; max-width: 400px; box-shadow: 0 10px 30px rgba(0,0,0,0.5); text-align: center; }
                h2 { color: #00f2fe; margin-bottom: 20px; font-size: 22px; }
                label { font-size: 13px; color: #8b949e; display: block; text-align: right; margin-top: 12px; margin-bottom: 5px; }
                input { width: 100%; padding: 12px; background: #0d1117; border: 1px solid #30363d; color: #fff; border-radius: 10px; outline: none; }
                .btn { width: 100%; padding: 14px; background: linear-gradient(90deg, #ff0050, #00f2fe); color: #fff; border: none; border-radius: 10px; font-weight: bold; font-size: 16px; cursor: pointer; margin-top: 20px; }
                .toggle-link { margin-top: 15px; font-size: 13px; color: #8b949e; cursor: pointer; }
                .toggle-link span { color: #00f2fe; font-weight: bold; }
            </style>
        </head>
        <body>
            <div class="card">
                <h2 id="form-title">چوونەژوورەوە بۆ KurdBio</h2>
                <label>ناوی بەکارهێنەر (Username)</label>
                <input type="text" id="username" placeholder="یوزەرنەمەکەت بنووسە">
                <label>وشەی تێپەڕ (Password)</label>
                <input type="password" id="password" placeholder="••••••••">
                <button class="btn" id="action-btn" onclick="handleAuth()">چوونەژوورەوە 🚀</button>
                <div class="toggle-link" onclick="toggleMode()">
                    <span id="toggle-text">هەژمارت نییە؟ خۆت تۆمار بکە</span>
                </div>
            </div>
            <script>
                let isRegisterMode = false;
                function toggleMode() {
                    isRegisterMode = !isRegisterMode;
                    document.getElementById('form-title').innerText = isRegisterMode ? 'دروستکردنی هەژماری نوێ' : 'چوونەژوورەوە بۆ KurdBio';
                    document.getElementById('action-btn').innerText = isRegisterMode ? 'دروستکردنی هەژمار ✨' : 'چوونەژوورەوە 🚀';
                    document.getElementById('toggle-text').innerText = isRegisterMode ? 'هەژمارت هەیە؟ بچۆ ژوورەوە' : 'هەژمارت نییە؟ خۆت تۆمار بکە';
                }
                async function handleAuth() {
                    const username = document.getElementById('username').value.trim();
                    const password = document.getElementById('password').value;
                    if(!username || !password) return alert('تکایە هەردوو خانەکە پڕبکەرەوە!');
                    
                    if(username === 'admin' && password === 'admin123') {
                        window.location.href = '/admin';
                        return;
                    }

                    const endpoint = isRegisterMode ? '/api/register' : '/api/login';
                    const res = await fetch(endpoint, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ username, password })
                    });
                    const data = await res.json();
                    if(data.success) {
                        window.location.href = '/dashboard?user=' + username;
                    } else {
                        alert(data.message);
                    }
                }
            </script>
        </body>
        </html>
    `);
});

// پەنەلی ئەدمن
app.get('/admin', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html lang="ckb" dir="rtl">
        <head>
            <meta charset="UTF-8">
            <title>KurdBio - بەڕێوەبەری ئەدمن</title>
            <style>
                * { box-sizing: border-box; margin: 0; padding: 0; font-family: system-ui, sans-serif; }
                body { background: #0d1117; color: #fff; padding: 20px; display: flex; justify-content: center; }
                .container { width: 100%; max-width: 800px; }
                h1 { color: #00f2fe; margin-bottom: 20px; font-size: 24px; text-align: center; }
                .card { background: #161b22; border: 1px solid #30363d; border-radius: 15px; padding: 20px; margin-bottom: 15px; box-shadow: 0 10px 30px rgba(0,0,0,0.5); }
                table { width: 100%; border-collapse: collapse; margin-top: 10px; }
                th, td { border: 1px solid #30363d; padding: 12px; text-align: center; font-size: 14px; }
                th { background: #21262d; color: #00f2fe; }
                .delete-btn { background: #da3633; border: none; color: white; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 12px; font-weight: bold; }
                .delete-btn:hover { background: #b31d1d; }
                .back-home { display: inline-block; margin-bottom: 20px; color: #8b949e; text-decoration: none; font-size: 14px; }
                .back-home:hover { color: #fff; }
            </style>
        </head>
        <body>
            <div class="container">
                <a href="/" class="back-home">← چوونەدەرەوە لە ئەدمن</a>
                <h1>👑 پەنەلی کۆنترۆڵی ئەدمن (Admin Dashboard)</h1>
                <div class="card">
                    <h2 style="font-size: 18px; color: #2ea043; margin-bottom: 10px;">📋 لیستی هەموو بەکارهێنەرە تۆمارکراوەکان</h2>
                    <table id="users-table">
                        <tr>
                            <th>ناوی بەکارهێنەر (Username)</th>
                            <th>وشەی تێپەڕ (Password)</th>
                            <th>باڵانس ($)</th>
                            <th>کردار (Action)</th>
                        </tr>
                    </table>
                </div>
            </div>
            <script>
                async function loadAdminData() {
                    const res = await fetch('/api/admin/users');
                    const data = await res.json();
                    if(data.success) {
                        const table = document.getElementById('users-table');
                        table.innerHTML = \`
                            <tr>
                                <th>ناوی بەکارهێنەر (Username)</th>
                                <th>وشەی تێپەڕ (Password)</th>
                                <th>باڵانس ($)</th>
                                <th>کردار (Action)</th>
                            </tr>
                        \`;
                        for(let user in data.users) {
                            table.innerHTML += \`
                                <tr>
                                    <td>\${user}</td>
                                    <td>\${data.users[user].password}</td>
                                    <td>\${data.users[user].balance} $</td>
                                    <td><button class="delete-btn" onclick="deleteUser('\${user}')">سڕینەوە / بانکردن</button></td>
                                </tr>
                            \`;
                        }
                    }
                }
                loadAdminData();

                async function deleteUser(username) {
                    if(!confirm('دڵنیایت لە سڕینەوەی ئەم بەکارهێنەرە؟')) return;
                    const res = await fetch('/api/admin/delete-user', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ username })
                    });
                    const data = await res.json();
                    if(data.success) {
                        alert('بەکارهێنەرەکە سڕایەوە!');
                        loadAdminData();
                    }
                }
            </script>
        </body>
        </html>
    `);
});

app.get('/api/admin/users', (req, res) => {
    res.json({ success: true, users });
});

app.post('/api/admin/delete-user', (req, res) => {
    const { username } = req.body;
    if(users[username]) {
        delete users[username];
        delete userProfiles[username];
        res.json({ success: true });
    } else {
        res.json({ success: false, message: 'بەکارهێنەر نەدۆزرایەوە' });
    }
});

// داشبۆردی سەرەکی لەگەڵ دوگمەی ڕێکخستن و چوونەدرەوە (Log Out)
app.get('/dashboard', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html lang="ckb" dir="rtl">
        <head>
            <meta charset="UTF-8">
            <title>KurdBio - داشبۆردی سەرەکی</title>
            <style>
                * { box-sizing: border-box; margin: 0; padding: 0; font-family: system-ui, sans-serif; }
                body { background: #0d1117; color: #fff; display: flex; justify-content: center; align-items: center; min-height: 100vh; padding: 20px; }
                .container { width: 100%; max-width: 450px; text-align: center; }
                .card { background: #161b22; border: 1px solid #30363d; border-radius: 20px; padding: 30px; box-shadow: 0 10px 30px rgba(0,0,0,0.5); }
                h2 { color: #00f2fe; margin-bottom: 20px; font-size: 22px; }
                .link-box { background: #0d1117; border: 1px dashed #00f2fe; padding: 12px; border-radius: 12px; margin-bottom: 20px; text-align: right; }
                .link-box label { font-size: 11px; color: #8b949e; display: block; margin-bottom: 4px; }
                .link-input-group { display: flex; gap: 8px; }
                .link-input-group input { width: 100%; padding: 8px; background: #161b22; border: 1px solid #30363d; color: #00f2fe; border-radius: 8px; font-size: 12px; outline: none; direction: ltr; text-align: left; }
                .copy-btn { background: #00f2fe; color: #000; border: none; padding: 8px 12px; border-radius: 8px; font-weight: bold; cursor: pointer; font-size: 12px; }
                .menu-btn { display: block; width: 100%; padding: 14px; margin: 10px 0; background: #21262d; color: #fff; text-decoration: none; border-radius: 14px; border: 1px solid #30363d; font-weight: bold; font-size: 15px; transition: 0.2s; text-align: center; }
                .menu-btn:hover { border-color: #00f2fe; background: #30363d; transform: translateY(-2px); }
                .btn-vip { border-color: #ffd700; color: #ffd700; }
                .btn-vip:hover { background: #2a2510; border-color: #ffd700; }
                .btn-settings { border-color: #1f6feb; color: #58a6ff; }
                .btn-settings:hover { background: #111b27; }
                .btn-logout { border-color: #da3633; color: #f85149; margin-top: 20px; }
                .btn-logout:hover { background: #2c1515; }
                .preview-btn { margin-top: 15px; background: linear-gradient(90deg, #ff0050, #00f2fe); border: none; color: white; cursor: pointer; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="card">
                    <h2>بەخێر هاتیت بۆ داشبۆردەکەت ✨</h2>
                    <div class="link-box">
                        <label>🔗 لینکی تایبەتی پڕۆفایلەکەت:</label>
                        <div class="link-input-group">
                            <input type="text" id="profile-link" readonly>
                            <button class="copy-btn" onclick="copyLink()">کۆپی</button>
                        </div>
                    </div>
                    <a href="#" onclick="openPage('editor')" class="menu-btn">⚙️ بەشی ڕێکخستنی پڕۆفایل و وێنە</a>
                    <a href="#" onclick="openPage('vip')" class="menu-btn btn-vip">⭐ بەشی دیزاینە VIPـەکان</a>
                    <a href="#" onclick="openPage('balance')" class="menu-btn" style="color: #2ea043; border-color: #2ea043;">💳 بەشی باڵانس و پارەدان</a>
                    <a href="#" onclick="openPage('settings')" class="menu-btn btn-settings">🛠️ ڕێکخستنی هەژمار (Settings)</a>
                    
                    <button class="menu-btn preview-btn" onclick="openPage('profile')">بینینی پڕۆفایلەکەم 🚀</button>
                    <button class="menu-btn btn-logout" onclick="logout()">🚪 چوونە دەرەوە (Log Out)</button>
                </div>
            </div>
            <script>
                const urlParams = new URLSearchParams(window.location.search);
                const username = urlParams.get('user');
                if(!username) window.location.href = '/';
                const fullProfileUrl = window.location.origin + '/profile?user=' + username;
                document.getElementById('profile-link').value = fullProfileUrl;
                function copyLink() {
                    const copyText = document.getElementById('profile-link');
                    copyText.select();
                    navigator.clipboard.writeText(copyText.value);
                    alert('لینکی پڕۆفایلەکەت کۆپیکرا! 📋');
                }
                function openPage(type) {
                    if(type === 'editor') window.location.href = '/editor?user=' + username;
                    if(type === 'vip') window.location.href = '/vip?user=' + username;
                    if(type === 'balance') window.location.href = '/balance?user=' + username;
                    if(type === 'settings') window.location.href = '/settings?user=' + username;
                    if(type === 'profile') window.location.href = '/profile?user=' + username;
                }
                function logout() {
                    if(confirm('دڵنیایت دەتەوێت لە هەژمارەکەت بچیتە دەرەوە؟')) {
                        window.location.href = '/';
                    }
                }
            </script>
        </body>
        </html>
    `);
});

// لاپەڕەی ڕێکخستنی هەژمار (Settings) بۆ گۆڕینی یوزەر و پاسۆرد
app.get('/settings', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html lang="ckb" dir="rtl">
        <head>
            <meta charset="UTF-8">
            <title>KurdBio - ڕێکخستنی هەژمار</title>
            <style>
                * { box-sizing: border-box; margin: 0; padding: 0; font-family: system-ui, sans-serif; }
                body { background: #0d1117; color: #fff; display: flex; justify-content: center; min-height: 100vh; padding: 20px; }
                .container { width: 100%; max-width: 450px; }
                .card { background: #161b22; border: 1px solid #1f6feb; border-radius: 20px; padding: 25px; box-shadow: 0 10px 30px rgba(0,0,0,0.5); }
                h2 { color: #58a6ff; margin-bottom: 15px; font-size: 20px; text-align: center; }
                label { font-size: 13px; color: #8b949e; display: block; margin-top: 12px; margin-bottom: 5px; }
                input { width: 100%; padding: 12px; background: #0d1117; border: 1px solid #30363d; color: #fff; border-radius: 10px; outline: none; }
                .btn { width: 100%; padding: 14px; background: #1f6feb; color: #fff; border: none; border-radius: 10px; font-weight: bold; font-size: 16px; cursor: pointer; margin-top: 20px; }
                .btn:hover { background: #388bfd; }
                .back-link { display: inline-block; margin-bottom: 15px; color: #8b949e; text-decoration: none; font-size: 14px; }
                .back-link:hover { color: #fff; }
            </style>
        </head>
        <body>
            <div class="container">
                <a href="#" onclick="goBack()" class="back-link">← گەڕانەوە بۆ داشبۆرد</a>
                <div class="card">
                    <h2>🛠️ گۆڕینی زانیارییەکانی هەژمار</h2>
                    <label>ناوی بەکارهێنەری نوێ (Username)</label>
                    <input type="text" id="new-username" placeholder="یوزەرنەمی نوێ">
                    <label>وشەی تێپەڕی نوێ (Password)</label>
                    <input type="password" id="new-password" placeholder="پاسۆردی نوێ">
                    <button class="btn" onclick="updateAccount()">نوێکردنەوەی زانیارییەکان 💾</button>
                </div>
            </div>
            <script>
                const urlParams = new URLSearchParams(window.location.search);
                const username = urlParams.get('user');
                if(!username) window.location.href = '/';
                function goBack() { window.location.href = '/dashboard?user=' + username; }

                async function loadUserData() {
                    const res = await fetch('/api/get-bio/' + username);
                    const data = await res.json();
                    if(data.success) {
                        document.getElementById('new-username').value = username;
                    }
                }
                loadUserData();

                async function updateAccount() {
                    const newUsername = document.getElementById('new-username').value.trim();
                    const newPassword = document.getElementById('new-password').value;
                    if(!newUsername || !newPassword) return alert('تکایە خانەکان پڕبکەرەوە!');

                    const res = await fetch('/api/update-account', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ oldUsername: username, newUsername, newPassword })
                    });
                    const data = await res.json();
                    if(data.success) {
                        alert('زانیارییەکان بە سەرکەوتوویی گۆڕدران!');
                        window.location.href = '/dashboard?user=' + newUsername;
                    } else {
                        alert(data.message);
                    }
                }
            </script>
        </body>
        </html>
    `);
});

// API بۆ نوێکردنەوەی یوزەر و پاسۆرد
app.post('/api/update-account', (req, res) => {
    const { oldUsername, newUsername, newPassword } = req.body;
    if(oldUsername !== newUsername && users[newUsername]) {
        return res.json({ success: false, message: 'ئەم یوزەرنەمەیە پێشتر هەیە، تکایە یوزەرێکی تر هەڵبژێرە!' });
    }
    if(users[oldUsername]) {
        users[newUsername] = { password: newPassword, balance: users[oldUsername].balance };
        userProfiles[newUsername] = userProfiles[oldUsername];
        if(oldUsername !== newUsername) {
            delete users[oldUsername];
            delete userProfiles[oldUsername];
        }
        res.json({ success: true });
    } else {
        res.json({ success: false, message: 'هەڵەیەک ڕووی دا!' });
    }
});

// لاپەڕەی دروستکردنی لینک بایۆ و وێنە
app.get('/editor', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html lang="ckb" dir="rtl">
        <head>
            <meta charset="UTF-8">
            <title>KurdBio - بەڕێوەبردنی لینک بایۆ</title>
            <style>
                * { box-sizing: border-box; margin: 0; padding: 0; font-family: system-ui, sans-serif; }
                body { background: #0d1117; color: #fff; display: flex; justify-content: center; min-height: 100vh; padding: 20px; }
                .container { width: 100%; max-width: 500px; padding-bottom: 40px; }
                .card { background: #161b22; border: 1px solid #30363d; border-radius: 20px; padding: 25px; margin-bottom: 20px; box-shadow: 0 10px 30px rgba(0,0,0,0.5); }
                h2 { color: #00f2fe; margin-bottom: 15px; font-size: 18px; }
                label { font-size: 13px; color: #8b949e; display: block; margin-top: 10px; margin-bottom: 5px; }
                input { width: 100%; padding: 12px; background: #0d1117; border: 1px solid #30363d; color: #fff; border-radius: 10px; outline: none; }
                input[type="file"] { padding: 8px; cursor: pointer; }
                .btn { width: 100%; padding: 14px; background: linear-gradient(90deg, #ff0050, #00f2fe); color: #fff; border: none; border-radius: 10px; font-weight: bold; font-size: 16px; cursor: pointer; margin-top: 15px; }
                .btn-add { background: #2ea043; margin-top: 15px; }
                .link-item { background: #0d1117; border: 1px solid #30363d; padding: 10px; border-radius: 10px; margin-top: 8px; display: flex; justify-content: space-between; align-items: center; }
                .delete-btn { background: #da3633; border: none; color: white; padding: 6px 10px; border-radius: 6px; cursor: pointer; font-size: 12px; }
                .back-link { display: inline-block; margin-bottom: 15px; color: #8b949e; text-decoration: none; font-size: 14px; }
                .back-link:hover { color: #fff; }
                .preview-avatar { width: 70px; height: 70px; border-radius: 50%; object-fit: cover; margin-top: 10px; border: 2px solid #00f2fe; display: none; }
            </style>
        </head>
        <body>
            <div class="container">
                <a href="#" onclick="goBack()" class="back-link">← گەڕانەوە بۆ داشبۆرد</a>
                <div class="card">
                    <h2>👤 زانیارییەکانی پڕۆفایل و وێنە</h2>
                    <label>ناوی تەواو یان پەیج</label>
                    <input type="text" id="name" placeholder="نموونە: مەبەست عەلی">
                    <label>کورتە دەق (Bio)</label>
                    <input type="text" id="bio" placeholder="دروستکەری ناوەڕۆک 🎬">
                    <label>🖼️ هەڵبژاردنی وێنەی پڕۆفایل لە مۆبایلەوە</label>
                    <input type="file" id="avatarFile" accept="image/*" onchange="previewImage(event)">
                    <img id="image-preview" class="preview-avatar" alt="Preview">
                </div>
                <div class="card">
                    <h2>💬 بەستەری تۆڕە کۆمەڵایەتییەکان</h2>
                    <label>📱 واتسئەپ</label>
                    <input type="text" id="whatsapp" placeholder="964750xxxxxxx">
                    <label>👻 سناپچات</label>
                    <input type="text" id="snapchat" placeholder="username">
                    <label>✈️ تێلیگرام</label>
                    <input type="text" id="telegram" placeholder="username">
                    <label>📘 فەیسبووک</label>
                    <input type="text" id="facebook" placeholder="https://facebook.com/...">
                </div>
                <div class="card">
                    <h2>🔗 لینکە گشتییەکانی تر</h2>
                    <label>ناونیشانی لینک</label>
                    <input type="text" id="linkTitle" placeholder="چەناڵی یووتیوب">
                    <label>لینکی ڕاستەقینە (URL)</label>
                    <input type="url" id="linkUrl" placeholder="https://...">
                    <button class="btn btn-add" onclick="addLink()">زیادکردنی لینک ➕</button>
                    <div id="links-container"></div>
                </div>
                <button class="btn" onclick="saveProfile()">💾 خەزنکردنی گۆڕانکارییەکان</button>
            </div>
            <script>
                let linksList = [];
                let base64Image = '';
                const urlParams = new URLSearchParams(window.location.search);
                const username = urlParams.get('user');
                if(!username) window.location.href = '/';
                function goBack() { window.location.href = '/dashboard?user=' + username; }
                function previewImage(event) {
                    const file = event.target.files[0];
                    if(file) {
                        const reader = new FileReader();
                        reader.onload = function(e) {
                            base64Image = e.target.result;
                            const preview = document.getElementById('image-preview');
                            preview.src = base64Image;
                            preview.style.display = 'block';
                        };
                        reader.readAsDataURL(file);
                    }
                }
                async function loadData() {
                    const res = await fetch('/api/get-bio/' + username);
                    const data = await res.json();
                    if(data.success && data.profile) {
                        const p = data.profile;
                        document.getElementById('name').value = p.name || '';
                        document.getElementById('bio').value = p.bio || '';
                        if(p.avatar) {
                            base64Image = p.avatar;
                            const preview = document.getElementById('image-preview');
                            preview.src = base64Image;
                            preview.style.display = 'block';
                        }
                        if(p.socials) {
                            document.getElementById('whatsapp').value = p.socials.whatsapp || '';
                            document.getElementById('snapchat').value = p.socials.snapchat || '';
                            document.getElementById('telegram').value = p.socials.telegram || '';
                            document.getElementById('facebook').value = p.socials.facebook || '';
                        }
                        if(p.links) { linksList = p.links; renderLinks(); }
                    }
                }
                loadData();
                function addLink() {
                    const title = document.getElementById('linkTitle').value;
                    const url = document.getElementById('linkUrl').value;
                    if(!title || !url) return alert('تکایە هەردوو خانەی لینک پڕبکەرەوە!');
                    linksList.push({ id: Date.now(), title, url });
                    document.getElementById('linkTitle').value = '';
                    document.getElementById('linkUrl').value = '';
                    renderLinks();
                }
                function deleteLink(id) { linksList = linksList.filter(item => item.id !== id); renderLinks(); }
                function renderLinks() {
                    const container = document.getElementById('links-container');
                    container.innerHTML = '';
                    linksList.forEach(item => {
                        container.innerHTML += '<div class="link-item"><div><strong>' + item.title + '</strong><div style="font-size: 11px; color: #8b949e;">' + item.url + '</div></div><button class="delete-btn" onclick="deleteLink(' + item.id + ')">سڕینەوە</button></div>';
                    });
                }
                async function saveProfile() {
                    const name = document.getElementById('name').value;
                    const bio = document.getElementById('bio').value;
                    const whatsapp = document.getElementById('whatsapp').value;
                    const snapchat = document.getElementById('snapchat').value;
                    const telegram = document.getElementById('telegram').value;
                    const facebook = document.getElementById('facebook').value;
                    const res = await fetch('/api/save-bio', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ username, name, bio, avatar: base64Image, socials: { whatsapp, snapchat, telegram, facebook }, links: linksList })
                    });
                    const data = await res.json();
                    if(data.success) {
                        alert('گۆڕانکارییەکان بە سەرکەوتوویی خەزنکران!');
                        window.location.href = '/dashboard?user=' + username;
                    } else {
                        alert('هەڵەیەک ڕوویدا لە خەزنکردندا!');
                    }
                }
            </script>
        </body>
        </html>
    `);
});

app.get('/vip', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html lang="ckb" dir="rtl">
        <head>
            <meta charset="UTF-8">
            <title>KurdBio - دیزاینە VIPـەکان</title>
            <style>
                * { box-sizing: border-box; margin: 0; padding: 0; font-family: system-ui, sans-serif; }
                body { background: #0d1117; color: #fff; display: flex; justify-content: center; min-height: 100vh; padding: 20px; }
                .container { width: 100%; max-width: 500px; }
                .card { background: #161b22; border: 1px solid #ffd700; border-radius: 20px; padding: 25px; margin-bottom: 20px; box-shadow: 0 10px 30px rgba(0,0,0,0.5); text-align: center; }
                h2 { color: #ffd700; margin-bottom: 15px; font-size: 20px; }
                .theme-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin: 20px 0; }
                .theme-option { border: 2px solid #30363d; border-radius: 14px; padding: 20px 15px; cursor: pointer; transition: 0.2s; text-align: center; }
                .theme-option:hover { transform: translateY(-3px); }
                .theme-option.selected { border-color: #ffd700; box-shadow: 0 0 20px rgba(255, 215, 0, 0.4); }
                .preview-default { background: linear-gradient(135deg, #0d1117, #161b22); color: #fff; }
                .preview-neon { background: #050505; color: #00f2fe; border-color: #00f2fe; }
                .preview-cyberpunk { background: #ffe600; color: #000; }
                .preview-gold { background: #1a1a1a; color: #ffd700; border-color: #ffd700; }
                .theme-title { font-weight: bold; font-size: 15px; margin-bottom: 5px; }
                .theme-price { font-size: 13px; font-weight: bold; }
                .btn { width: 100%; padding: 14px; background: #ffd700; color: #000; border: none; border-radius: 10px; font-weight: bold; font-size: 16px; cursor: pointer; }
                .back-link { display: inline-block; margin-bottom: 15px; color: #8b949e; text-decoration: none; font-size: 14px; }
                .back-link:hover { color: #fff; }
            </style>
        </head>
        <body>
            <div class="container">
                <a href="#" onclick="goBack()" class="back-link">← گەڕانەوە بۆ داشبۆرد</a>
                <div class="card">
                    <h2>⭐ دیزاینە تایبەت و VIPـەکان</h2>
                    <p style="font-size: 13px; color: #8b949e; margin-bottom: 10px;">دیزاینی دلخوازی خۆت هەڵبژێرە:</p>
                    <div class="theme-grid">
                        <div class="theme-option preview-default" id="opt-default" onclick="selectTheme('default')">
                            <div class="theme-title">اسکەی خۆڕسک</div>
                            <div class="theme-price" style="color: #2ea043;">ڕایگان</div>
                        </div>
                        <div class="theme-option preview-neon" id="opt-neon" onclick="selectTheme('neon')">
                            <div class="theme-title">✨ نێۆنی تیشکدەر</div>
                            <div class="theme-price">5 $</div>
                        </div>
                        <div class="theme-option preview-cyberpunk" id="opt-cyberpunk" onclick="selectTheme('cyberpunk')">
                            <div class="theme-title">🔥 سایبەرپانک</div>
                            <div class="theme-price">10 $</div>
                        </div>
                        <div class="theme-option preview-gold" id="opt-gold" onclick="selectTheme('gold')">
                            <div class="theme-title">👑 زێڕینی شاهانە</div>
                            <div class="theme-price">15 $</div>
                        </div>
                    </div>
                    <input type="hidden" id="selected-theme" value="default">
                    <button class="btn" onclick="saveTheme()">بەکارهێنانی دیزاینی هەڵبژاردراو 💎</button>
                </div>
            </div>
            <script>
                const urlParams = new URLSearchParams(window.location.search);
                const username = urlParams.get('user');
                if(!username) window.location.href = '/';
                function goBack() { window.location.href = '/dashboard?user=' + username; }
                async function loadCurrentTheme() {
                    const res = await fetch('/api/get-bio/' + username);
                    const data = await res.json();
                    if(data.success && data.profile) {
                        selectTheme(data.profile.theme || 'default');
                    }
                }
                loadCurrentTheme();
                function selectTheme(themeName) {
                    document.getElementById('selected-theme').value = themeName;
                    document.querySelectorAll('.theme-option').forEach(el => el.classList.remove('selected'));
                    const selectedEl = document.getElementById('opt-' + themeName);
                    if(selectedEl) selectedEl.classList.add('selected');
                }
                async function saveTheme() {
                    const theme = document.getElementById('selected-theme').value;
                    const res = await fetch('/api/save-theme', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ username, theme })
                    });
                    const data = await res.json();
                    if(data.success) {
                        alert('دیزاینەکە بە سەرکەوتوویی گۆڕدرا!');
                        window.location.href = '/dashboard?user=' + username;
                    } else {
                        alert(data.message);
                    }
                }
            </script>
        </body>
        </html>
    `);
});

app.get('/balance', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html lang="ckb" dir="rtl">
        <head>
            <meta charset="UTF-8">
            <title>KurdBio - باڵانس و پارەدان</title>
            <style>
                * { box-sizing: border-box; margin: 0; padding: 0; font-family: system-ui, sans-serif; }
                body { background: #0d1117; color: #fff; display: flex; justify-content: center; min-height: 100vh; padding: 20px; }
                .container { width: 100%; max-width: 450px; }
                .card { background: #161b22; border: 1px solid #2ea043; border-radius: 20px; padding: 25px; margin-bottom: 20px; box-shadow: 0 10px 30px rgba(0,0,0,0.5); text-align: center; }
                h2 { color: #2ea043; margin-bottom: 15px; font-size: 20px; }
                input { width: 100%; padding: 12px; background: #0d1117; border: 1px solid #30363d; color: #fff; border-radius: 10px; outline: none; margin: 15px 0; text-align: center; font-size: 18px; }
                .btn { width: 100%; padding: 14px; background: #238636; color: #fff; border: none; border-radius: 10px; font-weight: bold; font-size: 16px; cursor: pointer; }
                .back-link { display: inline-block; margin-bottom: 15px; color: #8b949e; text-decoration: none; font-size: 14px; }
                .back-link:hover { color: #fff; }
            </style>
        </head>
        <body>
            <div class="container">
                <a href="#" onclick="goBack()" class="back-link">← گەڕانەوە بۆ داشبۆرد</a>
                <div class="card">
                    <h2>💳 بەڕێوەبردنی باڵانس</h2>
                    <div style="font-size: 14px; color: #8b949e;">باڵانسی ئێستای هەژمارەکەت:</div>
                    <div id="balance-amount" style="font-size: 32px; font-weight: bold; color: #2ea043; margin: 10px 0;">0 $</div>
                    <label style="font-size: 13px; color: #8b949e; display: block; text-align: right;">بڕی پارە بۆ زیادکردن ($)</label>
                    <input type="number" id="topup-amount" value="10" min="1">
                    <button class="btn" onclick="addBalance()">زیادکردنی باڵانس 💳</button>
                </div>
            </div>
            <script>
                const urlParams = new URLSearchParams(window.location.search);
                const username = urlParams.get('user');
                if(!username) window.location.href = '/';
                function goBack() { window.location.href = '/dashboard?user=' + username; }
                async function fetchBalance() {
                    const res = await fetch('/api/get-bio/' + username);
                    const data = await res.json();
                    if(data.success) {
                        document.getElementById('balance-amount').innerText = (data.balance || 0) + ' $';
                    }
                }
                fetchBalance();
                async function addBalance() {
                    const amount = Number(document.getElementById('topup-amount').value);
                    if(!amount || amount <= 0) return alert('تکایە بڕێکی دروست بنووسە!');
                    const res = await fetch('/api/add-balance', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ username, amount })
                    });
                    const data = await res.json();
                    if(data.success) {
                        document.getElementById('balance-amount').innerText = data.newBalance + ' $';
                        alert('باڵانسەکەت بە سەرکەوتوویی زیادکرا!');
                    }
                }
            </script>
        </body>
        </html>
    `);
});

app.get('/profile', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html lang="ckb" dir="rtl">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>KurdBio - پڕۆفایل</title>
            <style>
                * { box-sizing: border-box; margin: 0; padding: 0; font-family: system-ui, sans-serif; }
                body { min-height: 100vh; display: flex; justify-content: center; align-items: center; padding: 10px; transition: 0.3s; }
                body.default { background: linear-gradient(135deg, #0d1117, #161b22); color: #fff; }
                body.neon { background: #050505; color: #00f2fe; }
                body.cyberpunk { background: #ffe600; color: #000; }
                body.gold { background: #1a1a1a; color: #ffd700; }
                .card { background: rgba(22, 27, 34, 0.9); backdrop-filter: blur(10px); padding: 30px 15px; border-radius: 20px; border: 1px solid #30363d; width: 100%; max-width: 420px; min-height: 90vh; display: flex; flex-direction: column; justify-content: center; align-items: center; box-sizing: border-box; box-shadow: 0 20px 40px rgba(0,0,0,0.5); }
                body.neon .card { border: 2px solid #00f2fe; box-shadow: 0 0 25px rgba(0, 242, 254, 0.5); }
                body.cyberpunk .card { background: #000; border: 3px solid #ff0050; color: #fff; }
                body.gold .card { border: 2px solid #ffd700; box-shadow: 0 0 25px rgba(255, 215, 0, 0.3); }
                .avatar-img { width: 90px; height: 90px; border-radius: 50%; object-fit: cover; margin-bottom: 15px; border: 3px solid #00f2fe; display: none; }
                body.neon .avatar-img { border-color: #00f2fe; }
                body.cyberpunk .avatar-img { border-color: #ff0050; }
                body.gold .avatar-img { border-color: #ffd700; }
                h1 { font-size: 22px; margin-bottom: 6px; text-align: center; }
                p { font-size: 14px; margin-bottom: 25px; opacity: 0.8; text-align: center; }
                .links-container { width: 100%; display: flex; flex-direction: column; gap: 12px; }
                .bio-btn { display: flex; align-items: center; justify-content: center; gap: 10px; width: 100%; padding: 14px; background: #21262d; color: #fff; text-decoration: none; border-radius: 14px; border: 1px solid #30363d; font-weight: bold; font-size: 15px; transition: 0.2s; }
                body.cyberpunk .bio-btn { background: #ff0050; color: #fff; border: none; }
                .bio-btn:hover { transform: translateY(-2px); opacity: 0.9; }
                .footer { margin-top: 30px; font-size: 12px; opacity: 0.5; text-align: center; }
                .footer span { font-weight: bold; }
                @media (max-width: 480px) {
                    body { padding: 0; }
                    .card { width: 100%; min-height: 100vh; border-radius: 0; border: none; padding: 20px 15px; justify-content: space-around; }
                }
            </style>
        </head>
        <body id="body-tag">
            <div class="card">
                <div>
                    <img id="p-avatar" class="avatar-img" src="" alt="Profile Image">
                    <h1 id="p-name">بارکردن...</h1>
                    <p id="p-bio"></p>
                </div>
                <div style="width: 100%;">
                    <div id="p-socials" class="links-container" style="margin-bottom: 12px;"></div>
                    <div id="p-links" class="links-container"></div>
                </div>
                <div class="footer">دروستکراوە لە <span>Kurd Bio</span> 🚀</div>
            </div>
            <script>
                const urlParams = new URLSearchParams(window.location.search);
                const username = urlParams.get('user');
                async function loadProfile() {
                    if(!username) return alert('بەکارهێنەر نییە!');
                    const res = await fetch('/api/get-bio/' + username);
                    const data = await res.json();
                    if(data.success) {
                        const p = data.profile;
                        document.getElementById('p-name').innerText = p.name || username;
                        document.getElementById('p-bio').innerText = p.bio || '';
                        if(p.avatar) {
                            const imgEl = document.getElementById('p-avatar');
                            imgEl.src = p.avatar;
                            imgEl.style.display = 'block';
                        }
                        if(p.theme) document.getElementById('body-tag').className = p.theme;
                        const socialsBox = document.getElementById('p-socials');
                        const s = p.socials;
                        if(s && s.whatsapp) socialsBox.innerHTML += '<a href="https://wa.me/' + s.whatsapp + '" target="_blank" class="bio-btn">🟢 واتسئەپ - WhatsApp</a>';
                        if(s && s.snapchat) socialsBox.innerHTML += '<a href="https://www.snapchat.com/add/' + s.snapchat + '" target="_blank" class="bio-btn">👻 سناپچات - Snapchat</a>';
                        if(s && s.telegram) socialsBox.innerHTML += '<a href="https://t.me/' + s.telegram.replace('@','') + '" target="_blank" class="bio-btn">✈️ تێلیگرام - Telegram</a>';
                        if(s && s.facebook) socialsBox.innerHTML += '<a href="' + s.facebook + '" target="_blank" class="bio-btn">📘 فەیسبووک - Facebook</a>';
                        const linksBox = document.getElementById('p-links');
                        if(p.links) {
                            p.links.forEach(item => {
                                linksBox.innerHTML += '<a href="' + item.url + '" target="_blank" class="bio-btn">🔗 ' + item.title + '</a>';
                            });
                        }
                    } else {
                        alert('پڕۆفایل نەدۆزرایەوە!');
                    }
                }
                loadProfile();
            </script>
        </body>
        </html>
    `);
});

app.post('/api/register', (req, res) => {
    const { username, password } = req.body;
    if(users[username]) return res.json({ success: false, message: 'ئەم یوزەرنەمە پێشتر تۆمار کراوە!' });
    users[username] = { password, balance: 0 };
    userProfiles[username] = { name: username, bio: '', avatar: '', theme: 'default', socials: {}, links: [] };
    res.json({ success: true });
});

app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    if(!users[username]) return res.json({ success: false, message: 'ئەم یوزەرنەمە بوونی نییە!' });
    if(users[username].password !== password) return res.json({ success: false, message: 'وشەی تێپەڕ هەڵەیە!' });
    res.json({ success: true });
});

app.post('/api/add-balance', (req, res) => {
    const { username, amount } = req.body;
    if(users[username]) {
        users[username].balance += amount;
        res.json({ success: true, newBalance: users[username].balance });
    } else {
        res.json({ success: false });
    }
});

app.post('/api/save-theme', (req, res) => {
    const { username, theme } = req.body;
    let themeCost = 0;
    if(theme === 'neon') themeCost = 5;
    if(theme === 'cyberpunk') themeCost = 10;
    if(theme === 'gold') themeCost = 15;

    if(!users[username]) users[username] = { balance: 0 };

    let currentTheme = userProfiles[username] ? userProfiles[username].theme : 'default';
    if(themeCost > 0 && currentTheme !== theme) {
        if(users[username].balance < themeCost) {
            return res.json({ success: false, message: 'باڵانسەکەت بەش ناکات بۆ کڕینی ئەم دیزاینە VIPـە!' });
        }
        users[username].balance -= themeCost;
    }

    if(!userProfiles[username]) {
        userProfiles[username] = { name: username, bio: '', avatar: '', theme: 'default', socials: {}, links: [] };
    }
    userProfiles[username].theme = theme;
    res.json({ success: true });
});

app.post('/api/save-bio', (req, res) => {
    const { username, name, bio, avatar, socials, links } = req.body;
    if(!userProfiles[username]) {
        userProfiles[username] = { theme: 'default' };
    }
    userProfiles[username].name = name;
    userProfiles[username].bio = bio;
    userProfiles[username].avatar = avatar;
    userProfiles[username].socials = socials;
    userProfiles[username].links = links;
    res.json({ success: true });
});

app.get('/api/get-bio/:username', (req, res) => {
    const username = req.params.username;
    if(!userProfiles[username]) {
        userProfiles[username] = { name: username, bio: '', avatar: '', theme: 'default', socials: {}, links: [] };
    }
    if(!users[username]) {
        users[username] = { balance: 0 };
    }
    res.json({ 
        success: true, 
        profile: userProfiles[username], 
        balance: users[username].balance 
    });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`🚀 KurdBio Server running on port ${PORT}`));