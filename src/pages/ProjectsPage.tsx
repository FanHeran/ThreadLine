import React, { useEffect, useState } from "react";
import { Plus, Archive } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ProjectCard, ProjectData } from "@/components/project/ProjectCard";
import { useNavigate } from "react-router-dom";
import { invoke } from "@tauri-apps/api/core";

// Define the shape of data coming from Rust
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

export function ProjectsPage() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<ProjectData[]>([]);

  useEffect(() => {
    async function fetchProjects() {
      try {
        const data = await invoke<BackendProject[]>("list_projects");
        // Map backend data to UI data
        const mapped: ProjectData[] = data.map((p) => ({
          id: p.id.toString(),
          title: p.title,
          description: p.description,
          status: p.is_pinned ? "pinned" : (p.status as any), // Map logic
          lastUpdated: p.last_updated,
          stats: p.stats,
        }));
        setProjects(mapped);
      } catch (e) {
        console.error("Failed to fetch projects:", e);
      }
    }
    fetchProjects();
  }, []);

  // Filter based on UI status (which we mapped specially above)
  const pinnedProjects = projects.filter((p) => p.status === "pinned");
  const activeProjects = projects.filter((p) => p.status === "active"); // Already excluded pinned in mapping logic?
  // Wait, if I map is_pinned -> 'pinned', the original status ('active') is lost.
  // Better logic:
  // Pinned section: projects where is_pinned is true.
  // Active section: projects where status is 'active' AND NOT pinned.
  // Archived section: projects where status is 'archived'. (Pinned archived? unlikely but handled)

  // Let's refine the mapping. I'll stick to local state 'projects' holding the backend structure or mapped structure,
  // but simpler to map to ProjectData for Card compatibility.
  // ProjectCard interprets 'pinned' status for border color.

  const archivedProjects = projects.filter((p) => p.status === "archived");

  const handleProjectClick = (id: string) => {
    navigate(`/projects/${id}`);
  };

  return (
    <div className="h-full flex flex-col p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Projects</h1>
          <p className="text-muted-foreground mt-1">
            Manage and organize your email threads into projects.
          </p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" /> New Project
        </Button>
      </div>

      <ScrollArea className="flex-1 -mx-6 px-6">
        <div className="space-y-8 pb-10">
          {/* Pinned Section */}
          {pinnedProjects.length > 0 && (
            <section>
              <h2 className="text-lg font-semibold flex items-center mb-4">
                <span className="w-2 h-2 rounded-full bg-blue-500 mr-2"></span>
                Pinned
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {pinnedProjects.map((p) => (
                  <ProjectCard
                    key={p.id}
                    project={p}
                    onClick={handleProjectClick}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Active Section */}
          <section>
            <h2 className="text-lg font-semibold flex items-center mb-4">
              <span className="w-2 h-2 rounded-full bg-green-500 mr-2"></span>
              Active
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {activeProjects.map((p) => (
                <ProjectCard
                  key={p.id}
                  project={p}
                  onClick={handleProjectClick}
                />
              ))}
            </div>
          </section>

          {/* Archived Section */}
          {archivedProjects.length > 0 && (
            <section>
              <Separator className="my-6" />
              <h2 className="text-lg font-semibold flex items-center mb-4 text-muted-foreground">
                <Archive className="mr-2 h-4 w-4" />
                Archived
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 opacity-75">
                {archivedProjects.map((p) => (
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
