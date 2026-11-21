# Animation and action audit

## Fixes

- Forward the sitting blend into the actual rendered skeleton. Both sitting down and standing up now use the existing 450 ms transition.
- Blend dancing in and out over 250 ms, preserving limb lengths and the relaxed arm positions at the transition boundary.
- Advance remote gestures at display frequency instead of freezing them at their midpoint. Repeated shared combat events restart the strike; clearing a server gesture does not truncate its clip.
- Render other players with the native bicycle, motorcycle, Ferrari, skateboard, surf, ski, gondola and bomber models. Keep weapons stowed during clips that need both hands.
- Use the same 750 ms forward roll and speed on the server and client. Replicate its progress, prevent repeated commands from resetting it, and wait for authoritative progress instead of rewinding a predicted clip.
- Keep stride counts, roll progress and vehicle rotations separate during interpolation. Ski and surf landings complete their rotation instead of unwinding it.
- Replicate gondola mode, ski heading and flip progress, exercise selection, fishing, eating and police surrender. Advance Ferrari wheel travel on the server.
- Smooth the owner’s and other players’ movement start/stop presentation. Gameplay position, damage, inventory and cooldowns remain server-controlled.

## Validation

- Full server suite: **209 passed, 3 optional tests skipped**.
- Final focused animation and generated-build suite: **99 passed**.
- Full client suite before rebuilding: **628 passed, 6 failed**. Two failures were stale generated files and passed after rebuilding. The four remaining checks predate this change: airport terminal triangle budget, mansion count, central street-light count, and Lincoln Way tree obstruction. Their assertions were not weakened.
- Focused animation coverage includes character rig/IK, all network presentation modes and gestures, movement interpolation, sitting, capture, rolling, rocket boarding/attitude, Sutro, Tahoe, skating, surfing, whale jumps, airship basket, NPC networking, loading NPC, dog-and-pony show, gym, fishing, teleport tablets, zoo animals and skateboarding dog.
- Chrome rendered **31 native animation clips** with advancing frames, finite model geometry, no WebGL errors and no JavaScript exceptions.
- Live Chrome controls: dance, sit, stand, speech and forward roll received successful server confirmations and completed.
- Live Chrome adventure: talk to Ahab, board, sail to the private kraken encounter, auto-attack to victory, collect the reward, and return to shore. No JavaScript exceptions.
- Rebuilt `sf/index.html` and the versioned map cache; navigation validation covers **496 destinations, 996 routes and 653 NPC approaches**.

The browser used software WebGL. This validates rendering and transitions, but is not a hardware FPS benchmark or a 2,000-player load test. Not every individual menu was manually clicked in Chrome; server action and conversation tests cover the broader action set.

## Review tools

Open `/sf/tools/animation-audit.html` through the local development server. It uses the actual game meshes, skeletons and native vehicle models, with grouped clips and pause/scrub controls.

Regression coverage: `sf/tests/animation-presentation.test.mts` and `sf/server/tests/animation-state.test.mts`.
