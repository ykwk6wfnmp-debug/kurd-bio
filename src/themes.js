'use strict';

/**
 * The one and only theme catalog. The gallery, the public profile renderer and
 * the purchase logic all read from here, so a theme can never mean two things.
 */

const TOTAL = 100;
const FIRST_VIP = 71; // themes 71-100 are paid
const VIP_PRICE = 5;

const ICONS = ['🌌', '✨', '🔥', '👑', '🌅', '💎', '🔮', '🌊', '🌸', '🚀'];

function hsl(h, s, l) {
    return `hsl(${Math.round(h) % 360}, ${s}%, ${l}%)`;
}

function buildTheme(index) {
    // Golden-angle hue stepping keeps neighbouring themes visibly different.
    const hue = (index * 137.508) % 360;
    const isVip = index >= FIRST_VIP;
    const isLight = index % 9 === 0;

    let background;
    if (isVip) {
        background = `linear-gradient(160deg, ${hsl(hue, 70, 10)} 0%, ${hsl(hue + 25, 65, 22)} 45%, ${hsl(hue + 60, 75, 35)} 100%)`;
    } else if (isLight) {
        background = `linear-gradient(135deg, ${hsl(hue, 45, 90)}, ${hsl(hue + 30, 55, 78)})`;
    } else {
        background = `linear-gradient(135deg, ${hsl(hue, 55, 9)}, ${hsl(hue + 35, 50, 24)})`;
    }

    return {
        id: `theme_${index}`,
        index,
        name: `دیزاینی ژمارە ${index}`,
        icon: ICONS[(index - 1) % ICONS.length],
        vip: isVip,
        price: isVip ? VIP_PRICE : 0,
        background,
        text: isLight ? '#101418' : '#ffffff',
        accent: isLight ? hsl(hue, 70, 40) : hsl(hue, 90, 65),
        // Card surface on top of the background.
        surface: isLight ? 'rgba(255,255,255,0.72)' : 'rgba(12, 16, 22, 0.62)'
    };
}

const THEMES = Array.from({ length: TOTAL }, (_, i) => buildTheme(i + 1));
const BY_ID = new Map(THEMES.map((theme) => [theme.id, theme]));

function getTheme(id) {
    return BY_ID.get(id) || THEMES[0];
}

function isValidTheme(id) {
    return BY_ID.has(id);
}

module.exports = { THEMES, VIP_PRICE, getTheme, isValidTheme };
