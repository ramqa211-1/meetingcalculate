import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { EmploymentContext, EmploymentCalculations } from '@/types/employment';

export function useEmploymentContext() {
  const [employmentContext, setEmploymentContext] = useState<EmploymentContext | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchEmploymentContext = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setEmploymentContext(null);
        return;
      }

      const { data, error } = await supabase
        .from('employment_context')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;
      setEmploymentContext(data);
    } catch (error) {
      console.error('Error fetching employment context:', error);
      setEmploymentContext(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEmploymentContext();
  }, [fetchEmploymentContext]);

  const saveEmploymentContext = async (data: Partial<EmploymentContext>) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('משתמש לא מחובר');

      const { error } = await supabase
        .from('employment_context')
        .upsert(
          {
            user_id: user.id,
            ...data,
          },
          { onConflict: 'user_id' }
        );

      if (error) throw error;
      await fetchEmploymentContext();
      return { success: true };
    } catch (error) {
      console.error('Error saving employment context:', error);
      return { success: false, error };
    }
  };

  const getCalculations = (): EmploymentCalculations | null => {
    if (!employmentContext?.is_full_time_employee || !employmentContext.monthly_salary_net) {
      return null;
    }

    const monthlyHours =
      employmentContext.work_hours_per_day * employmentContext.work_days_per_month;
    const hourlyRate = employmentContext.monthly_salary_net / monthlyHours;
    const dailyWage = employmentContext.monthly_salary_net / employmentContext.work_days_per_month;

    return {
      hourly_rate_net: hourlyRate,
      daily_wage_net: dailyWage,
      monthly_hours: monthlyHours,
    };
  };

  return {
    employmentContext,
    calculations: getCalculations(),
    loading,
    saveEmploymentContext,
    refetch: fetchEmploymentContext,
  };
}
