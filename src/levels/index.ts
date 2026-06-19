import { level1 } from './level1';
import { level2 } from './level2';
import { level3 } from './level3';
import type { LevelConfig } from '../game/types';

export const levels: LevelConfig[] = [level1, level2, level3];

export function getLevelById(id: string): LevelConfig | undefined {
  return levels.find((l) => l.id === id);
}

export function getNextLevelId(currentId: string): string | null {
  const idx = levels.findIndex((l) => l.id === currentId);
  if (idx === -1 || idx >= levels.length - 1) return null;
  return levels[idx + 1].id;
}

export function getLevelIndex(id: string): number {
  return levels.findIndex((l) => l.id === id);
}
