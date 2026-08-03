/* Shared client helpers: toast notifications, JSON fetch, clipboard. */
(function () {
    'use strict';

    var toastTimer = null;

    function toast(message, isError) {
        var el = document.getElementById('toast');
        if (!el) return;
        el.textContent = message;
        el.classList.toggle('error', Boolean(isError));
        el.classList.add('show');
        clearTimeout(toastTimer);
        toastTimer = setTimeout(function () { el.classList.remove('show'); }, 2600);
    }

    /* Server-provided values arrive as a JSON island, never inlined into JS. */
    function pageData() {
        var node = document.getElementById('kb-data');
        if (!node) return {};
        try { return JSON.parse(node.textContent); } catch (e) { return {}; }
    }

    async function api(url, options) {
        var opts = Object.assign({ credentials: 'same-origin' }, options || {});
        if (opts.body !== undefined && typeof opts.body !== 'string') {
            opts.headers = Object.assign({ 'Content-Type': 'application/json' }, opts.headers || {});
            opts.body = JSON.stringify(opts.body);
        }
        var res;
        try {
            res = await fetch(url, opts);
        } catch (e) {
            return { success: false, message: 'پەیوەندی بە سێرڤەرەوە نەکرا.' };
        }
        if (res.status === 401) {
            window.location.href = '/';
            return { success: false, message: '' };
        }
        var data;
        try { data = await res.json(); } catch (e) { data = null; }
        if (!data) return { success: false, message: 'هەڵەیەکی چاوەڕوان نەکراو ڕوویدا.' };
        return data;
    }

    /* navigator.clipboard is unavailable on plain HTTP, so fall back to execCommand. */
    async function copyText(text, inputEl) {
        if (navigator.clipboard && window.isSecureContext) {
            try {
                await navigator.clipboard.writeText(text);
                return true;
            } catch (e) { /* fall through */ }
        }
        var temp = inputEl;
        if (!temp) {
            temp = document.createElement('textarea');
            temp.value = text;
            temp.setAttribute('readonly', '');
            temp.style.position = 'fixed';
            temp.style.opacity = '0';
            document.body.appendChild(temp);
        }
        temp.focus();
        temp.select();
        temp.setSelectionRange(0, text.length);
        var ok = false;
        try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
        if (temp !== inputEl) document.body.removeChild(temp);
        return ok;
    }

    /* createElement + textContent only — never innerHTML with user data. */
    function el(tag, props, children) {
        var node = document.createElement(tag);
        Object.keys(props || {}).forEach(function (key) {
            if (key === 'text') node.textContent = props[key];
            else if (key === 'class') node.className = props[key];
            else if (key === 'style') Object.assign(node.style, props[key]);
            else node.setAttribute(key, props[key]);
        });
        (children || []).forEach(function (child) {
            node.appendChild(typeof child === 'string' ? document.createTextNode(child) : child);
        });
        return node;
    }

    window.KB = { toast: toast, api: api, copyText: copyText, el: el, pageData: pageData };
})();
