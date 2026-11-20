/** Small SVG portraits match the in-world skin, hair, and shirt palette. */
function chatHead(person) {
  const skin = person.skin || '#bd9369',
    hair = person.hair || '#574335',
    shirt = person.shirt || '#687f65';
  return `<svg viewBox="0 0 80 90" aria-hidden="true"><path fill="${shirt}" d="M7 90V74L24 64H56L73 74V90Z"/><path fill="${skin}" d="M30 55H50V70L40 76 30 70Z"/><path fill="#251e19" opacity=".22" d="M30 55H50V63L30 59Z"/><path fill="${skin}" d="M20 29L25 18H55L60 29V48L50 62H31L20 48Z"/><path fill="${hair}" d="M18 35V23L26 11 48 8 61 20 63 37 55 29 50 22 29 25 24 37Z"/><path fill="#272724" d="M28 35H34V39H28ZM47 35H53V39H47Z"/><path fill="#986447" d="M39 37L36 47H43Z"/><path fill="#714d39" d="M32 52H48L44 55H36Z"/><path fill="#fff4dc" opacity=".4" d="M25 28L29 25H47L50 28Z"/></svg>`;
}

/** Dialogue UI owns presentation only; choices bind to authoritative actions.
 * A follow-up animation/menu starts only on a receipt's explicit OK, never on
 * Leave, Escape, replacement by another conversation, or a stale async reply. */
export function createDialogue({
  element,
  journal,
  log,
  trade,
  canInteract = () => false,
  announce,
  onClose = () => {},
  getPlayer = () => ({}),
}) {
  let current = null,
    stage = 'intro',
    committed = false,
    after = null,
    receiptRepeat = false,
    session = 0;
  const close = () => {
    session++;
    after = null;
    element.hidden = true;
    journal.classList.remove('sf-conversing');
    log.hidden = false;
    current = null;
    onClose();
  };
  const cancel = close;
  const finish = () => {
    const action = after;
    close();
    if (canInteract()) action?.();
  };
  function button(label, fn) {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = label;
    b.addEventListener('click', () => {
      if (canInteract()) fn();
      else cancel();
    });
    return b;
  }
  function choicesFor(node) {
    return (
      node.choices ||
      (node.choice
        ? [{ label: node.choice, accept: node.accept, trade: node.trade, receipt: node.receipt }]
        : [])
    );
  }
  function branch(node) {
    // Identity/portrait are inherited; purchases, receipts and choices are
    // not. A submenu can never accidentally execute its parent's action.
    const person = { ...current };
    for (const key of [
      'intro',
      'question',
      'choices',
      'choice',
      'accept',
      'trade',
      'receipt',
      'skipIntro',
    ])
      delete person[key];
    current = { ...person, ...node };
    stage = node.skipIntro ? 'choices' : 'intro';
    committed = false;
    after = null;
    render();
  }
  function receive(choice, result = { ok: true }) {
    result ??= { ok: true };
    if (result.ok && result.after) after = result.after;
    receiptRepeat = choice.repeat ?? current.repeat;
    stage = result.pending ? 'pending' : 'receipt';
    const message = result.ok
      ? choice.receipt || result.message || current.receipt || 'Done.'
      : result.message || 'Unable to complete that action.';
    const text =
      message + (result.ok && result.bonus ? ' iPhone bonus: +' + result.bonus + ' coins.' : '');
    announce(text, current.name || current.label);
    render(text);
  }
  function choose(choice) {
    if (choice.next) {
      branch(choice.next);
      return;
    }
    if (committed) return;
    committed = true;
    try {
      const result = choice.accept
        ? choice.accept()
        : choice.trade
          ? trade(choice.trade)
          : { ok: true };
      if (result?.promise || result?.then) {
        stage = 'pending';
        render('Waiting for the server…');
        const selected = current,
          opened = session;
        Promise.resolve(result.promise || result)
          .then((receipt) => {
            if (session !== opened || current !== selected || stage !== 'pending' || !canInteract())
              return;
            receive(choice, {
              ...receipt,
              ...(receipt?.ok && (receipt.after || result.after)
                ? { after: receipt.after || result.after }
                : {}),
            });
          })
          .catch(() => {
            if (session === opened && current === selected && canInteract())
              receive(choice, {
                ok: false,
                message: 'Unable to complete that action. Please try again.',
              });
          });
      } else receive(choice, result);
    } catch (error) {
      console.error('Dialogue action:', error);
      receive(choice, { ok: false, message: 'Unable to complete that action. Please try again.' });
    }
  }
  function render(message) {
    element.replaceChildren();
    const player = stage === 'choices',
      person = player ? getPlayer() : current;
    const portrait = document.createElement('div');
    portrait.className = 'sf-chat-head';
    const name = document.createElement('strong');
    name.className = 'sf-chat-name';
    name.textContent = person.name || person.label || (player ? 'You' : 'Someone');
    const face = document.createElement('div');
    face.className = 'sf-chat-portrait';
    face.innerHTML = chatHead(person);
    portrait.append(name, face);
    const copy = document.createElement('div');
    copy.className = 'sf-chat-copy';
    if (!player) {
      const text = document.createElement('p'),
        body = message ?? current.intro ?? '';
      text.textContent = typeof body === 'function' ? body() : body;
      copy.append(text);
    }
    const controls = document.createElement('div');
    controls.className = 'sf-chat-options';
    if (stage === 'choices') {
      for (const choice of choicesFor(current))
        controls.append(button(choice.label, () => choose(choice)));
      controls.append(button(current.decline || 'Leave', cancel));
    } else if (stage === 'pending') {
      const thinking = button('Thinking…', () => {});
      thinking.disabled = true;
      controls.append(thinking, button('Keep exploring', cancel));
    } else {
      controls.append(
        button('OK', () => {
          if (stage === 'intro' && choicesFor(current).length) {
            stage = 'choices';
            render();
          } else if (stage === 'receipt' && !after && receiptRepeat) {
            stage = 'choices';
            committed = false;
            render();
          } else finish();
        }),
      );
      if (stage === 'intro' || (stage === 'receipt' && receiptRepeat && !after))
        controls.append(button('Leave', cancel));
    }
    copy.append(controls);
    element.dataset.speaker = player ? 'player' : 'npc';
    element.append(portrait, copy);
    element.querySelector('button:not([disabled])').focus({ preventScroll: true });
  }
  function open(person) {
    if (!canInteract()) return false;
    session++;
    current = person;
    stage = 'intro';
    committed = false;
    after = null;
    receiptRepeat = false;
    log.hidden = true;
    element.hidden = false;
    journal.classList.add('sf-conversing');
    render();
    return true;
  }
  function handleKey(event) {
    if (!current || !canInteract()) return false;
    const key = event.key.toLowerCase(),
      buttons = [...element.querySelectorAll('button:not([disabled])')],
      index = buttons.indexOf(document.activeElement);
    if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(key)) {
      event.preventDefault();
      const step = key === 'arrowup' || key === 'arrowleft' ? -1 : 1;
      buttons[index < 0 ? 0 : (index + step + buttons.length) % buttons.length]?.focus({
        preventScroll: true,
      });
      return true;
    }
    if (key === 'enter') {
      event.preventDefault();
      if (!event.repeat) (buttons[index] || buttons[0])?.click();
      return true;
    }
    if (key === 'tab') {
      if ((event.shiftKey && index <= 0) || (!event.shiftKey && index === buttons.length - 1)) {
        event.preventDefault();
        buttons[event.shiftKey ? buttons.length - 1 : 0]?.focus({ preventScroll: true });
      }
      return true;
    }
    return false;
  }
  function resolvePending(id, message) {
    if (!canInteract() || current?.id !== id || stage !== 'pending') return false;
    stage = 'receipt';
    receiptRepeat = current.repeat;
    render(message);
    return true;
  }
  return {
    open,
    close,
    cancel,
    handleKey,
    resolvePending,
    get active() {
      return !!current;
    },
  };
}
