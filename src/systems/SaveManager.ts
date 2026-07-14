// SaveManager — persistencia local del estado del jugador.
//
// Todo se guarda en localStorage. NO se recolecta ningún dato personal ni se
// envía nada a un servidor (ver skill kids-app-compliance): el estado vive solo
// en el dispositivo.

const STORAGE_KEY = 'stack-smash-save-v1';
const MAX_LIVES = 5;
const DAILY_LIVES = 2; // vidas que regala la racha diaria

export interface SaveData {
  coins: number;
  lives: number;
  bestScore: number;
  ownedSkins: string[];
  selectedSkin: string;
  adsRemoved: boolean;
  streakCount: number;
  lastPlayedDate: string; // YYYY-MM-DD
  completedGoals: string[];
  bestScores: Record<string, number>; // mejor puntaje por dificultad
  soundMuted: boolean;
  onboarded: boolean;
  vibrate: boolean;
  stageStars: Record<string, number>; // "modo:nivel" → 0..3
  powerups: Record<string, number>; // inventario: id → cantidad
  dailyDate: string; // YYYY-MM-DD del set de misiones activo
  dailyProgress: Record<string, number>; // id de misión → progreso
  dailyClaimed: string[]; // misiones diarias ya cobradas
}

const DEFAULT_SAVE: SaveData = {
  coins: 0,
  lives: 5,
  bestScore: 0,
  ownedSkins: ['default'],
  selectedSkin: 'default',
  adsRemoved: false,
  streakCount: 0,
  lastPlayedDate: '',
  completedGoals: [],
  bestScores: {},
  soundMuted: false,
  onboarded: false,
  vibrate: true,
  stageStars: {},
  powerups: {},
  dailyDate: '',
  dailyProgress: {},
  dailyClaimed: [],
};

export class SaveManager {
  private static data: SaveData = { ...DEFAULT_SAVE };
  private static loaded = false;

  static load(): void {
    if (this.loaded) return;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        // Merge con defaults para tolerar saves viejos sin campos nuevos.
        this.data = { ...DEFAULT_SAVE, ...JSON.parse(raw) };
        this.sanitize();
      }
    } catch {
      this.data = { ...DEFAULT_SAVE };
    }
    this.loaded = true;
  }

  /** Corrige un save manipulado/corrupto para que el juego no entre en un
   * estado inválido (tipos raros, skin seleccionada no poseída, etc.). */
  private static sanitize(): void {
    const d = this.data;
    const num = (v: unknown, fallback: number): number =>
      typeof v === 'number' && Number.isFinite(v) ? v : fallback;

    d.coins = Math.max(0, Math.floor(num(d.coins, 0)));
    d.lives = Math.max(0, Math.min(MAX_LIVES, Math.floor(num(d.lives, DEFAULT_SAVE.lives))));
    d.bestScore = Math.max(0, Math.floor(num(d.bestScore, 0)));
    d.streakCount = Math.max(0, Math.floor(num(d.streakCount, 0)));

    if (!Array.isArray(d.ownedSkins) || d.ownedSkins.length === 0) d.ownedSkins = ['default'];
    if (!d.ownedSkins.includes('default')) d.ownedSkins.unshift('default');
    if (!d.ownedSkins.includes(d.selectedSkin)) d.selectedSkin = 'default';
    if (!Array.isArray(d.completedGoals)) d.completedGoals = [];
    if (typeof d.bestScores !== 'object' || d.bestScores === null || Array.isArray(d.bestScores)) {
      d.bestScores = {};
    }
    d.adsRemoved = !!d.adsRemoved;
    d.soundMuted = !!d.soundMuted;
    d.onboarded = !!d.onboarded;
    if (typeof d.vibrate !== 'boolean') d.vibrate = true;
    if (typeof d.stageStars !== 'object' || d.stageStars === null || Array.isArray(d.stageStars)) {
      d.stageStars = {};
    }
    if (typeof d.powerups !== 'object' || d.powerups === null || Array.isArray(d.powerups)) {
      d.powerups = {};
    }
    if (
      typeof d.dailyProgress !== 'object' ||
      d.dailyProgress === null ||
      Array.isArray(d.dailyProgress)
    ) {
      d.dailyProgress = {};
    }
    if (!Array.isArray(d.dailyClaimed)) d.dailyClaimed = [];
    if (typeof d.dailyDate !== 'string') d.dailyDate = '';
  }

  /** Fecha local de hoy (YYYY-MM-DD). Pública: la usan las misiones diarias. */
  static today(): string {
    return this.localDate(new Date());
  }

  /** Fecha local en formato YYYY-MM-DD (evita el desfase de UTC de toISOString). */
  private static localDate(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  private static persist(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
    } catch {
      // Modo privado o storage lleno: seguimos en memoria, sin romper el juego.
    }
  }

  // --- Monedas ---
  static get coins(): number {
    return this.data.coins;
  }
  static addCoins(n: number): void {
    this.data.coins = Math.max(0, this.data.coins + n);
    this.persist();
  }
  static spendCoins(n: number): boolean {
    if (this.data.coins < n) return false;
    this.data.coins -= n;
    this.persist();
    return true;
  }

  // --- Vidas / reintentos ---
  static get lives(): number {
    return this.data.lives;
  }
  static get maxLives(): number {
    return MAX_LIVES;
  }
  static addLives(n: number): void {
    this.data.lives = Math.max(0, Math.min(MAX_LIVES, this.data.lives + n));
    this.persist();
  }
  static useLife(): boolean {
    if (this.data.lives <= 0) return false;
    this.data.lives -= 1;
    this.persist();
    return true;
  }

  // --- Mejor puntaje ---
  static get bestScore(): number {
    return this.data.bestScore;
  }
  static bestScoreFor(difficulty: string): number {
    return this.data.bestScores[difficulty] ?? 0;
  }
  /** Reporta un puntaje. Actualiza el récord global y el del modo. Devuelve
   * true si superó el récord del modo (o el global si no se pasa modo). */
  static reportScore(score: number, difficulty?: string): boolean {
    let changed = false;
    let record = false;

    if (difficulty) {
      const prev = this.data.bestScores[difficulty] ?? 0;
      if (score > prev) {
        this.data.bestScores[difficulty] = score;
        changed = true;
        record = true;
      }
    } else if (score > this.data.bestScore) {
      record = true;
    }

    if (score > this.data.bestScore) {
      this.data.bestScore = score;
      changed = true;
    }

    if (changed) this.persist();
    return record;
  }

  // --- Skins ---
  static get ownedSkins(): string[] {
    return [...this.data.ownedSkins];
  }
  static ownsSkin(id: string): boolean {
    return this.data.ownedSkins.includes(id);
  }
  static unlockSkin(id: string): void {
    if (!this.data.ownedSkins.includes(id)) {
      this.data.ownedSkins.push(id);
      this.persist();
    }
  }
  static get selectedSkin(): string {
    return this.data.selectedSkin;
  }
  static selectSkin(id: string): void {
    if (this.data.ownedSkins.includes(id)) {
      this.data.selectedSkin = id;
      this.persist();
    }
  }

  // --- Quitar anuncios (compra no-consumible) ---
  static get adsRemoved(): boolean {
    return this.data.adsRemoved;
  }
  static setAdsRemoved(v: boolean): void {
    this.data.adsRemoved = v;
    this.persist();
  }

  // --- Racha diaria ---
  static get streak(): number {
    return this.data.streakCount;
  }
  /** Registra una sesión hoy y actualiza la racha. Devuelve el bonus otorgado
   * (monedas + vidas regaladas), o null si hoy ya se contó. */
  static registerDailyPlay(): { coins: number; lives: number } | null {
    const today = this.localDate(new Date());
    if (this.data.lastPlayedDate === today) return null; // ya contó hoy

    const yesterday = this.localDate(new Date(Date.now() - 86_400_000));
    this.data.streakCount =
      this.data.lastPlayedDate === yesterday ? this.data.streakCount + 1 : 1;
    this.data.lastPlayedDate = today;

    const coins = Math.min(this.data.streakCount, 7) * 5; // crece hasta 35
    this.data.coins += coins;

    // Regala vidas (con tope) para que el reintento rápido no se agote nunca.
    const before = this.data.lives;
    this.data.lives = Math.min(MAX_LIVES, this.data.lives + DAILY_LIVES);
    const lives = this.data.lives - before;

    this.persist();
    return { coins, lives };
  }

  // --- Misiones / metas cortas ---
  static isGoalDone(id: string): boolean {
    return this.data.completedGoals.includes(id);
  }
  static completeGoal(id: string): void {
    if (!this.data.completedGoals.includes(id)) {
      this.data.completedGoals.push(id);
      this.persist();
    }
  }

  // --- Preferencias ---
  static get soundMuted(): boolean {
    return this.data.soundMuted;
  }
  static setSoundMuted(v: boolean): void {
    this.data.soundMuted = v;
    this.persist();
  }

  static get onboarded(): boolean {
    return this.data.onboarded;
  }
  static setOnboarded(v: boolean): void {
    this.data.onboarded = v;
    this.persist();
  }

  static get vibrate(): boolean {
    return this.data.vibrate;
  }
  static setVibrate(v: boolean): void {
    this.data.vibrate = v;
    this.persist();
  }

  // --- Estrellas por nivel (clave "modo:nivel") ---
  static getStageStars(key: string): number {
    return this.data.stageStars[key] ?? 0;
  }
  static setStageStars(key: string, stars: number): void {
    this.data.stageStars[key] = Math.max(0, Math.min(3, Math.floor(stars)));
    this.persist();
  }

  // --- Inventario de power-ups ---
  static powerUpCount(id: string): number {
    return this.data.powerups[id] ?? 0;
  }
  static addPowerUp(id: string, n = 1): void {
    this.data.powerups[id] = this.powerUpCount(id) + n;
    this.persist();
  }
  /** Consume uno. Devuelve false si no había. */
  static usePowerUp(id: string): boolean {
    const n = this.powerUpCount(id);
    if (n <= 0) return false;
    this.data.powerups[id] = n - 1;
    this.persist();
    return true;
  }

  // --- Misiones diarias ---
  static get dailyDate(): string {
    return this.data.dailyDate;
  }
  /** Arranca un set nuevo de misiones (borra progreso del día anterior). */
  static resetDaily(date: string): void {
    this.data.dailyDate = date;
    this.data.dailyProgress = {};
    this.data.dailyClaimed = [];
    this.persist();
  }
  static dailyProgress(id: string): number {
    return this.data.dailyProgress[id] ?? 0;
  }
  static addDailyProgress(id: string, n: number): void {
    this.data.dailyProgress[id] = this.dailyProgress(id) + n;
    this.persist();
  }
  static isDailyClaimed(id: string): boolean {
    return this.data.dailyClaimed.includes(id);
  }
  static claimDaily(id: string): void {
    if (!this.data.dailyClaimed.includes(id)) {
      this.data.dailyClaimed.push(id);
      this.persist();
    }
  }

  // --- Borrar todos los datos (Ajustes → derecho del usuario, y útil para test) ---
  static clearAll(): void {
    this.data = { ...DEFAULT_SAVE, ownedSkins: ['default'] };
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // sin storage: ya quedó reseteado en memoria
    }
    this.persist();
  }
}
