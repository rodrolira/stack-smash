import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, COLORS, LEVELS, LevelDef } from '../config';
import { SaveManager } from '../systems/SaveManager';
import { AdManager } from '../systems/AdManager';
import { SoundManager } from '../systems/SoundManager';
import { createButton } from '../ui/Button';
import { drawBackground } from '../ui/background';
import { fadeIn, goto } from '../ui/transitions';

// Selección de nivel. Cada entrada = dificultad (tuning) + modo (mecánica).
// La lista sale del catálogo LEVELS (config.ts), así agregar un modo no toca
// esta escena. Muestra el récord por nivel para dar progreso y rejugabilidad.
export class LevelSelectScene extends Phaser.Scene {
  constructor() {
    super('LevelSelect');
  }

  create(): void {
    drawBackground(this);
    fadeIn(this);
    AdManager.showBanner();

    const cx = GAME_WIDTH / 2;

    this.add
      .text(cx, 110, 'ELEGÍ UN MODO', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '60px',
        color: COLORS.text,
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    // Layout compacto para que entren los 6 niveles + botón volver.
    let y = 250;
    const gap = 148;
    for (const level of LEVELS) {
      this.buildCard(level, cx, y);
      y += gap;
    }

    createButton(this, cx, GAME_HEIGHT - 90, '←  VOLVER', () => goto(this, 'Menu'), {
      width: 340,
      height: 92,
      fontSize: 32,
    });
  }

  private buildCard(level: LevelDef, cx: number, y: number): void {
    const best = SaveManager.bestScoreFor(level.id);
    const cardW = GAME_WIDTH - 90;
    const cardH = 126;

    const card = this.add.container(cx, y);

    const bg = this.add.graphics();
    bg.fillStyle(0x241847, 0.95);
    bg.fillRoundedRect(-cardW / 2, -cardH / 2, cardW, cardH, 20);
    // Franja de acento del nivel a la izquierda.
    bg.fillStyle(level.color, 1);
    bg.fillRoundedRect(-cardW / 2, -cardH / 2, 14, cardH, { tl: 20, bl: 20, tr: 0, br: 0 });

    const emoji = this.add.text(-cardW / 2 + 60, 0, level.emoji, { fontSize: '52px' }).setOrigin(0.5);

    const label = this.add
      .text(-cardW / 2 + 110, -30, level.label, {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '40px',
        color: COLORS.text,
        fontStyle: 'bold',
      })
      .setOrigin(0, 0.5);

    const blurb = this.add
      .text(-cardW / 2 + 110, 12, level.blurb, {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '23px',
        color: COLORS.textDim,
        wordWrap: { width: cardW - 260 },
      })
      .setOrigin(0, 0.5);

    const bestText = this.add
      .text(cardW / 2 - 40, -34, `★ ${best}`, {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '26px',
        color: '#ffd23f',
      })
      .setOrigin(1, 0.5);

    const playIcon = this.add
      .text(cardW / 2 - 48, 18, '▶', { fontSize: '44px', color: '#ffffff' })
      .setOrigin(0.5);

    card.add([bg, emoji, label, blurb, bestText, playIcon]);
    card.setSize(cardW, cardH);
    card.setInteractive(
      new Phaser.Geom.Rectangle(-cardW / 2, -cardH / 2, cardW, cardH),
      Phaser.Geom.Rectangle.Contains
    );

    let launched = false; // evita doble toque
    card.on('pointerover', () => card.setScale(1.02));
    card.on('pointerout', () => card.setScale(1));
    card.on('pointerdown', () => {
      if (launched) return;
      launched = true;
      SoundManager.unlock();
      SoundManager.coin();
      this.tweens.add({
        targets: card,
        scale: 0.97,
        duration: 70,
        yoyo: true,
        onComplete: () => goto(this, 'Game', { levelId: level.id }),
      });
    });
  }
}
