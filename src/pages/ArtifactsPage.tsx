import React, { useEffect, useState } from "react";
import { FolderOpen } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { invoke } from "@tauri-apps/api/core";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ProjectCard, ProjectData } from "@/components/project/ProjectCard";

interface BackendProject {
  id: number;
  title: string;
  description?: string;
  status: string;
  is_pinned: boolean;
  last_updated: string;
  stats: {
    emails: number;
    attachments: number;
  };
}

export function ArtifactsPage() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<ProjectData[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchProjects() {
      try {
        setError(null);
        const data = await invoke<BackendProject[]>("list_projects");
        const mapped: ProjectData[] = data.map((p) => ({
          id: p.id.toString(),
          title: p.title,
          description: p.description,
          status: p.is_pinned ? "pinned" : (p.status as ProjectData["status"]),
          lastUpdated: p.last_updated,
          stats: p.stats,
        }));
        setProjects(mapped);
      } catch (e: any) {
        console.error("Failed to fetch projects:", e);
        setError(e.toString());
      }
    }
    fetchProjects();
  }, []);

  const projectsWithArtifacts = projects.filter(
    (p) => p.stats.attachments > 0,
  );

  const handleProjectClick = (id: string) => {
    navigate(`/projects/${id}`);
  };

  return (
    <div className="h-full flex flex-col p-6 space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Artifacts</h1>
          <p className="text-muted-foreground mt-1">
            Browse attachments by project and jump into their libraries.
          </p>
        </div>
        <Button variant="outline" onClick={() => navigate("/projects")}>
          <FolderOpen className="mr-2 h-4 w-4" />
          View Projects
        </Button>
      </div>

      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          Failed to load projects: {error}
        </div>
      )}

      <ScrollArea className="flex-1 -mx-6 px-6">
        <div className="space-y-6 pb-10">
          {projectsWithArtifacts.length === 0 ? (
            <div className="text-sm text-muted-foreground">
              No artifacts found yet. Open a project to ingest attachments.
            </div>
          ) : (
            <section>
              <h2 className="text-lg font-semibold mb-4">
                Projects with artifacts
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {projectsWithArtifacts.map((p) => (
                  <ProjectCard
                    key={p.id}
                    project={p}
                    onClick={handleProjectClick}
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
