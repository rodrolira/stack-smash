import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from './config';
import { BootScene } from './scenes/BootScene';
import { MenuScene } from './scenes/MenuScene';
import { LevelSelectScene } from './scenes/LevelSelectScene';
import { GameScene } from './scenes/GameScene';
import { ShopScene } from './scenes/ShopScene';
import { PrivacyScene } from './scenes/PrivacyScene';
import { SettingsScene } from './scenes/SettingsScene';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game',
  backgroundColor: '#120827',
  // Resolución base portrait, escalada para llenar cualquier pantalla de móvil
  // manteniendo proporción (FIT + CENTER).
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
  },
  // El juego es hyper-casual sin física real: la "gravedad" de los trozos que
  // caen se hace con tweens, así que no cargamos motor de física.
  scene: [
    BootScene,
    MenuScene,
    LevelSelectScene,
    GameScene,
    ShopScene,
    PrivacyScene,
    SettingsScene,
  ],
};

const game = new Phaser.Game(config);

// En móvil, el tamaño real del canvas puede no estar listo cuando Phaser mide
// por primera vez (barra de direcciones, safe-area, orientación). Si eso pasa,
// el mapeo de coordenadas del toque queda corrido (los taps caen a un costado).
// Forzamos recalcular la escala una vez que el layout se asienta y ante cambios.
const refreshScale = (): void => {
  game.scale.refresh();
};
window.addEventListener('load', () => setTimeout(refreshScale, 60));
window.addEventListener('resize', refreshScale);
window.addEventListener('orientationchange', () => setTimeout(refreshScale, 120));
// Al volver de segundo plano (cambiar de app) el viewport pudo cambiar.
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) setTimeout(refreshScale, 60);
});
