import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, COLORS } from '../config';
import { createButton } from '../ui/Button';
import { drawBackground } from '../ui/background';
import { fadeIn, goto } from '../ui/transitions';

// Política de privacidad DENTRO de la app (sin enlace externo, que está
// restringido en apps para niños). Texto corto y claro. Debe coincidir con el
// PRIVACY.md publicado y con los formularios Data Safety / Privacy Labels.
export class PrivacyScene extends Phaser.Scene {
  constructor() {
    super('Privacy');
  }

  create(): void {
    drawBackground(this);
    fadeIn(this);
    const cx = GAME_WIDTH / 2;

    this.add
      .text(cx, 110, 'PRIVACIDAD', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '60px',
        color: COLORS.text,
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    const body = [
      'Stack & Smash está pensado para todas las edades,',
      'incluidos niños.',
      '',
      '• No pedimos ni recolectamos datos personales.',
      '  Sin nombre, email, teléfono ni ubicación.',
      '',
      '• No hay cuentas ni inicio de sesión.',
      '',
      '• Tu progreso (monedas, skins, récords) se guarda',
      '  SOLO en tu dispositivo. No se envía a ningún lado.',
      '',
      '• Los anuncios son NO personalizados (contextuales)',
      '  y aptos para todo público. No rastreamos a menores.',
      '',
      '• Las compras con dinero real requieren que un adulto',
      '  resuelva un control parental.',
      '',
      'No vendemos ni compartimos información con terceros.',
    ].join('\n');

    this.add
      .text(cx, 200, body, {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '30px',
        color: COLORS.text,
        align: 'left',
        lineSpacing: 8,
        wordWrap: { width: GAME_WIDTH - 90 },
      })
      .setOrigin(0.5, 0);

    createButton(this, cx, GAME_HEIGHT - 110, '←  VOLVER', () => goto(this, 'Settings'), {
      width: 340,
      height: 92,
      fontSize: 32,
    });
  }
}
