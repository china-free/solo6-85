import { Star, Lock, Play } from 'lucide-react';
import type { LevelConfig } from '../../game/types';
import { useLevelStore } from '../../store';
import { useNavigate } from 'react-router-dom';

interface LevelCardProps {
  level: LevelConfig;
  index: number;
}

export function LevelCard({ level, index }: LevelCardProps) {
  const allProgress = useLevelStore((s) => s.progress);
  const progress = allProgress[level.id] || {
    levelId: level.id,
    unlocked: false,
    completed: false,
    stars: 0,
  };
  const navigate = useNavigate();
  const isLocked = !progress.unlocked;

  return (
    <button
      disabled={isLocked}
      onClick={() => navigate(`/game/${level.id}`)}
      className={`group relative aspect-[4/3] rounded-3xl overflow-hidden transition-all duration-300 ${
        isLocked
          ? 'bg-slate-100 cursor-not-allowed opacity-70'
          : 'bg-gradient-to-br from-sky-50 to-blue-100 hover:shadow-2xl hover:shadow-sky-500/20 hover:-translate-y-1 cursor-pointer active:scale-[0.97]'
      }`}
    >
      <div className="absolute inset-0 p-4">
        <LevelPreview level={level} locked={isLocked} />
      </div>

      <div className="absolute top-3 left-3 z-10">
        <div
          className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-lg shadow-md ${
            isLocked
              ? 'bg-slate-300 text-slate-500'
              : 'bg-gradient-to-br from-sky-500 to-blue-600 text-white'
          }`}
        >
          {index + 1}
        </div>
      </div>

      <div className="absolute top-3 right-3 z-10 flex gap-0.5">
        {[0, 1, 2].map((i) => (
          <Star
            key={i}
            className={`w-4 h-4 ${
              i < progress.stars
                ? 'fill-amber-400 text-amber-500 drop-shadow'
                : 'fill-slate-200/60 text-slate-300/60'
            }`}
          />
        ))}
      </div>

      {isLocked && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-slate-900/10 backdrop-blur-[1px]">
          <Lock className="w-10 h-10 text-slate-500 drop-shadow" />
        </div>
      )}

      {!isLocked && (
        <div className="absolute inset-0 z-10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-sky-900/20 backdrop-blur-[2px]">
          <div className="w-14 h-14 rounded-full bg-white/95 shadow-2xl flex items-center justify-center text-sky-600 scale-75 group-hover:scale-100 transition-transform">
            <Play className="w-6 h-6 ml-1" fill="currentColor" />
          </div>
        </div>
      )}

      <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-white/95 via-white/70 to-transparent z-10">
        <h3 className="font-display font-bold text-slate-800 text-lg leading-tight mb-0.5">
          {level.name}
        </h3>
        <p className="text-xs text-slate-500 line-clamp-1">
          {level.description}
        </p>
      </div>
    </button>
  );
}

function LevelPreview({ level, locked }: { level: LevelConfig; locked: boolean }) {
  const W = 400;
  const H = 300;
  const scaleX = W / level.worldWidth;
  const scaleY = H / level.worldHeight;
  const s = Math.min(scaleX, scaleY);
  const offsetX = (W - level.worldWidth * s) / 2;
  const offsetY = (H - level.worldHeight * s) / 2;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full h-full rounded-2xl"
      style={{ opacity: locked ? 0.3 : 1 }}
    >
      <defs>
        <linearGradient id="bg-g" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f0f9ff" />
          <stop offset="100%" stopColor="#e0f2fe" />
        </linearGradient>
      </defs>
      <rect x="0" y="0" width={W} height={H} fill="url(#bg-g)" rx="16" />

      <g transform={`translate(${offsetX}, ${offsetY}) scale(${s})`}>
        {level.obstacles.map((obs, i) => {
          const color = obs.color || '#475569';
          if (obs.type === 'rect') {
            const w = obs.width || 100;
            const h = obs.height || 20;
            return (
              <rect
                key={i}
                x={obs.x - w / 2}
                y={obs.y - h / 2}
                width={w}
                height={h}
                fill={color}
                transform={`rotate(${((obs.angle || 0) * 180) / Math.PI} ${obs.x} ${obs.y})`}
                rx="3"
              />
            );
          }
          if (obs.type === 'circle') {
            return (
              <circle
                key={i}
                cx={obs.x}
                cy={obs.y}
                r={obs.radius || 20}
                fill={color}
              />
            );
          }
          if (obs.type === 'polygon' && obs.vertices) {
            const pts = obs.vertices
              .map((v) => `${obs.x + v.x},${obs.y + v.y}`)
              .join(' ');
            return <polygon key={i} points={pts} fill={color} />;
          }
          return null;
        })}

        {level.containers.map((c, i) => {
          const halfW = c.width / 2;
          const halfH = c.height / 2;
          return (
            <g key={i}>
              <rect
                x={c.x - halfW + c.wallThickness}
                y={c.y - halfH}
                width={c.width - c.wallThickness * 2}
                height={c.height - c.wallThickness}
                fill={c.color + '22'}
                rx="2"
              />
              <path
                d={`M ${c.x - halfW} ${c.y - halfH - c.wallThickness / 2}
                    L ${c.x - halfW} ${c.y + halfH}
                    L ${c.x + halfW} ${c.y + halfH}
                    L ${c.x + halfW} ${c.y - halfH - c.wallThickness / 2}`}
                fill="none"
                stroke={c.color}
                strokeWidth={c.wallThickness}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </g>
          );
        })}

        <g>
          <rect
            x={level.waterSource.x - 20}
            y={level.waterSource.y - 28}
            width="40"
            height="32"
            fill="#475569"
            rx="6"
          />
          <ellipse
            cx={level.waterSource.x}
            cy={level.waterSource.y + 5}
            rx="12"
            ry="4"
            fill="#0ea5e9"
          />
        </g>
      </g>
    </svg>
  );
}
