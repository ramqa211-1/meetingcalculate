import { Auth as SupabaseAuth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { supabase } from '@/integrations/supabase/client';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, DollarSign, TrendingUp } from 'lucide-react';

const Auth = () => {
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate('/dashboard');
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        navigate('/dashboard');
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-background flex items-center justify-center p-4">
      <div className="max-w-6xl w-full grid md:grid-cols-2 gap-8 items-center">
        {/* Right Side - Auth Form */}
        <div className="order-1 md:order-2 bg-card p-8 rounded-2xl shadow-xl border border-border">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">
              ברוכים הבאים למערכת
            </h1>
            <p className="text-muted-foreground">
              התחברו כדי לנהל את הפגישות וההכנסות שלכם
            </p>
          </div>
          
          <SupabaseAuth
            supabaseClient={supabase}
            appearance={{
              theme: ThemeSupa,
              variables: {
                default: {
                  colors: {
                    brand: 'hsl(243 75% 59%)',
                    brandAccent: 'hsl(243 75% 54%)',
                  },
                },
              },
            }}
            localization={{
              variables: {
                sign_in: {
                  email_label: 'אימייל',
                  password_label: 'סיסמה',
                  button_label: 'התחבר',
                  loading_button_label: 'מתחבר...',
                  email_input_placeholder: 'הכנס את האימייל שלך',
                  password_input_placeholder: 'הכנס את הסיסמה שלך',
                  link_text: 'כבר יש לך חשבון? התחבר',
                },
                sign_up: {
                  email_label: 'אימייל',
                  password_label: 'סיסמה',
                  button_label: 'הירשם',
                  loading_button_label: 'נרשם...',
                  email_input_placeholder: 'הכנס את האימייל שלך',
                  password_input_placeholder: 'צור סיסמה',
                  link_text: 'אין לך חשבון? הירשם',
                },
              },
            }}
            providers={['google']}
            redirectTo={window.location.origin}
          />
        </div>

        {/* Left Side - Features */}
        <div className="order-2 md:order-1 space-y-6">
          <div>
            <h2 className="text-4xl font-bold text-foreground mb-4">
              נהלו את כל הפגישות וההכנסות שלכם במקום אחד
            </h2>
            <p className="text-lg text-muted-foreground">
              מערכת מתקדמת לניהול פגישות, חישוב הכנסות ואינטגרציה לוואטסאפ
            </p>
          </div>

          <div className="space-y-4">
            <div className="flex items-start gap-4 p-4 bg-card/50 rounded-xl border border-border">
              <div className="p-3 bg-primary/10 rounded-lg">
                <Calendar className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground mb-1">
                  ניהול פגישות חכם
                </h3>
                <p className="text-sm text-muted-foreground">
                  עקבו אחר כל הפגישות שלכם עם מעקב אוטומטי של זמנים ולקוחות
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4 p-4 bg-card/50 rounded-xl border border-border">
              <div className="p-3 bg-accent/10 rounded-lg">
                <DollarSign className="w-6 h-6 text-accent" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground mb-1">
                  חישוב הכנסות אוטומטי
                </h3>
                <p className="text-sm text-muted-foreground">
                  ראו בזמן אמת כמה הרווחתם וכמה עוד צפוי להיכנס
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4 p-4 bg-card/50 rounded-xl border border-border">
              <div className="p-3 bg-info/10 rounded-lg">
                <TrendingUp className="w-6 h-6 text-info" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground mb-1">
                  אינטגרציה לוואטסאפ
                </h3>
                <p className="text-sm text-muted-foreground">
                  הוסיפו פגישות ישירות מוואטסאפ עם הודעות פשוטות
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;
