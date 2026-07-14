import Phaser from 'phaser';
import {
  GAME_WIDTH,
  GAME_HEIGHT,
  COLORS,
  COINS,
  DIFFICULTY,
  Difficulty,
  GameModeRules,
  GAME_MODES,
  ModeDef,
  getMode,
  WARMUP_FLOORS,
  WARMUP_SPEED_FACTOR,
  PERFECT_REGROW,
  HUE_SHIFT_PER_FLOOR,
} from '../config';
import { SaveManager } from '../systems/SaveManager';
import { AdManager } from '../systems/AdManager';
import { SoundManager } from '../systems/SoundManager';
import { HapticsManager } from '../systems/HapticsManager';
import { claimNewlyCompleted, Goal } from '../systems/Goals';
import {
  getStage,
  Stage,
  starsFor,
  recordStars,
  progressFor,
  stageGoalText,
  RunResult,
} from '../systems/Stages';
import { POWERUPS, POWERUP_EFFECTS, PowerUpId } from '../systems/PowerUps';
import { reportRun } from '../systems/DailyMissions';
import { getSkin } from '../systems/Skins';
import { createButton } from '../ui/Button';
import { drawBackground } from '../ui/background';
import { fadeIn, goto } from '../ui/transitions';

const BLOCK_HEIGHT = 56;
const START_WIDTH = 360;
const EDGE_MARGIN = 40;
const CAMERA_ANCHOR = 0.42; // dónde queda la acción en pantalla (0=arriba)

interface GameData {
  modeId?: string;
  stageIndex?: number;
}

export class GameScene extends Phaser.Scene {
  private modeId = 'medio';
  private stageIndex = 1;
  private level!: ModeDef;
  private stage!: Stage;
  private objectiveText!: Phaser.GameObjects.Text;
  private difficulty: Difficulty = 'medio';
  private rules: GameModeRules = {};

  private prevX = 0;
  private prevWidth = START_WIDTH;
  private currentY = 0;
  private speed = 0;
  private direction = 1;

  private movingBlock!: Phaser.GameObjects.Rectangle;
  private lastPlaced?: Phaser.GameObjects.Rectangle;
  private movingActive = false;

  private score = 0;
  private coinsThisRun = 0;
  private usedRevive = false;
  private isOver = false;
  private perfectCombo = 0;
  private maxCombo = 0;
  private starsThisRun = 0;
  private improvedStars = false;
  private perfectsThisRun = 0;
  private shieldActive = false;
  private slowUntilMs = 0;
  private powerBar?: Phaser.GameObjects.Container;
  private shieldIcon?: Phaser.GameObjects.Text;
  private timeLeftMs = 0;
  private timerText?: Phaser.GameObjects.Text;
  private paused = false;
  private pausePanel?: Phaser.GameObjects.Container;
  private frenzyBg!: Phaser.GameObjects.Rectangle;
  private vignette!: Phaser.GameObjects.Image;

  private scoreText!: Phaser.GameObjects.Text;
  private coinsText!: Phaser.GameObjects.Text;
  private sparks!: Phaser.GameObjects.Particles.ParticleEmitter;
  private colorIndex = 0;

  constructor() {
    super('Game');
  }

  create(data: GameData): void {
    this.modeId = data.modeId ?? 'medio';
    this.stageIndex = data.stageIndex ?? 1;
    this.level = getMode(this.modeId);
    this.stage = getStage(this.modeId, this.stageIndex);
    this.difficulty = this.level.difficulty;
    this.rules = GAME_MODES[this.level.mode];
    // Color base = fondo del gradiente (no negro), por si en algún frame la
    // cámara se adelanta al redibujo del fondo fijo.
    this.cameras.main.setBackgroundColor(COLORS.bgBottom);
    drawBackground(this);

    // El banner NUNCA va sobre el área jugable (UX + política apps infantiles):
    // se oculta al entrar al juego y reaparece al volver al menú/tienda.
    AdManager.hideBanner();

    // Capas de "frenesí": se intensifican con la altura (ver updateFrenzy).
    // Tinte de fondo (detrás de los bloques) que va del frío al caliente.
    this.frenzyBg = this.add
      .rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x2ec5ff, 0)
      .setScrollFactor(0)
      .setDepth(-40)
      .setBlendMode(Phaser.BlendModes.ADD);
    // Viñeta que late en los bordes (tensión), encima de los bloques pero debajo del HUD.
    this.ensureVignetteTexture();
    this.vignette = this.add
      .image(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'vignette')
      .setScrollFactor(0)
      .setDepth(45)
      .setAlpha(0);

    // Reset de estado (la escena se reutiliza al reintentar).
    this.resetState();

    // Emisor de partículas para el efecto "perfect" (textura generada, sin assets).
    this.ensureSparkTexture();
    this.sparks = this.add
      .particles(0, 0, 'spark', {
        speed: { min: 120, max: 340 },
        lifespan: 480,
        scale: { start: 0.9, end: 0 },
        quantity: 14,
        emitting: false,
        tint: [0x3ddc97, 0xffd23f, 0xffffff],
      })
      .setDepth(40);

    // Base de la torre.
    const baseY = GAME_HEIGHT - 220;
    this.currentY = baseY;
    this.prevX = GAME_WIDTH / 2;
    this.prevWidth = START_WIDTH;
    this.addPlacedBlock(this.prevX, this.prevWidth, this.currentY);

    // HUD (fijo a la cámara).
    this.buildHUD();
    this.buildPowerBar();

    // Primer bloque en movimiento.
    this.spawnMovingBlock();

    // Un toque = soltar. El primer toque también desbloquea el audio (los
    // navegadores exigen un gesto del usuario para iniciar el AudioContext).
    this.input.on('pointerdown', this.handlePointer, this);

    fadeIn(this, 200);

    // Onboarding: solo la primera vez que se juega.
    if (!SaveManager.onboarded) this.showOnboarding();
  }

  private showOnboarding(): void {
    SaveManager.setOnboarded(true);
    const hint = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT * 0.62, '👆\nTocá para soltar\ncada bloque', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '46px',
        color: '#ffffff',
        align: 'center',
        fontStyle: 'bold',
        lineSpacing: 10,
        backgroundColor: '#0a0419cc',
        padding: { x: 30, y: 24 },
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(80);
    this.tweens.add({
      targets: hint,
      alpha: { from: 1, to: 0.55 },
      duration: 650,
      yoyo: true,
      repeat: -1,
    });
    // Se va al primer toque.
    this.input.once('pointerdown', () => {
      this.tweens.killTweensOf(hint);
      this.tweens.add({ targets: hint, alpha: 0, duration: 200, onComplete: () => hint.destroy() });
    });
  }

  private handlePointer(): void {
    if (this.paused) return; // el overlay de pausa maneja sus propios toques
    SoundManager.unlock();
    this.dropBlock();
  }

  private ensureSparkTexture(): void {
    if (this.textures.exists('spark')) return;
    const g = this.make.graphics({ x: 0, y: 0 });
    g.fillStyle(0xffffff, 1);
    g.fillCircle(6, 6, 6);
    g.generateTexture('spark', 12, 12);
    g.destroy();
  }

  private ensureVignetteTexture(): void {
    if (this.textures.exists('vignette')) return;
    const tex = this.textures.createCanvas('vignette', GAME_WIDTH, GAME_HEIGHT);
    const ctx = tex!.getContext();
    const grad = ctx.createRadialGradient(
      GAME_WIDTH / 2,
      GAME_HEIGHT / 2,
      GAME_HEIGHT * 0.28,
      GAME_WIDTH / 2,
      GAME_HEIGHT / 2,
      GAME_HEIGHT * 0.62
    );
    grad.addColorStop(0, 'rgba(255,60,60,0)');
    grad.addColorStop(1, 'rgba(255,40,40,1)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    tex!.refresh();
  }

  /** Intensidad 0..1 según la altura. Maneja las capas de frenesí. */
  private updateFrenzy(time: number): void {
    const t = Math.min(this.score / 35, 1); // llega al máximo en el piso 35
    if (t <= 0) {
      this.frenzyBg.setAlpha(0);
      this.vignette.setAlpha(0);
      return;
    }
    // El pulso late más rápido cuanto más alto.
    const pulseSpeed = 0.004 + t * 0.008;
    const pulse = Math.sin(time * pulseSpeed) * 0.5 + 0.5;

    // Tinte de fondo: del cyan (frío) al rojo (caliente) según la altura.
    const c = Phaser.Display.Color.Interpolate.ColorWithColor(
      new Phaser.Display.Color(46, 197, 255),
      new Phaser.Display.Color(255, 70, 70),
      100,
      Math.round(t * 100)
    );
    this.frenzyBg.setFillStyle(Phaser.Display.Color.GetColor(c.r, c.g, c.b));
    this.frenzyBg.setAlpha(t * (0.08 + pulse * 0.10));

    // Viñeta roja que late en los bordes.
    this.vignette.setAlpha(t * (0.22 + pulse * 0.18));
  }

  private resetState(): void {
    this.score = 0;
    this.coinsThisRun = 0;
    this.usedRevive = false;
    this.isOver = false;
    this.perfectCombo = 0;
    this.maxCombo = 0;
    this.perfectsThisRun = 0;
    this.starsThisRun = 0;
    this.improvedStars = false;
    this.shieldActive = false;
    this.slowUntilMs = 0;
    this.shieldIcon = undefined;
    this.colorIndex = 0;
    // La velocidad base sube con el nivel dentro del modo.
    this.speed = DIFFICULTY[this.difficulty].speed * this.stage.speedMul;
    this.direction = 1;
    this.movingActive = false;
    this.paused = false;
    this.pausePanel = undefined;
    this.timeLeftMs = this.rules.timeLimitMs ?? 0;
    this.cameras.main.setScroll(0, 0);
    this.cameras.main.setZoom(1); // por si un tween de hito quedó a mitad
  }

  /** Velocidad efectiva: warm-up al inicio y un tope que sube con la altura
   * (más frenético cuanto más alto), sin volverse imposible. */
  private effectiveSpeed(): number {
    const params = DIFFICULTY[this.difficulty];
    let s = this.speed;
    if (this.score < WARMUP_FLOORS) s *= WARMUP_SPEED_FACTOR;
    const t = Math.min(this.score / 35, 1);
    const cap = params.maxSpeed * this.stage.speedMul * (1 + t * 0.35);
    let out = Math.min(s, cap);
    // Power-up de cámara lenta.
    if (this.time.now < this.slowUntilMs) out *= POWERUP_EFFECTS.slowFactor;
    return out;
  }

  private hudStatsText(): string {
    return `🪙 ${SaveManager.coins}   ❤ ${SaveManager.lives}`;
  }

  /** Resultado actual de la partida, para objetivos y estrellas. */
  private runResult(): RunResult {
    return { floors: this.score, perfects: this.maxCombo, coins: this.coinsThisRun };
  }

  /** Objetivo del nivel con progreso en vivo; se pone verde al cumplirlo. */
  private updateObjectiveText(): void {
    if (!this.objectiveText) return;
    const done = progressFor(this.stage, this.runResult());
    const target = this.stage.targets[0];
    const stars = starsFor(this.stage, this.runResult());
    this.objectiveText.setText(
      `🎯 ${stageGoalText(this.stage)}  (${done}/${target})  ${'⭐'.repeat(stars)}`
    );
    this.objectiveText.setColor(stars > 0 ? '#3ddc97' : COLORS.textDim);
  }

  // --- Pausa ---
  private pauseGame(): void {
    if (this.paused || this.isOver) return;
    this.paused = true; // update() se detiene (bloque y timer congelados)

    const cx = GAME_WIDTH / 2;
    const panel = this.add.container(0, 0).setScrollFactor(0).setDepth(90);
    panel.add(
      this.add
        .rectangle(cx, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x0a0419, 0.82)
        .setInteractive()
    );
    panel.add(
      this.add
        .text(cx, 430, '⏸️ PAUSA', {
          fontFamily: 'system-ui, sans-serif',
          fontSize: '72px',
          color: COLORS.text,
          fontStyle: 'bold',
        })
        .setOrigin(0.5)
    );
    panel.add(
      createButton(this, cx, 620, '▶  REANUDAR', () => this.resumeGame(), {
        color: COLORS.good & 0xffffff,
        width: 520,
        fontSize: 36,
      })
    );
    panel.add(
      createButton(this, cx, 770, '↻  REINICIAR', () => this.scene.restart({ modeId: this.modeId, stageIndex: this.stageIndex }), {
        width: 520,
        fontSize: 36,
      })
    );
    panel.add(
      createButton(this, cx, 920, '🏠  MENÚ', () => goto(this, 'Menu'), { width: 520, fontSize: 36 })
    );
    this.fixOverlayInput(panel); // mismo fix de área táctil que el game over
    this.pausePanel = panel;
  }

  private resumeGame(): void {
    this.paused = false;
    this.pausePanel?.destroy();
    this.pausePanel = undefined;
  }

  private buildHUD(): void {
    this.scoreText = this.add
      .text(GAME_WIDTH / 2, 90, '0', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '120px',
        color: COLORS.text,
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(50);

    // Monedas + vidas juntas arriba a la derecha (libera el ángulo para pausa).
    this.coinsText = this.add
      .text(GAME_WIDTH - 40, 60, this.hudStatsText(), {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '40px',
        color: '#ffd23f',
      })
      .setOrigin(1, 0.5)
      .setScrollFactor(0)
      .setDepth(50);

    // Botón de pausa arriba a la izquierda.
    this.add
      .text(48, 60, '⏸️', { fontSize: '48px' })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(50)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.pauseGame());

    // Modo + número de nivel, con su acento.
    this.add
      .text(GAME_WIDTH / 2, 175, `${this.level.emoji} ${this.level.label} · Nivel ${this.stageIndex}`, {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '28px',
        color: '#' + this.level.color.toString(16).padStart(6, '0'),
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(50);

    // Objetivo del nivel, con progreso en vivo.
    this.objectiveText = this.add
      .text(GAME_WIDTH / 2, 215, '', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '26px',
        color: COLORS.textDim,
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(50);
    this.updateObjectiveText();

    // Reloj (solo en modos contrarreloj, ej. Relámpago).
    if (this.rules.timeLimitMs) {
      this.timerText = this.add
        .text(GAME_WIDTH / 2, 245, '', {
          fontFamily: 'system-ui, sans-serif',
          fontSize: '52px',
          color: '#2ec5ff',
          fontStyle: 'bold',
        })
        .setOrigin(0.5)
        .setScrollFactor(0)
        .setDepth(50);
      this.updateTimerText();
    }
  }

  // --- Power-ups ---
  /** Barra inferior con los power-ups en inventario. Se activan tocándolos. */
  private buildPowerBar(): void {
    this.powerBar?.destroy();
    const bar = this.add.container(0, 0).setScrollFactor(0).setDepth(52);
    const y = GAME_HEIGHT - 80;
    const startX = GAME_WIDTH / 2 - 170;

    POWERUPS.forEach((p, i) => {
      const count = SaveManager.powerUpCount(p.id);
      const x = startX + i * 170;
      const w = 150;
      const h = 96;
      const enabled = count > 0;

      const item = this.add.container(x, y).setScrollFactor(0);
      const bg = this.add.graphics();
      bg.fillStyle(enabled ? p.color : 0x2a2340, enabled ? 0.95 : 0.6);
      bg.fillRoundedRect(-w / 2, -h / 2, w, h, 16);
      item.add(bg);
      item.add(
        this.add.text(-18, -6, p.emoji, { fontSize: '40px' }).setOrigin(0.5).setAlpha(enabled ? 1 : 0.4)
      );
      item.add(
        this.add
          .text(34, -6, `x${count}`, {
            fontFamily: 'system-ui, sans-serif',
            fontSize: '28px',
            color: enabled ? '#ffffff' : '#8a80a6',
            fontStyle: 'bold',
          })
          .setOrigin(0.5)
      );

      if (enabled) {
        item.setSize(w, h);
        item.setInteractive(
          new Phaser.Geom.Rectangle(-w / 2, -h / 2, w, h),
          Phaser.Geom.Rectangle.Contains
        );
        item.on('pointerdown', () => this.usePowerUp(p.id));
      }
      bar.add(item);
    });

    this.powerBar = bar;
  }

  private usePowerUp(id: PowerUpId): void {
    if (this.isOver || this.paused) return;
    if (!SaveManager.usePowerUp(id)) return;

    SoundManager.perfect(4);
    HapticsManager.success();

    switch (id) {
      case 'shield':
        this.shieldActive = true;
        this.updateShieldIcon();
        this.banner('🛡️ Escudo activo', '#3ddc97');
        break;
      case 'slow':
        this.slowUntilMs = this.time.now + POWERUP_EFFECTS.slowDurationMs;
        this.banner('🐢 Cámara lenta', '#2ec5ff');
        break;
      case 'wide': {
        const nw = Math.min(this.prevWidth + POWERUP_EFFECTS.wideBonus, START_WIDTH);
        this.prevWidth = nw;
        this.lastPlaced?.setSize(nw, BLOCK_HEIGHT);
        if (this.movingActive) this.movingBlock.setSize(nw, BLOCK_HEIGHT);
        this.banner('📏 Bloque ancho', '#ff8f3d');
        break;
      }
    }
    this.buildPowerBar(); // refresca los contadores
  }

  private updateShieldIcon(): void {
    if (this.shieldActive && !this.shieldIcon) {
      this.shieldIcon = this.add
        .text(GAME_WIDTH - 40, 120, '🛡️', { fontSize: '40px' })
        .setOrigin(1, 0.5)
        .setScrollFactor(0)
        .setDepth(50);
      this.tweens.add({
        targets: this.shieldIcon,
        alpha: 0.5,
        duration: 700,
        yoyo: true,
        repeat: -1,
      });
    } else if (!this.shieldActive && this.shieldIcon) {
      this.tweens.killTweensOf(this.shieldIcon);
      this.shieldIcon.destroy();
      this.shieldIcon = undefined;
    }
  }

  /** Si hay escudo activo, lo consume y salva la partida. */
  private tryShield(): boolean {
    if (!this.shieldActive) return false;
    this.shieldActive = false;
    this.updateShieldIcon();
    this.perfectCombo = 0;
    this.prevWidth = Math.max(this.prevWidth, POWERUP_EFFECTS.shieldMinWidth);
    this.lastPlaced?.setSize(this.prevWidth, BLOCK_HEIGHT);
    this.cameras.main.flash(240, 60, 220, 150);
    SoundManager.perfect(6);
    HapticsManager.success();
    this.banner('🛡️ ¡Escudo te salvó!', '#3ddc97');
    this.movingBlock.destroy();
    this.time.delayedCall(120, () => {
      if (!this.isOver) this.spawnMovingBlock();
    });
    return true;
  }

  private updateTimerText(): void {
    if (!this.timerText) return;
    const secs = Math.max(0, this.timeLeftMs / 1000);
    this.timerText.setText(`⏱️ ${secs.toFixed(1)}s`);
    // Se pone rojo en los últimos 5 segundos.
    this.timerText.setColor(secs <= 5 ? '#ff5964' : '#2ec5ff');
  }

  private timeBonusPop(ms: number): void {
    const pop = this.add
      .text(GAME_WIDTH / 2 + 170, 245, `+${(ms / 1000).toFixed(1)}s`, {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '34px',
        color: '#2ec5ff',
        fontStyle: 'bold',
      })
      .setOrigin(0, 0.5)
      .setScrollFactor(0)
      .setDepth(51);
    this.tweens.add({
      targets: pop,
      y: 205,
      alpha: 0,
      duration: 650,
      onComplete: () => pop.destroy(),
    });
  }

  private skinColor(): number {
    const colors = getSkin(SaveManager.selectedSkin).colors;
    const base = colors[this.colorIndex % colors.length];
    // Deriva progresiva de tono por piso: la torre vira de color al subir.
    return this.shiftHue(base, this.colorIndex * HUE_SHIFT_PER_FLOOR);
  }

  private shiftHue(color: number, degrees: number): number {
    const c = Phaser.Display.Color.IntegerToColor(color);
    const hsv = Phaser.Display.Color.RGBToHSV(c.red, c.green, c.blue);
    const h = (((hsv.h * 360 + degrees) % 360) + 360) % 360 / 360;
    const out = Phaser.Display.Color.HSVToRGB(h, hsv.s, hsv.v) as Phaser.Types.Display.ColorObject;
    return (out.r << 16) | (out.g << 8) | out.b;
  }

  private addPlacedBlock(x: number, width: number, y: number): Phaser.GameObjects.Rectangle {
    const rect = this.add
      .rectangle(x, y, width, BLOCK_HEIGHT, this.skinColor())
      .setStrokeStyle(3, 0xffffff, 0.25);
    // Pequeño squash & stretch al aterrizar.
    rect.setScale(1.08, 0.85);
    this.tweens.add({ targets: rect, scaleX: 1, scaleY: 1, duration: 120, ease: 'Back.out' });
    this.lastPlaced = rect;
    return rect;
  }

  private spawnMovingBlock(): void {
    this.colorIndex++;
    this.currentY -= BLOCK_HEIGHT;
    const startLeft = this.direction > 0;
    const x = startLeft ? EDGE_MARGIN + this.prevWidth / 2 : GAME_WIDTH - EDGE_MARGIN - this.prevWidth / 2;

    this.movingBlock = this.add
      .rectangle(x, this.currentY, this.prevWidth, BLOCK_HEIGHT, this.skinColor())
      .setStrokeStyle(3, 0xffffff, 0.4);
    this.movingActive = true;

    // La cámara sigue la construcción hacia arriba.
    this.tweens.add({
      targets: this.cameras.main,
      scrollY: this.currentY - GAME_HEIGHT * CAMERA_ANCHOR,
      duration: 180,
      ease: 'Sine.out',
    });
  }

  update(time: number, delta: number): void {
    if (this.isOver || this.paused) return;

    // Frenesí visual: se intensifica con la altura (corre siempre durante el juego).
    this.updateFrenzy(time);

    // Contrarreloj: corre aunque el bloque esté entre spawns.
    if (this.rules.timeLimitMs) {
      this.timeLeftMs -= delta;
      this.updateTimerText();
      if (this.timeLeftMs <= 0) {
        this.timeLeftMs = 0;
        this.updateTimerText();
        this.gameOver();
        return;
      }
    }

    if (!this.movingActive) return;
    const dt = delta / 1000;
    const half = this.movingBlock.width / 2;
    this.movingBlock.x += this.direction * this.effectiveSpeed() * dt;

    const leftLimit = EDGE_MARGIN + half;
    const rightLimit = GAME_WIDTH - EDGE_MARGIN - half;
    if (this.movingBlock.x <= leftLimit) {
      this.movingBlock.x = leftLimit;
      this.direction = 1;
    } else if (this.movingBlock.x >= rightLimit) {
      this.movingBlock.x = rightLimit;
      this.direction = -1;
    }
  }

  private dropBlock(): void {
    if (!this.movingActive || this.isOver) return;
    this.movingActive = false;

    const params = DIFFICULTY[this.difficulty];
    const deltaX = this.movingBlock.x - this.prevX;
    const overlap = this.prevWidth - Math.abs(deltaX);

    // Fallo total: no hay solapamiento → game over (salvo escudo).
    if (overlap <= 0) {
      SoundManager.smash();
      HapticsManager.smash();
      this.dropFalling(this.movingBlock.x, this.movingBlock.width, this.skinColor());
      if (this.tryShield()) return; // el escudo destruye el bloque y sigue
      this.movingBlock.destroy();
      this.gameOver();
      return;
    }

    const isPerfect = Math.abs(deltaX) <= params.perfectTolerance;

    // Modo Precisión: cualquier colocación que no sea perfect termina la partida.
    if (this.rules.perfectOnly && !isPerfect) {
      SoundManager.smash();
      HapticsManager.smash();
      const overhangW = Math.abs(deltaX);
      const overhangX = deltaX > 0 ? this.prevX + this.prevWidth / 2 : this.prevX - this.prevWidth / 2;
      this.dropFalling(overhangX, overhangW || this.movingBlock.width, this.skinColor());
      if (this.tryShield()) return;
      this.movingBlock.destroy();
      this.gameOver();
      return;
    }

    let newWidth: number;
    let newX: number;
    let coins: number;

    if (isPerfect) {
      // Perfect: se alinea, RECUPERA un poco de ancho y encadena combo.
      this.perfectCombo++;
      this.perfectsThisRun++;
      this.maxCombo = Math.max(this.maxCombo, this.perfectCombo);
      newX = this.prevX;
      newWidth = Math.min(this.prevWidth + PERFECT_REGROW, START_WIDTH);
      coins = COINS.perFloor + COINS.perfectBonus + (this.perfectCombo - 1) * COINS.comboStep;
      SoundManager.perfect(this.perfectCombo);
      HapticsManager.perfect();
      this.onPerfect(newX, this.currentY);
      this.sparks.explode(14, newX, this.currentY);
      // Combo alto: destello verde para subir la intensidad.
      if (this.perfectCombo >= 3) this.cameras.main.flash(180, 60, 220, 150);
      // Contrarreloj: cada perfect suma tiempo.
      if (this.rules.timeLimitMs && this.rules.perfectTimeBonusMs) {
        this.timeLeftMs += this.rules.perfectTimeBonusMs;
        this.updateTimerText();
        this.timeBonusPop(this.rules.perfectTimeBonusMs);
      }
    } else {
      // Error: se corta el sobrante, se rompe el combo.
      this.perfectCombo = 0;
      newWidth = overlap;
      newX = this.prevX + deltaX / 2;
      coins = COINS.perFloor;
      const overhangW = Math.abs(deltaX);
      const overhangX =
        deltaX > 0 ? newX + newWidth / 2 + overhangW / 2 : newX - newWidth / 2 - overhangW / 2;
      this.dropFalling(overhangX, overhangW, this.skinColor());
      // Escombros del smash + shake para que se sienta destructivo.
      this.sparks.explode(8, overhangX, this.currentY);
      this.smashFeedback();
      SoundManager.land();
      SoundManager.smash();
      HapticsManager.smash();
    }

    // Colocar el bloque definitivo.
    this.movingBlock.destroy();
    this.addPlacedBlock(newX, newWidth, this.currentY);

    // Actualizar estado y recompensas.
    this.prevX = newX;
    this.prevWidth = newWidth;
    this.score++;
    this.awardCoins(coins, newX);
    this.scoreText.setText(String(this.score));
    this.pulseScore();
    this.updateObjectiveText();

    // Hito cada 10 pisos: celebración + bonus.
    if (this.score > 0 && this.score % 10 === 0) this.celebrateMilestone();

    // Misiones/metas cortas: chequear y avisar las que se completaron.
    this.checkGoals();

    // Dificultad progresiva dentro de la partida.
    this.speed += params.accelPerFloor;

    // Siguiente bloque.
    this.time.delayedCall(90, () => {
      if (!this.isOver) this.spawnMovingBlock();
    });
  }

  private pulseScore(): void {
    this.scoreText.setScale(1.25);
    this.tweens.add({ targets: this.scoreText, scale: 1, duration: 180, ease: 'Back.out' });
  }

  private celebrateMilestone(): void {
    SoundManager.perfect(6);
    HapticsManager.success();
    this.cameras.main.flash(220, 255, 210, 90);
    this.sparks.explode(24, this.prevX, this.currentY);
    // Punch de zoom sutil.
    this.tweens.add({
      targets: this.cameras.main,
      zoom: 1.04,
      duration: 110,
      yoyo: true,
      ease: 'Quad.out',
    });
    const bonus = 10;
    this.awardCoins(bonus, this.prevX);
    this.banner(`¡${this.score} PISOS!  +${bonus} 🪙`, '#ffd23f');
  }

  private checkGoals(): void {
    const done = claimNewlyCompleted({
      floors: this.score,
      maxCombo: this.maxCombo,
      coinsThisRun: this.coinsThisRun,
    });
    if (done.length === 0) return;
    this.coinsText.setText(this.hudStatsText());
    // Encadenar los avisos para que no se pisen si se completan varias juntas.
    done.forEach((g: Goal, i: number) => {
      this.time.delayedCall(i * 900, () => {
        SoundManager.coin();
        HapticsManager.success();
        this.banner(`✔ ${g.label}  +${g.reward} 🪙`, '#3ddc97');
      });
    });
  }

  /** Aviso flotante fijo a la cámara (misiones, hitos). */
  private banner(text: string, color: string): void {
    const t = this.add
      .text(GAME_WIDTH / 2, 230, text, {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '38px',
        color,
        fontStyle: 'bold',
        align: 'center',
        backgroundColor: '#0a0419cc',
        padding: { x: 22, y: 12 },
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(60)
      .setAlpha(0);
    this.tweens.add({
      targets: t,
      alpha: 1,
      y: 250,
      duration: 220,
      yoyo: true,
      hold: 1100,
      onComplete: () => t.destroy(),
    });
  }

  // --- Feedback / juice ---
  private smashFeedback(): void {
    this.cameras.main.shake(90, 0.006);
  }

  private onPerfect(x: number, y: number): void {
    const label = this.perfectCombo > 1 ? `PERFECT x${this.perfectCombo}` : 'PERFECT!';
    // El texto crece un poco con el combo, para que se sienta escalar.
    const size = Math.min(48 + (this.perfectCombo - 1) * 6, 84);
    const t = this.add
      .text(x, y - 60, label, {
        fontFamily: 'system-ui, sans-serif',
        fontSize: `${size}px`,
        color: '#3ddc97',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);
    this.tweens.add({ targets: t, y: y - 140, alpha: 0, duration: 700, onComplete: () => t.destroy() });
    // Flash de anillo.
    const ring = this.add.circle(x, y, 20, 0x3ddc97, 0.5);
    this.tweens.add({
      targets: ring,
      radius: 120,
      alpha: 0,
      duration: 400,
      onComplete: () => ring.destroy(),
    });
  }

  private awardCoins(amount: number, x: number): void {
    this.coinsThisRun += amount;
    SaveManager.addCoins(amount);
    SoundManager.coin();
    this.coinsText.setText(this.hudStatsText());
    const pop = this.add
      .text(x, this.currentY - 30, `+${amount}`, {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '36px',
        color: '#ffd23f',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);
    this.tweens.add({
      targets: pop,
      y: this.currentY - 110,
      alpha: 0,
      duration: 650,
      onComplete: () => pop.destroy(),
    });
  }

  /** Un trozo que cae por gravedad simulada y desaparece. */
  private dropFalling(x: number, width: number, color: number): void {
    if (width <= 0) return;
    const piece = this.add.rectangle(x, this.currentY, width, BLOCK_HEIGHT, color).setAlpha(0.95);
    this.tweens.add({
      targets: piece,
      y: this.currentY + 900,
      angle: Phaser.Math.Between(-60, 60),
      alpha: 0,
      duration: 700,
      ease: 'Quad.in',
      onComplete: () => piece.destroy(),
    });
  }

  // --- Fin de partida ---
  private gameOver(): void {
    if (this.isOver) return;
    this.isOver = true;
    this.movingActive = false;
    this.input.off('pointerdown', this.handlePointer, this);
    this.cameras.main.shake(160, 0.01);
    SoundManager.gameOver();
    HapticsManager.gameOver();

    const isRecord = SaveManager.reportScore(this.score, this.modeId);

    // Estrellas del nivel según el resultado; se guardan si mejoran las previas.
    this.starsThisRun = starsFor(this.stage, this.runResult());
    this.improvedStars = recordStars(this.modeId, this.stageIndex, this.starsThisRun);

    // Misiones diarias: sumar el resultado y avisar las que se completaron.
    const doneMissions = reportRun({
      floors: this.score,
      perfects: this.perfectsThisRun,
      coins: this.coinsThisRun,
      stars: this.improvedStars ? this.starsThisRun : 0,
    });
    doneMissions.forEach((m, i) => {
      this.time.delayedCall(900 + i * 900, () => {
        SoundManager.coin();
        HapticsManager.success();
        this.banner(`📅 ${m.label}  +${m.reward} 🪙`, '#ffd23f');
      });
    });

    // Interstitial (respeta frecuencia y adsRemoved) tras la partida.
    AdManager.maybeShowInterstitial();

    this.time.delayedCall(350, () => this.showGameOverPanel(isRecord));
  }

  private showGameOverPanel(isRecord: boolean): void {
    const cx = GAME_WIDTH / 2;
    const panel = this.add.container(0, 0).setScrollFactor(0).setDepth(100);

    const dim = this.add.rectangle(cx, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x0a0419, 0.72);
    panel.add(dim);

    // Entrada: el panel entra con un fundido suave.
    panel.setAlpha(0);
    this.tweens.add({ targets: panel, alpha: 1, duration: 200 });

    const titleText = this.add
      .text(cx, 360, isRecord ? '¡NUEVO RECORD!' : 'GAME OVER', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '72px',
        color: isRecord ? '#3ddc97' : '#ff5964',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);
    panel.add(titleText);
    // Pop del título.
    titleText.setScale(0.6);
    this.tweens.add({ targets: titleText, scale: 1, duration: 320, ease: 'Back.out' });
    panel.add(
      this.add
        .text(cx, 470, `Pisos: ${this.score}    🪙 +${this.coinsThisRun}`, {
          fontFamily: 'system-ui, sans-serif',
          fontSize: '44px',
          color: COLORS.text,
        })
        .setOrigin(0.5)
    );
    panel.add(
      this.add
        .text(
          cx,
          530,
          `${this.level.emoji} ${this.level.label} · Nivel ${this.stageIndex}  ·  ★ ${SaveManager.bestScoreFor(this.modeId)}`,
          {
            fontFamily: 'system-ui, sans-serif',
            fontSize: '26px',
            color: COLORS.textDim,
          }
        )
        .setOrigin(0.5)
    );

    // Estrellas ganadas en este nivel (aparecen de a una, con "pop").
    const starRow = this.add
      .text(cx, 590, '☆ ☆ ☆', { fontSize: '54px', color: '#ffd23f' })
      .setOrigin(0.5);
    panel.add(starRow);
    const filled = '⭐'.repeat(this.starsThisRun) + '☆'.repeat(3 - this.starsThisRun);
    this.time.delayedCall(400, () => {
      if (!starRow.active) return;
      starRow.setText(filled.split('').join(' '));
      starRow.setScale(0.5);
      this.tweens.add({ targets: starRow, scale: 1, duration: 380, ease: 'Back.out' });
      if (this.starsThisRun > 0) {
        SoundManager.perfect(this.starsThisRun + 3);
        HapticsManager.success();
      }
    });
    if (this.improvedStars && this.starsThisRun > 0) {
      panel.add(
        this.add
          .text(cx, 645, '¡Nivel superado!', {
            fontFamily: 'system-ui, sans-serif',
            fontSize: '28px',
            color: '#3ddc97',
            fontStyle: 'bold',
          })
          .setOrigin(0.5)
      );
    }

    // Revivir viendo un anuncio recompensado (una vez por partida, opt-in).
    if (!this.usedRevive) {
      const reviveBtn = createButton(
        this,
        cx,
        720,
        '▶  REVIVIR (anuncio)',
        () => this.reviveWithAd(panel, reviveBtn),
        { color: COLORS.good & 0xffffff, width: 520, fontSize: 36 }
      );
      panel.add(reviveBtn);
    }

    // Reintentar: consume una vida. Si no quedan, se ofrece ganar una viendo
    // un anuncio (opt-in), así el loop de reintento nunca queda bloqueado.
    const hasLives = SaveManager.lives > 0;
    if (hasLives) {
      const retryBtn = createButton(
        this,
        cx,
        860,
        `↻  REINTENTAR (❤ ${SaveManager.lives})`,
        () => {
          if (SaveManager.useLife()) this.scene.restart({ modeId: this.modeId, stageIndex: this.stageIndex });
        },
        { width: 520, fontSize: 36 }
      );
      panel.add(retryBtn);
    } else {
      const lifeBtn = createButton(
        this,
        cx,
        860,
        '▶  +1 VIDA (anuncio)',
        () => this.earnLifeWithAd(),
        { color: COLORS.accent & 0xffffff, width: 520, fontSize: 36 }
      );
      panel.add(lifeBtn);
    }

    // Volver a la lista de niveles del modo (más útil que ir al menú).
    const stagesBtn = createButton(
      this,
      cx,
      1000,
      '≡  NIVELES',
      () => goto(this, 'StageSelect', { modeId: this.modeId }),
      { width: 520, fontSize: 36 }
    );
    panel.add(stagesBtn);

    const menuBtn = createButton(this, cx, 1130, '🏠  MENÚ', () => goto(this, 'Menu'), {
      width: 520,
      fontSize: 36,
    });
    panel.add(menuBtn);

    // FIX CRÍTICO: los hijos interactivos deben tener scrollFactor 0 también para
    // el INPUT, no solo el render. Con la cámara desplazada por la torre alta, si
    // no, el área táctil de los botones queda corrida y no se pueden tocar.
    this.fixOverlayInput(panel);
  }

  /** Fuerza scrollFactor 0 en los hijos de un overlay para que su área táctil
   * coincida con lo que se ve, aunque la cámara esté desplazada. */
  private fixOverlayInput(panel: Phaser.GameObjects.Container): void {
    panel.each((child: Phaser.GameObjects.GameObject) => {
      (child as Phaser.GameObjects.Container).setScrollFactor(0);
    });
  }

  private async earnLifeWithAd(): Promise<void> {
    const rewarded = await AdManager.showRewarded();
    if (!rewarded) return; // cerró el video sin completarlo
    SaveManager.addLives(1);
    if (SaveManager.useLife()) this.scene.restart({ difficulty: this.difficulty });
  }

  private async reviveWithAd(
    panel: Phaser.GameObjects.Container,
    reviveBtn: Phaser.GameObjects.Container
  ): Promise<void> {
    const rewarded = await AdManager.showRewarded();
    if (!rewarded) return; // cerró el video sin completarlo: no revive
    this.usedRevive = true;
    reviveBtn.destroy();
    panel.destroy();

    // Continuar la partida: se recupera un ancho jugable y sigue el score.
    // Se ensancha también el bloque real de la cima para que el nuevo bloque no
    // "flote" más ancho que su base.
    this.isOver = false;
    this.perfectCombo = 0;
    const revivedWidth = Math.max(this.prevWidth, 160);
    if (revivedWidth !== this.prevWidth && this.lastPlaced) {
      this.prevWidth = revivedWidth;
      this.lastPlaced.setSize(revivedWidth, BLOCK_HEIGHT);
      this.tweens.add({
        targets: this.lastPlaced,
        scaleX: { from: 1.12, to: 1 },
        duration: 140,
        ease: 'Back.out',
      });
    }
    this.input.on('pointerdown', this.handlePointer, this);
    this.spawnMovingBlock();
  }
}
