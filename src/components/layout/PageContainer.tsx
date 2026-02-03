import React from "react";
import { cn } from "@/lib/utils";

interface PageContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export const PageContainer = ({
  children,
  className,
  ...props
}: PageContainerProps) => {
  return (
    <div
      className={cn(
        "h-full w-full flex flex-col",
        // 添加微妙的背景层次
        "bg-gradient-to-b from-transparent via-background/30 to-background/60",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
};
