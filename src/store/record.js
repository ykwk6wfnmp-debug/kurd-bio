'use strict';

const DEFAULT_THEME = 'theme_1';

function emptyProfile(username) {
    return {
        name: username,
        bio: '',
        avatar: '',
        theme: DEFAULT_THEME,
        socials: { whatsapp: '', snapchat: '', telegram: '', facebook: '' },
        links: []
    };
}

function createRecord({ username, passwordHash, role = 'user' }) {
    return {
        username,
        passwordHash,
        role,
        banned: false,
        balance: 0,
        ownedThemes: [],
        // Bumped on password/username change so old session cookies stop working.
        sessionVersion: 1,
        createdAt: new Date().toISOString(),
        profile: emptyProfile(username)
    };
}

// Fills in anything an older stored record is missing, so upgrades never crash.
function normalizeRecord(record) {
    if (!record || typeof record !== 'object') return null;
    const username = String(record.username || '');
    const profile = Object.assign(emptyProfile(username), record.profile || {});
    profile.socials = Object.assign(
        { whatsapp: '', snapchat: '', telegram: '', facebook: '' },
        profile.socials || {}
    );
    profile.links = Array.isArray(profile.links) ? profile.links : [];

    return {
        username,
        passwordHash: record.passwordHash || '',
        role: record.role === 'admin' ? 'admin' : 'user',
        banned: Boolean(record.banned),
        balance: Number(record.balance) || 0,
        ownedThemes: Array.isArray(record.ownedThemes) ? record.ownedThemes : [],
        sessionVersion: Number(record.sessionVersion) || 1,
        createdAt: record.createdAt || new Date().toISOString(),
        profile
    };
}

// The only fields a visitor of a public profile is allowed to see.
function publicProfile(record, theme) {
    return {
        username: record.username,
        name: record.profile.name || record.username,
        bio: record.profile.bio || '',
        avatar: record.profile.avatar || '',
        theme,
        socials: {
            whatsapp: record.profile.socials.whatsapp || '',
            snapchat: record.profile.socials.snapchat || '',
            telegram: record.profile.socials.telegram || '',
            facebook: record.profile.socials.facebook || ''
        },
        links: record.profile.links.map((link) => ({ title: link.title, url: link.url }))
    };
}

module.exports = { DEFAULT_THEME, emptyProfile, createRecord, normalizeRecord, publicProfile };
