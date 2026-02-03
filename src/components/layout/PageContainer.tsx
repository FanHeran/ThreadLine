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
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
};
