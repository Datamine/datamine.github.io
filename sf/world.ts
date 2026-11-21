import { requiredValue } from './types/assert.ts';
import { createSFWorld } from './world/scene.ts';
import { createLoadingScreen } from './loading-screen.ts';
import { bootMultiplayer } from './multiplayer-client.ts';
import { refreshWorldMap } from './world-stream.ts';
export { createWorldModel } from './world/model.ts';

if (typeof document !== 'undefined' && typeof document.querySelectorAll === 'function') {
  for (const button of document.querySelectorAll<HTMLButtonElement>('[data-refresh-map]'))
    button.addEventListener('click', () => {
      button.disabled = true;
      refreshWorldMap();
    });
  const loading = createLoadingScreen(
    requiredValue(document.getElementById('sf-loading'), 'Loading screen'),
  );
  if (document.documentElement.dataset.sfEntry === 'explore') loading.show();
  bootMultiplayer()
    .then((multiplayer) => {
      loading.bindClient(multiplayer);
      return createSFWorld({ multiplayer, loading });
    })
    .catch((error) => {
      console.error('World initialization:', error);
      loading.fail(error);
    });
}
