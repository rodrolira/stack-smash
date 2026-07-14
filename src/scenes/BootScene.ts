import Phaser from 'phaser';
import { SaveManager } from '../systems/SaveManager';
import { AdManager } from '../systems/AdManager';
import { IAPManager } from '../systems/IAPManager';
import { SoundManager } from '../systems/SoundManager';

// BootScene — carga el estado guardado, inicializa managers y salta al menú.
// No cargamos assets externos: todo el arte se dibuja con Graphics, así el
// scaffold es jugable sin archivos de imagen/sonido.
export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  async create(): Promise<void> {
    SaveManager.load();
    SoundManager.loadPreference();
    await Promise.all([AdManager.init(), IAPManager.init()]);
    this.scene.start('Menu');
  }
}
