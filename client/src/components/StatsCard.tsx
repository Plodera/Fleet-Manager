import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  description?: string;
  variant?: "default" | "primary" | "success" | "warning" | "danger";
  className?: string;
}

const variantStyles = {
  default: {
    icon: "bg-muted text-muted-foreground",
    accent: ""
  },
  primary: {
    icon: "bg-primary/10 text-primary",
    accent: ""
  },
  success: {
    icon: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    accent: ""
  },
  warning: {
    icon: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    accent: ""
  },
  danger: {
    icon: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
    accent: ""
  }
};

export function StatsCard({ 
  title, 
  value, 
  icon: Icon, 
  description,
  variant = "default",
  className 
}: StatsCardProps) {
  const styles = variantStyles[variant];
  
  return (
    <Card className={cn(
      "group relative overflow-hidden transition-all duration-300",
      "hover:shadow-lg dark:hover:shadow-primary/5",
      className
    )}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1 min-w-0">
            <p className="text-sm font-medium text-muted-foreground truncate">{title}</p>
            <p className="text-3xl font-bold tracking-tight text-foreground">{value}</p>
            {description && (
              <p className="text-xs text-muted-foreground mt-1">{description}</p>
            )}
          </div>
          <div className={cn(
            "flex-shrink-0 w-11 h-11 rounded-xl flex items-center justify-center transition-transform duration-300 group-hover:scale-110",
            styles.icon
          )}>
            <Icon className="w-5 h-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
