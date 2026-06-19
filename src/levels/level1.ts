import type { LevelConfig } from '../game/types';

export const level1: LevelConfig = {
  id: 'level-1',
  name: '初学者',
  description: '画一条简单的斜坡，将水引入右侧的容器中',
  worldWidth: 1000,
  worldHeight: 600,
  gravity: 1,
  inkLimit: 1200,
  waterSource: {
    x: 150,
    y: 80,
    rate: 12,
    maxParticles: 500,
    particleRadius: 4,
  },
  containers: [
    {
      id: 'container-1',
      x: 750,
      y: 420,
      width: 180,
      height: 160,
      wallThickness: 12,
      targetCount: 120,
      color: '#f59e0b',
    },
  ],
  obstacles: [
    {
      type: 'rect',
      x: 500,
      y: 580,
      width: 1000,
      height: 40,
      color: '#64748b',
    },
  ],
  holdTime: 3,
};
