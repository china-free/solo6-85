import { Star, RotateCcw, ArrowRight, Home } from 'lucide-react';
import { useGameStore, useLevelStore } from '../../store';
import { getLevelById, getNextLevelId, getLevelIndex } from '../../levels';
import { useNavigate } from 'react-router-dom';

export function LevelCompleteModal() {
  const status = useGameStore((s) => s.status);
  const resultStars = useGameStore((s) => s.resultStars);
  const elapsedTime = useGameStore((s) => s.elapsedTime);
  const inkUsed = useGameStore((s) => s.inkUsed);
  const currentLevelId = useGameStore((s) => s.currentLevelId);
  const resetLevel = useGameStore((s) => s.resetLevel);
  const navigate = useNavigate();

  if (status !== 'complete' || !currentLevelId) return null;

  const level = getLevelById(currentLevelId);
  const nextLevelId = getNextLevelId(currentLevelId);
  const levelIdx = getLevelIndex(currentLevelId);

  const minutes = Math.floor(elapsedTime / 60);
  const seconds = Math.floor(elapsedTime % 60);
  const timeStr = `${minutes}分${seconds}秒`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-3xl shadow-2xl p-8 w-[92%] max-w-md mx-4 animate-scaleIn border-4 border-emerald-100">
        <div className="text-center">
          <div className="text-5xl mb-3 animate-bounce">🎉</div>
          <h2 className="text-3xl font-display font-bold text-emerald-600 mb-1">
            过关！
          </h2>
          <p className="text-slate-500 mb-6">
            第 {levelIdx + 1} 关 · {level?.name}
          </p>

          <div className="flex justify-center gap-3 mb-8">
            {[0, 1, 2].map((i) => (
              <Star
                key={i}
                className={`w-14 h-14 transition-all ${
                  i < resultStars
                    ? 'fill-amber-400 text-amber-500 drop-shadow-lg animate-starPop'
                    : 'fill-slate-200 text-slate-300'
                }`}
                style={{ animationDelay: `${i * 0.15}s` }}
              />
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3 mb-8">
            <div className="bg-sky-50 rounded-2xl p-4">
              <div className="text-xs text-slate-500 mb-1">用时</div>
              <div className="text-xl font-bold text-sky-600 font-mono">
                {timeStr}
              </div>
            </div>
            <div className="bg-slate-100 rounded-2xl p-4">
              <div className="text-xs text-slate-500 mb-1">墨水用量</div>
              <div className="text-xl font-bold text-slate-700 font-mono">
                {Math.round(inkUsed)}
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            {nextLevelId && (
              <button
                onClick={() => navigate(`/game/${nextLevelId}`)}
                className="w-full py-3.5 px-6 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-2xl font-bold shadow-lg shadow-emerald-500/30 hover:shadow-xl hover:shadow-emerald-500/40 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
              >
                下一关 <ArrowRight className="w-5 h-5" />
              </button>
            )}
            <button
              onClick={() => resetLevel()}
              className="w-full py-3 px-6 bg-slate-100 text-slate-700 rounded-2xl font-semibold hover:bg-slate-200 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
            >
              <RotateCcw className="w-4 h-4" /> 再玩一次
            </button>
            <button
              onClick={() => navigate('/')}
              className="w-full py-3 px-6 text-slate-500 rounded-2xl font-medium hover:bg-slate-50 transition-all flex items-center justify-center gap-2"
            >
              <Home className="w-4 h-4" /> 返回关卡选择
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
