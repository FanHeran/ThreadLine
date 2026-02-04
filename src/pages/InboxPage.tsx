import { useEffect, useMemo, useState, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useSyncContext } from "@/contexts/SyncContext";
import { useSyncProgress } from "@/hooks/useEventListener";
import {
  Paperclip,
  Search,
  RefreshCw,
  Filter,
  Mail,
  Reply,
  Forward,
  Plus,
  Settings,
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
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { PageContainer } from "@/components/layout/PageContainer";
import { AddAccountSheet } from "@/components/email/AddAccountSheet";

interface EmailPreview {
  id: number;
  account_id: number;
  subject: string | null;
  sender: string | null;
  date: string | null;
  body_text: string | null;
  is_read: boolean;
  has_attachments: boolean;
}

interface EmailAccount {
  email: string;
}

export function InboxPage() {
  // 使用全局同步状态
  const { syncing, syncProgress, syncStartTime, startSync } = useSyncContext();

  const [emails, setEmails] = useState<EmailPreview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "attachments">("all");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [addAccountOpen, setAddAccountOpen] = useState(false);
  const [accounts, setAccounts] = useState<EmailAccount[]>([]);

  // 加载邮箱账户列表
  const loadAccounts = async () => {
    try {
      const data = await invoke<EmailAccount[]>("list_email_accounts");
      setAccounts(data);
    } catch (err) {
      console.error("Failed to load accounts:", err);
    }
  };

  // 加载邮件列表
  const loadEmails = async () => {
    try {
      const data = await invoke<EmailPreview[]>("get_inbox_emails");
      setEmails(data);
      setLoading(false);
      setError(null); // 清除之前的错误
    } catch (err) {
      console.error("Failed to fetch inbox:", err);
      setError(err?.toString?.() ?? "Unknown error");
      setLoading(false);
    }
  };

  // 监听同步进度事件，用于刷新邮件列表
  useSyncProgress((event) => {
    const { current, total, status } = event;

    if (status === "syncing") {
      // 每 20 封邮件刷新一次，让用户看到进度
      if (current % 20 === 0 || current === total) {
        loadEmails();
      }
    } else if (status === "completed") {
      // 同步完成时最后刷新一次
      loadEmails();
    }
  });

  useEffect(() => {
    loadAccounts();
    loadEmails();
  }, []);

  // 计算预计剩余时间
  const estimatedTimeRemaining = useMemo(() => {
    // 只在同步进行中时计算
    if (
      !syncing ||
      !syncProgress ||
      !syncStartTime ||
      syncProgress.current === 0
    ) {
      return null;
    }

    const elapsed = Date.now() - syncStartTime;
    const avgTimePerEmail = elapsed / syncProgress.current;
    const remaining =
      (syncProgress.total - syncProgress.current) * avgTimePerEmail;

    // 转换为友好的时间格式
    const seconds = Math.ceil(remaining / 1000);
    if (seconds < 60) return `约 ${seconds} 秒`;
    const minutes = Math.ceil(seconds / 60);
    if (minutes < 60) return `约 ${minutes} 分钟`;
    const hours = Math.ceil(minutes / 60);
    return `约 ${hours} 小时`;
  }, [syncing, syncProgress, syncStartTime]);

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
        (email.subject?.toLowerCase() || "").includes(normalizedQuery) ||
        (email.sender?.toLowerCase() || "").includes(normalizedQuery) ||
        (email.body_text?.toLowerCase() || "").includes(normalizedQuery)
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
      const diffMinutes = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      if (diffMinutes < 1) return "刚刚";
      if (diffMinutes < 60) return `${diffMinutes}分钟前`;
      if (diffHours < 24) return `${diffHours}小时前`;
      if (diffDays === 1) return "昨天";
      if (diffDays < 7) return `${diffDays}天前`;
      if (diffDays < 30) return `${Math.floor(diffDays / 7)}周前`;

      // 超过30天显示日期
      const year = date.getFullYear();
      const month = date.getMonth() + 1;
      const day = date.getDate();
      const currentYear = now.getFullYear();

      // 如果是今年，只显示月日；如果是往年，显示年月日
      if (year === currentYear) {
        return `${month}月${day}日`;
      } else {
        return `${year}年${month}月${day}日`;
      }
    } catch {
      return "";
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
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={startSync}
              disabled={syncing || accounts.length === 0}
            >
              <RefreshCw className={cn("h-4 w-4", syncing && "animate-spin")} />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="icon" className="h-8 w-8">
                  <Settings className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setAddAccountOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  添加账户
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem disabled>
                  <Mail className="h-4 w-4 mr-2" />
                  {accounts.length} 个账户
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
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

            <Button
              variant="outline"
              size="sm"
              className="h-9 min-w-[120px]"
              onClick={startSync}
              disabled={syncing || accounts.length === 0}
            >
              <RefreshCw
                className={cn("h-4 w-4 mr-2", syncing && "animate-spin")}
              />
              <span className="hidden md:inline">
                {syncing ? (
                  syncProgress ? (
                    <span className="flex flex-col items-start text-xs leading-tight">
                      <span className="font-medium">
                        {syncProgress.current}/{syncProgress.total}
                      </span>
                      {estimatedTimeRemaining && (
                        <span className="text-muted-foreground">
                          {estimatedTimeRemaining}
                        </span>
                      )}
                    </span>
                  ) : (
                    "同步中..."
                  )
                ) : (
                  "同步"
                )}
              </span>
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" className="h-9">
                  <Settings className="h-4 w-4 mr-2" />
                  <span className="hidden md:inline">账户</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setAddAccountOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  添加账户
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem disabled>
                  <Mail className="h-4 w-4 mr-2" />
                  {accounts.length} 个账户
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
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
      <div className="flex-1 min-h-0 min-w-0 rounded-lg border border-border/50 overflow-hidden bg-white/60 dark:bg-surface-100/20 backdrop-blur-md shadow-[inset_0_1px_0_0_rgba(255,255,255,0.6)] dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1)]">
        <ScrollArea className="h-full w-full min-w-0">
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
              const sender = parseSender(email.sender || "Unknown");
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
                    "block w-full min-w-0 text-left px-4 pr-6 py-3 border-b border-border/30 transition-all duration-150",
                    "hover:bg-white/40 dark:hover:bg-surface-100/10",
                    "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-primary",
                    isActive &&
                      "bg-primary/5 dark:bg-primary/10 border-l-2 border-l-primary",
                  )}
                >
                  {/* Header: Sender and Date */}
                  <div className="flex items-center gap-3 mb-1.5">
                    <div className="flex items-center gap-1.5 min-w-0 max-w-[70%]">
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
                    <span className="text-xs text-muted-foreground/70 shrink-0 whitespace-nowrap ml-auto">
                      {formatDate(email.date || "")}
                    </span>
                  </div>

                  {/* Subject */}
                  <div className="text-sm font-medium text-foreground/90 line-clamp-1 break-words mb-1">
                    {email.subject || "(No Subject)"}
                  </div>

                  {/* Preview - 2 lines with ellipsis */}
                  <div className="text-xs text-muted-foreground/70 line-clamp-2 break-all leading-relaxed">
                    {email.body_text || ""}
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
                    {parseSender(selectedEmail.sender || "Unknown").name}
                  </span>
                  <span className="text-muted-foreground/50">•</span>
                  <span>{formatDate(selectedEmail.date || "")}</span>
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
                        {selectedEmail.body_text || "(No content)"}
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

      {/* Add Account Sheet */}
      <AddAccountSheet
        open={addAccountOpen}
        onOpenChange={setAddAccountOpen}
        onAccountAdded={async () => {
          // 重新加载账户列表以更新 UI
          await loadAccounts();
          // 开始同步（使用全局同步状态）
          startSync();
        }}
      />
    </PageContainer>
  );
}
