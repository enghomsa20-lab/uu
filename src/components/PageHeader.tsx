import type { ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  action?: ReactNode;
}

export default function PageHeader({ title, subtitle, icon, action }: PageHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-7">
      <div className="flex items-center gap-3">
        {icon && (
          <div className="w-12 h-12 rounded-2xl bg-brand-500/15 text-brand-300 flex items-center justify-center border border-brand-400/20">
            {icon}
          </div>
        )}
        <div>
          <h1 className="text-2xl font-bold text-white">{title}</h1>
          {subtitle && <p className="text-slate-400 text-sm mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {action && <div className="sm:mr-auto">{action}</div>}
    </div>
  );
}
