import Phaser from 'phaser';
import { GAME_WIDTH, COLORS, getMode, BANNER_SAFE_Y } from '../config';
import { AdManager } from '../systems/AdManager';
import { SoundManager } from '../systems/SoundManager';
import {
  getStages,
  Stage,
  starsEarned,
  isUnlocked,
  stageGoalText,
  totalStars,
  maxStars,
} from '../systems/Stages';
import { createButton } from '../ui/Button';
import { drawBackground } from '../ui/background';
import { fadeIn, goto } from '../ui/transitions';

interface StageSelectData {
  modeId?: string;
}

// Selección de NIVEL dentro de un modo. Grilla con estrellas ganadas; los
// niveles se desbloquean al sacar al menos 1 ⭐ en el anterior.
export class StageSelectScene extends Phaser.Scene {
  private modeId = 'medio';

  constructor() {
    super('StageSelect');
  }

  create(data: StageSelectData): void {
    this.modeId = data.modeId ?? 'medio';
    const mode = getMode(this.modeId);

    drawBackground(this);
    fadeIn(this);
    AdManager.showBanner();

    const cx = GAME_WIDTH / 2;

    this.add
      .text(cx, 100, `${mode.emoji} ${mode.label}`, {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '56px',
        color: '#' + mode.color.toString(16).padStart(6, '0'),
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    this.add
      .text(cx, 165, `⭐ ${totalStars(this.modeId)} / ${maxStars()}`, {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '34px',
        color: '#ffd23f',
      })
      .setOrigin(0.5);

    // Grilla 2 columnas × 5 filas.
    const stages = getStages(this.modeId);
    const colX = [GAME_WIDTH * 0.28, GAME_WIDTH * 0.72];
    const topY = 300;
    const stepY = 165;
    stages.forEach((stage, i) => {
      this.buildStageCard(stage, colX[i % 2], topY + Math.floor(i / 2) * stepY);
    });

    createButton(this, cx, BANNER_SAFE_Y, '←  MODOS', () => goto(this, 'ModeSelect'), {
      width: 340,
      height: 92,
      fontSize: 32,
    });
  }

  private buildStageCard(stage: Stage, x: number, y: number): void {
    const w = 290;
    const h = 140;
    const unlocked = isUnlocked(this.modeId, stage.index);
    const stars = starsEarned(this.modeId, stage.index);

    const card = this.add.container(x, y);

    const bg = this.add.graphics();
    bg.fillStyle(unlocked ? 0x241847 : 0x1a1330, unlocked ? 0.96 : 0.8);
    bg.fillRoundedRect(-w / 2, -h / 2, w, h, 18);
    bg.lineStyle(4, stars === 3 ? COLORS.accent : 0xffffff, stars === 3 ? 1 : 0.12);
    bg.strokeRoundedRect(-w / 2, -h / 2, w, h, 18);
    card.add(bg);

    if (!unlocked) {
      card.add(this.add.text(0, -8, '🔒', { fontSize: '52px' }).setOrigin(0.5));
      card.add(
        this.add
          .text(0, 44, 'Bloqueado', {
            fontFamily: 'system-ui, sans-serif',
            fontSize: '22px',
            color: '#8a80a6',
          })
          .setOrigin(0.5)
      );
      return; // sin interacción
    }

    // Número de nivel.
    card.add(
      this.add
        .text(0, -42, `Nivel ${stage.index}`, {
          fontFamily: 'system-ui, sans-serif',
          fontSize: '32px',
          color: COLORS.text,
          fontStyle: 'bold',
        })
        .setOrigin(0.5)
    );

    // Objetivo.
    card.add(
      this.add
        .text(0, -4, stageGoalText(stage), {
          fontFamily: 'system-ui, sans-serif',
          fontSize: '22px',
          color: COLORS.textDim,
        })
        .setOrigin(0.5)
    );

    // Estrellas ganadas.
    const starRow = '⭐'.repeat(stars) + '☆'.repeat(3 - stars);
    card.add(
      this.add.text(0, 42, starRow, { fontSize: '28px', color: '#ffd23f' }).setOrigin(0.5)
    );

    card.setSize(w, h);
    card.setInteractive(
      new Phaser.Geom.Rectangle(-w / 2, -h / 2, w, h),
      Phaser.Geom.Rectangle.Contains
    );

    let launched = false;
    card.on('pointerover', () => card.setScale(1.03));
    card.on('pointerout', () => card.setScale(1));
    card.on('pointerdown', () => {
      if (launched) return;
      launched = true;
      SoundManager.unlock();
      SoundManager.coin();
      this.tweens.add({
        targets: card,
        scale: 0.96,
        duration: 70,
        yoyo: true,
        onComplete: () =>
          goto(this, 'Game', { modeId: this.modeId, stageIndex: stage.index }),
      });
    });
  }
}
