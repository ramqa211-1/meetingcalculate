import { useState, useEffect, useCallback } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import type { EmploymentContext, EmploymentCalculations } from '@/types/employment';

export function useEmploymentContext() {
  const [employmentContext, setEmploymentContext] = useState<EmploymentContext | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchEmploymentContext = useCallback(async () => {
    try {
      const user = auth.currentUser;
      if (!user) {
        setEmploymentContext(null);
        return;
      }
      const ref = doc(db, 'users', user.uid, 'employment_context', '_');
      const snap = await getDoc(ref);
      if (snap.exists()) {
        setEmploymentContext({ id: snap.id, user_id: user.uid, ...snap.data() } as EmploymentContext);
      } else {
        setEmploymentContext(null);
      }
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
      const user = auth.currentUser;
      if (!user) throw new Error('משתמש לא מחובר');
      const ref = doc(db, 'users', user.uid, 'employment_context', '_');
      await setDoc(ref, { user_id: user.uid, ...data }, { merge: true });
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
