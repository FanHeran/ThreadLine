import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Mail, Loader2, Info, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface OAuthSetupSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (
    accessToken: string,
    refreshToken: string | undefined,
    expiresIn: number | undefined,
    provider: string,
  ) => void;
  email?: string;
  detectedProvider?: "gmail" | "outlook";
}

interface OAuthConfig {
  provider: string;
  client_id: string;
  client_secret?: string;
}

interface OAuthResult {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  provider: string;
}

export function OAuthSetupSheet({
  open,
  onOpenChange,
  onSuccess,
  email,
  detectedProvider,
}: OAuthSetupSheetProps) {
  const [provider, setProvider] = useState<"gmail" | "outlook">(
    detectedProvider || "gmail",
  );
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [instructions, setInstructions] = useState("");

  const loadInstructions = async (prov: string) => {
    try {
      const inst = await invoke<string>("get_oauth_instructions", {
        provider: prov,
      });
      setInstructions(inst);
    } catch (err) {
      console.error("Failed to load instructions:", err);
    }
  };

  const handleProviderChange = (value: string) => {
    const prov = value as "gmail" | "outlook";
    setProvider(prov);
    loadInstructions(prov);
    setError(null);
  };

  const handleStartOAuth = async () => {
    setLoading(true);
    setError(null);

    try {
      const config: OAuthConfig = {
        provider,
        client_id: clientId.trim(),
        client_secret: clientSecret.trim() || undefined,
      };

      const result = await invoke<OAuthResult>("start_oauth_flow", { config });

      // 成功后回调
      onSuccess(
        result.access_token,
        result.refresh_token,
        result.expires_in,
        result.provider,
      );
      onOpenChange(false);

      // 重置表单
      setClientId("");
      setClientSecret("");
    } catch (err) {
      setError(err?.toString() || "OAuth 认证失败");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl bg-white/95 dark:bg-surface-100/95 backdrop-blur-xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            OAuth 2.0 认证设置
          </SheetTitle>
          <SheetDescription>
            {email ? (
              <>
                正在为{" "}
                <span className="font-medium text-foreground">{email}</span>{" "}
                配置 OAuth 认证
              </>
            ) : (
              "使用 OAuth 2.0 安全连接您的邮箱账户"
            )}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* 选择提供商 */}
          <Tabs value={provider} onValueChange={handleProviderChange}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="gmail">Gmail</TabsTrigger>
              <TabsTrigger value="outlook">Outlook</TabsTrigger>
            </TabsList>

            <TabsContent value="gmail" className="space-y-4 mt-4">
              <div className="rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 p-4">
                <div className="flex items-start gap-2">
                  <Info className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
                  <div className="text-sm text-blue-900 dark:text-blue-100">
                    <p className="font-medium mb-1">Gmail OAuth 配置</p>
                    <p className="text-xs text-blue-700 dark:text-blue-300">
                      需要在 Google Cloud Console 创建 OAuth 客户端
                    </p>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="outlook" className="space-y-4 mt-4">
              <div className="rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 p-4">
                <div className="flex items-start gap-2">
                  <Info className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
                  <div className="text-sm text-blue-900 dark:text-blue-100">
                    <p className="font-medium mb-1">Outlook OAuth 配置</p>
                    <p className="text-xs text-blue-700 dark:text-blue-300">
                      需要在 Azure Portal 注册应用程序
                    </p>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>

          {/* 配置说明 */}
          {instructions && (
            <div className="rounded-lg bg-muted/50 p-4">
              <div className="flex items-start gap-2 mb-2">
                <ExternalLink className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                <h3 className="text-sm font-medium">配置步骤</h3>
              </div>
              <pre className="text-xs text-muted-foreground whitespace-pre-wrap font-mono">
                {instructions}
              </pre>
            </div>
          )}

          {/* 客户端配置 */}
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                客户端 ID (可选)
              </label>
              <Input
                type="text"
                placeholder="留空使用内置凭据"
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                disabled={loading}
              />
              <p className="text-xs text-muted-foreground">
                如果你有自己的 OAuth
                客户端，可以在这里输入。否则将使用应用内置的凭据。
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                客户端密钥 (可选)
              </label>
              <Input
                type="password"
                placeholder="留空使用内置凭据"
                value={clientSecret}
                onChange={(e) => setClientSecret(e.target.value)}
                disabled={loading}
              />
            </div>
          </div>

          {/* 错误提示 */}
          {error && (
            <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          {/* 操作按钮 */}
          <div className="flex gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
              className="flex-1"
            >
              取消
            </Button>
            <Button
              onClick={handleStartOAuth}
              disabled={loading}
              className="flex-1"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  授权中...
                </>
              ) : (
                "开始授权"
              )}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
