import { LevelCard } from './LevelCard';
import { levels } from '../../levels';

export function LevelGrid() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 w-full max-w-5xl mx-auto">
      {levels.map((level, idx) => (
        <LevelCard key={level.id} level={level} index={idx} />
      ))}
    </div>
  );
}
