/** Minimal text-only DOM used to read the production menu builder in Node. */
export class MenuElement {
  tagName: string;
  value: string;
  children: MenuElement[];
  dataset: Record<string, string>;
  style: Record<string, string>;
  disabled: boolean;
  hidden: boolean;
  offsetWidth: number;
  offsetHeight: number;
  parent?: MenuElement;
  classList: { add(...names: string[]): void; remove(...names: string[]): void };

  constructor(tag = 'div', text = '') {
    this.tagName = tag;
    this.value = text;
    this.children = [];
    this.dataset = {};
    this.style = {};
    this.hidden = true;
    this.disabled = false;
    this.offsetWidth = 300;
    this.offsetHeight = 300;
    this.classList = { add() {}, remove() {} };
  }
  set textContent(value: string | null) {
    this.value = String(value);
    this.children = [];
  }
  get textContent(): string {
    return this.value + this.children.map((n) => n.textContent).join('');
  }
  append(...nodes: MenuElement[]) {
    for (const n of nodes) n.parent = this;
    this.children.push(...nodes);
  }
  get firstChild() {
    return this.children[0];
  }
  remove() {
    if (this.parent) this.parent.children = this.parent.children.filter((n) => n !== this);
  }
  replaceChildren(...nodes: MenuElement[]) {
    this.value = '';
    this.children = nodes;
  }
  insertBefore(node: MenuElement, before: MenuElement) {
    this.children = this.children.filter((n) => n !== node);
    this.children.splice(this.children.indexOf(before), 0, node);
  }
  setAttribute(key: string, value: unknown) {
    Reflect.set(this, key, value);
  }
  addEventListener(..._args: unknown[]) {}
  focus(..._args: unknown[]) {}
  querySelectorAll(selector: string): MenuElement[] {
    return this.children.flatMap((n) => [
      ...(n.tagName === 'button' && selector.startsWith('button') ? [n] : []),
      ...n.querySelectorAll(selector),
    ]);
  }
  querySelector(selector: string): MenuElement | null {
    return this.querySelectorAll(selector)[0] || null;
  }
}
export function menuDocument() {
  const elements = new Map<string, MenuElement>();
  return {
    createElement: (tag: string | undefined) => new MenuElement(tag),
    createTextNode: (text: string | undefined) => new MenuElement('#text', text),
    getElementById(id: string) {
      if (!elements.has(id)) elements.set(id, new MenuElement());
      return elements.get(id)!;
    },
  };
}
