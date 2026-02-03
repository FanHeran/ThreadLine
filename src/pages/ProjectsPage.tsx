import { useEffect, useState } from "react";
import { Plus, Archive, Pin, CirclePlay, ChevronDown, LayoutGrid, List } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ProjectCard, ProjectData } from "@/components/project/ProjectCard";
import { useNavigate } from "react-router-dom";
import { invoke } from "@tauri-apps/api/core";
import { PageContainer } from "@/components/layout/PageContainer";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";

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

// 骨架屏绁E��
function ProjectCardSkeleton({ viewMode = "grid" }: { viewMode?: "grid" | "list" }) {
  if (viewMode === "list") {
    return (
      <Card className="overflow-hidden border-border/40">
        <div className="flex items-center gap-4 px-4 py-3">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="h-2 w-2 rounded-full bg-muted/30 animate-pulse shrink-0" />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <div className="h-4 w-32 rounded bg-muted/20 animate-pulse" />
              </div>
              <div className="h-3 w-48 rounded bg-muted/15 animate-pulse mt-1" />
            </div>
          </div>
          <div className="flex items-center gap-4 shrink-0">
            <div className="flex items-center gap-1.5">
              <div className="h-3 w-3 rounded bg-muted/20 animate-pulse" />
              <div className="h-3 w-4 rounded bg-muted/20 animate-pulse" />
            </div>
            <div className="flex items-center gap-1.5">
              <div className="h-3 w-3 rounded bg-muted/20 animate-pulse" />
              <div className="h-3 w-4 rounded bg-muted/20 animate-pulse" />
            </div>
            <div className="flex items-center gap-1.5 w-16 justify-end">
              <div className="h-3 w-3 rounded bg-muted/20 animate-pulse" />
              <div className="h-3 w-10 rounded bg-muted/20 animate-pulse" />
            </div>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden border-border/40">
      <CardHeader className="pb-2 pt-5">
        <div className="flex items-center gap-2 mb-2">
          <div className="h-2 w-2 rounded-full bg-muted/30 animate-pulse" />
        </div>
        <div className="h-5 w-3/4 rounded bg-muted/20 animate-pulse mb-2" />
        <div className="h-3 w-full rounded bg-muted/15 animate-pulse" />
        <div className="h-3 w-2/3 rounded bg-muted/15 animate-pulse mt-1" />
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex items-center gap-4 pt-3 border-t border-border/40 mt-2">
          <div className="flex items-center gap-1.5">
            <div className="h-7 w-7 rounded-md bg-muted/10 animate-pulse" />
            <div className="h-4 w-4 rounded bg-muted/20 animate-pulse" />
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-7 w-7 rounded-md bg-muted/10 animate-pulse" />
            <div className="h-4 w-4 rounded bg-muted/20 animate-pulse" />
          </div>
          <div className="ml-auto flex items-center gap-1.5">
            <div className="h-3 w-3 rounded bg-muted/20 animate-pulse" />
            <div className="h-3 w-12 rounded bg-muted/20 animate-pulse" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// 徽章样式绁E��
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
        className
      )}
    >
      {count}
    </span>
  );
}

export function ProjectsPage() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<ProjectData[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());

  useEffect(() => {
    async function fetchProjects() {
      try {
        const data = await invoke<BackendProject[]>("list_projects");
        const mapped: ProjectData[] = data.map((p) => ({
          id: p.id.toString(),
          title: p.title,
          description: p.description,
          status: p.is_pinned ? "pinned" : (p.status as "active" | "archived" | "pinned"),
          lastUpdated: p.last_updated,
          stats: p.stats,
        }));
        setProjects(mapped);
      } catch (e) {
        console.error("Failed to fetch projects:", e);
      } finally {
        setLoading(false);
      }
    }
    fetchProjects();
  }, []);

  const pinnedProjects = projects.filter((p) => p.status === "pinned");
  const activeProjects = projects.filter((p) => p.status === "active");
  const archivedProjects = projects.filter((p) => p.status === "archived");

  const handleProjectClick = (id: string) => {
    navigate(`/projects/${id}`);
  };

  const toggleSection = (section: string) => {
    setCollapsedSections((prev) => {
      const next = new Set(prev);
      if (next.has(section)) {
        next.delete(section);
      } else {
        next.add(section);
      }
      return next;
    });
  };

  const isSectionCollapsed = (section: string) => collapsedSections.has(section);

  // 骨架屏占佁E
  const SkeletonSection = ({ count = 3 }: { count?: number }) => (
    <div className={cn(
      "gap-3",
      viewMode === "grid"
        ? "grid auto-rows-max grid-cols-[repeat(auto-fit,minmax(260px,360px))] justify-start"
        : "flex flex-col"
    )}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="w-full"
        >
          <ProjectCardSkeleton viewMode={viewMode} />
        </div>
      ))}
    </div>
  );

  // Section 绁E��
  const ProjectSection = ({
    title,
    icon,
    iconColor,
    projects,
    sectionId,
    badgeVariant = "default",
    showSeparator = false,
  }: {
    title: string;
    icon: React.ReactNode;
    iconColor: string;
    projects: ProjectData[];
    sectionId: string;
    badgeVariant?: "default" | "muted";
    showSeparator?: boolean;
  }) => {
    const collapsed = isSectionCollapsed(sectionId);

    return (
      <section>
        {showSeparator && <Separator className="mb-6" />}
        <button
          onClick={() => toggleSection(sectionId)}
          className="flex items-center gap-2.5 mb-4 group w-fit hover:opacity-80 transition-opacity"
        >
          <div className={cn("flex items-center justify-center", iconColor)}>
            {icon}
          </div>
          <h2 className="text-sm font-semibold text-foreground/75 tracking-wide">
            {title}
          </h2>
          <CountBadge count={projects.length} variant={badgeVariant} className="text-[10px] opacity-70" />
          <ChevronDown
            className={cn(
              "h-3.5 w-3.5 text-muted-foreground/40 transition-transform duration-200",
              collapsed && "-rotate-90"
            )}
          />
        </button>
        {!collapsed && (
          <div
            className={cn(
              "gap-3",
              viewMode === "grid"
                ? "grid auto-rows-max grid-cols-[repeat(auto-fit,minmax(260px,360px))] justify-start"
                : "flex flex-col"
            )}
          >
            {projects.map((p) => (
              <div
                key={p.id}
                className="w-full"
              >
                <ProjectCard
                  project={p}
                  onClick={handleProjectClick}
                  viewMode={viewMode}
                />
              </div>
            ))}
          </div>
        )}
      </section>
    );
  };

  return (
    <PageContainer className="p-6 bg-muted/30">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
        <div className="space-y-0.5">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground leading-tight">
            Projects
          </h1>
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground/55 leading-tight">
            <span>projects</span>
            <CountBadge count={projects.length} variant="muted" className="text-[10px]" />
            <span className="h-1 w-1 rounded-full bg-muted-foreground/30" />
            <span>active</span>
            <CountBadge count={activeProjects.length} variant="muted" className="text-[10px]" />
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          {/* 见E��刁E�� */}
          <div className="flex items-center border border-border/50 rounded-md overflow-hidden">
            <button
              onClick={() => setViewMode("grid")}
              className={cn(
                "p-1.5 transition-colors",
                viewMode === "grid"
                  ? "bg-muted/50 text-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
              )}
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={cn(
                "p-1.5 transition-colors",
                viewMode === "list"
                  ? "bg-muted/50 text-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
              )}
            >
              <List className="h-4 w-4" />
            </button>
          </div>
          <Button size="sm">
            <Plus className="h-4 w-4 mr-1.5" />
            New Project
          </Button>
        </div>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1 -mx-6 px-6">
        <div className="space-y-10 pb-10">
          {loading ? (
            // Loading skeleton
            <>
              <ProjectSection
                title="Pinned"
                icon={<Pin className="h-3.5 w-3.5 fill-current" />}
                iconColor="text-blue-500"
                projects={[]}
                sectionId="pinned"
                badgeVariant="muted"
              />
              <SkeletonSection count={2} />
              <ProjectSection
                title="Active"
                icon={<CirclePlay className="h-3.5 w-3.5" />}
                iconColor="text-emerald-500"
                projects={[]}
                sectionId="active"
                badgeVariant="muted"
              />
              <SkeletonSection count={3} />
            </>
          ) : (
            <>
              {/* Pinned Section */}
              {pinnedProjects.length > 0 && (
                <ProjectSection
                  title="Pinned"
                  icon={<Pin className="h-3.5 w-3.5 fill-current" />}
                  iconColor="text-blue-500"
                  projects={pinnedProjects}
                  sectionId="pinned"
                />
              )}

              {/* Active Section */}
              {activeProjects.length > 0 && (
                <ProjectSection
                  title="Active"
                  icon={<CirclePlay className="h-3.5 w-3.5" />}
                  iconColor="text-emerald-500"
                  projects={activeProjects}
                  sectionId="active"
                />
              )}

              {/* Archived Section */}
              {archivedProjects.length > 0 && (
                <ProjectSection
                  title="Archived"
                  icon={<Archive className="h-3.5 w-3.5" />}
                  iconColor="text-slate-400"
                  projects={archivedProjects}
                  sectionId="archived"
                  badgeVariant="muted"
                  showSeparator
                />
              )}

              {/* Empty State */}
              {projects.length === 0 && (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="h-12 w-12 rounded-xl bg-surface-100 dark:bg-surface-100/10 flex items-center justify-center mb-4">
                    <Archive className="h-6 w-6 text-muted-foreground/40" />
                  </div>
                  <h3 className="text-sm font-medium text-foreground/80">No projects yet</h3>
                  <p className="text-xs text-muted-foreground/60 mt-1 max-w-xs">
                    Create your first project to start organizing emails and attachments.
                  </p>
                  <Button size="sm" className="mt-4">
                    <Plus className="h-4 w-4 mr-1.5" />
                    Create Project
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </ScrollArea>
    </PageContainer>
  );
}






