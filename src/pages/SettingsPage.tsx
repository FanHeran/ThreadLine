import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { PageContainer } from "@/components/layout/PageContainer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Save, RefreshCw, RotateCcw } from "lucide-react";

interface SyncSettings {
  id: number;
  max_sync_count: number;
  auto_sync_enabled: boolean;
  sync_interval_minutes: number;
  sync_attachments: boolean;
  created_at: string;
  updated_at: string;
}

export const SettingsPage = () => {
  const [settings, setSettings] = useState<SyncSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);

  // 加载设置
  const loadSettings = async () => {
    try {
      setLoading(true);
      const data = await invoke<SyncSettings>("get_sync_settings");
      setSettings(data);
    } catch (err) {
      toast.error("加载设置失败", {
        description: err?.toString?.() ?? "未知错误",
      });
    } finally {
      setLoading(false);
    }
  };

  // 重置同步状态
  const handleResetSync = async () => {
    if (
      !confirm(
        "确定要重置同步状态吗？\n\n这将删除所有已同步的邮件和项目，并重新从最新的邮件开始同步。",
      )
    ) {
      return;
    }

    try {
      setResetting(true);
      // 获取当前账户邮箱
      const accounts = await invoke<Array<{ email: string }>>(
        "list_email_accounts",
      );
      if (accounts.length === 0) {
        toast.error("没有找到邮箱账户");
        return;
      }

      const email = accounts[0].email;
      await invoke("reset_account_sync", { email });

      toast.success("同步状态已重置", {
        description: "请点击同步按钮重新同步最新的邮件",
      });
    } catch (err) {
      toast.error("重置失败", {
        description: err?.toString?.() ?? "未知错误",
      });
    } finally {
      setResetting(false);
    }
  };

  // 保存设置
  const handleSave = async () => {
    if (!settings) return;

    try {
      setSaving(true);
      await invoke("update_sync_settings", {
        request: {
          max_sync_count: settings.max_sync_count,
          auto_sync_enabled: settings.auto_sync_enabled,
          sync_interval_minutes: settings.sync_interval_minutes,
          sync_attachments: settings.sync_attachments,
        },
      });
      toast.success("设置已保存");
      loadSettings(); // 重新加载以获取更新时间
    } catch (err) {
      toast.error("保存设置失败", {
        description: err?.toString?.() ?? "未知错误",
      });
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  if (loading || !settings) {
    return (
      <PageContainer title="设置" subtitle="配置应用程序选项">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer title="设置" subtitle="配置应用程序选项">
      <div className="max-w-3xl space-y-6">
        {/* 邮件同步设置 */}
        <Card>
          <CardHeader>
            <CardTitle>邮件同步</CardTitle>
            <CardDescription>配置邮件同步行为和限制</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* 最大同步数量 */}
            <div className="space-y-2">
              <Label htmlFor="max-sync">每次同步最大邮件数</Label>
              <div className="flex items-center gap-4">
                <Input
                  id="max-sync"
                  type="number"
                  min="10"
                  max="999999"
                  value={settings.max_sync_count}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      max_sync_count: parseInt(e.target.value) || 100,
                    })
                  }
                  disabled={settings.max_sync_count === 999999}
                  className="flex-1"
                />
                <Button
                  variant={
                    settings.max_sync_count === 999999 ? "default" : "outline"
                  }
                  size="sm"
                  onClick={() =>
                    setSettings({
                      ...settings,
                      max_sync_count:
                        settings.max_sync_count === 999999 ? 100 : 999999,
                    })
                  }
                >
                  {settings.max_sync_count === 999999 ? "✓ 全部" : "全部"}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                {settings.max_sync_count === 999999
                  ? "将同步邮箱中的所有邮件（可能需要较长时间）"
                  : "限制每次同步下载的邮件数量，避免首次同步时间过长"}
              </p>
            </div>

            <Separator />

            {/* 自动同步 */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="auto-sync">启用自动同步</Label>
                <p className="text-xs text-muted-foreground">
                  定期自动同步新邮件
                </p>
              </div>
              <Switch
                id="auto-sync"
                checked={settings.auto_sync_enabled}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, auto_sync_enabled: checked })
                }
              />
            </div>

            {/* 同步间隔 */}
            {settings.auto_sync_enabled && (
              <div className="space-y-2">
                <Label htmlFor="sync-interval">同步间隔（分钟）</Label>
                <Input
                  id="sync-interval"
                  type="number"
                  min="5"
                  max="120"
                  value={settings.sync_interval_minutes}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      sync_interval_minutes: parseInt(e.target.value) || 15,
                    })
                  }
                />
              </div>
            )}

            <Separator />

            {/* 同步附件 */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="sync-attachments">同步附件</Label>
                <p className="text-xs text-muted-foreground">
                  下载并保存邮件附件到本地
                </p>
              </div>
              <Switch
                id="sync-attachments"
                checked={settings.sync_attachments}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, sync_attachments: checked })
                }
              />
            </div>

            <Separator />

            {/* 重置同步状态 */}
            <div className="space-y-2">
              <Label>重置同步状态</Label>
              <p className="text-xs text-muted-foreground">
                删除所有已同步的邮件和项目，重新从最新的邮件开始同步
              </p>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleResetSync}
                disabled={resetting}
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                {resetting ? "重置中..." : "重置同步"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* 保存按钮 */}
        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={saving}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? "保存中..." : "保存设置"}
          </Button>
        </div>

        {/* 更新时间 */}
        <p className="text-xs text-muted-foreground text-right">
          最后更新：{new Date(settings.updated_at).toLocaleString("zh-CN")}
        </p>
      </div>
    </PageContainer>
  );
};
