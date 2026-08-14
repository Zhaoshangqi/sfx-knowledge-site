# Transcript Paragraphs And Sound Design Glossary Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Keep short timed cues for the in-video overlay while turning the full transcript into readable seekable paragraphs and adding a curated bilingual effect and sound-design glossary.

**Architecture:** `SfxVideoSubtitles` derives immutable paragraph projections from validated cue tracks without changing subtitle assets. `SfxYouTubeCaptionPlayer` renders paragraphs into an optional external transcript mount while continuing to synchronize the overlay against original cues. A separate frozen glossary module detects curated aliases in the current record and loaded transcript, then the site renders only relevant terms.

**Tech Stack:** Vanilla JavaScript, UMD/CommonJS, Node.js `node:test`, semantic HTML, existing YouTube caption player.

---

## File Structure

- Modify `src/video-subtitles.js`: add lossless `paragraphsFor(track)` projection.
- Modify `tests/video-subtitles.test.cjs`: paragraph boundaries, immutability, and text-preservation tests.
- Modify `src/youtube-caption-player.js`: external transcript mount, paragraph seek, paragraph active state, and `onTrackLoaded` callback.
- Modify `tests/youtube-caption-player.test.cjs`: paragraph transcript and lifecycle tests.
- Create `src/sfx-glossary.js`: curated bilingual glossary, alias matching, and relevance projection.
- Create `tests/sfx-glossary.test.cjs`: schema, uniqueness, boundary matching, sorting, and immutability tests.
- Modify `index.html`: load glossary module and render/update the current video glossary section.
- Modify `tests/dual-index-site.test.cjs`: module order, safe glossary rendering, and missing-track behavior.
- Modify `docs/learning-workflow.md`: terminology maintenance and subtitle paragraph boundaries.

## Task 1: Immutable Transcript Paragraph Projection

**Files:**
- Modify: `src/video-subtitles.js:843-1099`
- Modify: `tests/video-subtitles.test.cjs:461-601`

- [ ] **Step 1: Write failing paragraph-boundary tests**

```js
test('groups cue fragments into readable paragraphs without changing overlay cues', () => {
  const track = Object.freeze({ cues: Object.freeze([
    Object.freeze({ start: 0, end: 2, text: '先听原始素材，' }),
    Object.freeze({ start: 2, end: 4, text: '再削掉刺耳共振。' }),
    Object.freeze({ start: 4.4, end: 6, text: 'Then add' }),
    Object.freeze({ start: 6, end: 8, text: 'a short tail.' })
  ]) });
  const paragraphs = subtitleApi.paragraphsFor(track);
  assert.deepEqual(plainValue(paragraphs), [
    { start: 0, end: 4, text: '先听原始素材，再削掉刺耳共振。', cueIndexes: [0, 1] },
    { start: 4.4, end: 8, text: 'Then add a short tail.', cueIndexes: [2, 3] }
  ]);
  assert.equal(track.cues[0].text, '先听原始素材，');
  assert.ok(Object.isFrozen(paragraphs));
  assert.ok(paragraphs.every(Object.isFrozen));
});

test('ends paragraphs at a 1.2 second gap, 24 second duration, or 120 code points', () => {
  assert.equal(subtitleApi.paragraphsFor(gapTrack).length, 2);
  assert.equal(subtitleApi.paragraphsFor(durationTrack).length, 2);
  assert.equal(subtitleApi.paragraphsFor(lengthTrack).length, 2);
});
```

- [ ] **Step 2: Add fail-closed tests for malformed tracks**

```js
assert.deepEqual(subtitleApi.paragraphsFor(null), []);
assert.deepEqual(subtitleApi.paragraphsFor({ cues: [{ start: 2, end: 1, text: 'bad' }] }), []);
assert.deepEqual(subtitleApi.paragraphsFor({ cues: [] }), []);
```

- [ ] **Step 3: Run focused tests and verify the API is missing**

Run: `node --test tests\video-subtitles.test.cjs`

Expected: FAIL with `subtitleApi.paragraphsFor is not a function`.

- [ ] **Step 4: Implement join and boundary helpers**

Add after `normalizeTrack()`:

```js
  function codePointLength(value) {
    return Array.from(String(value || '')).length;
  }

  function joinTranscriptText(left, right) {
    var a = String(left || '');
    var b = String(right || '');
    if (!a) return b;
    if (!b) return a;
    var needsSpace = /[A-Za-z0-9]$/.test(a) && /^[A-Za-z0-9]/.test(b);
    return a + (needsSpace ? ' ' : '') + b;
  }

  function sentenceEnded(text) {
    return /[。！？!?…][”’"']?$/.test(String(text || '').trim()) || /[.!?][”’"']?$/.test(String(text || '').trim());
  }
```

- [ ] **Step 5: Implement `paragraphsFor(track)` with pre-add caps**

```js
  function paragraphsFor(track) {
    var cues = normalizeCues(track && track.cues);
    if (!cues || cues.length === 0) return Object.freeze([]);
    var result = [];
    var current = null;

    function flush() {
      if (!current) return;
      result.push(Object.freeze({
        start: current.start,
        end: current.end,
        text: current.text,
        cueIndexes: Object.freeze(current.cueIndexes.slice())
      }));
      current = null;
    }

    cues.forEach(function (cue, index) {
      var joined = current ? joinTranscriptText(current.text, cue.text) : cue.text;
      var gap = current ? cue.start - current.end : 0;
      var exceeds = current && (gap > 1.2 || cue.end - current.start > 24 || codePointLength(joined) > 120);
      if (exceeds) flush();
      if (!current) current = { start: cue.start, end: cue.end, text: cue.text, cueIndexes: [index] };
      else {
        current.end = cue.end;
        current.text = joinTranscriptText(current.text, cue.text);
        current.cueIndexes.push(index);
      }
      if (sentenceEnded(current.text)) flush();
    });
    flush();
    return Object.freeze(result);
  }
```

Export `paragraphsFor` on the existing frozen API.

- [ ] **Step 6: Add a lossless real-track invariant**

For `assets/subtitles/Xl5u91oQv-k.json`, normalize both the original cue text stream and paragraph text stream with the same `joinTranscriptText` rule and assert equality, monotonically increasing times, and complete cue-index ownership exactly once.

- [ ] **Step 7: Run subtitle tests and syntax check**

```powershell
node --check src\video-subtitles.js
node --test tests\video-subtitles.test.cjs
```

Expected: all tests PASS.

- [ ] **Step 8: Commit paragraph projection**

```powershell
git add src\video-subtitles.js tests\video-subtitles.test.cjs
git commit -m "feat: group transcript cues into paragraphs"
```

## Task 2: External Paragraph Transcript In The Player

**Files:**
- Modify: `src/youtube-caption-player.js:230-661`
- Modify: `tests/youtube-caption-player.test.cjs`

- [ ] **Step 1: Extend the fake fixture for an external transcript root**

Add `externalTranscript` to `buildFixture()` and pass it through `mountOptions()` as `transcriptRoot`. Keep the original internal `[data-transcript-container]` fixture to verify fallback compatibility.

- [ ] **Step 2: Write failing external-mount and paragraph tests**

```js
test('hydrates readable paragraphs into the external transcript root', async () => {
  const fixture = buildFixture();
  const runtime = buildRuntime();
  const paragraphs = subtitleApi.paragraphsFor(track);
  const controller = playerApi.mount(fixture.root, mountOptions(runtime, {
    transcriptRoot: fixture.externalTranscript
  }));
  await flushPromises();
  assert.equal(fixture.externalTranscript.querySelectorAll('[data-paragraph-index]').length, paragraphs.length);
  assert.equal(fixture.transcript.textContent, '', 'internal loading state is cleared');
  controller.destroy();
});

test('paragraph buttons seek to paragraph start while overlay remains cue-accurate', async () => {
  fixture.paragraphButtons[0].dispatch('click');
  await flushPromises();
  assert.deepEqual(runtime.calls.seek[0], [paragraphs[0].start, true]);
  runtime.setCurrentTime(track.cues[1].start);
  runtime.runInterval();
  assert.equal(fixture.overlay.textContent, track.cues[1].text);
  assert.equal(fixture.paragraphButtons[0].getAttribute('aria-current'), 'true');
});
```

- [ ] **Step 3: Write failing lifecycle and callback tests**

Assert `onTrackLoaded(track)` fires once after strict validation, never after destroy, and callback exceptions do not break playback. Assert 200 ms polling updates `aria-current` without calling `scrollIntoView()` on every cue change.

- [ ] **Step 4: Run focused player tests and verify failures**

Run: `node --test tests\youtube-caption-player.test.cjs`

Expected: FAIL because paragraphs, external mount, and callback are not implemented.

- [ ] **Step 5: Split internal and external transcript state**

At mount start use:

```js
var internalTranscriptContainer = rootElement.querySelector('[data-transcript-container]');
var transcriptContainer = options.transcriptRoot || internalTranscriptContainer;
var paragraphButtons = [];
var cueToParagraph = [];
var activeParagraphIndex = -1;
var onTrackLoaded = typeof options.onTrackLoaded === 'function' ? options.onTrackLoaded : null;
```

When an external mount is supplied, clear the internal loading text after hydration but never append paragraphs there.

- [ ] **Step 6: Render paragraph controls and cue ownership**

Each button uses `data-paragraph-index` and `data-paragraph-start`, renders one time and one complete paragraph, and registers one click listener. Build `cueToParagraph[cueIndex] = paragraphIndex` from each paragraph's frozen `cueIndexes`.

- [ ] **Step 7: Keep cue overlay synchronization separate**

`synchronize()` still calls `subtitleApi.cueAt(track, player.getCurrentTime())`. Resolve the cue index as before, then call `setActiveParagraph(cueToParagraph[cueIndex])`. `setActiveParagraph()` updates only `aria-current`; it must not scroll unless invoked by an explicit transcript navigation action.

- [ ] **Step 8: Invoke the loaded-track callback safely**

After `hydrateTrack()` has accepted and rendered the track:

```js
if (onTrackLoaded) {
  try { onTrackLoaded(loadedTrack); } catch (error) {}
}
```

- [ ] **Step 9: Destroy both transcript mounts cleanly**

Clear external paragraph listeners and DOM created by the controller, but do not remove the external section itself. Ignore late load resolution exactly as current tests require.

- [ ] **Step 10: Run player tests and commit**

```powershell
node --check src\youtube-caption-player.js
node --test tests\youtube-caption-player.test.cjs
git add src\youtube-caption-player.js tests\youtube-caption-player.test.cjs
git commit -m "feat: render seekable transcript paragraphs"
```

Expected: all tests PASS.

## Task 3: Curated Bilingual Glossary Module

**Files:**
- Create: `src/sfx-glossary.js`
- Create: `tests/sfx-glossary.test.cjs`

- [ ] **Step 1: Write failing schema and uniqueness tests**

```js
const glossary = require('../src/sfx-glossary.js');

test('publishes unique frozen bilingual terms with concise explanations', () => {
  const entries = glossary.entries();
  assert.equal(entries.length, 32);
  assert.equal(new Set(entries.map((entry) => entry.id)).size, 32);
  entries.forEach((entry) => {
    assert.match(entry.id, /^[a-z0-9-]+$/);
    ['english', 'chinese', 'meaning', 'use'].forEach((key) => assert.ok(entry[key].trim()));
    assert.ok(Array.isArray(entry.aliases) && entry.aliases.length > 0);
    assert.ok(Object.isFrozen(entry));
    assert.ok(Object.isFrozen(entry.aliases));
  });
  assert.ok(Object.isFrozen(entries));
});
```

- [ ] **Step 2: Write failing alias-boundary and relevance tests**

```js
test('matches English words at boundaries and Chinese aliases directly', () => {
  assert.deepEqual(glossary.termsFor('Use a bus send and sidechain compression.').map((x) => x.id).sort(),
    ['bus', 'compression', 'send', 'sidechain']);
  assert.deepEqual(glossary.termsFor('调整瞬态与尾音').map((x) => x.id).sort(), ['tail', 'transient']);
  assert.equal(glossary.termsFor('business').some((x) => x.id === 'bus'), false);
});
```

- [ ] **Step 3: Define the exact initial glossary content**

Create exactly these 32 IDs and explanations:

| id | English | 中文 | 是什么 | 什么时候关注 |
|---|---|---|---|---|
| `eq` | EQ / Equalization | 均衡 | 按频段增减声音能量的处理。 | 清理遮挡、突出主体或给其他层留空间。 |
| `filter` | Filter | 滤波 | 按截止频率保留或衰减一部分频谱。 | 控制明暗、距离感和运动变化。 |
| `compression` | Compression | 压缩 | 缩小强弱差异并重塑动态轮廓。 | 稳定层级、增加密度或控制峰值。 |
| `limiting` | Limiting | 限制 | 用很高压缩比阻止峰值继续上升。 | 保护总线余量或约束最终峰值。 |
| `saturation` | Saturation | 饱和 | 添加较柔和的谐波与非线性染色。 | 需要厚度、存在感或轻微粘合时。 |
| `distortion` | Distortion | 失真 | 用更明显的非线性改变波形和谐波。 | 需要攻击性、粗糙感或新的音色身份时。 |
| `transient` | Transient | 瞬态 | 声音开头决定轮廓和冲击感的短暂部分。 | 判断打击感、清晰度和前后层次。 |
| `attack` | Attack | 起音 | 声音从开始到主要能量建立的过程。 | 区分硬、软、快、慢的声音动作。 |
| `body` | Body | 主体 | 承担声音重量和主要可辨信息的中段。 | 素材太薄或只有尖锐起音时。 |
| `texture` | Texture | 纹理 | 赋予表面质感和细节变化的声音层。 | 增加材质、复杂度和可重复性差异。 |
| `tail` | Tail | 尾音 | 主体动作之后继续衰减或扩散的部分。 | 塑造空间、规模和动作结束方式。 |
| `layer` | Layer | 分层 | 让多个素材分别承担不同声音角色。 | 单一素材无法同时提供瞬态、主体和尾音时。 |
| `bus` | Bus | 总线 | 汇集多个轨道并统一处理或路由的通道。 | 需要整体控制一组声音时。 |
| `send` | Send | 发送 | 把信号副本送往另一个处理通道。 | 多个声音共享混响、延迟或并行处理时。 |
| `return` | Return | 返回 | 接收发送信号并承载共享效果的通道。 | 控制共享效果量而不改动原始轨时。 |
| `sidechain` | Sidechain | 侧链 | 用另一条信号控制当前处理器的动作。 | 让关键声音出现时自动避让其他层。 |
| `dry-wet` | Dry / Wet | 干湿比 | 原始信号与处理后信号的混合比例。 | 控制效果存在感并保留原始轮廓。 |
| `formant` | Formant | 共振峰 | 决定声源口腔感、体型感或元音身份的频谱峰。 | 改变角色体型而不只做整体升降调时。 |
| `convolution` | Convolution | 卷积 | 用脉冲响应把一个空间或系统特征施加到声音上。 | 需要真实空间、物体共振或特殊滤波特征时。 |
| `granular` | Granular | 粒子处理 | 把声音切成短小颗粒再重排、拉伸或散布。 | 制作持续纹理、冻结感和非线性运动时。 |
| `resonance` | Resonance | 共振 | 某些频率因系统反馈或结构特性被强调。 | 寻找刺耳峰值或塑造有调性的滤波运动时。 |
| `automation` | Automation | 自动化 | 让参数随时间按预设轨迹变化。 | 声音需要明确运动、演化和同步动作时。 |
| `pitch` | Pitch | 音高 | 人耳感知到的高低位置。 | 改变重量、体型、旋律或层之间的关系时。 |
| `stereo-width` | Stereo Width | 立体声宽度 | 左右声道差异形成的横向展开程度。 | 控制中心稳定性、规模和环境包围感时。 |
| `headroom` | Headroom | 动态余量 | 当前峰值到系统上限之间可用的空间。 | 多层叠加、总线处理和最终输出前。 |
| `envelope` | Envelope | 包络 | 描述声音能量随时间起落的整体轮廓。 | 调整起音、保持和衰减关系时。 |
| `one-shot` | One-shot | 单次素材 | 触发一次后播放完整过程的声音文件。 | 处理撞击、按钮、枪声等离散事件时。 |
| `loop` | Loop | 循环 | 可首尾衔接并持续播放的声音片段。 | 处理引擎、环境、魔法持续体等连续状态时。 |
| `stem` | Stem | 分轨组 | 按角色导出的可独立混合声音子组。 | 需要在游戏或后期中动态重组层级时。 |
| `impulse-response` | Impulse Response | 脉冲响应 | 记录空间或系统对短脉冲反应的声音文件。 | 为卷积混响或物体共振提供特征来源时。 |
| `modulation` | Modulation | 调制 | 用一个变化信号持续控制另一个参数。 | 制作颤动、旋转、活性和周期运动时。 |
| `spectral` | Spectral Processing | 频谱处理 | 在频率随时间的表示上分析或改变声音。 | 做精细修复、分离、冻结或复杂变形时。 |

Aliases must include the English term, Chinese term, common abbreviations, and existing site forms such as `Dry/Wet`, `IR`, `瞬态起音`, `侧链压缩`, `stereo image`, and `granulation` where applicable.

- [ ] **Step 4: Implement frozen entries and deterministic matching**

Export:

```js
return Object.freeze({
  entries: function () { return ENTRIES; },
  termForId: termForId,
  termsFor: termsFor
});
```

`termsFor(value)` recursively collects strings from arrays and plain objects, matches Latin aliases with escaped case-insensitive token boundaries, matches Chinese aliases by substring, deduplicates by ID, and sorts with `a.chinese.localeCompare(b.chinese, 'zh-CN') || a.id.localeCompare(b.id)`. It must not mutate input.

- [ ] **Step 5: Run glossary tests and syntax check**

```powershell
node --check src\sfx-glossary.js
node --test tests\sfx-glossary.test.cjs
```

Expected: 32 entries and all tests PASS.

- [ ] **Step 6: Commit the glossary module**

```powershell
git add src\sfx-glossary.js tests\sfx-glossary.test.cjs
git commit -m "feat: add bilingual sound design glossary"
```

## Task 4: Integrate Relevant Glossary Terms Into Video Detail

**Files:**
- Modify: `index.html:1601-1606`
- Modify: `index.html:33304-33379`
- Modify: `tests/dual-index-site.test.cjs`

- [ ] **Step 1: Write failing module-order and safe-render tests**

```js
test('loads glossary before the inline application and renders only relevant terms', () => {
  assert.ok(indexHtml.indexOf('src/sfx-glossary.js') < indexHtml.indexOf('    const records = '));
  assert.match(indexHtml, /function renderVideoGlossary\(record, track\)/);
  assert.match(indexHtml, /SfxGlossary\.termsFor/);
  assert.match(indexHtml, /data-video-glossary/);
});

test('glossary renderer escapes every field and omits an empty section', () => {
  assert.equal(renderVideoGlossary({ title: 'no matching vocabulary' }, null), '');
  assert.doesNotMatch(renderVideoGlossary(record, track), /<script>/i);
});
```

- [ ] **Step 2: Run focused site tests and verify failures**

Run: `node --test tests\dual-index-site.test.cjs`

Expected: FAIL because the glossary module and renderer are not integrated.

- [ ] **Step 3: Load the glossary module with a dated cache key**

```html
<script src="src/sfx-glossary.js?v=20260814-glossary-1"></script>
```

Place it after `video-subtitles.js` and before `youtube-caption-player.js`.

- [ ] **Step 4: Implement record-plus-track relevance and escaped markup**

```js
function renderVideoGlossary(record, track) {
  const paragraphs = track ? SfxVideoSubtitles.paragraphsFor(track) : [];
  const terms = SfxGlossary.termsFor([record, paragraphs.map((item) => item.text)]);
  if (!terms.length) return '';
  return '<section class="section video-glossary" data-video-glossary>' +
    '<h3>本视频术语</h3><dl class="glossary-list">' + terms.map((term) =>
      '<div class="glossary-term"><dt><span lang="en">' + escapeHtml(term.english) + '</span>' +
      '<strong>' + escapeHtml(term.chinese) + '</strong></dt>' +
      '<dd><span>' + escapeHtml(term.meaning) + '</span><span>' + escapeHtml(term.use) + '</span></dd></div>'
    ).join('') + '</dl></section>';
}
```

- [ ] **Step 5: Update terms after asynchronous track hydration**

Render record-only terms initially. Pass `onTrackLoaded(track)` to player mount; it replaces only `[data-video-glossary]` or inserts the section at the stable glossary anchor. Guard against stale callbacks by checking `state.activeId === record.id`.

- [ ] **Step 6: Add restrained glossary CSS**

Use an unframed definition list, two-column desktop rows, one-column mobile rows, 1 px separators, and text sizes no larger than 16 px. Do not render cards inside the detail section.

- [ ] **Step 7: Run site, player, and glossary tests**

```powershell
node --test tests\sfx-glossary.test.cjs tests\video-subtitles.test.cjs tests\youtube-caption-player.test.cjs tests\dual-index-site.test.cjs
```

Expected: all tests PASS.

- [ ] **Step 8: Commit site glossary integration**

```powershell
git add index.html tests\dual-index-site.test.cjs
git commit -m "feat: show relevant glossary terms per video"
```

## Task 5: Document Subtitle And Glossary Maintenance

**Files:**
- Modify: `docs/learning-workflow.md`

- [ ] **Step 1: Document the dual subtitle representation**

State that JSON cues remain the overlay source, paragraphs are runtime projections, and editors must never merge JSON cue timestamps merely to make the transcript look cleaner.

- [ ] **Step 2: Document glossary editorial rules**

State that terms are curated, product names are not translated, explanations avoid parameter prescriptions, aliases must be boundary-safe, and record/transcript matching never rewrites source text.

- [ ] **Step 3: Verify documentation and commit**

```powershell
rg -n "paragraphsFor|术语表|产品名|不改写" docs\learning-workflow.md
git add docs\learning-workflow.md
git commit -m "docs: explain transcript and glossary maintenance"
```

Expected: all four concepts are present.

## Task 6: Transcript And Glossary Browser Acceptance

**Files:**
- Verify only; save screenshots outside the repository.

- [ ] **Step 1: Serve the site locally**

```powershell
python -m http.server 8891 --bind 127.0.0.1
```

Expected: `http://127.0.0.1:8891/` returns 200.

- [ ] **Step 2: Verify a tracked video on desktop**

Open `#video=yt-Xl5u91oQv-k`, activate the player, expand “字幕全文”, and verify complete paragraphs, paragraph seek, current paragraph state, overlay cue changes, and relevant terms including `Stepwise Morph`-adjacent sound-design vocabulary without translating the product name.

- [ ] **Step 3: Verify missing subtitle behavior**

Open `#video=b6df5249`. Verify the truthful missing status remains, no transcript control appears, record-derived glossary terms may appear, video playback remains available, and no console error is emitted.

- [ ] **Step 4: Verify desktop and mobile layout**

Capture 1440x900 and 390x844 screenshots. Confirm paragraph text wraps without horizontal overflow, glossary terms are scan-friendly, controls do not resize, and no nested cards appear.

- [ ] **Step 5: Run complete verification**

```powershell
node --test tests\*.test.cjs
.\.venv\Scripts\python.exe -m unittest discover -s tests -v
node tools\verify-portable-kit.cjs
git diff --check
```

Expected: Node and Python suites have no failures beyond the documented Windows symlink skip; portable verification passes; diff check is clean.
