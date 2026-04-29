import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface KPICardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: ReactNode;
  trend?: {
    value: string;
    isPositive: boolean;
  };
  colorClass?: string;
}

const KPICard = ({
  title,
  value,
  subtitle,
  icon,
  trend,
  colorClass = 'text-primary',
}: KPICardProps) => {
  return (
    <div className="group relative bg-card border border-border rounded-sm overflow-hidden transition-colors hover:border-foreground/30">
      {/* top-left eyebrow + icon top-right */}
      <div className="flex items-start justify-between p-5 pb-3">
        <div className="eyebrow leading-tight max-w-[70%]">{title}</div>
        <div
          className={cn(
            'shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-foreground/[0.04] [&>svg]:w-3.5 [&>svg]:h-3.5',
            colorClass
          )}
        >
          {icon}
        </div>
      </div>

      {/* hero number — mono, tabular, hefty */}
      <div className="px-5">
        <div className="font-mono text-[2rem] sm:text-[2.25rem] leading-none font-medium tabular-nums tracking-tight text-foreground">
          {value}
        </div>
      </div>

      {/* hairline + meta */}
      <div className="mt-4 mx-5 h-px bg-border" />
      <div className="flex items-center justify-between px-5 pt-2.5 pb-4">
        {subtitle ? (
          <p className="text-[11px] text-muted-foreground leading-tight">{subtitle}</p>
        ) : (
          <span />
        )}
        {trend && (
          <span
            className={cn(
              'text-[11px] font-mono tabular-nums font-medium',
              trend.isPositive ? 'text-accent' : 'text-destructive'
            )}
          >
            {trend.isPositive ? '↑' : '↓'} {trend.value}
          </span>
        )}
      </div>

      {/* subtle accent strip on hover */}
      <div
        className={cn(
          'absolute inset-x-0 top-0 h-[2px] bg-foreground origin-right scale-x-0 transition-transform duration-300 group-hover:scale-x-100'
        )}
      />
    </div>
  );
};

export default KPICard;
