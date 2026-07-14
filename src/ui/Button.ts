import Phaser from 'phaser';
import { COLORS } from '../config';
import { HapticsManager } from '../systems/HapticsManager';

// Botón redondeado reutilizable. Área táctil grande (para dedos de niños en
// pantallas chicas — ver skill/agent qa-tester). Devuelve un Container.
export interface ButtonOptions {
  width?: number;
  height?: number;
  fontSize?: number;
  color?: number;
  enabled?: boolean;
}

export function createButton(
  scene: Phaser.Scene,
  x: number,
  y: number,
  label: string,
  onClick: () => void,
  opts: ButtonOptions = {}
): Phaser.GameObjects.Container {
  const w = opts.width ?? 420;
  const h = opts.height ?? 108;
  const color = opts.color ?? COLORS.button;
  const enabled = opts.enabled ?? true;

  const container = scene.add.container(x, y);

  const bg = scene.add.graphics();
  const draw = (fill: number) => {
    bg.clear();
    bg.fillStyle(fill, 1);
    bg.fillRoundedRect(-w / 2, -h / 2, w, h, 24);
  };
  draw(enabled ? color : 0x4a4066);

  const text = scene.add
    .text(0, 0, label, {
      fontFamily: 'system-ui, sans-serif',
      fontSize: `${opts.fontSize ?? 34}px`,
      color: enabled ? COLORS.text : '#8a80a6',
      fontStyle: 'bold',
      align: 'center',
    })
    .setOrigin(0.5);

  container.add([bg, text]);
  container.setSize(w, h);

  if (enabled) {
    const hitArea = new Phaser.Geom.Rectangle(-w / 2, -h / 2, w, h);
    container.setInteractive(hitArea, Phaser.Geom.Rectangle.Contains);
    container.on('pointerover', () => draw(COLORS.buttonHi));
    container.on('pointerout', () => draw(color));
    container.on('pointerdown', () => {
      // Debounce: se deshabilita la interacción durante la animación para que
      // un doble toque no dispare onClick dos veces (evita, p.ej., doble cobro).
      container.disableInteractive();
      HapticsManager.light();
      draw(color);
      scene.tweens.add({
        targets: container,
        scale: 0.94,
        duration: 60,
        yoyo: true,
        onComplete: () => {
          onClick();
          // Si onClick no cambió de escena ni destruyó el botón, se rehabilita.
          if (container.active) {
            container.setScale(1);
            container.setInteractive(hitArea, Phaser.Geom.Rectangle.Contains);
          }
        },
      });
    });
  }

  return container;
}
