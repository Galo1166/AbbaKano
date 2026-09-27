import { cn } from "@admin/lib/utils";

interface PageHeaderProps {
  title: string;
  description?: string;
  breadcrumbs?: string[];
  actions?: React.ReactNode;
  badge?: React.ReactNode;
}

export default function PageHeader({
  title,
  description,
  breadcrumbs,
  actions,
  badge,
}: PageHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-2 border-b border-outline-variant/20">
      <div className="flex flex-col gap-1 min-w-0">
        {breadcrumbs && breadcrumbs.length > 0 && (
          <div className="flex items-center gap-1.5 text-xs text-on-surface-variant font-medium">
            {breadcrumbs.map((crumb, i) => (
              <span key={crumb} className="flex items-center gap-1.5">
                {i > 0 && (
                  <span className="material-symbols-outlined text-[12px] text-outline">
                    chevron_right
                  </span>
                )}
                <span
                  className={cn(
                    i === breadcrumbs.length - 1
                      ? "text-primary font-semibold"
                      : "text-outline"
                  )}
                >
                  {crumb}
                </span>
              </span>
            ))}
          </div>
        )}

        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-xl sm:text-2xl font-bold text-on-surface tracking-tight leading-tight">
            {title}
          </h1>
          {badge && <div className="shrink-0">{badge}</div>}
        </div>

        {description && (
          <p className="text-xs sm:text-sm text-on-surface-variant max-w-2xl leading-relaxed">
            {description}
          </p>
        )}
      </div>

      {actions && (
        <div className="flex items-center gap-2 sm:gap-3 shrink-0 flex-wrap self-start sm:self-auto">
          {actions}
        </div>
      )}
    </div>
  );
}
