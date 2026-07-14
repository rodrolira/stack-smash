import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, COLORS } from '../config';

// Gate parental ("pedile a un adulto"): desafío de multiplicación con opciones,
// requerido antes de compras con dinero real en apps para menores (Apple Kids /
// buena práctica COPPA). Ver skill kids-app-compliance.
//
// Resuelve true solo si se responde bien; false si se equivoca o cancela.
export function parentalGate(scene: Phaser.Scene): Promise<boolean> {
  return new Promise((resolve) => {
    const a = Phaser.Math.Between(6, 9);
    const b = Phaser.Math.Between(3, 7);
    const answer = a * b;

    // Opciones: la correcta + 3 distractores plausibles, mezcladas.
    const options = new Set<number>([answer]);
    while (options.size < 4) {
      const delta = Phaser.Math.Between(-9, 9);
      const cand = answer + delta;
      if (cand > 0 && cand !== answer) options.add(cand);
    }
    const shuffled = Phaser.Utils.Array.Shuffle([...options]);

    const layer = scene.add.container(0, 0).setDepth(1000).setScrollFactor(0);

    const dim = scene.add
      .rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x0a0419, 0.9)
      .setInteractive(); // bloquea toques por detrás
    layer.add(dim);

    const cx = GAME_WIDTH / 2;

    layer.add(
      scene.add
        .text(cx, 360, '🔒 Control parental', {
          fontFamily: 'system-ui, sans-serif',
          fontSize: '48px',
          color: COLORS.text,
          fontStyle: 'bold',
        })
        .setOrigin(0.5)
    );
    layer.add(
      scene.add
        .text(cx, 430, 'Pedile a un adulto que resuelva:', {
          fontFamily: 'system-ui, sans-serif',
          fontSize: '28px',
          color: COLORS.textDim,
        })
        .setOrigin(0.5)
    );
    layer.add(
      scene.add
        .text(cx, 520, `${a} × ${b} = ?`, {
          fontFamily: 'system-ui, sans-serif',
          fontSize: '72px',
          color: '#ffd23f',
          fontStyle: 'bold',
        })
        .setOrigin(0.5)
    );

    const finish = (result: boolean): void => {
      layer.destroy();
      resolve(result);
    };

    // Opciones en grilla 2×2.
    const colX = [cx - 165, cx + 165];
    const rowY = [660, 800];
    shuffled.forEach((opt, i) => {
      const bx = colX[i % 2];
      const by = rowY[Math.floor(i / 2)];
      layer.add(makeOption(scene, bx, by, opt, () => finish(opt === answer)));
    });

    // Cancelar.
    layer.add(makeCancel(scene, cx, 940, () => finish(false)));
  });
}

function makeOption(
  scene: Phaser.Scene,
  x: number,
  y: number,
  value: number,
  onClick: () => void
): Phaser.GameObjects.Container {
  const w = 280;
  const h = 110;
  const c = scene.add.container(x, y);
  const bg = scene.add.graphics();
  const draw = (fill: number): void => {
    bg.clear();
    bg.fillStyle(fill, 1);
    bg.fillRoundedRect(-w / 2, -h / 2, w, h, 20);
  };
  draw(COLORS.button);
  const t = scene.add
    .text(0, 0, String(value), {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '46px',
      color: COLORS.text,
      fontStyle: 'bold',
    })
    .setOrigin(0.5);
  c.add([bg, t]);
  c.setSize(w, h);
  c.setInteractive(new Phaser.Geom.Rectangle(-w / 2, -h / 2, w, h), Phaser.Geom.Rectangle.Contains);
  c.on('pointerover', () => draw(COLORS.buttonHi));
  c.on('pointerout', () => draw(COLORS.button));
  c.on('pointerdown', () => {
    c.disableInteractive();
    onClick();
  });
  return c;
}

function makeCancel(
  scene: Phaser.Scene,
  x: number,
  y: number,
  onClick: () => void
): Phaser.GameObjects.Text {
  const t = scene.add
    .text(x, y, 'Cancelar', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '34px',
      color: COLORS.textDim,
    })
    .setOrigin(0.5)
    .setInteractive({ useHandCursor: true });
  t.on('pointerdown', () => {
    t.disableInteractive();
    onClick();
  });
  return t;
}
