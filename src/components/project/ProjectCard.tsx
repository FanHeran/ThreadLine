import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Paperclip, Mail, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ProjectData {
  id: string;
  title: string;
  description?: string;
  status: "active" | "archived" | "pinned";
  lastUpdated: string;
  image?: string; // Optional cover image or color
  stats: {
    emails: number;
    attachments: number;
  };
  tags?: string[];
}

interface ProjectCardProps {
  project: ProjectData;
  onClick?: (id: string) => void;
}

export function ProjectCard({ project, onClick }: ProjectCardProps) {
  return (
    <Card
      className="group hover:shadow-lg transition-all duration-200 cursor-pointer border-l-4 overflow-hidden"
      style={{
        borderLeftColor:
          project.status === "pinned" ? "#3b82f6" : "transparent",
      }}
      onClick={() => onClick?.(project.id)}
    >
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div className="space-y-1">
            <CardTitle className="line-clamp-1 text-lg group-hover:text-primary transition-colors">
              {project.title}
            </CardTitle>
            <CardDescription className="line-clamp-2 text-xs">
              {project.description || "No description provided"}
            </CardDescription>
          </div>
          {project.status === "pinned" && (
            <Badge variant="secondary" className="text-xs">
              Pinned
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Mail className="h-3.5 w-3.5" />
            <span>{project.stats.emails}</span>
          </div>
          <div className="flex items-center gap-1">
            <Paperclip className="h-3.5 w-3.5" />
            <span>{project.stats.attachments}</span>
          </div>
          <div className="flex items-center gap-1 ml-auto text-xs">
            <Clock className="h-3 w-3" />
            <span>{project.lastUpdated}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
