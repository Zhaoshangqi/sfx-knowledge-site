'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const {
  parseTimestamp,
  parseVtt,
  compactCues,
  buildTrack,
  runCli
} = require('../tools/build-site-subtitles.cjs');

const cliPath = path.join(__dirname, '..', 'tools', 'build-site-subtitles.cjs');

function temporaryDirectory(t) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'sfx-subtitles-'));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  return directory;
}

function validOptions(overrides = {}) {
  return {
    videoId: 'Xl5u91oQv-k',
    language: 'zh-CN',
    source: 'site-owned-from-public-captions',
    reviewStatus: 'draft',
    updatedAt: '2026-08-12',
    cues: [{ start: 40.559, end: 44.27, text: '字幕' }],
    ...overrides
  };
}

test('parseTimestamp accepts strict WebVTT timestamps', () => {
  assert.equal(parseTimestamp('00:00:00.000'), 0);
  assert.equal(parseTimestamp('01:02.345'), 62.345);
  assert.equal(parseTimestamp('00:01:02.345'), 62.345);
  assert.equal(parseTimestamp('01:02:03.004'), 3723.004);
  assert.equal(parseTimestamp('123:59:59.999'), 446399.999);
});

test('parseTimestamp rejects malformed or out-of-range timestamps', () => {
  [
    '',
    '0:00:00.000',
    '0:00.000',
    '00:00:00',
    '00:00:00.00',
    '00:00:00.0000',
    '00:60:00.000',
    '00:00:60.000',
    '00:00:-1.000',
    ' 00:00:00.000 ',
    'not-a-time',
    null,
    0
  ].forEach((value) => {
    assert.throws(() => parseTimestamp(value), /Malformed WebVTT timestamp/);
  });
});

test('parseVtt strips settings, inline timestamps, and c tags', () => {
  const cues = parseVtt([
    'WEBVTT',
    'Kind: captions',
    '',
    'cue-id',
    '00:00:40.559 --> 00:00:44.270 align:start position:0%',
    ' ',
    '好<00:00:40.934><c>的</c><00:00:41.309><c.green>，开始</c>',
    '',
    '00:00:44.280 --> 00:00:48.709 line:90%',
    '<c.colorE5E5E5>下一句</c>',
    ''
  ].join('\n'));

  assert.deepEqual(cues, [
    { start: 40.559, end: 44.27, text: '好的，开始' },
    { start: 44.28, end: 48.709, text: '下一句' }
  ]);
});

test('parseVtt strips all standard WebVTT inline markup while preserving text', () => {
  const cues = parseVtt([
    'WEBVTT',
    '',
    '00:00:01.000 --> 00:00:04.000',
    '<v Speaker><b>粗体</b> <i>斜体</i> <u>下划线</u> <lang zh>中文</lang> <ruby>字<rt>zi</rt></ruby></v>',
    ''
  ].join('\n'));

  assert.deepEqual(cues, [{
    start: 1,
    end: 4,
    text: '粗体 斜体 下划线 中文 字zi'
  }]);
});

test('parseVtt requires the WEBVTT signature', () => {
  assert.throws(() => parseVtt([
    'not-webvtt',
    '',
    '00:00:01.000 --> 00:00:02.000',
    'text',
    ''
  ].join('\n')), /WEBVTT signature/);
});

test('parseVtt decodes common and numeric HTML entities and collapses whitespace', () => {
  const cues = parseVtt([
    'WEBVTT',
    '',
    '00:00:01.000 --> 00:00:03.000',
    'A&nbsp;&amp; B &lt; C &gt; D &quot;Q&quot; &apos;P&apos; &#39;N&#39; &#x4E2D;&#25991;',
    ''
  ].join('\n'));

  assert.deepEqual(cues, [{
    start: 1,
    end: 3,
    text: 'A & B < C > D "Q" \'P\' \'N\' 中文'
  }]);
});

test('parseVtt rejects malformed cue timestamps', () => {
  assert.throws(() => parseVtt([
    'WEBVTT',
    '',
    '00:00:01.00 --> 00:00:02.000',
    'bad',
    ''
  ].join('\n')), /Malformed WebVTT timestamp/);
});

test('parseVtt rejects cue blocks with more than one line before timing', () => {
  assert.throws(() => parseVtt([
    'WEBVTT',
    '',
    'first stray line',
    'second stray line',
    '00:00:01.000 --> 00:00:02.000',
    'text that must not be accepted',
    ''
  ].join('\n')), /Malformed WebVTT cue block/);
});

test('parseVtt rejects cues attached to the WEBVTT header without a blank separator', () => {
  assert.throws(() => parseVtt([
    'WEBVTT',
    'Kind: captions',
    '00:00:01.000 --> 00:00:02.000',
    'silently lost first cue',
    '',
    '00:00:03.000 --> 00:00:04.000',
    'later valid cue',
    ''
  ].join('\n')), /Malformed WebVTT header/);
});

test('parseVtt rejects unknown cue-like blocks instead of silently dropping them', () => {
  assert.throws(() => parseVtt([
    'WEBVTT',
    '',
    '00:00:01.000 --> 00:00:02.000',
    'valid',
    '',
    'this malformed block has no timing arrow',
    '',
    '00:00:03.000 --> 00:00:04.000',
    'also valid',
    ''
  ].join('\n')), /Unexpected WebVTT block/);

  assert.doesNotThrow(() => parseVtt([
    'WEBVTT',
    '',
    'NOTE this is metadata',
    'ignored note body',
    '',
    'STYLE',
    '::cue { color: white; }',
    '',
    'REGION',
    'id:main',
    '',
    '00:00:01.000 --> 00:00:02.000',
    'valid',
    ''
  ].join('\n')));
});

test('compactCues removes blank and bracket-only music or applause cues', () => {
  const cues = compactCues([
    { start: 0, end: 1, text: '' },
    { start: 1, end: 2, text: ' [音乐] ' },
    { start: 2, end: 3, text: '[ Music ]' },
    { start: 3, end: 4, text: '【掌声】' },
    { start: 4, end: 5, text: '[APPLAUSE]' },
    { start: 4.2, end: 5.2, text: '[音乐]，' },
    { start: 4.3, end: 5.3, text: '[掌声] 和' },
    { start: 4.4, end: 5.4, text: '音乐]' },
    { start: 5, end: 7, text: '保留口述' }
  ]);

  assert.deepEqual(cues, [{ start: 5, end: 7, text: '保留口述' }]);
});

test('compactCues eliminates YouTube rolling duplicates by longest overlap', () => {
  const cues = compactCues([
    { start: 40.559, end: 44.27, text: '好的，这次要介绍几个' },
    { start: 44.28, end: 48.709, text: '好的，这次要介绍几个 不太复杂的小技巧，' },
    { start: 48.719, end: 52.59, text: '不太复杂的小技巧， 但主要我想强调的是，' },
    { start: 52.6, end: 57.43, text: '但主要我想强调的是， Stepwise Morph 插件真的很好用。' }
  ]);

  assert.deepEqual(cues, [
    { start: 40.559, end: 44.27, text: '好的，这次要介绍几个' },
    { start: 44.28, end: 48.709, text: '不太复杂的小技巧，' },
    { start: 48.719, end: 52.59, text: '但主要我想强调的是，' },
    { start: 52.6, end: 57.43, text: 'Stepwise Morph 插件真的很好用。' }
  ]);
});

test('compactCues keeps distant and one-character suffix-prefix matches intact', () => {
  assert.deepEqual(compactCues([
    { start: 0, end: 1, text: 'cat' },
    { start: 4, end: 6, text: 'the next cue' },
    { start: 6.05, end: 8, text: 'echo' }
  ]), [
    { start: 0, end: 1, text: 'cat' },
    { start: 4, end: 6, text: 'the next cue' },
    { start: 6.05, end: 8, text: 'echo' }
  ]);
});

test('compactCues preserves nearby accidental two-to-three-character overlaps', () => {
  assert.deepEqual(compactCues([
    { start: 0, end: 2, text: '这是声音设计' },
    { start: 2.05, end: 4, text: '设计一个新的效果' },
    { start: 4.05, end: 6, text: '的效果器链路' }
  ]), [
    { start: 0, end: 2, text: '这是声音设计' },
    { start: 2.05, end: 4, text: '设计一个新的效果' },
    { start: 4.05, end: 6, text: '的效果器链路' }
  ]);
});

test('compactCues sorts cues and clamps overlapping source cues to nonoverlap', () => {
  const cues = compactCues([
    { start: 4, end: 7, text: '第三句足够长' },
    { start: 0, end: 3, text: '第一句足够长' },
    { start: 2.5, end: 5, text: '第二句足够长' }
  ]);

  assert.deepEqual(cues, [
    { start: 0, end: 2.5, text: '第一句足够长' },
    { start: 2.5, end: 4, text: '第二句足够长' },
    { start: 4, end: 7, text: '第三句足够长' }
  ]);
});

test('compactCues merges unreadably short adjacent fragments', () => {
  const cues = compactCues([
    { start: 0, end: 0.3, text: '这' },
    { start: 0.31, end: 0.7, text: '是一句' },
    { start: 0.71, end: 3, text: '完整字幕。' }
  ]);

  assert.deepEqual(cues, [{ start: 0, end: 3, text: '这 是一句 完整字幕。' }]);
});

test('compactCues caps merged duration and text length for dense short runs', () => {
  const cues = compactCues(Array.from({ length: 30 }, (_, index) => ({
    start: index * 0.5,
    end: (index * 0.5) + 0.4,
    text: '片段' + index
  })));

  assert.ok(cues.length > 1);
  cues.forEach((cue) => {
    assert.ok(cue.end - cue.start <= 8);
    assert.ok(cue.text.length <= 80);
  });
});

test('buildTrack validates metadata and returns deterministic field order', () => {
  const track = buildTrack(validOptions());

  assert.deepEqual(track, validOptions());
  assert.equal(JSON.stringify(track, null, 2), [
    '{',
    '  "videoId": "Xl5u91oQv-k",',
    '  "language": "zh-CN",',
    '  "source": "site-owned-from-public-captions",',
    '  "reviewStatus": "draft",',
    '  "updatedAt": "2026-08-12",',
    '  "cues": [',
    '    {',
    '      "start": 40.559,',
    '      "end": 44.27,',
    '      "text": "字幕"',
    '    }',
    '  ]',
    '}'
  ].join('\n'));

  [
    ['videoId', ''],
    ['videoId', 'bad id'],
    ['language', ''],
    ['language', 'zh_CN'],
    ['source', ''],
    ['reviewStatus', 'never-reviewed'],
    ['updatedAt', '2026-8-12'],
    ['updatedAt', '2026-02-30']
  ].forEach(([field, value]) => {
    assert.throws(
      () => buildTrack(validOptions({ [field]: value })),
      new RegExp(field)
    );
  });

  assert.equal(
    buildTrack(validOptions({ reviewStatus: 'reviewed' })).reviewStatus,
    'reviewed'
  );
});

test('CLI writes deterministic UTF-8 JSON with one trailing newline', (t) => {
  const directory = temporaryDirectory(t);
  const input = path.join(directory, 'input.vtt');
  const outputA = path.join(directory, 'a.json');
  const outputB = path.join(directory, 'b.json');
  fs.writeFileSync(input, [
    'WEBVTT',
    '',
    '00:00:01.000 --> 00:00:03.000',
    'A&amp;B',
    ''
  ].join('\n'), 'utf8');

  const argsFor = (output) => [
    '--video-id', 'Xl5u91oQv-k',
    '--input', input,
    '--language', 'zh-CN',
    '--source', 'site-owned-from-public-captions',
    '--review-status', 'draft',
    '--updated-at', '2026-08-12',
    '--output', output
  ];

  assert.equal(runCli(argsFor(outputA)), 0);
  assert.equal(runCli(argsFor(outputB)), 0);

  const first = fs.readFileSync(outputA);
  const second = fs.readFileSync(outputB);
  assert.deepEqual(first, second);
  assert.equal(first.toString('utf8').endsWith('\n'), true);
  assert.equal(first.toString('utf8').endsWith('\n\n'), false);
  assert.equal(first[0], 0x7b);
});

test('CLI exits nonzero with a useful message and writes nothing on missing args', (t) => {
  const directory = temporaryDirectory(t);
  const output = path.join(directory, 'track.json');
  const result = spawnSync(process.execPath, [cliPath, '--output', output], {
    encoding: 'utf8'
  });

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Missing required argument: --video-id/);
  assert.equal(fs.existsSync(output), false);
});

test('CLI rejects identical input and output paths without changing the source', (t) => {
  const directory = temporaryDirectory(t);
  const input = path.join(directory, 'source.vtt');
  const original = 'WEBVTT\n\n00:00:01.000 --> 00:00:03.000\n原始字幕\n';
  fs.writeFileSync(input, original, 'utf8');

  assert.throws(() => runCli([
    '--video-id', 'Xl5u91oQv-k',
    '--input', input,
    '--language', 'zh-CN',
    '--source', 'site-owned-from-public-captions',
    '--review-status', 'draft',
    '--updated-at', '2026-08-12',
    '--output', input
  ]), /different paths/);
  assert.equal(fs.readFileSync(input, 'utf8'), original);
});

test('CLI rejects case-only aliases of the input path on Windows', {
  skip: process.platform !== 'win32'
}, (t) => {
  const directory = temporaryDirectory(t);
  const input = path.join(directory, 'Caption.VTT');
  const outputAlias = path.join(directory, 'caption.vtt');
  const original = 'WEBVTT\n\n00:00:01.000 --> 00:00:03.000\n原始字幕\n';
  fs.writeFileSync(input, original, 'utf8');

  assert.throws(() => runCli([
    '--video-id', 'Xl5u91oQv-k',
    '--input', input,
    '--language', 'zh-CN',
    '--source', 'site-owned-from-public-captions',
    '--review-status', 'draft',
    '--updated-at', '2026-08-12',
    '--output', outputAlias
  ]), /different paths/);
  assert.equal(fs.readFileSync(input, 'utf8'), original);
});

test('CLI preserves an existing output when validation fails', (t) => {
  const directory = temporaryDirectory(t);
  const input = path.join(directory, 'bad.vtt');
  const output = path.join(directory, 'track.json');
  fs.writeFileSync(input, 'not webvtt', 'utf8');
  fs.writeFileSync(output, 'previous valid output\n', 'utf8');

  assert.throws(() => runCli([
    '--video-id', 'Xl5u91oQv-k',
    '--input', input,
    '--language', 'zh-CN',
    '--source', 'site-owned-from-public-captions',
    '--review-status', 'draft',
    '--updated-at', '2026-08-12',
    '--output', output
  ]), /WEBVTT signature/);
  assert.equal(fs.readFileSync(output, 'utf8'), 'previous valid output\n');
});
