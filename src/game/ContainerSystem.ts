import type { LevelConfig, ContainerConfig, ContainerProgress, ResolvedLevelConfig } from './types';
import { PhysicsEngine } from './PhysicsEngine';
import { resolveLevelConfig } from './LevelLoader';

export interface ContainerState {
  id: string;
  config: ContainerConfig;
  progress: ContainerProgress;
  filledParticles: Set<number>;
}

export class ContainerSystem {
  private engine: PhysicsEngine;
  private level: ResolvedLevelConfig;
  private containers: Map<string, ContainerState>;
  private holdTime: number;
  private allFilled: boolean;
  private allFilledTimer: number;

  constructor(engine: PhysicsEngine, level: LevelConfig | ResolvedLevelConfig) {
    this.engine = engine;
    this.level = 'physics' in level && level.physics !== undefined
      ? (level as ResolvedLevelConfig)
      : resolveLevelConfig(level as LevelConfig);
    this.holdTime = this.level.holdTime;
    this.containers = new Map();
    this.allFilled = false;
    this.allFilledTimer = 0;
    this.initContainers();
  }

  private initContainers() {
    for (const config of this.level.containers) {
      this.containers.set(config.id, {
        id: config.id,
        config,
        progress: {
          current: 0,
          target: config.targetCount,
          filled: false,
          holdTimer: 0,
        },
        filledParticles: new Set(),
      });
    }
  }

  reset() {
    this.allFilled = false;
    this.allFilledTimer = 0;
    for (const state of this.containers.values()) {
      state.progress = {
        current: 0,
        target: state.config.targetCount,
        filled: false,
        holdTimer: 0,
      };
      state.filledParticles.clear();
    }
  }

  update(dtSeconds: number, activeParticleIds: Set<number>) {
    const waterBodies = this.engine.getWaterParticles();
    for (const state of this.containers.values()) {
      const { config } = state;
      const halfW = config.width / 2;
      const halfH = config.height / 2;
      const innerLeft = config.x - halfW + config.wallThickness;
      const innerRight = config.x + halfW - config.wallThickness;
      const innerBottom = config.y + halfH - config.wallThickness;
      const thresholdRatio = config.fillThresholdRatio ?? 0.25;
      const innerTop = config.y - halfH + config.height * thresholdRatio;

      const currentSet = new Set<number>();
      for (const [id, body] of waterBodies.entries()) {
        const px = body.position.x;
        const py = body.position.y;
        if (px > innerLeft && px < innerRight && py > innerTop && py < innerBottom) {
          currentSet.add(id);
        }
      }

      const kept = new Set<number>();
      for (const pid of state.filledParticles) {
        if (currentSet.has(pid) && activeParticleIds.has(pid)) kept.add(pid);
      }
      for (const pid of currentSet) {
        if (activeParticleIds.has(pid)) kept.add(pid);
      }
      state.filledParticles = kept;
      state.progress.current = kept.size;

      state.progress.filled = kept.size >= config.targetCount;
      if (state.progress.filled) {
        state.progress.holdTimer = Math.min(this.holdTime, state.progress.holdTimer + dtSeconds);
      } else {
        state.progress.holdTimer = Math.max(0, state.progress.holdTimer - dtSeconds * 2);
      }
    }

    this.allFilled = Array.from(this.containers.values()).every((s) => s.progress.filled);
    if (this.allFilled) {
      this.allFilledTimer = Math.min(this.holdTime, this.allFilledTimer + dtSeconds);
    } else {
      this.allFilledTimer = Math.max(0, this.allFilledTimer - dtSeconds * 2);
    }
  }

  isLevelComplete(): boolean {
    return this.allFilledTimer >= this.holdTime;
  }

  getAllFilledHoldProgress(): number {
    return this.allFilledTimer / this.holdTime;
  }

  getContainerProgress(id: string): ContainerProgress | undefined {
    return this.containers.get(id)?.progress;
  }

  getAllProgress(): Map<string, ContainerProgress> {
    const map = new Map<string, ContainerProgress>();
    for (const [id, state] of this.containers.entries()) {
      map.set(id, { ...state.progress });
    }
    return map;
  }

  getContainers(): ContainerState[] {
    return Array.from(this.containers.values());
  }

  getContainerConfigs(): ContainerConfig[] {
    return this.level.containers;
  }
}
