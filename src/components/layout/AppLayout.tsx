import React, { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { useLocation, useNavigate } from "react-router-dom";
import { Inbox, Files, Search, Settings, LayoutGrid, Menu } from "lucide-react";

interface SidebarItemProps {
  icon: React.ElementType;
  label: string;
  isActive?: boolean;
  onClick?: () => void;
  collapsed?: boolean;
}

const SidebarItem = ({
  icon: Icon,
  label,
  isActive,
  onClick,
  collapsed,
}: SidebarItemProps) => (
  <Button
    variant="ghost"
    className={cn(
      "group w-full justify-start relative overflow-hidden rounded-lg text-[13px] transition-all duration-200",
      collapsed ? "px-2.5 justify-center" : "px-3",
      isActive
        ? "bg-white/80 dark:bg-surface-100/35 text-foreground font-semibold shadow-[0_2px_4px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.8)] dark:shadow-[0_2px_4px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.1)] border border-border/60 backdrop-blur-sm"
        : "text-muted-foreground font-normal hover:text-foreground hover:bg-white/40 dark:hover:bg-surface-100/15",
    )}
    onClick={onClick}
  >
    {/* Active indicator - 增强版 */}
    {isActive && (
      <>
        {/* 左侧主指示器 */}
        <span
          className={cn(
            "absolute top-1/2 -translate-y-1/2 h-5 w-[3px] rounded-full bg-primary shadow-[0_0_8px_rgba(var(--primary),0.4)]",
            collapsed ? "left-1" : "left-1",
          )}
        />
        {/* 玻璃态高光层 */}
        <span className="absolute inset-0 bg-gradient-to-r from-primary/5 via-primary/0 to-transparent opacity-60" />
      </>
    )}
    <Icon
      className={cn(
        "h-[18px] w-[18px] transition-all duration-200 relative z-10",
        collapsed ? "" : "mr-2.5",
        isActive ? "text-primary scale-105" : "group-hover:scale-105",
      )}
    />
    {!collapsed && <span className="truncate relative z-10">{label}</span>}
  </Button>
);

export const AppLayout = ({ children }: { children: React.ReactNode }) => {
  const [collapsed, setCollapsed] = useState(false);
  const [activeItem, setActiveItem] = useState("projects");
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (location.pathname.startsWith("/artifacts")) {
      setActiveItem("artifacts");
    } else if (location.pathname.startsWith("/projects")) {
      setActiveItem("projects");
    } else if (location.pathname.startsWith("/inbox")) {
      setActiveItem("inbox");
    }
  }, [location.pathname]);

  return (
    <div className="flex h-screen w-full bg-transparent overflow-hidden">
      {/* Sidebar */}
      <div
        className={cn(
          "relative flex flex-col border-r border-border/40",
          // 微妙渐变背景 + 玻璃态效果
          "bg-gradient-to-b from-white/80 via-white/60 to-white/40",
          "dark:from-surface-50/25 dark:via-surface-50/15 dark:to-surface-50/8",
          // 背景模糊和噪点
          "backdrop-blur-xl",
          // 内阴影和边框高光
          "shadow-[inset_1px_0_0_rgba(255,255,255,0.1),inset_0_1px_0_rgba(255,255,255,0.05)]",
          "dark:shadow-[inset_1px_0_0_rgba(255,255,255,0.03),inset_0_1px_0_rgba(255,255,255,0.02)]",
          // 右侧微妙阴影
          "shadow-[2px_0_8px_rgba(0,0,0,0.04)]",
          "dark:shadow-[2px_0_12px_rgba(0,0,0,0.3)]",
          "transition-all duration-300 ease-out",
          collapsed ? "w-[60px]" : "w-[224px]",
        )}
      >
        {/* Header */}
        <div className="flex h-14 items-center px-3 py-2">
          {!collapsed && (
            <span className="text-[15px] font-semibold text-foreground/90 tracking-tight">
              ThreadLine
            </span>
          )}
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "h-8 w-8 rounded-full hover:bg-surface-100/70 dark:hover:bg-surface-100/20",
              collapsed ? "mx-auto" : "ml-auto",
            )}
            onClick={() => setCollapsed(!collapsed)}
          >
            <Menu className="h-4 w-4" />
          </Button>
        </div>
        <Separator className="mx-2 opacity-30" />

        {/* Search Bar */}
        {!collapsed && (
          <div className="p-3">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/70" />
              <Input
                placeholder="Search..."
                className="h-9 pl-9 bg-white/50 dark:bg-surface-100/20 border border-border/30 shadow-[inset_0_1px_0_rgba(255,255,255,0.6)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] focus-visible:ring-1 focus-visible:ring-ring/40 focus-visible:border-border/60 focus-visible:bg-white dark:focus-visible:bg-surface-100/30 placeholder:text-muted-foreground/60 transition-colors"
              />
            </div>
          </div>
        )}

        <ScrollArea className="flex-1 px-2 py-2 scrollbar-thin">
          <div className="space-y-1">
            <SidebarItem
              icon={LayoutGrid}
              label="Projects"
              isActive={activeItem === "projects"}
              onClick={() => {
                setActiveItem("projects");
                navigate("/projects");
              }}
              collapsed={collapsed}
            />
            <SidebarItem
              icon={Files}
              label="Artifacts"
              isActive={activeItem === "artifacts"}
              onClick={() => {
                setActiveItem("artifacts");
                navigate("/artifacts");
              }}
              collapsed={collapsed}
            />
            <SidebarItem
              icon={Inbox}
              label="Inbox"
              isActive={activeItem === "inbox"}
              onClick={() => {
                setActiveItem("inbox");
                navigate("/inbox");
              }}
              collapsed={collapsed}
            />
          </div>
        </ScrollArea>

        <Separator className="mx-2 opacity-30" />
        <div className="p-2">
          <SidebarItem
            icon={Settings}
            label="Settings"
            isActive={activeItem === "settings"}
            onClick={() => setActiveItem("settings")}
            collapsed={collapsed}
          />
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        <main className="flex-1 overflow-hidden flex flex-col min-h-0">
          {children}
        </main>
      </div>
    </div>
  );
};
