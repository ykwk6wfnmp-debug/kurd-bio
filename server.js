const express = require('express');
const cors = require('cors');

const app = express();
app.use(express.json({ limit: '10mb' }));
app.use(cors());

let users = {}; 
let userProfiles = {}; 
let bannedUsers = {}; 

app.get('/', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html lang="ckb" dir="rtl">
        <head>
            <meta charset="UTF-8">
            <title>KurdBio - چوونەژوورەوە</title>
            <style>
                * { box-sizing: border-box; margin: 0; padding: 0; font-family: system-ui, sans-serif; }
                body { background: #07090e; color: #fff; display: flex; justify-content: center; align-items: center; min-height: 100vh; padding: 20px; }
                .card { background: rgba(22, 27, 34, 0.75); backdrop-filter: blur(20px); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 24px; padding: 40px 30px; width: 100%; max-width: 400px; box-shadow: 0 25px 50px rgba(0,0,0,0.6); text-align: center; }
                h2 { color: #fff; margin-bottom: 25px; font-size: 24px; font-weight: 800; background: linear-gradient(90deg, #ff0050, #00f2fe); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
                label { font-size: 13px; color: #8b949e; display: block; text-align: right; margin-top: 15px; margin-bottom: 8px; font-weight: 500; }
                input { width: 100%; padding: 14px; background: rgba(13, 17, 23, 0.8); border: 1px solid #30363d; color: #fff; border-radius: 12px; outline: none; transition: 0.3s; }
                input:focus { border-color: #00f2fe; box-shadow: 0 0 10px rgba(0,242,254,0.2); }
                .btn { width: 100%; padding: 14px; background: linear-gradient(135deg, #ff0050, #00f2fe); color: #fff; border: none; border-radius: 12px; font-weight: bold; font-size: 16px; cursor: pointer; margin-top: 25px; transition: 0.3s; box-shadow: 0 10px 20px rgba(255,0,80,0.3); }
                .btn:hover { opacity: 0.9; transform: translateY(-2px); }
                .toggle-link { margin-top: 20px; font-size: 13px; color: #8b949e; cursor: pointer; }
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

// ئەدمن پەنەل
app.get('/admin', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html lang="ckb" dir="rtl">
        <head>
            <meta charset="UTF-8">
            <title>KurdBio - بەڕێوەبەری ئەدمن</title>
            <style>
                * { box-sizing: border-box; margin: 0; padding: 0; font-family: system-ui, sans-serif; }
                body { background: #07090e; color: #fff; padding: 20px; display: flex; justify-content: center; }
                .container { width: 100%; max-width: 900px; }
                h1 { color: #00f2fe; margin-bottom: 20px; font-size: 24px; text-align: center; font-weight: 800; }
                .card { background: rgba(22, 27, 34, 0.7); backdrop-filter: blur(15px); border: 1px solid rgba(255,255,255,0.08); border-radius: 20px; padding: 25px; margin-bottom: 20px; box-shadow: 0 20px 40px rgba(0,0,0,0.5); }
                table { width: 100%; border-collapse: collapse; margin-top: 15px; border-radius: 12px; overflow: hidden; }
                th, td { border: 1px solid #30363d; padding: 14px; text-align: center; font-size: 14px; }
                th { background: #161b22; color: #00f2fe; font-weight: 600; }
                .ban-btn { background: #da3633; border: none; color: white; padding: 8px 14px; border-radius: 8px; cursor: pointer; font-size: 12px; font-weight: bold; transition: 0.2s; }
                .ban-btn:hover { background: #b31d1d; }
                .unban-btn { background: #2ea043; border: none; color: white; padding: 8px 14px; border-radius: 8px; cursor: pointer; font-size: 12px; font-weight: bold; transition: 0.2s; }
                .unban-btn:hover { background: #238636; }
                .back-home { display: inline-block; margin-bottom: 20px; color: #8b949e; text-decoration: none; font-size: 14px; font-weight: 500; }
                .back-home:hover { color: #fff; }
            </style>
        </head>
        <body>
            <div class="container">
                <a href="/" class="back-home">← چوونەدەرەوە لە ئەدمن</a>
                <h1>👑 پەنەلی کۆنترۆڵی ئەدمن</h1>
                <div class="card">
                    <h2 style="font-size: 18px; color: #2ea043; margin-bottom: 10px;">📋 لیستی هەموو بەکارهێنەرە چالاکەکان</h2>
                    <table id="users-table">
                        <tr><th>ناوی بەکارهێنەر</th><th>وشەی تێپەڕ</th><th>باڵانس ($)</th><th>کردار</th></tr>
                    </table>
                </div>
                <div class="card">
                    <h2 style="font-size: 18px; color: #da3633; margin-bottom: 10px;">🚫 لیستی بەکارهێنەرە بانکراوەکان</h2>
                    <table id="banned-table">
                        <tr><th>ناوی بەکارهێنەر</th><th>کردار</th></tr>
                    </table>
                </div>
            </div>
            <script>
                async function loadAdminData() {
                    const res = await fetch('/api/admin/data');
                    const data = await res.json();
                    if(data.success) {
                        const table = document.getElementById('users-table');
                        table.innerHTML = '<tr><th>ناوی بەکارهێنەر</th><th>وشەی تێپەڕ</th><th>باڵانس ($)</th><th>کردار</th></tr>';
                        for(let user in data.users) {
                            table.innerHTML += '<tr><td>' + user + '</td><td>' + data.users[user].password + '</td><td>' + data.users[user].balance + ' $</td><td><button class="ban-btn" onclick="banUser(\\'' + user + '\\')">بانکردن</button></td></tr>';
                        }
                        const bannedTable = document.getElementById('banned-table');
                        bannedTable.innerHTML = '<tr><th>ناوی بەکارهێنەر</th><th>کردار</th></tr>';
                        for(let bUser in data.banned) {
                            bannedTable.innerHTML += '<tr><td>' + bUser + '</td><td><button class="unban-btn" onclick="unbanUser(\\'' + bUser + '\\')">لادانی بان</button></td></tr>';
                        }
                    }
                }
                loadAdminData();
                async function banUser(username) {
                    if(!confirm('دڵنیایت لە بانکردنی ئەم بەکارهێنەرە؟')) return;
                    await fetch('/api/admin/ban', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username }) });
                    loadAdminData();
                }
                async function unbanUser(username) {
                    await fetch('/api/admin/unban', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username }) });
                    loadAdminData();
                }
            </script>
        </body>
        </html>
    `);
});

app.get('/api/admin/data', (req, res) => {
    res.json({ success: true, users, banned: bannedUsers });
});

app.post('/api/admin/ban', (req, res) => {
    const { username } = req.body;
    if(users[username]) {
        bannedUsers[username] = users[username];
        delete users[username];
        delete userProfiles[username];
        res.json({ success: true });
    } else { res.json({ success: false }); }
});

app.post('/api/admin/unban', (req, res) => {
    const { username } = req.body;
    if(bannedUsers[username]) {
        users[username] = bannedUsers[username];
        userProfiles[username] = { name: username, bio: '', avatar: '', theme: 'default', socials: {}, links: [] };
        delete bannedUsers[username];
        res.json({ success: true });
    } else { res.json({ success: false }); }
});

app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    if(bannedUsers[username]) return res.json({ success: false, message: 'هەژمارەکەت بانکراوە!' });
    if(!users[username]) return res.json({ success: false, message: 'ئەم یوزەرنەمە بوونی نییە!' });
    if(users[username].password !== password) return res.json({ success: false, message: 'وشەی تێپەڕ هەڵەیە!' });
    res.json({ success: true });
});

app.post('/api/register', (req, res) => {
    const { username, password } = req.body;
    if(bannedUsers[username] || users[username]) return res.json({ success: false, message: 'ئەم یوزەرنەمەیە بەردەست نییە!' });
    users[username] = { password, balance: 0 };
    userProfiles[username] = { name: username, bio: '', avatar: '', theme: 'default', socials: {}, links: [] };
    res.json({ success: true });
});

// داشبۆردی سەرەکی (لێرەدا دڵنیا بووینەوە کە لینکی پڕۆفایل ڕاستەوخۆ `/profile?user=` دەردەكات نەک `/themes`)
app.get('/dashboard', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html lang="ckb" dir="rtl">
        <head>
            <meta charset="UTF-8">
            <title>KurdBio - داشبۆرد</title>
            <style>
                * { box-sizing: border-box; margin: 0; padding: 0; font-family: system-ui, sans-serif; }
                body { background: #07090e; color: #fff; display: flex; justify-content: center; align-items: center; min-height: 100vh; padding: 20px; }
                .container { width: 100%; max-width: 440px; text-align: center; }
                .card { background: rgba(16, 22, 30, 0.85); backdrop-filter: blur(25px); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 28px; padding: 35px 25px; box-shadow: 0 25px 60px rgba(0,0,0,0.7); }
                h2 { color: #fff; margin-bottom: 22px; font-size: 22px; font-weight: 800; background: linear-gradient(90deg, #ff0050, #00f2fe); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
                .link-box { background: rgba(10, 14, 20, 0.9); border: 1px solid rgba(0, 242, 254, 0.3); padding: 16px; border-radius: 18px; margin-bottom: 24px; text-align: right; box-shadow: inset 0 2px 10px rgba(0,0,0,0.5); }
                .link-box label { font-size: 12px; color: #00f2fe; display: block; margin-bottom: 8px; font-weight: 700; }
                .link-input-group { display: flex; gap: 8px; }
                .link-input-group input { width: 100%; padding: 10px 12px; background: #161b22; border: 1px solid #30363d; color: #00f2fe; border-radius: 12px; font-size: 12px; outline: none; direction: ltr; text-align: left; }
                .copy-btn { background: linear-gradient(135deg, #00f2fe, #38bdf8); color: #000; border: none; padding: 0 16px; border-radius: 12px; font-weight: 800; cursor: pointer; font-size: 13px; transition: 0.3s; }
                .copy-btn:hover { transform: translateY(-1px); filter: brightness(1.1); }
                .menu-btn { display: flex; align-items: center; justify-content: center; gap: 10px; width: 100%; padding: 15px; margin: 12px 0; background: rgba(30, 38, 48, 0.6); color: #fff; text-decoration: none; border-radius: 16px; border: 1px solid rgba(255, 255, 255, 0.06); font-weight: 700; font-size: 15px; transition: all 0.3s ease; text-align: center; }
                .menu-btn:hover { border-color: #00f2fe; background: rgba(40, 50, 64, 0.9); transform: translateY(-3px); }
                .btn-themes { border-color: rgba(255,0,127,0.3); color: #ff75bc; }
                .btn-settings { border-color: rgba(31,111,235,0.3); color: #58a6ff; }
                .preview-btn { margin-top: 18px; background: linear-gradient(135deg, #ff0050, #00f2fe); border: none !important; color: white; cursor: pointer; font-weight: 800; box-shadow: 0 10px 25px rgba(255,0,80,0.35); }
                .btn-logout { border-color: rgba(218,54,51,0.25); color: #f85149; margin-top: 20px; background: rgba(218,54,51,0.05); }
                .btn-logout:hover { background: rgba(218,54,51,0.2); border-color: #da3633; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="card">
                    <h2>بەخێر هاتیت بۆ داشبۆردەکەت ✨</h2>
                    <div class="link-box">
                        <label>🔗 لینکی گشتی پڕۆفایلەکەت بۆ خەڵکی:</label>
                        <div class="link-input-group">
                            <input type="text" id="profile-link" readonly>
                            <button class="copy-btn" onclick="copyLink()">کۆپی</button>
                        </div>
                    </div>
                    <a href="#" onclick="openPage('editor')" class="menu-btn">⚙️ ڕێکخستنی پڕۆفایل و وێنە</a>
                    <a href="#" onclick="openPage('themes')" class="menu-btn btn-themes">🎨 هەڵبژاردنی لە نێوان ١٠٠ دیزاینی نایاب</a>
                    <a href="#" onclick="openPage('settings')" class="menu-btn btn-settings">🛠️ ڕێکخستنی هەژمار</a>
                    <button class="menu-btn preview-btn" onclick="openPage('profile')">بینینی پڕۆفایلەکەم 🚀</button>
                    <button class="menu-btn btn-logout" onclick="logout()">🚪 چوونە دەرەوە</button>
                </div>
            </div>
            <script>
                const urlParams = new URLSearchParams(window.location.search);
                const username = urlParams.get('user');
                if(!username) window.location.href = '/';
                
                // دڵنیابوونەوە لەوەی لینکی گشتی کاتێک کۆپی دەبێت تەنها `/profile?user=` دەبێت نەک `/themes`
                document.getElementById('profile-link').value = window.location.origin + '/profile?user=' + username;
                
                function copyLink() {
                    const copyText = document.getElementById('profile-link');
                    copyText.select();
                    navigator.clipboard.writeText(copyText.value);
                    alert('لینکی پڕۆفایلەکەت کۆپیکرا! 📋');
                }
                function openPage(type) {
                    if(type === 'editor') window.location.href = '/editor?user=' + username;
                    if(type === 'themes') window.location.href = '/themes?user=' + username;
                    if(type === 'settings') window.location.href = '/settings?user=' + username;
                    if(type === 'profile') window.location.href = '/profile?user=' + username;
                }
                function logout() {
                    if(confirm('دڵنیایت دەتەوێت لە هەژمارەکەت بچیتە دەرەوە؟')) window.location.href = '/';
                }
            </script>
        </body>
        </html>
    `);
});

// گالەری ١٠٠ دیزاینە ناوازەکە بە شێوازی تابلۆی خاوێن و بێهەڵە
app.get('/themes', (req, res) => {
    let cardsHtml = '';
    let icons = ['🌌', '✨', '🔥', '👑', '🌅', '💎', '🔮', '🌊', '🌸', '🚀', '❄️', '🏜️', '🌲', '❤️', '🌙', '🛡️', '🌠', '🍃', '🍂', '⚡', '🟢', '🔷', '🪄', '🌋', '🌴', '🍯', '💠', '🌷', '🪨', '🖤'];

    for(let i = 1; i <= 100; i++) {
        let themeId = 'theme_' + i;
        let icon = icons[(i - 1) % icons.length];
        cardsHtml += `
            <div class="theme-card" onclick="applyTheme('${themeId}')">
                <div class="mini-preview">${icon}</div>
                <div class="theme-title">دیزاینی ژمارە ${i}</div>
                <div class="theme-desc">شێوازی مۆدێرن و ناوازە</div>
                <button class="select-btn">هەڵبژاردن ✨</button>
            </div>
        `;
    }

    res.send(`
        <!DOCTYPE html>
        <html lang="ckb" dir="rtl">
        <head>
            <meta charset="UTF-8">
            <title>KurdBio - ١٠٠ دیزاینی نایاب</title>
            <style>
                * { box-sizing: border-box; margin: 0; padding: 0; font-family: system-ui, sans-serif; }
                body { background: #07090e; color: #fff; display: flex; justify-content: center; min-height: 100vh; padding: 25px; }
                .container { width: 100%; max-width: 950px; padding-bottom: 40px; }
                h2 { color: #fff; margin-bottom: 8px; font-size: 26px; font-weight: 800; text-align: center; background: linear-gradient(90deg, #ff007f, #00f2fe); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
                .subtitle { text-align: center; color: #8b949e; font-size: 14px; margin-bottom: 30px; }
                .themes-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)); gap: 16px; }
                .theme-card { background: rgba(22, 27, 34, 0.7); backdrop-filter: blur(15px); border: 2px solid rgba(255,255,255,0.08); border-radius: 18px; padding: 18px; text-align: center; cursor: pointer; transition: all 0.3s; }
                .theme-card:hover { transform: translateY(-5px); border-color: #00f2fe; box-shadow: 0 15px 30px rgba(0,242,254,0.15); }
                .mini-preview { width: 45px; height: 45px; border-radius: 50%; margin: 0 auto 10px auto; display: flex; align-items: center; justify-content: center; font-size: 16px; border: 2px solid rgba(255,255,255,0.2); background: #161b22; color: #00f2fe; }
                .theme-title { font-weight: 700; font-size: 13px; margin-bottom: 4px; color: #fff; }
                .theme-desc { font-size: 11px; color: #8b949e; margin-bottom: 12px; }
                .select-btn { background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1); color: #fff; padding: 8px 12px; border-radius: 10px; font-weight: 600; cursor: pointer; font-size: 12px; width: 100%; transition: 0.3s; }
                .theme-card:hover .select-btn { background: linear-gradient(135deg, #ff0050, #00f2fe); border-color: transparent; }
                .back-link { display: inline-block; margin-bottom: 20px; color: #8b949e; text-decoration: none; font-size: 14px; font-weight: 500; }
                .back-link:hover { color: #fff; }
                #toast { position: fixed; bottom: 30px; left: 50%; transform: translateX(-50%) translateY(100px); background: linear-gradient(135deg, #ff0050, #00f2fe); color: #fff; padding: 12px 25px; border-radius: 50px; font-weight: 700; font-size: 14px; box-shadow: 0 10px 30px rgba(0,0,0,0.5); transition: transform 0.4s; z-index: 1000; }
                #toast.show { transform: translateX(-50%) translateY(0); }
            </style>
        </head>
        <body>
            <div class="container">
                <a href="#" onclick="goBack()" class="back-link">← گەڕانەوە بۆ داشبۆرد</a>
                <h2>🎨 هەڵبژاردنی دیزاینە نایابەکان</h2>
                <div class="subtitle">لە نێوان بژاردەکاندا، شێوازی دڵخوازی خۆت هەڵبژێرە!</div>
                <div class="themes-grid">
                    ${cardsHtml}
                </div>
            </div>
            <div id="toast">دیزاینەکە گۆڕدرا بۆ سەرکەوتوویی! 🚀</div>
            <script>
                const urlParams = new URLSearchParams(window.location.search);
                const username = urlParams.get('user');
                if(!username) window.location.href = '/';
                function goBack() { window.location.href = '/dashboard?user=' + username; }
                async function applyTheme(themeName) {
                    const res = await fetch('/api/save-theme', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ username, theme: themeName })
                    });
                    const data = await res.json();
                    if(data.success) {
                        const toast = document.getElementById('toast');
                        toast.classList.add('show');
                        setTimeout(() => { window.location.href = '/dashboard?user=' + username; }, 1200);
                    }
                }
            </script>
        </body>
        </html>
    `);
});

// ڕێکخستنی هەژمار
app.get('/settings', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html lang="ckb" dir="rtl">
        <head>
            <meta charset="UTF-8">
            <title>KurdBio - ڕێکخستنی هەژمار</title>
            <style>
                * { box-sizing: border-box; margin: 0; padding: 0; font-family: system-ui, sans-serif; }
                body { background: #07090e; color: #fff; display: flex; justify-content: center; align-items: center; min-height: 100vh; padding: 20px; }
                .container { width: 100%; max-width: 420px; }
                .card { background: rgba(22, 27, 34, 0.75); backdrop-filter: blur(20px); border: 1px solid rgba(255,255,255,0.08); border-radius: 24px; padding: 30px; box-shadow: 0 25px 50px rgba(0,0,0,0.6); }
                h2 { color: #58a6ff; margin-bottom: 20px; font-size: 20px; text-align: center; font-weight: 800; }
                label { font-size: 13px; color: #8b949e; display: block; margin-top: 15px; margin-bottom: 6px; font-weight: 500; }
                input { width: 100%; padding: 12px; background: rgba(13, 17, 23, 0.8); border: 1px solid #30363d; color: #fff; border-radius: 12px; outline: none; }
                .btn { width: 100%; padding: 14px; background: #1f6feb; color: #fff; border: none; border-radius: 12px; font-weight: bold; font-size: 16px; cursor: pointer; margin-top: 25px; transition: 0.3s; }
                .btn:hover { background: #388bfd; transform: translateY(-2px); }
                .back-link { display: inline-block; margin-bottom: 15px; color: #8b949e; text-decoration: none; font-size: 14px; font-weight: 500; }
                .back-link:hover { color: #fff; }
            </style>
        </head>
        <body>
            <div class="container">
                <a href="#" onclick="goBack()" class="back-link">← گەڕانەوە بۆ داشبۆرد</a>
                <div class="card">
                    <h2>🛠️ گۆڕینی زانیارییەکانی هەژمار</h2>
                    <label>ناوی بەکارهێنەری نوێ</label>
                    <input type="text" id="new-username">
                    <label>وشەی تێپەڕی نوێ</label>
                    <input type="password" id="new-password" placeholder="••••••••">
                    <button class="btn" onclick="updateAccount()">نوێکردنەوە 💾</button>
                </div>
            </div>
            <script>
                const urlParams = new URLSearchParams(window.location.search);
                const username = urlParams.get('user');
                if(!username) window.location.href = '/';
                function goBack() { window.location.href = '/dashboard?user=' + username; }
                document.getElementById('new-username').value = username;
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

app.post('/api/update-account', (req, res) => {
    const { oldUsername, newUsername, newPassword } = req.body;
    if(oldUsername !== newUsername && users[newUsername]) return res.json({ success: false, message: 'ئەم یوزەرنەمەیە پێشتر هەیە!' });
    if(users[oldUsername]) {
        users[newUsername] = { password: newPassword, balance: users[oldUsername].balance };
        userProfiles[newUsername] = userProfiles[oldUsername];
        if(oldUsername !== newUsername) {
            delete users[oldUsername];
            delete userProfiles[oldUsername];
        }
        res.json({ success: true });
    } else { res.json({ success: false, message: 'هەڵە!' }); }
});

// ڕێکخستنی پڕۆفایل و وێنە
app.get('/editor', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html lang="ckb" dir="rtl">
        <head>
            <meta charset="UTF-8">
            <title>KurdBio - بەڕێوەبردنی پڕۆفایل</title>
            <style>
                * { box-sizing: border-box; margin: 0; padding: 0; font-family: system-ui, sans-serif; }
                body { background: #07090e; color: #fff; display: flex; justify-content: center; min-height: 100vh; padding: 20px; }
                .container { width: 100%; max-width: 500px; padding-bottom: 40px; }
                .card { background: rgba(22, 27, 34, 0.75); backdrop-filter: blur(20px); border: 1px solid rgba(255,255,255,0.08); border-radius: 24px; padding: 25px; margin-bottom: 20px; box-shadow: 0 20px 40px rgba(0,0,0,0.5); }
                h2 { color: #00f2fe; margin-bottom: 15px; font-size: 18px; font-weight: 700; }
                label { font-size: 13px; color: #8b949e; display: block; margin-top: 12px; margin-bottom: 6px; font-weight: 500; }
                input { width: 100%; padding: 12px; background: rgba(13, 17, 23, 0.8); border: 1px solid #30363d; color: #fff; border-radius: 12px; outline: none; }
                input[type="file"] { padding: 8px; cursor: pointer; }
                .btn { width: 100%; padding: 14px; background: linear-gradient(135deg, #ff0050, #00f2fe); color: #fff; border: none; border-radius: 12px; font-weight: bold; font-size: 16px; cursor: pointer; margin-top: 20px; transition: 0.3s; box-shadow: 0 10px 20px rgba(255,0,80,0.3); }
                .btn:hover { opacity: 0.9; transform: translateY(-2px); }
                .btn-add { background: #2ea043; box-shadow: 0 5px 15px rgba(46,160,67,0.3); }
                .link-item { background: #0d1117; border: 1px solid #30363d; padding: 12px; border-radius: 12px; margin-top: 10px; display: flex; justify-content: space-between; align-items: center; }
                .delete-btn { background: #da3633; border: none; color: white; padding: 6px 12px; border-radius: 8px; cursor: pointer; font-size: 12px; font-weight: 600; }
                .back-link { display: inline-block; margin-bottom: 15px; color: #8b949e; text-decoration: none; font-size: 14px; font-weight: 500; }
                .back-link:hover { color: #fff; }
                .preview-avatar { width: 75px; height: 75px; border-radius: 50%; object-fit: cover; margin-top: 12px; border: 2px solid #00f2fe; display: none; box-shadow: 0 0 15px rgba(0,242,254,0.3); }
            </style>
        </head>
        <body>
            <div class="container">
                <a href="#" onclick="goBack()" class="back-link">← گەڕانەوە بۆ داشبۆرد</a>
                <div class="card">
                    <h2>👤 زانیارییەکانی پڕۆفایل و وێنە</h2>
                    <label>ناوی تەواو یان پەیج</label>
                    <input type="text" id="name" placeholder="مەبەست عەلی">
                    <label>کورتە دەق (Bio)</label>
                    <input type="text" id="bio" placeholder="دروستکەری ناوەڕۆک 🎬">
                    <label>🖼️ وێنەی پڕۆفایل لە مۆبایلەوە</label>
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
                    <input type="text" id="linkTitle" placeholder="یووتیوب">
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
                    if(!title || !url) return alert('تکایە خانەکان پڕبکەرەوە!');
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
                        window.location.href = '/dashboard?user=' + username;
                    }
                }
            </script>
        </body>
        </html>
    `);
});

// پڕۆفایلی گشتی
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
                body { min-height: 100vh; display: flex; justify-content: center; align-items: center; padding: 10px; transition: 0.3s; background: #07090e; color: #fff; }
                
                .card { background: rgba(22, 27, 34, 0.85); backdrop-filter: blur(20px); padding: 35px 20px; border-radius: 24px; border: 1px solid rgba(255,255,255,0.08); width: 100%; max-width: 420px; min-height: 90vh; display: flex; flex-direction: column; justify-content: center; align-items: center; box-sizing: border-box; box-shadow: 0 25px 50px rgba(0,0,0,0.6); }
                .avatar-img { width: 95px; height: 95px; border-radius: 50%; object-fit: cover; margin-bottom: 15px; border: 3px solid #00f2fe; display: none; box-shadow: 0 0 20px rgba(0,242,254,0.4); }
                h1 { font-size: 24px; margin-bottom: 6px; text-align: center; font-weight: 800; }
                p { font-size: 14px; margin-bottom: 25px; opacity: 0.8; text-align: center; font-weight: 400; }
                
                .links-container { width: 100%; display: flex; flex-direction: column; gap: 12px; }
                .bio-btn { display: flex; align-items: center; gap: 14px; width: 100%; padding: 15px 20px; background: rgba(33, 38, 45, 0.9); color: #fff; text-decoration: none; border-radius: 16px; border: 1px solid rgba(255,255,255,0.08); font-weight: 700; font-size: 15px; transition: all 0.3s ease; box-shadow: 0 5px 15px rgba(0,0,0,0.2); }
                .bio-btn svg { width: 24px; height: 24px; flex-shrink: 0; }
                
                .btn-whatsapp { border-color: rgba(37,211,102,0.4); }
                .btn-whatsapp:hover { background: rgba(37,211,102,0.15); border-color: #25d366; }
                .btn-snapchat { border-color: rgba(255,252,0,0.4); }
                .btn-snapchat:hover { background: rgba(255,252,0,0.15); border-color: #fffc00; }
                .btn-telegram { border-color: rgba(0,136,204,0.4); }
                .btn-telegram:hover { background: rgba(0,136,204,0.15); border-color: #0088cc; }
                .btn-facebook { border-color: rgba(24,119,242,0.4); }
                .btn-facebook:hover { background: rgba(24,119,242,0.15); border-color: #1877f2; }

                .bio-btn:hover { transform: translateY(-3px); filter: brightness(1.1); box-shadow: 0 10px 25px rgba(0,0,0,0.4); }
                .footer { margin-top: 30px; font-size: 12px; opacity: 0.5; text-align: center; font-weight: 500; }
                .footer span { font-weight: bold; }
                @media (max-width: 480px) {
                    body { padding: 0; }
                    .card { width: 100%; min-height: 100vh; border-radius: 0; border: none; padding: 25px 15px; justify-content: space-around; }
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
                
                const dynamicColors = [
                    'linear-gradient(135deg, #07090e, #161b22)', '#050505', '#ffe600', '#1a1a1a', 
                    'linear-gradient(135deg, #ff7e5f, #feb47b)', '#064e3b', 'linear-gradient(135deg, #6b21a8, #c084fc)',
                    'linear-gradient(135deg, #1e3a8a, #93c5fd)', 'linear-gradient(135deg, #831843, #f472b6)', '#18181b',
                    '#0f172a', '#451a03', 'linear-gradient(135deg, #047857, #10b981)', 'linear-gradient(135deg, #be123c, #fb7185)',
                    'linear-gradient(135deg, #312e81, #818cf8)', '#27272a', 'linear-gradient(135deg, #4c1d95, #f43f5e)',
                    'linear-gradient(135deg, #065f46, #34d399)', 'linear-gradient(135deg, #78350f, #fde047)', 'linear-gradient(135deg, #581c87, #e879f9)'
                ];

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
                        
                        if(p.theme && p.theme.startsWith('theme_')) {
                            let index = parseInt(p.theme.replace('theme_', '')) - 1;
                            document.body.style.background = dynamicColors[index % dynamicColors.length];
                        } else {
                            document.body.style.background = 'linear-gradient(135deg, #07090e, #161b22)';
                        }

                        const socialsBox = document.getElementById('p-socials');
                        const s = p.socials;
                        
                        const waSvg = '<svg fill="#25d366" viewBox="0 0 24 24"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/></svg>';
                        const snapSvg = '<svg fill="#fffc00" viewBox="0 0 24 24"><path d="M12.162 2C8.75 2 5.8 4.6 5.8 8.1c0 2.2 1.1 3.9 2.5 5.1-.9.7-1.5 1.7-1.5 2.9 0 1.2.6 2.3 1.6 3-.4.3-.8.7-1.2 1.2-.5.5-.7 1.2-.6 1.9.1.7.6 1.3 1.3 1.5 1.2.4 2.8.5 4.3.5s3.1-.1 4.3-.5c.7-.2 1.2-.8 1.3-1.5.1-.7-.1-1.4-.6-1.9-.4-.5-.8-.9-1.2-1.2 1-.7 1.6-1.8 1.6-3 0-1.2-.6-2.2-1.5-2.9 1.4-1.2 2.5-2.9 2.5-5.1 0-3.5-2.95-6.1-6.362-6.1z"/></svg>';
                        const tgSvg = '<svg fill="#0088cc" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69.01-.03.01-.14-.07-.2-.08-.06-.19-.04-.27-.02-.12.03-1.99 1.27-5.62 3.72-.53.36-1.01.54-1.44.53-.47-.02-1.37-.26-2.03-.48-.82-.27-1.47-.42-1.42-.88.03-.25.38-.51 1.06-.78 4.16-1.82 6.94-3.02 8.34-3.61 3.97-1.68 4.79-1.97 5.33-1.98.12 0 .39.03.56.17.14.12.18.28.2.4-.02.07-.02.24-.04.38z"/></svg>';
                        const fbSvg = '<svg fill="#1877f2" viewBox="0 0 24 24"><path d="M22.675 0h-21.35c-.732 0-1.325.593-1.325 1.325v21.351c0 .731.593 1.324 1.325 1.324h11.495v-9.294h-3.128v-3.622h3.128v-2.671c0-3.1 1.893-4.788 4.659-4.788 1.325 0 2.463.099 2.795.143v3.24l-1.918.001c-1.504 0-1.795.715-1.795 1.763v2.313h3.587l-.467 3.622h-3.12v9.293h6.116c.73 0 1.323-.593 1.323-1.325v-21.35c0-.732-.593-1.325-1.325-1.325z"/></svg>';

                        if(s && s.whatsapp) socialsBox.innerHTML += '<a href="https://wa.me/' + s.whatsapp + '" target="_blank" class="bio-btn btn-whatsapp">' + waSvg + 'واتسئەپ</a>';
                        if(s && s.snapchat) socialsBox.innerHTML += '<a href="https://www.snapchat.com/add/' + s.snapchat + '" target="_blank" class="bio-btn btn-snapchat">' + snapSvg + 'سناپچات</a>';
                        if(s && s.telegram) socialsBox.innerHTML += '<a href="https://t.me/' + s.telegram.replace('@','') + '" target="_blank" class="bio-btn btn-telegram">' + tgSvg + 'تێلیگرام</a>';
                        if(s && s.facebook) socialsBox.innerHTML += '<a href="' + s.facebook + '" target="_blank" class="bio-btn btn-facebook">' + fbSvg + 'فەیسبووک</a>';
                        
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

app.post('/api/save-theme', (req, res) => {
    const { username, theme } = req.body;
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