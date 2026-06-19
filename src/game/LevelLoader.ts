import type { LevelConfig, ResolvedLevelConfig } from './types';
import { levels, getLevelById } from '../levels';
import {
  DEFAULT_PHYSICS,
  DEFAULT_WATER_PARTICLE,
  DEFAULT_DRAWING,
  DEFAULT_RENDER,
  DEFAULT_STARS,
} from './levelDefaults';

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === 'object' && value !== null && !Array.isArray(value) && !(value instanceof Date)
  );
}

function deepMerge<T extends object>(base: T, overrides: Partial<T> | undefined): T {
  if (!overrides) return { ...base };
  const result: Record<string, unknown> = { ...(base as Record<string, unknown>) };
  for (const key of Object.keys(overrides as Record<string, unknown>)) {
    const baseVal = result[key];
    const overVal = (overrides as Record<string, unknown>)[key];
    if (isPlainObject(baseVal) && isPlainObject(overVal)) {
      result[key] = deepMerge(baseVal as Record<string, unknown>, overVal as Record<string, unknown>);
    } else if (overVal !== undefined) {
      result[key] = overVal;
    }
  }
  return result as T;
}

export function resolveLevelConfig(level: LevelConfig): ResolvedLevelConfig {
  return {
    ...level,
    physics: deepMerge(DEFAULT_PHYSICS, level.physics),
    waterParticle: deepMerge(DEFAULT_WATER_PARTICLE, level.waterParticle),
    drawing: deepMerge(DEFAULT_DRAWING, level.drawing),
    render: deepMerge(DEFAULT_RENDER, level.render),
    stars: deepMerge(DEFAULT_STARS, level.stars),
  };
}

export class LevelLoader {
  static getAllLevels(): LevelConfig[] {
    return levels;
  }

  static getAllResolved(): ResolvedLevelConfig[] {
    return levels.map(resolveLevelConfig);
  }

  static getLevel(id: string): LevelConfig | undefined {
    return getLevelById(id);
  }

  static getResolved(id: string): ResolvedLevelConfig | undefined {
    const lv = getLevelById(id);
    if (!lv) return undefined;
    return resolveLevelConfig(lv);
  }

  static getLevelCount(): number {
    return levels.length;
  }

  static validateLevel(config: LevelConfig): string[] {
    const errors: string[] = [];
    if (!config.id) errors.push('关卡缺少 id');
    if (!config.name) errors.push('关卡缺少 name');
    if (config.worldWidth <= 0) errors.push('worldWidth 必须为正数');
    if (config.worldHeight <= 0) errors.push('worldHeight 必须为正数');
    if (config.gravity < 0) errors.push('gravity 不能为负数');
    if (config.inkLimit <= 0) errors.push('inkLimit 必须为正数');
    if (!config.waterSource) {
      errors.push('缺少 waterSource 配置');
    } else {
      if (config.waterSource.rate <= 0) errors.push('waterSource.rate 必须为正数');
      if (config.waterSource.maxParticles <= 0) errors.push('waterSource.maxParticles 必须为正数');
      if (config.waterSource.particleRadius <= 0) errors.push('waterSource.particleRadius 必须为正数');
    }
    if (!config.containers || config.containers.length === 0) {
      errors.push('至少需要配置一个容器');
    } else {
      for (const c of config.containers) {
        if (!c.id) errors.push('容器缺少 id');
        if (c.width <= 0) errors.push(`容器 ${c.id} 的 width 无效`);
        if (c.height <= 0) errors.push(`容器 ${c.id} 的 height 无效`);
        if (c.targetCount <= 0) errors.push(`容器 ${c.id} 的 targetCount 无效`);
      }
    }
    if (config.holdTime <= 0) errors.push('holdTime 必须为正数');
    if (config.timeLimit !== undefined && config.timeLimit <= 0) {
      errors.push('timeLimit 必须为正数');
    }
    if (config.obstacles) {
      for (let i = 0; i < config.obstacles.length; i++) {
        const o = config.obstacles[i];
        if (!o.type) errors.push(`障碍 ${i} 缺少 type`);
        switch (o.type) {
          case 'rect':
            if (!o.width || o.width <= 0) errors.push(`障碍 ${i} 缺少 width`);
            if (!o.height || o.height <= 0) errors.push(`障碍 ${i} 缺少 height`);
            break;
          case 'circle':
            if (!o.radius || o.radius <= 0) errors.push(`障碍 ${i} 缺少 radius`);
            break;
          case 'polygon':
            if (!o.vertices || o.vertices.length < 3) errors.push(`障碍 ${i} 缺少 vertices`);
            break;
          case 'line':
            if (!o.points || o.points.length < 2) errors.push(`障碍 ${i} 缺少 points`);
            break;
        }
      }
    }
    return errors;
  }
}
