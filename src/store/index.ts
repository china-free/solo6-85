import { create } from 'zustand';
import type { GameStatus, ToolType, ContainerProgress, LevelProgress } from '../game/types';
import { levels, getLevelById, getNextLevelId, getLevelIndex } from '../levels';

interface LevelStore {
  progress: Record<string, LevelProgress>;
  initProgress: () => void;
  completeLevel: (levelId: string, stars: number, time: number, inkUsed: number) => void;
  getProgress: (levelId: string) => LevelProgress;
  isUnlocked: (levelId: string) => boolean;
}

const STORAGE_KEY = 'water-game-progress-v1';

function loadFromStorage(): Record<string, LevelProgress> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return {};
}

function saveToStorage(progress: Record<string, LevelProgress>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch {}
}

export const useLevelStore = create<LevelStore>((set, get) => ({
  progress: {},
  initProgress: () => {
    const stored = loadFromStorage();
    const allProgress: Record<string, LevelProgress> = {};
    for (let i = 0; i < levels.length; i++) {
      const lv = levels[i];
      const existing = stored[lv.id];
      allProgress[lv.id] = {
        levelId: lv.id,
        unlocked: i === 0 || (existing?.unlocked ?? false),
        completed: existing?.completed ?? false,
        stars: existing?.stars ?? 0,
        bestTime: existing?.bestTime,
        bestInkUsed: existing?.bestInkUsed,
      };
    }
    saveToStorage(allProgress);
    set({ progress: allProgress });
  },
  completeLevel: (levelId: string, stars: number, time: number, inkUsed: number) => {
    const { progress } = get();
    const next = { ...progress };
    const current = next[levelId] || {
      levelId,
      unlocked: true,
      completed: false,
      stars: 0,
    };
    next[levelId] = {
      ...current,
      completed: true,
      stars: Math.max(current.stars, stars),
      bestTime: current.bestTime !== undefined ? Math.min(current.bestTime, time) : time,
      bestInkUsed: current.bestInkUsed !== undefined ? Math.min(current.bestInkUsed, inkUsed) : inkUsed,
    };
    const nextId = getNextLevelId(levelId);
    if (nextId) {
      next[nextId] = {
        ...(next[nextId] || { levelId: nextId, unlocked: false, completed: false, stars: 0 }),
        unlocked: true,
      };
    }
    saveToStorage(next);
    set({ progress: next });
  },
  getProgress: (levelId: string) => {
    return get().progress[levelId] || {
      levelId,
      unlocked: false,
      completed: false,
      stars: 0,
    };
  },
  isUnlocked: (levelId: string) => {
    return get().progress[levelId]?.unlocked ?? false;
  },
}));

interface GameStoreState {
  status: GameStatus;
  currentLevelId: string | null;
  elapsedTime: number;
  inkUsed: number;
  activeParticleCount: number;
  containerProgress: Record<string, ContainerProgress>;
  tool: ToolType;
  isPaused: boolean;
  holdProgress: number;
  resultStars: number;
  failReason: string | null;
}

interface GameStoreActions {
  startLevel: (levelId: string) => void;
  resetLevel: () => void;
  setStatus: (status: GameStatus) => void;
  setElapsedTime: (t: number) => void;
  setInkUsed: (n: number) => void;
  setActiveParticleCount: (n: number) => void;
  updateContainerProgress: (map: Map<string, ContainerProgress>) => void;
  setTool: (tool: ToolType) => void;
  togglePause: () => void;
  setPaused: (p: boolean) => void;
  setHoldProgress: (n: number) => void;
  completeWithResult: (stars: number) => void;
  fail: (reason: string) => void;
}

export const useGameStore = create<GameStoreState & GameStoreActions>((set, get) => ({
  status: 'idle',
  currentLevelId: null,
  elapsedTime: 0,
  inkUsed: 0,
  activeParticleCount: 0,
  containerProgress: {},
  tool: 'pen',
  isPaused: false,
  holdProgress: 0,
  resultStars: 0,
  failReason: null,
  startLevel: (levelId: string) => {
    const lv = getLevelById(levelId);
    set({
      status: 'playing',
      currentLevelId: levelId,
      elapsedTime: 0,
      inkUsed: 0,
      activeParticleCount: 0,
      containerProgress: {},
      tool: 'pen',
      isPaused: false,
      holdProgress: 0,
      resultStars: 0,
      failReason: null,
    });
  },
  resetLevel: () => {
    const { currentLevelId } = get();
    if (currentLevelId) {
      get().startLevel(currentLevelId);
    }
  },
  setStatus: (status) => set({ status }),
  setElapsedTime: (t) => set({ elapsedTime: t }),
  setInkUsed: (n) => set({ inkUsed: n }),
  setActiveParticleCount: (n) => set({ activeParticleCount: n }),
  updateContainerProgress: (map) => {
    const obj: Record<string, ContainerProgress> = {};
    for (const [k, v] of map.entries()) obj[k] = v;
    set({ containerProgress: obj });
  },
  setTool: (tool) => set({ tool }),
  togglePause: () => set({ isPaused: !get().isPaused, status: get().isPaused ? 'playing' : 'paused' }),
  setPaused: (p) => set({ isPaused: p, status: p ? 'paused' : 'playing' }),
  setHoldProgress: (n) => set({ holdProgress: n }),
  completeWithResult: (stars) => set({ status: 'complete', resultStars: stars }),
  fail: (reason) => set({ status: 'failed', failReason: reason }),
}));

function calculateStars(elapsedTime: number, inkUsed: number, inkLimit: number): number {
  const inkRatio = inkUsed / inkLimit;
  let stars = 1;
  if (inkRatio <= 0.7) stars = 2;
  if (inkRatio <= 0.5 && elapsedTime < 60) stars = 3;
  return stars;
}

export function computeStars(elapsedTime: number, inkUsed: number, inkLimit: number): number {
  return calculateStars(elapsedTime, inkUsed, inkLimit);
}
