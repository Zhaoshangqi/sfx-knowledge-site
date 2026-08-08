const assert = require("node:assert/strict");
const test = require("node:test");

const { selectDebugTarget, selectReferenceCard } = require("../tools/verify-plugin-reference-ui.cjs");

test("selects the local knowledge page when an extension target appears first", () => {
  const extension = {
    type: "background_page",
    url: "chrome-extension://example/background.html",
    webSocketDebuggerUrl: "ws://extension",
  };
  const localPage = {
    type: "page",
    url: "http://127.0.0.1:8891/",
    webSocketDebuggerUrl: "ws://knowledge-page",
  };

  assert.equal(selectDebugTarget([extension, localPage]), localPage);
});

test("selects the stable plugin-reference fixture instead of a broad text match", () => {
  const incidentalMatch = {
    dataset: { id: "yt-new-record" },
    textContent: "新增素材分析",
  };
  const referenceFixture = {
    dataset: { id: "upy3d1em" },
    textContent: "Noah Sitrin：Boom 素材长插件链重设计",
  };

  assert.equal(selectReferenceCard([incidentalMatch, referenceFixture]), referenceFixture);
});
