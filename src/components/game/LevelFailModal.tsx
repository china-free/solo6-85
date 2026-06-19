import { AlertCircle, RotateCcw, Home } from 'lucide-react';
import { useGameStore } from '../../store';
import { useNavigate } from 'react-router-dom';

export function LevelFailModal() {
  const status = useGameStore((s) => s.status);
  const failReason = useGameStore((s) => s.failReason);
  const resetLevel = useGameStore((s) => s.resetLevel);
  const navigate = useNavigate();

  if (status !== 'failed') return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-3xl shadow-2xl p-8 w-[92%] max-w-md mx-4 animate-shake border-4 border-red-100">
        <div className="text-center">
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center">
            <AlertCircle className="w-12 h-12 text-red-500" />
          </div>
          <h2 className="text-2xl font-display font-bold text-red-600 mb-2">
            挑战失败
          </h2>
          <p className="text-slate-500 mb-8">
            {failReason || '再接再厉，换个思路试试吧！'}
          </p>

          <div className="flex flex-col gap-3">
            <button
              onClick={() => resetLevel()}
              className="w-full py-3.5 px-6 bg-gradient-to-r from-red-500 to-rose-500 text-white rounded-2xl font-bold shadow-lg shadow-red-500/30 hover:shadow-xl transition-all active:scale-[0.98] flex items-center justify-center gap-2"
            >
              <RotateCcw className="w-5 h-5" /> 重新挑战
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
