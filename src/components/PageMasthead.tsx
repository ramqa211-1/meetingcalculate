import { ReactNode } from 'react';
import { motion } from 'motion/react';

interface PageMastheadProps {
  eyebrow: string;
  marker: string;
  /** First half of the headline — rendered light, muted */
  headlineLight: string;
  /** Second half — rendered italic with coral gradient + shine */
  headlineAccent: string;
  description?: string;
  meta?: ReactNode;
  actions?: ReactNode;
}

const ease = [0.22, 1, 0.36, 1] as const;

const PageMasthead = ({
  eyebrow,
  marker,
  headlineLight,
  headlineAccent,
  description,
  meta,
  actions,
}: PageMastheadProps) => {
  return (
    <header className="border-b border-foreground/10 pb-8 md:pb-10">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
        <div className="min-w-0">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease }}
            className="text-[10px] tracking-[0.35em] uppercase font-mono text-primary mb-5 flex items-center gap-3"
          >
            <span className="h-px w-10 bg-primary" />
            <span>{eyebrow}</span>
            <span className="text-muted-foreground/70">{marker}</span>
            {meta && <span className="text-muted-foreground">· {meta}</span>}
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.08, ease }}
            className="font-serif leading-[0.98] text-4xl md:text-6xl tracking-tight"
          >
            <span className="font-light text-foreground/85">{headlineLight}</span>{' '}
            <span className="italic gradient-text-coral hero-shine font-medium">{headlineAccent}</span>
          </motion.h1>

          {description && (
            <motion.p
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.2, ease }}
              className="mt-5 text-sm md:text-base text-muted-foreground max-w-md leading-relaxed"
            >
              {description}
            </motion.p>
          )}
        </div>

        {actions && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.3, ease }}
            className="self-start md:self-end"
          >
            {actions}
          </motion.div>
        )}
      </div>
    </header>
  );
};

export default PageMasthead;
