import { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { motion } from 'motion/react';

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
  index?: number;
}

const KPICard = ({
  title,
  value,
  subtitle,
  icon,
  trend,
  colorClass = 'text-primary',
  index = 0,
}: KPICardProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: index * 0.06, ease: [0.22, 1, 0.36, 1] }}
      className="group relative bg-gradient-to-b from-card/80 to-card/40 backdrop-blur-sm border border-foreground/10 rounded-xl overflow-hidden transition-all hover:border-primary/30 hover:-translate-y-0.5"
    >
      <div className="absolute -inset-px rounded-xl bg-gradient-to-br from-primary/0 via-primary/0 to-primary/0 opacity-0 group-hover:from-primary/15 group-hover:to-primary/5 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

      <div className="relative">
        <div className="flex items-start justify-between p-5 pb-3">
          <div className="text-[10px] tracking-[0.25em] uppercase font-mono text-muted-foreground leading-tight max-w-[70%]">
            {title}
          </div>
          <div
            className={cn(
              'shrink-0 w-8 h-8 flex items-center justify-center rounded-full bg-foreground/[0.05] ring-1 ring-foreground/10 [&>svg]:w-3.5 [&>svg]:h-3.5 transition-colors group-hover:bg-primary/15 group-hover:ring-primary/30',
              colorClass
            )}
          >
            {icon}
          </div>
        </div>

        <div className="px-5">
          <div className="font-mono text-[2rem] sm:text-[2.25rem] leading-none font-medium tabular-nums tracking-tight text-foreground">
            {value}
          </div>
        </div>

        <div className="mt-4 mx-5 h-px bg-foreground/10" />
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

        <div className="absolute inset-x-0 top-0 h-[2px] bg-primary origin-right scale-x-0 transition-transform duration-500 group-hover:scale-x-100" />
        <div className="absolute inset-x-0 top-0 h-[2px] bg-primary origin-right scale-x-0 transition-transform duration-500 group-hover:scale-x-100 blur-sm opacity-70" />
      </div>
    </motion.div>
  );
};

export default KPICard;
