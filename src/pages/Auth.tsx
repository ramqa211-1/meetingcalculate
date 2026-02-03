import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { signIn, signInWithGoogle } from '@/hooks/use-auth';
import { Calendar, DollarSign, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const Auth = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        navigate('/dashboard');
      }
    });
    return () => unsubscribe();
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await signIn(email, password);
      navigate('/dashboard');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'התחברות נכשלה. נסה שוב.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setLoading(true);
    try {
      await signInWithGoogle();
      navigate('/dashboard');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'התחברות עם Google נכשלה. נסה שוב.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-background flex items-center justify-center p-4">
      <div className="max-w-6xl w-full grid md:grid-cols-2 gap-8 items-center">
        <div className="order-1 md:order-2 bg-card p-8 rounded-2xl shadow-xl border border-border">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">ברוכים הבאים למערכת</h1>
            <p className="text-muted-foreground">התחברו כדי לנהל את הפגישות וההכנסות שלכם</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">אימייל</Label>
              <Input
                id="email"
                type="email"
                placeholder="הכנס את האימייל שלך"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">סיסמה</Label>
              <Input
                id="password"
                type="password"
                placeholder="הכנס את הסיסמה שלך"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'מתחבר...' : 'התחבר'}
            </Button>
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">או</span>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={handleGoogleSignIn}
            disabled={loading}
          >
            התחבר עם Google
          </Button>
        </div>

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
                <h3 className="font-semibold text-foreground mb-1">ניהול פגישות חכם</h3>
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
                <h3 className="font-semibold text-foreground mb-1">חישוב הכנסות אוטומטי</h3>
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
                <h3 className="font-semibold text-foreground mb-1">אינטגרציה לוואטסאפ</h3>
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
