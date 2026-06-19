import { Timer, Droplets, PenTool } from 'lucide-react';
import { useGameStore } from '../../store';
import { getLevelById } from '../../levels';

interface HUDProps {
  levelId: string;
}

export function HUD({ levelId }: HUDProps) {
  const level = getLevelById(levelId);
  const elapsedTime = useGameStore((s) => s.elapsedTime);
  const containerProgress = useGameStore((s) => s.containerProgress);
  const inkUsed = useGameStore((s) => s.inkUsed);
  const activeParticleCount = useGameStore((s) => s.activeParticleCount);

  if (!level) return null;

  const minutes = Math.floor(elapsedTime / 60);
  const seconds = Math.floor(elapsedTime % 60);
  const timeStr = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  const inkPercent = Math.min(100, (inkUsed / level.inkLimit) * 100);
  const inkRemaining = Math.max(0, level.inkLimit - inkUsed);

  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 w-[95%] max-w-4xl pointer-events-none">
      <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-lg border border-sky-200 p-4 pointer-events-auto">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold text-slate-800 font-display">
              {level.name}
            </span>
            <span className="text-xs text-slate-500 hidden sm:inline">
              {level.description}
            </span>
          </div>

          <div className="flex items-center gap-5 flex-wrap">
            <div className="flex items-center gap-2">
              <Timer className="w-4 h-4 text-slate-600" />
              <span className="font-mono text-slate-700 font-medium">{timeStr}</span>
            </div>

            <div className="flex items-center gap-2">
              <Droplets className="w-4 h-4 text-sky-500" />
              <span className="text-sm text-slate-700">
                <span className="font-mono font-bold">{activeParticleCount}</span>
                <span className="text-slate-400"> / {level.waterSource.maxParticles}</span>
              </span>
            </div>

            <div className="flex items-center gap-2 min-w-[180px]">
              <PenTool className="w-4 h-4 text-slate-700 flex-shrink-0" />
              <div className="flex-1">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-slate-600">墨水</span>
                  <span className="font-mono font-medium text-slate-700">
                    {Math.round(inkRemaining)}
                  </span>
                </div>
                <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 rounded-full ${
                      inkPercent > 90
                        ? 'bg-gradient-to-r from-red-400 to-red-500'
                        : inkPercent > 70
                        ? 'bg-gradient-to-r from-amber-400 to-amber-500'
                        : 'bg-gradient-to-r from-slate-700 to-slate-900'
                    }`}
                    style={{ width: `${100 - inkPercent}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {level.containers.length > 0 && (
          <div className="mt-4 pt-3 border-t border-slate-200/70 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {level.containers.map((c) => {
              const prog = containerProgress[c.id];
              const current = prog?.current ?? 0;
              const target = prog?.target ?? c.targetCount;
              const ratio = Math.min(1, current / target);
              const holdRatio = Math.min(1, (prog?.holdTimer ?? 0) / level.holdTime);
              const isFilled = prog?.filled ?? false;
              return (
                <div key={c.id} className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: c.color }}
                      />
                      <span className="text-xs font-medium text-slate-700">
                        容器
                      </span>
                    </div>
                    <span className="text-xs font-mono font-bold text-slate-800">
                      {current}/{target}
                      <span className="text-slate-400 ml-1">
                        ({(ratio * 100).toFixed(0)}%)
                      </span>
                    </span>
                  </div>
                  <div className="relative h-3 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className="h-full transition-all duration-300 rounded-full"
                      style={{
                        width: `${ratio * 100}%`,
                        backgroundColor: c.color,
                        opacity: 0.9,
                      }}
                    />
                    {isFilled && holdRatio > 0 && (
                      <div
                        className="absolute inset-y-0 left-0 bg-white/50 rounded-full transition-all"
                        style={{ width: `${holdRatio * 100}%` }}
                      />
                    )}
                  </div>
                  {isFilled && (
                    <div className="text-[10px] text-emerald-600 font-medium">
                      ✓ 达标中，保持 {((1 - holdRatio) * level.holdTime).toFixed(1)}s
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
