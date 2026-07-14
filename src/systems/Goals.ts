// Misiones / metas cortas (ver skill casual-game-mechanics: "sistemas de
// enganche"). Son objetivos chicos con recompensa en monedas que se completan
// una sola vez. Dan sensación de progreso más allá del mejor puntaje.
//
// Para agregar una meta nueva, sumá una entrada acá; GameScene y MenuScene la
// toman automáticamente.

import { SaveManager } from './SaveManager';

export interface RunStats {
  floors: number; // pisos alcanzados en la partida actual
  maxCombo: number; // combo de perfects más alto de la partida
  coinsThisRun: number; // monedas ganadas en la partida
}

export interface Goal {
  id: string;
  label: string;
  reward: number; // monedas
  isMet: (s: RunStats) => boolean;
}

export const GOALS: Goal[] = [
  { id: 'floors10', label: 'Llegá a 10 pisos', reward: 25, isMet: (s) => s.floors >= 10 },
  { id: 'combo3', label: 'Hacé 3 perfects seguidos', reward: 30, isMet: (s) => s.maxCombo >= 3 },
  { id: 'floors20', label: 'Llegá a 20 pisos', reward: 50, isMet: (s) => s.floors >= 20 },
  { id: 'combo5', label: 'Hacé 5 perfects seguidos', reward: 60, isMet: (s) => s.maxCombo >= 5 },
  { id: 'coins30', label: 'Ganá 30 monedas en una partida', reward: 40, isMet: (s) => s.coinsThisRun >= 30 },
];

/** La próxima meta sin completar (para mostrar en el menú). */
export function nextGoal(): Goal | undefined {
  return GOALS.find((g) => !SaveManager.isGoalDone(g.id));
}

/**
 * Devuelve las metas recién completadas por estas stats (aún no marcadas) y las
 * marca como completadas, sumando su recompensa en monedas.
 */
export function claimNewlyCompleted(stats: RunStats): Goal[] {
  const done: Goal[] = [];
  for (const g of GOALS) {
    if (!SaveManager.isGoalDone(g.id) && g.isMet(stats)) {
      SaveManager.completeGoal(g.id);
      SaveManager.addCoins(g.reward);
      done.push(g);
    }
  }
  return done;
}
