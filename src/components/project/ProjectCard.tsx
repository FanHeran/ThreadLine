import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Paperclip, Mail, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatRelativeTime } from "@/lib/utils";

export interface ProjectData {
  id: string;
  title: string;
  description?: string;
  status: "active" | "archived" | "pinned";
  lastUpdated: string;
  image?: string;
  stats: {
    emails: number;
    attachments: number;
  };
  progress?: number;
  tags?: string[];
}

interface ProjectCardProps {
  project: ProjectData;
  onClick?: (id: string) => void;
  viewMode?: "grid" | "list";
}

const statusColors = {
  active: "bg-emerald-500",
  archived: "bg-slate-400",
  pinned: "bg-blue-500",
};

const statusDotColors = {
  active: "bg-emerald-500",
  archived: "bg-slate-400",
  pinned: "bg-blue-500",
};

const clamp = (value: number, min = 0, max = 1) =>
  Math.min(max, Math.max(min, value));

const getProgress = (project: ProjectData) => {
  if (typeof project.progress === "number") {
    return clamp(project.progress);
  }
  const total = project.stats.emails + project.stats.attachments;
  if (total <= 0) return 0;
  return clamp(total / 60);
};

const ProgressRing = ({ value }: { value: number }) => {
  const size = 24;
  const stroke = 2;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - value);
  const percent = Math.round(value * 100);

  return (
    <div
      className="flex items-center justify-center"
      title={`Progress ${percent}%`}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="text-muted-foreground/30 transition-colors group-hover:text-primary/70"
      >
        <circle
          className="text-muted-foreground/20"
          stroke="currentColor"
          strokeWidth={stroke}
          fill="transparent"
          cx={size / 2}
          cy={size / 2}
          r={radius}
        />
        <circle
          className="text-primary/70"
          stroke="currentColor"
          strokeWidth={stroke}
          fill="transparent"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={offset}
          strokeLinecap="round"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
    </div>
  );
};

export function ProjectCard({ project, onClick, viewMode = "grid" }: ProjectCardProps) {
  const progress = getProgress(project);
  if (viewMode === "list") {
    return (
      <Card
        className={cn(
          "group relative overflow-hidden transition-all duration-200 cursor-pointer",
          "border-border/60 hover:border-border hover:shadow-sm",
          "hover:bg-muted/30"
        )}
        onClick={() => onClick?.(project.id)}
      >
        <div
          className={cn(
            "absolute left-0 top-0 bottom-0 w-0.5",
            statusColors[project.status === "pinned" ? "pinned" : project.status]
          )}
        />
        <div className="flex items-center gap-4 px-4 py-3">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <span
              className={cn(
                "h-2 w-2 rounded-full shrink-0",
                statusDotColors[project.status === "pinned" ? "pinned" : project.status]
              )}
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-foreground/90 group-hover:text-foreground truncate">
                  {project.title}
                </span>
                <span className="text-xs text-muted-foreground/60 uppercase tracking-wider shrink-0">
                  {project.status}
                </span>
              </div>
              {project.description && (
                <p className="text-xs text-muted-foreground/70 mt-0.5 truncate">
                  {project.description}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-4 shrink-0">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground/70">
              <Mail className="h-3 w-3" />
              <span>{project.stats.emails}</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground/70">
              <Paperclip className="h-3 w-3" />
              <span>{project.stats.attachments}</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground/60 w-16 justify-end">
              <Clock className="h-3 w-3" />
              <span className="truncate">{formatRelativeTime(project.lastUpdated)}</span>
            </div>
            <ProgressRing value={progress} />
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card
      className={cn(
        "group relative overflow-hidden transition-all duration-200 cursor-pointer",
        "border-border/60 hover:border-border hover:shadow-md",
        "before:absolute before:top-0 before:left-0 before:right-0 before:h-1 before:bg-gradient-to-r before:opacity-100",
        "hover:-translate-y-0.5"
      )}
      style={{
        "--card-accent": project.status === "pinned"
          ? "220 70% 50%"
          : project.status === "active"
            ? "150 60% 45%"
            : "220 5% 65%",
      } as React.CSSProperties}
      onClick={() => onClick?.(project.id)}
    >
      {/* 顶部彩色条 */}
      <div
        className={cn(
          "absolute top-0 left-0 right-0 h-1",
          statusColors[project.status === "pinned" ? "pinned" : project.status]
        )}
      />

      <CardHeader className="pb-2 pt-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1.5">
              <span
                className={cn(
                  "h-2 w-2 rounded-full",
                  statusDotColors[project.status === "pinned" ? "pinned" : project.status]
                )}
              />
              <span className="text-xs text-muted-foreground/70 font-medium uppercase tracking-wider">
                {project.status}
              </span>
            </div>
            <CardTitle className="line-clamp-1 text-base font-semibold text-foreground/90 group-hover:text-foreground">
              {project.title}
            </CardTitle>
            {project.description && (
              <CardDescription className="line-clamp-2 mt-1.5 text-xs leading-relaxed">
                {project.description}
              </CardDescription>
            )}
          </div>
          <ProgressRing value={progress} />
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        <div className="flex items-center gap-4 pt-3 border-t border-border/40 mt-2">
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground/80">
            <div className="h-7 w-7 rounded-md bg-surface-100 dark:bg-surface-100/10 flex items-center justify-center">
              <Mail className="h-3.5 w-3.5" />
            </div>
            <span className="font-medium text-foreground/80">{project.stats.emails}</span>
          </div>
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground/80">
            <div className="h-7 w-7 rounded-md bg-surface-100 dark:bg-surface-100/10 flex items-center justify-center">
              <Paperclip className="h-3.5 w-3.5" />
            </div>
            <span className="font-medium text-foreground/80">{project.stats.attachments}</span>
          </div>
          <div className="ml-auto flex items-center gap-1.5 text-xs text-muted-foreground/60">
            <Clock className="h-3 w-3" />
            <span>{formatRelativeTime(project.lastUpdated)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
