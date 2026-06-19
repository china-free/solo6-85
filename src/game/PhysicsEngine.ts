import Matter from 'matter-js';
import type { LevelConfig, ContainerConfig, ObstacleConfig, Vec2 } from './types';

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

export class PhysicsEngine {
  engine: Matter.Engine;
  world: Matter.World;
  runner: Matter.Runner;
  objects: EngineObjects;
  level: LevelConfig;
  private nextBodyId: number;
  private waterIdCounter: number;

  constructor(level: LevelConfig) {
    this.level = level;
    this.nextBodyId = 1;
    this.waterIdCounter = 0;
    this.objects = {
      waterBodies: new Map(),
      obstacleBodies: [],
      containerBodies: [],
      drawnBodies: new Map(),
    };

    this.engine = Matter.Engine.create({
      gravity: {
        x: 0,
        y: level.gravity,
        scale: 0.001,
      },
      enableSleeping: false,
    });
    this.world = this.engine.world;
    this.world.bounds = {
      min: { x: 0, y: 0 },
      max: { x: level.worldWidth, y: level.worldHeight },
    };
    this.runner = Matter.Runner.create();
  }

  start() {
    Matter.Runner.run(this.runner, this.engine);
  }

  stop() {
    Matter.Runner.stop(this.runner);
  }

  destroy() {
    this.stop();
    Matter.World.clear(this.world, false);
    Matter.Engine.clear(this.engine);
  }

  buildLevel() {
    this.buildObstacles(this.level.obstacles);
    this.buildContainers(this.level.containers);
    this.buildWorldBounds();
  }

  private buildWorldBounds() {
    const { worldWidth, worldHeight } = this.level;
    const thickness = 100;
    const bounds = [
      Matter.Bodies.rectangle(worldWidth / 2, -thickness / 2, worldWidth + thickness * 2, thickness, {
        isStatic: true,
        friction: 0.5,
        restitution: 0.2,
        collisionFilter: { category: CATEGORY_OBSTACLE },
        render: { visible: false },
        label: 'bound-top',
      }),
      Matter.Bodies.rectangle(-thickness / 2, worldHeight / 2, thickness, worldHeight * 2, {
        isStatic: true,
        friction: 0.5,
        restitution: 0.2,
        collisionFilter: { category: CATEGORY_OBSTACLE },
        render: { visible: false },
        label: 'bound-left',
      }),
      Matter.Bodies.rectangle(worldWidth + thickness / 2, worldHeight / 2, thickness, worldHeight * 2, {
        isStatic: true,
        friction: 0.5,
        restitution: 0.2,
        collisionFilter: { category: CATEGORY_OBSTACLE },
        render: { visible: false },
        label: 'bound-right',
      }),
    ];
    Matter.World.add(this.world, bounds);
  }

  private buildObstacles(obstacles: ObstacleConfig[]) {
    for (const obs of obstacles) {
      const bodies = this.createObstacleBody(obs);
      for (const body of bodies) {
        body.collisionFilter = {
          category: CATEGORY_OBSTACLE,
          mask: CATEGORY_WATER | CATEGORY_DRAWN,
        };
        body.friction = 0.4;
        body.restitution = 0.15;
        body.isStatic = true;
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
        for (let i = 0; i < points.length - 1; i++) {
          const p1 = points[i];
          const p2 = points[i + 1];
          const dx = p2.x - p1.x;
          const dy = p2.y - p1.y;
          const length = Math.sqrt(dx * dx + dy * dy);
          const angle = Math.atan2(dy, dx);
          const cx = (p1.x + p2.x) / 2;
          const cy = (p1.y + p2.y) / 2;
          const body = Matter.Bodies.rectangle(cx, cy, length, 6, {
            angle,
            isStatic: true,
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
        body.friction = 0.3;
        body.restitution = 0.1;
        body.isStatic = true;
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
    const glassColor = color + '33';
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
    const body = Matter.Bodies.circle(x, y, radius, {
      isStatic: false,
      friction: 0.02,
      frictionAir: 0.01,
      restitution: 0.3,
      density: 0.003,
      collisionFilter: {
        category: CATEGORY_WATER,
        mask: CATEGORY_OBSTACLE | CATEGORY_CONTAINER | CATEGORY_DRAWN,
      },
      render: {
        fillStyle: '#0ea5e9',
      },
      label: `water:${id}`,
    });
    Matter.Body.setVelocity(body, {
      x: (Math.random() - 0.5) * 2,
      y: 0.5 + Math.random(),
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
    for (const id of ids) {
      this.removeWaterParticle(id);
    }
    return ids;
  }

  createDrawnLineBodies(points: Vec2[], thickness: number = 6): { bodyIds: number[]; length: number } {
    const bodyIds: number[] = [];
    let totalLength = 0;

    for (let i = 0; i < points.length - 1; i++) {
      const p1 = points[i];
      const p2 = points[i + 1];
      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const length = Math.sqrt(dx * dx + dy * dy);
      if (length < 2) continue;

      totalLength += length;
      const angle = Math.atan2(dy, dx);
      const cx = (p1.x + p2.x) / 2;
      const cy = (p1.y + p2.y) / 2;

      const id = this.nextBodyId++;
      const body = Matter.Bodies.rectangle(cx, cy, length, thickness, {
        angle,
        isStatic: true,
        friction: 0.4,
        restitution: 0.15,
        collisionFilter: {
          category: CATEGORY_DRAWN,
          mask: CATEGORY_WATER,
        },
        render: {
          fillStyle: '#1f2937',
        },
        label: `drawn:${id}`,
      });

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
    const ids = Array.from(this.objects.drawnBodies.keys());
    this.removeDrawnBodies(ids);
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

  findDrawnBodiesAtPoint(px: number, py: number, radius: number = 15): number[] {
    const hits: number[] = [];
    for (const [id, body] of this.objects.drawnBodies.entries()) {
      const verts = body.vertices;
      for (const v of verts) {
        const dx = v.x - px;
        const dy = v.y - py;
        if (dx * dx + dy * dy <= radius * radius) {
          hits.push(id);
          break;
        }
      }
    }
    return hits;
  }
}
