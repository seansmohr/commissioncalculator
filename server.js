/*
 * Minimal zero-dependency static file server.
 *
 * The calculator is a static page - opening index.html directly still works.
 * This exists so the app can be deployed to a host that expects a web process
 * (Railway, Render, Fly, Heroku), which needs something listening on $PORT.
 */
'use strict';

var http = require('http');
var fs = require('fs');
var path = require('path');
var url = require('url');

var ROOT = __dirname;
var PORT = Number(process.env.PORT) || 3000;
var HOST = process.env.HOST || '0.0.0.0';

var MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8'
};

// Only these files are reachable. An allowlist is simpler to reason about than
// filtering traversal attempts, and this app has a fixed, tiny set of assets.
var ALLOWED = [
  'index.html',
  'styles.css',
  'app.js',
  'engine.js',
  'data/commission-data.js',
  'data/SOURCES.md',
  'README.md'
];

function send(res, status, body, headers) {
  var h = { 'Content-Length': Buffer.byteLength(body) };
  Object.keys(headers || {}).forEach(function (k) { h[k] = headers[k]; });
  res.writeHead(status, h);
  res.end(body);
}

var server = http.createServer(function (req, res) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    return send(res, 405, 'Method Not Allowed', {
      'Content-Type': 'text/plain; charset=utf-8', Allow: 'GET, HEAD'
    });
  }

  var pathname;
  try {
    pathname = decodeURIComponent(url.parse(req.url).pathname || '/');
  } catch (err) {
    return send(res, 400, 'Bad Request', { 'Content-Type': 'text/plain; charset=utf-8' });
  }

  // Health check for the platform.
  if (pathname === '/healthz') {
    return send(res, 200, 'ok', { 'Content-Type': 'text/plain; charset=utf-8' });
  }

  // The page carries an inline SVG icon, so there is no icon file to serve.
  // Answer the browser's automatic request rather than logging a 404.
  if (pathname === '/favicon.ico') {
    res.writeHead(204);
    return res.end();
  }

  var rel = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
  // Normalise so "data/../index.html" and "./index.html" compare correctly, then
  // require an exact allowlist hit.
  rel = path.posix.normalize(rel);

  if (ALLOWED.indexOf(rel) === -1) {
    return send(res, 404, 'Not Found', { 'Content-Type': 'text/plain; charset=utf-8' });
  }

  var file = path.join(ROOT, rel);
  fs.readFile(file, function (err, data) {
    if (err) {
      return send(res, 404, 'Not Found', { 'Content-Type': 'text/plain; charset=utf-8' });
    }
    var type = MIME[path.extname(file).toLowerCase()] || 'application/octet-stream';
    var headers = {
      'Content-Type': type,
      'X-Content-Type-Options': 'nosniff',
      // The rate data changes when a schedule changes; don't let browsers hold
      // a stale copy of it or of the code that reads it.
      'Cache-Control': 'no-cache'
    };
    if (req.method === 'HEAD') {
      res.writeHead(200, Object.assign({ 'Content-Length': data.length }, headers));
      return res.end();
    }
    send(res, 200, data, headers);
  });
});

if (require.main === module) {
  server.listen(PORT, HOST, function () {
    console.log('Commission Calculator listening on http://' + HOST + ':' + PORT);
  });
}

module.exports = server;
