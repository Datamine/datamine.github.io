import { requiredValue } from './types/assert.ts';
import type { ActionReceipt } from './types/world.ts';
interface InterviewUIOptions {
  element: HTMLElement;
  job?: Pick<ReturnType<typeof import('./ai-lab.ts').createAILabJob>, 'state'>;
  client?: Parameters<typeof serverCommand>[0];
  onOpen?: () => void;
  onClose?: () => void;
  onResult?: (result: ActionReceipt) => void;
  clock?: () => number;
  random?: () => number;
}
import { serverCommand, serverConnected } from './server-connection.ts';
import { createArithmeticInterview, AI_INTERVIEW_PASS_SCORE } from './ai-lab.ts';

/** This screen owns its timer and input; the world owns location and wages. */
export function createAIInterviewUI({
  element,
  job,
  client = null,
  onOpen = () => {},
  onClose = () => {},
  onResult = () => {},
  clock,
  random,
}: InterviewUIOptions) {
  const game = createArithmeticInterview({ clock, random });
  let timer: ReturnType<typeof setInterval> | 0 = 0,
    reported = false,
    polling = false,
    lastPoll = 0;
  async function remote(verb: string, args = {}) {
    const result = await serverCommand(client, 'playerAction', { verb, ...args });
    if (result.interview) {
      const s = result.interview;
      Object.assign(game.state, {
        ...s,
        deadline: performance.now() + s.remaining * 1000,
        problem: s.problem ? { text: s.problem } : null,
      });
    }
    return result;
  }
  const $ = (id: string) =>
      requiredValue(element.querySelector<HTMLElement>('#' + id), 'Interview control ' + id),
    input = requiredValue(
      element.querySelector<HTMLInputElement>('#sf-interview-answer'),
      'Interview answer input',
    ),
    start = requiredValue(
      element.querySelector<HTMLButtonElement>('#sf-interview-start'),
      'Interview start button',
    );
  function finish() {
    if (reported) return;
    reported = true;
    clearInterval(timer);
    timer = 0;
    if (game.state.phase === 'finished') {
      const result = {
        ok: true,
        message:
          game.state.score >= AI_INTERVIEW_PASS_SCORE
            ? 'You got the job! Welcome to the AI Lab.'
            : 'Score: ' + game.state.score + '. You need 40 or more for the job.',
      };
      $('sf-interview-result').textContent = result.message || 'The interview could not begin.';
      onResult(result);
    } else
      $('sf-interview-result').textContent =
        'Interview ended early. No result was submitted. You can try again.';
    $('sf-interview-result').hidden = false;
    input.disabled = true;
    start.hidden = false;
    start.textContent = 'Try again';
    start.focus();
  }
  function render() {
    if (!serverConnected(client)) {
      clearInterval(timer);
      timer = 0;
      return;
    }
    if (game.state.phase === 'running') {
      game.state.remaining = Math.max(0, (game.state.deadline - performance.now()) / 1000);
      if (!polling && performance.now() - lastPoll >= 1000) {
        polling = true;
        lastPoll = performance.now();
        remote('interviewStatus')
          .then(() => {
            polling = false;
          })
          .catch(() => {
            polling = false;
          });
      }
    }
    const s = game.state;
    $('sf-interview-time').textContent = Math.ceil(s.remaining) + 's';
    $('sf-interview-score').textContent = String(s.score);
    $('sf-interview-problem').textContent = s.problem?.text || 'Ready?';
    if (s.phase === 'finished' || s.phase === 'cancelled') finish();
  }
  async function begin() {
    start.disabled = true;
    const result = await remote('interviewStart');
    start.disabled = false;
    if (!result.ok || !serverConnected(client)) {
      $('sf-interview-result').hidden = false;
      $('sf-interview-result').textContent = result.message || 'The interview could not begin.';
      return;
    }
    reported = false;
    input.value = '';
    input.disabled = false;
    input.removeAttribute('aria-invalid');
    $('sf-interview-result').hidden = true;
    start.hidden = true;
    render();
    input.focus();
    clearInterval(timer);
    timer = setInterval(render, 100);
  }
  function close() {
    if (serverConnected(client)) remote('interviewCancel');
    game.cancel();
    clearInterval(timer);
    timer = 0;
    element.hidden = true;
    onClose();
  }
  async function submit() {
    const answer = input.value;
    if (!answer) return;
    const correct = (await remote('interviewAnswer', { answer })).ok;
    if (correct && input.value === answer) {
      input.value = '';
      input.removeAttribute('aria-invalid');
    } else if (input.value) input.setAttribute('aria-invalid', 'true');
    render();
  }
  start.addEventListener('click', begin);
  input.addEventListener('input', submit);
  $('sf-interview-close').addEventListener('click', close);
  function handleKey(e: KeyboardEvent) {
    if (element.hidden) return false;
    if (e.key === 'Escape') {
      e.preventDefault();
      close();
      return true;
    }
    if (e.key === 'Enter' && e.target === input) {
      e.preventDefault();
      submit();
      return true;
    }
    if (e.key === 'Tab') {
      const buttons = [
          ...element.querySelectorAll<HTMLButtonElement | HTMLInputElement>('button,input'),
        ].filter((b) => !b.hidden && !b.disabled),
        first = buttons[0],
        last = buttons.at(-1);
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last?.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first?.focus();
      }
    }
    return true;
  }
  return {
    game,
    open() {
      if (!serverConnected(client) || !element.hidden) return;
      onOpen();
      element.hidden = false;
      reported = false;
      input.value = '';
      input.disabled = true;
      game.state.phase = 'ready';
      game.state.score = 0;
      game.state.remaining = 120;
      game.state.problem = null;
      $('sf-interview-result').hidden = true;
      start.hidden = false;
      start.textContent = 'Start · 2 minutes';
      $('sf-interview-target').textContent = AI_INTERVIEW_PASS_SCORE + '+';
      render();
      start.focus();
    },
    close,
    handleKey,
    get visible() {
      return !element.hidden;
    },
  };
}
