import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Calendar, Files, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { TimelineView, TimelineEvent } from "@/components/project/TimelineView";
import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { PageContainer } from "@/components/layout/PageContainer";
import { ScrollArea } from "@/components/ui/scroll-area";
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
      <PageContainer className="p-6 bg-muted/30">
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="h-12 w-12 rounded-xl bg-destructive/10 flex items-center justify-center mb-4">
            <ArrowLeft className="h-6 w-6 text-destructive/60" />
          </div>
          <h3 className="text-sm font-medium text-foreground/80">
            Error Loading Project
          </h3>
          <p className="text-xs text-muted-foreground/60 mt-1 max-w-xs">
            {error}
          </p>
          <Button size="sm" className="mt-4" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4 mr-1.5" />
            Go Back
          </Button>
        </div>
      </PageContainer>
    );
  }

  if (!project) {
    return (
      <PageContainer className="p-6 bg-muted/30">
        <div className="text-sm text-muted-foreground/80">Loading...</div>
      </PageContainer>
    );
  }

  return (
    <PageContainer className="p-6 bg-muted/30">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="h-8 w-8"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="space-y-0.5">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground leading-tight">
              {project.title}
            </h1>
            <div className="flex items-center gap-2 text-[11px] text-muted-foreground/55 leading-tight">
              <span>last updated {project.last_updated}</span>
              <span className="h-1 w-1 rounded-full bg-muted-foreground/30" />
              <span>events</span>
              <CountBadge
                count={events.length}
                variant="muted"
                className="text-[10px]"
              />
              <span className="h-1 w-1 rounded-full bg-muted-foreground/30" />
              <span>artifacts</span>
              <CountBadge
                count={artifacts.length}
                variant="muted"
                className="text-[10px]"
              />
            </div>
          </div>
        </div>
        <Button variant="outline" size="sm">
          <Search className="h-4 w-4 mr-2" />
          Search Project
        </Button>
      </div>

      {/* Content */}
      <Tabs defaultValue="timeline" className="flex-1 flex flex-col min-h-0">
        <TabsList className="mb-6 w-fit bg-white/70 dark:bg-surface-100/30 backdrop-blur-md border-border/50 shadow-[0_1px_3px_rgba(0,0,0,0.05),inset_0_1px_0_rgba(255,255,255,0.6)] dark:shadow-[0_1px_3px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.05)]">
          <TabsTrigger value="timeline" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            <span>Timeline</span>
          </TabsTrigger>
          <TabsTrigger value="artifacts" className="flex items-center gap-2">
            <Files className="h-4 w-4" />
            <span>Artifacts Library</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="timeline" className="flex-1 min-h-0 mt-0">
          <ScrollArea className="h-full -mx-6 px-6">
            <div className="max-w-3xl pb-10">
              <TimelineView events={events} />
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="artifacts" className="flex-1 min-h-0 mt-0">
          <ScrollArea className="h-full -mx-6 px-6">
            <div className="pb-10">
              {artifacts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="h-12 w-12 rounded-xl bg-surface-100 dark:bg-surface-100/10 flex items-center justify-center mb-4">
                    <Files className="h-6 w-6 text-muted-foreground/40" />
                  </div>
                  <h3 className="text-sm font-medium text-foreground/80">
                    No artifacts yet
                  </h3>
                  <p className="text-xs text-muted-foreground/60 mt-1 max-w-xs">
                    No artifacts found in this project.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {artifacts.map((a) => (
                    <div
                      key={a.id}
                      className="group relative border border-border/50 bg-white/60 dark:bg-surface-100/20 backdrop-blur-md p-4 rounded-xl flex flex-col items-center shadow-[0_1px_3px_rgba(0,0,0,0.05),inset_0_1px_0_rgba(255,255,255,0.6)] dark:shadow-[0_1px_3px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.05)] hover:shadow-[0_8px_16px_rgba(0,0,0,0.1),inset_0_1px_0_rgba(255,255,255,0.8)] dark:hover:shadow-[0_8px_16px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.08)] hover:border-primary/40 hover:bg-white/80 dark:hover:bg-surface-100/30 hover:-translate-y-0.5 transition-all duration-200 cursor-pointer"
                    >
                      {/* 玻璃态高光层 */}
                      <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-white/40 via-white/0 to-white/0 dark:from-white/10 dark:via-white/0 dark:to-white/0 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />

                      <div className="relative z-10 flex flex-col items-center w-full">
                        <div className="text-3xl mb-3 transition-transform group-hover:scale-110 duration-200">
                          {a.file_type === "pdf"
                            ? "📄"
                            : a.file_type === "docx"
                              ? "📝"
                              : "📁"}
                        </div>
                        <div
                          className="font-medium truncate w-full text-center text-sm group-hover:text-primary transition-colors"
                          title={a.filename}
                        >
                          {a.filename}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {(a.file_size / 1024).toFixed(0)} KB
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </PageContainer>
  );
}
