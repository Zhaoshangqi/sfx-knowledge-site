# Veto Learning Template Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the Veto ultimate video into the single approved learning-template sample with a 30-second overview, five design chapters, and four-field step explanations while preserving every existing evidence asset.

**Architecture:** Keep the optional learning data inside the existing Veto record in `index.html` so the record remains the single source of truth. Rendering helpers detect `record.learningMap`; Veto receives the new hierarchy, while all records without it keep the current summary, flat timeline, and detailed-step fallback. Existing YouTube seek, screenshots, effects, subtitles, and evidence rendering remain unchanged.

**Tech Stack:** Static HTML/CSS/JavaScript, Node.js built-in test runner, Python unittest, existing repository verification scripts, Playwright browser checks.

---

### Task 1: Lock And Add The Veto Learning Data

**Files:**
- Modify: `tests/veto-video-import.test.cjs`
- Modify: `index.html` inside record `yt-3JjAK2uhxM4`

- [ ] **Step 1: Write the failing data-contract test**

Add these assertions after the existing step checks in the first Veto test:

```js
  assert.equal(record.learningMap.goal, '让可见动作、角色材质和力量幻想同时清楚，并用调性与尾音区分己方和敌方版本。');
  assert.deepEqual(record.learningMap.roles.map((role) => role.name), [
    '动作提示', '主体材质', '重量冲击', '能量身份', '高频细节', '空间与尾音'
  ]);
  assert.equal(record.learningMap.decisions.length, 3);
  assert.match(record.learningMap.sequence, /初始命中.+吸入式转场.+手臂拉回.+敌我变体/);

  const chapters = record.learningMap.chapters;
  assert.deepEqual(chapters.map((chapter) => chapter.id), [
    'action-map', 'action-power', 'liquid-highs', 'identity-transition', 'material-variants'
  ]);
  assert.deepEqual(chapters.map((chapter) => chapter.stepOrders), [
    [1], [2], [3, 4, 5, 6, 7, 8, 9, 10], [11, 12, 13], [14, 15, 16, 17]
  ]);
  assert.deepEqual(chapters.flatMap((chapter) => chapter.stepOrders).sort((a, b) => a - b),
    Array.from({ length: 17 }, (_, index) => index + 1));
  assert.equal(new Set(chapters.flatMap((chapter) => chapter.stepOrders)).size, 17);

  for (const step of record.steps) {
    assert.deepEqual(Object.keys(step.learning), ['input', 'problem', 'action', 'result'], step.name);
    Object.values(step.learning).forEach((value) => {
      assert.equal(typeof value, 'string', step.name);
      assert.ok(value.trim().length >= 8, step.name);
    });
  }
```

- [ ] **Step 2: Run the focused test and verify RED**

Run: `node --test tests/veto-video-import.test.cjs`

Expected: FAIL because `record.learningMap` and `step.learning` do not exist.

- [ ] **Step 3: Add the approved `learningMap`**

Insert this object after the Veto record's `summary`:

```js
    "learningMap": {
      "goal": "让可见动作、角色材质和力量幻想同时清楚，并用调性与尾音区分己方和敌方版本。",
      "roles": [
        { "name": "动作提示", "description": "布料、手镯和拉臂动作对齐画面节拍。" },
        { "name": "主体材质", "description": "黏液、甲壳和水感解释 Veto 身体的触感。" },
        { "name": "重量冲击", "description": "非写实重击补足画面本身没有的力量反馈。" },
        { "name": "能量身份", "description": "固定调性的合成器统一角色的力量来源。" },
        { "name": "高频细节", "description": "Ear Candy 提供穿透、节拍和爽感。" },
        { "name": "空间与尾音", "description": "回声、运动和 Growl 延续方向与威胁。" }
      ],
      "decisions": [
        "先用画面可见的动作与材质建立可信主体，再加入非写实力量层。",
        "每颗效果器只解决频段、运动、定位、连续性或清洁度中的一个职责。",
        "己方与敌方版本共用身份材料，只改变调性、点击细节和尾音语义。"
      ],
      "sequence": "初始命中 → 吸入式转场 → 手臂拉回 → 材质与尾音收束 → 敌我变体",
      "chapters": [
        { "id": "action-map", "title": "先定动作骨架", "question": "画面发生了什么，时间结构如何分拍？", "summary": "先把完整动作拆成可命名的声音事件，后续每层才能有明确职责。", "stepOrders": [1] },
        { "id": "action-power", "title": "建立动作与力量", "question": "怎样让可见动作可信，同时让力量反馈足够？", "summary": "拟音负责可信来源，非写实重击负责力量，两者不能互相替代。", "stepOrders": [2] },
        { "id": "liquid-highs", "title": "塑造液态高频", "question": "怎样让高频亮点既像 Veto，又不抢主体定位？", "summary": "依次处理运动、前向定位、连续性、重量、融合、方向、频段职责和刺耳残留。", "stepOrders": [3, 4, 5, 6, 7, 8, 9, 10] },
        { "id": "identity-transition", "title": "建立角色身份与转场", "question": "怎样统一力量来源，并连接命中和拉臂两拍？", "summary": "固定调性定义角色，吸入转场分开动作阶段，旧材料按新节奏重组。", "stepOrders": [11, 12, 13] },
        { "id": "material-variants", "title": "完成材质、尾音与敌我版本", "question": "怎样补全身体材质、威胁感和游戏辨识？", "summary": "用材质层解释身体，用尾音延续攻击性，再以少量语义差异区分敌我。", "stepOrders": [14, 15, 16, 17] }
      ]
    },
```

- [ ] **Step 4: Add the four learning fields to all 17 steps**

Use the following exact content, keyed by `order`, and place each `learning` object after `detail`:

```js
const vetoStepLearning = {
  1: { input: '完整大招画面与已有声音草稿。', problem: '动作事件很多，直接堆素材会失去先后关系。', action: '拆成命中、手镯低频、高频亮点、吸入转场、拉臂、材质和尾音职责。', result: '整段获得可继续分层的时间骨架。' },
  2: { input: '布料、手镯拟音与一层额外重击。', problem: '拟音能解释动作，但单独使用时力量反馈不足。', action: '保留真实动作层，再加入画面没有直接来源的非写实重击。', result: '动作仍可信，同时获得更明确的力量反馈。' },
  3: { input: '频率合适但偏干、偏数码的高频亮点。', problem: '高频能穿透，却不像 Veto 的液态能量。', action: '用 PhaseMistress 只增加周期性的液态起伏。', result: '穿透力保留，运动质感更符合角色。' },
  4: { input: '经过液态运动处理但过宽的高频层。', problem: '声音像从玩家四周出现，脱离手臂正前方。', action: '用 S1 收窄声像，把辅助层拉回画面中心。', result: '空间感仍在，定位重新贴合手臂动作。' },
  5: { input: '尾部很短的液态高频亮点。', problem: '进入完整混音后出现一下就消失，支撑不足。', action: '用 EchoBoy Jr 增加短回声，只延续亮点尾部。', result: '高频更连贯，同时保留清楚的攻击起点。' },
  6: { input: '节拍清楚但过亮、过薄的硬币感高频。', problem: '原音有亮点，却缺少与力量层连接的重量。', action: '将复制层降调后与原始音高混合。', result: '同一瞬态同时保留亮点和低层重量。' },
  7: { input: '降调后仍显得孤立的高频层。', problem: '处理层像贴在主体表面，没有共同尾部。', action: '加入短混响补齐尾部，并控制攻击不后退。', result: '亮点自然并入动作组，不再显得突兀。' },
  8: { input: '较静态的水感高频纹理。', problem: '材质方向正确，但持续段缺少流体运动。', action: '用 PanMan 让辅助纹理产生可控的声像变化。', result: '流动感增强，主体定位仍留在正前方。' },
  9: { input: '只有高频部分有用的黏液素材。', problem: '全频加入会让低中频与主体层拥挤。', action: '用 Pro-Q 3 只提取该层承担职责的高频部分。', result: '目标纹理留下，无关能量退出整组。' },
  10: { input: '频段已确定但仍有尖锐噪点的高频层。', problem: '刺耳残留会抢过材质细节和主体动作。', action: '用 Z-Noise 清理目标频段内部的尖锐残留。', result: '亮度和细节保留，刺耳感退到背景。' },
  11: { input: '一组固定调性的合成器声音。', problem: '材质层能解释身体，却不能独立定义力量来源。', action: '把固定调性合成器作为跨技能复用的能量构件。', result: '不同动作共享同一个 Veto 力量身份。' },
  12: { input: '初始命中、吸入转场和多层频段内容。', problem: '命中与拉臂容易连成一团，无效频率还会占用余量。', action: '用吸入声建立下一拍方向，并逐层移除不承担职责的频率。', result: '两段动作分开，整组为后续力量层保留空间。' },
  13: { input: '已经建立的黏液、前向定位和力量材料。', problem: '直接复制第一次组合会与拉臂的新节奏不匹配。', action: '保留角色身份材料，但按手臂拉回的时间轮廓重新排列。', result: '同一角色身份服务新的动作节奏。' },
  14: { input: '脆壳、橡胶黏液和水下纹理。', problem: '单一能量声无法解释手臂的硬壳、湿度和拉扯。', action: '让三类素材分别承担硬边、弹性和持续湿润运动。', result: '手臂获得可辨认的复合身体材质。' },
  15: { input: '动作完成后的 Growl 尾音。', problem: '主体材质已经完整，但威胁感结束得太早。', action: '把 Growl 放在动作尾部，只延续攻击性。', result: '动作结束后仍保留危险和生命感。' },
  16: { input: '画面主体层与高频 Ear Candy。', problem: '只有主体会清楚但不够爽，只有强化层又会失去来源。', action: '主体负责材质和动作，高频层只补穿透、节拍与力量幻想。', result: '可读性与满足感同时成立。' },
  17: { input: '己方版本主体材料、调性、点击与尾音。', problem: '完全重做会破坏技能身份，完全复用又无法提示敌我危险。', action: '共用主体材料，只把敌方调性改得更负面并调整点击和尾音。', result: '技能身份一致，玩家仍能仅凭声音判断敌我。' }
};
```

- [ ] **Step 5: Run the focused test and verify GREEN**

Run: `node --test tests/veto-video-import.test.cjs`

Expected: 2 tests pass.

- [ ] **Step 6: Commit the data contract and content**

```bash
git add tests/veto-video-import.test.cjs index.html
git commit -m "content: structure Veto learning sample"
```

### Task 2: Render The Optional Learning Template

**Files:**
- Modify: `tests/dual-index-site.test.cjs`
- Modify: `index.html` CSS and detail rendering helpers

- [ ] **Step 1: Write failing rendering tests**

Add a test using `loadDetailRenderingHelpers` and the production Veto record:

```js
test('renders the optional Veto learning map without changing legacy records', () => {
  const helpers = loadDetailRenderingHelpers({
    escapeHtml: escapeHtmlForTest,
    escapeAttr: escapeHtmlForTest,
    SfxVideoTimeline
  });
  const veto = records().find((record) => record.videoId === '3JjAK2uhxM4');
  const projected = loadVideoDetailData().project(veto);
  const quick = helpers.renderQuickConclusion(veto, projected);
  const timeline = helpers.renderStepTimeline(veto, projected);
  const detailed = helpers.renderDetailedSteps(veto, projected);

  assert.match(quick, /30 秒读懂/);
  assert.equal((quick.match(/class="learning-role"/g) || []).length, 6);
  assert.match(quick, /最终结构/);
  assert.equal((timeline.match(/class="learning-chapter"/g) || []).length, 5);
  assert.equal((timeline.match(/data-step-time/g) || []).length, 17);
  ['输入', '问题', '动作', '结果'].forEach((label) => assert.match(detailed, new RegExp(`<dt>${label}<\\/dt>`)));
  assert.equal((detailed.match(/class="step-learning-grid"/g) || []).length, 17);
  assert.match(detailed, /查看完整说明/);

  const legacy = { title: '旧视频', summary: '旧摘要', coreIdeas: ['旧观点'], steps: [{ order: 1, name: '旧步骤', detail: '旧说明', params: ['旧线索'] }] };
  const legacyQuick = helpers.renderQuickConclusion(legacy, legacy);
  const legacyTimeline = helpers.renderStepTimeline(legacy, legacy);
  const legacyDetail = helpers.renderDetailedSteps(legacy, legacy);
  assert.match(legacyQuick, /快速结论/);
  assert.doesNotMatch(legacyQuick, /30 秒读懂/);
  assert.match(legacyTimeline, /class="step-timeline"/);
  assert.match(legacyDetail, /旧说明/);
  assert.doesNotMatch(legacyDetail, /step-learning-grid/);
});
```

Add these CSS contract assertions in the same test:

```js
  const css = indexHtml.match(/<style>([\s\S]*?)<\/style>/)?.[1] || '';
  assert.match(css, /\.learning-map \{[\s\S]*?display: grid;/);
  assert.match(css, /\.learning-roles \{[\s\S]*?grid-template-columns: repeat\(2, minmax\(0, 1fr\)\);/);
  assert.match(css, /\.learning-chapter \{[\s\S]*?border-top: 1px solid var\(--line\);/);
  assert.match(css, /\.step-learning-grid > div \{[\s\S]*?grid-template-columns: 44px minmax\(0, 1fr\);/);
  assert.match(css, /@media \(max-width: 640px\) \{[\s\S]*?\.learning-roles \{[\s\S]*?grid-template-columns: minmax\(0, 1fr\);/);
```

- [ ] **Step 2: Run the focused rendering test and verify RED**

Run: `node --test tests/dual-index-site.test.cjs`

Expected: FAIL because the new learning-map HTML and CSS classes are absent.

- [ ] **Step 3: Implement conditional overview rendering**

Replace `renderQuickConclusion` with this complete conditional implementation:

```js
    function renderQuickConclusion(record, detailData) {
      const learningMap = record?.learningMap && typeof record.learningMap === "object" ? record.learningMap : null;
      if (learningMap) {
        const roles = Array.isArray(learningMap.roles) ? learningMap.roles.filter((role) => role && role.name && role.description) : [];
        const decisions = Array.isArray(learningMap.decisions) ? learningMap.decisions.filter(Boolean).slice(0, 3) : [];
        return '<section id="quick" class="detail-quick learning-map detail-content-section" data-detail-section="quick">' +
          '<h3 tabindex="-1" data-section-heading>30 秒读懂</h3>' +
          '<p class="learning-goal"><strong>设计目标</strong><span>' + escapeHtml(learningMap.goal || "") + '</span></p>' +
          (roles.length ? '<div class="learning-roles">' + roles.map((role) =>
            '<div class="learning-role"><strong>' + escapeHtml(role.name) + '</strong><span>' + escapeHtml(role.description) + '</span></div>'
          ).join("") + '</div>' : '') +
          (decisions.length ? '<div><strong class="learning-label">关键决定</strong><ul class="quick-decisions">' + decisions.map((decision) =>
            '<li>' + escapeHtml(decision) + '</li>'
          ).join("") + '</ul></div>' : '') +
          (learningMap.sequence ? '<p class="learning-sequence"><strong>最终结构</strong><span>' + escapeHtml(learningMap.sequence) + '</span></p>' : '') +
        '</section>';
      }
      const summary = typeof record?.summary === "string" ? record.summary : "";
      const ideas = Array.isArray(detailData?.coreIdeas) ? detailData.coreIdeas.slice(0, 3) : [];
      return '<section id="quick" class="detail-quick detail-content-section" data-detail-section="quick">' +
        '<h3 tabindex="-1" data-section-heading>快速结论</h3>' +
        (summary ? '<p class="detail-summary">' + escapeHtml(summary) + '</p>' : '') +
        (ideas.length ? '<ul class="quick-decisions">' + ideas.map((idea) => '<li>' + escapeHtml(idea) + '</li>').join("") + '</ul>' : '') +
      '</section>';
    }
```

- [ ] **Step 4: Implement chapter rendering with existing seek controls**

Replace `renderStepTimeline` with the following implementation. It resolves chapter orders against the projected steps, uses the existing seek helper for both chapter and step controls, and falls back to the existing flat timeline:

```js
    function renderStepTimeline(record, detailData) {
      const steps = Array.isArray(detailData?.steps) ? detailData.steps : [];
      if (!steps.length) return "";
      const sourceChapters = Array.isArray(record?.learningMap?.chapters) ? record.learningMap.chapters : [];
      const chapters = sourceChapters.map((chapter) => {
        const entries = (Array.isArray(chapter?.stepOrders) ? chapter.stepOrders : []).map((order) => {
          const index = Number(order) - 1;
          if (!Number.isInteger(index) || index < 0 || index >= steps.length) return null;
          return { index, step: steps[index], seconds: SfxVideoTimeline.stepStart(record, index) };
        }).filter(Boolean);
        return entries.length ? { chapter, entries } : null;
      }).filter(Boolean);
      if (chapters.length) {
        return '<section id="steps" class="step-timeline-section learning-chapter-section detail-content-section" data-detail-section="steps">' +
          '<h3 tabindex="-1" data-section-heading>设计章节</h3><ol class="learning-chapters">' + chapters.map(({ chapter, entries }) => {
            const title = chapter.title || "未命名章节";
            const chapterControl = renderTimeJump(entries[0].seconds, title, { "data-chapter-time": "", "data-section": "steps" });
            return '<li class="learning-chapter" data-chapter-id="' + escapeAttr(chapter.id || "") + '">' +
              '<div class="learning-chapter-head"><div><h4>' + escapeHtml(title) + '</h4>' +
                (chapter.question ? '<p class="learning-chapter-question">' + escapeHtml(chapter.question) + '</p>' : '') + '</div>' + chapterControl + '</div>' +
              (chapter.summary ? '<p class="learning-chapter-summary">' + escapeHtml(chapter.summary) + '</p>' : '') +
              '<ol class="learning-chapter-steps">' + entries.map(({ index, step, seconds }) => {
                const name = step?.name || "未命名步骤";
                const control = renderTimeJump(seconds, name, { "data-step-time": "", "data-section": "steps" });
                return '<li>' + (control || '<span class="step-time-unavailable" data-step-time=""><span>' + escapeHtml(name) + '</span><span>时间待复核</span></span>') + '</li>';
              }).join("") + '</ol></li>';
          }).join("") + '</ol></section>';
      }
      return '<section id="steps" class="step-timeline-section detail-content-section" data-detail-section="steps">' +
        '<h3 tabindex="-1" data-section-heading>处理步骤</h3><ol class="step-timeline">' + steps.map((step, index) => {
          const name = step?.name || "未命名步骤";
          const seconds = SfxVideoTimeline.stepStart(record, index);
          const control = renderTimeJump(seconds, name, { "data-step-time": "", "data-section": "steps" });
          return '<li>' + (control || '<span class="step-time-unavailable" data-step-time=""><span>' + escapeHtml(name) + '</span><span>时间待复核</span></span>') + '</li>';
        }).join("") + '</ol></section>';
    }
```

- [ ] **Step 5: Implement four-field detailed steps with folded original detail**

Inside `renderDetailedSteps`, after `params` is created, add this projection:

```js
        const learning = step.learning && typeof step.learning === "object" ? step.learning : null;
        const learningFields = [
          ["input", "输入"], ["problem", "问题"], ["action", "动作"], ["result", "结果"]
        ];
        const hasLearning = learning && learningFields.every(([key]) => typeof learning[key] === "string" && learning[key].trim());
        const learningHtml = hasLearning ? '<dl class="step-learning-grid">' + learningFields.map(([key, label]) =>
          '<div data-learning-field="' + key + '"><dt>' + label + '</dt><dd>' + escapeHtml(learning[key]) + '</dd></div>'
        ).join("") + '</dl>' : '';
        const sourceDetailHtml = hasLearning && (detail || params.length)
          ? '<details class="step-source-detail"><summary>查看完整说明</summary>' +
              (detail ? '<p>' + escapeHtml(detail) + '</p>' : '') +
              (params.length ? '<div class="chips">' + params.map((param) => '<span class="chip">' + escapeHtml(param) + '</span>').join("") + '</div>' : '') +
            '</details>'
          : '';
```

In the returned step markup, replace the current detail paragraph and chips with this exact conditional expression:

```js
          (hasLearning
            ? learningHtml + sourceDetailHtml
            : (detail ? '<p>' + escapeHtml(detail) + '</p>' : '') +
              (params.length ? '<div class="chips">' + params.map((param) => '<span class="chip">' + escapeHtml(param) + '</span>').join("") + '</div>' : '')) +
```

- [ ] **Step 6: Add restrained responsive CSS**

Use unframed bands and 4px corners:

```css
.learning-map { display: grid; gap: 16px; }
.learning-goal, .learning-sequence { margin: 0; }
.learning-goal strong, .learning-sequence strong { display: block; color: var(--muted); font-size: 12px; }
.learning-roles { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px 18px; }
.learning-role { min-width: 0; padding-left: 10px; border-left: 3px solid var(--teal); }
.learning-role strong { display: block; font-size: 13px; }
.learning-role span { color: var(--muted); font-size: 12px; line-height: 1.55; }
.learning-chapters { display: grid; gap: 0; margin: 0; padding: 0; list-style: none; }
.learning-chapter { padding: 18px 0; border-top: 1px solid var(--line); }
.learning-chapter-head { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 8px 16px; }
.learning-chapter h4 { margin: 0; font-size: 16px; }
.learning-chapter-question { margin: 4px 0 0; font-weight: 800; }
.learning-chapter-summary { margin: 6px 0 10px; color: var(--muted); }
.learning-chapter-steps { display: grid; gap: 2px; margin: 0; padding: 0; list-style: none; }
.step-learning-grid { display: grid; gap: 8px; margin: 12px 0 0; }
.step-learning-grid > div { display: grid; grid-template-columns: 44px minmax(0, 1fr); gap: 10px; }
.step-learning-grid dt { color: var(--muted); font-size: 12px; font-weight: 900; }
.step-learning-grid dd { min-width: 0; margin: 0; overflow-wrap: anywhere; }
.step-source-detail { margin-top: 12px; border-top: 1px solid var(--line); }
.step-source-detail summary { padding-top: 10px; cursor: pointer; color: var(--muted); font-size: 12px; font-weight: 800; }
@media (max-width: 640px) {
  .learning-roles { grid-template-columns: minmax(0, 1fr); }
  .learning-chapter-head { grid-template-columns: minmax(0, 1fr); }
}
```

- [ ] **Step 7: Run the focused rendering test and verify GREEN**

Run: `node --test tests/dual-index-site.test.cjs`

Expected: all detail and dual-index tests pass.

- [ ] **Step 8: Commit the renderer**

```bash
git add tests/dual-index-site.test.cjs index.html
git commit -m "feat: render Veto learning template"
```

### Task 3: Verify Content, Regression Safety, And Responsive Layout

**Files:**
- Modify only if verification finds a scoped defect: `index.html`, `tests/veto-video-import.test.cjs`, `tests/dual-index-site.test.cjs`

- [ ] **Step 1: Run all Node tests**

Run: `node --test tests/*.test.cjs`

Expected: all tests pass with zero failures.

- [ ] **Step 2: Run Python tests**

Run: `python -m unittest discover -s tests -p "test_*.py"`

Expected: all tests pass with zero failures.

- [ ] **Step 3: Verify generated knowledge and portable assets**

Run: `node tools/export-site-memory.cjs`

Expected: the site memory export completes and includes the Veto record without deleting existing records.

Run: `node tools/verify-portable-kit.cjs`

Expected: 100% video-memory coverage, valid asset references, valid scripts, and no sensitive files.

- [ ] **Step 4: Check syntax and whitespace**

Run: `git diff --check`

Expected: no output.

- [ ] **Step 5: Inspect the Veto page in real browsers**

Serve the repository over HTTP and open `http://127.0.0.1:8891/?cb=<timestamp>#video=yt-3JjAK2uhxM4`.

At desktop `1440x1000`, verify the 30-second overview, two-column role map, five chapters, 17 nested step jumps, screenshot alignment, player rail, and folded complete explanations.

At mobile `390x844`, verify the role map becomes one column, chapter headings do not overlap time controls, all four field labels wrap cleanly, the player remains usable, and no horizontal overflow appears.

- [ ] **Step 6: Review final diff and repository state**

Run: `git status --short`

Run: `git diff HEAD~2 --stat`

Run: `git log -3 --oneline`

Expected: only the approved spec, plan, Veto data, scoped renderer/CSS, and tests have changed; the working tree is clean after the final commit.
