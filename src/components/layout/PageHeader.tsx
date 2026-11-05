import React from 'react';
import { Breadcrumb, BreadcrumbItem } from './Breadcrumb';
import { Badge, GeneralSemanticVariant, AttendanceSemanticStatus } from '../ui/Badge';

export interface PageHeaderBadgeConfig {
  label: React.ReactNode;
  variant?: GeneralSemanticVariant;
  status?: AttendanceSemanticStatus | string;
  className?: string;
}

export interface PageHeaderProps {
  title: string;
  description?: string;
  subtitle?: string;
  breadcrumbs?: BreadcrumbItem[];
  primaryAction?: React.ReactNode;
  secondaryActions?: React.ReactNode;
  actions?: React.ReactNode;
  badge?: React.ReactNode | PageHeaderBadgeConfig;
  className?: string;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  description,
  subtitle,
  breadcrumbs,
  primaryAction,
  secondaryActions,
  actions,
  badge,
  className = '',
}) => {
  const effectiveDescription = description || subtitle;
  const effectivePrimaryAction = primaryAction || actions;

  const renderBadge = () => {
    if (!badge) return null;
    if (React.isValidElement(badge) || typeof badge === 'string' || typeof badge === 'number') {
      return badge;
    }
    if (typeof badge === 'object' && 'label' in badge) {
      const badgeConfig = badge as PageHeaderBadgeConfig;
      return (
        <Badge
          variant={badgeConfig.variant}
          status={badgeConfig.status}
          className={badgeConfig.className}
        >
          {badgeConfig.label}
        </Badge>
      );
    }
    return null;
  };

  return (
    <div className={`space-y-2.5 pb-4 border-b border-zinc-200 dark:border-zinc-800 ${className}`}>
      {breadcrumbs && breadcrumbs.length > 0 && (
        <Breadcrumb items={breadcrumbs} className="mb-1" />
      )}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 min-w-0">
        <div className="space-y-1 min-w-0">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-zinc-900 dark:text-zinc-100 tracking-tight">
              {title}
            </h1>
            {badge && <div className="shrink-0">{renderBadge()}</div>}
          </div>
          {effectiveDescription && (
            <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 max-w-3xl leading-relaxed">
              {effectiveDescription}
            </p>
          )}
        </div>

        {(effectivePrimaryAction || secondaryActions) && (
          <div className="flex items-center gap-2 flex-wrap shrink-0 pt-1 sm:pt-0">
            {secondaryActions}
            {effectivePrimaryAction}
          </div>
        )}
      </div>
    </div>
  );
};


