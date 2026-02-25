import { Routes, Route } from 'react-router-dom';
import { HomePage } from './pages/HomePage';
import { SkillDetailPage } from './pages/SkillDetailPage';
import { AuthCallback } from './pages/AuthCallback';
import './App.css';

function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/skill/:packageId" element={<SkillDetailPage />} />
      <Route path="/auth/success" element={<AuthCallback />} />
      <Route path="/auth/error" element={<AuthCallback />} />
    </Routes>
  );
}

export default App;
