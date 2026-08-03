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

function layout({ title, data, script, body, head = '', bodyClass = '' }) {
    return `<!DOCTYPE html>
<html lang="ckb" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
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
