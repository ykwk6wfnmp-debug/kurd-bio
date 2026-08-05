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
        /* Render's free tier sleeps after ~15 minutes idle and takes 30-60s to
           wake. Without a timeout the phone just hangs with no feedback, and a
           registration that never completed looks to the user like one that
           succeeded. Give it 70s, then say plainly what happened. */
        var controller = typeof AbortController === 'function' ? new AbortController() : null;
        var timedOut = false;
        var timer = null;
        if (controller) {
            opts.signal = controller.signal;
            timer = setTimeout(function () { timedOut = true; controller.abort(); }, 70000);
        }

        var res;
        try {
            res = await fetch(url, opts);
        } catch (e) {
            return {
                success: false,
                message: timedOut
                    ? 'سێرڤەرەکە وەڵامی نەدایەوە. لەوانەیە خەوتبێت — تکایە دیسان هەوڵ بدەرەوە.'
                    : 'پەیوەندی بە سێرڤەرەوە نەکرا. ئینتەرنێتەکەت بپشکنە و دیسان هەوڵ بدەرەوە.'
            };
        } finally {
            if (timer) clearTimeout(timer);
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

    /**
     * The single place quantities get formatted for display.
     *
     * Latin digits, deliberately. Arabic-Indic numerals were used here before,
     * but U+0660 (ARABIC-INDIC DIGIT ZERO) is drawn as a small dot, so every
     * zero balance, link count and stat rendered as "·" and read as a broken
     * placeholder rather than a number. Latin digits are standard in Kurdish
     * Sorani digital text and are unambiguous for money and counts.
     */
    function num(value) {
        var n = Number(value);
        return Number.isFinite(n) ? String(n) : String(value);
    }

    /* Placeholder cards shown while a page of data is in flight. */
    function skeletons(container, count) {
        var frag = document.createDocumentFragment();
        for (var i = 0; i < count; i += 1) {
            frag.appendChild(el('div', { class: 'skeleton', 'aria-hidden': 'true' }));
        }
        container.appendChild(frag);
    }

    function clearSkeletons(container) {
        var nodes = container.querySelectorAll('.skeleton');
        for (var i = 0; i < nodes.length; i += 1) nodes[i].remove();
    }

    window.KB = {
        toast: toast,
        api: api,
        copyText: copyText,
        el: el,
        pageData: pageData,
        num: num,
        skeletons: skeletons,
        clearSkeletons: clearSkeletons
    };
})();
