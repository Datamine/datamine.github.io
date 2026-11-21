import type { Point } from './types/geometry.ts';
import type { ActionReceipt, LocalPlayer } from './types/world.ts';
import { requiredValue } from './types/assert.ts';
interface DebugConsoleOptions {
  panel: HTMLElement;
  form: HTMLFormElement;
  input: HTMLInputElement;
  status: HTMLElement;
  xOutput: HTMLElement;
  yOutput: HTMLElement;
  fpsOutput?: HTMLElement | null;
  getFPS?: () => number;
  performanceOutputs?: Record<string, HTMLElement | null>;
  getPerformance?: () => Record<string, string>;
  getPosition: () => Point;
  teleport: (x: number, y: number) => ActionReceipt;
  beforeOpen: () => void;
  onMessage: (message: string) => void;
  focusWorld: () => void;
}
type WorldCommand =
  { type: 'debug' } | { type: 'teleport'; x: number; y: number } | { error: string };
import { isFiniteNumber, isRecord } from './types/json.ts';

/** Commands accept numbers, never JavaScript. Map coordinates are the center
 * of the character in the same east/south plane used by the rendered world. */
export function parseWorldCommand(value: string): WorldCommand {
  const text = String(value).trim();
  if (/^:debug$/i.test(text)) return { type: 'debug' };
  const number = '([+-]?(?:\\d+(?:\\.\\d*)?|\\.\\d+)(?:e[+-]?\\d+)?)',
    match = text.match(new RegExp('^:tp\\s+' + number + '\\s*,\\s*' + number + '$', 'i'));
  if (!match) return { error: 'Use :debug or :tp x,y. Press Enter to run the command.' };
  const x = Number(match[1]),
    y = Number(match[2]);
  if (!Number.isFinite(x) || !Number.isFinite(y) || Math.abs(x) > 1e6 || Math.abs(y) > 1e6)
    return { error: 'Enter finite map coordinates between −1,000,000 and 1,000,000.' };
  return { type: 'teleport', x, y };
}
export function debugMapPosition(player: Pick<LocalPlayer, 'x' | 'y'>) {
  return { x: player.x + 0.5, y: player.y + 0.5 };
}
export function debugTilePosition(x: number, y: number) {
  return { x: x - 0.5, y: y - 0.5 };
}
export function createFrameMeter() {
  let start: number | null = null,
    previous: number | null = null,
    count = 0,
    fps = 0;
  return {
    sample(time: unknown) {
      if (!isFiniteNumber(time)) return fps;
      if (previous === null || time <= previous || time - previous > 1500) {
        start = time;
        count = 0;
        fps = 0;
      } else count++;
      previous = time;
      const elapsed = time - requiredValue(start, 'Frame meter start');
      if (elapsed >= 500) {
        fps = (count * 1000) / elapsed;
        start = time;
        count = 0;
      }
      return fps;
    },
    reset() {
      start = null;
      previous = null;
      count = 0;
      fps = 0;
    },
    get fps() {
      return fps;
    },
  };
}

export function createDebugConsole({
  panel,
  form,
  input,
  status,
  xOutput,
  yOutput,
  fpsOutput = null,
  getFPS = () => 0,
  performanceOutputs = {},
  getPerformance = () => ({}),
  getPosition,
  teleport,
  beforeOpen,
  onMessage,
  focusWorld,
}: DebugConsoleOptions) {
  const history: string[] = [];
  let historyIndex = 0,
    draft = '';
  const editing = (target: EventTarget | null) =>
    isRecord(target) &&
    (target.isContentEditable === true ||
      (['INPUT', 'SELECT', 'TEXTAREA'] satisfies [string, string, string]).includes(
        typeof target.tagName === 'string' ? target.tagName : '',
      ));
  function update() {
    if (panel.hidden) return;
    const p = getPosition();
    for (const [out, value] of [
      [xOutput, p.x],
      [yOutput, p.y],
    ] as const) {
      const text = value.toFixed(3);
      if (out.textContent !== text) out.textContent = text;
    }
    if (fpsOutput) {
      const value = getFPS(),
        text = value > 0 ? value.toFixed(1) : '—';
      if (fpsOutput.textContent !== text) fpsOutput.textContent = text;
    }
    for (const [key, text] of Object.entries(getPerformance())) {
      const output = performanceOutputs[key];
      if (output && output.textContent !== text) output.textContent = text;
    }
  }
  function closeCommand(focus = true) {
    form.hidden = true;
    if (focus) focusWorld();
  }
  function openCommand(value = ':') {
    beforeOpen();
    form.hidden = false;
    input.value = value;
    status.textContent = 'Enter runs the command. Escape cancels.';
    status.dataset.error = 'false';
    historyIndex = history.length;
    draft = value;
    input.focus({ preventScroll: true });
    input.setSelectionRange(value.length, value.length);
  }
  function execute() {
    const value = input.value,
      command = parseWorldCommand(value);
    if ('error' in command) {
      status.textContent = command.error;
      status.dataset.error = 'true';
      input.focus();
      return false;
    }
    const result =
      command.type === 'debug'
        ? { ok: true, message: 'Debug coordinates enabled.' }
        : teleport(command.x, command.y);
    if (!result.ok) {
      status.textContent = result.message || 'Command failed.';
      status.dataset.error = 'true';
      input.focus();
      return false;
    }
    if (history.at(-1) !== value) history.push(value);
    if (history.length > 30) history.shift();
    if (command.type === 'debug') panel.hidden = false;
    update();
    onMessage(result.message || 'Command completed.');
    closeCommand();
    return true;
  }
  function handleKey(event: KeyboardEvent) {
    if (event.ctrlKey || event.metaKey || event.altKey || event.isComposing) return false;
    if (!form.hidden && event.target === input) {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeCommand();
      } else if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
        event.preventDefault();
        if (historyIndex === history.length) draft = input.value;
        historyIndex = Math.max(
          0,
          Math.min(history.length, historyIndex + (event.key === 'ArrowUp' ? -1 : 1)),
        );
        input.value = history[historyIndex] ?? draft;
        input.setSelectionRange(input.value.length, input.value.length);
      }
      return true;
    }
    if (event.key === ':' && !event.repeat && !editing(event.target)) {
      event.preventDefault();
      openCommand();
      return true;
    }
    return false;
  }
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    execute();
  });
  requiredValue(
    form.querySelector('[data-command-close]'),
    'Command close button',
  ).addEventListener('click', () => closeCommand());
  requiredValue(panel.querySelector('[data-debug-close]'), 'Debug close button').addEventListener(
    'click',
    () => {
      panel.hidden = true;
      focusWorld();
    },
  );
  requiredValue(
    panel.querySelector('[data-debug-teleport]'),
    'Debug teleport button',
  ).addEventListener('click', () => {
    const p = getPosition();
    openCommand(':tp ' + Number(p.x.toFixed(4)) + ',' + Number(p.y.toFixed(4)));
  });
  document.addEventListener('pointerdown', (event) => {
    if (!form.hidden && !form.contains(event.target as Node | null)) closeCommand(false);
  });
  return {
    handleKey,
    openCommand,
    update,
    close() {
      panel.hidden = true;
      closeCommand(false);
    },
  };
}
