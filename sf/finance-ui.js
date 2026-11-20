import { DIALOGUE_TEXT } from './config/dialogue.js';
import { configuredDialogue, renderDialogueText } from './dialogue-config.js';
import { GROWTH_EQUITY } from './config/finance.js';
import { atDuelArena } from './duel-layout.js';
export function growthDialogue(
  npc,
  service,
  { capital = false, claimFunding = () => ({ ok: false }), funded = false } = {},
) {
  if (!capital)
    return configuredDialogue('growth-exchange', npc, {
      list: () => service.list(),
      sell: () => service.sell(),
    });
  return {
    ...configuredDialogue(
      'growth-capital',
      npc,
      {},
      { growthBatches: GROWTH_EQUITY.batches.map((n) => n.toLocaleString('en-US')).join(', ') },
    ),
    choices: [
      ...(!funded ? [{ label: DIALOGUE_TEXT['growth-funding'], accept: claimFunding }] : []),
      ...GROWTH_EQUITY.batches.map((amount) => ({
        label: renderDialogueText(DIALOGUE_TEXT['growth-buy'], {
          amount: amount.toLocaleString('en-US'),
        }),
        accept: () => service.buy(amount),
      })),
    ],
  };
}
export function createGrowthTicker(element) {
  let last = '';
  return {
    update(position) {
      element.hidden = !position;
      if (!position) return;
      const signature = JSON.stringify(position);
      if (signature === last) return;
      last = signature;
      element.replaceChildren();
      const label = document.createElement('strong');
      label.textContent =
        position.phase === 'private'
          ? 'Private growth equity'
          : 'Growth equity · ' + position.seconds + 's';
      const quote = document.createElement('span');
      quote.textContent =
        position.value.toLocaleString('en-US') +
        ' coins' +
        (position.phase === 'listed'
          ? ' · ' +
            (position.net >= 0 ? '+' : '') +
            ((100 * position.net) / position.cost).toFixed(1) +
            '% net'
          : ' · List at Times Square');
      quote.className = position.net >= 0 ? 'sf-market-up' : 'sf-market-down';
      element.append(label, quote);
      if (position.history?.length > 1) {
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('viewBox', '0 0 200 32');
        svg.setAttribute('aria-label', 'Recent growth equity prices');
        const values = position.history,
          min = Math.min(position.cost, ...values),
          max = Math.max(position.cost + 1, ...values),
          line = document.createElementNS(svg.namespaceURI, 'polyline');
        line.setAttribute(
          'points',
          values
            .map(
              (v, i) =>
                (i * 200) / (values.length - 1) + ',' + (29 - ((v - min) * 26) / (max - min)),
            )
            .join(' '),
        );
        svg.append(line);
        element.append(svg);
      }
    },
  };
}
export function createDuelMenu({ element, client, player, announce }) {
  let offer = null,
    opponent = null,
    busy = false,
    lastRoster = '',
    settleTimer = null,
    resultUntil = 0;
  const $ = (id) => document.getElementById(id),
    status = $('sf-duel-status'),
    form = $('sf-duel-form'),
    select = $('sf-duel-opponent'),
    stake = $('sf-duel-stake'),
    accept = $('sf-duel-accept'),
    decline = $('sf-duel-decline');
  const request = async (action, args) => {
    if (busy) return;
    busy = true;
    try {
      const r = await client.command(action, args);
      if (!r.ok) status.textContent = r.message;
      return r;
    } finally {
      busy = false;
    }
  };
  function render() {
    form.hidden = !!offer;
    accept.hidden = !offer || offer.to !== client?.state.id;
    decline.hidden = !offer;
    accept.disabled = busy;
    decline.disabled = busy;
    if (offer) {
      const incoming = offer.to === client.state.id;
      status.textContent =
        (incoming ? offer.fromName : 'You') +
        ' offered ' +
        offer.stake.toLocaleString('en-US') +
        ' coins each. Winner gets ' +
        (offer.stake * 2).toLocaleString('en-US') +
        '. ' +
        (incoming ? 'Accept this exact stake?' : 'Waiting for ' + offer.toName + ' to accept.');
      accept.textContent = 'Accept · Stake ' + offer.stake.toLocaleString('en-US') + ' coins';
    }
  }
  function update() {
    if (element.hidden) return;
    if (!client?.state.connected) {
      status.textContent = 'Connect to multiplayer to wager with another player.';
      form.hidden = true;
      accept.hidden = decline.hidden = true;
      return;
    }
    if (offer) {
      render();
      return;
    }
    if (Date.now() < resultUntil) return;
    const peers = client.remotePlayers().filter((p) => atDuelArena(p.x, p.z) && p.hp > 0),
      key = peers.map((p) => p.id + ':' + p.name).join(',');
    if (key !== lastRoster) {
      lastRoster = key;
      const selected = select.value;
      select.replaceChildren();
      for (const p of peers) {
        const option = document.createElement('option');
        option.value = p.id;
        option.textContent = p.name;
        select.append(option);
      }
      select.value = String(opponent || selected);
      if (!select.value && peers.length) select.value = String(peers[0].id);
    }
    form.querySelector('button').disabled = busy || !peers.length;
    status.textContent = peers.length
      ? 'Equal stakes. A fair 50–50 coin flip. The winner receives both stakes.'
      : 'Bring another player to the arena. Coins move only after they accept.';
  }
  function open(target) {
    opponent = target?.id || null;
    element.hidden = false;
    render();
    update();
    $('sf-close-duel').focus({ preventScroll: true });
  }
  element.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      element.hidden = true;
    }
  });
  $('sf-close-duel').addEventListener('click', () => {
    element.hidden = true;
  });
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const r = await request('duelOffer', { id: Number(select.value), stake: Number(stake.value) });
    if (r?.ok) render();
  });
  accept.addEventListener('click', () => {
    if (offer) request('duelAccept', { offer: offer.id, stake: offer.stake });
  });
  decline.addEventListener('click', () => {
    if (offer) request('duelDecline', { offer: offer.id });
  });
  client?.subscribe((m) => {
    if (m.type === 'duelOffer') {
      resultUntil = 0;
      offer = m.offer;
      open();
      announce('A ' + offer.stake + ' coin duel offer awaits your agreement.', 'Duel Arena');
    } else if (m.type === 'duelClosed') {
      resultUntil = Date.now() + 5000;
      offer = null;
      render();
      status.textContent = m.message;
      announce(m.message, 'Duel Arena');
    } else if (m.type === 'duelSettled') {
      resultUntil = Date.now() + 10000;
      offer = null;
      element.hidden = false;
      form.hidden = true;
      accept.hidden = decline.hidden = true;
      status.textContent = 'The coin is in the air…';
      status.classList.add('sf-duel-flipping');
      clearTimeout(settleTimer);
      settleTimer = setTimeout(() => {
        status.classList.remove('sf-duel-flipping');
        status.textContent =
          m.winner === client.state.id
            ? 'You win! ' + m.stake.toLocaleString('en-US') + ' coins profit.'
            : m.winnerName + ' wins. You lose ' + m.stake.toLocaleString('en-US') + ' coins.';
        announce(status.textContent, 'Duel Arena');
      }, 1600);
    }
  });
  return {
    open,
    update,
    get active() {
      return !element.hidden;
    },
  };
}
