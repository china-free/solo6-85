import type { LevelConfig } from './types';
import { levels, getLevelById } from '../levels';

export class LevelLoader {
  static getAllLevels(): LevelConfig[] {
    return levels;
  }

  static getLevel(id: string): LevelConfig | undefined {
    return getLevelById(id);
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
    return errors;
  }
}
