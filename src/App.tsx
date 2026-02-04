import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { ProjectsPage } from "@/pages/ProjectsPage";
import { ProjectDetailPage } from "@/pages/ProjectDetailPage";
import { ArtifactsPage } from "@/pages/ArtifactsPage";
import { InboxPage } from "@/pages/InboxPage";
import { SettingsPage } from "@/pages/SettingsPage";
import { Toaster } from "sonner";
import { SyncProvider } from "@/contexts/SyncContext";

function App() {
  return (
    <SyncProvider>
      <BrowserRouter>
        <AppLayout>
          <Routes>
            <Route path="/" element={<Navigate to="/projects" replace />} />
            <Route path="/projects" element={<ProjectsPage />} />
            <Route
              path="/projects/:projectId"
              element={<ProjectDetailPage />}
            />
            <Route path="/artifacts" element={<ArtifactsPage />} />
            <Route path="/inbox" element={<InboxPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Routes>
        </AppLayout>
        <Toaster position="top-right" richColors />
      </BrowserRouter>
    </SyncProvider>
  );
}

export default App;
