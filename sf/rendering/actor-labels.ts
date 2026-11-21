import { editedSpeechText } from '../world-edits.ts';
/** Conversation copy belongs in the dialogue menu. Only player chat and
 * explicitly marked event/animal cues may render above an actor's head. */
export function actorSpeechText(
  actor: Partial<import('../types/scene-state.ts').ActorTag>,
  time: number,
) {
  if (!actor.player && !actor.police && !actor.chasing && !actor.speechBubble) return '';
  return time < (actor.speechUntil || 0) ? editedSpeechText(actor, actor.speech || '') : '';
}
