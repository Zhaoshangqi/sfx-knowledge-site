'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const {
  applyReview,
  runCli,
  validateReview
} = require('../tools/apply-timeline-review.cjs');
const siteData = require('../tools/site-data.cjs');

const PUBLIC_USE_ID = 'video-a:effect:pro-q-3:1';

function recordsFixture() {
  return [{
    id: 'video-a',
    videoId: 'abcdefghijk',
    title: 'Video A',
    steps: [
      { order: 1, name: 'Source cleanup', imageKey: 'video-a-step-1' },
      { order: 2, name: 'Tail design' }
    ],
    plugins: [{
      name: 'Pro-Q 3',
      vendor: 'FabFilter',
      purpose: 'Remove boxiness'
    }]
  }];
}

function reviewFixture() {
  return {
    records: [{
      recordId: 'video-a',
      videoId: 'abcdefghijk',
      durationSeconds: 90,
      status: 'reviewed',
      steps: [
        { order: 1, name: 'Source cleanup', status: 'reviewed', startSeconds: 12 },
        { order: 2, name: 'Tail design', status: 'reviewed', startSeconds: 40 }
      ],
      cases: [{
        useId: PUBLIC_USE_ID,
        stepIndex: 0,
        status: 'reviewed',
        startSeconds: 14,
        screenshotReviewed: true,
        screenshotKey: 'video-a-step-1'
      }]
    }]
  };
}

function htmlFixture(records) {
  return [
    '<!doctype html>',
    '<script>',
    `    const records = ${JSON.stringify(records, null, 2)};`,
    '    const imageManifest = {};',
    '    const pluginReferenceCatalog = {};',
    '</script>',
    ''
  ].join('\n');
}

test('applies a fully reviewed video and migrates a public legacy use explicitly', () => {
  const records = recordsFixture();
  const review = reviewFixture();
  const original = structuredClone(records);
  const result = applyReview({
    records,
    review,
    publicUseIds: new Set([PUBLIC_USE_ID]),
    reviewedAt: '2026-08-14'
  });

  assert.deepEqual(records, original, 'application must not mutate the source records');
  assert.deepEqual(result.records[0].timeline, {
    durationSeconds: 90,
    reviewedAt: '2026-08-14',
    source: 'youtube-player'
  });
  assert.deepEqual(
    result.records[0].steps.map((step) => step.startSeconds),
    [12, 40]
  );
  assert.equal(result.records[0].effectUses.length, 1);
  assert.deepEqual(result.records[0].effectUses[0], {
    name: 'Pro-Q 3',
    vendor: 'FabFilter',
    purpose: 'Remove boxiness',
    id: PUBLIC_USE_ID,
    replacesPluginIndexes: [0],
    stepIndex: 0,
    startSeconds: 14,
    screenshotReviewed: true,
    screenshotKey: 'video-a-step-1'
  });
  assert.deepEqual(result.report, {
    recordsReviewed: 1,
    stepsTimed: 2,
    publicCasesMapped: 1,
    screenshotCasesReviewed: 1,
    failures: [],
    changedRecordIds: ['video-a']
  });
});

test('updates an existing explicit public use in place without changing unrelated uses', () => {
  const records = recordsFixture();
  records[0].effectUses = [
    {
      id: PUBLIC_USE_ID,
      name: 'Pro-Q 3',
      replacesPluginIndexes: [0],
      stepIndex: 1,
      startSeconds: 50,
      screenshotReviewed: false
    },
    { id: 'video-a:private', name: 'Private effect', notes: 'keep me' }
  ];

  const result = applyReview({
    records,
    review: reviewFixture(),
    publicUseIds: [PUBLIC_USE_ID],
    reviewedAt: '2026-08-14'
  });

  assert.equal(result.records[0].effectUses.length, 2);
  assert.deepEqual(result.records[0].effectUses[0], {
    id: PUBLIC_USE_ID,
    name: 'Pro-Q 3',
    replacesPluginIndexes: [0],
    stepIndex: 0,
    startSeconds: 14,
    screenshotReviewed: true,
    screenshotKey: 'video-a-step-1'
  });
  assert.deepEqual(result.records[0].effectUses[1], {
    id: 'video-a:private', name: 'Private effect', notes: 'keep me'
  });
});

test('preserves an explicit reviewed-missing screenshot instead of inheriting the step image', () => {
  const review = reviewFixture();
  review.records[0].cases[0].screenshotKey = null;
  review.records[0].cases[0].startSeconds = 12;

  const result = applyReview({
    records: recordsFixture(),
    review,
    publicUseIds: [PUBLIC_USE_ID],
    reviewedAt: '2026-08-14'
  });
  const use = result.records[0].effectUses[0];

  assert.equal(Object.hasOwn(use, 'startSeconds'), false, 'matching step time should use inheritance');
  assert.equal(Object.hasOwn(use, 'screenshotKey'), true);
  assert.equal(use.screenshotKey, null);
  assert.equal(use.screenshotReviewed, true);
});

test('leaves wholly unreviewed videos unchanged but rejects any partially reviewed video', () => {
  const records = recordsFixture();
  const untouchedReview = reviewFixture();
  untouchedReview.records[0].durationSeconds = null;
  untouchedReview.records[0].status = 'unreviewed';
  untouchedReview.records[0].steps.forEach((step) => {
    step.status = 'unreviewed';
    step.startSeconds = null;
  });
  untouchedReview.records[0].cases[0] = {
    useId: PUBLIC_USE_ID,
    stepIndex: null,
    status: 'unreviewed',
    startSeconds: null,
    screenshotReviewed: false,
    screenshotKey: null
  };

  const untouched = applyReview({
    records,
    review: untouchedReview,
    publicUseIds: [PUBLIC_USE_ID],
    reviewedAt: '2026-08-14'
  });
  assert.deepEqual(untouched.records, records);
  assert.deepEqual(untouched.report.changedRecordIds, []);

  const partialReview = reviewFixture();
  partialReview.records[0].status = 'in-progress';
  partialReview.records[0].steps[1].status = 'unreviewed';
  partialReview.records[0].steps[1].startSeconds = null;
  assert.throws(
    () => applyReview({ records, review: partialReview, publicUseIds: [PUBLIC_USE_ID], reviewedAt: '2026-08-14' }),
    /all steps must be reviewed/i
  );
});

test('rejects stale identities, candidate-only times, and incomplete public case sets', () => {
  const records = recordsFixture();
  const staleReview = reviewFixture();
  staleReview.records[0].steps[0].name = 'Stale step';
  assert.throws(
    () => applyReview({ records, review: staleReview, publicUseIds: [PUBLIC_USE_ID], reviewedAt: '2026-08-14' }),
    /step identity mismatch/i
  );

  const candidateReview = reviewFixture();
  candidateReview.records[0].status = 'in-progress';
  candidateReview.records[0].steps[0].status = 'unreviewed';
  assert.throws(
    () => applyReview({ records, review: candidateReview, publicUseIds: [PUBLIC_USE_ID], reviewedAt: '2026-08-14' }),
    /human confirmation required/i
  );

  const missingCaseReview = reviewFixture();
  missingCaseReview.records[0].cases = [];
  assert.throws(
    () => applyReview({ records, review: missingCaseReview, publicUseIds: [PUBLIC_USE_ID], reviewedAt: '2026-08-14' }),
    /public case identity mismatch/i
  );
});

test('validateReview rejects out-of-duration values and invalid reviewed dates', () => {
  const outOfRange = reviewFixture();
  outOfRange.records[0].steps[0].startSeconds = 90;
  assert.throws(() => validateReview(outOfRange), /less than durationSeconds/i);
  assert.throws(
    () => applyReview({
      records: recordsFixture(),
      review: reviewFixture(),
      publicUseIds: [PUBLIC_USE_ID],
      reviewedAt: '2026-02-30'
    }),
    /reviewedAt/i
  );
});

test('dry-run writes the exact report without changing index.html and write updates records', async (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'timeline-apply-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const work = path.join(root, '.work', 'timeline-review');
  fs.mkdirSync(work, { recursive: true });
  const indexPath = path.join(root, 'index.html');
  const reviewPath = path.join(work, 'review.json');
  const reportPath = path.join(work, 'apply-report.json');
  const originalHtml = htmlFixture(recordsFixture());
  fs.writeFileSync(indexPath, originalHtml, 'utf8');
  fs.writeFileSync(reviewPath, `${JSON.stringify(reviewFixture(), null, 2)}\n`, 'utf8');

  const dryRun = await runCli([
    '--index', indexPath,
    '--review', reviewPath,
    '--dry-run',
    '--report', reportPath
  ], {
    publicUseIds: [PUBLIC_USE_ID],
    reviewedAt: '2026-08-14',
    stdout: { write() {} }
  });

  assert.equal(fs.readFileSync(indexPath, 'utf8'), originalHtml);
  assert.deepEqual(JSON.parse(fs.readFileSync(reportPath, 'utf8')), dryRun.report);
  assert.deepEqual(Object.keys(dryRun.report), [
    'recordsReviewed',
    'stepsTimed',
    'publicCasesMapped',
    'screenshotCasesReviewed',
    'failures',
    'changedRecordIds'
  ]);

  await runCli([
    '--index', indexPath,
    '--review', reviewPath,
    '--write'
  ], {
    publicUseIds: [PUBLIC_USE_ID],
    reviewedAt: '2026-08-14',
    stdout: { write() {} }
  });
  const writtenRecords = siteData.parse(fs.readFileSync(indexPath, 'utf8')).records;
  assert.equal(writtenRecords[0].timeline.reviewedAt, '2026-08-14');
  assert.equal(writtenRecords[0].effectUses[0].id, PUBLIC_USE_ID);
});

test('CLI rejects paths outside the fixed repository review workspace', async (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'timeline-apply-paths-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const indexPath = path.join(root, 'index.html');
  const outsideReview = path.join(root, 'review.json');
  fs.writeFileSync(indexPath, htmlFixture(recordsFixture()), 'utf8');
  fs.writeFileSync(outsideReview, JSON.stringify(reviewFixture()), 'utf8');

  await assert.rejects(
    runCli(['--index', indexPath, '--review', outsideReview, '--dry-run'], {
      publicUseIds: [PUBLIC_USE_ID], reviewedAt: '2026-08-14', stdout: { write() {} }
    }),
    /\.work[\\/]timeline-review[\\/]review\.json/i
  );
});
