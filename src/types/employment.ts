export interface EmploymentContext {
  id: string;
  user_id: string;
  is_full_time_employee: boolean;
  monthly_salary_net: number | null;
  work_hours_per_day: number;
  work_days_per_month: number;
  work_start_time: string;
  work_end_time: string;
  created_at: string | null;
  updated_at: string | null;
}

export interface EmploymentContextFormData {
  is_full_time_employee: boolean;
  monthly_salary_net: string;
  work_hours_per_day: number;
  work_days_per_month: number;
  work_start_time: string;
  work_end_time: string;
}

export interface EmploymentCalculations {
  hourly_rate_net: number;
  daily_wage_net: number;
  monthly_hours: number;
}
