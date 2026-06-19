export interface Vec2 {
  x: number;
  y: number;
}

export interface ContainerConfig {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  wallThickness: number;
  targetCount: number;
  color: string;
}

export interface ObstacleConfig {
  type: 'rect' | 'circle' | 'polygon' | 'line';
  x: number;
  y: number;
  width?: number;
  height?: number;
  radius?: number;
  vertices?: Vec2[];
  points?: Vec2[];
  angle?: number;
  color?: string;
}

export interface WaterSourceConfig {
  x: number;
  y: number;
  rate: number;
  maxParticles: number;
  particleRadius: number;
}

export interface LevelConfig {
  id: string;
  name: string;
  description: string;
  worldWidth: number;
  worldHeight: number;
  gravity: number;
  inkLimit: number;
  waterSource: WaterSourceConfig;
  containers: ContainerConfig[];
  obstacles: ObstacleConfig[];
  holdTime: number;
  timeLimit?: number;
}

export type GameStatus = 'idle' | 'playing' | 'paused' | 'complete' | 'failed';
export type ToolType = 'pen' | 'eraser';

export interface ContainerProgress {
  current: number;
  target: number;
  filled: boolean;
  holdTimer: number;
}

export interface LevelProgress {
  levelId: string;
  unlocked: boolean;
  completed: boolean;
  stars: number;
  bestTime?: number;
  bestInkUsed?: number;
}

export type BodyCategory = 'water' | 'obstacle' | 'container' | 'drawn';

export interface DrawnSegment {
  id: string;
  points: Vec2[];
  bodyIds: number[];
  length: number;
}
