import { useEffect, useState } from "react";
import { FolderOpen, Paperclip } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { invoke } from "@tauri-apps/api/core";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ProjectCard, ProjectData } from "@/components/project/ProjectCard";
import { PageContainer } from "@/components/layout/PageContainer";
import { cn } from "@/lib/utils";

// CountBadge component matching ProjectsPage style
function CountBadge({
  count,
  variant = "default",
  className,
}: {
  count: number;
  variant?: "default" | "muted";
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-full px-2 py-0.5 text-xs font-medium",
        variant === "default"
          ? "bg-primary/10 text-primary"
          : "bg-muted/50 text-muted-foreground",
        className,
      )}
    >
      {count}
    </span>
  );
}

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
  tags?: string[];
  last_activity?: {
    sender: string;
    date: string;
  };
  participants?: string[];
}

export function ArtifactsPage() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<ProjectData[]>([]);
  const [error, setError] = useState<string | null>(null);

  const fetchProjects = async () => {
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
        tags: p.tags,
        lastActivity: p.last_activity,
        participants: p.participants,
      }));
      setProjects(mapped);
    } catch (e: any) {
      console.error("Failed to fetch projects:", e);
      setError(e.toString());
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const projectsWithArtifacts = projects.filter((p) => p.stats.attachments > 0);
  const totalArtifacts = projectsWithArtifacts.reduce(
    (sum, p) => sum + p.stats.attachments,
    0,
  );

  const handleProjectClick = (id: string) => {
    navigate(`/projects/${id}`);
  };

  return (
    <PageContainer className="p-6 bg-muted/30">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
        <div className="space-y-0.5">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground leading-tight">
            Artifacts
          </h1>
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground/55 leading-tight">
            <span>projects</span>
            <CountBadge
              count={projectsWithArtifacts.length}
              variant="muted"
              className="text-[10px]"
            />
            <span className="h-1 w-1 rounded-full bg-muted-foreground/30" />
            <span>artifacts</span>
            <CountBadge
              count={totalArtifacts}
              variant="muted"
              className="text-[10px]"
            />
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate("/projects")}
        >
          <FolderOpen className="mr-2 h-4 w-4" />
          View Projects
        </Button>
      </div>

      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive mb-6">
          Failed to load projects: {error}
        </div>
      )}

      {/* Content */}
      <ScrollArea className="flex-1 -mx-6 px-6">
        <div className="space-y-10 pb-10">
          {projectsWithArtifacts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="h-12 w-12 rounded-xl bg-surface-100 dark:bg-surface-100/10 flex items-center justify-center mb-4">
                <Paperclip className="h-6 w-6 text-muted-foreground/40" />
              </div>
              <h3 className="text-sm font-medium text-foreground/80">
                No artifacts yet
              </h3>
              <p className="text-xs text-muted-foreground/60 mt-1 max-w-xs">
                Open a project to ingest attachments and build your artifact
                library.
              </p>
              <Button
                size="sm"
                className="mt-4"
                onClick={() => navigate("/projects")}
              >
                <FolderOpen className="h-4 w-4 mr-1.5" />
                View Projects
              </Button>
            </div>
          ) : (
            <section>
              <h2 className="text-sm font-semibold text-foreground/75 tracking-wide mb-4">
                Projects with Artifacts
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 auto-rows-max gap-3">
                {projectsWithArtifacts.map((p) => (
                  <div key={p.id} className="w-full">
                    <ProjectCard
                      project={p}
                      onClick={handleProjectClick}
                      onUpdate={fetchProjects}
                      viewMode="grid"
                    />
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </ScrollArea>
    </PageContainer>
  );
}
