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
  children?: TimelineEvent[]; // For threads or milestone children
  status?: string; // For milestones e.g. 'signed'
};

const AttachmentChip = ({ file }: { file: Attachment }) => (
  <Badge
    variant="outline"
    className="flex items-center gap-1 font-normal py-1 px-2 cursor-pointer hover:bg-accent"
  >
    <Paperclip className="h-3 w-3 text-muted-foreground" />
    <span className="truncate max-w-[150px]">{file.name}</span>
    <span className="text-xs text-muted-foreground ml-1">{file.size}</span>
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
        "relative p-4 rounded-lg border bg-card text-card-foreground shadow-sm",
        isThreadChild && "mt-2 bg-muted/30 border-dashed",
      )}
    >
      <div className="flex justify-between items-start mb-2">
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center">
            <User className="h-3.5 w-3.5 text-primary" />
          </div>
          <div>
            <div className="font-medium text-sm">{event.sender}</div>
            <div className="text-xs text-muted-foreground">{event.date}</div>
          </div>
        </div>
        <Button variant="ghost" size="icon" className="h-6 w-6">
          <MoreVertical className="h-4 w-4 text-muted-foreground" />
        </Button>
      </div>

      <div className="text-sm text-foreground/80 mb-3 whitespace-pre-wrap">
        {event.content}
      </div>

      {event.attachments && event.attachments.length > 0 && (
        <div className="flex flex-wrap gap-2">
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
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="space-y-2">
      <div className="relative">
        <div className="absolute left-[-26px] top-3 h-full w-[2px] bg-border/50 -z-10" />
        <CollapsibleTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-between h-auto py-2 px-3 border-dashed"
          >
            <div className="flex items-center gap-2 text-muted-foreground">
              <Mail className="h-4 w-4" />
              <span>Thread ({emailCount} messages)</span>
            </div>
            {isOpen ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </Button>
        </CollapsibleTrigger>

        <CollapsibleContent className="space-y-2 pt-2">
          {event.children?.map((child) => (
            <EmailItem key={child.id} event={child} isThreadChild />
          ))}
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
};

export function TimelineView({ events }: { events: TimelineEvent[] }) {
  return (
    <div className="relative pl-6 space-y-8 pb-10">
      {/* Vertical Line */}
      <div className="absolute left-[7px] top-2 bottom-0 w-[2px] bg-border" />

      {events.map((event) => (
        <div key={event.id} className="relative">
          {/* Node Icon */}
          <div
            className={cn(
              "absolute left-[-23px] top-1 h-4 w-4 rounded-full border-2 border-background z-10 box-content",
              event.type === "milestone"
                ? "bg-blue-500 border-blue-500 text-white"
                : "bg-muted border-border",
            )}
          >
            {event.type === "milestone" && (
              <CheckCircle2 className="h-3 w-3 ml-[0.5px] mt-[0.5px]" />
            )}
          </div>

          {/* Content */}
          <div className="pl-4">
            {event.type === "milestone" && (
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-4">
                  <span className="font-semibold text-lg">{event.title}</span>
                  <Badge variant="secondary" className="text-xs font-normal">
                    {event.date}
                  </Badge>
                </div>

                {/* Render children events connected to this milestone */}
                {event.children && (
                  <div className="space-y-6 border-l-2 border-dashed pl-6 ml-[-22px] border-border/40 py-2">
                    {event.children.map((child) => (
                      <div key={child.id}>
                        {child.type === "email" && <EmailItem event={child} />}
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
  );
}
