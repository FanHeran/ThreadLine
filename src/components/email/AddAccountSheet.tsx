import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Mail, Loader2, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { OAuthSetupSheet } from "./OAuthSetupSheet";

interface Provider {
  name: string;
  host: string;
  port: number;
  use_tls: boolean;
  supports_oauth: boolean;
}

interface AddAccountSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAccountAdded: () => void;
}

export function AddAccountSheet({
  open,
  onOpenChange,
  onAccountAdded,
}: AddAccountSheetProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detectedProvider, setDetectedProvider] = useState<Provider | null>(
    null,
  );
  const [oauthSheetOpen, setOAuthSheetOpen] = useState(false);

  const handleEmailChange = async (value: string) => {
    setEmail(value);
    setError(null);

    // 检测邮箱服务商
    if (value.includes("@")) {
      const parts = value.split("@");
      const domain = parts[1]?.toLowerCase().trim();

      // 确保域名部分存在且包含点号（基本的邮箱格式验证）
      if (!domain || !domain.includes(".") || domain.length < 3) {
        setDetectedProvider(null);
        return;
      }

      try {
        const providers = await invoke<Provider[]>("get_email_providers");
        const domainPrefix = domain.split(".")[0];

        // 确保域名前缀不为空
        if (!domainPrefix) {
          setDetectedProvider(null);
          return;
        }

        const provider = providers.find((p) =>
          p.name.toLowerCase().includes(domainPrefix),
        );
        setDetectedProvider(provider || null);

        // 如果是 Gmail 或 Outlook，自动打开 OAuth 对话框
        if (
          provider?.supports_oauth &&
          (provider.name.toLowerCase().includes("gmail") ||
            provider.name.toLowerCase().includes("outlook"))
        ) {
          // 延迟一下，让用户看到检测到的提供商
          setTimeout(() => {
            setOAuthSheetOpen(true);
          }, 500);
        }
      } catch (err) {
        console.error("Failed to detect provider:", err);
      }
    } else {
      setDetectedProvider(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await invoke("add_email_account", {
        email,
        password,
      });

      // 成功后重置表单
      setEmail("");
      setPassword("");
      setDetectedProvider(null);
      onAccountAdded();
      onOpenChange(false);
    } catch (err) {
      console.error("Failed to add account:", err);
      const errorMessage =
        typeof err === "string"
          ? err
          : (err as any)?.message ||
            JSON.stringify(err) ||
            "Failed to add account";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleOAuthSuccess = async (
    accessToken: string,
    refreshToken: string | undefined,
    expiresIn: number | undefined,
    provider: string,
  ) => {
    setLoading(true);
    setError(null);

    try {
      await invoke("add_oauth_email_account", {
        request: {
          email,
          provider,
          access_token: accessToken,
          refresh_token: refreshToken,
          expires_in: expiresIn,
        },
      });

      // 成功后重置表单
      setEmail("");
      setPassword("");
      setDetectedProvider(null);
      onAccountAdded();
      onOpenChange(false);
    } catch (err) {
      console.error("Failed to add OAuth account:", err);
      const errorMessage =
        typeof err === "string"
          ? err
          : (err as any)?.message ||
            JSON.stringify(err) ||
            "Failed to add OAuth account";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleUseOAuth = () => {
    if (!detectedProvider?.supports_oauth) {
      setError("此邮箱服务商不支持 OAuth 认证");
      return;
    }
    setOAuthSheetOpen(true);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md bg-white/95 dark:bg-surface-100/95 backdrop-blur-xl">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            添加邮箱账户
          </SheetTitle>
          <SheetDescription>连接您的邮箱账户以同步邮件</SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          {/* 邮箱地址 */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              邮箱地址
            </label>
            <Input
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => handleEmailChange(e.target.value)}
              required
              disabled={loading}
            />
            {detectedProvider && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Badge variant="secondary" className="text-xs">
                  {detectedProvider.name}
                </Badge>
                <span>已自动检测</span>
              </div>
            )}
          </div>

          {/* 密码/授权码 - Gmail 和 Outlook 不显示 */}
          {detectedProvider &&
            !detectedProvider.name.toLowerCase().includes("gmail") &&
            !detectedProvider.name.toLowerCase().includes("outlook") && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  {detectedProvider?.name.includes("QQ") ||
                  detectedProvider?.name.includes("163") ||
                  detectedProvider?.name.includes("126")
                    ? "授权码"
                    : "密码"}
                </label>
                <Input
                  type="password"
                  placeholder={
                    detectedProvider?.name.includes("QQ") ||
                    detectedProvider?.name.includes("163") ||
                    detectedProvider?.name.includes("126")
                      ? "请输入邮箱授权码"
                      : "请输入密码"
                  }
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                />
                {(detectedProvider?.name.includes("QQ") ||
                  detectedProvider?.name.includes("163") ||
                  detectedProvider?.name.includes("126")) && (
                  <p className="text-xs text-muted-foreground">
                    请在邮箱设置中生成授权码，不是登录密码
                  </p>
                )}
              </div>
            )}

          {/* OAuth 选项 */}
          {detectedProvider?.supports_oauth && (
            <div className="pt-2 border-t border-border/50">
              {detectedProvider.name.toLowerCase().includes("gmail") ||
              detectedProvider.name.toLowerCase().includes("outlook") ? (
                <>
                  <p className="text-xs text-muted-foreground mb-2">
                    {detectedProvider.name} 使用 OAuth 2.0 安全认证
                  </p>
                  <Button
                    type="button"
                    variant="default"
                    onClick={handleUseOAuth}
                    disabled={loading}
                    className="w-full"
                  >
                    <Shield className="h-4 w-4 mr-2" />
                    继续使用 OAuth 认证
                  </Button>
                </>
              ) : (
                <>
                  <p className="text-xs text-muted-foreground mb-2">
                    或使用更安全的 OAuth 2.0 认证
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleUseOAuth}
                    disabled={loading}
                    className="w-full"
                  >
                    <Shield className="h-4 w-4 mr-2" />
                    使用 OAuth 认证
                  </Button>
                </>
              )}
            </div>
          )}

          {/* 错误提示 */}
          {error && (
            <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          {/* 提交按钮 - Gmail 和 Outlook 不显示 */}
          {detectedProvider &&
            !detectedProvider.name.toLowerCase().includes("gmail") &&
            !detectedProvider.name.toLowerCase().includes("outlook") && (
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
                <Button type="submit" disabled={loading} className="flex-1">
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      连接中...
                    </>
                  ) : (
                    "添加账户"
                  )}
                </Button>
              </div>
            )}

          {/* Gmail/Outlook 只显示取消按钮 */}
          {detectedProvider &&
            (detectedProvider.name.toLowerCase().includes("gmail") ||
              detectedProvider.name.toLowerCase().includes("outlook")) && (
              <div className="flex gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={loading}
                  className="w-full"
                >
                  取消
                </Button>
              </div>
            )}
        </form>
      </SheetContent>

      {/* OAuth Setup Sheet */}
      <OAuthSetupSheet
        open={oauthSheetOpen}
        onOpenChange={setOAuthSheetOpen}
        onSuccess={handleOAuthSuccess}
        email={email}
        detectedProvider={
          detectedProvider?.name.toLowerCase().includes("gmail")
            ? "gmail"
            : detectedProvider?.name.toLowerCase().includes("outlook")
              ? "outlook"
              : undefined
        }
      />
    </Sheet>
  );
}
