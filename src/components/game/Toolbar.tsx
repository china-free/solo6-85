import { Pencil, Eraser, RotateCcw, Pause, Play, ArrowLeft, Home } from 'lucide-react';
import { useGameStore } from '../../store';
import { useNavigate } from 'react-router-dom';

interface ToolbarProps {
  levelId: string;
}

export function Toolbar({ levelId }: ToolbarProps) {
  const tool = useGameStore((s) => s.tool);
  const setTool = useGameStore((s) => s.setTool);
  const isPaused = useGameStore((s) => s.isPaused);
  const togglePause = useGameStore((s) => s.togglePause);
  const resetLevel = useGameStore((s) => s.resetLevel);
  const status = useGameStore((s) => s.status);
  const navigate = useNavigate();

  const disabled = status !== 'playing' && status !== 'paused';

  return (
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 pointer-events-none">
      <div className="bg-white/90 backdrop-blur-md rounded-full shadow-xl border border-sky-200 px-3 py-2 pointer-events-auto">
        <div className="flex items-center gap-1 sm:gap-2">
          <button
            onClick={() => navigate('/')}
            className="p-2.5 sm:p-3 rounded-full text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-all active:scale-95"
            title="返回关卡选择"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <div className="w-px h-8 bg-slate-200 mx-1" />

          <ToolButton
            active={tool === 'pen'}
            onClick={() => setTool('pen')}
            title="画笔 (P)"
            disabled={disabled}
          >
            <Pencil className="w-5 h-5" />
          </ToolButton>

          <ToolButton
            active={tool === 'eraser'}
            onClick={() => setTool('eraser')}
            title="橡皮擦 (E)"
            disabled={disabled}
          >
            <Eraser className="w-5 h-5" />
          </ToolButton>

          <div className="w-px h-8 bg-slate-200 mx-1" />

          <button
            onClick={() => togglePause()}
            disabled={status !== 'playing' && status !== 'paused'}
            className={`p-2.5 sm:p-3 rounded-full transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed ${
              isPaused
                ? 'bg-emerald-500 text-white hover:bg-emerald-600 shadow-md'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
            title={isPaused ? '继续' : '暂停'}
          >
            {isPaused ? <Play className="w-5 h-5" /> : <Pause className="w-5 h-5" />}
          </button>

          <button
            onClick={() => resetLevel()}
            disabled={disabled}
            className="p-2.5 sm:p-3 rounded-full text-amber-600 hover:bg-amber-50 transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
            title="重置关卡 (R)"
          >
            <RotateCcw className="w-5 h-5" />
          </button>

          <button
            onClick={() => navigate('/')}
            className="p-2.5 sm:p-3 rounded-full text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-all active:scale-95"
            title="首页"
          >
            <Home className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}

interface ToolButtonProps {
  active: boolean;
  onClick: () => void;
  title: string;
  disabled?: boolean;
  children: React.ReactNode;
}

function ToolButton({ active, onClick, title, disabled, children }: ToolButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`p-2.5 sm:p-3 rounded-full transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed ${
        active
          ? 'bg-gradient-to-br from-sky-500 to-sky-600 text-white shadow-lg shadow-sky-500/30'
          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
      }`}
    >
      {children}
    </button>
  );
}
