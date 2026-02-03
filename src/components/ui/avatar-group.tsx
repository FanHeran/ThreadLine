import { cn } from "@/lib/utils";

interface AvatarGroupProps {
  names: string[];
  max?: number;
  size?: "sm" | "md" | "lg";
  className?: string;
}

// 生成基于名字的颜色
const getColorFromName = (name: string) => {
  const colors = [
    "bg-blue-500",
    "bg-emerald-500",
    "bg-purple-500",
    "bg-orange-500",
    "bg-pink-500",
    "bg-cyan-500",
    "bg-indigo-500",
    "bg-rose-500",
  ];
  
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  return colors[Math.abs(hash) % colors.length];
};

// 获取名字的首字母
const getInitials = (name: string) => {
  // 移除邮箱地址部分
  const cleanName = name.replace(/<.*?>/, "").trim();
  
  // 中文名字取最后两个字
  if (/[\u4e00-\u9fa5]/.test(cleanName)) {
    return cleanName.slice(-2);
  }
  
  // 英文名字取首字母
  const parts = cleanName.split(" ");
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  
  return cleanName.slice(0, 2).toUpperCase();
};

const sizeClasses = {
  sm: "h-6 w-6 text-[10px]",
  md: "h-8 w-8 text-xs",
  lg: "h-10 w-10 text-sm",
};

export function AvatarGroup({ names, max = 3, size = "sm", className }: AvatarGroupProps) {
  const displayNames = names.slice(0, max);
  const remaining = names.length - max;

  return (
    <div className={cn("flex -space-x-2", className)}>
      {displayNames.map((name, idx) => (
        <div
          key={idx}
          className={cn(
            "relative inline-flex items-center justify-center rounded-full border-2 border-background font-medium text-white ring-1 ring-background",
            sizeClasses[size],
            getColorFromName(name)
          )}
          title={name}
        >
          {getInitials(name)}
        </div>
      ))}
      {remaining > 0 && (
        <div
          className={cn(
            "relative inline-flex items-center justify-center rounded-full border-2 border-background bg-muted font-medium text-muted-foreground ring-1 ring-background",
            sizeClasses[size]
          )}
          title={`+${remaining} more`}
        >
          +{remaining}
        </div>
      )}
    </div>
  );
}

