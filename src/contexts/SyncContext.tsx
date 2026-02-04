/**
 * 全局同步状态管理
 *
 * 用于在页面切换时保持同步状态
 */
import { createContext, useContext, useState, ReactNode } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useSyncProgress } from "@/hooks/useEventListener";
import { toast } from "sonner";

interface SyncState {
  syncing: boolean;
  syncProgress: { current: number; total: number } | null;
  syncStartTime: number | null;
}

interface SyncContextType extends SyncState {
  startSync: () => Promise<void>;
}

const SyncContext = createContext<SyncContextType | undefined>(undefined);

export function SyncProvider({ children }: { children: ReactNode }) {
  const [syncing, setSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState<{
    current: number;
    total: number;
  } | null>(null);
  const [syncStartTime, setSyncStartTime] = useState<number | null>(null);

  // 全局监听同步进度事件
  useSyncProgress((event) => {
    const { current, total, status } = event;

    if (status === "syncing") {
      setSyncProgress({ current, total });

      // 如果是大量邮件，在开始时显示提示
      if (current === 1 && total > 100) {
        toast.info(`开始同步 ${total} 封邮件`, {
          description: "这可能需要几分钟时间，您可以继续使用其他功能",
          duration: 5000,
        });
      }
    } else if (status === "completed") {
      // 先保存总数，再清空状态
      const totalSynced = syncProgress?.total || total || 0;

      setSyncProgress(null);
      setSyncing(false);
      setSyncStartTime(null);

      toast.success("邮件同步完成", {
        description: `成功同步 ${totalSynced} 封邮件`,
      });
    } else if (status === "failed") {
      setSyncProgress(null);
      setSyncing(false);
      setSyncStartTime(null);

      toast.error("邮件同步失败", {
        description: "请检查网络连接后重试",
      });
    }
  });

  const startSync = async () => {
    setSyncing(true);
    setSyncProgress(null);
    setSyncStartTime(Date.now());

    // 异步执行同步，不阻塞 UI
    (async () => {
      try {
        // 重新获取最新的账户列表
        const currentAccounts = await invoke<any[]>("list_email_accounts");

        if (currentAccounts.length === 0) {
          toast.error("请先添加邮箱账户");
          setSyncing(false);
          setSyncStartTime(null);
          return;
        }

        // 同步所有账户
        for (const account of currentAccounts) {
          await invoke("sync_email_account", {
            request: {
              email: account.email,
              password: null, // OAuth 账户不需要密码
            },
          });
        }
      } catch (err) {
        console.error("Failed to sync emails:", err);
        toast.error("同步失败", {
          description: err?.toString?.() ?? "未知错误",
        });
        setSyncing(false);
        setSyncProgress(null);
        setSyncStartTime(null);
      }
    })();
  };

  return (
    <SyncContext.Provider
      value={{
        syncing,
        syncProgress,
        syncStartTime,
        startSync,
      }}
    >
      {children}
    </SyncContext.Provider>
  );
}

export function useSyncContext() {
  const context = useContext(SyncContext);
  if (context === undefined) {
    throw new Error("useSyncContext must be used within a SyncProvider");
  }
  return context;
}
