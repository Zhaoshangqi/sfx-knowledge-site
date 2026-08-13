const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

function read(relativePath) {
  return fs.readFileSync(path.resolve(__dirname, "..", relativePath), "utf8");
}

function sourceSlice(source, startMarker, endMarker) {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start);
  assert.notEqual(start, -1, `missing ${startMarker}`);
  assert.notEqual(end, -1, `missing ${endMarker} boundary`);
  return source.slice(start, end);
}

function inlineCss(html) {
  const match = html.match(/<style>([\s\S]*?)<\/style>/);
  assert.ok(match, "missing inline stylesheet");
  return match[1];
}

function normalizeCssPrelude(value) {
  return value.replace(/\s+/g, " ").trim();
}

function cssBlocks(source) {
  const blocks = [];
  let cursor = 0;

  while (cursor < source.length) {
    const open = source.indexOf("{", cursor);
    if (open === -1) break;

    const rawPrelude = source.slice(cursor, open);
    const preludeOffset = rawPrelude.search(/\S/);
    const prelude = normalizeCssPrelude(rawPrelude);
    let depth = 1;
    let close = open + 1;

    while (close < source.length && depth > 0) {
      if (source[close] === "{") depth += 1;
      if (source[close] === "}") depth -= 1;
      close += 1;
    }

    assert.equal(depth, 0, `unclosed CSS block ${prelude}`);
    if (prelude) {
      blocks.push({
        prelude,
        body: source.slice(open + 1, close - 1),
        start: cursor + Math.max(preludeOffset, 0),
        end: close
      });
    }
    cursor = close;
  }

  return blocks;
}

function cssSelectors(block) {
  return block.prelude.split(",").map(normalizeCssPrelude);
}

function cssRule(source, selector) {
  const normalizedSelector = normalizeCssPrelude(selector);
  const blocks = cssBlocks(source).filter((candidate) =>
    !candidate.prelude.startsWith("@") && cssSelectors(candidate).includes(normalizedSelector)
  );
  assert.ok(blocks.length > 0, `missing CSS rule ${selector}`);
  return {
    prelude: blocks[0].prelude,
    body: blocks.map((block) => block.body).join(";\n"),
    start: blocks[0].start,
    end: blocks[blocks.length - 1].end
  };
}

function cssMedia(source, query) {
  const expectedPrelude = normalizeCssPrelude(`@media ${query}`);
  const block = cssBlocks(source).find((candidate) => candidate.prelude === expectedPrelude);
  assert.ok(block, `missing CSS media block ${query}`);
  return block;
}

function cssDeclarationEntries(block) {
  return block.body
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .split(";")
    .flatMap((entry) => {
      const separator = entry.indexOf(":");
      if (separator === -1) return [];
      const property = entry.slice(0, separator).trim().toLowerCase();
      const value = entry.slice(separator + 1).trim();
      return property ? [{ property, value }] : [];
    });
}

function cssDeclarations(block) {
  return cssDeclarationEntries(block).reduce((declarations, { property, value }) => {
    declarations[property] = value;
    return declarations;
  }, {});
}

function assertCssDeclarations(block, expected) {
  const declarations = cssDeclarations(block);
  Object.entries(expected).forEach(([property, value]) => {
    assert.equal(declarations[property], value, `${block.prelude} must set ${property}: ${value}`);
  });
  return declarations;
}

const APPROVED_CAPTION_OVERLAY_DECLARATIONS = {
  display: "block",
  position: "absolute",
  left: "50%",
  bottom: "clamp(56px, 10%, 84px)",
  "z-index": "4",
  width: "max-content",
  "max-width": "86%",
  margin: "0",
  padding: "6px 10px",
  "border-radius": "4px",
  color: "#fff",
  background: "rgba(9, 11, 12, 0.76)",
  transform: "translateX(-50%)",
  "text-align": "center",
  "overflow-wrap": "anywhere",
  "text-shadow": "0 1px 2px rgba(0, 0, 0, 0.75)",
  "font-size": "16px",
  "line-height": "1.45",
  "font-weight": "800",
  "pointer-events": "none"
};

function assertApprovedCaptionOverlay(source) {
  return assertCssDeclarations(
    cssRule(source, ".video-caption-overlay"),
    APPROVED_CAPTION_OVERLAY_DECLARATIONS
  );
}

function allCssRules(source) {
  return cssBlocks(source).flatMap((block) =>
    block.prelude.startsWith("@") ? allCssRules(block.body) : [block]
  );
}

const BASE_OVERLAY_SELECTOR = ".video-caption-overlay";
const EMPTY_OVERLAY_SELECTOR = ".video-caption-overlay:empty";
const HIDDEN_OVERLAY_SELECTOR = ".subtitles-hidden .video-caption-overlay";
const FULLSCREEN_OVERLAY_SELECTOR = ".video-player:fullscreen .video-caption-overlay";
const APPROVED_VISUAL_OVERLAY_SELECTORS = new Set([
  BASE_OVERLAY_SELECTOR,
  EMPTY_OVERLAY_SELECTOR,
  HIDDEN_OVERLAY_SELECTOR,
  FULLSCREEN_OVERLAY_SELECTOR
]);
const BASE_OVERLAY_PROPERTIES = new Set(Object.keys(APPROVED_CAPTION_OVERLAY_DECLARATIONS));
const HIDDEN_OVERLAY_PROPERTIES = new Set(["display"]);
const FULLSCREEN_OVERLAY_PROPERTIES = new Set(["bottom", "max-width", "padding", "font-size"]);
const RESPONSIVE_OVERLAY_PROPERTIES = new Set(["bottom", "max-width", "font-size"]);
const TOP_LEVEL_OVERLAY_PROPERTIES = new Map([
  [BASE_OVERLAY_SELECTOR, BASE_OVERLAY_PROPERTIES],
  [EMPTY_OVERLAY_SELECTOR, HIDDEN_OVERLAY_PROPERTIES],
  [HIDDEN_OVERLAY_SELECTOR, HIDDEN_OVERLAY_PROPERTIES],
  [FULLSCREEN_OVERLAY_SELECTOR, FULLSCREEN_OVERLAY_PROPERTIES]
]);
const RESPONSIVE_OVERLAY_SELECTOR_PROPERTIES = new Map([
  [BASE_OVERLAY_SELECTOR, RESPONSIVE_OVERLAY_PROPERTIES],
  [FULLSCREEN_OVERLAY_SELECTOR, RESPONSIVE_OVERLAY_PROPERTIES]
]);
const APPROVED_OVERLAY_MEDIA_SCOPES = new Map([
  ["@media (max-width: 640px)", RESPONSIVE_OVERLAY_SELECTOR_PROPERTIES],
  ["@media (orientation: landscape) and (max-height: 520px)", RESPONSIVE_OVERLAY_SELECTOR_PROPERTIES]
]);
const OVERLAY_CLIPPING_PROPERTIES = new Set([
  "overflow",
  "overflow-x",
  "overflow-y",
  "max-height",
  "clip",
  "clip-path",
  "white-space",
  "height",
  "-webkit-line-clamp",
  "text-overflow"
]);
const OVERLAY_PROTECTED_PROPERTIES = new Set([
  ...BASE_OVERLAY_PROPERTIES,
  ...FULLSCREEN_OVERLAY_PROPERTIES,
  ...RESPONSIVE_OVERLAY_PROPERTIES,
  ...OVERLAY_CLIPPING_PROPERTIES
]);
const ALTERNATE_OVERLAY_ALLOWED_PROPERTIES = new Set(["box-sizing"]);
const REPRESENTATIVE_OVERLAY_NODES = [
  { tag: "html", parent: null, pseudos: ["root"] },
  { tag: "body", parent: 0 },
  { tag: "main", parent: 1, id: "appMain" },
  { tag: "section", parent: 2, id: "readerView", classes: ["reader-view"] },
  { tag: "article", parent: 3, id: "detail", classes: ["detail", "reader-detail"] },
  { tag: "div", parent: 4, classes: ["detail-body"] },
  { tag: "div", parent: 5, classes: ["section", "video-player-section"] },
  {
    tag: "section",
    parent: 6,
    classes: ["video-player", "subtitles-hidden"],
    attributes: {
      "data-youtube-caption-player": "",
      "data-video-id": "fixture-video",
      "data-subtitle-status": "reviewed"
    },
    pseudos: ["fullscreen"]
  },
  { tag: "div", parent: 7, classes: ["video-player-stage"] },
  {
    tag: "button",
    parent: 8,
    classes: ["video-player-cover"],
    attributes: { "data-player-cover": "", type: "button" }
  },
  {
    tag: "div",
    parent: 8,
    id: "youtube-caption-player-fixture",
    classes: ["video-player-target"],
    attributes: { "data-player-target": "" }
  },
  {
    tag: "p",
    parent: 8,
    classes: ["video-caption-overlay"],
    attributes: { "data-caption-overlay": "", "aria-hidden": "true" },
    pseudos: ["empty"]
  },
  {
    tag: "p",
    parent: 8,
    classes: ["video-player-error"],
    attributes: { "data-player-error": "", role: "status", hidden: "" }
  }
].map((node) => ({
  ...node,
  classes: new Set(node.classes || []),
  attributes: node.attributes || {},
  pseudos: new Set(node.pseudos || [])
}));
const REPRESENTATIVE_OVERLAY_INDEX = 11;

function selectorContainsVisualOverlay(selector) {
  return /\.video-caption-overlay(?![-\w])/.test(selector);
}

function splitSelectorChain(selector) {
  const compounds = [];
  const combinators = [];
  let buffer = "";
  let pendingCombinator = null;
  let bracketDepth = 0;
  let parenthesisDepth = 0;
  let quote = null;

  function flushCompound() {
    const compound = buffer.trim();
    if (!compound) return;
    if (compounds.length > 0) combinators.push(pendingCombinator || " ");
    compounds.push(compound);
    buffer = "";
    pendingCombinator = null;
  }

  for (let index = 0; index < selector.length; index += 1) {
    const character = selector[index];
    if (quote) {
      buffer += character;
      if (character === quote && selector[index - 1] !== "\\") quote = null;
      continue;
    }
    if (character === '"' || character === "'") {
      quote = character;
      buffer += character;
      continue;
    }
    if (character === "[") bracketDepth += 1;
    if (character === "]") bracketDepth -= 1;
    if (character === "(") parenthesisDepth += 1;
    if (character === ")") parenthesisDepth -= 1;

    if (bracketDepth === 0 && parenthesisDepth === 0 && /[>+~]/.test(character)) {
      flushCompound();
      pendingCombinator = character;
      continue;
    }
    if (bracketDepth === 0 && parenthesisDepth === 0 && /\s/.test(character)) {
      flushCompound();
      if (compounds.length > 0 && pendingCombinator === null) pendingCombinator = " ";
      continue;
    }
    buffer += character;
  }
  flushCompound();
  return { compounds, combinators };
}

function nodeAttribute(node, name) {
  if (name === "id") return node.id;
  if (name === "class") return [...node.classes].join(" ");
  return node.attributes[name];
}

function attributeMatchesNode(expression, node) {
  const match = expression.match(
    /^\s*([-\w:]+)\s*(?:(~=|\|=|\^=|\$=|\*=|=)\s*(?:"([^"]*)"|'([^']*)'|([^\s]+)))?\s*(?:[iIsS])?\s*$/
  );
  if (!match) return false;
  const [, name, operator, doubleQuoted, singleQuoted, bare] = match;
  const actual = nodeAttribute(node, name);
  if (actual === undefined) return false;
  if (!operator) return true;
  const expected = doubleQuoted ?? singleQuoted ?? bare ?? "";
  if (operator === "=") return actual === expected;
  if (operator === "~=") return actual.split(/\s+/).includes(expected);
  if (operator === "|=") return actual === expected || actual.startsWith(`${expected}-`);
  if (operator === "^=") return actual.startsWith(expected);
  if (operator === "$=") return actual.endsWith(expected);
  return actual.includes(expected);
}

function compoundMatchesNode(compound, node) {
  if (/::[-\w]+/.test(compound)) return false;
  let remainder = compound;
  const attributes = [];
  remainder = remainder.replace(/\[([^\]]+)\]/g, (_, expression) => {
    attributes.push(expression);
    return "";
  });
  if (!attributes.every((attribute) => attributeMatchesNode(attribute, node))) return false;

  const functionalPseudo = remainder.match(/:([-\w]+)\s*\(/);
  if (functionalPseudo) {
    throw new Error(`unsupported functional pseudo :${functionalPseudo[1]}()`);
  }
  const pseudos = [];
  remainder = remainder.replace(/:([-\w]+)/g, (_, name) => {
    pseudos.push(name.toLowerCase());
    return "";
  });
  for (const pseudo of pseudos) {
    if (["empty", "fullscreen", "root"].includes(pseudo) && !node.pseudos.has(pseudo)) return false;
    if (["first-child", "last-child", "only-child"].includes(pseudo)) return false;
  }

  const ids = [...remainder.matchAll(/#([-\w]+)/g)].map((match) => match[1]);
  if (ids.some((id) => node.id !== id)) return false;
  const classes = [...remainder.matchAll(/\.([-\w]+)/g)].map((match) => match[1]);
  if (classes.some((className) => !node.classes.has(className))) return false;

  remainder = remainder.replace(/#[-\w]+|\.[-\w]+/g, "").trim();
  return remainder === "" || remainder === "*" || remainder.toLowerCase() === node.tag;
}

function previousSiblingIndices(nodeIndex) {
  const parent = REPRESENTATIVE_OVERLAY_NODES[nodeIndex].parent;
  return REPRESENTATIVE_OVERLAY_NODES
    .map((node, index) => ({ node, index }))
    .filter((candidate) => candidate.index < nodeIndex && candidate.node.parent === parent)
    .map((candidate) => candidate.index)
    .reverse();
}

function relatedNodeIndex(nodeIndex, combinator, compound) {
  if (combinator === ">") {
    const parent = REPRESENTATIVE_OVERLAY_NODES[nodeIndex].parent;
    return parent !== null && compoundMatchesNode(compound, REPRESENTATIVE_OVERLAY_NODES[parent])
      ? parent
      : -1;
  }

  if (combinator === "+") {
    const previousSibling = previousSiblingIndices(nodeIndex)[0];
    return previousSibling !== undefined &&
      compoundMatchesNode(compound, REPRESENTATIVE_OVERLAY_NODES[previousSibling])
      ? previousSibling
      : -1;
  }

  if (combinator === "~") {
    return previousSiblingIndices(nodeIndex).find((siblingIndex) =>
      compoundMatchesNode(compound, REPRESENTATIVE_OVERLAY_NODES[siblingIndex])
    ) ?? -1;
  }

  let ancestor = REPRESENTATIVE_OVERLAY_NODES[nodeIndex].parent;
  while (ancestor !== null) {
    if (compoundMatchesNode(compound, REPRESENTATIVE_OVERLAY_NODES[ancestor])) return ancestor;
    ancestor = REPRESENTATIVE_OVERLAY_NODES[ancestor].parent;
  }
  return -1;
}

function selectorMatchesRepresentativeOverlay(selector) {
  const { compounds, combinators } = splitSelectorChain(selector);
  if (compounds.length === 0) return false;
  let nodeIndex = REPRESENTATIVE_OVERLAY_INDEX;
  if (!compoundMatchesNode(compounds[compounds.length - 1], REPRESENTATIVE_OVERLAY_NODES[nodeIndex])) {
    return false;
  }

  for (let compoundIndex = compounds.length - 2; compoundIndex >= 0; compoundIndex -= 1) {
    nodeIndex = relatedNodeIndex(nodeIndex, combinators[compoundIndex], compounds[compoundIndex]);
    if (nodeIndex < 0) return false;
  }
  return true;
}

function visualOverlayBlocks(source) {
  return cssBlocks(source).filter((block) =>
    !block.prelude.startsWith("@") && cssSelectors(block).some(selectorMatchesRepresentativeOverlay)
  );
}

function normalizedCssValue(value) {
  return value === undefined
    ? undefined
    : value.replace(/\s*!important\s*$/i, "").trim().toLowerCase();
}

function assertVisualOverlayBlockNonClipping(block) {
  cssDeclarationEntries(block).forEach(({ property, value }) => {
    const normalizedValue = normalizedCssValue(value);
    if (["overflow", "overflow-x", "overflow-y"].includes(property)) {
      const clipsText = normalizedValue?.split(/\s+/)
        .some((token) => token === "hidden" || token === "clip") || false;
      assert.equal(clipsText, false, `${block.prelude} must not hide or clip overflow with ${property}`);
    }
    if (property === "max-height") {
      assert.equal(normalizedValue, "none", `${block.prelude} must leave max-height unconstrained`);
    }
    assert.notEqual(property, "clip", `${block.prelude} must not set clip`);
    assert.notEqual(property, "clip-path", `${block.prelude} must not set clip-path`);
    if (property === "white-space") {
      assert.notEqual(normalizedValue, "nowrap", `${block.prelude} must allow subtitle wrapping`);
    }
    assert.notEqual(property, "-webkit-line-clamp", `${block.prelude} must not clamp lines`);
    if (property === "text-overflow") {
      const ellipsizesText = normalizedValue?.split(/\s+/).includes("ellipsis") || false;
      assert.equal(ellipsizesText, false, `${block.prelude} must not ellipsize text`);
    }
    assert.notEqual(property, "height", `${block.prelude} must not use a fixed height`);
  });
}

function assertVisualOverlayNonClipping(source) {
  const blocks = visualOverlayBlocks(source);
  assert.ok(blocks.length > 0, "missing visual caption overlay rule");
  blocks.forEach(assertVisualOverlayBlockNonClipping);
}

function visualOverlayScopeProfiles(source) {
  const scopes = [{
    name: "top-level",
    source,
    selectorProperties: TOP_LEVEL_OVERLAY_PROPERTIES
  }];

  cssBlocks(source)
    .filter((block) => block.prelude.startsWith("@") && visualOverlayBlocks(block.body).length > 0)
    .forEach((block) => {
      const selectorProperties = APPROVED_OVERLAY_MEDIA_SCOPES.get(block.prelude);
      assert.ok(selectorProperties, `unapproved visual caption overlay scope ${block.prelude}`);
      scopes.push({ name: block.prelude, source: block.body, selectorProperties });
    });

  return scopes;
}

function assertVisualOverlayScope(scope) {
  visualOverlayBlocks(scope.source).forEach((block) => {
    const selectors = cssSelectors(block).filter(selectorMatchesRepresentativeOverlay);

    const entries = cssDeclarationEntries(block);
    entries.forEach(({ value }) => {
      assert.doesNotMatch(value, /!\s*important\b/i, `${block.prelude} must not use !important`);
    });
    assertVisualOverlayBlockNonClipping(block);

    selectors.forEach((selector) => {
      if (!selectorContainsVisualOverlay(selector)) {
        entries.forEach(({ property }) => {
          assert.ok(
            ALTERNATE_OVERLAY_ALLOWED_PROPERTIES.has(property) &&
              !OVERLAY_PROTECTED_PROPERTIES.has(property),
            `${selector} must not set protected property ${property} on the visual caption overlay`
          );
        });
        return;
      }

      assert.ok(
        APPROVED_VISUAL_OVERLAY_SELECTORS.has(selector) && scope.selectorProperties.has(selector),
        `unapproved visual caption overlay selector ${selector} in ${scope.name}`
      );
      const allowedProperties = scope.selectorProperties.get(selector);
      const contract = scope.name === "top-level" && selector === BASE_OVERLAY_SELECTOR
        ? "approved base properties"
        : "approved modifier properties";
      entries.forEach(({ property, value }) => {
        assert.ok(
          allowedProperties.has(property),
          `${selector} may only set ${contract}; found ${property}`
        );
        if (selector === EMPTY_OVERLAY_SELECTOR || selector === HIDDEN_OVERLAY_SELECTOR) {
          assert.equal(normalizedCssValue(value), "none", `${selector} must set display: none`);
        }
      });
    });
  });
}

function assertVisualOverlayCascade(source) {
  visualOverlayScopeProfiles(source).forEach(assertVisualOverlayScope);
}

test("CSS rule lookup applies every exact selector match in source order", () => {
  const rule = cssRule(
    ".demo { left: 50%; display: block; } .demo { left: 0; }",
    ".demo"
  );

  assert.deepEqual(cssDeclarations(rule), { left: "0", display: "block" });
});

test("CSS rule lookup keeps media declarations in their own effective scope", () => {
  const css = [
    ".demo { left: 50%; }",
    "@media (max-width: 640px) {",
    "  .demo { left: 25%; display: block; }",
    "  .demo { left: 0; }",
    "}"
  ].join("\n");
  const media = cssMedia(css, "(max-width: 640px)");

  assert.deepEqual(cssDeclarations(cssRule(css, ".demo")), { left: "50%" });
  assert.deepEqual(cssDeclarations(cssRule(media.body, ".demo")), {
    left: "0",
    display: "block"
  });
});

test("approved caption overlay contract catches a late positional override", () => {
  const css = inlineCss(read("index.html"));

  assert.throws(
    () => assertApprovedCaptionOverlay(`${css}\n.video-caption-overlay { left: 0; }`),
    /must set left: 50%/
  );
});

test("visual caption overlay guard rejects effective clipping declarations", () => {
  const css = inlineCss(read("index.html"));
  const mutations = [
    ["overflow: hidden; max-height: 1px;", /must not hide or clip overflow/],
    ["overflow-x: clip;", /must not hide or clip overflow/],
    ["overflow-y: hidden;", /must not hide or clip overflow/],
    ["max-height: 1px;", /must leave max-height unconstrained/],
    ["clip: rect(0 0 0 0);", /must not set clip/],
    ["clip-path: inset(50%);", /must not set clip-path/],
    ["white-space: nowrap;", /must allow subtitle wrapping/],
    ["height: 1px;", /must not use a fixed height/],
    ["-webkit-line-clamp: 2;", /must not clamp lines/],
    ["text-overflow: ellipsis;", /must not ellipsize text/]
  ];

  mutations.forEach(([declarations, error]) => {
    assert.throws(
      () => assertVisualOverlayNonClipping(
        `${css}\n.video-caption-overlay { ${declarations} }`
      ),
      error
    );
  });
  assert.throws(
    () => assertVisualOverlayCascade([
      ".video-caption-overlay { overflow: hidden; }",
      ".video-caption-overlay { overflow: visible; }",
      css
    ].join("\n")),
    /must not hide or clip overflow/
  );
});

test("visual caption overlay guard rejects competing selectors", () => {
  const css = inlineCss(read("index.html"));

  assert.throws(
    () => assertVisualOverlayCascade(
      `${css}\n.video-player-stage .video-caption-overlay { left: 0; }`
    ),
    /unapproved visual caption overlay selector/
  );
});

test("representative overlay matcher covers alternate selectors without unrelated paragraphs", () => {
  [
    "[data-caption-overlay]",
    "p",
    "*",
    "p.video-caption-overlay",
    ".video-player-stage > [data-caption-overlay]",
    ".video-player-target + .video-caption-overlay",
    ".video-player-cover ~ [data-caption-overlay]",
    ".video-player [aria-hidden=\"true\"]",
    ".reader-detail .video-player-stage p"
  ].forEach((selector) => assert.equal(selectorMatchesRepresentativeOverlay(selector), true, selector));

  [
    ".hero p",
    ".reader-detail .step p",
    ".section-head > p:last-child",
    ".video-player-cover + .video-caption-overlay",
    "button"
  ].forEach((selector) => assert.equal(selectorMatchesRepresentativeOverlay(selector), false, selector));
});

test("representative overlay matcher fails closed for unsupported functional pseudos", () => {
  [":is(.hero p)", ":where([data-caption-overlay])", ":not(.hero p)"].forEach((selector) => {
    assert.throws(
      () => selectorMatchesRepresentativeOverlay(selector),
      /unsupported functional pseudo/
    );
  });
});

test("visual caption overlay guard rejects alternate matching selector mutations", () => {
  const css = inlineCss(read("index.html"));
  const mutations = [
    ["[data-caption-overlay] { left: 0; }", /must not set protected property left/],
    [
      "[data-caption-overlay] { overflow: hidden; max-height: 1px; }",
      /must not hide or clip overflow/
    ],
    ["p { overflow: hidden !important; }", /must not use !important/],
    ["* { left: 0; }", /must not set protected property left/],
    ["p.video-caption-overlay { left: 0; }", /unapproved visual caption overlay selector/],
    [".video-player-stage > p { left: 0; }", /must not set protected property left/],
    [".video-player [data-caption-overlay] { left: 0; }", /must not set protected property left/],
    [
      ".video-player-target + .video-caption-overlay { left: 0; }",
      /unapproved visual caption overlay selector/
    ],
    [
      ".video-player-cover ~ [data-caption-overlay] { left: 0; }",
      /must not set protected property left/
    ],
    [".hero p, [data-caption-overlay] { left: 0; }", /must not set protected property left/]
  ];

  mutations.forEach(([rule, error]) => {
    assert.throws(() => assertVisualOverlayCascade(`${css}\n${rule}`), error);
  });
});

test("visual caption overlay guard rejects important declarations before later safe values", () => {
  const css = inlineCss(read("index.html"));
  const mutations = [
    `.video-caption-overlay { left: 0 !important; }\n${css}`,
    [
      ".video-caption-overlay { overflow: hidden !important; }",
      ".video-caption-overlay { overflow: visible; }",
      css
    ].join("\n")
  ];

  mutations.forEach((mutation) => {
    assert.throws(
      () => assertVisualOverlayCascade(mutation),
      /must not use !important/
    );
  });
});

test("visual caption overlay modifiers reject extra properties and hidden-state values", () => {
  const css = inlineCss(read("index.html"));
  const mutations = [
    [`${css}\n.video-caption-overlay { top: 0; }`, /may only set approved base properties/],
    [[
      `${css}\n.video-caption-overlay:empty,`,
      ".subtitles-hidden .video-caption-overlay { display: none; left: 0; }"
    ].join("\n"), /may only set/],
    [[
      `${css}\n.video-caption-overlay:empty,`,
      ".subtitles-hidden .video-caption-overlay { display: block; }"
    ].join("\n"), /must set display: none/],
    [[
      css,
      ".video-player:fullscreen .video-caption-overlay { left: 0; }"
    ].join("\n"), /may only set/],
    [[
      css,
      "@media (max-width: 640px) { .video-caption-overlay { padding: 0; } }"
    ].join("\n"), /may only set/],
    [[
      css,
      "@media (max-width: 640px) {",
      "  .video-player:fullscreen .video-caption-overlay { padding: 0; }",
      "}"
    ].join("\n"), /may only set/],
    [[
      css,
      "@media (orientation: landscape) and (max-height: 520px) {",
      "  .video-caption-overlay,",
      "  .video-player:fullscreen .video-caption-overlay { padding: 0; }",
      "}"
    ].join("\n"), /may only set/]
  ];

  mutations.forEach(([source, error]) => {
    assert.throws(() => assertVisualOverlayCascade(source), error);
  });
});

test("site captions use a centered text-only overlay inside the video stage", () => {
  const css = inlineCss(read("index.html"));

  assertApprovedCaptionOverlay(css);
});

test("empty captions and CC-off state hide the overlay while the live region stays assistive-only", () => {
  const css = inlineCss(read("index.html"));
  const hiddenOverlay = cssRule(css, ".video-caption-overlay:empty");
  const captionLine = cssRule(css, ".video-caption-line");
  const stage = cssRule(css, ".video-player-stage");

  assert.deepEqual(cssSelectors(hiddenOverlay), [
    ".video-caption-overlay:empty",
    ".subtitles-hidden .video-caption-overlay"
  ]);
  assertCssDeclarations(hiddenOverlay, { display: "none" });
  const liveRegionDeclarations = assertCssDeclarations(captionLine, {
    position: "absolute",
    width: "1px",
    height: "1px",
    margin: "-1px",
    padding: "0",
    overflow: "hidden",
    "clip-path": "inset(50%)",
    "white-space": "nowrap",
    border: "0"
  });
  assert.equal(liveRegionDeclarations["min-height"], undefined);
  assertCssDeclarations(stage, { "aspect-ratio": "16 / 9" });
});

test("the native transcript disclosure is a compact utility row", () => {
  const css = inlineCss(read("index.html"));
  const disclosure = cssRule(css, ".video-transcript-disclosure");
  const summary = cssRule(css, ".video-transcript-disclosure > summary");
  const openSummary = cssRule(css, ".video-transcript-disclosure[open] > summary");
  const transcript = cssRule(css, ".video-transcript");

  const disclosureDeclarations = assertCssDeclarations(disclosure, {
    margin: "0",
    "border-top": "1px solid var(--line)",
    color: "var(--ink)",
    background: "var(--panel)"
  });
  const summaryDeclarations = assertCssDeclarations(summary, {
    padding: "8px 0",
    color: "var(--muted)",
    cursor: "pointer",
    "font-size": "12px",
    "line-height": "1.5",
    "font-weight": "800"
  });
  assertCssDeclarations(openSummary, {
    color: "var(--ink)",
    "border-bottom": "1px solid var(--line)"
  });
  assertCssDeclarations(transcript, { "border-top": "0" });
  assert.equal(disclosureDeclarations["border-radius"], undefined);
  assert.equal(disclosureDeclarations["box-shadow"], undefined);
  assert.equal(summaryDeclarations.display, undefined);
  assert.equal(summaryDeclarations["list-style"], undefined);
  assert.doesNotMatch(css, /summary::(?:-webkit-details-marker|marker)/);
});

test("fullscreen hides transcript utility rows", () => {
  const css = inlineCss(read("index.html"));
  const hiddenTranscript = cssRule(css, ".video-player:fullscreen .video-transcript-disclosure");

  assert.deepEqual(cssSelectors(hiddenTranscript), [
    ".video-player:fullscreen .video-transcript-disclosure",
    ".video-player:fullscreen .video-transcript-empty"
  ]);
  assertCssDeclarations(hiddenTranscript, { display: "none" });
});

test("fullscreen captions retain the centered base surface", () => {
  const css = inlineCss(read("index.html"));
  const fullscreenOverlay = cssRule(css, ".video-player:fullscreen .video-caption-overlay");
  const declarations = assertCssDeclarations(fullscreenOverlay, {
    bottom: "clamp(72px, 8%, 112px)",
    "max-width": "84%",
    padding: "8px 12px",
    "font-size": "20px"
  });

  ["position", "left", "right", "z-index", "display", "width", "transform", "text-align", "background"]
    .forEach((property) => assert.equal(declarations[property], undefined, `fullscreen must inherit ${property}`));
});

test("narrow portrait layouts keep captions clear of player controls", () => {
  const css = inlineCss(read("index.html"));
  const mobile = cssMedia(css, "(max-width: 640px)");

  assertCssDeclarations(cssRule(mobile.body, ".video-caption-overlay"), {
    bottom: "clamp(44px, 12%, 64px)",
    "max-width": "92%",
    "font-size": "14px"
  });
  assertCssDeclarations(cssRule(mobile.body, ".video-player:fullscreen .video-caption-overlay"), {
    bottom: "clamp(56px, 10%, 80px)",
    "max-width": "92%",
    "font-size": "16px"
  });
  assert.equal(
    cssBlocks(mobile.body).some((block) => cssSelectors(block).includes(".video-caption-line")),
    false,
    "mobile CSS must not make the assistive live region visible"
  );
});

test("short landscape layouts override both normal and fullscreen caption offsets", () => {
  const css = inlineCss(read("index.html"));
  const mobile = cssMedia(css, "(max-width: 640px)");
  const landscape = cssMedia(css, "(orientation: landscape) and (max-height: 520px)");
  const fullscreenOverlay = cssRule(css, ".video-player:fullscreen .video-caption-overlay");
  const landscapeOverlay = cssRule(landscape.body, ".video-caption-overlay");

  assert.ok(landscape.start > mobile.end, "short-landscape rules must follow mobile rules");
  assert.ok(landscape.start > fullscreenOverlay.end, "short-landscape rules must follow fullscreen rules");
  assert.deepEqual(cssSelectors(landscapeOverlay), [
    ".video-caption-overlay",
    ".video-player:fullscreen .video-caption-overlay"
  ]);
  assertCssDeclarations(landscapeOverlay, {
    bottom: "clamp(48px, 12%, 72px)",
    "max-width": "92%",
    "font-size": "16px"
  });
});

test("caption and disclosure surfaces do not truncate subtitle text", () => {
  const css = inlineCss(read("index.html"));
  const transcriptRules = allCssRules(css).filter((block) => cssSelectors(block).some((selector) =>
    selector.includes(".video-transcript-disclosure") ||
    selector.includes(".video-transcript-empty") ||
    /(^|\s)\.video-transcript(?![-\w])/.test(selector)
  ));

  assertVisualOverlayCascade(css);
  assert.ok(transcriptRules.length > 0);
  transcriptRules.forEach((block) => {
    const declarations = cssDeclarations(block);
    assert.equal(declarations["-webkit-line-clamp"], undefined, `${block.prelude} must not clamp lines`);
    assert.notEqual(declarations["text-overflow"], "ellipsis", `${block.prelude} must not ellipsize text`);
    assert.equal(declarations.height, undefined, `${block.prelude} must not use a fixed height`);
  });
});

test("video cards scan compactly while full detail keeps its dry-goods order", () => {
  const html = read("index.html");
  const css = html.match(/<style>([\s\S]*?)<\/style>/)?.[1] || "";
  const gridRenderer = sourceSlice(html, "    function renderGrid() {", "    function showLibrary() {");
  const detailRenderer = sourceSlice(html, "    function renderDetail() {", "    function renderEffectDetail(effectId) {");
  const readerTitleRule = css.match(/\.reader-detail \.detail-title \{([\s\S]*?)\n    \}/)?.[1] || "";
  const mobileRules = css.match(/@media \(max-width: 640px\) \{([\s\S]*?)\n    \}/)?.[1] || "";

  assert.match(gridRenderer, /<h2 class="card-title">/);
  assert.match(gridRenderer, /escapeHtml\(record\.source\)/);
  assert.match(gridRenderer, /record\.steps\.length \+ ' 步 · ' \+ record\.plugins\.length \+ ' 处理点'/);
  assert.match(gridRenderer, /<p class="card-summary">' \+ escapeHtml\(record\.summary\)/);
  assert.doesNotMatch(gridRenderer, /更新 |updatedAt|addedAt|record\.steps\.length \+ ' 步骤'/);
  assert.match(css, /\.card-summary \{[\s\S]*?-webkit-line-clamp: 2;/);

  const headings = ["设计目标", "设计思路", "素材与分层", "完整制作流程", "完整效果链", "效果器用法", "关键决策与证据边界", "来源与关键词"];
  let previousIndex = -1;
  headings.forEach((heading) => {
    const index = detailRenderer.indexOf(`<h3>${heading}</h3>`);
    assert.ok(index > previousIndex, `${heading} must preserve detail order`);
    previousIndex = index;
  });
  assert.match(detailRenderer, /<span>更新 ' \+ escapeHtml\(record\.updatedAt \|\| record\.addedAt \|\| ""\)/);

  assert.match(readerTitleRule, /font-size: 48px;/);
  assert.doesNotMatch(readerTitleRule, /clamp\(|vw/);
  assert.match(css, /\.reader-detail \.section \{[\s\S]*?margin-top: 26px;/);
  assert.match(css, /\.video-player-section \{[\s\S]*?max-width: 980px;/);
  assert.match(css, /\.video-player-stage \{[\s\S]*?aspect-ratio: 16 \/ 9;/);
  assert.match(mobileRules, /\.reader-detail \.detail-title \{ font-size: 32px; \}/);
});

test("maintenance rules require effectUses instead of practiceChecklist", () => {
  const agents = read("AGENTS.md");
  const workflow = read("docs/learning-workflow.md");

  assert.match(agents, /`effectUses`：可选的结构化效果器实际用法/);
  assert.match(agents, /完整视频干货档案/);
  assert.match(agents, /不生成练习、作业、打卡、难度或预计学习时间/);
  assert.match(agents, /画面确认、作者口述、音频可辨、分析推断或视频未展示/);
  assert.doesNotMatch(agents, /practiceChecklist|练习清单/);

  assert.match(
    workflow,
    /materials, keywords, tips, chainFocus, parameterLogic, effectUses（可选）/
  );
  assert.match(workflow, /结构化效果器用法和证据边界/);
  assert.match(workflow, /完整视频干货档案/);
  assert.match(workflow, /不生成练习、作业、打卡、难度、预计学习时间或课程任务/);
  assert.match(workflow, /保留每一条有证据的制作决策、参数、路由、自动化动作、限制和失败尝试/);
  assert.match(workflow, /字幕只用于定位证据/);
  assert.doesNotMatch(workflow, /practiceChecklist|练习清单/);
});

test("the repository skill retrieves effect evidence rather than practice tasks", () => {
  const skill = read("skills/sfx-knowledge/SKILL.md");
  const learnings = read("skills/sfx-knowledge/references/video-learnings.md");

  assert.match(skill, /structured effect uses/);
  assert.match(skill, /omit exercises and course tasks/);
  assert.match(
    skill,
    /retain every evidenced production decision, parameter, route, automation move, limitation, and failed attempt/
  );
  assert.doesNotMatch(skill, /practice tasks/);
  assert.doesNotMatch(learnings, /迁移练习|输出弱\/中\/强三版|分析推断练习/);
});

test("the enrichment tool no longer generates practice fields or course suffixes", () => {
  const source = read("tools/enrich-sfx-records.cjs");

  assert.doesNotMatch(source, /practiceChecklist\s*:/);
  [
    /练习/,
    /复习/,
    /弱\/中\/强/,
    /3 个强度版本/,
    /A\/B 练习/,
    /复刻时/,
    /按效果链学习/,
    /教程式拆解/,
    /每次只调一个主要参数，记录听感变化/
  ].forEach((pattern) => assert.doesNotMatch(source, pattern));

  const indexPath = path.resolve(__dirname, "..", "index.html");
  const modulePath = require.resolve("../tools/enrich-sfx-records.cjs");
  const mtimeBeforeImport = fs.statSync(indexPath).mtimeMs;
  const originalReadFileSync = fs.readFileSync;
  const originalWriteFileSync = fs.writeFileSync;
  const writes = [];
  let indexReads = 0;
  let enrichment;
  let importError;

  delete require.cache[modulePath];
  fs.readFileSync = function guardedRead(file, ...args) {
    if (typeof file === "string" && path.resolve(file) === indexPath) {
      indexReads += 1;
      throw new Error("requiring enrichment must not read index.html");
    }
    return originalReadFileSync.call(this, file, ...args);
  };
  fs.writeFileSync = function guardedWrite(file, ...args) {
    writes.push(typeof file === "string" ? path.resolve(file) : String(file));
    throw new Error("requiring enrichment must not write files");
  };

  try {
    enrichment = require(modulePath);
  } catch (error) {
    importError = error;
  } finally {
    fs.readFileSync = originalReadFileSync;
    fs.writeFileSync = originalWriteFileSync;
  }

  assert.equal(fs.statSync(indexPath).mtimeMs, mtimeBeforeImport);
  assert.equal(indexReads, 0, "requiring the module must not read index.html");
  assert.deepEqual(writes, [], "requiring the module must not write any files");
  assert.ifError(importError);
  assert.equal(typeof enrichment.enrichLearning, "function");
  assert.equal(typeof enrichment.mergeEnrichedRecord, "function");
  assert.equal(typeof enrichment.detectPlugins, "function");
  assert.equal(typeof enrichment.extractParameterEvidence, "function");
  assert.equal(typeof enrichment.enrichRecord, "function");
  assert.equal(typeof enrichment.normalizeSettingFact, "function");
  assert.equal(typeof enrichment.runEnrichment, "function");

  const emptyRecord = {
    id: "fixture",
    videoId: "fixture-video",
    title: "Fixture",
    source: "Fixture Source",
    category: "scifi",
    steps: [],
    plugins: [],
    materials: [],
    chainFocus: [],
    parameterLogic: [],
    coreIdeas: [],
    tips: [],
    keywords: []
  };
  const falsePositiveTranscript = "In 2024 I changed the pitch, EQ and reverb for this layer.";

  assert.deepEqual(enrichment.detectPlugins(emptyRecord, falsePositiveTranscript), []);
  assert.deepEqual(enrichment.detectPlugins(emptyRecord, ""), []);
  assert.deepEqual(enrichment.enrichLearning(emptyRecord, [], ""), {
    chainFocus: [],
    parameterLogic: []
  });

  const existingPlugin = {
    name: "Existing EQ",
    purpose: "历史记录已有的处理",
    settings: ["历史参数"],
    evidenceTag: "legacy"
  };
  assert.deepEqual(
    enrichment.detectPlugins({ ...emptyRecord, plugins: [existingPlugin] }, falsePositiveTranscript),
    [existingPlugin]
  );

  const abletonVocoderPlugins = enrichment.detectPlugins(
    emptyRecord,
    "I opened Ableton Vocoder and set Bands 40."
  );
  assert.equal(abletonVocoderPlugins.length, 1);
  assert.equal(abletonVocoderPlugins[0].name, "Ableton Vocoder");
  assert.match(abletonVocoderPlugins[0].purpose, /需画面确认/);
  assert.deepEqual(enrichment.detectPlugins(emptyRecord, "I used a vocoder on this layer."), []);
  assert.deepEqual(enrichment.detectPlugins(emptyRecord, "I opened iZotope Vocoder."), []);

  const explicitPlugins = enrichment.detectPlugins(
    emptyRecord,
    "At 01:20 I opened Little AlterBoy. Formant -4 semitones and Mix 40%."
  );
  assert.equal(explicitPlugins.length, 1);
  assert.equal(explicitPlugins[0].name, "Little AlterBoy");
  assert.match(explicitPlugins[0].purpose, /需画面确认/);
  assert.ok(explicitPlugins[0].settings.length >= 1);
  assert.ok(explicitPlugins[0].settings.every((setting) => /字幕.*需画面确认/.test(setting)));
  assert.doesNotMatch(JSON.stringify(explicitPlugins), /可确认的数值|画面确认值|A\/B|旁路/);

  const nameOnlyPlugin = enrichment.detectPlugins(emptyRecord, "I opened Little AlterBoy.");
  const nameOnlyLearning = enrichment.enrichLearning(emptyRecord, nameOnlyPlugin, "");
  assert.equal(nameOnlyPlugin.length, 1);
  assert.doesNotMatch(JSON.stringify({ nameOnlyPlugin, nameOnlyLearning }), /A\/B|旁路|微调/);

  const parameterEvidence = enrichment.extractParameterEvidence(
    "In 2024 I changed pitch. Mix 40%, delay 120 ms, Bands 40, and take 7."
  );
  assert.ok(parameterEvidence.includes("Mix 40%"));
  assert.ok(parameterEvidence.includes("120 ms"));
  assert.ok(parameterEvidence.includes("Bands 40"));
  assert.doesNotMatch(JSON.stringify(parameterEvidence), /2024|take 7/);
  assert.deepEqual(enrichment.extractParameterEvidence("Pitch 2024 and chapter 7."), []);
  assert.deepEqual(
    enrichment.extractParameterEvidence("Bands 40? Mix 30%！ Formant -4…"),
    ["Bands 40?", "Mix 30%！", "Formant -4…"]
  );

  assert.equal(enrichment.normalizeSettingFact(" Bands 40? "), "Bands 40?");
  assert.equal(enrichment.normalizeSettingFact(" Mix 40%！ "), "Mix 40%！");
  assert.equal(enrichment.normalizeSettingFact(" Formant -4… "), "Formant -4…");
  assert.equal(enrichment.normalizeSettingFact(" Pitch -4... "), "Pitch -4...");
  assert.equal(enrichment.normalizeSettingFact(" Level 7.9 dB。； "), "Level 7.9 dB");

  const plugins = [
    {
      name: "Vocoder",
      purpose: "建立双路调制。",
      settings: ["  Bands 40?  ", " Level 7.9 dB。； "]
    },
    {
      name: "No Values",
      purpose: "保留证据边界。",
      settings: ["   ", "；；"]
    }
  ];
  const learning = enrichment.enrichLearning(
    { category: "scifi", materials: ["合成层"] },
    plugins,
    ""
  );

  assert.ok(learning.chainFocus.includes("1. Vocoder：建立双路调制。"));
  assert.ok(learning.parameterLogic.includes("Vocoder 参数逻辑：Bands 40?；Level 7.9 dB"));
  assert.equal(learning.parameterLogic.some((item) => item.startsWith("No Values 参数逻辑：")), false);
  assert.doesNotMatch(JSON.stringify(learning), /(?:。|\.|；|;)\s*；/);
  assert.doesNotMatch(JSON.stringify(learning), /A\/B|旁路|每次只调/);
  assert.equal(Object.prototype.hasOwnProperty.call(learning, "practiceChecklist"), false);

  const noEvidenceResult = enrichment.enrichRecord(emptyRecord, {
    forceAuto: true,
    transcript: falsePositiveTranscript
  });
  assert.strictEqual(noEvidenceResult.record, emptyRecord);
  assert.equal(noEvidenceResult.changed, false);
  assert.equal(noEvidenceResult.generated, 0);
  assert.equal(noEvidenceResult.status, "insufficient-evidence");

  const explicitResult = enrichment.enrichRecord(emptyRecord, {
    forceAuto: true,
    transcript: "I opened Little AlterBoy. Formant -4 semitones."
  });
  assert.equal(explicitResult.changed, true);
  assert.deepEqual(explicitResult.record.steps, []);
  assert.equal(explicitResult.record.plugins[0].name, "Little AlterBoy");
  assert.doesNotMatch(JSON.stringify(explicitResult.record), /EQ \/ modulation|A\/B|旁路/);

  const historicalChainFocus = ["人工链路：保留原始结构。", "人工链路：尾音单独控制。"];
  const historicalParameterLogic = ["人工参数：Mix 由画面确认。"];
  const historicalRecord = {
    ...emptyRecord,
    chainFocus: historicalChainFocus,
    parameterLogic: historicalParameterLogic
  };
  const historicalNoEvidenceResult = enrichment.enrichRecord(historicalRecord, {
    transcript: falsePositiveTranscript
  });
  assert.strictEqual(historicalNoEvidenceResult.record, historicalRecord);
  assert.strictEqual(historicalNoEvidenceResult.record.chainFocus, historicalChainFocus);
  assert.strictEqual(historicalNoEvidenceResult.record.parameterLogic, historicalParameterLogic);

  const appendedHistoryResult = enrichment.enrichRecord(historicalRecord, {
    transcript: "I opened Little AlterBoy. Formant -4 semitones."
  });
  const newChainFact = explicitResult.record.chainFocus[0];
  const newParameterFact = explicitResult.record.parameterLogic[0];
  assert.deepEqual(appendedHistoryResult.record.chainFocus, [
    ...historicalChainFocus,
    newChainFact
  ]);
  assert.deepEqual(appendedHistoryResult.record.parameterLogic, [
    ...historicalParameterLogic,
    newParameterFact
  ]);
  assert.deepEqual(historicalRecord.chainFocus, historicalChainFocus);
  assert.deepEqual(historicalRecord.parameterLogic, historicalParameterLogic);

  const duplicateChainFocus = [
    historicalChainFocus[0],
    newChainFact.replace("1. ", "1.  "),
    historicalChainFocus[1]
  ];
  const duplicateParameterLogic = [historicalParameterLogic[0], `  ${newParameterFact}  `];
  const deduplicatedHistoryResult = enrichment.enrichRecord(
    {
      ...historicalRecord,
      chainFocus: duplicateChainFocus,
      parameterLogic: duplicateParameterLogic
    },
    { transcript: "I opened Little AlterBoy. Formant -4 semitones." }
  );
  assert.deepEqual(deduplicatedHistoryResult.record.chainFocus, duplicateChainFocus);
  assert.deepEqual(deduplicatedHistoryResult.record.parameterLogic, duplicateParameterLogic);

  const legacyPractice = ["历史字段保持原样"];
  const mergeOptions = { steps: [], plugins, learning };
  const legacyMerged = enrichment.mergeEnrichedRecord(
    {
      title: "旧记录",
      coreIdeas: [],
      tips: [],
      keywords: [],
      practiceChecklist: legacyPractice
    },
    mergeOptions
  );
  const freshMerged = enrichment.mergeEnrichedRecord(
    { title: "新记录", coreIdeas: [], tips: [], keywords: [] },
    mergeOptions
  );

  assert.strictEqual(legacyMerged.practiceChecklist, legacyPractice);
  assert.equal(Object.prototype.hasOwnProperty.call(freshMerged, "practiceChecklist"), false);

  const fixtureHtml = [
    "<!doctype html>",
    "<script>",
    `const records = ${JSON.stringify([emptyRecord], null, 2)};`,
    "",
    "const imageManifest = {};",
    "const categoryById = {};",
    "</script>"
  ].join("\n");
  let writtenSite = "";
  let writtenReport;
  const orchestrationIo = [];
  const mtimeBeforeRun = fs.statSync(indexPath).mtimeMs;

  fs.readFileSync = function guardedOrchestrationRead(file, ...args) {
    if (typeof file === "string" && path.resolve(file) === indexPath) {
      orchestrationIo.push(`read:${path.resolve(file)}`);
      throw new Error("in-memory orchestration must not read index.html");
    }
    return originalReadFileSync.call(this, file, ...args);
  };
  fs.writeFileSync = function guardedOrchestrationWrite(file) {
    orchestrationIo.push(`write:${typeof file === "string" ? path.resolve(file) : String(file)}`);
    throw new Error("in-memory orchestration must not write files");
  };

  let runResult;
  try {
    runResult = enrichment.runEnrichment({
      html: fixtureHtml,
      forceAuto: true,
      enrichRecordOptions: { transcript: falsePositiveTranscript },
      writeSite(nextHtml) {
        writtenSite = nextHtml;
      },
      writeReport(payload) {
        writtenReport = payload;
      },
      log() {}
    });
  } finally {
    fs.readFileSync = originalReadFileSync;
    fs.writeFileSync = originalWriteFileSync;
  }

  assert.deepEqual(orchestrationIo, []);
  assert.equal(fs.statSync(indexPath).mtimeMs, mtimeBeforeRun);
  assert.equal(runResult.changed, 0);
  assert.equal(runResult.insufficientEvidence, 1);
  assert.doesNotMatch(writtenSite, /Little AlterBoy|EQ \/ modulation|A\/B/);
  assert.equal(writtenReport.report[0].status, "insufficient-evidence");
});
