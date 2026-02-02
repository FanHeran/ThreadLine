import React from "react";
import { Plus, LayoutGrid, Archive } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ProjectCard, ProjectData } from "@/components/project/ProjectCard";
import { useNavigate } from "react-router-dom";

// Mock Data
const MOCK_PROJECTS: ProjectData[] = [
  {
    id: "1",
    title: "Client A - 2024 Cooperation Agreement",
    description:
      "Annual framework agreement negotiation and final signing process.",
    status: "pinned",
    lastUpdated: "2 hours ago",
    stats: { emails: 12, attachments: 8 },
  },
  {
    id: "2",
    title: "Product X Tech Integration",
    description:
      "Technical integration discussions with the engineering team regarding API v2.",
    status: "active",
    lastUpdated: "Yesterday",
    stats: { emails: 23, attachments: 15 },
  },
  {
    id: "3",
    title: "Vendor B Inquiry Process",
    status: "active",
    lastUpdated: "3 days ago",
    stats: { emails: 8, attachments: 3 },
  },
  {
    id: "4",
    title: "Q1 Marketing Campaign",
    description: "Social media assets and copy review.",
    status: "archived",
    lastUpdated: "Jan 15, 2024",
    stats: { emails: 45, attachments: 20 },
  },
  {
    id: "5",
    title: "Legal Review - NDA",
    status: "archived",
    lastUpdated: "Dec 20, 2023",
    stats: { emails: 5, attachments: 2 },
  },
];

export function ProjectsPage() {
  const navigate = useNavigate();
  const pinnedProjects = MOCK_PROJECTS.filter((p) => p.status === "pinned");
  const activeProjects = MOCK_PROJECTS.filter((p) => p.status === "active");
  const archivedProjects = MOCK_PROJECTS.filter((p) => p.status === "archived");

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
