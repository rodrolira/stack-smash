// Stages — niveles numerados DENTRO de cada modo.
//
// Cada nivel tiene un objetivo con 3 umbrales (1 ⭐ / 2 ⭐ / 3 ⭐) y una escala de
// dificultad propia. Se juega hasta perder; según lo logrado, se otorgan
// estrellas. Con al menos 1 ⭐ se desbloquea el nivel siguiente.
//
// Los niveles se GENERAN a partir del modo (no hay tablas a mano), así agregar
// un modo nuevo trae sus 10 niveles automáticamente.

import { STAGES_PER_MODE, getMode } from '../config';
import { SaveManager } from './SaveManager';

export type StageGoalType = 'floors' | 'perfects' | 'coins';

export interface Stage {
  modeId: string;
  index: number; // 1..STAGES_PER_MODE
  goalType: StageGoalType;
  /** Umbrales para 1, 2 y 3 estrellas. */
  targets: [number, number, number];
  /** Multiplicador de velocidad del modo para este nivel. */
  speedMul: number;
}

/** Resultado de una partida, para calcular estrellas. */
export interface RunResult {
  floors: number;
  perfects: number; // combo máximo de perfects
  coins: number; // monedas ganadas en la partida
}

const GOAL_LABEL: Record<StageGoalType, string> = {
  floors: 'pisos',
  perfects: 'perfects seguidos',
  coins: 'monedas',
};

/** Base del objetivo según lo exigente que sea el modo. */
function modeBase(modeId: string): { floors: number; perfects: number; coins: number } {
  const m = getMode(modeId);
  if (m.mode === 'precision') return { floors: 3, perfects: 3, coins: 8 };
  if (m.mode === 'sprint') return { floors: 5, perfects: 2, coins: 10 };
  switch (m.difficulty) {
    case 'facil':
      return { floors: 6, perfects: 2, coins: 12 };
    case 'medio':
      return { floors: 6, perfects: 3, coins: 14 };
    case 'dificil':
      return { floors: 5, perfects: 3, coins: 14 };
    default: // experto
      return { floors: 4, perfects: 3, coins: 12 };
  }
}

/** Los 10 niveles de un modo. */
export function getStages(modeId: string): Stage[] {
  const base = modeBase(modeId);
  const stages: Stage[] = [];
  for (let i = 1; i <= STAGES_PER_MODE; i++) {
    // Cada 4º nivel pide perfects; cada 5º pide monedas; el resto, pisos.
    const goalType: StageGoalType = i % 5 === 0 ? 'coins' : i % 4 === 0 ? 'perfects' : 'floors';

    const growth = 1 + (i - 1) * 0.35; // el objetivo sube con el nivel
    const b = base[goalType];
    const one = Math.max(1, Math.round(b * growth));
    const two = Math.round(one * 1.5);
    const three = Math.round(one * 2);

    stages.push({
      modeId,
      index: i,
      goalType,
      targets: [one, two, three],
      speedMul: 1 + (i - 1) * 0.06, // hasta ~1.54x en el nivel 10
    });
  }
  return stages;
}

export function getStage(modeId: string, index: number): Stage {
  const stages = getStages(modeId);
  return stages[Math.min(Math.max(index, 1), stages.length) - 1];
}

/** Texto del objetivo, para mostrar en la UI. */
export function stageGoalText(stage: Stage): string {
  return `${stage.targets[0]} ${GOAL_LABEL[stage.goalType]}`;
}

/** Cuánto lleva el jugador en el objetivo de este nivel. */
export function progressFor(stage: Stage, run: RunResult): number {
  switch (stage.goalType) {
    case 'floors':
      return run.floors;
    case 'perfects':
      return run.perfects;
    case 'coins':
      return run.coins;
  }
}

/** Estrellas (0..3) que corresponden a un resultado. */
export function starsFor(stage: Stage, run: RunResult): number {
  const value = progressFor(stage, run);
  const [a, b, c] = stage.targets;
  if (value >= c) return 3;
  if (value >= b) return 2;
  if (value >= a) return 1;
  return 0;
}

// --- Progreso persistido ---
const key = (modeId: string, index: number): string => `${modeId}:${index}`;

export function starsEarned(modeId: string, index: number): number {
  return SaveManager.getStageStars(key(modeId, index));
}

/** Guarda estrellas si superan las anteriores. Devuelve true si mejoró. */
export function recordStars(modeId: string, index: number, stars: number): boolean {
  if (stars <= starsEarned(modeId, index)) return false;
  SaveManager.setStageStars(key(modeId, index), stars);
  return true;
}

/** El nivel 1 siempre está abierto; el resto pide ≥1 ⭐ en el anterior. */
export function isUnlocked(modeId: string, index: number): boolean {
  if (index <= 1) return true;
  return starsEarned(modeId, index - 1) >= 1;
}

/** Estrellas totales conseguidas en un modo (para mostrar progreso). */
export function totalStars(modeId: string): number {
  let sum = 0;
  for (let i = 1; i <= STAGES_PER_MODE; i++) sum += starsEarned(modeId, i);
  return sum;
}

export function maxStars(): number {
  return STAGES_PER_MODE * 3;
}
