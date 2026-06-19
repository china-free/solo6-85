export interface Vec2 {
  x: number;
  y: number;
}

export interface MaterialConfig {
  friction: number;
  frictionAir?: number;
  frictionStatic?: number;
  restitution: number;
  density?: number;
  isStatic?: boolean;
}

export interface PhysicsConfig {
  gravityScale: number;
  positionIterations: number;
  velocityIterations: number;
  constraintIterations: number;
  enableSleeping: boolean;
  maxSubStepMs: number;
  maxWaterSpeed: number;
  ccdPaddingFactor: number;
}

export interface WaterParticleConfig {
  initialVelocityJitterX: number;
  initialVelocityJitterY: number;
  initialVelocityMinY: number;
  spawnJitterX: number;
  spawnJitterY: number;
  material: MaterialConfig;
}

export interface WaterSourceConfig {
  x: number;
  y: number;
  rate: number;
  maxParticles: number;
  particleRadius: number;
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
  fillThresholdRatio?: number;
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
  friction?: number;
  restitution?: number;
}

export interface DrawingConfig {
  minPointDistance: number;
  minSegmentLength: number;
  lineThickness: number;
  eraserRadius: number;
  eraserRefundRatio: number;
  material: MaterialConfig;
}

export interface RenderConfig {
  backgroundColorStart: string;
  backgroundColorEnd: string;
  gridSize: number;
  gridOpacity: number;
  waterColorCore: string;
  waterColorMid: string;
  waterColorEdge: string;
  waterHighlightColor: string;
  drawnLineColor: string;
  drawnLineShadowColor: string;
  drawnLineHighlightColor: string;
  drawnLineShadowOpacity: number;
  drawnLineRenderThickness: number;
  drawnLineShadowThickness: number;
  drawnLineHighlightThickness: number;
  sourcePipeColorStart: string;
  sourcePipeColorEnd: string;
  sourcePipeBorderColor: string;
  sourceDropColor: string;
  containerWaterStart: string;
  containerWaterEnd: string;
  containerWaterHighlightColor: string;
  containerWallOpacity: number;
  holdIndicatorWidth: number;
  holdIndicatorHeight: number;
  holdIndicatorY: number;
  holdIndicatorBgColor: string;
  holdIndicatorStartColor: string;
  holdIndicatorEndColor: string;
  holdIndicatorBorderColor: string;
  holdIndicatorTextColor: string;
}

export interface StarsCriteria {
  threshold: number;
  maxTimeSeconds?: number;
  maxInkRatio?: number;
}

export interface StarsConfig {
  one: StarsCriteria;
  two: StarsCriteria;
  three: StarsCriteria;
}

export interface LevelConfig {
  id: string;
  name: string;
  description: string;
  worldWidth: number;
  worldHeight: number;
  gravity: number;
  inkLimit: number;
  holdTime: number;
  timeLimit?: number;
  waterSource: WaterSourceConfig;
  containers: ContainerConfig[];
  obstacles: ObstacleConfig[];
  physics?: Partial<PhysicsConfig>;
  waterParticle?: Partial<WaterParticleConfig>;
  drawing?: Partial<DrawingConfig>;
  render?: Partial<RenderConfig>;
  stars?: Partial<StarsConfig>;
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

export interface ResolvedLevelConfig extends LevelConfig {
  physics: PhysicsConfig;
  waterParticle: WaterParticleConfig;
  drawing: DrawingConfig;
  render: RenderConfig;
  stars: StarsConfig;
}
