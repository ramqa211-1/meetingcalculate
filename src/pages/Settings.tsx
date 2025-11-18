import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { supabase } from '@/integrations/supabase/client';
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
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

const settingsSchema = z.object({
  business_name: z.string().optional(),
  default_hourly_rate: z.string().min(1, 'יש להזין מחיר ברירת מחדל'),
  default_fixed_rate: z.string().min(1, 'יש להזין מחיר ברירת מחדל'),
});

type SettingsFormData = z.infer<typeof settingsSchema>;

const Settings = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const form = useForm<SettingsFormData>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      business_name: '',
      default_hourly_rate: '300',
      default_fixed_rate: '500',
    },
  });

  useEffect(() => {
    checkAuth();
    fetchSettings();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate('/auth');
    }
  };

  const fetchSettings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;

      if (data) {
        form.reset({
          business_name: data.business_name || '',
          default_hourly_rate: data.default_hourly_rate?.toString() || '300',
          default_fixed_rate: data.default_fixed_rate?.toString() || '500',
        });
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data: SettingsFormData) => {
    try {
      setSaving(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('משתמש לא מחובר');

      const { error } = await supabase
        .from('user_settings')
        .upsert({
          user_id: user.id,
          business_name: data.business_name || null,
          default_hourly_rate: parseFloat(data.default_hourly_rate),
          default_fixed_rate: parseFloat(data.default_fixed_rate),
        }, {
          onConflict: 'user_id'
        });

      if (error) throw error;

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

  if (loading) {
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
      <div className="max-w-4xl space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-foreground">הגדרות</h1>
          <p className="text-muted-foreground mt-1">
            נהל את ההגדרות האישיות והעסקיות שלך
          </p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Business Settings */}
            <Card>
              <CardHeader>
                <CardTitle>הגדרות עסק</CardTitle>
                <CardDescription>
                  מידע כללי על העסק שלך
                </CardDescription>
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
                      <FormDescription>
                        שם העסק יופיע בדוחות ובמסמכים
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Pricing Settings */}
            <Card>
              <CardHeader>
                <CardTitle>הגדרות תמחור</CardTitle>
                <CardDescription>
                  מחירי ברירת מחדל לפגישות חדשות
                </CardDescription>
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

            {/* WhatsApp Integration Info */}
            <Card>
              <CardHeader>
                <CardTitle>אינטגרציית WhatsApp</CardTitle>
                <CardDescription>
                  הגדרות התחברות לוואטסאפ
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="bg-muted p-4 rounded-lg">
                  <p className="text-sm text-muted-foreground">
                    אינטגרציית WhatsApp תאפשר לך להוסיף פגישות ישירות מוואטסאפ.
                    התכונה תהיה זמינה בקרוב!
                  </p>
                </div>
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
