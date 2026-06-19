import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { GameCanvas } from '../components/game/GameCanvas';
import { HUD } from '../components/game/HUD';
import { Toolbar } from '../components/game/Toolbar';
import { LevelCompleteModal } from '../components/game/LevelCompleteModal';
import { LevelFailModal } from '../components/game/LevelFailModal';
import { useGameStore, useLevelStore } from '../store';
import { getLevelById } from '../levels';

export default function GamePage() {
  const { levelId } = useParams<{ levelId: string }>();
  const navigate = useNavigate();
  const initProgress = useLevelStore((s) => s.initProgress);

  useEffect(() => {
    initProgress();
    if (!levelId || !getLevelById(levelId)) {
      navigate('/', { replace: true });
    }
  }, [levelId, navigate, initProgress]);

  if (!levelId || !getLevelById(levelId)) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-slate-100 via-sky-50 to-blue-100 overflow-hidden">
      <div className="absolute inset-0 opacity-[0.025]" style={{
        backgroundImage: 'radial-gradient(circle at 1px 1px, #0ea5e9 1px, transparent 0)',
        backgroundSize: '28px 28px',
      }} />

      <div className="relative w-full h-full flex flex-col">
        <div className="flex-1 flex flex-col relative p-4 sm:p-6">
          <HUD levelId={levelId} />

          <div className="flex-1 flex items-center justify-center pt-28 pb-28">
            <GameCanvas levelId={levelId} />
          </div>

          <Toolbar levelId={levelId} />
        </div>
      </div>

      <LevelCompleteModal />
      <LevelFailModal />
    </div>
  );
}
