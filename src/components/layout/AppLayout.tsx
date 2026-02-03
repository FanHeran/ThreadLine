import React, { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Inbox,
  Files,
  Search,
  Settings,
  LayoutGrid,
  Menu,
} from "lucide-react";

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
        ? "bg-surface-100/80 text-foreground font-medium shadow-[inset_0_0_0_1px_hsl(var(--border)/0.35)] dark:bg-surface-100/20"
        : "text-muted-foreground font-normal hover:text-foreground hover:bg-surface-100/60 dark:hover:bg-surface-100/15",
    )}
    onClick={onClick}
  >
    {/* Active indicator */}
    {isActive && (
      <span
        className={cn(
          "absolute top-1/2 -translate-y-1/2 h-4 w-[2px] rounded-full bg-primary/80",
          collapsed ? "left-1" : "left-1",
        )}
      />
    )}
    <Icon
      className={cn(
        "h-[18px] w-[18px] transition-transform duration-200",
        collapsed ? "" : "mr-2.5",
        !isActive && "group-hover:scale-105",
      )}
    />
    {!collapsed && <span className="truncate">{label}</span>}
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
          "relative flex flex-col border-r border-border/50 bg-gradient-to-b from-surface-50/90 via-surface-50/70 to-surface-50/50 dark:from-surface-50/22 dark:via-surface-50/14 dark:to-surface-50/8 backdrop-blur-2xl shadow-[inset_0_1px_0_hsl(var(--border)/0.4)] transition-all duration-300 ease-out",
          collapsed ? "w-[60px]" : "w-[224px]",
        )}
      >
        {/* Logo */}
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
              "ml-auto h-8 w-8 rounded-full hover:bg-surface-100/70 dark:hover:bg-surface-100/20",
              collapsed && "mx-auto"
            )}
            onClick={() => setCollapsed(!collapsed)}
          >
            <Menu className="h-4 w-4" />
          </Button>
        </div>
        <Separator className="mx-2 opacity-40" />

        {/* Search Bar */}
        {!collapsed && (
          <div className="p-3">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/70" />
              <Input
                placeholder="Search..."
                className="h-9 pl-9 bg-surface-100/60 border border-border/40 shadow-[inset_0_1px_0_rgba(255,255,255,0.5)] dark:bg-surface-100/20 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] focus-visible:ring-1 focus-visible:ring-ring/40 focus-visible:border-border/60 placeholder:text-muted-foreground/70"
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

        <Separator className="mx-2 opacity-40" />
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
