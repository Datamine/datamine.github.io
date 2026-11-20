/** Conversation copy belongs in the dialogue menu. Only player chat and
 * explicitly marked event/animal cues may render above an actor's head. */
export function actorSpeechText(actor, time) {
  if (!actor.player && !actor.police && !actor.chasing && !actor.speechBubble) return '';
  return time < actor.speechUntil ? actor.speech || '' : '';
}
