import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
  Paperclip,
  Mail,
  Clock,
  Pin,
  Archive,
  MoreVertical,
  User,
  Trash2,
  Edit,
  Copy,
  FolderOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatRelativeTime } from "@/lib/utils";
import { AvatarGroup } from "@/components/ui/avatar-group";

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
  lastActivity?: {
    sender: string;
    date: string;
  };
  participants?: string[]; // 参与者名单
}

interface ProjectCardProps {
  project: ProjectData;
  onClick?: (id: string) => void;
  viewMode?: "grid" | "list";
}

const statusDotColors = {
  active: "bg-emerald-500",
  archived: "bg-slate-400",
  pinned: "bg-blue-500",
};

// 状态标签配置
const statusBadgeConfig = {
  pinned: {
    label: "置顶",
    icon: Pin,
    className:
      "bg-blue-500/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400 border-blue-500/20",
  },
  active: {
    label: "进行中",
    icon: null,
    className:
      "bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400 border-emerald-500/20",
  },
  archived: {
    label: "已归档",
    icon: Archive,
    className:
      "bg-slate-500/10 text-slate-600 dark:bg-slate-500/20 dark:text-slate-400 border-slate-500/20",
  },
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

// 根据进度获取颜色
const getProgressColor = (value: number) => {
  const percent = value * 100;
  if (percent < 30) {
    return {
      ring: "text-slate-400 dark:text-slate-500",
      bg: "text-slate-300 dark:text-slate-600",
    };
  } else if (percent < 70) {
    return {
      ring: "text-blue-500 dark:text-blue-400",
      bg: "text-blue-200 dark:text-blue-900",
    };
  } else {
    return {
      ring: "text-emerald-500 dark:text-emerald-400",
      bg: "text-emerald-200 dark:text-emerald-900",
    };
  }
};

const ProgressRing = ({ value }: { value: number }) => {
  const size = 28;
  const stroke = 3;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - value);
  const percent = Math.round(value * 100);
  const colors = getProgressColor(value);

  return (
    <div
      className="relative flex items-center justify-center"
      title={`项目进度 ${percent}%`}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="transition-colors"
      >
        <circle
          className={cn("transition-colors", colors.bg)}
          stroke="currentColor"
          strokeWidth={stroke}
          fill="transparent"
          cx={size / 2}
          cy={size / 2}
          r={radius}
        />
        <circle
          className={cn("transition-colors", colors.ring)}
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
      <span
        className={cn(
          "pointer-events-none absolute text-[9px] font-semibold leading-none transition-colors",
          colors.ring,
        )}
      >
        {percent}
      </span>
    </div>
  );
};

export function ProjectCard({
  project,
  onClick,
  viewMode = "grid",
}: ProjectCardProps) {
  const progress = getProgress(project);
  const statusConfig =
    statusBadgeConfig[project.status === "pinned" ? "pinned" : project.status];
  const StatusIcon = statusConfig.icon;

  const handleQuickAction = (e: React.MouseEvent, action: string) => {
    e.stopPropagation();
    console.log(`Quick action: ${action} for project ${project.id}`);
    // TODO: 实现实际的快捷操作逻辑
  };

  const handleContextMenuAction = (action: string) => {
    console.log(`Context menu action: ${action} for project ${project.id}`);
    // TODO: 实现实际的右键菜单操作逻辑
  };

  // 右键菜单内容组件
  const ProjectContextMenu = ({ children }: { children: React.ReactNode }) => (
    <ContextMenu>
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
      <ContextMenuContent className="w-56">
        <ContextMenuItem onClick={() => handleContextMenuAction("open")}>
          <FolderOpen className="mr-2 h-4 w-4" />
          <span>打开项目</span>
        </ContextMenuItem>
        <ContextMenuItem onClick={() => handleContextMenuAction("rename")}>
          <Edit className="mr-2 h-4 w-4" />
          <span>重命名</span>
        </ContextMenuItem>
        <ContextMenuItem onClick={() => handleContextMenuAction("duplicate")}>
          <Copy className="mr-2 h-4 w-4" />
          <span>复制</span>
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem
          onClick={() =>
            handleContextMenuAction(
              project.status === "pinned" ? "unpin" : "pin",
            )
          }
        >
          <Pin className="mr-2 h-4 w-4" />
          <span>{project.status === "pinned" ? "取消置顶" : "置顶"}</span>
        </ContextMenuItem>
        <ContextMenuItem onClick={() => handleContextMenuAction("archive")}>
          <Archive className="mr-2 h-4 w-4" />
          <span>归档</span>
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem
          onClick={() => handleContextMenuAction("delete")}
          className="text-destructive focus:text-destructive"
        >
          <Trash2 className="mr-2 h-4 w-4" />
          <span>删除</span>
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );

  if (viewMode === "list") {
    return (
      <ProjectContextMenu>
        <Card
          className={cn(
            "group relative overflow-hidden transition-all duration-300 ease-out cursor-pointer",
            "border-border/60 shadow-[0_1px_2px_rgba(15,23,42,0.06)] dark:shadow-[0_1px_2px_rgba(0,0,0,0.22)]",
            "hover:border-border hover:shadow-[0_4px_12px_rgba(15,23,42,0.12)] dark:hover:shadow-[0_4px_12px_rgba(0,0,0,0.4)]",
            "hover:bg-muted/30 hover:scale-[1.01]",
          )}
          onClick={() => onClick?.(project.id)}
        >
          <div className="flex items-center gap-3 px-4 py-3">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <span
                className={cn(
                  "h-2 w-2 rounded-full shrink-0 ml-0.5",
                  statusDotColors[
                    project.status === "pinned" ? "pinned" : project.status
                  ],
                )}
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium text-foreground/90 group-hover:text-foreground truncate">
                    {project.title}
                  </span>
                  {/* 状态标签 */}
                  <Badge
                    variant="outline"
                    className={cn(
                      "h-5 text-[10px] font-medium shrink-0 whitespace-nowrap",
                      statusConfig.className,
                    )}
                  >
                    {StatusIcon && <StatusIcon className="h-2.5 w-2.5 mr-1" />}
                    {statusConfig.label}
                  </Badge>
                  {/* Tags 标签 */}
                  {project.tags && project.tags.length > 0 && (
                    <>
                      {project.tags.slice(0, 2).map((tag, idx) => (
                        <Badge
                          key={idx}
                          variant="secondary"
                          className="h-5 text-[10px] font-normal shrink-0 whitespace-nowrap hidden sm:inline-flex"
                        >
                          {tag}
                        </Badge>
                      ))}
                      {project.tags.length > 2 && (
                        <Badge
                          variant="secondary"
                          className="h-5 text-[10px] font-normal shrink-0 whitespace-nowrap hidden sm:inline-flex"
                        >
                          +{project.tags.length - 2}
                        </Badge>
                      )}
                    </>
                  )}
                </div>
                {project.description && (
                  <p className="text-xs text-muted-foreground/70 mt-0.5 truncate">
                    {project.description}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 lg:gap-3 shrink-0">
              {/* 参与者头像 - List 视图 */}
              {project.participants && project.participants.length > 0 && (
                <div className="hidden md:block">
                  <AvatarGroup names={project.participants} max={3} size="sm" />
                </div>
              )}
              <div className="hidden lg:flex items-center gap-1.5 text-xs text-muted-foreground/70">
                <Mail className="h-3 w-3" />
                <span>{project.stats.emails}</span>
              </div>
              <div className="hidden lg:flex items-center gap-1.5 text-xs text-muted-foreground/70">
                <Paperclip className="h-3 w-3" />
                <span>{project.stats.attachments}</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground/60">
                <Clock className="h-3 w-3 hidden sm:block" />
                <span className="whitespace-nowrap">
                  {formatRelativeTime(project.lastUpdated)}
                </span>
              </div>
              <ProgressRing value={progress} />
              {/* 快捷操作按钮 */}
              <div className="hidden md:flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={(e) =>
                    handleQuickAction(
                      e,
                      project.status === "pinned" ? "unpin" : "pin",
                    )
                  }
                  title={project.status === "pinned" ? "取消置顶" : "置顶"}
                >
                  <Pin
                    className={cn(
                      "h-3.5 w-3.5",
                      project.status === "pinned" && "fill-current",
                    )}
                  />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={(e) => handleQuickAction(e, "archive")}
                  title="归档"
                >
                  <Archive className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={(e) => handleQuickAction(e, "more")}
                  title="更多"
                >
                  <MoreVertical className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </div>
        </Card>
      </ProjectContextMenu>
    );
  }

  return (
    <ProjectContextMenu>
      <Card
        className={cn(
          "group relative overflow-hidden transition-all duration-300 ease-out cursor-pointer h-full flex flex-col",
          "border-border/60 shadow-[0_1px_2px_rgba(15,23,42,0.06)] dark:shadow-[0_1px_2px_rgba(0,0,0,0.22)]",
          "hover:border-border hover:shadow-[0_8px_24px_rgba(15,23,42,0.15)] dark:hover:shadow-[0_8px_24px_rgba(0,0,0,0.5)]",
          "hover:-translate-y-1 hover:scale-[1.02]",
        )}
        style={
          {
            "--card-accent":
              project.status === "pinned"
                ? "220 70% 50%"
                : project.status === "active"
                  ? "150 60% 45%"
                  : "220 5% 65%",
          } as React.CSSProperties
        }
        onClick={() => onClick?.(project.id)}
      >
        <CardHeader className="pb-2 pt-5 flex-shrink-0">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-2">
                <span
                  className={cn(
                    "h-2 w-2 rounded-full shrink-0 ml-0.5",
                    statusDotColors[
                      project.status === "pinned" ? "pinned" : project.status
                    ],
                  )}
                />
                {/* 状态标签 */}
                <Badge
                  variant="outline"
                  className={cn(
                    "h-5 text-[10px] font-medium",
                    statusConfig.className,
                  )}
                >
                  {StatusIcon && <StatusIcon className="h-2.5 w-2.5 mr-1" />}
                  {statusConfig.label}
                </Badge>
              </div>
              <CardTitle className="line-clamp-1 text-base font-semibold text-foreground/90 group-hover:text-foreground">
                {project.title}
              </CardTitle>
              {project.description && (
                <CardDescription className="line-clamp-2 mt-1.5 text-xs leading-relaxed">
                  {project.description}
                </CardDescription>
              )}
              {/* Tags 标签 */}
              {project.tags && project.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {project.tags.slice(0, 3).map((tag, idx) => (
                    <Badge
                      key={idx}
                      variant="secondary"
                      className="h-5 text-[10px] font-normal"
                    >
                      {tag}
                    </Badge>
                  ))}
                  {project.tags.length > 3 && (
                    <Badge
                      variant="secondary"
                      className="h-5 text-[10px] font-normal"
                    >
                      +{project.tags.length - 3}
                    </Badge>
                  )}
                </div>
              )}
            </div>
            {/* 快捷操作按钮 - Grid 视图 */}
            <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={(e) =>
                  handleQuickAction(
                    e,
                    project.status === "pinned" ? "unpin" : "pin",
                  )
                }
                title={project.status === "pinned" ? "取消置顶" : "置顶"}
              >
                <Pin
                  className={cn(
                    "h-3.5 w-3.5",
                    project.status === "pinned" && "fill-current",
                  )}
                />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={(e) => handleQuickAction(e, "more")}
                title="更多"
              >
                <MoreVertical className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-0 flex-1 flex flex-col">
          {/* 最新活动预览 */}
          <div className="flex items-center gap-2 pt-2 text-xs text-muted-foreground/70 min-h-[20px]">
            {project.lastActivity && (
              <>
                <User className="h-3 w-3" />
                <span className="truncate">
                  最近来自：
                  <span className="font-medium text-foreground/70">
                    {project.lastActivity.sender}
                  </span>
                </span>
              </>
            )}
          </div>

          <div className="flex items-center gap-4 pt-3 border-t border-border/40 mt-2">
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground/80">
              <div className="h-7 w-7 rounded-md bg-surface-100 dark:bg-surface-100/10 flex items-center justify-center">
                <Mail className="h-3.5 w-3.5" />
              </div>
              <span className="font-medium text-foreground/80">
                {project.stats.emails}
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground/80">
              <div className="h-7 w-7 rounded-md bg-surface-100 dark:bg-surface-100/10 flex items-center justify-center">
                <Paperclip className="h-3.5 w-3.5" />
              </div>
              <span className="font-medium text-foreground/80">
                {project.stats.attachments}
              </span>
            </div>
            <div className="ml-auto flex items-center gap-2 text-xs text-muted-foreground/60">
              <Clock className="h-3 w-3" />
              <span>{formatRelativeTime(project.lastUpdated)}</span>
              <ProgressRing value={progress} />
            </div>
          </div>

          {/* 参与者头像 */}
          <div className="flex items-center gap-2 pt-3 mt-3 border-t border-border/40 min-h-[44px]">
            {project.participants && project.participants.length > 0 && (
              <>
                <AvatarGroup names={project.participants} max={3} size="sm" />
                <span className="text-xs text-muted-foreground/60">
                  {project.participants.length} 位参与者
                </span>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </ProjectContextMenu>
  );
}
