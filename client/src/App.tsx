import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import LandingPage from './components/LandingPage';
import RoomPage from './components/RoomPage';
import { cleanupOldSubtitles } from './utils/db';

export default function App() {
  useEffect(() => {
    // Drop IndexedDB subtitle entries older than 24h on every app load.
    cleanupOldSubtitles().catch(() => {});
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/room/:code" element={<RoomPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
