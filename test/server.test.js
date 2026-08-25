/* Smoke tests for the static server: `node test/server.test.js` */
'use strict';

var assert = require('assert');
var http = require('http');
var server = require('../server.js');

var passed = 0;
var failed = 0;
var queue = [];

function test(name, fn) { queue.push({ name: name, fn: fn }); }

function get(port, path, method) {
  return new Promise(function (resolve, reject) {
    var req = http.request(
      { host: '127.0.0.1', port: port, path: path, method: method || 'GET' },
      function (res) {
        var chunks = [];
        res.on('data', function (c) { chunks.push(c); });
        res.on('end', function () {
          resolve({ status: res.statusCode, headers: res.headers, body: Buffer.concat(chunks).toString() });
        });
      }
    );
    req.on('error', reject);
    req.end();
  });
}

test('serves index.html at /', function (port) {
  return get(port, '/').then(function (r) {
    assert.strictEqual(r.status, 200);
    assert.ok(/text\/html/.test(r.headers['content-type']), 'content-type should be html');
    assert.ok(r.body.indexOf('Commission Calculator') !== -1, 'should contain the page title');
  });
});

test('serves the data file with a javascript content type', function (port) {
  return get(port, '/data/commission-data.js').then(function (r) {
    assert.strictEqual(r.status, 200);
    assert.ok(/javascript/.test(r.headers['content-type']), 'content-type should be javascript');
    assert.ok(r.body.indexOf('COMMISSION_DATA') !== -1, 'should contain the data export');
  });
});

test('serves every script the page loads', function (port) {
  return Promise.all(['/styles.css', '/engine.js', '/app.js'].map(function (p) {
    return get(port, p).then(function (r) {
      assert.strictEqual(r.status, 200, p + ' should be served');
    });
  }));
});

test('answers the health check', function (port) {
  return get(port, '/healthz').then(function (r) {
    assert.strictEqual(r.status, 200);
    assert.strictEqual(r.body, 'ok');
  });
});

test('answers favicon.ico with 204 so the console stays clean', function (port) {
  return get(port, '/favicon.ico').then(function (r) {
    assert.strictEqual(r.status, 204);
  });
});

test('404s unknown paths', function (port) {
  return get(port, '/nope.html').then(function (r) {
    assert.strictEqual(r.status, 404);
  });
});

test('does not serve files outside the allowlist', function (port) {
  return Promise.all(['/package.json', '/server.js', '/test/server.test.js', '/.gitignore'].map(function (p) {
    return get(port, p).then(function (r) {
      assert.strictEqual(r.status, 404, p + ' should not be served');
    });
  }));
});

test('rejects path traversal attempts', function (port) {
  var attempts = [
    '/../package.json',
    '/data/../../package.json',
    '/%2e%2e/package.json',
    '/....//package.json'
  ];
  return Promise.all(attempts.map(function (p) {
    return get(port, p).then(function (r) {
      assert.ok(r.status === 404 || r.status === 400, p + ' should be refused, got ' + r.status);
      assert.ok(r.body.indexOf('"name"') === -1, p + ' must not leak package.json');
    });
  }));
});

test('rejects non-GET methods', function (port) {
  return get(port, '/', 'POST').then(function (r) {
    assert.strictEqual(r.status, 405);
  });
});

test('sets nosniff and no-cache on assets', function (port) {
  return get(port, '/engine.js').then(function (r) {
    assert.strictEqual(r.headers['x-content-type-options'], 'nosniff');
    assert.strictEqual(r.headers['cache-control'], 'no-cache');
  });
});

console.log('\nStatic server');

server.listen(0, '127.0.0.1', function () {
  var port = server.address().port;
  var chain = Promise.resolve();
  queue.forEach(function (t) {
    chain = chain.then(function () {
      return Promise.resolve(t.fn(port)).then(function () {
        passed++;
        console.log('  ok   ' + t.name);
      }, function (err) {
        failed++;
        console.log('  FAIL ' + t.name);
        console.log('       ' + err.message);
      });
    });
  });
  chain.then(function () {
    console.log('\n' + passed + ' passed, ' + failed + ' failed\n');
    server.close();
    process.exit(failed === 0 ? 0 : 1);
  });
});
