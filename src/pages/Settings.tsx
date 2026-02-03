import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/use-auth';
import Layout from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { useEmploymentContext } from '@/hooks/use-employment-context';
import { Loader2, Briefcase, MessageSquare } from 'lucide-react';

const settingsSchema = z.object({
  business_name: z.string().optional(),
  default_hourly_rate: z.string().min(1, 'יש להזין מחיר ברירת מחדל'),
  default_fixed_rate: z.string().min(1, 'יש להזין מחיר ברירת מחדל'),
});

type SettingsFormData = z.infer<typeof settingsSchema>;

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS' }).format(amount);

const Settings = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [employmentSaving, setEmploymentSaving] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();
  const {
    employmentContext,
    loading: employmentLoading,
    saveEmploymentContext,
  } = useEmploymentContext();

  const [whatsappForm, setWhatsappForm] = useState({
    phone_number: '',
    notifications_enabled: true,
  });
  const [whatsappSaving, setWhatsappSaving] = useState(false);
  const [employmentForm, setEmploymentForm] = useState({
    is_full_time_employee: false,
    monthly_salary_net: '',
    work_hours_per_day: 8,
    work_days_per_month: 22,
    work_start_time: '09:00',
    work_end_time: '17:00',
  });

  const form = useForm<SettingsFormData>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      business_name: '',
      default_hourly_rate: '300',
      default_fixed_rate: '500',
    },
  });

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
      return;
    }
    if (user) {
      fetchSettings();
      fetchWhatsAppSettings();
    }
  }, [user, authLoading, navigate]);

  const fetchWhatsAppSettings = async () => {
    if (!user) return;
    try {
      const ref = doc(db, 'users', user.uid, 'whatsapp_settings', '_');
      const snap = await getDoc(ref);
      if (snap.exists()) {
        const d = snap.data();
        setWhatsappForm({
          phone_number: d.phone_number || '',
          notifications_enabled: d.notifications_enabled ?? true,
        });
      }
    } catch (error) {
      console.error('Error fetching WhatsApp settings:', error);
    }
  };

  useEffect(() => {
    if (employmentContext) {
      setEmploymentForm({
        is_full_time_employee: employmentContext.is_full_time_employee,
        monthly_salary_net: employmentContext.monthly_salary_net?.toString() ?? '',
        work_hours_per_day: employmentContext.work_hours_per_day ?? 8,
        work_days_per_month: employmentContext.work_days_per_month ?? 22,
        work_start_time: employmentContext.work_start_time?.slice(0, 5) ?? '09:00',
        work_end_time: employmentContext.work_end_time?.slice(0, 5) ?? '17:00',
      });
    }
  }, [employmentContext]);

  const fetchSettings = async () => {
    if (!user) return;
    try {
      const ref = doc(db, 'users', user.uid, 'settings');
      const snap = await getDoc(ref);
      if (snap.exists()) {
        const d = snap.data();
        form.reset({
          business_name: d.business_name || '',
          default_hourly_rate: d.default_hourly_rate?.toString() || '300',
          default_fixed_rate: d.default_fixed_rate?.toString() || '500',
        });
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data: SettingsFormData) => {
    if (!user) return;
    try {
      setSaving(true);
      await setDoc(
        doc(db, 'users', user.uid, 'settings', '_'),
        {
          business_name: data.business_name || null,
          default_hourly_rate: parseFloat(data.default_hourly_rate),
          default_fixed_rate: parseFloat(data.default_fixed_rate),
        },
        { merge: true }
      );
      toast({
        title: 'הגדרות נשמרו בהצלחה',
        description: 'השינויים שלך נשמרו במערכת',
      });
    } catch (error) {
      console.error('Error saving settings:', error);
      toast({
        title: 'שגיאה',
        description: 'לא ניתן לשמור את ההגדרות',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const onSaveWhatsApp = async () => {
    if (!user) return;
    try {
      setWhatsappSaving(true);
      const phone = whatsappForm.phone_number.replace(/\D/g, '');
      const normalized = phone.startsWith('972')
        ? phone
        : phone.startsWith('0')
          ? '972' + phone.slice(1)
          : '972' + phone;
      await setDoc(
        doc(db, 'users', user.uid, 'whatsapp_settings', '_'),
        {
          phone_number: normalized,
          notifications_enabled: whatsappForm.notifications_enabled,
        },
        { merge: true }
      );
      toast({
        title: 'הגדרות WhatsApp נשמרו',
        description: 'כעת תוכל לשלוח הודעות לבוט ולקבל עדכונים',
      });
    } catch (error) {
      console.error('Error saving WhatsApp:', error);
      toast({
        title: 'שגיאה',
        description: 'לא ניתן לשמור את הגדרות WhatsApp',
        variant: 'destructive',
      });
    } finally {
      setWhatsappSaving(false);
    }
  };

  const onSaveEmployment = async () => {
    try {
      setEmploymentSaving(true);
      const { error } = await saveEmploymentContext({
        is_full_time_employee: employmentForm.is_full_time_employee,
        monthly_salary_net:
          employmentForm.is_full_time_employee && employmentForm.monthly_salary_net
            ? parseFloat(employmentForm.monthly_salary_net)
            : null,
        work_hours_per_day: employmentForm.work_hours_per_day,
        work_days_per_month: employmentForm.work_days_per_month,
        work_start_time: employmentForm.work_start_time,
        work_end_time: employmentForm.work_end_time,
      });
      if (error) throw error;
      toast({
        title: 'הגדרות תעסוקה נשמרו',
        description: 'ה-AI ישתמש במידע זה לניתוח כדאיות',
      });
    } catch (error) {
      console.error('Error saving employment:', error);
      toast({
        title: 'שגיאה',
        description: 'לא ניתן לשמור את הגדרות התעסוקה',
        variant: 'destructive',
      });
    } finally {
      setEmploymentSaving(false);
    }
  };

  if (loading || authLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">טוען...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-4xl space-y-6 md:space-y-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">הגדרות</h1>
          <p className="text-muted-foreground mt-1">נהל את ההגדרות האישיות והעסקיות שלך</p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>הגדרות עסק</CardTitle>
                <CardDescription>מידע כללי על העסק שלך</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="business_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>שם העסק</FormLabel>
                      <FormControl>
                        <Input placeholder="השם שלי בע״מ" {...field} />
                      </FormControl>
                      <FormDescription>שם העסק יופיע בדוחות ובמסמכים</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>הגדרות תמחור</CardTitle>
                <CardDescription>מחירי ברירת מחדל לפגישות חדשות</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="default_hourly_rate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>מחיר ברירת מחדל לשעה (₪)</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="300" {...field} />
                      </FormControl>
                      <FormDescription>
                        המחיר שיוצע אוטומטית בפגישות חדשות עם תמחור לפי שעה
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="default_fixed_rate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>מחיר ברירת מחדל לפגישה (₪)</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="500" {...field} />
                      </FormControl>
                      <FormDescription>
                        המחיר שיוצע אוטומטית בפגישות חדשות עם מחיר קבוע
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Briefcase className="w-5 h-5" />
                  מצב תעסוקתי (למחשבון AI)
                </CardTitle>
                <CardDescription>מידע זה עוזר ל-AI לחשב האם כדאי לך לקחת פרויקטים</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="is-full-time">אני עובד כשכיר במשרה מלאה</Label>
                  <Switch
                    id="is-full-time"
                    checked={employmentForm.is_full_time_employee}
                    onCheckedChange={(checked) =>
                      setEmploymentForm((f) => ({ ...f, is_full_time_employee: !!checked }))
                    }
                  />
                </div>

                {employmentForm.is_full_time_employee && (
                  <>
                    <div>
                      <Label htmlFor="monthly-salary">שכר נטו חודשי (₪)</Label>
                      <Input
                        id="monthly-salary"
                        type="number"
                        placeholder="17500"
                        value={employmentForm.monthly_salary_net}
                        onChange={(e) =>
                          setEmploymentForm((f) => ({ ...f, monthly_salary_net: e.target.value }))
                        }
                        className="mt-2"
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="work-hours">שעות עבודה ביום</Label>
                        <Input
                          id="work-hours"
                          type="number"
                          min={1}
                          max={24}
                          value={employmentForm.work_hours_per_day}
                          onChange={(e) =>
                            setEmploymentForm((f) => ({
                              ...f,
                              work_hours_per_day: parseInt(e.target.value) || 8,
                            }))
                          }
                          className="mt-2"
                        />
                      </div>
                      <div>
                        <Label htmlFor="work-days">ימי עבודה בחודש</Label>
                        <Input
                          id="work-days"
                          type="number"
                          min={1}
                          max={31}
                          value={employmentForm.work_days_per_month}
                          onChange={(e) =>
                            setEmploymentForm((f) => ({
                              ...f,
                              work_days_per_month: parseInt(e.target.value) || 22,
                            }))
                          }
                          className="mt-2"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="start-time">שעת התחלה</Label>
                        <Input
                          id="start-time"
                          type="time"
                          value={employmentForm.work_start_time}
                          onChange={(e) =>
                            setEmploymentForm((f) => ({ ...f, work_start_time: e.target.value }))
                          }
                          className="mt-2"
                        />
                      </div>
                      <div>
                        <Label htmlFor="end-time">שעת סיום</Label>
                        <Input
                          id="end-time"
                          type="time"
                          value={employmentForm.work_end_time}
                          onChange={(e) =>
                            setEmploymentForm((f) => ({ ...f, work_end_time: e.target.value }))
                          }
                          className="mt-2"
                        />
                      </div>
                    </div>
                    {employmentForm.monthly_salary_net && (
                      <div className="p-4 bg-muted rounded-lg">
                        <p className="text-sm font-medium">חישובים אוטומטיים:</p>
                        <div className="mt-2 space-y-1 text-sm text-muted-foreground">
                          <p>
                            • שכר לשעה נטו:{' '}
                            {formatCurrency(
                              parseFloat(employmentForm.monthly_salary_net) /
                                Math.max(
                                  1,
                                  employmentForm.work_hours_per_day * employmentForm.work_days_per_month
                                )
                            )}
                          </p>
                          <p>
                            • שכר יומי נטו:{' '}
                            {formatCurrency(
                              parseFloat(employmentForm.monthly_salary_net) /
                                Math.max(1, employmentForm.work_days_per_month)
                            )}
                          </p>
                          <p>
                            • סך שעות בחודש:{' '}
                            {employmentForm.work_hours_per_day * employmentForm.work_days_per_month}
                          </p>
                        </div>
                      </div>
                    )}
                    <Button
                      type="button"
                      variant="outline"
                      onClick={onSaveEmployment}
                      disabled={employmentSaving || employmentLoading}
                    >
                      {employmentSaving && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
                      שמור הגדרות תעסוקה
                    </Button>
                  </>
                )}

                {!employmentForm.is_full_time_employee && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={onSaveEmployment}
                    disabled={employmentSaving || employmentLoading}
                  >
                    {employmentSaving && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
                    שמור
                  </Button>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="w-5 h-5" />
                  הגדרות WhatsApp
                </CardTitle>
                <CardDescription>
                  חבר את חשבון WhatsApp שלך לקבלת עדכונים והוספת פגישות ישירות מהוואטסאפ
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="whatsapp-phone">מספר טלפון (WhatsApp)</Label>
                  <Input
                    id="whatsapp-phone"
                    type="tel"
                    placeholder="+972501234567 או 0501234567"
                    value={whatsappForm.phone_number}
                    onChange={(e) =>
                      setWhatsappForm((f) => ({ ...f, phone_number: e.target.value }))
                    }
                    className="mt-2"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    מספר הטלפון המקושר ל-WhatsApp שלך. הבוט יזהה אותך לפי מספר זה.
                  </p>
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="whatsapp-notifications">התראות WhatsApp</Label>
                  <Switch
                    id="whatsapp-notifications"
                    checked={whatsappForm.notifications_enabled}
                    onCheckedChange={(checked) =>
                      setWhatsappForm((f) => ({ ...f, notifications_enabled: !!checked }))
                    }
                  />
                </div>
                <div className="bg-muted p-4 rounded-lg text-sm text-muted-foreground space-y-2">
                  <p className="font-medium text-foreground">פקודות זמינות:</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>/stats - סטטיסטיקות החודש</li>
                    <li>/today - פגישות היום</li>
                    <li>/week - פגישות השבוע</li>
                    <li>/add [פרטים] - הוספת פגישה</li>
                    <li>/help - רשימת פקודות</li>
                  </ul>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={onSaveWhatsApp}
                  disabled={whatsappSaving}
                >
                  {whatsappSaving && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
                  שמור הגדרות WhatsApp
                </Button>
              </CardContent>
            </Card>

            <div className="flex justify-end">
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
                שמור שינויים
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </Layout>
  );
};

export default Settings;
