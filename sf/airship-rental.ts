import type { AirshipRentalStatus } from './types/finance.ts';
import type { CommandResult } from './types/network.ts';
import type { TextValues } from './types/content.ts';
import { configuredDialogue, renderDialogueText } from './dialogue-config.ts';
import { DIALOGUE_TEXT } from './config/dialogue.ts';
import { AIRSHIP_RULES } from './config/airship.ts';
import type { Actor } from './types/world.ts';

export function airshipResetCountdown(resetAt: number, time = Date.now()) {
  const seconds = Math.max(0, Math.ceil((resetAt - time) / 1000));
  if (!seconds) return 'now';
  const minutes = Math.floor(seconds / 60),
    remainder = seconds % 60;
  return (minutes ? minutes + 'm ' : '') + remainder + 's';
}

/** The clock shown here is only a presentation of the server's reset deadline.
 * Recall fees and priority ownership are decided by the backend. */
export function airshipAttendantDialogue(
  npc: Partial<Actor> | undefined,
  {
    status,
    now,
    refresh,
    recall,
    rent,
  }: {
    status: () => Partial<AirshipRentalStatus> & { resetAt: number };
    now: () => number;
    refresh: () => CommandResult | Promise<CommandResult>;
    recall: (price: number) => CommandResult | Promise<CommandResult>;
    rent: (price: number) => unknown;
  },
) {
  const ship = status(),
    price = ship.rentalPrice ?? ship.recallPrice ?? AIRSHIP_RULES.initialPrice;
  const text = (id: string, values?: TextValues) =>
    renderDialogueText(DIALOGUE_TEXT[id as keyof typeof DIALOGUE_TEXT], values);
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
              countdown: airshipResetCountdown(result.airship!.resetAt, result.airship!.serverTime),
            })
          : result.message,
      })),
  };
  const person = configuredDialogue('airship', npc, actions, values());
  const intro = () => {
    const intro = configuredDialogue('airship', npc, actions, values()).intro;
    return typeof intro === 'function' ? intro() : intro || '';
  };
  person.intro = intro;
  person.choices = person.choices!.filter(
    (choice) =>
      choice.id === 'reset' ||
      (choice.id === 'recall' && ship.canRecall) ||
      (choice.id === 'board' && !ship.active && (!ship.reservedName || ship.reservedForYou)),
  );
  return Object.assign(person, { intro });
}
