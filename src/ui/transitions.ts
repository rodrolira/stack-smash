import Phaser from 'phaser';
import { COLORS } from '../config';

// Transiciones de escena con fundido. Se funde desde/hacia el color de fondo
// (no negro puro) para que se sienta parte del juego.
const R = (COLORS.bgBottom >> 16) & 0xff;
const G = (COLORS.bgBottom >> 8) & 0xff;
const B = COLORS.bgBottom & 0xff;

/** Fundido de entrada. Llamar al inicio del create de la escena. */
export function fadeIn(scene: Phaser.Scene, ms = 220): void {
  scene.cameras.main.fadeIn(ms, R, G, B);
}

/** Funde a color y luego cambia de escena. Bloquea input durante el fundido para
 * evitar navegaciones dobles. */
export function goto(scene: Phaser.Scene, key: string, data?: object, ms = 220): void {
  const cam = scene.cameras.main;
  scene.input.enabled = false;
  cam.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
    scene.scene.start(key, data);
  });
  cam.fadeOut(ms, R, G, B);
}
