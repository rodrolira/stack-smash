// Constantes globales del juego. La resolución base es portrait; el escalado
// FIT (ver main.ts) la adapta a cualquier pantalla de celular.
export const GAME_WIDTH = 720;
export const GAME_HEIGHT = 1280;

// Versión mostrada en Ajustes (mantener en sync con package.json).
export const APP_VERSION = '0.1.0';

// -----------------------------------------------------------------------------
// COMPLIANCE PARA MENORES (ver skill kids-app-compliance y COMPLIANCE.md).
// El juego es atractivo para niños, así que aplicamos el trato más conservador
// a TODOS los usuarios: sin datos personales, sin ads personalizados, y gate
// parental antes de cualquier compra con dinero real. Así es compatible tanto
// con "mixed audience" como con "para niños / Families".
// -----------------------------------------------------------------------------
export const COMPLIANCE = {
  // Tratar a la app como dirigida a menores para ads (COPPA / Google Families /
  // GDPR-K): desactiva la personalización comportamental. AdManager lo respeta.
  childDirected: true,
  // Solo anuncios contextuales/no personalizados (nunca por comportamiento).
  nonPersonalizedAds: true,
  // Las compras con dinero real requieren un gate parental (Apple Kids / buena
  // práctica). Las compras con monedas del juego NO lo requieren.
  parentalGateForRealMoney: true,
  // No se recolecta ningún dato personal; todo el estado vive local (localStorage).
  collectsPersonalData: false,
};

// Paleta brillante y "candy", pensada para audiencia infantil/juvenil.
export const COLORS = {
  bgTop: 0x2a1259,
  bgBottom: 0x120827,
  accent: 0xffd23f, // amarillo monedas
  good: 0x3ddc97, // verde perfect
  danger: 0xff5964,
  text: '#ffffff',
  textDim: '#b9a6e0',
  button: 0x6c4bd6,
  buttonHi: 0x8a63f0,
};

// Parámetros por dificultad. Los consume GameScene y el comando /nuevo-nivel.
// (Ver skill casual-game-mechanics para la justificación de estos valores.)
export type Difficulty = 'facil' | 'medio' | 'dificil' | 'experto';

export interface DifficultyParams {
  speed: number; // px/s del bloque en movimiento (velocidad inicial)
  perfectTolerance: number; // px de margen para un "perfect"
  accelPerFloor: number; // px/s que se suma por cada piso
  maxSpeed: number; // tope de velocidad, para que no se vuelva injugable
}

export const DIFFICULTY: Record<Difficulty, DifficultyParams> = {
  facil: { speed: 110, perfectTolerance: 12, accelPerFloor: 3, maxSpeed: 240 },
  medio: { speed: 170, perfectTolerance: 8, accelPerFloor: 5, maxSpeed: 360 },
  dificil: { speed: 300, perfectTolerance: 5, accelPerFloor: 9, maxSpeed: 520 },
  experto: { speed: 380, perfectTolerance: 4, accelPerFloor: 11, maxSpeed: 640 },
};

// Metadata de presentación de cada modo (para la selección de nivel).
export interface DifficultyMeta {
  label: string;
  blurb: string;
  color: number; // acento del modo
  emoji: string;
}

// Orden en que se muestran (y en que se desbloquean, si querés gatear más adelante).
export const DIFFICULTY_ORDER: Difficulty[] = ['facil', 'medio', 'dificil', 'experto'];

export const DIFFICULTY_META: Record<Difficulty, DifficultyMeta> = {
  facil: { label: 'Fácil', blurb: 'Relajado. Ideal para empezar.', color: 0x3ddc97, emoji: '🌱' },
  medio: { label: 'Medio', blurb: 'El desafío justo.', color: 0x6c4bd6, emoji: '⚡' },
  dificil: { label: 'Difícil', blurb: 'Rápido y sin perdón.', color: 0xff8f3d, emoji: '🔥' },
  experto: { label: 'Experto', blurb: 'Solo para maestros del stack.', color: 0xff5964, emoji: '💀' },
};

// -----------------------------------------------------------------------------
// Modos con MECÁNICA distinta (no solo tuning). GameScene lee estas reglas y
// altera su comportamiento. Ver skill casual-game-mechanics: siguen siendo de
// un solo toque; solo cambia la condición de riesgo/tiempo.
// -----------------------------------------------------------------------------
export type GameModeId = 'classic' | 'sprint' | 'precision';

export interface GameModeRules {
  /** Contrarreloj: ms totales. Al llegar a 0 → game over. */
  timeLimitMs?: number;
  /** Bonus de tiempo (ms) por cada perfect, en modo contrarreloj. */
  perfectTimeBonusMs?: number;
  /** Si es true, un error (colocación no-perfect) termina la partida. */
  perfectOnly?: boolean;
}

export const GAME_MODES: Record<GameModeId, GameModeRules> = {
  classic: {},
  sprint: { timeLimitMs: 30_000, perfectTimeBonusMs: 1_200 },
  precision: { perfectOnly: true },
};

// Catálogo de niveles seleccionables = dificultad (tuning) + modo (mecánica).
// Cada uno lleva su récord propio (clave = id). LevelSelectScene los lista solo.
export interface LevelDef {
  id: string; // clave de récord y de arranque
  label: string;
  blurb: string;
  emoji: string;
  color: number;
  difficulty: Difficulty;
  mode: GameModeId;
}

const CLASSIC_LEVELS: LevelDef[] = DIFFICULTY_ORDER.map((d) => ({
  id: d,
  label: DIFFICULTY_META[d].label,
  blurb: DIFFICULTY_META[d].blurb,
  emoji: DIFFICULTY_META[d].emoji,
  color: DIFFICULTY_META[d].color,
  difficulty: d,
  mode: 'classic',
}));

export const LEVELS: LevelDef[] = [
  ...CLASSIC_LEVELS,
  {
    id: 'sprint',
    label: 'Relámpago',
    blurb: '30 s a puro ritmo. Cada perfect suma tiempo.',
    emoji: '⏱️',
    color: 0x2ec5ff,
    difficulty: 'medio',
    mode: 'sprint',
  },
  {
    id: 'precision',
    label: 'Precisión',
    blurb: 'Un solo error y perdés. Solo perfects.',
    emoji: '🎯',
    color: 0xffd23f,
    difficulty: 'facil',
    mode: 'precision',
  },
];

export function getLevel(id: string): LevelDef {
  return LEVELS.find((l) => l.id === id) ?? LEVELS[1]; // fallback: medio
}

// Los primeros N pisos van a velocidad reducida: la primera partida siempre
// debe sentirse fácil y ganable (ver skill casual-game-mechanics).
export const WARMUP_FLOORS = 4;
export const WARMUP_SPEED_FACTOR = 0.7;

// Recompensas de monedas.
export const COINS = {
  perFloor: 1,
  perfectBonus: 3,
  comboStep: 2, // +monedas extra por cada perfect encadenado
};

// Mecánica de precisión: cada perfect recupera un poco de ancho (hasta el
// ancho inicial). Premia jugar preciso y alarga las partidas buenas.
export const PERFECT_REGROW = 8;

// Deriva de tono (grados HSL) por piso, para el efecto "torre arcoíris".
export const HUE_SHIFT_PER_FLOOR = 7;
