// Power-ups — consumibles que se compran con monedas y se activan DENTRO de la
// partida (barra inferior del HUD). Dan agencia al jugador sin romper la
// mecánica de un solo toque (ver skill casual-game-mechanics).

export type PowerUpId = 'shield' | 'slow' | 'wide';

export interface PowerUp {
  id: PowerUpId;
  name: string;
  emoji: string;
  desc: string;
  price: number; // monedas del juego
  color: number;
}

export const POWERUPS: PowerUp[] = [
  {
    id: 'shield',
    name: 'Escudo',
    emoji: '🛡️',
    desc: 'Te perdona un fallo fatal',
    price: 120,
    color: 0x3ddc97,
  },
  {
    id: 'slow',
    name: 'Cámara lenta',
    emoji: '🐢',
    desc: 'Bloque 40% más lento por 10 s',
    price: 90,
    color: 0x2ec5ff,
  },
  {
    id: 'wide',
    name: 'Bloque ancho',
    emoji: '📏',
    desc: 'Ensancha el bloque al instante',
    price: 70,
    color: 0xff8f3d,
  },
];

export function getPowerUp(id: PowerUpId): PowerUp {
  return POWERUPS.find((p) => p.id === id) ?? POWERUPS[0];
}

// Parámetros de los efectos (los consume GameScene).
export const POWERUP_EFFECTS = {
  slowDurationMs: 10_000,
  slowFactor: 0.6, // 40% más lento
  wideBonus: 70, // px que suma al ancho
  shieldMinWidth: 140, // ancho al que se recupera tras usar el escudo
};
