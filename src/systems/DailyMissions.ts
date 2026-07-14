// Misiones diarias — 3 objetivos que rotan cada día y se cobran en monedas.
//
// Se GENERAN de forma determinística a partir de la fecha (misma fecha → mismas
// misiones), así no hace falta guardar el catálogo: solo el progreso.
// Complementan a los logros permanentes de Goals.ts.

import { SaveManager } from './SaveManager';

export type MissionType = 'floors' | 'perfects' | 'coins' | 'games' | 'stars';

export interface DailyMission {
  id: string;
  type: MissionType;
  label: string;
  target: number;
  reward: number; // monedas
}

/** Estadísticas acumulables de una partida (las reporta GameScene al terminar). */
export interface RunStats {
  floors: number;
  perfects: number;
  coins: number;
  stars: number;
}

// RNG determinístico sembrado con la fecha.
function hash(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const TEMPLATES: Record<
  MissionType,
  { label: (n: number) => string; range: [number, number]; rewardPer: number }
> = {
  floors: { label: (n) => `Apilá ${n} pisos en total`, range: [30, 70], rewardPer: 1 },
  perfects: { label: (n) => `Hacé ${n} perfects`, range: [8, 20], rewardPer: 4 },
  coins: { label: (n) => `Ganá ${n} monedas jugando`, range: [60, 140], rewardPer: 0.5 },
  games: { label: (n) => `Jugá ${n} partidas`, range: [3, 8], rewardPer: 12 },
  stars: { label: (n) => `Conseguí ${n} estrellas`, range: [2, 6], rewardPer: 18 },
};

const ALL_TYPES: MissionType[] = ['floors', 'perfects', 'coins', 'games', 'stars'];

/** Si cambió el día, reinicia el set (progreso y cobros). */
function ensureToday(): string {
  const today = SaveManager.today();
  if (SaveManager.dailyDate !== today) SaveManager.resetDaily(today);
  return today;
}

/** Las 3 misiones de hoy. */
export function getDailyMissions(): DailyMission[] {
  const today = ensureToday();
  const rnd = mulberry32(hash(today));

  // Elegir 3 tipos distintos.
  const pool = [...ALL_TYPES];
  const chosen: MissionType[] = [];
  for (let i = 0; i < 3; i++) {
    const idx = Math.floor(rnd() * pool.length);
    chosen.push(pool.splice(idx, 1)[0]);
  }

  return chosen.map((type) => {
    const t = TEMPLATES[type];
    const [min, max] = t.range;
    const target = Math.round(min + rnd() * (max - min));
    return {
      id: `${today}:${type}`,
      type,
      label: t.label(target),
      target,
      reward: Math.max(10, Math.round(target * t.rewardPer)),
    };
  });
}

export function progressOf(m: DailyMission): number {
  return Math.min(SaveManager.dailyProgress(m.id), m.target);
}

export function isComplete(m: DailyMission): boolean {
  return SaveManager.dailyProgress(m.id) >= m.target;
}

/**
 * Suma el resultado de una partida al progreso de las misiones de hoy y cobra
 * las que se completaron. Devuelve las misiones recién completadas (para avisar).
 */
export function reportRun(stats: RunStats): DailyMission[] {
  const missions = getDailyMissions();
  const completed: DailyMission[] = [];

  for (const m of missions) {
    if (SaveManager.isDailyClaimed(m.id)) continue;

    let delta = 0;
    switch (m.type) {
      case 'floors':
        delta = stats.floors;
        break;
      case 'perfects':
        delta = stats.perfects;
        break;
      case 'coins':
        delta = stats.coins;
        break;
      case 'games':
        delta = 1;
        break;
      case 'stars':
        delta = stats.stars;
        break;
    }
    if (delta > 0) SaveManager.addDailyProgress(m.id, delta);

    if (isComplete(m)) {
      SaveManager.claimDaily(m.id);
      SaveManager.addCoins(m.reward);
      completed.push(m);
    }
  }
  return completed;
}
