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
                <div class="footer">دروستکراوە بە <span>KurdBio</span> 🚀</div>
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