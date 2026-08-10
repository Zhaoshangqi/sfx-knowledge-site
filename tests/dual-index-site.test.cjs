const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const indexHtml = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

test('loads the shared knowledge model before the inline application data', () => {
  const modelScript = indexHtml.indexOf('<script src="src/knowledge-model.js"></script>');
  const inlineCategories = indexHtml.indexOf('const categories = [');

  assert.notEqual(modelScript, -1);
  assert.ok(modelScript < inlineCategories);
});

test('exposes accessible video and effect index modes', () => {
  assert.match(indexHtml, /id="viewSwitch"[^>]*role="tablist"/);
  assert.match(indexHtml, /<button[^>]*data-mode="videos"[^>]*>视频案例<\/button>/);
  assert.match(indexHtml, /<button[^>]*data-mode="effects"[^>]*>效果器索引<\/button>/);
  assert.match(indexHtml, /id="videoLibrary"/);
  assert.match(indexHtml, /<section[^>]*id="effectLibrary"[^>]*hidden/);
});

test('provides effect index controls and render target', () => {
  ['effectCategoryFilter', 'effectEvidenceFilter', 'effectResultCount', 'effectList'].forEach((id) => {
    assert.match(indexHtml, new RegExp(`id="${id}"`));
  });
});

test('removes course-oriented shell copy', () => {
  assert.doesNotMatch(indexHtml, /沉浸式学习模式/);
  assert.doesNotMatch(indexHtml, /学习时间：最新优先/);
});
