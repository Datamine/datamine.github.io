/** Schedule UI work independently of display-rate animation. Event handlers
 * may force a refresh; repeating frame requests coalesce into one update. */
export function createUIJob(run, { intervalMs = 100, now = () => performance.now() } = {}) {
  let last = -Infinity;
  return function update(force = true) {
    const time = now();
    if (!force && time - last < intervalMs) return false;
    last = time;
    run();
    return true;
  };
}
/** Cache DOM handles and skip unchanged property writes. This avoids replacing
 * identical text nodes every frame while keeping the ordinary element API. */
export function createDOMView(document) {
  const handles = new Map(),
    proxies = new WeakMap();
  function wrap(element) {
    if (!element || proxies.has(element)) return element ? proxies.get(element) : element;
    const proxy = new Proxy(element, {
      get(target, key) {
        const value = Reflect.get(target, key, target);
        return typeof value === 'function' ? value.bind(target) : value;
      },
      set(target, key, value) {
        if (Reflect.get(target, key, target) !== value) Reflect.set(target, key, value, target);
        return true;
      },
    });
    proxies.set(element, proxy);
    return proxy;
  }
  return (id) => {
    if (!handles.has(id)) handles.set(id, wrap(document.getElementById(id)));
    return handles.get(id);
  };
}
