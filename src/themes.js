'use strict';

/**
 * The one and only theme catalog: 1000 themes across 10 style families.
 *
 * A theme is a full design token set — background, surface, border, radius,
 * shadow, button shape, glow — not just a colour pair, so a paid theme looks
 * meaningfully different rather than recoloured. Everything is generated
 * deterministically from the theme index; there is no 1000-entry literal.
 *
 * The gallery reads this through GET /api/themes and the public profile gets
 * its resolved theme from the same catalog via GET /api/public-profile.
 */

const PER_FAMILY = 100;
const FREE_PER_FAMILY = 5; // slots 1-5 of every family
const LEGENDARY_FROM = 91; // slots 91-100 of every family
const PRICE_VIP = 5;
const PRICE_LEGENDARY = 10;

const GOLDEN_ANGLE = 137.508;

/* ---------- small helpers ---------- */

function hsl(h, s, l) {
    return `hsl(${Math.round(((h % 360) + 360) % 360)}, ${Math.round(s)}%, ${Math.round(l)}%)`;
}

function hsla(h, s, l, a) {
    return `hsla(${Math.round(((h % 360) + 360) % 360)}, ${Math.round(s)}%, ${Math.round(l)}%, ${a})`;
}

/** ١٢٣ instead of 123 — the whole UI is Kurdish Sorani. */
function kuDigits(value) {
    return String(value).replace(/\d/g, (d) => '٠١٢٣٤٥٦٧٨٩'[Number(d)]);
}

function pick(list, slot) {
    return list[(slot - 1) % list.length];
}

/* ---------- family generators ----------
   Each takes the 1-100 slot within its family plus a hue and returns tokens.
   `hue` is stepped by the golden angle so adjacent slots never look alike. */

const FAMILY_DEFS = [
    {
        key: 'dark',
        label: 'تاریک',
        icons: ['🌑', '🖤', '🌘', '🕶️', '⚫'],
        build(slot, h) {
            return {
                bg: hsl(h, 18, 7),
                bgImage: `radial-gradient(1200px 600px at 50% -10%, ${hsla(h, 45, 30, 0.5)}, transparent 70%)`,
                surface: hsla(h, 22, 13, 0.86),
                surfaceBorder: hsla(h, 40, 65, 0.14),
                text: '#f3f6fa',
                muted: hsla(h, 14, 78, 0.62),
                accent: hsl(h, 68, 62),
                accent2: hsl(h + 34, 62, 56),
                radius: 20,
                shadow: '0 18px 45px rgba(0,0,0,0.55)',
                btnStyle: 'solid',
                glow: `0 0 0 1px ${hsla(h, 60, 60, 0.14)}`,
                fontWeight: 700
            };
        }
    },
    {
        key: 'neon',
        label: 'نیۆن',
        icons: ['⚡', '💠', '🔷', '🟣', '✴️'],
        build(slot, h) {
            return {
                bg: '#04050a',
                bgImage: `radial-gradient(900px 500px at 50% 0%, ${hsla(h, 100, 50, 0.28)}, transparent 65%)`,
                surface: 'rgba(8, 10, 18, 0.82)',
                surfaceBorder: hsla(h, 100, 62, 0.38),
                text: '#ffffff',
                muted: hsla(h, 40, 82, 0.6),
                accent: hsl(h, 100, 64),
                accent2: hsl(h + 180, 100, 62),
                radius: 10,
                shadow: `0 14px 40px ${hsla(h, 100, 45, 0.28)}`,
                btnStyle: 'outline',
                glow: `0 0 26px ${hsla(h, 100, 60, 0.45)}`,
                fontWeight: 800
            };
        }
    },
    {
        key: 'gradient',
        label: 'گرادیێنت',
        icons: ['🌈', '🎨', '🔮', '🌅', '🧿'],
        build(slot, h) {
            const angle = 110 + (slot % 7) * 20;
            return {
                bg: hsl(h, 62, 22),
                bgImage: `linear-gradient(${angle}deg, ${hsl(h, 72, 26)} 0%, ${hsl(h + 42, 70, 44)} 48%, ${hsl(h + 88, 76, 58)} 100%)`,
                surface: 'rgba(255,255,255,0.12)',
                surfaceBorder: 'rgba(255,255,255,0.24)',
                text: '#ffffff',
                muted: 'rgba(255,255,255,0.76)',
                accent: '#ffffff',
                accent2: hsl(h + 120, 85, 72),
                radius: 26,
                shadow: '0 22px 55px rgba(0,0,0,0.32)',
                btnStyle: 'glass',
                glow: '',
                fontWeight: 700
            };
        }
    },
    {
        key: 'light',
        label: 'ڕووناک',
        icons: ['☀️', '🤍', '🕊️', '🍦', '⛅'],
        build(slot, h) {
            return {
                bg: hsl(h, 44, 96),
                bgImage: `linear-gradient(160deg, ${hsl(h, 52, 97)}, ${hsl(h + 26, 46, 90)})`,
                surface: 'rgba(255,255,255,0.92)',
                surfaceBorder: hsla(h, 32, 40, 0.14),
                text: hsl(h, 26, 13),
                muted: hsl(h, 12, 44),
                accent: hsl(h, 74, 44),
                accent2: hsl(h + 30, 68, 52),
                radius: 22,
                shadow: `0 16px 40px ${hsla(h, 40, 40, 0.12)}`,
                btnStyle: 'solid',
                glow: '',
                fontWeight: 700
            };
        }
    },
    {
        key: 'glass',
        label: 'شووشەیی',
        icons: ['💎', '🧊', '🫧', '🪟', '💧'],
        build(slot, h) {
            return {
                bg: hsl(h, 58, 12),
                bgImage: [
                    `radial-gradient(650px 420px at 12% 18%, ${hsla(h, 90, 58, 0.42)}, transparent 60%)`,
                    `radial-gradient(600px 400px at 86% 24%, ${hsla(h + 70, 88, 56, 0.36)}, transparent 62%)`,
                    `radial-gradient(700px 500px at 50% 96%, ${hsla(h + 150, 85, 52, 0.32)}, transparent 64%)`
                ].join(', '),
                surface: 'rgba(255,255,255,0.10)',
                surfaceBorder: 'rgba(255,255,255,0.22)',
                text: '#ffffff',
                muted: 'rgba(255,255,255,0.72)',
                accent: hsl(h + 40, 92, 72),
                accent2: hsl(h + 150, 88, 68),
                radius: 28,
                shadow: '0 26px 60px rgba(0,0,0,0.42)',
                btnStyle: 'glass',
                glow: '',
                blur: 22,
                fontWeight: 700
            };
        }
    },
    {
        key: 'minimal',
        label: 'سادە',
        icons: ['▫️', '◽', '⬜', '➖', '🔳'],
        build(slot, h) {
            // Alternating light and dark keeps the family from reading as one page.
            const light = slot % 2 === 0;
            return light
                ? {
                      bg: hsl(h, 8, 97),
                      bgImage: '',
                      surface: 'rgba(255,255,255,0.7)',
                      surfaceBorder: hsla(h, 10, 20, 0.14),
                      text: hsl(h, 10, 12),
                      muted: hsl(h, 6, 46),
                      accent: hsl(h, 24, 26),
                      accent2: hsl(h, 18, 40),
                      radius: 14,
                      shadow: 'none',
                      btnStyle: 'outline',
                      glow: '',
                      fontWeight: 500
                  }
                : {
                      bg: hsl(h, 10, 8),
                      bgImage: '',
                      surface: 'rgba(255,255,255,0.03)',
                      surfaceBorder: 'rgba(255,255,255,0.12)',
                      text: '#eceff3',
                      muted: 'rgba(236,239,243,0.52)',
                      accent: hsl(h, 16, 82),
                      accent2: hsl(h, 12, 64),
                      radius: 14,
                      shadow: 'none',
                      btnStyle: 'outline',
                      glow: '',
                      fontWeight: 500
                  };
        }
    },
    {
        key: 'retro',
        label: 'ڕێترۆ',
        icons: ['📼', '🕹️', '🎞️', '📻', '🛹'],
        // Authentic 70s/80s palette: mustard, orange, rust, teal, avocado,
        // cream — a free hue walk just produces mint and lilac, which read as
        // anything but retro.
        hues: [32, 14, 45, 172, 190, 8, 60, 340, 24, 96],
        build(slot, h) {
            const warm = this.hues[(slot - 1) % this.hues.length] + (((slot * 7) % 5) - 2) * 3;
            const ink = hsl(warm, 48, 17);
            return {
                bg: hsl(warm, 62, 86),
                bgImage: `linear-gradient(180deg, ${hsl(warm, 68, 88)}, ${hsl(warm + 18, 60, 76)})`,
                surface: hsl(warm + 8, 72, 93),
                surfaceBorder: ink,
                text: ink,
                muted: hsl(warm, 26, 36),
                accent: hsl(warm + 186, 62, 34),
                accent2: hsl(warm + 22, 82, 56),
                radius: 6,
                shadow: `6px 6px 0 ${ink}`,
                btnStyle: 'hard',
                glow: '',
                borderWidth: 2,
                fontWeight: 800
            };
        }
    },
    {
        key: 'pastel',
        label: 'پاستێل',
        icons: ['🌸', '🍡', '🧁', '🎀', '🪺'],
        build(slot, h) {
            return {
                bg: hsl(h, 70, 93),
                bgImage: `linear-gradient(150deg, ${hsl(h, 74, 94)}, ${hsl(h + 48, 68, 88)})`,
                surface: 'rgba(255,255,255,0.78)',
                surfaceBorder: hsla(h, 44, 52, 0.22),
                text: hsl(h, 32, 24),
                muted: hsl(h, 18, 46),
                accent: hsl(h, 62, 62),
                accent2: hsl(h + 48, 58, 66),
                radius: 32,
                shadow: `0 18px 44px ${hsla(h, 50, 60, 0.22)}`,
                btnStyle: 'solid',
                glow: '',
                fontWeight: 700
            };
        }
    },
    {
        key: 'aurora',
        label: 'ئۆرۆرا',
        icons: ['🌌', '🌠', '🎆', '✨', '🌃'],
        build(slot, h) {
            return {
                bg: '#050814',
                bgImage: [
                    `radial-gradient(800px 500px at 18% 12%, ${hsla(h, 92, 56, 0.5)}, transparent 62%)`,
                    `radial-gradient(760px 520px at 82% 28%, ${hsla(h + 84, 90, 58, 0.44)}, transparent 62%)`,
                    `radial-gradient(900px 600px at 46% 100%, ${hsla(h + 168, 88, 54, 0.4)}, transparent 66%)`
                ].join(', '),
                surface: 'rgba(8, 12, 28, 0.58)',
                surfaceBorder: 'rgba(255,255,255,0.16)',
                text: '#f4f7ff',
                muted: 'rgba(244,247,255,0.68)',
                accent: hsl(h + 40, 95, 72),
                accent2: hsl(h + 168, 92, 68),
                radius: 24,
                shadow: '0 28px 70px rgba(0,0,0,0.55)',
                btnStyle: 'glass',
                glow: `0 0 34px ${hsla(h + 40, 95, 62, 0.35)}`,
                blur: 18,
                animated: true,
                fontWeight: 700
            };
        }
    },
    {
        key: 'mono',
        label: 'تاکڕەنگ',
        icons: ['⚪', '🔘', '◼️', '🩶', '⬛'],
        build(slot, h) {
            const light = slot % 3 === 0;
            return light
                ? {
                      bg: hsl(h, 14, 95),
                      bgImage: `linear-gradient(180deg, ${hsl(h, 16, 97)}, ${hsl(h, 12, 88)})`,
                      surface: 'rgba(255,255,255,0.82)',
                      surfaceBorder: hsla(h, 18, 24, 0.18),
                      text: hsl(h, 20, 12),
                      muted: hsl(h, 10, 42),
                      accent: hsl(h, 28, 28),
                      accent2: hsl(h, 20, 48),
                      radius: 4,
                      shadow: `0 10px 30px ${hsla(h, 20, 30, 0.14)}`,
                      btnStyle: 'sharp',
                      glow: '',
                      letterSpacing: '0.02em',
                      fontWeight: 800
                  }
                : {
                      bg: hsl(h, 14, 8),
                      bgImage: `linear-gradient(180deg, ${hsl(h, 18, 11)}, ${hsl(h, 12, 5)})`,
                      surface: 'rgba(255,255,255,0.05)',
                      surfaceBorder: hsla(h, 25, 70, 0.2),
                      text: hsl(h, 12, 94),
                      muted: hsla(h, 10, 88, 0.55),
                      accent: hsl(h, 26, 78),
                      accent2: hsl(h, 20, 60),
                      radius: 4,
                      shadow: '0 14px 36px rgba(0,0,0,0.5)',
                      btnStyle: 'sharp',
                      glow: '',
                      letterSpacing: '0.02em',
                      fontWeight: 800
                  };
        }
    }
];

/* ---------- pricing ---------- */

function tierFor(slot) {
    if (slot <= FREE_PER_FAMILY) return { tier: 'free', price: 0 };
    if (slot >= LEGENDARY_FROM) return { tier: 'legendary', price: PRICE_LEGENDARY };
    return { tier: 'vip', price: PRICE_VIP };
}

/* ---------- catalog ---------- */

function buildTheme(index) {
    const familyIndex = Math.floor((index - 1) / PER_FAMILY);
    const def = FAMILY_DEFS[familyIndex];
    const slot = ((index - 1) % PER_FAMILY) + 1;
    // Offset each family's hue walk so families don't all start on the same colour.
    const hue = (slot * GOLDEN_ANGLE + familyIndex * 36) % 360;

    const tokens = def.build(slot, hue);
    const { tier, price } = tierFor(slot);

    return Object.assign(
        {
            id: `theme_${index}`,
            index,
            family: def.key,
            familyName: def.label,
            name: `${def.label} ${kuDigits(slot)}`,
            icon: pick(def.icons, slot),
            tier,
            price,
            vip: price > 0,
            blur: 0,
            animated: false,
            borderWidth: 1,
            letterSpacing: 'normal'
        },
        tokens
    );
}

const TOTAL = FAMILY_DEFS.length * PER_FAMILY;
const THEMES = Array.from({ length: TOTAL }, (_, i) => buildTheme(i + 1));
const BY_ID = new Map(THEMES.map((theme) => [theme.id, theme]));

const FAMILIES = FAMILY_DEFS.map((def, i) => ({
    key: def.key,
    label: def.label,
    icon: def.icons[0],
    from: i * PER_FAMILY + 1,
    to: (i + 1) * PER_FAMILY,
    count: PER_FAMILY
}));

function getTheme(id) {
    return BY_ID.get(id) || THEMES[0];
}

function isValidTheme(id) {
    return BY_ID.has(id);
}

function isValidFamily(key) {
    return FAMILY_DEFS.some((def) => def.key === key);
}

const MAX_PAGE_SIZE = 60;
const MAX_IDS = 60;

/**
 * Paged/filtered access to the catalog. 1000 full theme objects is ~350KB of
 * JSON, which is far too much to push to a phone in one response.
 */
function queryThemes({ family, page, pageSize, ids } = {}) {
    if (ids) {
        const wanted = String(ids)
            .split(',')
            .map((id) => id.trim())
            .filter(Boolean)
            .slice(0, MAX_IDS);
        const themes = wanted.map((id) => BY_ID.get(id)).filter(Boolean);
        return { themes, page: 1, pageSize: themes.length, total: themes.length };
    }

    const pool = family ? THEMES.filter((theme) => theme.family === family) : THEMES;

    const size = Math.min(Math.max(Number(pageSize) || 48, 1), MAX_PAGE_SIZE);
    const totalPages = Math.max(Math.ceil(pool.length / size), 1);
    const current = Math.min(Math.max(Number(page) || 1, 1), totalPages);
    const start = (current - 1) * size;

    return {
        themes: pool.slice(start, start + size),
        page: current,
        pageSize: size,
        total: pool.length,
        totalPages
    };
}

module.exports = {
    THEMES,
    FAMILIES,
    TOTAL,
    PRICE_VIP,
    PRICE_LEGENDARY,
    MAX_PAGE_SIZE,
    getTheme,
    isValidTheme,
    isValidFamily,
    queryThemes
};
