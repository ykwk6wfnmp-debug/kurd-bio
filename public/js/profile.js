/* Public profile renderer.
   Everything here is built with createElement + textContent and every URL is
   checked to be http(s) before it reaches the DOM — no innerHTML, ever. */
(function () {
    'use strict';
    var KB = window.KB;
    var username = KB.pageData().username || '';

    var SVG_NS = 'http://www.w3.org/2000/svg';
    var ICONS = {
        whatsapp: {
            fill: '#25d366',
            d: 'M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z'
        },
        snapchat: {
            fill: '#fffc00',
            d: 'M12.162 2C8.75 2 5.8 4.6 5.8 8.1c0 2.2 1.1 3.9 2.5 5.1-.9.7-1.5 1.7-1.5 2.9 0 1.2.6 2.3 1.6 3-.4.3-.8.7-1.2 1.2-.5.5-.7 1.2-.6 1.9.1.7.6 1.3 1.3 1.5 1.2.4 2.8.5 4.3.5s3.1-.1 4.3-.5c.7-.2 1.2-.8 1.3-1.5.1-.7-.1-1.4-.6-1.9-.4-.5-.8-.9-1.2-1.2 1-.7 1.6-1.8 1.6-3 0-1.2-.6-2.2-1.5-2.9 1.4-1.2 2.5-2.9 2.5-5.1 0-3.5-2.95-6.1-6.362-6.1z'
        },
        telegram: {
            fill: '#0088cc',
            d: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69.01-.03.01-.14-.07-.2-.08-.06-.19-.04-.27-.02-.12.03-1.99 1.27-5.62 3.72-.53.36-1.01.54-1.44.53-.47-.02-1.37-.26-2.03-.48-.82-.27-1.47-.42-1.42-.88.03-.25.38-.51 1.06-.78 4.16-1.82 6.94-3.02 8.34-3.61 3.97-1.68 4.79-1.97 5.33-1.98.12 0 .39.03.56.17.14.12.18.28.2.4-.02.07-.02.24-.04.38z'
        },
        facebook: {
            fill: '#1877f2',
            d: 'M22.675 0h-21.35c-.732 0-1.325.593-1.325 1.325v21.351c0 .731.593 1.324 1.325 1.324h11.495v-9.294h-3.128v-3.622h3.128v-2.671c0-3.1 1.893-4.788 4.659-4.788 1.325 0 2.463.099 2.795.143v3.24l-1.918.001c-1.504 0-1.795.715-1.795 1.763v2.313h3.587l-.467 3.622h-3.12v9.293h6.116c.73 0 1.323-.593 1.323-1.325v-21.35c0-.732-.593-1.325-1.325-1.325z'
        }
    };

    function svgIcon(name) {
        var spec = ICONS[name];
        var svg = document.createElementNS(SVG_NS, 'svg');
        svg.setAttribute('viewBox', '0 0 24 24');
        svg.setAttribute('fill', spec.fill);
        svg.setAttribute('aria-hidden', 'true');
        var path = document.createElementNS(SVG_NS, 'path');
        path.setAttribute('d', spec.d);
        svg.appendChild(path);
        return svg;
    }

    /* Rejects javascript:, data:, vbscript: and anything else non-web. */
    function safeUrl(value) {
        try {
            var url = new URL(String(value), window.location.origin);
            return url.protocol === 'http:' || url.protocol === 'https:' ? url.href : null;
        } catch (e) {
            return null;
        }
    }

    function linkButton(href, label, className, icon) {
        var url = safeUrl(href);
        if (!url) return null;
        var anchor = KB.el('a', {
            href: url,
            target: '_blank',
            rel: 'noopener noreferrer nofollow',
            class: 'bio-btn' + (className ? ' ' + className : '')
        });
        if (icon) anchor.appendChild(svgIcon(icon));
        anchor.appendChild(document.createTextNode(label));
        return anchor;
    }

    /* The theme is a token set, applied as CSS custom properties so the
       stylesheet owns the layout and the theme owns only the look. */
    function applyTheme(theme) {
        if (!theme) return;
        var root = document.body;
        var vars = {
            '--t-bg': theme.bg,
            '--t-bg-image': theme.bgImage || 'none',
            '--t-surface': theme.surface,
            '--t-border': theme.surfaceBorder,
            '--t-border-width': (theme.borderWidth || 1) + 'px',
            '--t-text': theme.text,
            '--t-muted': theme.muted,
            '--t-accent': theme.accent,
            '--t-accent2': theme.accent2,
            '--t-radius': (theme.radius || 20) + 'px',
            '--t-shadow': theme.shadow || 'none',
            '--t-glow': theme.glow || 'none',
            '--t-blur': (theme.blur || 0) + 'px',
            '--t-weight': theme.fontWeight || 700,
            '--t-spacing': theme.letterSpacing || 'normal'
        };
        Object.keys(vars).forEach(function (key) {
            root.style.setProperty(key, String(vars[key]));
        });

        // Button geometry (outline / glass / sharp / hard) is a CSS concern.
        root.setAttribute('data-btn', theme.btnStyle || 'solid');
        if (theme.animated) {
            root.classList.add('animated');
            root.style.backgroundSize = '160% 160%';
        }

        var meta = document.querySelector('meta[name="theme-color"]');
        if (meta) meta.setAttribute('content', theme.bg);
    }

    function render(profile) {
        document.getElementById('p-name').textContent = profile.name || username;
        document.getElementById('p-bio').textContent = profile.bio || '';
        document.title = (profile.name || username) + ' | KurdBio';

        if (profile.avatar && /^data:image\//.test(profile.avatar)) {
            var img = document.getElementById('p-avatar');
            img.src = profile.avatar;
            img.alt = profile.name || username;
            img.style.display = 'block';
        }

        applyTheme(profile.theme);

        var socialsBox = document.getElementById('p-socials');
        var s = profile.socials || {};
        var socials = [
            s.whatsapp && linkButton('https://wa.me/' + encodeURIComponent(s.whatsapp), 'واتسئەپ', 'btn-whatsapp', 'whatsapp'),
            s.snapchat && linkButton('https://www.snapchat.com/add/' + encodeURIComponent(s.snapchat), 'سناپچات', 'btn-snapchat', 'snapchat'),
            s.telegram && linkButton('https://t.me/' + encodeURIComponent(s.telegram), 'تێلیگرام', 'btn-telegram', 'telegram'),
            s.facebook && linkButton(s.facebook, 'فەیسبووک', 'btn-facebook', 'facebook')
        ];
        socials.forEach(function (node) { if (node) socialsBox.appendChild(node); });

        var linksBox = document.getElementById('p-links');
        (profile.links || []).forEach(function (item) {
            var node = linkButton(item.url, '🔗 ' + item.title, '', null);
            if (node) linksBox.appendChild(node);
        });

        // Buttons fade in one after another rather than all at once.
        var buttons = document.querySelectorAll('.bio-btn');
        for (var i = 0; i < buttons.length; i += 1) {
            buttons[i].style.animationDelay = 80 + i * 55 + 'ms';
        }
    }

    (async function load() {
        var data = await KB.api('/api/public-profile/' + encodeURIComponent(username));
        if (!data.success) {
            document.getElementById('p-name').textContent = 'پڕۆفایل نەدۆزرایەوە!';
            return;
        }
        render(data.profile);
    })();
})();
