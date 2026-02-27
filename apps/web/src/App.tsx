import { Routes, Route } from "react-router-dom";
import { lazy, Suspense } from "react";
import { HomePage } from "./pages/HomePage";
import { SkillDetailPage } from "./pages/SkillDetailPage";
import { AuthCallback } from "./pages/AuthCallback";
import { PublishSkillPage } from "./pages/PublishSkillPage";
import { NotFoundPage } from "./pages/NotFoundPage";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { ProtectedRoute } from "./components/ProtectedRoute";
import "./App.css";

const MyPackagesPage = lazy(() =>
  import("./pages/MyPackagesPage").then((m) => ({ default: m.MyPackagesPage })),
);
const SettingsPage = lazy(() =>
  import("./pages/SettingsPage").then((m) => ({ default: m.SettingsPage })),
);
const EditPackagePage = lazy(() =>
  import("./pages/EditPackagePage").then((m) => ({
    default: m.EditPackagePage,
  })),
);
const AdminPage = lazy(() =>
  import("./pages/AdminPage").then((m) => ({ default: m.AdminPage })),
);
const TermsPage = lazy(() =>
  import("./pages/TermsPage").then((m) => ({ default: m.TermsPage })),
);
const PrivacyPage = lazy(() =>
  import("./pages/PrivacyPage").then((m) => ({ default: m.PrivacyPage })),
);

function App() {
  return (
    <ErrorBoundary>
      <Suspense fallback={null}>
        <Routes>
          <Route path="/" element={<HomePage />} />

          {/* Protected Routes */}
          <Route element={<ProtectedRoute />}>
            <Route path="/publish" element={<PublishSkillPage />} />
            <Route path="/my-packages" element={<MyPackagesPage />} />
            <Route
              path="/my-packages/:id/edit"
              element={<EditPackagePage />}
            />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/admin" element={<AdminPage />} />
          </Route>

          <Route path="/skill/:packageId" element={<SkillDetailPage />} />
          <Route path="/auth/success" element={<AuthCallback />} />
          <Route path="/auth/error" element={<AuthCallback />} />
          <Route path="/terms" element={<TermsPage />} />
          <Route path="/privacy" element={<PrivacyPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
    </ErrorBoundary>
  );
}

export default App;
