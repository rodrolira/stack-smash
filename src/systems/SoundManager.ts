// SoundManager — efectos de sonido sintetizados con WebAudio (sin archivos).
//
// Genera tonos cortos con osciladores + envolvente, así el scaffold tiene
// "juice" sonoro sin depender de assets. El audio es opcional/mute-friendly:
// si el navegador bloquea el AudioContext, el juego sigue sin romperse.

import { SaveManager } from './SaveManager';

export class SoundManager {
  private static ctx: AudioContext | null = null;
  private static muted = false;

  /** Aplica la preferencia guardada. Llamar una vez al arrancar (Boot). */
  static loadPreference(): void {
    this.muted = SaveManager.soundMuted;
  }

  /** Debe llamarse dentro de un gesto del usuario (ej. primer toque). */
  static unlock(): void {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') void this.ctx.resume();
      return;
    }
    try {
      const Ctx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new Ctx();
    } catch {
      this.ctx = null; // sin audio; el juego sigue igual
    }
  }

  static toggleMute(): boolean {
    this.muted = !this.muted;
    SaveManager.setSoundMuted(this.muted); // persiste la preferencia
    return this.muted;
  }

  static get isMuted(): boolean {
    return this.muted;
  }

  /** Tono con envolvente exponencial. `freqEnd` permite barridos (sweeps). */
  private static tone(
    freq: number,
    duration: number,
    type: OscillatorType = 'sine',
    peak = 0.18,
    freqEnd?: number
  ): void {
    if (this.muted || !this.ctx) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    if (freqEnd !== undefined) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(1, freqEnd), now + duration);
    }
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(peak, now + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  // Aterrizaje normal: "tock" corto y grave.
  static land(): void {
    this.tone(220, 0.09, 'triangle', 0.16);
  }

  // Perfect: nota clara que sube con el combo (feedback de precisión).
  static perfect(combo: number): void {
    const base = 660 + Math.min(combo, 8) * 60;
    this.tone(base, 0.12, 'square', 0.14, base * 1.5);
  }

  // Smash: ruido tipo "crunch" con barrido descendente.
  static smash(): void {
    this.tone(180, 0.18, 'sawtooth', 0.14, 60);
  }

  // Moneda: campanita brillante.
  static coin(): void {
    this.tone(880, 0.08, 'sine', 0.12, 1320);
  }

  // Game over: barrido descendente triste.
  static gameOver(): void {
    this.tone(300, 0.5, 'sawtooth', 0.16, 80);
  }
}
