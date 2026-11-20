/** DOM-only quest journal; quest progression remains independent of the UI. */
export function createQuestMenu({
  element,
  content,
  button,
  closeButton,
  shade,
  canvas,
  quests,
  beforeOpen,
}) {
  function render() {
    const entries = quests.entries();
    content.replaceChildren();
    for (const q of entries) {
      const card = document.createElement('article');
      card.className = 'sf-quest-card';
      card.dataset.stage = q.stage;
      const status = document.createElement('span');
      status.className = 'sf-quest-status';
      status.textContent = q.status;
      const title = document.createElement('h3');
      title.textContent = q.title;
      const description = document.createElement('p');
      description.textContent = q.description;
      const reward = document.createElement('p');
      reward.className = 'sf-quest-reward';
      reward.textContent = 'Reward: ' + (q.rewardLabel || q.reward + ' coins');
      card.append(status, title, description);
      if (q.targets?.length) {
        const list = document.createElement('ul');
        for (const target of q.targets) {
          const li = document.createElement('li');
          li.textContent = (target.done ? '✓ ' : '○ ') + target.area;
          list.append(li);
        }
        card.append(list);
      }
      card.append(reward);
      content.append(card);
    }
    button.dataset.quest = entries.some((q) => q.stage === 'carrying')
      ? 'carrying'
      : entries.some((q) => q.stage === 'accepted')
        ? 'accepted'
        : entries[0].stage;
    button.setAttribute(
      'aria-label',
      'Quests: ' + entries.map((q) => q.title + ', ' + q.status).join('; ') + '. Open with Q.',
    );
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
  render();
  return {
    open,
    close,
    render,
    get active() {
      return !element.hidden;
    },
  };
}
