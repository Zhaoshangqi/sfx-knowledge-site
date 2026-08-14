(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(root);
  } else {
    root.SfxDetailNavigation = factory(root);
  }
}(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  'use strict';

  var SECTION_IDS = Object.freeze([
    'quick', 'steps', 'effects', 'glossary', 'transcript', 'evidence'
  ]);

  function normalizeSection(value) {
    return typeof value === 'string' && SECTION_IDS.indexOf(value) !== -1 ? value : '';
  }

  function sectionId(element, key) {
    if (!element) return '';
    if (element.dataset && typeof element.dataset[key] === 'string') return element.dataset[key];
    if (typeof element.getAttribute !== 'function') return '';
    var attributeName = key === 'detailSection' ? 'data-detail-section' : 'data-section-target';
    return element.getAttribute(attributeName) || '';
  }

  function sectionTargets(contentRoot) {
    if (!contentRoot || typeof contentRoot.querySelectorAll !== 'function') return [];
    return Array.prototype.slice.call(contentRoot.querySelectorAll('[data-detail-section]'));
  }

  function findTarget(contentRoot, id) {
    var normalized = normalizeSection(id);
    if (!normalized) return null;
    return sectionTargets(contentRoot).find(function (target) {
      return sectionId(target, 'detailSection') === normalized;
    }) || null;
  }

  function reducedMotion(options) {
    var settings = options && typeof options === 'object' ? options : {};
    var matchMediaFunction = typeof settings.matchMedia === 'function'
      ? settings.matchMedia
      : root && typeof root.matchMedia === 'function'
        ? root.matchMedia.bind(root)
        : null;
    if (!matchMediaFunction) return false;
    try {
      return Boolean(matchMediaFunction('(prefers-reduced-motion: reduce)').matches);
    } catch (error) {
      return false;
    }
  }

  function revealSection(contentRoot, id, options) {
    var target = findTarget(contentRoot, id);
    if (!target) return false;

    var ancestor = target.parentElement || target.parentNode;
    while (ancestor) {
      if (String(ancestor.tagName || '').toLowerCase() === 'details') ancestor.open = true;
      if (ancestor === contentRoot) break;
      ancestor = ancestor.parentElement || ancestor.parentNode;
    }

    var heading = typeof target.querySelector === 'function'
      ? target.querySelector('[data-section-heading]')
      : null;
    if (!heading) heading = target;
    if (typeof heading.focus === 'function') {
      try { heading.focus({ preventScroll: true }); } catch (error) { heading.focus(); }
    }
    if (typeof heading.scrollIntoView === 'function') {
      heading.scrollIntoView({
        behavior: reducedMotion(options) ? 'auto' : 'smooth',
        block: 'start'
      });
    }
    return true;
  }

  function mount(navigationRoot, contentRoot, options) {
    if (!navigationRoot || typeof navigationRoot.querySelectorAll !== 'function') {
      throw new TypeError('navigation root must be a DOM element');
    }
    if (!contentRoot || typeof contentRoot.querySelectorAll !== 'function') {
      throw new TypeError('content root must be a DOM element');
    }

    var settings = options && typeof options === 'object' ? options : {};
    var destroyed = false;
    var listeners = [];
    var targets = sectionTargets(contentRoot).filter(function (target) {
      return Boolean(normalizeSection(sectionId(target, 'detailSection')));
    });
    var targetIds = targets.map(function (target) { return sectionId(target, 'detailSection'); });
    var links = Array.prototype.slice.call(navigationRoot.querySelectorAll('[data-section-target]'))
      .filter(function (link) {
        var id = normalizeSection(sectionId(link, 'sectionTarget'));
        return Boolean(id && targetIds.indexOf(id) !== -1);
      });
    var observer = null;

    function setCurrent(id) {
      links.forEach(function (link) {
        if (sectionId(link, 'sectionTarget') === id) link.setAttribute('aria-current', 'location');
        else link.removeAttribute('aria-current');
      });
    }

    function reveal(id) {
      if (destroyed) return false;
      var normalized = normalizeSection(id);
      if (!normalized || targetIds.indexOf(normalized) === -1) return false;
      var revealed = revealSection(contentRoot, normalized, settings);
      if (revealed) setCurrent(normalized);
      return revealed;
    }

    links.forEach(function (link) {
      var handler = function (event) {
        if (event && typeof event.preventDefault === 'function') event.preventDefault();
        reveal(sectionId(link, 'sectionTarget'));
      };
      link.addEventListener('click', handler);
      listeners.push([link, handler]);
    });

    if (links.length > 0) setCurrent(sectionId(links[0], 'sectionTarget'));

    var Observer = Object.prototype.hasOwnProperty.call(settings, 'IntersectionObserver')
      ? settings.IntersectionObserver
      : root && root.IntersectionObserver;
    if (typeof Observer === 'function' && targets.length > 0) {
      observer = new Observer(function (entries) {
        if (destroyed || !Array.isArray(entries)) return;
        var visible = entries.filter(function (entry) { return entry && entry.isIntersecting; });
        visible.sort(function (left, right) {
          var ratioDifference = Number(right.intersectionRatio || 0) - Number(left.intersectionRatio || 0);
          if (ratioDifference) return ratioDifference;
          var leftTop = left.boundingClientRect ? Math.abs(Number(left.boundingClientRect.top || 0)) : Infinity;
          var rightTop = right.boundingClientRect ? Math.abs(Number(right.boundingClientRect.top || 0)) : Infinity;
          return leftTop - rightTop;
        });
        if (visible[0]) setCurrent(sectionId(visible[0].target, 'detailSection'));
      }, {
        rootMargin: '-16% 0px -64% 0px',
        threshold: [0, 0.25, 0.6]
      });
      targets.forEach(function (target) { observer.observe(target); });
    }

    function destroy() {
      if (destroyed) return;
      destroyed = true;
      listeners.forEach(function (entry) { entry[0].removeEventListener('click', entry[1]); });
      listeners.length = 0;
      if (observer && typeof observer.disconnect === 'function') observer.disconnect();
      observer = null;
    }

    return Object.freeze({
      reveal: reveal,
      destroy: destroy
    });
  }

  return Object.freeze({
    mount: mount,
    normalizeSection: normalizeSection,
    revealSection: revealSection
  });
}));
