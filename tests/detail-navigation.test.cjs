'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const navigation = require('../src/detail-navigation.js');

class FakeElement {
  constructor(tagName = 'div', dataset = {}) {
    this.tagName = tagName.toUpperCase();
    this.dataset = { ...dataset };
    this.attributes = new Map();
    this.children = [];
    this.parentElement = null;
    this.listeners = new Map();
    this.open = false;
    this.focusCalls = 0;
    this.scrollCalls = [];
  }

  appendChild(child) {
    child.parentElement = this;
    this.children.push(child);
    return child;
  }

  setAttribute(name, value) {
    this.attributes.set(name, String(value));
  }

  getAttribute(name) {
    return this.attributes.has(name) ? this.attributes.get(name) : null;
  }

  removeAttribute(name) {
    this.attributes.delete(name);
  }

  addEventListener(type, handler) {
    const handlers = this.listeners.get(type) || [];
    handlers.push(handler);
    this.listeners.set(type, handlers);
  }

  removeEventListener(type, handler) {
    const handlers = this.listeners.get(type) || [];
    this.listeners.set(type, handlers.filter((candidate) => candidate !== handler));
  }

  listenerCount(type) {
    return (this.listeners.get(type) || []).length;
  }

  dispatch(type) {
    const event = {
      currentTarget: this,
      target: this,
      defaultPrevented: false,
      preventDefault() { this.defaultPrevented = true; }
    };
    for (const handler of [...(this.listeners.get(type) || [])]) handler(event);
    return event;
  }

  matches(selector) {
    if (selector === '[data-section-target]') return typeof this.dataset.sectionTarget === 'string';
    if (selector === '[data-detail-section]') return typeof this.dataset.detailSection === 'string';
    if (selector === '[data-section-heading]') return Object.prototype.hasOwnProperty.call(this.dataset, 'sectionHeading');
    return false;
  }

  querySelectorAll(selector) {
    const matches = [];
    const visit = (node) => {
      for (const child of node.children) {
        if (child.matches(selector)) matches.push(child);
        visit(child);
      }
    };
    visit(this);
    return matches;
  }

  querySelector(selector) {
    return this.querySelectorAll(selector)[0] || null;
  }

  focus() {
    this.focusCalls += 1;
  }

  scrollIntoView(options) {
    this.scrollCalls.push(options);
  }
}

function buildFixture() {
  const nav = new FakeElement('nav');
  const quickLink = nav.appendChild(new FakeElement('a', { sectionTarget: 'quick' }));
  const evidenceLink = nav.appendChild(new FakeElement('a', { sectionTarget: 'evidence' }));
  const missingLink = nav.appendChild(new FakeElement('a', { sectionTarget: 'transcript' }));
  const content = new FakeElement('main');
  const quick = content.appendChild(new FakeElement('section', { detailSection: 'quick' }));
  const quickHeading = quick.appendChild(new FakeElement('h3', { sectionHeading: '' }));
  const disclosure = content.appendChild(new FakeElement('details'));
  const evidence = disclosure.appendChild(new FakeElement('section', { detailSection: 'evidence' }));
  const evidenceHeading = evidence.appendChild(new FakeElement('h3', { sectionHeading: '' }));
  return {
    nav,
    content,
    quickLink,
    evidenceLink,
    missingLink,
    quick,
    quickHeading,
    disclosure,
    evidence,
    evidenceHeading
  };
}

function observerRuntime() {
  const instances = [];
  class Observer {
    constructor(callback, options) {
      this.callback = callback;
      this.options = options;
      this.observed = [];
      this.disconnectCalls = 0;
      instances.push(this);
    }
    observe(target) { this.observed.push(target); }
    disconnect() { this.disconnectCalls += 1; }
    emit(entries) { this.callback(entries); }
  }
  return { Observer, instances };
}

test('publishes a frozen detail-navigation API and normalizes only approved ids', () => {
  assert.ok(Object.isFrozen(navigation));
  assert.deepEqual(Object.keys(navigation).sort(), ['mount', 'normalizeSection', 'revealSection']);
  for (const id of ['quick', 'steps', 'effects', 'glossary', 'transcript', 'evidence']) {
    assert.equal(navigation.normalizeSection(id), id);
  }
  assert.equal(navigation.normalizeSection('unknown'), '');
  assert.equal(navigation.normalizeSection(null), '');
});

test('revealSection opens ancestor details before focus and scroll', () => {
  const fixture = buildFixture();
  assert.equal(navigation.revealSection(fixture.content, 'evidence'), true);
  assert.equal(fixture.disclosure.open, true);
  assert.equal(fixture.evidenceHeading.focusCalls, 1);
  assert.equal(fixture.evidenceHeading.scrollCalls.length, 1);
  assert.deepEqual(fixture.evidenceHeading.scrollCalls[0], { behavior: 'smooth', block: 'start' });
  assert.equal(navigation.revealSection(fixture.content, 'transcript'), false);
  assert.equal(navigation.revealSection(fixture.content, 'unknown'), false);
});

test('mount handles chapter clicks, observer state, reduced motion, and cleanup', () => {
  const fixture = buildFixture();
  const runtime = observerRuntime();
  const controller = navigation.mount(fixture.nav, fixture.content, {
    IntersectionObserver: runtime.Observer,
    matchMedia: () => ({ matches: true })
  });

  assert.ok(Object.isFrozen(controller));
  assert.equal(fixture.quickLink.listenerCount('click'), 1);
  assert.equal(fixture.evidenceLink.listenerCount('click'), 1);
  assert.equal(fixture.missingLink.listenerCount('click'), 0);
  assert.equal(runtime.instances.length, 1);
  assert.deepEqual(runtime.instances[0].observed, [fixture.quick, fixture.evidence]);

  const event = fixture.evidenceLink.dispatch('click');
  assert.equal(event.defaultPrevented, true);
  assert.equal(fixture.disclosure.open, true);
  assert.equal(fixture.evidenceHeading.focusCalls, 1);
  assert.deepEqual(fixture.evidenceHeading.scrollCalls[0], { behavior: 'auto', block: 'start' });
  assert.equal(fixture.evidenceLink.getAttribute('aria-current'), 'location');
  assert.equal(fixture.quickLink.getAttribute('aria-current'), null);

  runtime.instances[0].emit([
    { target: fixture.evidence, isIntersecting: true, intersectionRatio: 0.2, boundingClientRect: { top: 120 } },
    { target: fixture.quick, isIntersecting: true, intersectionRatio: 0.8, boundingClientRect: { top: 24 } }
  ]);
  assert.equal(fixture.quickLink.getAttribute('aria-current'), 'location');
  assert.equal(fixture.evidenceLink.getAttribute('aria-current'), null);

  assert.equal(controller.reveal('quick'), true);
  assert.equal(fixture.quickHeading.focusCalls, 1);

  controller.destroy();
  assert.equal(fixture.quickLink.listenerCount('click'), 0);
  assert.equal(fixture.evidenceLink.listenerCount('click'), 0);
  assert.equal(runtime.instances[0].disconnectCalls, 1);
  assert.equal(controller.reveal('quick'), false);
  fixture.evidenceLink.dispatch('click');
  assert.equal(fixture.evidenceHeading.focusCalls, 1);
});

test('mount works without IntersectionObserver and rejects malformed roots', () => {
  const fixture = buildFixture();
  const controller = navigation.mount(fixture.nav, fixture.content, { IntersectionObserver: null });
  assert.equal(controller.reveal('quick'), true);
  controller.destroy();

  assert.throws(() => navigation.mount(null, fixture.content), /navigation root/);
  assert.throws(() => navigation.mount(fixture.nav, null), /content root/);
});
