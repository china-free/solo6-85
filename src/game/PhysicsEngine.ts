import Matter from 'matter-js';
import type {
  ResolvedLevelConfig,
  ContainerConfig,
  ObstacleConfig,
  Vec2,
  MaterialConfig,
} from './types';
import { resolveLevelConfig } from './LevelLoader';
import type { LevelConfig } from './types';
import { DEFAULT_OBSTACLE_MATERIAL, DEFAULT_CONTAINER_MATERIAL } from './levelDefaults';

export const CATEGORY_WATER = 0x0001;
export const CATEGORY_OBSTACLE = 0x0002;
export const CATEGORY_CONTAINER = 0x0004;
export const CATEGORY_DRAWN = 0x0008;

export interface EngineObjects {
  waterBodies: Map<number, Matter.Body>;
  obstacleBodies: Matter.Body[];
  containerBodies: Matter.Body[];
  drawnBodies: Map<number, Matter.Body>;
}

function applyMaterial(body: Matter.Body, mat: MaterialConfig) {
  body.friction = mat.friction;
  if (mat.frictionAir !== undefined) body.frictionAir = mat.frictionAir;
  if (mat.frictionStatic !== undefined) body.frictionStatic = mat.frictionStatic;
  body.restitution = mat.restitution;
  if (mat.density !== undefined) body.density = mat.density;
  if (mat.isStatic !== undefined) body.isStatic = mat.isStatic;
}

export class PhysicsEngine {
  engine: Matter.Engine;
  world: Matter.World;
  runner: Matter.Runner;
  objects: EngineObjects;
  level: ResolvedLevelConfig;
  private nextBodyId: number;
  private waterIdCounter: number;
  private staticBodyCache: Matter.Body[] | null = null;

  constructor(level: LevelConfig | ResolvedLevelConfig) {
    this.level = 'physics' in level && level.physics !== undefined
      ? (level as ResolvedLevelConfig)
      : resolveLevelConfig(level as LevelConfig);

    this.nextBodyId = 1;
    this.waterIdCounter = 0;
    this.objects = {
      waterBodies: new Map(),
      obstacleBodies: [],
      containerBodies: [],
      drawnBodies: new Map(),
    };

    const phys = this.level.physics;
    this.engine = Matter.Engine.create({
      gravity: {
        x: 0,
        y: this.level.gravity,
        scale: 0.001 * phys.gravityScale,
      },
      enableSleeping: phys.enableSleeping,
      positionIterations: phys.positionIterations,
      velocityIterations: phys.velocityIterations,
      constraintIterations: phys.constraintIterations,
    });
    this.world = this.engine.world;
    this.world.bounds = {
      min: { x: 0, y: 0 },
      max: { x: this.level.worldWidth, y: this.level.worldHeight },
    };
    this.runner = Matter.Runner.create({});
  }

  start() {}
  stop() {}

  step(dtMs: number) {
    this.staticBodyCache = null;
    const actualDt = Math.min(50, dtMs);
    const maxStep = this.level.physics.maxSubStepMs;

    if (actualDt <= maxStep) {
      this.singleStep(actualDt);
      return;
    }

    const numSubSteps = Math.ceil(actualDt / maxStep);
    const subDt = actualDt / numSubSteps;
    for (let i = 0; i < numSubSteps; i++) {
      this.singleStep(subDt);
    }
  }

  private singleStep(dtMs: number) {
    const prevPositions = new Map<number, { x: number; y: number }>();
    const maxSpeed = this.level.physics.maxWaterSpeed;
    for (const [id, body] of this.objects.waterBodies.entries()) {
      prevPositions.set(id, { x: body.position.x, y: body.position.y });
      const speed = Math.hypot(body.velocity.x, body.velocity.y);
      if (speed > maxSpeed) {
        const k = maxSpeed / speed;
        Matter.Body.setVelocity(body, {
          x: body.velocity.x * k,
          y: body.velocity.y * k,
        });
      }
    }

    Matter.Engine.update(this.engine, dtMs);
    this.performCCD(prevPositions);
  }

  private getStaticBodiesForCCD(): Matter.Body[] {
    if (this.staticBodyCache) return this.staticBodyCache;
    const result: Matter.Body[] = [];
    for (const b of this.objects.obstacleBodies) result.push(b);
    for (const b of this.objects.containerBodies) result.push(b);
    for (const [, b] of this.objects.drawnBodies) result.push(b);
    this.staticBodyCache = result;
    return result;
  }

  private performCCD(prevPositions: Map<number, { x: number; y: number }>) {
    const staticBodies = this.getStaticBodiesForCCD();
    if (staticBodies.length === 0) return;

    const drawnThickness = this.level.drawing.lineThickness;
    const paddingFactor = this.level.physics.ccdPaddingFactor;
    const particleRadius = this.level.waterSource.particleRadius;

    for (const [id, body] of this.objects.waterBodies.entries()) {
      const prev = prevPositions.get(id);
      if (!prev) continue;

      const dx = body.position.x - prev.x;
      const dy = body.position.y - prev.y;
      const dist = Math.hypot(dx, dy);
      if (dist < drawnThickness * 0.5) continue;

      const radius = body.circleRadius || particleRadius;
      const paddedRadius = radius + drawnThickness * paddingFactor * 0.5;

      const collisions = Matter.Query.ray(staticBodies, prev, body.position, paddedRadius);
      if (collisions.length === 0) continue;

      let bestT = Infinity;
      let bestBody: Matter.Body | null = null;
      for (const col of collisions) {
        const t = (col as any).t as number;
        if (t !== undefined && t < bestT) {
          bestT = t;
          bestBody = col.bodyA;
        }
      }
      if (!bestBody || !isFinite(bestT)) continue;

      const hitT = Math.max(0, Math.min(0.9, bestT - 0.02));
      Matter.Body.setPosition(body, {
        x: prev.x + dx * hitT,
        y: prev.y + dy * hitT,
      });

      const nx = dx / (dist || 1);
      const ny = dy / (dist || 1);
      const vn = body.velocity.x * nx + body.velocity.y * ny;
      if (vn < 0) {
        const e = this.level.waterParticle.material.restitution;
        Matter.Body.setVelocity(body, {
          x: body.velocity.x - (1 + e) * vn * nx,
          y: body.velocity.y - (1 + e) * vn * ny,
        });
      }
    }
  }

  destroy() {
    this.stop();
    Matter.World.clear(this.world, false);
    Matter.Engine.clear(this.engine);
    this.staticBodyCache = null;
  }

  buildLevel() {
    this.buildObstacles(this.level.obstacles);
    this.buildContainers(this.level.containers);
    this.buildWorldBounds();
  }

  private buildWorldBounds() {
    const { worldWidth, worldHeight } = this.level;
    const thickness = 100;
    const mat = { ...DEFAULT_OBSTACLE_MATERIAL, friction: 0.5, restitution: 0.2 };
    const bounds = [
      Matter.Bodies.rectangle(worldWidth / 2, -thickness / 2, worldWidth + thickness * 2, thickness, {
        collisionFilter: { category: CATEGORY_OBSTACLE },
        render: { visible: false },
        label: 'bound-top',
      }),
      Matter.Bodies.rectangle(-thickness / 2, worldHeight / 2, thickness, worldHeight * 2, {
        collisionFilter: { category: CATEGORY_OBSTACLE },
        render: { visible: false },
        label: 'bound-left',
      }),
      Matter.Bodies.rectangle(worldWidth + thickness / 2, worldHeight / 2, thickness, worldHeight * 2, {
        collisionFilter: { category: CATEGORY_OBSTACLE },
        render: { visible: false },
        label: 'bound-right',
      }),
    ];
    for (const b of bounds) applyMaterial(b, mat);
    Matter.World.add(this.world, bounds);
  }

  private buildObstacles(obstacles: ObstacleConfig[]) {
    for (const obs of obstacles) {
      const bodies = this.createObstacleBody(obs);
      const mat = {
        ...DEFAULT_OBSTACLE_MATERIAL,
        ...(obs.friction !== undefined && { friction: obs.friction }),
        ...(obs.restitution !== undefined && { restitution: obs.restitution }),
      };
      for (const body of bodies) {
        body.collisionFilter = {
          category: CATEGORY_OBSTACLE,
          mask: CATEGORY_WATER | CATEGORY_DRAWN,
        };
        applyMaterial(body, mat);
        body.label = 'obstacle';
        this.objects.obstacleBodies.push(body);
      }
      Matter.World.add(this.world, bodies);
    }
  }

  private createObstacleBody(obs: ObstacleConfig): Matter.Body[] {
    const color = obs.color || '#475569';
    switch (obs.type) {
      case 'rect': {
        const body = Matter.Bodies.rectangle(
          obs.x,
          obs.y,
          obs.width || 100,
          obs.height || 20,
          {
            angle: obs.angle || 0,
            render: { fillStyle: color },
          }
        );
        return [body];
      }
      case 'circle': {
        const body = Matter.Bodies.circle(obs.x, obs.y, obs.radius || 20, {
          render: { fillStyle: color },
        });
        return [body];
      }
      case 'polygon': {
        const verts = obs.vertices || [
          { x: 0, y: -30 },
          { x: 30, y: 30 },
          { x: -30, y: 30 },
        ];
        const body = Matter.Bodies.fromVertices(obs.x, obs.y, [verts], {
          angle: obs.angle || 0,
          render: { fillStyle: color },
        });
        return body ? [body] : [];
      }
      case 'line': {
        const points = obs.points || [];
        const bodies: Matter.Body[] = [];
        const lineThick = 6;
        for (let i = 0; i < points.length - 1; i++) {
          const p1 = points[i];
          const p2 = points[i + 1];
          const dx = p2.x - p1.x;
          const dy = p2.y - p1.y;
          const length = Math.sqrt(dx * dx + dy * dy);
          const angle = Math.atan2(dy, dx);
          const cx = (p1.x + p2.x) / 2;
          const cy = (p1.y + p2.y) / 2;
          const body = Matter.Bodies.rectangle(cx, cy, length, lineThick, {
            angle,
            render: { fillStyle: color },
          });
          bodies.push(body);
        }
        return bodies;
      }
      default:
        return [];
    }
  }

  private buildContainers(containers: ContainerConfig[]) {
    for (const container of containers) {
      const bodies = this.createContainerBodies(container);
      for (const body of bodies) {
        body.collisionFilter = {
          category: CATEGORY_CONTAINER,
          mask: CATEGORY_WATER | CATEGORY_DRAWN,
        };
        applyMaterial(body, DEFAULT_CONTAINER_MATERIAL);
        body.label = `container:${container.id}`;
        this.objects.containerBodies.push(body);
      }
      Matter.World.add(this.world, bodies);
    }
  }

  private createContainerBodies(c: ContainerConfig): Matter.Body[] {
    const { x, y, width, height, wallThickness, color } = c;
    const halfW = width / 2;
    const halfH = height / 2;
    const wallColor = color;

    const leftWall = Matter.Bodies.rectangle(
      x - halfW + wallThickness / 2,
      y,
      wallThickness,
      height,
      { render: { fillStyle: wallColor } }
    );
    const rightWall = Matter.Bodies.rectangle(
      x + halfW - wallThickness / 2,
      y,
      wallThickness,
      height,
      { render: { fillStyle: wallColor } }
    );
    const bottomWall = Matter.Bodies.rectangle(
      x,
      y + halfH - wallThickness / 2,
      width,
      wallThickness,
      { render: { fillStyle: wallColor } }
    );

    return [leftWall, rightWall, bottomWall];
  }

  createWaterParticle(x: number, y: number, radius: number): number {
    const id = this.waterIdCounter++;
    const wp = this.level.waterParticle;
    const body = Matter.Bodies.circle(x, y, radius, {
      collisionFilter: {
        category: CATEGORY_WATER,
        mask: CATEGORY_OBSTACLE | CATEGORY_CONTAINER | CATEGORY_DRAWN,
      },
      render: {
        fillStyle: this.level.render.waterColorMid,
      },
      label: `water:${id}`,
    });
    applyMaterial(body, {
      ...wp.material,
      isStatic: false,
    });
    Matter.Body.setVelocity(body, {
      x: (Math.random() - 0.5) * 2 * wp.initialVelocityJitterX,
      y: wp.initialVelocityMinY + Math.random() * wp.initialVelocityJitterY,
    });
    this.objects.waterBodies.set(id, body);
    Matter.World.add(this.world, body);
    return id;
  }

  removeWaterParticle(id: number) {
    const body = this.objects.waterBodies.get(id);
    if (body) {
      Matter.World.remove(this.world, body);
      this.objects.waterBodies.delete(id);
    }
  }

  removeAllWaterParticles(): number[] {
    const ids = Array.from(this.objects.waterBodies.keys());
    for (const id of ids) this.removeWaterParticle(id);
    return ids;
  }

  createDrawnLineBodies(points: Vec2[]): { bodyIds: number[]; length: number } {
    const bodyIds: number[] = [];
    let totalLength = 0;
    const { lineThickness, material, minSegmentLength } = this.level.drawing;

    for (let i = 0; i < points.length - 1; i++) {
      const p1 = points[i];
      const p2 = points[i + 1];
      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const length = Math.sqrt(dx * dx + dy * dy);
      if (length < minSegmentLength) continue;

      totalLength += length;
      const angle = Math.atan2(dy, dx);
      const cx = (p1.x + p2.x) / 2;
      const cy = (p1.y + p2.y) / 2;

      const id = this.nextBodyId++;
      const body = Matter.Bodies.rectangle(cx, cy, length, lineThickness, {
        angle,
        collisionFilter: {
          category: CATEGORY_DRAWN,
          mask: CATEGORY_WATER,
        },
        render: {
          fillStyle: this.level.render.drawnLineColor,
        },
        label: `drawn:${id}`,
      });
      applyMaterial(body, material);

      this.objects.drawnBodies.set(id, body);
      bodyIds.push(id);
      Matter.World.add(this.world, body);
    }

    return { bodyIds, length: totalLength };
  }

  removeDrawnBodies(bodyIds: number[]) {
    for (const id of bodyIds) {
      const body = this.objects.drawnBodies.get(id);
      if (body) {
        Matter.World.remove(this.world, body);
        this.objects.drawnBodies.delete(id);
      }
    }
  }

  removeAllDrawnBodies() {
    this.removeDrawnBodies(Array.from(this.objects.drawnBodies.keys()));
  }

  getWaterParticles(): Map<number, Matter.Body> {
    return this.objects.waterBodies;
  }

  getWaterParticleCount(): number {
    return this.objects.waterBodies.size;
  }

  getDrawnBodyCount(): number {
    return this.objects.drawnBodies.size;
  }

  findDrawnBodiesAtPoint(px: number, py: number, radius?: number): number[] {
    const r = radius ?? this.level.drawing.eraserRadius;
    const hits: number[] = [];
    for (const [id, body] of this.objects.drawnBodies.entries()) {
      for (const v of body.vertices) {
        const dx = v.x - px;
        const dy = v.y - py;
        if (dx * dx + dy * dy <= r * r) {
          hits.push(id);
          break;
        }
      }
    }
    return hits;
  }
}
