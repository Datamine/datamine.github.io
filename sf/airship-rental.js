import { configuredDialogue, renderDialogueText } from './dialogue-config.js';
import { DIALOGUE_TEXT } from './config/dialogue.js';
import { AIRSHIP_RULES } from './config/airship.js';

export function airshipResetCountdown(resetAt, time = Date.now()) {
  const seconds = Math.max(0, Math.ceil((resetAt - time) / 1000));
  if (!seconds) return 'now';
  const minutes = Math.floor(seconds / 60),
    remainder = seconds % 60;
  return (minutes ? minutes + 'm ' : '') + remainder + 's';
}

/** The clock shown here is only a presentation of the server's reset deadline.
 * Recall fees and priority ownership are decided by the backend. */
export function airshipAttendantDialogue(npc, { status, now, refresh, recall, rent }) {
  const ship = status(),
    price = ship.rentalPrice ?? ship.recallPrice ?? AIRSHIP_RULES.initialPrice;
  const text = (id, values) => renderDialogueText(DIALOGUE_TEXT[id], values);
  const values = () => {
    const current = status(),
      availability = current.active
        ? 'airship-active'
        : current.reservedForYou
          ? 'airship-prepaid'
          : current.reservedName
            ? 'airship-reserved'
            : 'airship-moored';
    return {
      price,
      initialPrice: AIRSHIP_RULES.initialPrice,
      increment: AIRSHIP_RULES.bidIncrement,
      countdown: airshipResetCountdown(current.resetAt, now()),
      lastPayment: current.lastPrice
        ? text('airship-last-payment', { lastPrice: current.lastPrice })
        : '',
      availability: text(availability, {
        pilot: current.pilot ? ' with ' + current.pilot : '',
        reservedName: current.reservedName,
      }),
      boardLabel: ship.reservedForYou
        ? 'Board prepaid airship'
        : 'Rent airship · ' + price + ' coins',
    };
  };
  const actions = {
    board: () => ({
      ok: true,
      message: text(ship.reservedForYou ? 'airship-board-prepaid' : 'airship-board', { price }),
      after: () => rent(price),
    }),
    recall: () =>
      Promise.resolve(recall(price)).then((result) => ({
        ...result,
        ...(result.ok ? { after: () => rent(price) } : {}),
      })),
    reset: () =>
      Promise.resolve(refresh()).then((result) => ({
        ...result,
        message: result.ok
          ? text('airship-reset', {
              countdown: airshipResetCountdown(result.airship.resetAt, result.airship.serverTime),
            })
          : result.message,
      })),
  };
  const person = configuredDialogue('airship', npc, actions, values());
  person.intro = () => configuredDialogue('airship', npc, actions, values()).intro;
  person.choices = person.choices.filter(
    (choice) =>
      choice.id === 'reset' ||
      (choice.id === 'recall' && ship.canRecall) ||
      (choice.id === 'board' && !ship.active && (!ship.reservedName || ship.reservedForYou)),
  );
  return person;
}
