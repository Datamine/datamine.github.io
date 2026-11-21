interface CollectionMenuOptions {
  element: HTMLElement;
  content: HTMLElement;
  summary: HTMLElement;
  button: HTMLElement;
  closeButton: HTMLElement;
  shade: HTMLElement;
  canvas: HTMLElement;
  getFound: () => readonly string[];
  beforeOpen: () => void;
}
import { COLLECTION_ITEMS } from './config/collection.ts';

/** A record of discoveries, without revealing their locations. */
export function createCollectionMenu({
  element,
  content,
  summary,
  button,
  closeButton,
  shade,
  canvas,
  getFound,
  beforeOpen,
}: CollectionMenuOptions) {
  function render() {
    const found = new Set(getFound()),
      fragment = document.createDocumentFragment();
    let count = 0;
    for (const item of COLLECTION_ITEMS) {
      const row = document.createElement('li'),
        owned = found.has(item.id);
      if (owned) count++;
      row.dataset.found = String(owned);
      row.textContent = owned ? '✓ ' + item.name : '○ Undiscovered';

      fragment.append(row);
    }
    content.replaceChildren(fragment);
    summary.textContent = count + ' / ' + COLLECTION_ITEMS.length + ' discovered';
  }
  function close() {
    if (element.hidden) return;
    element.hidden = true;
    shade.hidden = true;
    canvas.focus({ preventScroll: true });
  }
  function open() {
    beforeOpen();
    render();
    element.hidden = false;
    shade.hidden = false;
    closeButton.focus({ preventScroll: true });
  }
  button.addEventListener('click', open);
  closeButton.addEventListener('click', close);
  shade.addEventListener('click', close);
  return {
    open,
    close,
    render,
    get active() {
      return !element.hidden;
    },
  };
}
