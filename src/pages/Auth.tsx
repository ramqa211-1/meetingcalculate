import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { signIn, signInWithGoogle } from '@/hooks/use-auth';
import { Calendar, DollarSign, TrendingUp, Loader2 } from 'lucide-react';
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
    <div className="min-h-screen bg-background relative overflow-hidden" dir="rtl">
      {/* Editorial paper grid backdrop */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none opacity-[0.05]"
        style={{
          backgroundImage:
            'linear-gradient(to right, hsl(var(--foreground)) 1px, transparent 1px), linear-gradient(to bottom, hsl(var(--foreground)) 1px, transparent 1px)',
          backgroundSize: '80px 80px',
        }}
      />

      {/* Trim border */}
      <div className="absolute inset-4 md:inset-6 border border-foreground/15 pointer-events-none" />

      {/* Registration cross — top right (RTL → visually top-left edge mark) */}
      <div className="hidden md:block absolute top-12 right-12 pointer-events-none">
        <svg width="36" height="36" viewBox="0 0 36 36" className="text-foreground/30">
          <line x1="0" y1="18" x2="36" y2="18" stroke="currentColor" strokeWidth="1" />
          <line x1="18" y1="0" x2="18" y2="36" stroke="currentColor" strokeWidth="1" />
          <circle cx="18" cy="18" r="9" fill="none" stroke="currentColor" strokeWidth="1" />
        </svg>
      </div>

      {/* Folio mark */}
      <div className="hidden md:block absolute top-12 left-12 text-[10px] tracking-[0.3em] uppercase text-muted-foreground font-mono">
        Vol · 01 · MMXXVI
      </div>

      <div className="relative min-h-screen flex items-center justify-center p-6 md:p-12">
        <div className="max-w-6xl w-full grid lg:grid-cols-[1.1fr_1fr] gap-10 lg:gap-16 items-center">

          {/* Editorial left side — masthead + features */}
          <div className="order-2 lg:order-1 space-y-8 lg:space-y-10">
            <div>
              <div className="text-[10px] tracking-[0.3em] uppercase text-muted-foreground font-mono mb-4 flex items-center gap-3">
                <span className="h-px w-10 bg-foreground/40" />
                <span>Business Quarterly · Edition 01</span>
              </div>
              <h2 className="font-serif text-4xl sm:text-5xl lg:text-6xl leading-[1.05] text-foreground">
                נהל את הפגישות
                <br />
                <span className="text-primary italic">וההכנסות</span> שלך
                <br />
                במקום אחד.
              </h2>
              <div className="h-px w-24 bg-foreground/30 my-6" />
              <p className="text-base lg:text-lg text-muted-foreground max-w-md leading-relaxed">
                מערכת ניהול עסקית לעוסקים פטורים — לוח זמנים, חישוב הכנסות, חשבוניות וצ'אט AI לקבלת תובנות.
              </p>
            </div>

            <div className="space-y-0 border-y border-foreground/15">
              {[
                { icon: Calendar, title: 'ניהול פגישות חכם', desc: 'מעקב אוטומטי של זמנים, לקוחות וסטטוס תשלום', tag: '§ 01' },
                { icon: DollarSign, title: 'חישוב הכנסות אוטומטי', desc: 'הכנסות בפועל וצפויות, מחושבות בזמן אמת', tag: '§ 02' },
                { icon: TrendingUp, title: 'אינטגרציה לוואטסאפ', desc: 'הוספת פגישות מהוואטסאפ עם פקודות פשוטות', tag: '§ 03' },
              ].map(({ icon: Icon, title, desc, tag }) => (
                <div
                  key={tag}
                  className="grid grid-cols-[auto_1fr_auto] gap-5 py-4 lg:py-5 border-b border-foreground/15 last:border-b-0 items-start"
                >
                  <div className="font-mono text-[11px] tracking-[0.2em] text-muted-foreground pt-1">
                    {tag}
                  </div>
                  <div>
                    <h3 className="font-serif text-lg lg:text-xl text-foreground mb-1">
                      {title}
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
                  </div>
                  <Icon className="w-5 h-5 text-foreground/60 mt-1" strokeWidth={1.5} />
                </div>
              ))}
            </div>
          </div>

          {/* Editorial right side — sign-in card */}
          <div className="order-1 lg:order-2">
            <div className="bg-card border border-foreground rounded-sm relative">
              {/* Stamp accent */}
              <div className="absolute -top-3 -left-3 w-20 h-20 border border-primary rounded-full hidden md:flex items-center justify-center text-primary text-[9px] tracking-[0.2em] font-mono uppercase rotate-[-12deg] bg-background">
                Authorized
              </div>

              <div className="p-8 lg:p-10">
                <div className="text-[10px] tracking-[0.3em] uppercase text-muted-foreground font-mono mb-2">
                  § Authentication
                </div>
                <h1 className="font-serif text-3xl lg:text-4xl text-foreground leading-tight">
                  ברוכים הבאים
                </h1>
                <div className="h-px w-12 bg-foreground/30 my-4" />
                <p className="text-sm text-muted-foreground mb-8">
                  התחברו כדי לנהל את הפגישות וההכנסות שלכם
                </p>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-[11px] tracking-[0.2em] uppercase font-mono text-muted-foreground">
                      אימייל
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="your@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="rounded-none border-0 border-b border-foreground/30 focus-visible:border-foreground focus-visible:ring-0 px-0 bg-transparent"
                      dir="ltr"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-[11px] tracking-[0.2em] uppercase font-mono text-muted-foreground">
                      סיסמה
                    </Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="rounded-none border-0 border-b border-foreground/30 focus-visible:border-foreground focus-visible:ring-0 px-0 bg-transparent"
                    />
                  </div>
                  {error && (
                    <div className="border-r-2 border-destructive bg-destructive/5 px-3 py-2 text-sm text-destructive">
                      {error}
                    </div>
                  )}
                  <Button
                    type="submit"
                    className="w-full rounded-sm font-mono text-xs tracking-[0.2em] uppercase h-11 mt-2"
                    disabled={loading}
                  >
                    {loading && <Loader2 className="w-3.5 h-3.5 animate-spin ml-2" />}
                    {loading ? 'מתחבר' : 'התחבר'}
                  </Button>
                </form>

                <div className="relative my-7">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-foreground/15" />
                  </div>
                  <div className="relative flex justify-center text-[10px] tracking-[0.3em] uppercase font-mono">
                    <span className="bg-card px-3 text-muted-foreground">או</span>
                  </div>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  className="w-full rounded-sm font-mono text-xs tracking-[0.2em] uppercase h-11"
                  onClick={handleGoogleSignIn}
                  disabled={loading}
                >
                  התחבר עם Google
                </Button>
              </div>

              {/* Footer band */}
              <div className="bg-foreground text-background px-8 lg:px-10 py-3 flex items-center justify-between text-[10px] tracking-[0.25em] uppercase font-mono">
                <span>Tel Aviv · Press</span>
                <span className="opacity-60">Q2 · 2026</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;
