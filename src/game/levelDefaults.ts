import type {
  PhysicsConfig,
  WaterParticleConfig,
  DrawingConfig,
  RenderConfig,
  StarsConfig,
  MaterialConfig,
} from './types';

export const DEFAULT_OBSTACLE_MATERIAL: MaterialConfig = {
  friction: 0.4,
  restitution: 0.15,
  isStatic: true,
};

export const DEFAULT_CONTAINER_MATERIAL: MaterialConfig = {
  friction: 0.3,
  restitution: 0.1,
  isStatic: true,
};

export const DEFAULT_PHYSICS: PhysicsConfig = {
  gravityScale: 1,
  positionIterations: 16,
  velocityIterations: 10,
  constraintIterations: 4,
  enableSleeping: false,
  maxSubStepMs: 2,
  maxWaterSpeed: 14,
  ccdPaddingFactor: 1.8,
};

export const DEFAULT_WATER_PARTICLE: WaterParticleConfig = {
  initialVelocityJitterX: 0.5,
  initialVelocityJitterY: 1.0,
  initialVelocityMinY: 1.5,
  spawnJitterX: 12,
  spawnJitterY: 4,
  material: {
    friction: 0.02,
    frictionAir: 0.01,
    restitution: 0.3,
    density: 0.003,
  },
};

export const DEFAULT_DRAWING: DrawingConfig = {
  minPointDistance: 4,
  minSegmentLength: 8,
  lineThickness: 10,
  eraserRadius: 20,
  eraserRefundRatio: 0.8,
  material: {
    friction: 0.4,
    restitution: 0.15,
    isStatic: true,
  },
};

export const DEFAULT_RENDER: RenderConfig = {
  backgroundColorStart: '#f0f9ff',
  backgroundColorEnd: '#e0f2fe',
  gridSize: 50,
  gridOpacity: 0.06,
  waterColorCore: '#60a5fa',
  waterColorMid: '#3b82f6',
  waterColorEdge: '#1d4ed8',
  waterHighlightColor: '#bfdbfe',
  drawnLineColor: '#fbbf24',
  drawnLineShadowColor: '#78350f',
  drawnLineHighlightColor: '#fef08a',
  drawnLineShadowOpacity: 0.4,
  drawnLineRenderThickness: 11,
  drawnLineShadowThickness: 14,
  drawnLineHighlightThickness: 4,
  sourcePipeColorStart: '#94a3b8',
  sourcePipeColorEnd: '#475569',
  sourcePipeBorderColor: '#1e293b',
  sourceDropColor: '#60a5fa',
  containerWaterStart: 'rgba(59,130,246,0.55)',
  containerWaterEnd: 'rgba(29,78,216,0.7)',
  containerWaterHighlightColor: 'rgba(191,219,254,0.4)',
  containerWallOpacity: 0.35,
  holdIndicatorWidth: 200,
  holdIndicatorHeight: 18,
  holdIndicatorY: 50,
  holdIndicatorBgColor: 'rgba(15,23,42,0.85)',
  holdIndicatorStartColor: '#22c55e',
  holdIndicatorEndColor: '#16a34a',
  holdIndicatorBorderColor: '#84cc16',
  holdIndicatorTextColor: '#ecfccb',
};

export const DEFAULT_STARS: StarsConfig = {
  one: { threshold: 1 },
  two: { threshold: 2, maxInkRatio: 0.7 },
  three: { threshold: 3, maxInkRatio: 0.5, maxTimeSeconds: 60 },
};
