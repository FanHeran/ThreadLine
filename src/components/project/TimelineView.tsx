import React from "react";
import {
  CheckCircle2,
  Mail,
  Paperclip,
  ChevronDown,
  ChevronRight,
  User,
  MoreVertical,
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
  sender?: string;
  content?: string;
  attachments?: Attachment[];
  children?: TimelineEvent[];
  status?: string;
};

const AttachmentChip = ({ file }: { file: Attachment }) => (
  <Badge
    variant="outline"
    className="flex items-center gap-1.5 font-normal h-6 px-2 bg-surface-50/50 dark:bg-surface-100/5"
  >
    <Paperclip className="h-3 w-3 text-muted-foreground/70" />
    <span className="truncate max-w-[120px] text-xs">{file.name}</span>
    <span className="text-[10px] text-muted-foreground/50">{file.size}</span>
  </Badge>
);

const EmailItem = ({
  event,
  isThreadChild = false,
}: {
  event: TimelineEvent;
  isThreadChild?: boolean;
}) => {
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
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-full bg-surface-100 dark:bg-surface-100/10 flex items-center justify-center shrink-0">
            <User className="h-4 w-4 text-muted-foreground/80" />
          </div>
          <div>
            <div className="text-sm font-medium text-foreground/90">{event.sender}</div>
            <div className="text-xs text-muted-foreground/60">{event.date}</div>
          </div>
        </div>
        <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0">
          <MoreVertical className="h-4 w-4 text-muted-foreground" />
        </Button>
      </div>

      <div className="text-sm text-foreground/80 leading-relaxed pl-10">
        {event.content}
      </div>

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
          className="w-full justify-between h-auto py-2 px-3 text-muted-foreground hover:text-foreground"
        >
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-md bg-surface-100 dark:bg-surface-100/10 flex items-center justify-center">
              <Mail className="h-3.5 w-3.5" />
            </div>
            <span className="text-sm">Thread ({emailCount})</span>
          </div>
          {isOpen ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
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

export function TimelineView({ events }: { events: TimelineEvent[] }) {
  return (
    <div className="relative space-y-6 pb-8">
      {/* Vertical Line - centered on 16px circle */}
      <div className="absolute left-2 top-2 bottom-0 w-px bg-border/60" />

      {events.map((event) => (
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
                  <span className="font-semibold text-foreground">{event.title}</span>
                  <Badge variant="secondary" className="text-xs font-normal h-5">
                    {event.date}
                  </Badge>
                </div>

                {event.children && event.children.length > 0 && (
                  <div className="space-y-3 border-l-2 border-dashed pl-4 ml-1 border-border/40">
                    {event.children.map((child) => (
                      <div key={child.id}>
                        {child.type === "email" && <EmailItem event={child} />}
                        {child.type === "thread" && <ThreadItem event={child} />}
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
  );
}
