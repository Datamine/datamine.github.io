// CONTENT-BINDINGS-MIGRATED
import { contentText } from './content-runtime.ts';
import { applyEntityEdits } from './world-edits.ts';
/** Dynamic targets share their identity and examine text with inspection tools. */
export function tigerInteractionTarget(zoo: {
  state: { tiger: { x: number; y: number } };
  dangerous: boolean;
}) {
  const animal = zoo.state.tiger;
  return applyEntityEdits(
    {
      id: 'tiger',
      kind: 'wild-tiger',
      label: contentText('interaction-targets.tigerInteractionTarget.label-1', {}),
      entry: { x: animal.x, y: animal.y },
      description: zoo.dangerous
        ? contentText('interaction-targets.tigerInteractionTarget.description-2.yes', {})
        : contentText('interaction-targets.tigerInteractionTarget.description-2.no', {}),
    },
    'sight:tiger',
  );
}
export function ropeInteractionTarget(bottom: { x: number; z: number }) {
  return applyEntityEdits(
    {
      id: 'shared-airship-rope',
      kind: 'airship-rope',
      label: contentText('interaction-targets.ropeInteractionTarget.label-3', {}),
      entry: { x: bottom.x - 0.5, y: bottom.z - 0.5 },
      description: contentText('interaction-targets.ropeInteractionTarget.description-4', {}),
    },
    'sight:shared-airship-rope',
  );
}
export function whaleInteractionTarget(index: number) {
  return applyEntityEdits(
    {
      id: 'whale-' + index,
      index,
      label: contentText('interaction-targets.whaleInteractionTarget.label-5', {}),
      kind: 'whale',
      description: contentText('interaction-targets.whaleInteractionTarget.description-6', {}),
    },
    'sight:whale-' + index,
  );
}
