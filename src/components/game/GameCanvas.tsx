import { useEffect, useRef, useState, useCallback } from 'react';
import type { LevelConfig, Vec2 } from '../../game/types';
import { PhysicsEngine } from '../../game/PhysicsEngine';
import { WaterSystem } from '../../game/WaterSystem';
import { DrawingSystem } from '../../game/DrawingSystem';
import { ContainerSystem } from '../../game/ContainerSystem';
import { useGameStore, computeStars } from '../../store';
import { useLevelStore } from '../../store';
import { getLevelById } from '../../levels';

interface GameCanvasProps {
  levelId: string;
}

export function GameCanvas({ levelId }: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<PhysicsEngine | null>(null);
  const waterRef = useRef<WaterSystem | null>(null);
  const drawingRef = useRef<DrawingSystem | null>(null);
  const containerSysRef = useRef<ContainerSystem | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);
  const elapsedRef = useRef<number>(0);
  const [canvasSize, setCanvasSize] = useState({ w: 1000, h: 600 });
  const [previewPoints, setPreviewPoints] = useState<Vec2[]>([]);
  const [, forceRerender] = useState(0);

  const startLevel = useGameStore((s) => s.startLevel);
  const setElapsedTime = useGameStore((s) => s.setElapsedTime);
  const setInkUsed = useGameStore((s) => s.setInkUsed);
  const setActiveParticleCount = useGameStore((s) => s.setActiveParticleCount);
  const updateContainerProgress = useGameStore((s) => s.updateContainerProgress);
  const setHoldProgress = useGameStore((s) => s.setHoldProgress);
  const isPaused = useGameStore((s) => s.isPaused);
  const status = useGameStore((s) => s.status);
  const tool = useGameStore((s) => s.tool);
  const completeWithResult = useGameStore((s) => s.completeWithResult);
  const fail = useGameStore((s) => s.fail);
  const completeLevelProgress = useLevelStore((s) => s.completeLevel);

  const initSystems = useCallback((level: LevelConfig) => {
    if (engineRef.current) {
      engineRef.current.destroy();
    }
    const engine = new PhysicsEngine(level);
    engine.buildLevel();
    engine.start();
    engineRef.current = engine;

    const water = new WaterSystem(engine, level);
    waterRef.current = water;

    const drawing = new DrawingSystem(engine, level.inkLimit);
    drawing.setTool(tool);
    drawingRef.current = drawing;

    const containerSys = new ContainerSystem(engine, level);
    containerSysRef.current = containerSys;

    elapsedRef.current = 0;
    lastTimeRef.current = performance.now();
  }, [tool]);

  useEffect(() => {
    const level = getLevelById(levelId);
    if (!level) {
      fail('关卡不存在');
      return;
    }
    startLevel(levelId);
    setCanvasSize({ w: level.worldWidth, h: level.worldHeight });
    initSystems(level);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (engineRef.current) engineRef.current.destroy();
    };
  }, [levelId, initSystems, startLevel, fail]);

  useEffect(() => {
    drawingRef.current?.setTool(tool);
  }, [tool]);

  useEffect(() => {
    const handleResize = () => {
      const container = containerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const level = getLevelById(levelId);
      if (!level) return;
      const aspect = level.worldWidth / level.worldHeight;
      let w = rect.width;
      let h = w / aspect;
      if (h > rect.height) {
        h = rect.height;
        w = h * aspect;
      }
      setCanvasSize({ w: Math.floor(w), h: Math.floor(h) });
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [levelId]);

  const screenToWorld = useCallback((sx: number, sy: number): Vec2 => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const level = getLevelById(levelId);
    if (!level) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = level.worldWidth / rect.width;
    const scaleY = level.worldHeight / rect.height;
    return {
      x: (sx - rect.left) * scaleX,
      y: (sy - rect.top) * scaleY,
    };
  }, [levelId]);

  const handlePointerDown = (e: React.PointerEvent) => {
    if (status !== 'playing') return;
    const pos = screenToWorld(e.clientX, e.clientY);
    drawingRef.current?.startStroke(pos.x, pos.y);
    const pts = drawingRef.current?.getCurrentPoints() ?? [];
    setPreviewPoints([...pts]);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (status !== 'playing') return;
    if (e.buttons !== 1 && e.pointerType === 'mouse') return;
    const pos = screenToWorld(e.clientX, e.clientY);
    drawingRef.current?.continueStroke(pos.x, pos.y);
    const pts = drawingRef.current?.getCurrentPoints() ?? [];
    setPreviewPoints([...pts]);
    setInkUsed(drawingRef.current?.getInkUsed() ?? 0);
    forceRerender((n) => n + 1);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (status !== 'playing') return;
    drawingRef.current?.endStroke();
    setPreviewPoints([]);
    setInkUsed(drawingRef.current?.getInkUsed() ?? 0);
    forceRerender((n) => n + 1);
  };

  const handlePointerLeave = () => {
    drawingRef.current?.endStroke();
    setPreviewPoints([]);
    setInkUsed(drawingRef.current?.getInkUsed() ?? 0);
  };

  useEffect(() => {
    const level = getLevelById(levelId);
    if (!level) return;

    const loop = (time: number) => {
      const canvas = canvasRef.current;
      if (!canvas) {
        rafRef.current = requestAnimationFrame(loop);
        return;
      }

      const dtMs = Math.min(50, time - lastTimeRef.current);
      lastTimeRef.current = time;
      const dt = dtMs / 1000;

      if (!isPaused && status === 'playing') {
        elapsedRef.current += dt;
        setElapsedTime(elapsedRef.current);

        if (level.timeLimit && elapsedRef.current > level.timeLimit) {
          fail('时间耗尽');
        }

        engineRef.current?.step(dtMs);
        waterRef.current?.update(dt);
        const activeIds = new Set(waterRef.current?.getActiveParticleIds() ?? []);
        containerSysRef.current?.update(dt, activeIds);

        const allProg = containerSysRef.current?.getAllProgress() ?? new Map();
        updateContainerProgress(allProg);
        const holdProg = containerSysRef.current?.getAllFilledHoldProgress() ?? 0;
        setHoldProgress(holdProg);

        setActiveParticleCount(waterRef.current?.getParticleCount() ?? 0);
        setInkUsed(drawingRef.current?.getInkUsed() ?? 0);

        if (containerSysRef.current?.isLevelComplete()) {
          const stars = computeStars(
            elapsedRef.current,
            drawingRef.current?.getInkUsed() ?? 0,
            level.inkLimit
          );
          completeLevelProgress(levelId, stars, elapsedRef.current, drawingRef.current?.getInkUsed() ?? 0);
          completeWithResult(stars);
        }
      } else {
        lastTimeRef.current = time;
      }

      render(canvas);
      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [levelId, isPaused, status, setElapsedTime, updateContainerProgress, setHoldProgress, setActiveParticleCount, setInkUsed, completeLevelProgress, completeWithResult, fail]);

  const resetGame = useCallback(() => {
    const level = getLevelById(levelId);
    if (!level) return;
    startLevel(levelId);
    initSystems(level);
  }, [levelId, initSystems, startLevel]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'r' || e.key === 'R') {
        resetGame();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [resetGame]);

  const render = (canvas: HTMLCanvasElement) => {
    const level = getLevelById(levelId);
    if (!level) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const logicalW = level.worldWidth;
    const logicalH = level.worldHeight;
    const dpr = window.devicePixelRatio || 1;
    if (canvas.width !== canvasSize.w * dpr || canvas.height !== canvasSize.h * dpr) {
      canvas.width = canvasSize.w * dpr;
      canvas.height = canvasSize.h * dpr;
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const scaleX = (canvasSize.w * dpr) / logicalW;
    const scaleY = (canvasSize.h * dpr) / logicalH;
    ctx.scale(scaleX, scaleY);

    const bgGrad = ctx.createLinearGradient(0, 0, 0, logicalH);
    bgGrad.addColorStop(0, '#f0f9ff');
    bgGrad.addColorStop(1, '#e0f2fe');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, logicalW, logicalH);

    drawGrid(ctx, logicalW, logicalH);
    drawObstacles(ctx);
    drawContainers(ctx);
    drawWaterParticles(ctx);
    drawSource(ctx);
    drawDrawnSegments(ctx);
    drawPreviewStroke(ctx);
    drawHoldIndicator(ctx);
  };

  const drawGrid = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
    ctx.strokeStyle = 'rgba(14, 165, 233, 0.06)';
    ctx.lineWidth = 1;
    const grid = 50;
    for (let x = 0; x <= w; x += grid) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = 0; y <= h; y += grid) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }
  };

  const drawObstacles = (ctx: CanvasRenderingContext2D) => {
    const level = getLevelById(levelId);
    if (!level) return;
    for (const obs of level.obstacles) {
      const color = obs.color || '#475569';
      ctx.fillStyle = color;
      ctx.strokeStyle = shadeColor(color, -20);
      ctx.lineWidth = 2;
      switch (obs.type) {
        case 'rect': {
          ctx.save();
          ctx.translate(obs.x, obs.y);
          ctx.rotate(obs.angle || 0);
          const w = obs.width || 100;
          const h = obs.height || 20;
          roundRect(ctx, -w / 2, -h / 2, w, h, 4);
          ctx.fill();
          ctx.stroke();
          ctx.restore();
          break;
        }
        case 'circle': {
          ctx.beginPath();
          ctx.arc(obs.x, obs.y, obs.radius || 20, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          break;
        }
        case 'polygon': {
          const verts = obs.vertices || [];
          if (verts.length > 0) {
            ctx.save();
            ctx.translate(obs.x, obs.y);
            ctx.rotate(obs.angle || 0);
            ctx.beginPath();
            ctx.moveTo(verts[0].x, verts[0].y);
            for (let i = 1; i < verts.length; i++) {
              ctx.lineTo(verts[i].x, verts[i].y);
            }
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            ctx.restore();
          }
          break;
        }
      }
    }
  };

  const drawContainers = (ctx: CanvasRenderingContext2D) => {
    const level = getLevelById(levelId);
    if (!level) return;
    const containerSys = containerSysRef.current;
    for (const c of level.containers) {
      const prog = containerSys?.getContainerProgress(c.id);
      const current = prog?.current ?? 0;
      const target = prog?.target ?? c.targetCount;
      const ratio = Math.min(1, current / target);

      const halfW = c.width / 2;
      const halfH = c.height / 2;
      const innerTop = c.y - halfH + c.wallThickness;
      const innerLeft = c.x - halfW + c.wallThickness;
      const innerRight = c.x + halfW - c.wallThickness;
      const innerBottom = c.y + halfH - c.wallThickness;
      const innerWidth = innerRight - innerLeft;
      const innerHeight = innerBottom - innerTop;
      const fillY = innerBottom - innerHeight * ratio;

      ctx.save();
      ctx.fillStyle = c.color + '18';
      ctx.fillRect(innerLeft, innerTop, innerWidth, innerHeight);

      if (ratio > 0) {
        const waterGrad = ctx.createLinearGradient(0, fillY, 0, innerBottom);
        waterGrad.addColorStop(0, '#38bdf8');
        waterGrad.addColorStop(1, '#0284c7');
        ctx.fillStyle = waterGrad;
        ctx.beginPath();
        ctx.moveTo(innerLeft, innerBottom);
        ctx.lineTo(innerLeft, fillY);
        const waveSegments = 8;
        const segW = innerWidth / waveSegments;
        const waveAmp = ratio > 0.95 ? 0 : 3;
        const t = performance.now() / 400;
        for (let i = 0; i <= waveSegments; i++) {
          const wx = innerLeft + segW * i;
          const wy = fillY + Math.sin(t + i * 0.8) * waveAmp;
          ctx.lineTo(wx, wy);
        }
        ctx.lineTo(innerRight, innerBottom);
        ctx.closePath();
        ctx.fill();

        ctx.strokeStyle = 'rgba(255,255,255,0.5)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        for (let i = 0; i <= waveSegments; i++) {
          const wx = innerLeft + segW * i;
          const wy = fillY + Math.sin(t + i * 0.8) * waveAmp;
          if (i === 0) ctx.moveTo(wx, wy);
          else ctx.lineTo(wx, wy);
        }
        ctx.stroke();
      }

      ctx.strokeStyle = c.color;
      ctx.lineWidth = c.wallThickness;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(c.x - halfW, c.y - halfH - c.wallThickness / 2);
      ctx.lineTo(c.x - halfW, c.y + halfH);
      ctx.lineTo(c.x + halfW, c.y + halfH);
      ctx.lineTo(c.x + halfW, c.y - halfH - c.wallThickness / 2);
      ctx.stroke();

      ctx.fillStyle = c.color;
      ctx.font = 'bold 14px "Noto Sans SC", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(
        `${current}/${target}`,
        c.x,
        c.y + halfH + 28
      );
      ctx.restore();
    }
  };

  const drawWaterParticles = (ctx: CanvasRenderingContext2D) => {
    const water = waterRef.current;
    if (!water) return;
    const positions = water.getParticlePositions();
    const radius = water.getParticleRadius();

    for (const [id, pos] of positions.entries()) {
      const grad = ctx.createRadialGradient(
        pos.x - radius * 0.3,
        pos.y - radius * 0.3,
        radius * 0.1,
        pos.x,
        pos.y,
        radius
      );
      grad.addColorStop(0, '#bae6fd');
      grad.addColorStop(0.6, '#38bdf8');
      grad.addColorStop(1, '#0284c7');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = 'rgba(255,255,255,0.6)';
      ctx.beginPath();
      ctx.arc(pos.x - radius * 0.35, pos.y - radius * 0.35, radius * 0.25, 0, Math.PI * 2);
      ctx.fill();
    }
  };

  const drawSource = (ctx: CanvasRenderingContext2D) => {
    const level = getLevelById(levelId);
    if (!level) return;
    const src = level.waterSource;

    ctx.save();
    const pipeGrad = ctx.createLinearGradient(src.x - 30, src.y - 40, src.x + 30, src.y + 20);
    pipeGrad.addColorStop(0, '#64748b');
    pipeGrad.addColorStop(1, '#334155');
    ctx.fillStyle = pipeGrad;
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 2;
    roundRect(ctx, src.x - 32, src.y - 42, 64, 48, 10);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#0ea5e9';
    ctx.beginPath();
    ctx.ellipse(src.x, src.y + 6, 18, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    const water = waterRef.current;
    if (water && status === 'playing' && !isPaused) {
      const t = performance.now() / 300;
      for (let i = 0; i < 3; i++) {
        const offset = ((t + i * 0.33) % 1);
        const alpha = (1 - offset) * 0.5;
        const yy = src.y + 8 + offset * 20;
        const rr = 4 + offset * 2;
        ctx.fillStyle = `rgba(14, 165, 233, ${alpha})`;
        ctx.beginPath();
        ctx.arc(src.x + (i - 1) * 6, yy, rr, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.restore();
  };

  const drawDrawnSegments = (ctx: CanvasRenderingContext2D) => {
    const drawing = drawingRef.current;
    if (!drawing) return;
    const segments = drawing.getSegments();

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (const seg of segments) {
      const pts = seg.points;
      if (pts.length < 2) continue;
      ctx.strokeStyle = 'rgba(31, 41, 55, 0.35)';
      ctx.lineWidth = 14;
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y + 2);
      for (let i = 1; i < pts.length; i++) {
        ctx.lineTo(pts[i].x, pts[i].y + 2);
      }
      ctx.stroke();

      ctx.strokeStyle = '#1f2937';
      ctx.lineWidth = 11;
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i++) {
        ctx.lineTo(pts[i].x, pts[i].y);
      }
      ctx.stroke();

      ctx.strokeStyle = 'rgba(255,255,255,0.18)';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y - 1.5);
      for (let i = 1; i < pts.length; i++) {
        ctx.lineTo(pts[i].x, pts[i].y - 1.5);
      }
      ctx.stroke();
    }
  };

  const drawPreviewStroke = (ctx: CanvasRenderingContext2D) => {
    const drawing = drawingRef.current;
    if (!drawing) return;
    const pts = previewPoints;
    if (pts.length < 1) return;

    const currentTool = drawing.getTool();
    if (currentTool === 'eraser') {
      if (pts.length > 0) {
        const last = pts[pts.length - 1];
        ctx.strokeStyle = 'rgba(239, 68, 68, 0.8)';
        ctx.fillStyle = 'rgba(239, 68, 68, 0.1)';
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 4]);
        ctx.beginPath();
        ctx.arc(last.x, last.y, 22, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.setLineDash([]);
      }
      return;
    }

    if (pts.length < 2) {
      ctx.fillStyle = '#1f2937';
      ctx.beginPath();
      ctx.arc(pts[0].x, pts[0].y, 5, 0, Math.PI * 2);
      ctx.fill();
      return;
    }
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#1f2937';
    ctx.lineWidth = 11;
    ctx.globalAlpha = 0.8;
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) {
      ctx.lineTo(pts[i].x, pts[i].y);
    }
    ctx.stroke();
    ctx.globalAlpha = 1;
  };

  const drawHoldIndicator = (ctx: CanvasRenderingContext2D) => {
    const level = getLevelById(levelId);
    if (!level) return;
    const holdProg = useGameStore.getState().holdProgress;
    if (holdProg <= 0) return;
    const cx = level.worldWidth / 2;
    const cy = 50;
    ctx.save();
    const w = 300;
    const h = 12;
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    roundRect(ctx, cx - w / 2, cy - h / 2, w, h, 6);
    ctx.fill();
    const grad = ctx.createLinearGradient(cx - w / 2, 0, cx + w / 2, 0);
    grad.addColorStop(0, '#10b981');
    grad.addColorStop(1, '#34d399');
    ctx.fillStyle = grad;
    roundRect(ctx, cx - w / 2, cy - h / 2, w * holdProg, h, 6);
    ctx.fill();
    ctx.strokeStyle = '#059669';
    ctx.lineWidth = 1.5;
    roundRect(ctx, cx - w / 2, cy - h / 2, w, h, 6);
    ctx.stroke();
    ctx.fillStyle = '#065f46';
    ctx.font = 'bold 13px "Noto Sans SC", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`保持中... ${(holdProg * 100).toFixed(0)}%`, cx, cy);
    ctx.restore();
  };

  return (
    <div
      ref={containerRef}
      className="w-full h-full flex items-center justify-center"
    >
      <canvas
        ref={canvasRef}
        style={{
          width: `${canvasSize.w}px`,
          height: `${canvasSize.h}px`,
          touchAction: 'none',
          cursor: tool === 'eraser' ? 'cell' : 'crosshair',
        }}
        className="rounded-2xl shadow-2xl border-4 border-sky-200 bg-white"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onPointerLeave={handlePointerLeave}
      />
    </div>
  );
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function shadeColor(color: string, percent: number): string {
  const hex = color.replace('#', '');
  const num = parseInt(hex, 16);
  const r = Math.max(0, Math.min(255, (num >> 16) + percent));
  const g = Math.max(0, Math.min(255, ((num >> 8) & 0x00ff) + percent));
  const b = Math.max(0, Math.min(255, (num & 0x0000ff) + percent));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}
