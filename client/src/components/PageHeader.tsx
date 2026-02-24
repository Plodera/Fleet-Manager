import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}

export function PageHeader({ title, description, icon, actions, className }: PageHeaderProps) {
  return (
    <div className={cn("flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between mb-6", className)} data-testid="page-header">
      <div className="flex items-center gap-3">
        {icon && (
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            {icon}
          </div>
        )}
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground" data-testid="page-title">{title}</h1>
          {description && (
            <p className="text-sm text-muted-foreground mt-0.5" data-testid="page-description">{description}</p>
          )}
        </div>
      </div>
      {actions && (
        <div className="flex items-center gap-2 flex-wrap mt-3 sm:mt-0" data-testid="page-actions">
          {actions}
        </div>
      )}
    </div>
  );
}
