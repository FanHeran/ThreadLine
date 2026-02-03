import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Calendar, Files, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { TimelineView, TimelineEvent } from "@/components/project/TimelineView";
import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";

interface ProjectDetails {
  id: number;
  title: string;
  last_updated: string;
}

interface Artifact {
  id: number;
  filename: string;
  file_type: string;
  file_size: number;
  created_at: string;
}

export function ProjectDetailPage() {
  const navigate = useNavigate();
  const { projectId } = useParams();

  const [project, setProject] = useState<ProjectDetails | null>(null);
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [artifacts, setArtifacts] = useState<Artifact[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!projectId) return;

    const id = parseInt(projectId);

    async function fetchData() {
      try {
        setError(null);
        console.log("Fetching data for project:", id);

        // 1. Fetch Project Details
        const proj = await invoke<ProjectDetails>("get_project", { id });
        setProject(proj);

        // 2. Fetch Timeline
        const timeline = await invoke<TimelineEvent[]>("get_project_timeline", {
          id,
        });
        setEvents(timeline);

        // 3. Fetch Artifacts
        console.log("Fetching artifacts...");
        // Notice: params are camelCase for Tauri 2
        const arts = await invoke<Artifact[]>("get_project_artifacts", {
          projectId: id,
        });
        console.log("Artifacts fetched:", arts);
        setArtifacts(arts);
      } catch (e: any) {
        console.error("Failed to fetch project details:", e);
        setError(e.toString());
      }
    }
    fetchData();
  }, [projectId]);

  if (error) {
    return (
      <div className="p-6 flex flex-col items-center justify-center h-full text-red-500">
        <h2 className="text-xl font-bold mb-2">Error Loading Project</h2>
        <p>{error}</p>
        <Button onClick={() => navigate(-1)} className="mt-4">
          Go Back
        </Button>
      </div>
    );
  }

  if (!project) {
    return <div className="p-6">Loading...</div>;
  }

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="flex items-center gap-4 p-4 border-b bg-card">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-xl font-semibold">{project.title}</h1>
          <p className="text-xs text-muted-foreground">
            Last updated {project.last_updated}
          </p>
        </div>
        <div className="ml-auto flex gap-2">
          <Button variant="outline" size="sm">
            <Search className="h-4 w-4 mr-2" />
            Search Project
          </Button>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-hidden flex flex-col min-h-0">
        <Tabs defaultValue="artifacts" className="flex-1 flex flex-col min-h-0">
          <div className="px-4 pt-2 border-b">
            <TabsList>
              <TabsTrigger value="timeline" className="flex gap-2">
                <Calendar className="h-4 w-4" />
                Timeline
              </TabsTrigger>
              <TabsTrigger value="artifacts" className="flex gap-2">
                <Files className="h-4 w-4" />
                Artifacts Library ({artifacts.length})
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent
            value="timeline"
            className="flex-1 overflow-auto p-6 min-h-0"
          >
            <div className="max-w-3xl mx-auto">
              <TimelineView events={events} />
            </div>
          </TabsContent>

          <TabsContent
            value="artifacts"
            className="flex-1 overflow-auto p-6 min-h-0"
          >
            {artifacts.length === 0 ? (
              <div className="text-center text-muted-foreground mt-10">
                No artifacts found in project #{projectId}.
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {artifacts.map((a) => (
                  <div
                    key={a.id}
                    className="border bg-card p-4 rounded-md flex flex-col items-center hover:shadow-md transition-all cursor-pointer"
                  >
                    <div className="text-3xl mb-3 text-blue-500">
                      {a.file_type === "pdf"
                        ? "📄"
                        : a.file_type === "docx"
                          ? "📝"
                          : "📁"}
                    </div>
                    <div
                      className="font-medium truncate w-full text-center text-sm"
                      title={a.filename}
                    >
                      {a.filename}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {(a.file_size / 1024).toFixed(0)} KB
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
