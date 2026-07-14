import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, COLORS } from '../config';
import { SaveManager } from '../systems/SaveManager';
import { AdManager } from '../systems/AdManager';
import { SoundManager } from '../systems/SoundManager';
import { getDailyMissions, progressOf, isComplete } from '../systems/DailyMissions';
import { createButton } from '../ui/Button';
import { drawBackground } from '../ui/background';
import { fadeIn, goto } from '../ui/transitions';

export class MenuScene extends Phaser.Scene {
  constructor() {
    super('Menu');
  }

  create(): void {
    drawBackground(this);
    this.spawnFloatingBlocks();
    fadeIn(this);

    // Bonus de racha diaria (se cobra una vez por día): monedas + vidas.
    const daily = SaveManager.registerDailyPlay();

    // Banner de AdMob (placeholder) — permitido en el menú, fuera del juego.
    AdManager.showBanner();

    const cx = GAME_WIDTH / 2;

    // Título con un tween sutil de "respiración".
    const title = this.add
      .text(cx, 300, 'STACK\n& SMASH', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '110px',
        color: COLORS.text,
        fontStyle: 'bold',
        align: 'center',
      })
      .setOrigin(0.5)
      .setLineSpacing(-10);
    this.tweens.add({
      targets: title,
      scale: 1.04,
      duration: 1400,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.inOut',
    });

    // HUD superior: monedas y mejor puntaje.
    this.add
      .text(cx, 480, `★ Mejor: ${SaveManager.bestScore}`, {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '40px',
        color: COLORS.textDim,
      })
      .setOrigin(0.5);
    this.add
      .text(cx, 535, `🪙 ${SaveManager.coins}   ❤ ${SaveManager.lives}`, {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '40px',
        color: '#ffd23f',
      })
      .setOrigin(0.5);

    if (daily && (daily.coins > 0 || daily.lives > 0)) {
      const parts = [`+${daily.coins} 🪙`];
      if (daily.lives > 0) parts.push(`+${daily.lives} ❤`);
      const s = this.add
        .text(cx, 585, `¡Racha diaria! ${parts.join('  ')}`, {
          fontFamily: 'system-ui, sans-serif',
          fontSize: '32px',
          color: '#3ddc97',
          fontStyle: 'bold',
        })
        .setOrigin(0.5)
        .setDepth(5);
      this.tweens.add({ targets: s, y: 555, alpha: 0, delay: 1800, duration: 1000 });
    }

    this.buildDailyMissions(cx, 625);

    // Botones principales, con entrada tipo "pop" escalonada.
    const playBtn = createButton(this, cx, 880, '▶  JUGAR', () => goto(this, 'ModeSelect'), {
      color: COLORS.good & 0xffffff,
      width: 460,
      height: 130,
      fontSize: 44,
    });
    const shopBtn = createButton(this, cx, 1030, '🛍  TIENDA', () => goto(this, 'Shop'), {
      width: 460,
    });
    [playBtn, shopBtn].forEach((btn, i) => {
      btn.setScale(0.7);
      btn.setAlpha(0);
      this.tweens.add({
        targets: btn,
        scale: 1,
        alpha: 1,
        duration: 320,
        delay: 120 + i * 90,
        ease: 'Back.out',
      });
    });

    this.add
      .text(cx, GAME_HEIGHT - 160, 'Un toque para soltar. ¡Apila y no falles!', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '30px',
        color: COLORS.textDim,
        align: 'center',
        wordWrap: { width: GAME_WIDTH - 120 },
      })
      .setOrigin(0.5);

    this.buildTopIcons();
  }

  /** Panel de misiones diarias (3 por día, rotan solas). */
  private buildDailyMissions(cx: number, y: number): void {
    const missions = getDailyMissions();
    const w = GAME_WIDTH - 90;
    const h = 46 + missions.length * 44;

    const bg = this.add.graphics();
    bg.fillStyle(0x1c1338, 0.85);
    bg.fillRoundedRect(cx - w / 2, y - 26, w, h, 16);
    bg.lineStyle(2, COLORS.accent, 0.35);
    bg.strokeRoundedRect(cx - w / 2, y - 26, w, h, 16);

    this.add
      .text(cx, y - 2, '📅 MISIONES DE HOY', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '24px',
        color: '#ffd23f',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    missions.forEach((m, i) => {
      const my = y + 36 + i * 44;
      const done = isComplete(m);
      const line = done
        ? `✔  ${m.label}`
        : `${m.label}  (${progressOf(m)}/${m.target})  +${m.reward} 🪙`;
      this.add
        .text(cx - w / 2 + 24, my, line, {
          fontFamily: 'system-ui, sans-serif',
          fontSize: '23px',
          color: done ? '#3ddc97' : COLORS.textDim,
        })
        .setOrigin(0, 0.5);
    });
  }

  // Bloques decorativos que flotan hacia arriba, detrás del contenido.
  private spawnFloatingBlocks(): void {
    const palette = [0x6c4bd6, 0x8a63f0, 0x3ddc97, 0xff6ec7, 0x2ec5ff, 0xffd23f];
    const SPEED = 42; // px/s

    const drift = (b: Phaser.GameObjects.Rectangle, fromY: number): void => {
      const dur = ((fromY + 90) / SPEED) * 1000; // distancia hasta y=-90
      this.tweens.add({
        targets: b,
        y: -90,
        duration: dur,
        ease: 'Linear',
        onComplete: () => {
          b.x = Phaser.Math.Between(40, GAME_WIDTH - 40);
          b.y = GAME_HEIGHT + 90;
          drift(b, b.y);
        },
      });
    };

    for (let i = 0; i < 10; i++) {
      const size = Phaser.Math.Between(40, 90);
      const b = this.add
        .rectangle(
          Phaser.Math.Between(40, GAME_WIDTH - 40),
          Phaser.Math.Between(-50, GAME_HEIGHT),
          size,
          size,
          Phaser.Utils.Array.GetRandom(palette),
          0.16
        )
        .setDepth(-50)
        .setAngle(Phaser.Math.Between(0, 45));
      // Rotación lenta continua.
      this.tweens.add({
        targets: b,
        angle: b.angle + Phaser.Math.Between(-60, 60),
        duration: Phaser.Math.Between(6000, 12000),
        yoyo: true,
        repeat: -1,
        ease: 'Sine.inOut',
      });
      drift(b, b.y);
    }
  }

  private buildTopIcons(): void {
    // Mute rápido.
    const mute = this.add
      .text(GAME_WIDTH - 150, 80, SoundManager.isMuted ? '🔇' : '🔊', { fontSize: '46px' })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    mute.on('pointerdown', () => {
      SoundManager.unlock();
      const muted = SoundManager.toggleMute();
      mute.setText(muted ? '🔇' : '🔊');
      if (!muted) SoundManager.coin();
    });

    // Ajustes (mute persistente, borrar datos, privacidad).
    this.add
      .text(GAME_WIDTH - 70, 80, '⚙️', { fontSize: '46px' })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => goto(this, 'Settings'));
  }
}
