import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { ProjectsPage } from "@/pages/ProjectsPage";
import { ProjectDetailPage } from "@/pages/ProjectDetailPage";
import { ArtifactsPage } from "@/pages/ArtifactsPage";
import { InboxPage } from "@/pages/InboxPage";

function App() {
  return (
    <BrowserRouter>
      <AppLayout>
        <Routes>
          <Route path="/" element={<Navigate to="/projects" replace />} />
          <Route path="/projects" element={<ProjectsPage />} />
          <Route path="/projects/:projectId" element={<ProjectDetailPage />} />
          <Route path="/artifacts" element={<ArtifactsPage />} />
          <Route path="/inbox" element={<InboxPage />} />
        </Routes>
      </AppLayout>
    </BrowserRouter>
  );
}

export default App;
