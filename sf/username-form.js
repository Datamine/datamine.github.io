/** Shared presentation for the loading and Character username pickers.
 * Availability, moderation and cooldowns are enforced by the server. */
export function createUsernameForm(
  form,
  { client = null, allowBlank = false, now = Date.now, onChange = () => {} } = {},
) {
  const field = form.querySelector('[data-username-input]'),
    button = form.querySelector('[data-username-save]'),
    hint = form.querySelector('[data-username-status]'),
    buttonLabel = button.textContent;
  let dirty = !!field.value,
    pending = null,
    unsubscribe = null,
    message = '',
    messageUntil = 0,
    isError = false;
  function update() {
    const state = client?.state,
      seconds = Math.max(
        0,
        Math.ceil(((state?.renameAt || 0) - (now() + (state?.serverOffset || 0))) / 1000),
      );
    button.disabled = !!pending || !state?.connected || seconds > 0;
    field.disabled = !!pending;
    button.textContent = pending ? 'Saving…' : buttonLabel;
    if (state?.name && !dirty && field.value !== state.name) field.value = state.name;
    const text =
      message && now() < messageUntil
        ? message
        : !state?.connected
          ? 'Choose a name while you connect.'
          : seconds
            ? 'You can change your name again in ' + seconds + 's.'
            : state.autoName
              ? 'Random name assigned. Your first change has no cooldown.'
              : '1–12 letters, numbers or underscores. Names are unique.';
    if (hint.textContent !== text) hint.textContent = text;
    hint.dataset.error = String(!!message && now() < messageUntil && isError);
    form.setAttribute('aria-busy', String(!!pending));
    onChange();
  }
  async function save() {
    if (pending) return pending;
    const state = client?.state,
      name = field.value.trim();
    if (!state?.connected) {
      message = 'Connect to the server before saving your name.';
      messageUntil = now() + 6000;
      isError = true;
      update();
      return { ok: false, message };
    }
    if (name === state.name || (allowBlank && !name))
      return { ok: true, name: state.name, unchanged: true };
    if (form.reportValidity?.() === false)
      return { ok: false, message: 'Use 1–12 letters, numbers or underscores.' };
    pending = Promise.resolve()
      .then(() => client.command('rename', { name }))
      .catch(() => ({ ok: false, message: 'Unable to save your name. Please try again.' }));
    update();
    const result = await pending;
    pending = null;
    isError = !result.ok;
    message = result.ok ? 'Username saved.' : result.message || 'Unable to save your name.';
    messageUntil = now() + (result.ok ? 1800 : 6000);
    if (result.ok) {
      dirty = false;
      field.value = result.name;
    }
    update();
    return result;
  }
  function setClient(value) {
    unsubscribe?.();
    client = value;
    unsubscribe = client?.subscribe?.(() => update());
    update();
  }
  field.addEventListener('input', () => {
    dirty = true;
    message = '';
    messageUntil = 0;
    update();
  });
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    void save();
  });
  setClient(client);
  return {
    save,
    update,
    setClient,
    get pending() {
      return !!pending;
    },
  };
}
