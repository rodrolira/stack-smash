import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, COLORS } from '../config';

// Fondo con gradiente vertical rico + un glow radial suave arriba, dibujado en
// una textura generada una sola vez.
export function drawBackground(scene: Phaser.Scene): void {
  const key = 'bg-gradient';
  if (!scene.textures.exists(key)) {
    const tex = scene.textures.createCanvas(key, GAME_WIDTH, GAME_HEIGHT);
    const ctx = tex!.getContext();

    // Gradiente vertical de 3 paradas (más profundidad que un 2 paradas plano).
    const grad = ctx.createLinearGradient(0, 0, 0, GAME_HEIGHT);
    grad.addColorStop(0, '#3a1d6e');
    grad.addColorStop(0.5, hex(COLORS.bgTop));
    grad.addColorStop(1, hex(COLORS.bgBottom));
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    // Glow radial suave arriba-centro (da sensación de foco/luz).
    const glow = ctx.createRadialGradient(
      GAME_WIDTH / 2,
      GAME_HEIGHT * 0.28,
      0,
      GAME_WIDTH / 2,
      GAME_HEIGHT * 0.28,
      GAME_WIDTH * 0.9
    );
    glow.addColorStop(0, 'rgba(150,110,255,0.35)');
    glow.addColorStop(1, 'rgba(150,110,255,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    // Viñeta sutil en los bordes inferiores para asentar el contenido.
    const vig = ctx.createRadialGradient(
      GAME_WIDTH / 2,
      GAME_HEIGHT * 0.6,
      GAME_HEIGHT * 0.35,
      GAME_WIDTH / 2,
      GAME_HEIGHT * 0.6,
      GAME_HEIGHT * 0.75
    );
    vig.addColorStop(0, 'rgba(0,0,0,0)');
    vig.addColorStop(1, 'rgba(0,0,0,0.35)');
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    tex!.refresh();
  }

  // scrollFactor(0): el fondo queda fijo a la cámara y siempre llena la pantalla.
  // Sin esto, en GameScene (donde la cámara sube con la torre) la cámara se sale
  // del fondo y aparece el color negro de la cámara.
  scene.add
    .image(GAME_WIDTH / 2, GAME_HEIGHT / 2, key)
    .setScrollFactor(0)
    .setDepth(-100);
}

function hex(n: number): string {
  return '#' + n.toString(16).padStart(6, '0');
}
