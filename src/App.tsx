import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LevelSelect from '@/pages/LevelSelect';
import GamePage from '@/pages/GamePage';

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LevelSelect />} />
        <Route path="/game/:levelId" element={<GamePage />} />
      </Routes>
    </Router>
  );
}
