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
  Plus,
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
    variant={isActive ? "secondary" : "ghost"}
    className={cn(
      "w-full justify-start",
      collapsed ? "px-2 justify-center" : "px-4",
    )}
    onClick={onClick}
  >
    <Icon className={cn("h-4 w-4", collapsed ? "mr-0" : "mr-2")} />
    {!collapsed && <span>{label}</span>}
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
    }
  }, [location.pathname]);

  return (
    <div className="flex h-screen w-full bg-background overflow-hidden">
      {/* Sidebar */}
      <div
        className={cn(
          "flex flex-col border-r bg-card transition-all duration-300",
          collapsed ? "w-[60px]" : "w-[240px]",
        )}
      >
        <div className="flex h-[52px] items-center px-4 py-2">
          {!collapsed && (
            <span className="font-bold text-lg tracking-tight">ThreadLine</span>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="ml-auto"
            onClick={() => setCollapsed(!collapsed)}
          >
            <Menu className="h-4 w-4" />
          </Button>
        </div>
        <Separator />

        {/* Search Bar - Only show when expanded */}
        {!collapsed && (
          <div className="p-4">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search..." className="pl-8" />
            </div>
          </div>
        )}

        <ScrollArea className="flex-1 px-2 py-2">
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
              onClick={() => setActiveItem("inbox")}
              collapsed={collapsed}
            />
          </div>
        </ScrollArea>

        <Separator />
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
        {/* Top Header can go here if needed, or integrate into page */}
        <main className="flex-1 overflow-hidden flex flex-col min-h-0">
          {children}
        </main>
      </div>
    </div>
  );
};
