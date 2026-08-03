'use strict';

const config = require('../config');

/**
 * The single place that knows what a public profile URL looks like.
 * Everything that shows, copies or links to a profile calls this.
 */
function profilePath(username) {
    return `/u/${encodeURIComponent(username)}`;
}

function origin(req) {
    if (config.publicBaseUrl) return config.publicBaseUrl;
    return `${req.protocol}://${req.get('host')}`;
}

function publicProfileUrl(req, username) {
    return `${origin(req)}${profilePath(username)}`;
}

module.exports = { profilePath, publicProfileUrl };
