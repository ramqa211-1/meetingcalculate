import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Bot, Loader2, RefreshCw } from 'lucide-react';
import type { EmploymentContext } from '@/types/employment';

interface Event {
  id: string;
  date: string;
  start_time: string;
  duration_hours: number;
  client_name: string;
  event_type: string;
  rate_type: string;
  rate: number;
  total_amount: number;
  payment_status: string;
}

interface KPIs {
  totalRevenue: number;
  paidRevenue: number;
  unpaidRevenue: number;
  totalEvents: number;
  totalHours: number;
  avgRate: number;
}

interface AIInsightsCardProps {
  events: Event[];
  kpis: KPIs;
  employmentContext: EmploymentContext | null;
  formatCurrency: (amount: number) => string;
}

const AIInsightsCard = ({
  events,
  kpis,
  employmentContext,
  formatCurrency: formatCurrencyProp,
}: AIInsightsCardProps) => {
  const [insights, setInsights] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchInsights = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('לא מחובר');

      const { data, error: fnError } = await supabase.functions.invoke('ai-chat', {
        body: {
          type: 'generate_insights',
          events,
          kpis,
          employmentContext: employmentContext
            ? {
                is_full_time_employee: employmentContext.is_full_time_employee,
                monthly_salary_net: employmentContext.monthly_salary_net,
                work_hours_per_day: employmentContext.work_hours_per_day,
                work_days_per_month: employmentContext.work_days_per_month,
                work_start_time: employmentContext.work_start_time,
                work_end_time: employmentContext.work_end_time,
              }
            : null,
        },
      });

      if (fnError) throw fnError;
      if (data?.error) throw new Error(data.error);

      setInsights(data?.response || 'לא התקבלו תובנות');
    } catch (err) {
      console.error('Error fetching AI insights:', err);
      setError(err instanceof Error ? err.message : 'שגיאה בטעינת תובנות');
      setInsights(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (events.length > 0) {
      fetchInsights();
    }
  }, []);

  const calculations = employmentContext?.is_full_time_employee && employmentContext.monthly_salary_net
    ? {
        hourly: employmentContext.monthly_salary_net /
          (employmentContext.work_hours_per_day * employmentContext.work_days_per_month),
        daily: employmentContext.monthly_salary_net / employmentContext.work_days_per_month,
      }
    : null;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="flex items-center gap-2">
          <Bot className="w-5 h-5 text-primary" />
          תובנות AI - ניתוח חודשי
        </CardTitle>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchInsights}
          disabled={loading || events.length === 0}
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <RefreshCw className="w-4 h-4" />
          )}
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {calculations && (
          <div className="p-4 bg-muted/50 rounded-lg text-sm">
            <p className="font-medium mb-2">המצב שלך כשכיר</p>
            <div className="space-y-1 text-muted-foreground">
              <p>• שכר נטו: {formatCurrencyProp(employmentContext.monthly_salary_net!)}/חודש</p>
              <p>• שווי השעה: {formatCurrencyProp(calculations.hourly)} | שווי יום: {formatCurrencyProp(calculations.daily)}</p>
              <p>• שעות עבודה: {employmentContext.work_start_time?.slice(0, 5)}-{employmentContext.work_end_time?.slice(0, 5)}</p>
            </div>
          </div>
        )}

        {loading && !insights && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        )}

        {error && (
          <div className="p-4 bg-destructive/10 text-destructive rounded-lg text-sm">
            {error}
            <Button variant="link" size="sm" className="mt-2 p-0 h-auto" onClick={fetchInsights}>
              נסה שוב
            </Button>
          </div>
        )}

        {insights && !loading && (
          <div className="prose prose-sm dark:prose-invert max-w-none">
            <div className="whitespace-pre-wrap text-sm leading-relaxed">{insights}</div>
          </div>
        )}

        {events.length === 0 && !loading && (
          <p className="text-sm text-muted-foreground py-4">
            אין אירועים החודש. הוסף פגישות כדי לקבל תובנות AI.
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export default AIInsightsCard;
