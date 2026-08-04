'use strict';

/**
 * Server data is never interpolated into JavaScript. It is emitted as a JSON
 * island that the page script reads, which removes a whole class of injection
 * bugs from the templates.
 */
function dataIsland(data) {
    if (!data) return '';
    const json = JSON.stringify(data).replace(/</g, '\\u003c');
    return `<script type="application/json" id="kb-data">${json}</script>`;
}

// Preloaded so Kurdish text does not reflow once the webfont arrives.
const FONT_PRELOAD = ['400', '700']
    .map(
        (weight) =>
            `<link rel="preload" as="font" type="font/woff2" crossorigin ` +
            `href="/fonts/noto-kufi-arabic-arabic-${weight}-normal.woff2">`
    )
    .join('\n    ');

function layout({ title, data, script, body, head = '', bodyClass = '' }) {
    return `<!DOCTYPE html>
<html lang="ckb" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
    <meta name="theme-color" content="#06080d">
    <meta name="color-scheme" content="dark light">
    <title>${title}</title>
    ${FONT_PRELOAD}
    <link rel="stylesheet" href="/css/app.css">
    ${head}
</head>
<body class="${bodyClass}">
${body}
<div id="toast" role="status" aria-live="polite"></div>
${dataIsland(data)}
<script src="/js/kb.js"></script>
${script ? `<script src="${script}"></script>` : ''}
</body>
</html>`;
}

module.exports = { layout };
