// HapticsManager — vibración táctil.
//
// Usa la Vibration API del navegador (`navigator.vibrate`), que funciona en
// Android (Chrome/WebView). iOS Safari NO soporta la Vibration API, así que ahí
// no vibra (para háptico real en iOS haría falta el plugin @capacitor/haptics;
// ver nota abajo). Respeta la preferencia del usuario (SaveManager.vibrate).
//
// Nota (nativo, opcional): para vibración fina en iOS instalar @capacitor/haptics
// y, en isNativePlatform(), llamar Haptics.impact({ style }). No se instaló para
// no sumar dependencias nativas todavía.

import { SaveManager } from './SaveManager';

function supported(): boolean {
  return typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function';
}

export class HapticsManager {
  private static fire(pattern: number | number[]): void {
    if (!SaveManager.vibrate || !supported()) return;
    try {
      navigator.vibrate(pattern);
    } catch {
      // algunos navegadores lanzan si no hubo interacción previa: ignorar
    }
  }

  static light(): void {
    this.fire(8); // toque de botón / aterrizaje
  }
  static perfect(): void {
    this.fire(18);
  }
  static smash(): void {
    this.fire(28);
  }
  static success(): void {
    this.fire([12, 40, 12]); // hito / compra / recompensa
  }
  static gameOver(): void {
    this.fire([40, 30, 70]);
  }
}
