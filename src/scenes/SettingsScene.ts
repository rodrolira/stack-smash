import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, COLORS, APP_VERSION } from '../config';
import { SaveManager } from '../systems/SaveManager';
import { SoundManager } from '../systems/SoundManager';
import { HapticsManager } from '../systems/HapticsManager';
import { createButton } from '../ui/Button';
import { drawBackground } from '../ui/background';
import { fadeIn, goto } from '../ui/transitions';

export class SettingsScene extends Phaser.Scene {
  constructor() {
    super('Settings');
  }

  create(): void {
    drawBackground(this);
    fadeIn(this);
    const cx = GAME_WIDTH / 2;

    this.add
      .text(cx, 150, 'AJUSTES', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '68px',
        color: COLORS.text,
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    // Sonido (persistente).
    createButton(
      this,
      cx,
      360,
      SoundManager.isMuted ? '🔇  Sonido: OFF' : '🔊  Sonido: ON',
      () => {
        SoundManager.unlock();
        SoundManager.toggleMute();
        if (!SoundManager.isMuted) SoundManager.coin();
        this.scene.restart(); // redibuja el estado
      },
      { width: 520, color: SoundManager.isMuted ? COLORS.button : (COLORS.good & 0xffffff) }
    );

    // Vibración (persistente).
    createButton(
      this,
      cx,
      510,
      SaveManager.vibrate ? '📳  Vibración: ON' : '📴  Vibración: OFF',
      () => {
        SaveManager.setVibrate(!SaveManager.vibrate);
        if (SaveManager.vibrate) HapticsManager.success();
        this.scene.restart();
      },
      { width: 520, color: SaveManager.vibrate ? (COLORS.good & 0xffffff) : COLORS.button }
    );

    // Privacidad.
    createButton(this, cx, 660, 'ⓘ  Privacidad', () => goto(this, 'Privacy'), { width: 520 });

    // Borrar datos (con confirmación).
    createButton(this, cx, 810, '🗑  Borrar datos', () => this.confirmClear(), {
      width: 520,
      color: COLORS.danger & 0xffffff,
    });

    this.add
      .text(cx, 960, `Versión ${APP_VERSION}`, {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '28px',
        color: COLORS.textDim,
      })
      .setOrigin(0.5);

    createButton(this, cx, GAME_HEIGHT - 120, '←  VOLVER', () => goto(this, 'Menu'), {
      width: 340,
      height: 92,
      fontSize: 32,
    });
  }

  private confirmClear(): void {
    const cx = GAME_WIDTH / 2;
    const panel = this.add.container(0, 0).setDepth(500);
    panel.add(
      this.add
        .rectangle(cx, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x0a0419, 0.85)
        .setInteractive()
    );
    panel.add(
      this.add
        .text(cx, 520, '¿Borrar TODO?', {
          fontFamily: 'system-ui, sans-serif',
          fontSize: '56px',
          color: COLORS.text,
          fontStyle: 'bold',
        })
        .setOrigin(0.5)
    );
    panel.add(
      this.add
        .text(cx, 590, 'Se pierden monedas, skins, récords y compras locales.', {
          fontFamily: 'system-ui, sans-serif',
          fontSize: '26px',
          color: COLORS.textDim,
          align: 'center',
          wordWrap: { width: GAME_WIDTH - 120 },
        })
        .setOrigin(0.5)
    );

    panel.add(
      createButton(this, cx, 720, 'Sí, borrar', () => {
        SaveManager.clearAll();
        SoundManager.loadPreference();
        this.scene.restart();
      }, { width: 460, color: COLORS.danger & 0xffffff })
    );
    panel.add(
      createButton(this, cx, 860, 'Cancelar', () => panel.destroy(), { width: 460 })
    );
  }
}
