import Phaser from 'phaser';
import { GAME_WIDTH, COLORS, MODES, ModeDef, BANNER_SAFE_Y } from '../config';
import { AdManager } from '../systems/AdManager';
import { SoundManager } from '../systems/SoundManager';
import { totalStars, maxStars } from '../systems/Stages';
import { createButton } from '../ui/Button';
import { drawBackground } from '../ui/background';
import { fadeIn, goto } from '../ui/transitions';

// Selección de MODO. Cada modo contiene 10 niveles (ver StageSelectScene).
// Muestra el progreso de estrellas del modo.
export class ModeSelectScene extends Phaser.Scene {
  constructor() {
    super('ModeSelect');
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

    let y = 240;
    const gap = 142;
    for (const mode of MODES) {
      this.buildCard(mode, cx, y);
      y += gap;
    }

    createButton(this, cx, BANNER_SAFE_Y, '←  VOLVER', () => goto(this, 'Menu'), {
      width: 340,
      height: 92,
      fontSize: 32,
    });
  }

  private buildCard(mode: ModeDef, cx: number, y: number): void {
    const stars = totalStars(mode.id);
    const cardW = GAME_WIDTH - 90;
    const cardH = 126;

    const card = this.add.container(cx, y);

    const bg = this.add.graphics();
    bg.fillStyle(0x241847, 0.95);
    bg.fillRoundedRect(-cardW / 2, -cardH / 2, cardW, cardH, 20);
    bg.fillStyle(mode.color, 1);
    bg.fillRoundedRect(-cardW / 2, -cardH / 2, 14, cardH, { tl: 20, bl: 20, tr: 0, br: 0 });

    const emoji = this.add.text(-cardW / 2 + 60, 0, mode.emoji, { fontSize: '52px' }).setOrigin(0.5);

    const label = this.add
      .text(-cardW / 2 + 110, -30, mode.label, {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '40px',
        color: COLORS.text,
        fontStyle: 'bold',
      })
      .setOrigin(0, 0.5);

    const blurb = this.add
      .text(-cardW / 2 + 110, 12, mode.blurb, {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '23px',
        color: COLORS.textDim,
        wordWrap: { width: cardW - 280 },
      })
      .setOrigin(0, 0.5);

    // Progreso de estrellas del modo.
    const starsText = this.add
      .text(cardW / 2 - 40, -32, `⭐ ${stars}/${maxStars()}`, {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '26px',
        color: '#ffd23f',
      })
      .setOrigin(1, 0.5);

    const playIcon = this.add
      .text(cardW / 2 - 48, 20, '▶', { fontSize: '44px', color: '#ffffff' })
      .setOrigin(0.5);

    card.add([bg, emoji, label, blurb, starsText, playIcon]);
    card.setSize(cardW, cardH);
    card.setInteractive(
      new Phaser.Geom.Rectangle(-cardW / 2, -cardH / 2, cardW, cardH),
      Phaser.Geom.Rectangle.Contains
    );

    let launched = false;
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
        onComplete: () => goto(this, 'StageSelect', { modeId: mode.id }),
      });
    });
  }
}
