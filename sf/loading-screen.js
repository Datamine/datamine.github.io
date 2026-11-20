import { createLoadingNPC } from './loading-npc.js';
import { createUsernameForm } from './username-form.js';

/** Percentages describe completed initialization stages, never a timer. */
export const nextLoadingPaint = () =>
  new Promise((resolve) => requestAnimationFrame(() => setTimeout(resolve, 0)));
export function createLoadingScreen(element) {
  let percent = 0,
    npc = null,
    client = null,
    ready = false,
    entering = false,
    timer = null,
    unsubscribe = null,
    resolveReady = null,
    readyPromise = null;
  const form = element.querySelector('[data-loading-username]'),
    play = element.querySelector('[data-loading-play]');
  let username = null;
  username = form ? createUsernameForm(form, { allowBlank: true, onChange: updatePlay }) : null;
  function updatePlay() {
    if (form) form.hidden = client?.state.returningCharacter === true;
    if (play) play.disabled = !ready || entering || username?.pending || !client?.state.connected;
  }
  function report(value, label) {
    percent = Math.max(percent, Math.min(100, Math.round(value)));
    element.querySelector('[data-loading-percent]').textContent = percent + '% loaded';
    element.querySelector('[data-loading-stage]').textContent = label;
    element.querySelector('progress').value = percent;
    username?.update();
    updatePlay();
  }
  function hide() {
    npc?.stop();
    element.hidden = true;
    clearInterval(timer);
    timer = null;
    ready = false;
    const resolve = resolveReady;
    resolveReady = null;
    readyPromise = null;
    resolve?.();
  }
  function show() {
    percent = 0;
    ready = false;
    element.hidden = false;
    delete element.dataset.failed;
    element.querySelector('[data-loading-error]').textContent = '';
    if (play) play.hidden = true;
    const retry = element.querySelector('[data-refresh-map]');
    if (retry) retry.hidden = true;
    npc ??= createLoadingNPC(element.querySelector('[data-loading-npc]'));
    npc?.start();
    report(0, 'Preparing San Francisco…');
    timer ??= setInterval(() => {
      username?.update();
      updatePlay();
    }, 1000);
    if (!element.contains(document.activeElement)) element.focus({ preventScroll: true });
  }
  play?.addEventListener('click', async () => {
    if (!ready || entering || !client?.state.connected) return;
    entering = true;
    updatePlay();
    try {
      const result = await username.save();
      if (result.ok && client.state.connected) hide();
    } finally {
      entering = false;
      updatePlay();
    }
  });
  element.addEventListener('keydown', (event) => {
    if (event.key !== 'Tab') return;
    const fields = [...element.querySelectorAll('input,button')].filter(
        (n) => !n.disabled && !n.hidden && !n.closest('[hidden]'),
      ),
      index = fields.indexOf(document.activeElement);
    if (
      fields.length &&
      (index < 0 ||
        (event.shiftKey && index === 0) ||
        (!event.shiftKey && index === fields.length - 1))
    ) {
      event.preventDefault();
      fields[event.shiftKey ? fields.length - 1 : 0].focus();
    }
  });
  return {
    hide,
    show,
    report,
    get visible() {
      return !element.hidden;
    },
    bindClient(value) {
      unsubscribe?.();
      client = value;
      username?.setClient(value);
      unsubscribe = client?.subscribe(() => {
        updatePlay();
        if (!client.state.connected) hide();
      });
      updatePlay();
    },
    async stage(value, label) {
      report(value, label);
      await nextLoadingPaint();
    },
    async done() {
      if (element.hidden) return;
      report(100, 'Ready to play');
      await nextLoadingPaint();
      if (!play || client?.state.returningCharacter) {
        hide();
        return;
      }
      ready = true;
      play.hidden = false;
      updatePlay();
      readyPromise ??= new Promise((resolve) => (resolveReady = resolve));
      await readyPromise;
    },
    fail(error) {
      npc?.stop();
      clearInterval(timer);
      timer = null;
      ready = false;
      if (play) play.hidden = true;
      element.hidden = false;
      element.dataset.failed = 'true';
      element.querySelector('[data-loading-stage]').textContent =
        'Loading failed. Reload to try again.';
      element.querySelector('[data-loading-error]').textContent = error?.message || String(error);
      const retry = element.querySelector('[data-refresh-map]');
      if (retry) retry.hidden = false;
    },
  };
}
