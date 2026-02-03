import React from "react";
import {
  CheckCircle2,
  Mail,
  ChevronDown,
  ChevronRight,
  User,
  MoreVertical,
  FileText,
  File,
  Image,
  Archive,
  Sheet,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

export type Attachment = {
  name: string;
  type: string;
  size: string;
};

export type TimelineEvent = {
  id: string;
  type: "milestone" | "email" | "thread";
  date: string;
  title?: string;
  subject?: string;
  sender?: string;
  content?: string;
  attachments?: Attachment[];
  children?: TimelineEvent[];
  status?: string;
};

// 获取文件类型图标和颜色
const getFileIcon = (filename: string) => {
  const ext = filename.split(".").pop()?.toLowerCase() || "";

  if (["pdf"].includes(ext)) {
    return {
      icon: FileText,
      color: "text-red-500",
      bgColor: "bg-red-50 dark:bg-red-950/20",
    };
  }
  if (["doc", "docx"].includes(ext)) {
    return {
      icon: FileText,
      color: "text-blue-500",
      bgColor: "bg-blue-50 dark:bg-blue-950/20",
    };
  }
  if (["xls", "xlsx", "csv"].includes(ext)) {
    return {
      icon: Sheet,
      color: "text-green-500",
      bgColor: "bg-green-50 dark:bg-green-950/20",
    };
  }
  if (["jpg", "jpeg", "png", "gif", "svg", "webp"].includes(ext)) {
    return {
      icon: Image,
      color: "text-purple-500",
      bgColor: "bg-purple-50 dark:bg-purple-950/20",
    };
  }
  if (["zip", "rar", "7z", "tar", "gz"].includes(ext)) {
    return {
      icon: Archive,
      color: "text-orange-500",
      bgColor: "bg-orange-50 dark:bg-orange-950/20",
    };
  }

  return {
    icon: File,
    color: "text-gray-500",
    bgColor: "bg-gray-50 dark:bg-gray-950/20",
  };
};

const AttachmentChip = ({ file }: { file: Attachment }) => {
  const { icon: Icon, color, bgColor } = getFileIcon(file.name);

  return (
    <Badge
      variant="outline"
      className={cn(
        "flex items-center gap-1.5 font-normal h-7 px-2.5 border-border/40",
        bgColor,
      )}
    >
      <Icon className={cn("h-3.5 w-3.5", color)} />
      <span className="truncate max-w-[140px] text-xs text-foreground/80">
        {file.name}
      </span>
      <span className="text-[10px] text-muted-foreground/60">{file.size}</span>
    </Badge>
  );
};

const EmailItem = ({
  event,
  isThreadChild = false,
}: {
  event: TimelineEvent;
  isThreadChild?: boolean;
}) => {
  const [isExpanded, setIsExpanded] = React.useState(false);
  const contentPreviewLength = 150; // 预览字符数
  const shouldTruncate = (event.content?.length || 0) > contentPreviewLength;

  const displayContent =
    shouldTruncate && !isExpanded
      ? event.content?.substring(0, contentPreviewLength) + "..."
      : event.content;

  return (
    <div
      className={cn(
        "relative rounded-lg border bg-card/80 backdrop-blur-sm transition-colors",
        isThreadChild
          ? "mt-2 ml-4 py-3 px-4 bg-surface-50/50 dark:bg-surface-100/5 border-dashed border-border/50"
          : "py-3 px-4 border-border/60 hover:border-border",
      )}
    >
      <div className="flex items-start justify-between gap-3 mb-2.5">
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <div className="h-8 w-8 rounded-full bg-surface-100 dark:bg-surface-100/10 flex items-center justify-center shrink-0">
            <User className="h-4 w-4 text-muted-foreground/80" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-medium text-foreground/90">
              {event.sender}
            </div>
            <div className="text-xs text-muted-foreground/60">{event.date}</div>
          </div>
        </div>
        <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0">
          <MoreVertical className="h-4 w-4 text-muted-foreground" />
        </Button>
      </div>

      {/* 邮件主题 */}
      {event.subject && (
        <div className="pl-10 mb-2">
          <div className="text-sm font-semibold text-foreground/95 leading-snug">
            {event.subject}
          </div>
        </div>
      )}

      {/* 邮件内容 */}
      <div className="pl-10">
        <div className="text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap">
          {displayContent}
        </div>

        {shouldTruncate && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="mt-2 h-7 px-2 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
          >
            {isExpanded ? "收起" : "展开全文"}
            <ChevronDown
              className={cn(
                "ml-1 h-3 w-3 transition-transform",
                isExpanded && "rotate-180",
              )}
            />
          </Button>
        )}
      </div>

      {/* 附件 */}
      {event.attachments && event.attachments.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-3 pl-10">
          {event.attachments.map((att, idx) => (
            <AttachmentChip key={idx} file={att} />
          ))}
        </div>
      )}
    </div>
  );
};

const ThreadItem = ({ event }: { event: TimelineEvent }) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const emailCount = event.children?.length || 0;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="space-y-1.5">
      <CollapsibleTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-between h-auto py-2.5 px-3 text-foreground/80 hover:text-foreground hover:bg-muted/50 border border-border/40 rounded-lg"
        >
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-md bg-surface-100 dark:bg-surface-100/20 flex items-center justify-center">
              <Mail className="h-3.5 w-3.5 text-foreground/70" />
            </div>
            <span className="text-sm font-medium">Thread ({emailCount})</span>
          </div>
          {isOpen ? (
            <ChevronDown className="h-4 w-4 text-foreground/60" />
          ) : (
            <ChevronRight className="h-4 w-4 text-foreground/60" />
          )}
        </Button>
      </CollapsibleTrigger>

      <CollapsibleContent className="space-y-1.5 pt-1">
        {event.children?.map((child) => (
          <EmailItem key={child.id} event={child} isThreadChild />
        ))}
      </CollapsibleContent>
    </Collapsible>
  );
};

// 日期分组辅助函数
const getDateGroup = (dateStr: string): string => {
  const eventDate = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  // 重置时间为 00:00:00 以便比较日期
  const resetTime = (date: Date) => {
    date.setHours(0, 0, 0, 0);
    return date;
  };

  const eventDateReset = resetTime(new Date(eventDate));
  const todayReset = resetTime(new Date(today));
  const yesterdayReset = resetTime(new Date(yesterday));

  if (eventDateReset.getTime() === todayReset.getTime()) {
    return "今天";
  } else if (eventDateReset.getTime() === yesterdayReset.getTime()) {
    return "昨天";
  }

  // 本周
  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 7);
  if (eventDate > weekAgo) {
    return "本周";
  }

  // 本月
  if (
    eventDate.getMonth() === today.getMonth() &&
    eventDate.getFullYear() === today.getFullYear()
  ) {
    return "本月";
  }

  // 更早 - 显示月份
  const months = [
    "1月",
    "2月",
    "3月",
    "4月",
    "5月",
    "6月",
    "7月",
    "8月",
    "9月",
    "10月",
    "11月",
    "12月",
  ];
  return `${eventDate.getFullYear()}年 ${months[eventDate.getMonth()]}`;
};

// 按日期分组事件
const groupEventsByDate = (
  events: TimelineEvent[],
): Map<string, TimelineEvent[]> => {
  const groups = new Map<string, TimelineEvent[]>();

  events.forEach((event) => {
    const group = getDateGroup(event.date);
    if (!groups.has(group)) {
      groups.set(group, []);
    }
    groups.get(group)!.push(event);
  });

  return groups;
};

export function TimelineView({ events }: { events: TimelineEvent[] }) {
  const groupedEvents = groupEventsByDate(events);
  const groupOrder = ["今天", "昨天", "本周", "本月"];

  // 对分组进行排序
  const sortedGroups = Array.from(groupedEvents.entries()).sort((a, b) => {
    const indexA = groupOrder.indexOf(a[0]);
    const indexB = groupOrder.indexOf(b[0]);

    // 如果都在预定义顺序中
    if (indexA !== -1 && indexB !== -1) {
      return indexA - indexB;
    }
    // 如果只有 a 在预定义顺序中
    if (indexA !== -1) return -1;
    // 如果只有 b 在预定义顺序中
    if (indexB !== -1) return 1;
    // 都不在预定义顺序中，按字符串倒序（较新的月份在前）
    return b[0].localeCompare(a[0]);
  });

  return (
    <div className="relative pb-8">
      {sortedGroups.map(([groupLabel, groupEvents], groupIndex) => (
        <div key={groupLabel} className={cn(groupIndex > 0 && "mt-8")}>
          {/* 日期分组标签 */}
          <div className="flex items-center gap-3 mb-6">
            <div className="text-sm font-semibold text-foreground/70 uppercase tracking-wide">
              {groupLabel}
            </div>
            <div className="flex-1 h-px bg-border/40" />
          </div>

          {/* 该分组的事件 */}
          <div className="relative space-y-6">
            {/* Vertical Line - centered on 16px circle */}
            <div className="absolute left-2 top-2 bottom-0 w-[2px] bg-border dark:bg-border/80 rounded-full" />

            {groupEvents.map((event) => (
              <div key={event.id} className="relative">
                {/* Node Icon - line goes through, z-10 puts it above line */}
                <div
                  className={cn(
                    "absolute left-0 top-2 h-4 w-4 rounded-full z-10 flex items-center justify-center",
                    event.type === "milestone"
                      ? "bg-blue-500"
                      : "bg-surface-100 dark:bg-surface-100/10",
                  )}
                >
                  {event.type === "milestone" && (
                    <CheckCircle2 className="h-2.5 w-2.5 text-white" />
                  )}
                </div>

                {/* Content */}
                <div className="pl-6 min-w-0">
                  {event.type === "milestone" && (
                    <div>
                      <div className="flex items-center gap-2 mb-4">
                        <span className="font-semibold text-foreground">
                          {event.title}
                        </span>
                        <Badge
                          variant="secondary"
                          className="text-xs font-normal h-5"
                        >
                          {event.date}
                        </Badge>
                      </div>

                      {event.children && event.children.length > 0 && (
                        <div className="space-y-3 border-l-2 border-dashed pl-4 ml-1 border-border/70 dark:border-border/60">
                          {event.children.map((child) => (
                            <div key={child.id}>
                              {child.type === "email" && (
                                <EmailItem event={child} />
                              )}
                              {child.type === "thread" && (
                                <ThreadItem event={child} />
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {event.type === "email" && <EmailItem event={event} />}

                  {event.type === "thread" && <ThreadItem event={event} />}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
