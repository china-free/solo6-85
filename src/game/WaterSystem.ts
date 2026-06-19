import type { ResolvedLevelConfig, WaterSourceConfig, Vec2, LevelConfig } from './types';
import { PhysicsEngine } from './PhysicsEngine';
import { resolveLevelConfig } from './LevelLoader';

interface ParticleInfo {
  id: number;
  createdAt: number;
}

const BOUND_MARGIN = 200;

export class WaterSystem {
  private engine: PhysicsEngine;
  private level: ResolvedLevelConfig;
  private source: WaterSourceConfig;
  private particles: ParticleInfo[];
  private spawnAccumulator: number;
  private spawnedTotal: number;
  private onParticleRemoved?: (id: number) => void;

  constructor(engine: PhysicsEngine, level: LevelConfig | ResolvedLevelConfig) {
    this.engine = engine;
    this.level = 'physics' in level && level.physics !== undefined
      ? (level as ResolvedLevelConfig)
      : resolveLevelConfig(level as LevelConfig);
    this.source = this.level.waterSource;
    this.particles = [];
    this.spawnAccumulator = 0;
    this.spawnedTotal = 0;
  }

  setParticleRemovedCallback(cb: (id: number) => void) {
    this.onParticleRemoved = cb;
  }

  reset() {
    const ids = this.engine.removeAllWaterParticles();
    for (const id of ids) this.onParticleRemoved?.(id);
    this.particles = [];
    this.spawnAccumulator = 0;
    this.spawnedTotal = 0;
  }

  update(dtSeconds: number) {
    this.spawnAccumulator += dtSeconds * this.source.rate;
    while (this.spawnAccumulator >= 1) {
      this.spawnAccumulator -= 1;
      this.spawnParticle();
    }
    this.cleanupOutOfBounds();
  }

  private spawnParticle() {
    if (this.particles.length >= this.source.maxParticles) {
      this.removeOldestParticle();
    }
    const wp = this.level.waterParticle;
    const jitterX = (Math.random() - 0.5) * 2 * wp.spawnJitterX;
    const jitterY = (Math.random() - 0.5) * 2 * wp.spawnJitterY;
    const id = this.engine.createWaterParticle(
      this.source.x + jitterX,
      this.source.y + jitterY,
      this.source.particleRadius
    );
    this.particles.push({ id, createdAt: performance.now() });
    this.spawnedTotal++;
  }

  private removeOldestParticle() {
    if (this.particles.length === 0) return;
    const oldest = this.particles.shift()!;
    this.engine.removeWaterParticle(oldest.id);
    this.onParticleRemoved?.(oldest.id);
  }

  private cleanupOutOfBounds() {
    const maxY = this.level.worldHeight + BOUND_MARGIN;
    const minX = -BOUND_MARGIN;
    const maxX = this.level.worldWidth + BOUND_MARGIN;
    const waterBodies = this.engine.getWaterParticles();
    const toRemove: number[] = [];

    for (const [id, body] of waterBodies.entries()) {
      if (body.position.y > maxY || body.position.x < minX || body.position.x > maxX) {
        toRemove.push(id);
      }
    }

    for (const id of toRemove) {
      this.engine.removeWaterParticle(id);
      this.onParticleRemoved?.(id);
      const idx = this.particles.findIndex((p) => p.id === id);
      if (idx !== -1) this.particles.splice(idx, 1);
    }
  }

  removeParticlesOutsideContainers() {}

  getParticlePositions(): Map<number, Vec2> {
    const positions = new Map<number, Vec2>();
    const waterBodies = this.engine.getWaterParticles();
    for (const [id, body] of waterBodies.entries()) {
      positions.set(id, { x: body.position.x, y: body.position.y });
    }
    return positions;
  }

  getActiveParticleIds(): number[] {
    return this.particles.map((p) => p.id);
  }

  getParticleCount(): number {
    return this.particles.length;
  }

  getTotalSpawned(): number {
    return this.spawnedTotal;
  }

  getParticleRadius(): number {
    return this.source.particleRadius;
  }

  getSourcePosition(): Vec2 {
    return { x: this.source.x, y: this.source.y };
  }
}
