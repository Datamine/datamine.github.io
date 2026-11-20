import assert from 'node:assert/strict';
import { createDialogue } from '../../dialogue.js';

export function dialogueFixture(player = {}, overrides = {}) {
  const previous = globalThis.document,
    doc = { activeElement: null };
  class Element {
    constructor(tag = 'div') {
      this.tagName = tag;
      this.children = [];
      this.dataset = {};
      this.handlers = {};
      this.hidden = false;
      this.value = '';
      this.classList = { add() {}, remove() {} };
    }
    set textContent(value) {
      this.value = String(value);
      this.children = [];
    }
    get textContent() {
      return this.value + this.children.map((n) => n.textContent).join(' ');
    }
    append(...nodes) {
      this.children.push(...nodes);
    }
    replaceChildren(...nodes) {
      this.value = '';
      this.children = nodes;
    }
    addEventListener(type, fn) {
      this.handlers[type] = fn;
    }
    click() {
      if (!this.disabled) this.handlers.click?.();
    }
    focus() {
      doc.activeElement = this;
    }
    querySelectorAll(selector) {
      return this.children.flatMap((n) => [
        ...(n.tagName === 'button' && (!selector.includes('disabled') || !n.disabled) ? [n] : []),
        ...n.querySelectorAll(selector),
      ]);
    }
    querySelector(selector) {
      return this.querySelectorAll(selector)[0];
    }
  }
  doc.createElement = (tag) => new Element(tag);
  globalThis.document = doc;
  const element = new Element(),
    journal = new Element(),
    log = new Element(),
    messages = [];
  const dialogue = createDialogue({
    element,
    journal,
    log,
    canInteract: () => true,
    announce: (text) => messages.push(text),
    trade: () => ({ ok: true }),
    getPlayer: () => player,
    ...overrides,
  });
  const buttons = () => element.querySelectorAll('button:not([disabled])');
  const click = (text) => {
    const found = buttons().find((b) => b.textContent === text);
    assert.ok(found, 'Missing ' + text + ' in ' + buttons().map((b) => b.textContent));
    found.click();
  };
  return {
    dialogue,
    element,
    journal,
    log,
    messages,
    doc,
    buttons,
    click,
    restore: () => (globalThis.document = previous),
  };
}
