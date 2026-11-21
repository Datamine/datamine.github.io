import type { ContentEntity } from '../../types/world.ts';
import assert from 'node:assert/strict';
import { createDialogue } from '../../dialogue.ts';

export function dialogueFixture(
  player: ContentEntity = {},
  overrides: Partial<Parameters<typeof createDialogue>[0]> = {},
) {
  const previous = globalThis.document,
    doc = {
      activeElement: null as Element | null,
      createDocumentFragment: () => new Element('fragment'),
      createElement: <K extends keyof HTMLElementTagNameMap>(tag: K) =>
        new Element(tag) as unknown as Element & HTMLElementTagNameMap[K],
    };
  class Element {
    tagName: string;
    children: Element[];
    dataset: Record<string, string>;
    handlers: Record<string, () => void>;
    hidden: boolean;
    value: string;
    disabled = false;
    type = '';
    className = '';
    classList: { add: () => void; remove: () => void };

    constructor(tag = 'div') {
      this.tagName = tag;
      this.children = [];
      this.dataset = {};
      this.handlers = {};
      this.hidden = false;
      this.value = '';
      this.classList = { add() {}, remove() {} };
    }
    set textContent(value: string | null) {
      this.value = String(value);
      this.children = [];
    }
    get textContent(): string {
      return this.value + this.children.map((n) => n.textContent).join(' ');
    }
    append(...nodes: Element[]) {
      this.children.push(...nodes);
    }
    replaceChildren(...nodes: Element[]) {
      this.value = '';
      this.children = nodes;
    }
    setAttribute(name: string, value: unknown) {
      Reflect.set(this, name, String(value));
    }
    getAttribute(name: string): string | null {
      const value: unknown = Reflect.get(this, name);
      return typeof value === 'string' ? value : null;
    }
    addEventListener(type: string, fn: () => void) {
      this.handlers[type] = fn;
    }
    click() {
      if (!this.disabled) this.handlers.click?.();
    }
    focus() {
      doc.activeElement = this;
    }
    querySelectorAll(selector: string): Element[] {
      return this.children.flatMap((n) => [
        ...(n.tagName === 'button' && (!selector.includes('disabled') || !n.disabled) ? [n] : []),
        ...n.querySelectorAll(selector),
      ]);
    }
    querySelector(selector: string) {
      return this.querySelectorAll(selector)[0];
    }
  }
  // The fixture implements the DOM operations exercised by dialogue rendering.
  globalThis.document = doc as unknown as Document;
  const element = new Element(),
    journal = new Element(),
    log = new Element(),
    messages: string[] = [];
  const dialogue = createDialogue({
    element: element as unknown as HTMLElement,
    journal: journal as unknown as HTMLElement,
    log: log as unknown as HTMLElement,
    canInteract: () => true,
    announce: (text) => messages.push(text),
    trade: () => ({ ok: true }),
    getPlayer: () => player,
    ...overrides,
  });
  const buttons = () => element.querySelectorAll('button:not([disabled])');
  const click = (text: string) => {
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
    advance: () => click(buttons().some((b) => b.textContent === 'Respond') ? 'Respond' : 'OK'),
    restore: () => (globalThis.document = previous),
  };
}
