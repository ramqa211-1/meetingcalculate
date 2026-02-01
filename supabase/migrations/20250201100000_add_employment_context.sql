-- Employment context for AI profitability calculations
CREATE TABLE IF NOT EXISTS public.employment_context (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  
  -- Employment info
  is_full_time_employee BOOLEAN DEFAULT false,
  monthly_salary_net DECIMAL(10,2),
  work_hours_per_day INTEGER DEFAULT 8,
  work_days_per_month INTEGER DEFAULT 22,
  work_start_time TIME DEFAULT '09:00',
  work_end_time TIME DEFAULT '17:00',
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.employment_context ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own employment context"
  ON public.employment_context FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own employment context"
  ON public.employment_context FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own employment context"
  ON public.employment_context FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_employment_context_updated_at
  BEFORE UPDATE ON public.employment_context
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Index for fast lookups
CREATE INDEX idx_employment_context_user_id ON public.employment_context(user_id);

-- Function to calculate project worthiness
CREATE OR REPLACE FUNCTION public.calculate_project_worthiness(
  project_rate DECIMAL,
  project_hours DECIMAL,
  project_start_time_param TIME,
  project_date DATE,
  user_id_param UUID
) RETURNS JSONB AS $$
DECLARE
  ctx RECORD;
  project_total DECIMAL;
  during_work_hours BOOLEAN;
  opportunity_cost DECIMAL;
  net_profit DECIMAL;
  is_worthwhile BOOLEAN;
  hourly_rate DECIMAL;
  daily_wage DECIMAL;
BEGIN
  -- Fetch employment context
  SELECT * INTO ctx 
  FROM public.employment_context 
  WHERE user_id = user_id_param;
  
  -- If no context or not full-time employee, everything is worthwhile
  IF ctx IS NULL OR NOT ctx.is_full_time_employee OR ctx.monthly_salary_net IS NULL THEN
    RETURN jsonb_build_object(
      'isWorthwhile', true,
      'netProfit', project_rate * project_hours,
      'opportunityCost', 0,
      'reason', 'לא מוגדר כשכיר - אין עלות הזדמנות'
    );
  END IF;
  
  hourly_rate := ctx.monthly_salary_net / (ctx.work_hours_per_day * ctx.work_days_per_month);
  daily_wage := ctx.monthly_salary_net / ctx.work_days_per_month;
  project_total := project_rate * project_hours;
  
  -- Check if during work hours (Sun-Thu, 0-4 in PostgreSQL DOW)
  during_work_hours := (
    EXTRACT(DOW FROM project_date) IN (0, 1, 2, 3, 4) AND
    project_start_time_param >= ctx.work_start_time AND
    project_start_time_param < ctx.work_end_time
  );
  
  -- Calculate opportunity cost
  IF during_work_hours THEN
    opportunity_cost := daily_wage;
  ELSE
    opportunity_cost := 0;
  END IF;
  
  net_profit := project_total - opportunity_cost;
  is_worthwhile := net_profit > (hourly_rate * 2);
  
  RETURN jsonb_build_object(
    'isWorthwhile', is_worthwhile,
    'netProfit', net_profit,
    'opportunityCost', opportunity_cost,
    'projectTotal', project_total,
    'duringWorkHours', during_work_hours,
    'reason', CASE
      WHEN is_worthwhile THEN 'פרויקט כדאי - רווח נטו גבוה'
      WHEN during_work_hours THEN 'לא כדאי - עלות יום חופש גבוהה מדי'
      ELSE 'לא כדאי - תמחור נמוך מדי'
    END
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
