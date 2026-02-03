import { useEffect, useMemo, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import {
  Paperclip,
  Search,
  RefreshCw,
  Filter,
  Mail,
  Reply,
  Forward,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { PageContainer } from "@/components/layout/PageContainer";

interface EmailPreview {
  id: number;
  subject: string;
  sender: string;
  date: string;
  preview: string;
  has_attachments: boolean;
}

export function InboxPage() {
  const [emails, setEmails] = useState<EmailPreview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "attachments">("all");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  useEffect(() => {
    invoke<EmailPreview[]>("get_inbox_emails")
      .then((data) => {
        setEmails(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to fetch inbox:", err);
        setError(err?.toString?.() ?? "Unknown error");
        setLoading(false);
      });
  }, []);

  const filteredEmails = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return emails.filter((email) => {
      if (filter === "attachments" && !email.has_attachments) {
        return false;
      }
      if (!normalizedQuery) {
        return true;
      }
      return (
        email.subject.toLowerCase().includes(normalizedQuery) ||
        email.sender.toLowerCase().includes(normalizedQuery) ||
        email.preview.toLowerCase().includes(normalizedQuery)
      );
    });
  }, [emails, filter, query]);

  const selectedEmail =
    selectedId === null
      ? null
      : (filteredEmails.find((email) => email.id === selectedId) ?? null);

  const parseSender = (raw: string) => {
    if (!raw) {
      return { name: "Unknown", address: "" };
    }
    if (raw.includes("<") && raw.includes(">")) {
      const name = raw.split("<")[0].trim();
      const address = raw.split("<")[1].replace(">", "").trim();
      return { name: name || address, address };
    }
    return { name: raw.trim(), address: "" };
  };

  const formatDate = (value: string) => {
    if (!value) return "";
    try {
      const date = new Date(value);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      if (diffDays === 0) return "Today";
      if (diffDays === 1) return "Yesterday";
      if (diffDays < 7) return `${diffDays}d ago`;
      return value.split(" ")[0];
    } catch {
      return value.split(" ")[0];
    }
  };

  return (
    <PageContainer className="p-6 bg-muted/30">
      {/* Toolbar - Responsive */}
      <div className="flex flex-col gap-3 mb-6 shrink-0">
        {/* Title Row */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-foreground">
              Inbox
            </h1>
            <Badge variant="secondary" className="text-xs">
              {filteredEmails.length}
            </Badge>
          </div>
          {/* Mobile: Icon buttons */}
          <div className="flex items-center gap-1 sm:hidden">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" className="h-8 w-8">
                  <Filter className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setFilter("all")}>
                  All messages
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setFilter("attachments")}>
                  With attachments
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button variant="outline" size="icon" className="h-8 w-8">
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button size="icon" className="h-8 w-8">
              <Mail className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Search and Actions Row - Desktop only */}
        <div className="hidden sm:flex items-center gap-2">
          {/* Search Bar */}
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search emails..."
              className="pl-9 h-9 text-sm w-full"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-9">
                  <Filter className="h-4 w-4 mr-2" />
                  {filter === "all" ? "All" : "Attachments"}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setFilter("all")}>
                  All messages
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setFilter("attachments")}>
                  With attachments
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button variant="outline" size="sm" className="h-9">
              <RefreshCw className="h-4 w-4 mr-2" />
              <span className="hidden md:inline">Sync</span>
            </Button>
            <Button size="sm" className="h-9">
              <Mail className="h-4 w-4 mr-2" />
              <span className="hidden md:inline">Compose</span>
            </Button>
          </div>
        </div>

        {/* Search Bar - Mobile only */}
        <div className="relative sm:hidden">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search emails..."
            className="pl-9 h-9 text-sm w-full"
          />
        </div>
      </div>

      {/* Email List - Full Width */}
      <div className="flex-1 min-h-0 rounded-lg border border-border/50 overflow-hidden bg-white/60 dark:bg-surface-100/20 backdrop-blur-md shadow-[inset_0_1px_0_0_rgba(255,255,255,0.6)] dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1)]">
        <ScrollArea className="h-full">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <RefreshCw className="h-8 w-8 text-muted-foreground/40 animate-spin mb-3" />
              <p className="text-sm text-muted-foreground/70">
                Loading emails...
              </p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Mail className="h-8 w-8 text-destructive/60 mb-3" />
              <p className="text-sm font-medium text-destructive">
                Failed to load inbox
              </p>
              <p className="text-xs text-muted-foreground/60 mt-1">{error}</p>
            </div>
          ) : filteredEmails.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Mail className="h-8 w-8 text-muted-foreground/40 mb-3" />
              <p className="text-sm font-medium text-foreground/70">
                {emails.length === 0 ? "Inbox is empty" : "No messages found"}
              </p>
              <p className="text-xs text-muted-foreground/60 mt-1">
                {emails.length === 0
                  ? "No messages to display"
                  : "Try adjusting your search"}
              </p>
            </div>
          ) : (
            filteredEmails.map((email) => {
              const sender = parseSender(email.sender);
              const isActive = email.id === selectedId;
              return (
                <button
                  key={email.id}
                  type="button"
                  onClick={() => {
                    setSelectedId(email.id);
                    setSheetOpen(true);
                  }}
                  className={cn(
                    "block w-full min-w-0 text-left px-4 py-2.5 border-b border-border/30 transition-all duration-150 overflow-hidden",
                    "hover:bg-white/40 dark:hover:bg-surface-100/10",
                    "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-primary",
                    isActive &&
                      "bg-primary/5 dark:bg-primary/10 border-l-2 border-l-primary",
                  )}
                >
                  {/* Header: Sender and Date */}
                  <div className="flex items-start gap-2 mb-1 min-w-0">
                    <div className="flex items-center gap-1.5 min-w-0 flex-1">
                      <span
                        className="font-semibold text-sm text-foreground truncate"
                        title={sender.name}
                      >
                        {sender.name}
                      </span>
                      {email.has_attachments && (
                        <Paperclip className="h-3 w-3 text-muted-foreground shrink-0" />
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground/70 shrink-0 whitespace-nowrap">
                      {formatDate(email.date)}
                    </span>
                  </div>

                  {/* Subject */}
                  <div className="text-sm text-foreground/80 line-clamp-1 break-words mb-0.5">
                    {email.subject}
                  </div>

                  {/* Preview */}
                  <div className="text-xs text-muted-foreground/70 line-clamp-1 break-words">
                    {email.preview}
                  </div>
                </button>
              );
            })
          )}
        </ScrollArea>
      </div>

      {/* Email Detail Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-full sm:max-w-2xl bg-white/95 dark:bg-surface-100/95 backdrop-blur-xl">
          {selectedEmail ? (
            <>
              <SheetHeader className="space-y-3">
                <SheetTitle className="text-xl font-semibold text-foreground pr-8">
                  {selectedEmail.subject}
                </SheetTitle>
                <SheetDescription className="flex flex-wrap items-center gap-3 text-sm">
                  <span className="font-medium text-foreground">
                    {parseSender(selectedEmail.sender).name}
                  </span>
                  <span className="text-muted-foreground/50">•</span>
                  <span>{formatDate(selectedEmail.date)}</span>
                  {selectedEmail.has_attachments && (
                    <>
                      <span className="text-muted-foreground/50">•</span>
                      <span className="flex items-center gap-1.5">
                        <Paperclip className="h-3.5 w-3.5" />
                        Attachments
                      </span>
                    </>
                  )}
                </SheetDescription>
              </SheetHeader>

              <div className="mt-6 space-y-4">
                <div className="flex items-center gap-2">
                  <Button variant="default" size="sm">
                    <Reply className="h-4 w-4 mr-2" />
                    Reply
                  </Button>
                  <Button variant="outline" size="sm">
                    <Forward className="h-4 w-4 mr-2" />
                    Forward
                  </Button>
                </div>

                <div className="pt-4 border-t border-border/50">
                  <ScrollArea className="h-[calc(100vh-280px)]">
                    <div className="pr-4">
                      <div className="text-sm leading-relaxed text-foreground/90 whitespace-pre-line">
                        {selectedEmail.preview}
                      </div>
                    </div>
                  </ScrollArea>
                </div>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <Mail className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground/60">
                  No message selected
                </p>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </PageContainer>
  );
}
