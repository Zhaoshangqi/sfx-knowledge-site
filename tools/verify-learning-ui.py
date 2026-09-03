#!/usr/bin/env python3
"""Exhaustively verify the learning interfaces in a real browser."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Any, Iterable, Sequence
from urllib.parse import urlencode, urlsplit, urlunsplit


CATEGORY_IDS = ("workflow", "impact", "scifi", "environment", "magic", "creature")
VIEWPORTS = {
    "desktop": {"width": 1440, "height": 1000},
    "mobile": {"width": 390, "height": 844},
}
EXPECTED_VIDEO_COUNT = 85
EXPECTED_EFFECT_COUNT = 27
ISSUE_KEYS = ("overflows", "overlaps", "pageErrors", "assertionFailures")


def configure_utf8_stdio(streams: Iterable[Any] = (sys.stdout, sys.stderr)) -> None:
    for stream in streams:
        reconfigure = getattr(stream, "reconfigure", None)
        if callable(reconfigure):
            reconfigure(encoding="utf-8", errors="replace")


configure_utf8_stdio()


def normalize_base_url(base_url: str) -> str:
    value = str(base_url or "").strip()
    parsed = urlsplit(value)
    if parsed.scheme not in {"http", "https"} or not parsed.netloc:
        raise ValueError("base URL must be an absolute http(s) URL")
    path = parsed.path or "/"
    if not path.endswith("/"):
        path += "/"
    return urlunsplit((parsed.scheme, parsed.netloc, path, parsed.query, ""))


def _validated_ids(items: Sequence[dict[str, Any]], kind: str) -> list[str]:
    identifiers: list[str] = []
    seen: set[str] = set()
    for item in items:
        identifier = str(item.get("id", "")).strip()
        if not identifier:
            raise ValueError(f"blank {kind} id")
        if identifier in seen:
            raise ValueError(f"duplicate {kind} id: {identifier}")
        seen.add(identifier)
        identifiers.append(identifier)
    return identifiers


def _route(base_url: str, kind: str, identifier: str, params: dict[str, str], **extra: Any) -> dict[str, Any]:
    return {
        "kind": kind,
        "id": identifier,
        "url": f"{base_url}#{urlencode(params)}",
        **extra,
    }


def build_route_specs(
    base_url: str,
    videos: Sequence[dict[str, Any]],
    effects: Sequence[dict[str, Any]],
) -> dict[str, list[dict[str, Any]]]:
    base = normalize_base_url(base_url)
    _validated_ids(videos, "video")
    _validated_ids(effects, "effect")
    return {
        "videoIndexes": [
            _route(
                base,
                "video-index",
                "videos",
                {"view": "videos"},
                expected={
                    "videoCards": len(videos),
                    "visibleVideoLibraries": 1,
                    "visibleEffectLibraries": 0,
                    "readerViews": 0,
                },
            )
        ],
        "effectIndexes": [
            _route(
                base,
                "effect-index",
                "effects",
                {"view": "effects"},
                expected={
                    "effectCards": len(effects),
                    "visibleVideoLibraries": 0,
                    "visibleEffectLibraries": 1,
                    "readerViews": 0,
                },
            )
        ],
        "videos": [
            _route(
                base,
                "video",
                str(video["id"]),
                {"video": str(video["id"])},
                title=str(video.get("title", "")),
                category=str(video.get("category", "")),
                expected={
                    "readerViews": 1,
                    "detailTitles": 1,
                    "learningMaps": 1,
                    "chapters": int(video.get("chapterCount", 0)),
                    "steps": int(video.get("stepCount", 0)),
                    "learningGrids": int(video.get("stepCount", 0)),
                    "sourceDisclosures": int(video.get("stepCount", 0)),
                },
            )
            for video in videos
        ],
        "effects": [
            _route(
                base,
                "effect",
                str(effect["id"]),
                {"effect": str(effect["id"])},
                title=str(effect.get("name", "")),
                expected={
                    "readerViews": 1,
                    "detailTitles": 1,
                    "effectDetails": 1,
                    "effectUsageFields": 5,
                    "effectCases": int(effect.get("caseCount", 0)),
                    "effectInterfaceReferences": 1,
                },
            )
            for effect in effects
        ],
    }


def select_category_representatives(
    records: Sequence[dict[str, Any]],
    category_ids: Sequence[str] = CATEGORY_IDS,
) -> list[dict[str, Any]]:
    representatives: list[dict[str, Any]] = []
    missing: list[str] = []
    for category_id in category_ids:
        record = next((item for item in records if item.get("category") == category_id), None)
        if record is None:
            missing.append(category_id)
        else:
            representatives.append(record)
    if missing:
        raise ValueError(f"missing category representatives: {', '.join(missing)}")
    return representatives


def rectangles_overlap(
    left: dict[str, float],
    right: dict[str, float],
    tolerance: float = 1,
) -> bool:
    horizontal = min(float(left["right"]), float(right["right"])) - max(
        float(left["left"]), float(right["left"])
    )
    vertical = min(float(left["bottom"]), float(right["bottom"])) - max(
        float(left["top"]), float(right["top"])
    )
    return horizontal > tolerance and vertical > tolerance


def find_overlaps(groups: Sequence[dict[str, Any]], tolerance: float = 1) -> list[dict[str, Any]]:
    overlaps: list[dict[str, Any]] = []
    for group in groups:
        items = list(group.get("items", []))
        for index, left in enumerate(items):
            for right in items[index + 1 :]:
                if not rectangles_overlap(left["rect"], right["rect"], tolerance):
                    continue
                overlaps.append(
                    {
                        "container": group.get("selector", "unknown"),
                        "left": left.get("label", "unknown"),
                        "right": right.get("label", "unknown"),
                    }
                )
    return overlaps


def _count_assertion_failures(counts: dict[str, Any], expected: dict[str, Any]) -> list[str]:
    failures: list[str] = []
    for name, requirement in expected.items():
        actual = int(counts.get(name, 0))
        if isinstance(requirement, dict):
            minimum = requirement.get("min")
            maximum = requirement.get("max")
            if minimum is not None and actual < int(minimum):
                failures.append(f"{name} expected at least {minimum}, got {actual}")
            if maximum is not None and actual > int(maximum):
                failures.append(f"{name} expected at most {maximum}, got {actual}")
            continue
        if actual != int(requirement):
            failures.append(f"{name} expected {requirement}, got {actual}")
    return failures


def evaluate_dom_metrics(
    metrics: dict[str, Any],
    expected: dict[str, Any] | None = None,
    tolerance: float = 1,
) -> dict[str, list[Any]]:
    overflows: list[dict[str, Any]] = []
    document = metrics.get("document", {})
    document_overflow = float(document.get("scrollWidth", 0)) - float(document.get("clientWidth", 0))
    if document_overflow > tolerance:
        overflows.append(
            {
                "selector": "document",
                "scrollWidth": document.get("scrollWidth", 0),
                "clientWidth": document.get("clientWidth", 0),
                "overflow": document_overflow,
            }
        )
    for container in metrics.get("containers", []):
        overflow = float(container.get("scrollWidth", 0)) - float(container.get("clientWidth", 0))
        if overflow <= tolerance:
            continue
        overflows.append(
            {
                "selector": container.get("selector", "unknown"),
                "scrollWidth": container.get("scrollWidth", 0),
                "clientWidth": container.get("clientWidth", 0),
                "overflow": overflow,
            }
        )
    return {
        "overflows": overflows,
        "overlaps": find_overlaps(metrics.get("overlapGroups", []), tolerance),
        "pageErrors": [str(error) for error in metrics.get("pageErrors", [])],
        "assertionFailures": _count_assertion_failures(
            metrics.get("counts", {}), expected or {}
        ),
    }


def _result_ok(result: dict[str, Any]) -> bool:
    issues = result.get("issues", {})
    return all(not issues.get(key) for key in ISSUE_KEYS)


def _covered_route_count(
    results: Sequence[dict[str, Any]],
    kind: str,
    identifiers: Sequence[str],
    viewports: Sequence[str],
) -> int:
    passed = 0
    for identifier in identifiers:
        matching = [
            result
            for result in results
            if result.get("kind") == kind and result.get("id") == identifier
        ]
        by_viewport = {result.get("viewport"): result for result in matching}
        if all(viewport in by_viewport and _result_ok(by_viewport[viewport]) for viewport in viewports):
            passed += 1
    return passed


def build_report(
    *,
    base_url: str,
    results: Sequence[dict[str, Any]],
    expected_video_ids: Sequence[str],
    expected_effect_ids: Sequence[str],
    screenshots: Sequence[dict[str, Any]],
    expected_viewports: Sequence[str] = tuple(VIEWPORTS),
    expected_video_total: int | None = None,
    expected_effect_total: int | None = None,
) -> dict[str, Any]:
    video_passed = _covered_route_count(results, "video", expected_video_ids, expected_viewports)
    effect_passed = _covered_route_count(results, "effect", expected_effect_ids, expected_viewports)
    index_specs = (("video-index", "videos"), ("effect-index", "effects"))
    index_passed = sum(
        _covered_route_count(results, kind, [identifier], expected_viewports)
        for kind, identifier in index_specs
    )
    issue_counts = {
        key: sum(len(result.get("issues", {}).get(key, [])) for result in results)
        for key in ISSUE_KEYS
    }
    video_total = int(expected_video_total) if expected_video_total is not None else len(expected_video_ids)
    effect_total = int(expected_effect_total) if expected_effect_total is not None else len(expected_effect_ids)
    coverage = {
        "videoRoutes": {"passed": video_passed, "total": video_total},
        "effectRoutes": {"passed": effect_passed, "total": effect_total},
        "indexRoutes": {"passed": index_passed, "total": len(index_specs)},
    }
    ok = (
        all(item["passed"] == item["total"] for item in coverage.values())
        and all(count == 0 for count in issue_counts.values())
    )
    return {
        "schemaVersion": 1,
        "baseUrl": normalize_base_url(base_url),
        "viewports": {name: VIEWPORTS[name] for name in expected_viewports},
        "coverage": coverage,
        "issues": issue_counts,
        "screenshots": list(screenshots),
        "visualReview": {
            "representativesCaptured": len(screenshots),
            "unresolvedFailures": [],
        },
        "ok": ok,
        "results": list(results),
    }


def exit_code_for_report(report: dict[str, Any]) -> int:
    return 0 if report.get("ok") is True else 1


def format_report_summary(report: dict[str, Any]) -> str:
    coverage = report["coverage"]
    issues = report["issues"]
    return "\n".join(
        (
            f"{coverage['videoRoutes']['passed']}/{coverage['videoRoutes']['total']} video routes",
            f"{coverage['effectRoutes']['passed']}/{coverage['effectRoutes']['total']} effect routes",
            f"{coverage['indexRoutes']['passed']}/{coverage['indexRoutes']['total']} index routes",
            f"{issues['overflows']} overflows",
            f"{issues['overlaps']} overlaps",
            f"{issues['pageErrors']} page errors",
            f"{issues['assertionFailures']} assertion failures",
        )
    )


DOM_METRICS_SCRIPT = r"""
() => {
  const containerSelectors = [
    '#appMain', '.control-inner', '#grid', '#effectList', '.reader-bar', '.detail-body',
    '.detail-learning-layout', '.detail-learning-content', '.video-study-rail', '.learning-map',
    '.learning-roles', '.learning-chapters', '.learning-chapter', '.learning-chapter-head',
    '.learning-chapter-steps', '.step', '.step-copy', '.step-learning-grid',
    '.step-learning-grid > div', '.effect-profile-card', '.effect-detail-grid',
    '.effect-usage-overview', '.effect-usage-fields', '.effect-case-list', '.effect-case',
    '.effect-case-facts'
  ];
  const overlapContainerSelectors = [
    '.control-inner', '#grid', '#effectList', '.reader-bar', '.detail-learning-layout',
    '.learning-roles', '.learning-chapters', '.learning-chapter-head',
    '.learning-chapter-steps', '.step', '.step-learning-grid', '.effect-profile-card',
    '.effect-detail-grid', '.effect-usage-fields', '.effect-case-list', '.effect-case',
    '.effect-case-facts', '.detail-section-nav'
  ];
  const visible = (node) => {
    const rect = node.getBoundingClientRect();
    const style = getComputedStyle(node);
    return rect.width > 0 && rect.height > 0 && style.display !== 'none' &&
      style.visibility !== 'hidden' && style.opacity !== '0';
  };
  const labelFor = (node, index) => {
    if (node.id) return '#' + node.id;
    const classes = Array.from(node.classList || []).slice(0, 3);
    return node.tagName.toLowerCase() + (classes.length ? '.' + classes.join('.') : '') +
      ':nth-child(' + (index + 1) + ')';
  };
  const rectFor = (node) => {
    const rect = node.getBoundingClientRect();
    return {
      left: rect.left,
      top: rect.top,
      right: rect.right,
      bottom: rect.bottom
    };
  };
  const containers = [];
  containerSelectors.forEach((selector) => {
    document.querySelectorAll(selector).forEach((node, index) => {
      if (!visible(node)) return;
      containers.push({
        selector: selector + '[' + (index + 1) + ']',
        scrollWidth: node.scrollWidth,
        clientWidth: node.clientWidth
      });
    });
  });
  const overlapGroups = [];
  overlapContainerSelectors.forEach((selector) => {
    document.querySelectorAll(selector).forEach((container, containerIndex) => {
      if (!visible(container)) return;
      const items = Array.from(container.children)
        .filter(visible)
        .map((node, index) => ({ label: labelFor(node, index), rect: rectFor(node) }));
      if (items.length > 1) {
        overlapGroups.push({
          selector: selector + '[' + (containerIndex + 1) + ']',
          items
        });
      }
    });
  });
  const videoLibrary = document.querySelector('#videoLibrary');
  const effectLibrary = document.querySelector('#effectLibrary');
  const readerView = document.querySelector('#readerView');
  return {
    document: {
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth
    },
    containers,
    overlapGroups,
    counts: {
      videoCards: document.querySelectorAll('#grid .card[data-id]').length,
      effectCards: document.querySelectorAll('#effectList .effect-profile-card[data-effect-id]').length,
      visibleVideoLibraries: Number(Boolean(videoLibrary && !videoLibrary.hidden)),
      visibleEffectLibraries: Number(Boolean(effectLibrary && !effectLibrary.hidden)),
      readerViews: Number(Boolean(readerView && !readerView.hidden)),
      detailTitles: document.querySelectorAll('#detail .detail-title').length,
      learningMaps: document.querySelectorAll('#detail .learning-map').length,
      chapters: document.querySelectorAll('#detail .learning-chapter').length,
      steps: document.querySelectorAll('#detail .step').length,
      learningGrids: document.querySelectorAll('#detail .step-learning-grid').length,
      sourceDisclosures: document.querySelectorAll('#detail .step-source-detail').length,
      effectDetails: document.querySelectorAll('#detail .effect-detail').length,
      effectUsageFields: document.querySelectorAll('#detail .effect-usage-fields > div').length,
      effectCases: document.querySelectorAll('#detail .effect-case').length,
      effectInterfaceReferences: document.querySelectorAll('#detail .effect-interface-reference').length
    }
  };
}
"""


CATALOG_SCRIPT = r"""
() => {
  const profiles = EffectIndexData.profiles(
    effectUses,
    records,
    pluginReferenceCatalog,
    imageManifest
  );
  return {
    videos: records.map((record) => ({
      id: record.id,
      title: record.title,
      category: record.category,
      chapterCount: Array.isArray(record.learningMap?.chapters) ? record.learningMap.chapters.length : 0,
      stepCount: Array.isArray(record.steps) ? record.steps.length : 0
    })),
    effects: profiles.map((profile) => ({
      id: profile.id,
      name: profile.name,
      caseCount: effectCasesForProfile(profile).length
    }))
  };
}
"""


def _wait_for_route(page: Any, route: dict[str, Any]) -> None:
    page.goto(route["url"], wait_until="domcontentloaded", timeout=30_000)
    kind = route["kind"]
    if kind == "video-index":
        expression = """expected => {
          const panel = document.querySelector('#videoLibrary');
          return panel && !panel.hidden &&
            document.querySelectorAll('#grid .card[data-id]').length === expected;
        }"""
        page.wait_for_function(expression, arg=route["expected"]["videoCards"], timeout=20_000)
    elif kind == "effect-index":
        expression = """expected => {
          const panel = document.querySelector('#effectLibrary');
          return panel && !panel.hidden &&
            document.querySelectorAll('#effectList .effect-profile-card[data-effect-id]').length === expected;
        }"""
        page.wait_for_function(expression, arg=route["expected"]["effectCards"], timeout=20_000)
    else:
        expression = """title => {
          const heading = document.querySelector('#detail .detail-title');
          const reader = document.querySelector('#readerView');
          return reader && !reader.hidden && heading && heading.textContent.trim() === title;
        }"""
        page.wait_for_function(expression, arg=route.get("title", ""), timeout=20_000)
    page.wait_for_timeout(40)


def _route_result(page: Any, route: dict[str, Any], viewport: str, page_errors: list[str]) -> dict[str, Any]:
    page_errors.clear()
    navigation_failure = ""
    metrics: dict[str, Any]
    try:
        _wait_for_route(page, route)
        metrics = page.evaluate(DOM_METRICS_SCRIPT)
    except Exception as error:  # Playwright error types are loaded lazily.
        navigation_failure = f"navigation failed: {error}"
        metrics = {
            "document": {},
            "containers": [],
            "overlapGroups": [],
            "counts": {},
        }
    metrics["pageErrors"] = list(page_errors)
    issues = evaluate_dom_metrics(metrics, route.get("expected", {}))
    if navigation_failure:
        issues["assertionFailures"].insert(0, navigation_failure)
    return {
        "kind": route["kind"],
        "id": route["id"],
        "title": route.get("title", ""),
        "category": route.get("category", ""),
        "viewport": viewport,
        "url": route["url"],
        "counts": metrics.get("counts", {}),
        "issues": issues,
    }


def _prepare_screenshot_page(page: Any) -> None:
    page.evaluate(
        """() => {
          document.querySelectorAll('img[loading="lazy"]').forEach((image) => {
            image.loading = 'eager';
          });
        }"""
    )
    try:
        page.wait_for_function(
            "() => Array.from(document.images).every((image) => image.complete)",
            timeout=8_000,
        )
    except Exception:
        pass
    page.wait_for_timeout(80)


def _capture_screenshot(
    page: Any,
    output_dir: Path,
    name: str,
    route: dict[str, Any],
    viewport: str,
    **metadata: Any,
) -> dict[str, Any]:
    _prepare_screenshot_page(page)
    path = output_dir / f"{name}.png"
    page.screenshot(path=str(path), full_page=True, animations="disabled")
    return {
        "name": name,
        "path": path.name,
        "kind": route["kind"],
        "id": route["id"],
        "viewport": viewport,
        **metadata,
    }


def _catalog_failures(catalog: dict[str, Any]) -> list[str]:
    failures: list[str] = []
    if len(catalog["videos"]) != EXPECTED_VIDEO_COUNT:
        failures.append(
            f"video catalog expected {EXPECTED_VIDEO_COUNT}, got {len(catalog['videos'])}"
        )
    if len(catalog["effects"]) != EXPECTED_EFFECT_COUNT:
        failures.append(
            f"effect catalog expected {EXPECTED_EFFECT_COUNT}, got {len(catalog['effects'])}"
        )
    return failures


def run_verifier(base_url: str, output_dir: Path, screenshots_enabled: bool) -> dict[str, Any]:
    try:
        from playwright.sync_api import sync_playwright
    except ImportError as error:
        raise RuntimeError("Python Playwright is required to run this verifier") from error

    output_dir.mkdir(parents=True, exist_ok=True)
    results: list[dict[str, Any]] = []
    screenshots: list[dict[str, Any]] = []

    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True)
        discovery_context = browser.new_context(viewport=VIEWPORTS["desktop"])
        discovery_page = discovery_context.new_page()
        discovery_page.goto(
            f"{normalize_base_url(base_url)}#view=videos",
            wait_until="domcontentloaded",
            timeout=30_000,
        )
        discovery_page.wait_for_selector("#grid .card[data-id]", timeout=20_000)
        catalog = discovery_page.evaluate(CATALOG_SCRIPT)
        discovery_context.close()

        routes = build_route_specs(base_url, catalog["videos"], catalog["effects"])
        category_representatives = select_category_representatives(catalog["videos"])
        category_ids_by_video = {
            record["id"]: record["category"] for record in category_representatives
        }
        first_video_id = catalog["videos"][0]["id"]
        first_effect_id = catalog["effects"][0]["id"]

        ordered_routes = (
            routes["videoIndexes"]
            + routes["effectIndexes"]
            + routes["videos"]
            + routes["effects"]
        )
        for viewport_name, viewport_size in VIEWPORTS.items():
            context = browser.new_context(viewport=viewport_size)
            page = context.new_page()
            page_errors: list[str] = []
            page.on("pageerror", lambda error, target=page_errors: target.append(str(error)))
            for route in ordered_routes:
                result = _route_result(page, route, viewport_name, page_errors)
                results.append(result)
                if not screenshots_enabled or not _result_ok(result):
                    continue
                if viewport_name == "desktop" and route["kind"] == "video-index":
                    screenshots.append(
                        _capture_screenshot(
                            page, output_dir, "surface-video-index-desktop", route, viewport_name
                        )
                    )
                elif viewport_name == "desktop" and route["kind"] == "effect-index":
                    screenshots.append(
                        _capture_screenshot(
                            page, output_dir, "surface-effect-index-desktop", route, viewport_name
                        )
                    )
                elif viewport_name == "desktop" and route["kind"] == "video" and route["id"] in category_ids_by_video:
                    category = category_ids_by_video[route["id"]]
                    screenshots.append(
                        _capture_screenshot(
                            page,
                            output_dir,
                            f"category-{category}-desktop",
                            route,
                            viewport_name,
                            category=category,
                        )
                    )
                elif viewport_name == "mobile" and route["kind"] == "video" and route["id"] == first_video_id:
                    screenshots.append(
                        _capture_screenshot(
                            page, output_dir, "surface-video-detail-mobile", route, viewport_name
                        )
                    )
                elif viewport_name == "mobile" and route["kind"] == "effect" and route["id"] == first_effect_id:
                    screenshots.append(
                        _capture_screenshot(
                            page, output_dir, "surface-effect-detail-mobile", route, viewport_name
                        )
                    )
            context.close()
        browser.close()

    catalog_failures = _catalog_failures(catalog)
    if catalog_failures:
        results.append(
            {
                "kind": "catalog",
                "id": "catalog",
                "viewport": "discovery",
                "url": normalize_base_url(base_url),
                "counts": {
                    "videos": len(catalog["videos"]),
                    "effects": len(catalog["effects"]),
                },
                "issues": {
                    "overflows": [],
                    "overlaps": [],
                    "pageErrors": [],
                    "assertionFailures": catalog_failures,
                },
            }
        )

    return build_report(
        base_url=base_url,
        results=results,
        expected_video_ids=[record["id"] for record in catalog["videos"]],
        expected_effect_ids=[effect["id"] for effect in catalog["effects"]],
        screenshots=screenshots,
        expected_video_total=EXPECTED_VIDEO_COUNT,
        expected_effect_total=EXPECTED_EFFECT_COUNT,
    )


def parse_args(argv: Sequence[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--base-url", required=True, help="Root URL of the locally served site")
    parser.add_argument(
        "--output-dir",
        type=Path,
        required=True,
        help="Directory for report.json and optional representative screenshots",
    )
    parser.add_argument(
        "--screenshots",
        action="store_true",
        help="Capture six category representatives and four primary surfaces",
    )
    return parser.parse_args(argv)


def main(argv: Sequence[str] | None = None) -> int:
    args = parse_args(argv)
    try:
        report = run_verifier(args.base_url, args.output_dir.resolve(), args.screenshots)
    except Exception as error:
        print(f"Verifier failed before report generation: {error}", file=sys.stderr)
        return 2
    report_path = args.output_dir.resolve() / "report.json"
    report_path.write_text(
        json.dumps(report, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    print(format_report_summary(report))
    print(f"Report: {report_path}")
    return exit_code_for_report(report)


if __name__ == "__main__":
    raise SystemExit(main())
