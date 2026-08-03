'use strict';

const USERNAME_RE = /^[a-z0-9_]{3,20}$/;
const HANDLE_RE = /^[A-Za-z0-9_.]{1,32}$/;
const PHONE_RE = /^\d{6,15}$/;

const LIMITS = {
    name: 40,
    bio: 160,
    linkTitle: 40,
    linkUrl: 300,
    maxLinks: 20,
    passwordMin: 6,
    passwordMax: 100,
    // Cap on the base64 data URL itself (~225KB of actual image).
    avatarBytes: 300 * 1024
};

const AVATAR_MIME_RE = /^data:image\/(png|jpeg|jpg|webp|gif);base64,[A-Za-z0-9+/=\s]+$/;

class ValidationError extends Error {
    constructor(message) {
        super(message);
        this.name = 'ValidationError';
        this.status = 400;
    }
}

function fail(message) {
    throw new ValidationError(message);
}

function asString(value) {
    return typeof value === 'string' ? value.trim() : '';
}

function checkUsername(value) {
    const username = asString(value).toLowerCase();
    if (!USERNAME_RE.test(username)) {
        fail('ناوی بەکارهێنەر دەبێت ٣-٢٠ پیت بێت و تەنها پیتی بچووکی ئینگلیزی، ژمارە و _ بەکاربهێنێت.');
    }
    return username;
}

function checkPassword(value) {
    const password = typeof value === 'string' ? value : '';
    if (password.length < LIMITS.passwordMin || password.length > LIMITS.passwordMax) {
        fail(`وشەی تێپەڕ دەبێت لە نێوان ${LIMITS.passwordMin} و ${LIMITS.passwordMax} پیت بێت.`);
    }
    return password;
}

function checkText(value, max, label) {
    const text = asString(value);
    if (text.length > max) fail(`${label} نابێت لە ${max} پیت زیاتر بێت.`);
    return text;
}

/** Only absolute http(s) URLs — blocks `javascript:`, `data:` and friends. */
function checkUrl(value, label) {
    const raw = asString(value);
    if (!raw) fail(`${label} پێویستە.`);
    if (raw.length > LIMITS.linkUrl) fail(`${label} زۆر درێژە.`);
    let parsed;
    try {
        parsed = new URL(raw);
    } catch (_) {
        fail(`${label} دروست نییە. بە http:// یان https:// دەستپێبکە.`);
    }
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        fail(`${label} دەبێت بە http:// یان https:// دەستپێبکات.`);
    }
    return parsed.toString();
}

function checkAvatar(value) {
    const avatar = typeof value === 'string' ? value.trim() : '';
    if (!avatar) return '';
    if (avatar.length > LIMITS.avatarBytes) {
        fail('قەبارەی وێنەکە زۆر گەورەیە. زۆرترین قەبارە ٣٠٠ کیلۆبایتە.');
    }
    if (!AVATAR_MIME_RE.test(avatar)) {
        fail('تەنها وێنەی PNG، JPG، WEBP یان GIF قبوڵ دەکرێت.');
    }
    return avatar;
}

function checkSocials(value) {
    const input = value && typeof value === 'object' ? value : {};

    const whatsapp = asString(input.whatsapp).replace(/[\s+()-]/g, '');
    if (whatsapp && !PHONE_RE.test(whatsapp)) fail('ژمارەی واتسئەپ دەبێت ٦-١٥ ژمارە بێت.');

    const snapchat = asString(input.snapchat).replace(/^@/, '');
    if (snapchat && !HANDLE_RE.test(snapchat)) fail('ناوی سناپچات دروست نییە.');

    const telegram = asString(input.telegram).replace(/^@/, '');
    if (telegram && !HANDLE_RE.test(telegram)) fail('ناوی تێلیگرام دروست نییە.');

    const facebookRaw = asString(input.facebook);
    const facebook = facebookRaw ? checkUrl(facebookRaw, 'لینکی فەیسبووک') : '';

    return { whatsapp, snapchat, telegram, facebook };
}

function checkLinks(value) {
    const list = Array.isArray(value) ? value : [];
    if (list.length > LIMITS.maxLinks) fail(`زۆرترین ژمارەی لینک ${LIMITS.maxLinks}ە.`);

    return list.map((item, index) => {
        const source = item && typeof item === 'object' ? item : {};
        const title = checkText(source.title, LIMITS.linkTitle, 'ناونیشانی لینک');
        if (!title) fail('ناونیشانی لینک بەتاڵە.');
        return {
            id: Number(source.id) || Date.now() + index,
            title,
            url: checkUrl(source.url, 'لینک')
        };
    });
}

module.exports = {
    LIMITS,
    USERNAME_RE,
    ValidationError,
    checkUsername,
    checkPassword,
    checkText,
    checkUrl,
    checkAvatar,
    checkSocials,
    checkLinks
};
