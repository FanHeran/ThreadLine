import { useEffect, useMemo, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import {
  Inbox as InboxIcon,
  Paperclip,
  Search,
  RefreshCw,
  Filter,
  Mail,
  Clock,
  Reply,
  Forward,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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

  const attachmentsCount = emails.filter(
    (email) => email.has_attachments,
  ).length;

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

  useEffect(() => {
    if (filteredEmails.length === 0) {
      setSelectedId(null);
      return;
    }
    if (
      selectedId === null ||
      !filteredEmails.some((email) => email.id === selectedId)
    ) {
      setSelectedId(filteredEmails[0].id);
    }
  }, [filteredEmails, selectedId]);

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
    return value.split(" ")[0];
  };

  return (
    <PageContainer className="p-6 gap-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-surface-100 dark:bg-surface-100/10 flex items-center justify-center">
            <InboxIcon className="h-5 w-5" />
          </div>
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              Inbox
            </h1>
            <p className="text-sm text-muted-foreground/80">
              {emails.length} messages, {attachmentsCount} with attachments
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <RefreshCw className="mr-2 h-4 w-4" />
            Sync
          </Button>
          <Button size="sm">
            <Mail className="mr-2 h-4 w-4" />
            Compose
          </Button>
        </div>
      </div>

      <div className="flex-1 min-h-0 grid gap-4 lg:grid-cols-[320px_1fr]">
        <Card className="flex flex-col min-h-0">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="text-base font-medium">All Mail</CardTitle>
              <Badge variant="secondary">{filteredEmails.length}</Badge>
            </div>
            <CardDescription className="text-xs">
              Search or filter to narrow the inbox.
            </CardDescription>
            <div className="flex items-center gap-2 pt-3">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search..."
                  className="pl-9 h-8 text-sm"
                />
              </div>
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
            </div>
          </CardHeader>
          <Separator />
          <CardContent className="flex-1 min-h-0 p-0">
            <ScrollArea className="h-full">
              {loading ? (
                <div className="p-6 text-center text-sm text-muted-foreground/80">
                  Loading emails...
                </div>
              ) : error ? (
                <div className="p-6 text-center text-sm text-destructive">
                  Failed to load inbox: {error}
                </div>
              ) : filteredEmails.length === 0 ? (
                <div className="p-6 text-center text-sm text-muted-foreground/80">
                  {emails.length === 0
                    ? "Inbox is empty."
                    : "No messages match the current filters."}
                </div>
              ) : (
                filteredEmails.map((email) => {
                  const sender = parseSender(email.sender);
                  const isActive = email.id === selectedId;
                  return (
                    <button
                      key={email.id}
                      type="button"
                      onClick={() => setSelectedId(email.id)}
                      className={cn(
                        "group w-full text-left px-4 py-3 border-b border-l-2 border-transparent transition-all duration-150",
                        "hover:bg-surface-50 dark:hover:bg-surface-100/10",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-0",
                        isActive && "bg-surface-100/50 dark:bg-surface-100/20 border-l-primary",
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span
                              className="font-medium truncate text-sm"
                              title={sender.name}
                            >
                              {sender.name}
                            </span>
                            {email.has_attachments && (
                              <Paperclip className="h-3 w-3 text-muted-foreground" />
                            )}
                          </div>
                          <div
                            className="text-sm text-foreground/90 truncate"
                            title={email.subject}
                          >
                            {email.subject}
                          </div>
                          <div className="text-xs text-muted-foreground/80 truncate">
                            {email.preview}
                          </div>
                        </div>
                        <div className="text-xs text-muted-foreground/80 whitespace-nowrap">
                          {formatDate(email.date)}
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        <Card className="flex flex-col min-h-0">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <CardTitle className="text-lg">
                  {selectedEmail
                    ? selectedEmail.subject
                    : "No message selected"}
                </CardTitle>
                {selectedEmail && (
                  <CardDescription className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="flex items-center gap-1">
                      <InboxIcon className="h-3.5 w-3.5" />
                      {parseSender(selectedEmail.sender).name}
                    </span>
                    <Separator orientation="vertical" className="h-4" />
                    <span className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" />
                      {formatDate(selectedEmail.date)}
                    </span>
                    {selectedEmail.has_attachments && (
                      <>
                        <Separator orientation="vertical" className="h-4" />
                        <Badge variant="secondary" className="text-xs">
                          Attachments
                        </Badge>
                      </>
                    )}
                  </CardDescription>
                )}
              </div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" disabled={!selectedEmail}>
                  <Reply className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" disabled={!selectedEmail}>
                  <Forward className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <Separator />
          <CardContent className="flex-1 min-h-0">
            {selectedEmail ? (
              <div className="h-full flex flex-col">
                <div className="text-xs uppercase tracking-wider text-muted-foreground/60 mb-3">
                  Preview
                </div>
                <div className="text-sm leading-relaxed text-foreground/90 whitespace-pre-line">
                  {selectedEmail.preview}
                </div>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-sm text-muted-foreground/60">
                Select a message to view its preview.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}