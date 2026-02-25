import { Routes, Route } from 'react-router-dom';
import { HomePage } from './pages/HomePage';
import { SkillDetailPage } from './pages/SkillDetailPage';
import { AuthCallback } from './pages/AuthCallback';
import { PublishSkillPage } from './pages/PublishSkillPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ProtectedRoute } from './components/ProtectedRoute';
import './App.css';

function App() {
  return (
    <ErrorBoundary>
      <Routes>
        <Route path="/" element={<HomePage />} />

        {/* Protected Routes */}
        <Route element={<ProtectedRoute />}>
          <Route path="/publish" element={<PublishSkillPage />} />
          {/* We can add /my-packages here later */}
        </Route>

        <Route path="/skill/:packageId" element={<SkillDetailPage />} />
        <Route path="/auth/success" element={<AuthCallback />} />
        <Route path="/auth/error" element={<AuthCallback />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </ErrorBoundary>
  );
}

export default App;
