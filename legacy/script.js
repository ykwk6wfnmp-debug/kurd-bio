// 🌐 دیاریکردنی ئادرەسی سەرڤەر
const API_URL = 'http://localhost:5000';

// 🔄 گۆڕینی لاپەڕەکان لە ناو دێشبۆرددا
function showPage(pageId) {
    const pages = document.querySelectorAll('.page-section');
    pages.forEach(page => page.style.display = 'none');
    
    const targetPage = document.getElementById(pageId);
    if (targetPage) {
        targetPage.style.display = 'block';
    }

    // ئەگەر لاپەڕەی کەمپەینەکان بوو، لیستەکەیان نوێ بکەرەوە
    if (pageId === 'campaignsPage') {
        loadCampaigns();
    }
}

// 🔐 بەشی چوونەژوورەوە و دەرچوون
document.getElementById('authForm')?.addEventListener('submit', function(e) {
    e.preventDefault();
    const email = document.getElementById('email').value;
    
    localStorage.setItem('userEmail', email);
    document.getElementById('welcomeUserName').innerText = email;
    document.getElementById('profEmail').innerText = email;
    
    document.getElementById('authSection').style.display = 'none';
    document.getElementById('dashboardSection').style.display = 'block';
    showPage('homePage');
});

function logout() {
    localStorage.removeItem('userEmail');
    document.getElementById('authSection').style.display = 'flex';
    document.getElementById('dashboardSection').style.display = 'none';
}

// 🚀 ناردن و دروستکردنی سپۆنسەری کامڵ لەسەر فەیسبووک
document.getElementById('adForm')?.addEventListener('submit', async function(e) {
    e.preventDefault();

    const submitBtn = e.target.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.innerText = "لە پرۆسەی دروستکردنی سپۆنسەردایە...";

    // کۆکردنەوەی شارە هەڵبژێردراوەکان
    const selectedCities = Array.from(document.querySelectorAll('input[name="city"]:checked')).map(cb => cb.value);

    const payload = {
        userEmail: localStorage.getItem('userEmail') || 'guest@example.com',
        name: document.getElementById('campaignName').value,
        adGoal: document.getElementById('adGoal').value,
        mediaLink: document.getElementById('mediaLink').value,
        text: document.getElementById('adText').value,
        targetGender: document.getElementById('targetGender').value,
        minAge: document.getElementById('minAge').value,
        maxAge: document.getElementById('maxAge').value,
        cities: selectedCities,
        startDateTime: document.getElementById('startDateTime').value,
        durationDays: document.getElementById('durationDays').value,
        activeStartTime: document.getElementById('activeStartTime').value,
        activeEndTime: document.getElementById('activeEndTime').value,
        budget: document.getElementById('budget').value
    };

    try {
        const response = await fetch(`${API_URL}/api/create-facebook-ad`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const result = await response.json();

        if (result.success) {
            alert("🎉 " + result.message);
            document.getElementById('adForm').reset();
            showPage('campaignsPage'); // گوێستنەوە بۆ لاپەڕەی سپۆنسەرەکانم
        } else {
            alert("❌ کێشەیەک ڕوویدا: " + JSON.stringify(result.error));
        }
    } catch (err) {
        alert("❌ پەیوەندی بە سەرڤەرەوە پچڕا! دڵنیاببەوه node server.js کار دەکات.");
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerText = "ناردن و لەسەرکارخستنی کەمپەین";
    }
});

// 📋 هێنانی هەموو سپۆنسەرەکان و نیشاندانی دوگمەی کوژاندنەوە/پێکردنەوە
async function loadCampaigns() {
    const listContainer = document.getElementById('campaignsList');
    listContainer.innerHTML = "<p>لە پرۆسەی هێنانی زانیارییەکاندا...</p>";

    try {
        const res = await fetch(`${API_URL}/api/my-campaigns`);
        const data = await res.json();

        if (!data.campaigns || data.campaigns.length === 0) {
            listContainer.innerHTML = "<p>هیچ کەمپەین و سپۆنسەرێکت دانەناوە.</p>";
            return;
        }

        listContainer.innerHTML = "";
        data.campaigns.forEach(c => {
            const card = document.createElement('div');
            card.className = 'campaign-card';

            const isPageActive = c.status === 'ACTIVE';
            const statusBadge = isPageActive 
                ? '<span style="color:#34c759; font-weight:bold;">● چالاکە (ACTIVE)</span>' 
                : '<span style="color:#ff3b30; font-weight:bold;">● ڕاوەستێنراوە (PAUSED)</span>';

            const actionBtn = isPageActive
                ? `<button onclick="toggleAdStatus('${c.campaignId}', 'pause')" class="submit-btn" style="background:#ff3b30; margin-top:10px; width:auto; padding:8px 15px;">⏸️ کوژاندنەوەی سپۆنسەر</button>`
                : `<button onclick="toggleAdStatus('${c.campaignId}', 'resume')" class="submit-btn" style="background:#34c759; margin-top:10px; width:auto; padding:8px 15px;">▶️ پێکردنەوەی سپۆنسەر</button>`;

            card.innerHTML = `
                <h3>${c.name}</h3>
                <p><strong>حاڵەت:</strong> ${statusBadge}</p>
                <p><strong>بوودجە:</strong> $${c.budget}</p>
                <p><strong>کۆدی کەمپەین (ID):</strong> <small>${c.campaignId}</small></p>
                ${actionBtn}
            `;
            listContainer.appendChild(card);
        });

    } catch (err) {
        listContainer.innerHTML = "<p style='color:red;'>کێشەیەک لە هێنانی سپۆنسەرەکان هەبوو.</p>";
    }
}

// ⏸️ ▶️ گوژاندنەوە یان پێکردنەوەی سپۆنسەر
async function toggleAdStatus(campaignId, action) {
    const endpoint = action === 'pause' ? '/api/pause-ad' : '/api/resume-ad';
    try {
        const res = await fetch(`${API_URL}${endpoint}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ campaignId })
        });
        const data = await res.json();
        alert(data.message);
        loadCampaigns(); // نوێکردنەوەی لیستەکە
    } catch (err) {
        alert("کێشەیەک ڕوویدا!");
    }
}