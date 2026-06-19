import type { Vec2, DrawnSegment, ToolType, LevelConfig, ResolvedLevelConfig } from './types';
import { PhysicsEngine } from './PhysicsEngine';
import { resolveLevelConfig } from './LevelLoader';

export class DrawingSystem {
  private engine: PhysicsEngine;
  private level: ResolvedLevelConfig;
  private isDrawing: boolean;
  private currentPoints: Vec2[];
  private segments: DrawnSegment[];
  private inkUsed: number;
  private tool: ToolType;
  private lastEraserIds: Set<number>;

  constructor(engine: PhysicsEngine, level: LevelConfig | ResolvedLevelConfig) {
    this.engine = engine;
    this.level = 'physics' in level && level.physics !== undefined
      ? (level as ResolvedLevelConfig)
      : resolveLevelConfig(level as LevelConfig);
    this.isDrawing = false;
    this.currentPoints = [];
    this.segments = [];
    this.inkUsed = 0;
    this.tool = 'pen';
    this.lastEraserIds = new Set();
  }

  reset() {
    for (const seg of this.segments) this.engine.removeDrawnBodies(seg.bodyIds);
    this.segments = [];
    this.currentPoints = [];
    this.inkUsed = 0;
    this.isDrawing = false;
    this.lastEraserIds.clear();
  }

  setTool(tool: ToolType) {
    this.tool = tool;
    if (this.isDrawing) this.cancelCurrentStroke();
  }

  getTool(): ToolType {
    return this.tool;
  }

  getInkLimit(): number {
    return this.level.inkLimit;
  }

  getInkUsed(): number {
    return this.inkUsed;
  }

  getInkRemaining(): number {
    return Math.max(0, this.level.inkLimit - this.inkUsed);
  }

  getSegments(): DrawnSegment[] {
    return this.segments;
  }

  getCurrentPoints(): Vec2[] {
    return this.currentPoints;
  }

  isCurrentlyDrawing(): boolean {
    return this.isDrawing;
  }

  startStroke(x: number, y: number) {
    if (this.tool === 'eraser') {
      this.eraseAt(x, y);
      return;
    }
    if (this.getInkRemaining() <= 0) return;
    this.isDrawing = true;
    this.currentPoints = [{ x, y }];
  }

  continueStroke(x: number, y: number) {
    if (this.tool === 'eraser') {
      this.eraseAt(x, y);
      return;
    }
    if (!this.isDrawing) return;
    if (this.getInkRemaining() <= 0) {
      this.endStroke();
      return;
    }
    const cfg = this.level.drawing;
    const last = this.currentPoints[this.currentPoints.length - 1];
    const dx = x - last.x;
    const dy = y - last.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist >= cfg.minPointDistance) {
      if (this.inkUsed + dist > this.level.inkLimit) {
        const remaining = this.level.inkLimit - this.inkUsed;
        if (remaining > cfg.minSegmentLength) {
          const ratio = remaining / dist;
          this.currentPoints.push({
            x: last.x + dx * ratio,
            y: last.y + dy * ratio,
          });
          this.inkUsed += remaining;
        }
        this.endStroke();
      } else {
        this.currentPoints.push({ x, y });
        this.inkUsed += dist;
      }
    }
  }

  endStroke() {
    if (!this.isDrawing) return;
    this.isDrawing = false;
    if (this.currentPoints.length >= 2) {
      this.commitCurrentStroke();
    } else {
      this.currentPoints = [];
    }
  }

  cancelCurrentStroke() {
    this.isDrawing = false;
    this.currentPoints = [];
  }

  private commitCurrentStroke() {
    const points = [...this.currentPoints];
    const { bodyIds, length } = this.engine.createDrawnLineBodies(points);
    if (bodyIds.length > 0) {
      this.segments.push({
        id: `seg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        points,
        bodyIds,
        length,
      });
    }
    this.currentPoints = [];
  }

  private eraseAt(x: number, y: number) {
    const cfg = this.level.drawing;
    const hitIds = this.engine.findDrawnBodiesAtPoint(x, y);
    if (hitIds.length === 0) return;
    const toRemoveSegs: string[] = [];
    const allBodyIdsToRemove = new Set<number>();

    for (const id of hitIds) {
      if (this.lastEraserIds.has(id)) continue;
      this.lastEraserIds.add(id);
      for (const seg of this.segments) {
        if (seg.bodyIds.includes(id)) {
          toRemoveSegs.push(seg.id);
          for (const bid of seg.bodyIds) allBodyIdsToRemove.add(bid);
          break;
        }
      }
    }

    if (toRemoveSegs.length > 0) {
      this.engine.removeDrawnBodies(Array.from(allBodyIdsToRemove));
      let refunded = 0;
      for (let i = this.segments.length - 1; i >= 0; i--) {
        if (toRemoveSegs.includes(this.segments[i].id)) {
          refunded += this.segments[i].length;
          this.segments.splice(i, 1);
        }
      }
      this.inkUsed = Math.max(0, this.inkUsed - refunded * cfg.eraserRefundRatio);
    }

    if (this.lastEraserIds.size > 500) this.lastEraserIds.clear();
  }

  clearEraserCache() {
    this.lastEraserIds.clear();
  }
}
