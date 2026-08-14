'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

function pageApi() {
  return require('../tools/timeline-review-page.cjs');
}

test('review page publishes the exact frozen CommonJS API', () => {
  const reviewPage = pageApi();

  assert.deepEqual(Object.keys(reviewPage), ['renderReviewPage']);
  assert.ok(Object.isFrozen(reviewPage));
  assert.equal(typeof reviewPage.renderReviewPage, 'function');
});

test('renderReviewPage emits a complete escaped maintenance page with every stable hook', () => {
  const { renderReviewPage } = pageApi();
  const html = renderReviewPage({
    nonce: 'fixed-review-nonce',
    title: 'Review <img src=x onerror=alert(1)>',
    queue: [{ title: 'must-not-be-embedded' }]
  });

  assert.match(html, /^<!doctype html>/i);
  assert.match(html, /<meta charset="utf-8">/i);
  assert.match(html, /Review &lt;img src=x onerror=alert\(1\)&gt;/);
  assert.doesNotMatch(html, /Review <img/);
  assert.doesNotMatch(html, /must-not-be-embedded/);

  for (const hook of [
    'data-seek-delta="-5"',
    'data-seek-delta="5"',
    'data-record-current',
    'data-prev-item',
    'data-next-item',
    'data-confirm-current',
    'data-save-review',
    'data-candidate-time',
    'data-review-player',
    'data-review-status'
  ]) {
    assert.ok(html.includes(hook), `missing stable hook ${hook}`);
  }

  assert.match(html, /<button[^>]+data-record-current[^>]*>/i);
  assert.match(html, /<button[^>]+data-confirm-current[^>]*>/i);
  assert.doesNotMatch(html, /<(?:input|textarea|select)[^>]+(?:name|data-[\w-]*)=["'][^"']*path/i);
  assert.match(html, /<script nonce="fixed-review-nonce">/);
  assert.match(html, /<script[^>]+src="https:\/\/www\.youtube\.com\/iframe_api"/);
});

test('rendered client uses same-origin token APIs and keeps record, confirm, and candidate actions separate', () => {
  const { renderReviewPage } = pageApi();
  const html = renderReviewPage({ nonce: 'nonce-123' });

  assert.match(html, /new URL\(window\.location\.href\)/);
  assert.match(html, /new URL\(endpoint, window\.location\.origin\)/);
  assert.match(html, /searchParams\.set\(['"]token['"], token\)/);
  assert.match(html, /fetch\(apiUrl\(['"]\/api\/queue['"]\)/);
  assert.match(html, /fetch\(apiUrl\(['"]\/api\/review['"]\)/);
  assert.match(html, /method:\s*['"]POST['"]/);
  assert.match(html, /body:\s*JSON\.stringify\(review\)/);
  assert.doesNotMatch(html, /JSON\.stringify\(\{[^}]*path/i);

  assert.match(html, /origin:\s*window\.location\.origin/);
  assert.match(html, /autoplay:\s*0/);
  assert.doesNotMatch(html, /playVideo\s*\(/);
  assert.match(html, /candidateButton\.addEventListener\(['"]click['"],\s*\(\)\s*=>\s*\{\s*seekTo\(candidate\.start\);\s*\}\)/s);
  assert.match(html, /currentItem\(\)\.status = ['"]unreviewed['"]/);
  assert.match(html, /currentItem\(\)\.status = ['"]reviewed['"]/);
});
