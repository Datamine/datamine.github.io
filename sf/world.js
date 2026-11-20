import { createSFWorld } from './world/scene.js';
import { createLoadingScreen } from './loading-screen.js';
import { bootMultiplayer } from './multiplayer-client.js';
import { refreshWorldMap } from './world-stream.js';
export { createWorldModel } from './world/model.js';

if (typeof document !== 'undefined' && typeof document.querySelectorAll === 'function') {
  for (const button of document.querySelectorAll('[data-refresh-map]'))
    button.addEventListener('click', () => {
      button.disabled = true;
      refreshWorldMap();
    });
  const loading = createLoadingScreen(document.getElementById('sf-loading'));
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
