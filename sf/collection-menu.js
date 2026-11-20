import { COLLECTION_ITEMS } from './config/collection.js';

/** The journal is the only interface that provides discovery clues. */
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
}) {
  function render() {
    const found = new Set(getFound()),
      fragment = document.createDocumentFragment();
    let count = 0;
    for (const item of COLLECTION_ITEMS) {
      const row = document.createElement('li'),
        owned = found.has(item.id);
      if (owned) count++;
      row.dataset.found = String(owned);
      row.textContent = (owned ? '✓ ' : '○ ') + item.name;
      if (item.hint) {
        const hint = document.createElement('small');
        hint.textContent = item.hint;
        row.append(hint);
      }
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
