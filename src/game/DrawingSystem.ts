import type { Vec2, DrawnSegment, ToolType } from './types';
import { PhysicsEngine } from './PhysicsEngine';

const MIN_DISTANCE = 6;
const MIN_SEGMENT_LENGTH = 20;

export class DrawingSystem {
  private engine: PhysicsEngine;
  private isDrawing: boolean;
  private currentPoints: Vec2[];
  private segments: DrawnSegment[];
  private inkUsed: number;
  private inkLimit: number;
  private tool: ToolType;
  private lastEraserIds: Set<number>;

  constructor(engine: PhysicsEngine, inkLimit: number) {
    this.engine = engine;
    this.inkLimit = inkLimit;
    this.isDrawing = false;
    this.currentPoints = [];
    this.segments = [];
    this.inkUsed = 0;
    this.tool = 'pen';
    this.lastEraserIds = new Set();
  }

  reset() {
    for (const seg of this.segments) {
      this.engine.removeDrawnBodies(seg.bodyIds);
    }
    this.segments = [];
    this.currentPoints = [];
    this.inkUsed = 0;
    this.isDrawing = false;
    this.lastEraserIds.clear();
  }

  setTool(tool: ToolType) {
    this.tool = tool;
    if (this.isDrawing) {
      this.cancelCurrentStroke();
    }
  }

  getTool(): ToolType {
    return this.tool;
  }

  setInkLimit(limit: number) {
    this.inkLimit = limit;
  }

  getInkUsed(): number {
    return this.inkUsed;
  }

  getInkLimit(): number {
    return this.inkLimit;
  }

  getInkRemaining(): number {
    return Math.max(0, this.inkLimit - this.inkUsed);
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
    const last = this.currentPoints[this.currentPoints.length - 1];
    const dx = x - last.x;
    const dy = y - last.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist >= MIN_DISTANCE) {
      if (this.inkUsed + dist > this.inkLimit) {
        const remaining = this.inkLimit - this.inkUsed;
        if (remaining > MIN_SEGMENT_LENGTH) {
          const ratio = remaining / dist;
          const newX = last.x + dx * ratio;
          const newY = last.y + dy * ratio;
          this.currentPoints.push({ x: newX, y: newY });
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
      const segment: DrawnSegment = {
        id: `seg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        points,
        bodyIds,
        length,
      };
      this.segments.push(segment);
    }
    this.currentPoints = [];
  }

  private eraseAt(x: number, y: number) {
    const hitIds = this.engine.findDrawnBodiesAtPoint(x, y, 22);
    if (hitIds.length === 0) return;
    const toRemoveSegs: string[] = [];
    const allBodyIdsToRemove = new Set<number>();

    for (const id of hitIds) {
      if (this.lastEraserIds.has(id)) continue;
      this.lastEraserIds.add(id);
      for (let i = 0; i < this.segments.length; i++) {
        const seg = this.segments[i];
        if (seg.bodyIds.includes(id)) {
          toRemoveSegs.push(seg.id);
          for (const bid of seg.bodyIds) {
            allBodyIdsToRemove.add(bid);
          }
          break;
        }
      }
    }

    if (toRemoveSegs.length > 0) {
      const bodyArr = Array.from(allBodyIdsToRemove);
      this.engine.removeDrawnBodies(bodyArr);
      this.segments = this.segments.filter((s) => !toRemoveSegs.includes(s.id));
      let refunded = 0;
      for (const sid of toRemoveSegs) {
        const found = this.segments.find((s) => s.id === sid);
      }
      for (let i = this.segments.length - 1; i >= 0; i--) {
        if (toRemoveSegs.includes(this.segments[i].id)) {
          refunded += this.segments[i].length;
          this.segments.splice(i, 1);
        }
      }
      this.inkUsed = Math.max(0, this.inkUsed - refunded * 0.7);
    }

    if (this.lastEraserIds.size > 500) {
      this.lastEraserIds.clear();
    }
  }

  clearEraserCache() {
    this.lastEraserIds.clear();
  }
}
