import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { signIn, signInWithGoogle } from '@/hooks/use-auth';
import { Calendar, DollarSign, MessageSquare, Loader2, ArrowLeft, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { motion } from 'motion/react';

const features = [
  {
    tag: 'FEATURE 01',
    label: 'ניהול פגישות',
    title: 'לוח זמנים שמדבר איתך.',
    desc: 'כל הפגישות, ההכנסות וסטטוסי התשלום במקום אחד — מסודר לפי חודש, רבעון או שנה.',
    icon: Calendar,
  },
  {
    tag: 'FEATURE 02',
    label: 'הכנסות בזמן אמת',
    title: 'תמחור אוטומטי, ללא טעויות.',
    desc: 'כפליל החישוב נעלם — שעות × תעריף, מע"מ פטור, ההכנסה מתעדכנת מהרגע שהוספת פגישה.',
    icon: DollarSign,
  },
  {
    tag: 'FEATURE 03',
    label: 'חשבוניות מקצועיות',
    title: 'הפק חשבונית בלחיצה.',
    desc: 'חשבוניות עוסק פטור עם פרטי העסק שלך — מוכנות להורדה ל-PDF.',
    icon: FileText,
  },
  {
    tag: 'FEATURE 04',
    label: 'WhatsApp + AI',
    title: 'תוסיף פגישה בהודעה.',
    desc: 'הסוכן מבין הקשר, עונה על שאלות עסקיות ויודע להוסיף, לעדכן ולמחוק רשומות.',
    icon: MessageSquare,
  },
];

const Auth = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) navigate('/dashboard');
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
      setError(err instanceof Error ? err.message : 'התחברות נכשלה. נסה שוב.');
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
      setError(err instanceof Error ? err.message : 'התחברות עם Google נכשלה.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div dir="rtl" className="min-h-screen relative overflow-hidden bg-[#0d0a08] text-[#f4ede0] selection:bg-[#e87a5d]/40 selection:text-[#fff5e8]">
      {/* Atmosphere: deep gradient + radial glow */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(1200px 600px at 20% -10%, rgba(232,122,93,0.18) 0%, transparent 60%), radial-gradient(900px 500px at 90% 110%, rgba(146,54,36,0.20) 0%, transparent 55%), linear-gradient(180deg, #0d0a08 0%, #0a0807 100%)',
        }}
      />
      {/* film grain */}
      <svg aria-hidden className="absolute inset-0 w-full h-full opacity-[0.08] pointer-events-none mix-blend-overlay">
        <filter id="auth-grain">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" />
          <feColorMatrix values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 0.3 0" />
        </filter>
        <rect width="100%" height="100%" filter="url(#auth-grain)" />
      </svg>
      {/* subtle grid */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none opacity-[0.04]"
        style={{
          backgroundImage:
            'linear-gradient(to right, #f4ede0 1px, transparent 1px), linear-gradient(to bottom, #f4ede0 1px, transparent 1px)',
          backgroundSize: '120px 120px',
        }}
      />

      {/* Top bar */}
      <header className="relative z-10 px-6 md:px-12 pt-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-[#e87a5d] rounded-sm flex items-center justify-center text-[#0d0a08] font-bold relative">
            <Calendar className="w-4 h-4" strokeWidth={2.5} />
            <div className="absolute inset-0 bg-[#e87a5d] rounded-sm blur-md opacity-60 -z-10" />
          </div>
          <div className="leading-tight">
            <div className="font-serif text-lg">מערכת ניהול</div>
            <div className="text-[10px] tracking-[0.3em] uppercase text-[#f4ede0]/50 font-mono">Business · MMXXVI</div>
          </div>
        </div>
        <div className="hidden md:flex items-center gap-3 text-[11px] tracking-[0.25em] uppercase font-mono text-[#f4ede0]/55">
          <span className="text-[#e87a5d]">●</span>
          <span>Research Preview · April 2026</span>
        </div>
      </header>

      {/* HERO */}
      <section className="relative z-10 px-6 md:px-12 pt-12 md:pt-20 pb-20 md:pb-32">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-[1.15fr_1fr] gap-12 lg:gap-20 items-center">
          <div>
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              className="text-[10px] tracking-[0.35em] uppercase font-mono text-[#e87a5d] mb-6 flex items-center gap-3"
            >
              <span className="h-px w-10 bg-[#e87a5d]" />
              <span>עוסק פטור · ניהול עסקי</span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
              className="font-serif leading-[0.95] text-[2.75rem] sm:text-6xl lg:text-[5.5rem] tracking-tight"
            >
              <span className="font-light text-[#f4ede0]/85">פגישות.</span>
              <br />
              <span className="font-light text-[#f4ede0]/85">הכנסות.</span>
              <br />
              <span className="italic gradient-text-coral hero-shine font-medium">שליטה.</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="mt-8 text-base lg:text-lg text-[#f4ede0]/65 max-w-lg leading-relaxed"
            >
              מערכת אחת שמחברת את לוח הזמנים, ההכנסות, החשבוניות והווטסאפ —
              מותאמת לעוסק פטור, מחברת ל-AI, ומדברת עברית.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.5, ease: [0.22, 1, 0.36, 1] }}
              className="mt-10 flex flex-wrap items-center gap-4"
            >
              <a
                href="#signin"
                className="group relative inline-flex items-center gap-2 bg-[#e87a5d] hover:bg-[#f08d72] text-[#0d0a08] px-7 py-3.5 rounded-full text-sm font-medium tracking-wide transition-all hover:scale-[1.02] hover:-translate-y-0.5 glow-coral"
              >
                התחברות
                <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" strokeWidth={2.5} />
              </a>
              <a
                href="#features"
                className="text-[#f4ede0]/70 hover:text-[#f4ede0] text-sm tracking-wide transition-colors px-2 py-3 underline-offset-4 hover:underline"
              >
                למידע על המערכת ↓
              </a>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.8 }}
              className="mt-12 flex flex-wrap items-center gap-x-6 gap-y-2 text-[11px] tracking-[0.25em] uppercase font-mono text-[#f4ede0]/40"
            >
              <span>· מאובטח Firebase</span>
              <span>· OpenAI GPT-4</span>
              <span>· WhatsApp Business</span>
            </motion.div>
          </div>

          {/* Right — animated hero visual */}
          <div className="relative h-[440px] sm:h-[520px] lg:h-[600px]">
            <div className="absolute inset-12 rounded-full bg-gradient-to-br from-[#e87a5d]/30 via-[#933624]/20 to-transparent blur-3xl hero-glow-pulse" />

            {/* Floating card 1 — invoice */}
            <motion.div
              initial={{ opacity: 0, scale: 0.85, rotate: -20 }}
              animate={{ opacity: 1, scale: 1, rotate: -8 }}
              transition={{ duration: 0.9, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
              className="absolute top-4 right-4 sm:top-8 sm:right-12"
            >
              <div className="hero-float-a">
                <div className="w-44 sm:w-56 bg-gradient-to-br from-[#1a1612] to-[#13100d] border border-[#f4ede0]/10 rounded-2xl p-5 backdrop-blur-sm shadow-2xl shadow-black/60 ring-1 ring-white/[0.04]">
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-[9px] tracking-[0.3em] uppercase text-[#e87a5d] font-mono">חשבונית · 0042</div>
                    <FileText className="w-3.5 h-3.5 text-[#f4ede0]/40" />
                  </div>
                  <div className="space-y-1.5 mb-4">
                    <div className="h-1.5 w-full bg-[#f4ede0]/10 rounded-full" />
                    <div className="h-1.5 w-3/4 bg-[#f4ede0]/10 rounded-full" />
                    <div className="h-1.5 w-1/2 bg-[#f4ede0]/10 rounded-full" />
                  </div>
                  <div className="border-t border-[#f4ede0]/10 pt-3 flex items-end justify-between">
                    <div className="text-[9px] tracking-[0.2em] uppercase text-[#f4ede0]/40 font-mono">סך הכל</div>
                    <div className="font-mono tabular-nums text-xl text-[#f4ede0]">₪ 4,200</div>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Floating card 2 — calendar event */}
            <motion.div
              initial={{ opacity: 0, scale: 0.85, rotate: 14 }}
              animate={{ opacity: 1, scale: 1, rotate: 4 }}
              transition={{ duration: 0.9, delay: 0.6, ease: [0.22, 1, 0.36, 1] }}
              className="absolute bottom-12 right-0 sm:bottom-16 sm:right-4"
            >
              <div className="hero-float-b">
                <div className="w-48 sm:w-64 bg-gradient-to-br from-[#933624] to-[#6a2818] rounded-2xl p-5 shadow-2xl shadow-[#933624]/30 ring-1 ring-[#e87a5d]/20">
                  <div className="text-[9px] tracking-[0.3em] uppercase text-[#fff5e8]/70 font-mono mb-2">פגישה · יום ג׳</div>
                  <div className="font-serif text-xl text-[#fff5e8] leading-tight mb-4">ייעוץ אסטרטגי</div>
                  <div className="flex items-end justify-between">
                    <div>
                      <div className="text-[9px] tracking-[0.2em] uppercase text-[#fff5e8]/60 font-mono">14:00 — 16:00</div>
                      <div className="text-[10px] text-[#fff5e8]/70 mt-1">2 שעות · תעריף לשעה</div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono tabular-nums text-2xl text-[#fff5e8]">₪900</div>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#7dd3a0]" />
                    <span className="text-[9px] tracking-[0.2em] uppercase text-[#fff5e8]/70 font-mono">שולם</span>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Floating card 3 — KPI */}
            <motion.div
              initial={{ opacity: 0, scale: 0.85, rotate: -8 }}
              animate={{ opacity: 1, scale: 1, rotate: -2 }}
              transition={{ duration: 0.9, delay: 0.8, ease: [0.22, 1, 0.36, 1] }}
              className="absolute top-32 right-32 sm:top-48 sm:right-48 lg:top-56 lg:right-60"
            >
              <div className="hero-float-c">
                <div className="bg-[#0d0a08]/90 border border-[#e87a5d]/30 rounded-xl p-4 backdrop-blur-md shadow-2xl shadow-black/60 glow-coral-soft">
                  <div className="flex items-center gap-2 mb-1.5">
                    <DollarSign className="w-3 h-3 text-[#e87a5d]" />
                    <div className="text-[9px] tracking-[0.3em] uppercase text-[#f4ede0]/60 font-mono">הכנסה · אפריל</div>
                  </div>
                  <div className="font-mono tabular-nums text-3xl text-[#f4ede0]">₪ 28,400</div>
                  <div className="text-[10px] text-[#7dd3a0] mt-1.5 font-mono tabular-nums tracking-wider">↑ 12.4% · M/M</div>
                </div>
              </div>
            </motion.div>

            <div className="hidden lg:block absolute bottom-2 left-2 text-[#f4ede0]/20">
              <svg width="36" height="36" viewBox="0 0 36 36">
                <line x1="0" y1="18" x2="36" y2="18" stroke="currentColor" strokeWidth="1" />
                <line x1="18" y1="0" x2="18" y2="36" stroke="currentColor" strokeWidth="1" />
                <circle cx="18" cy="18" r="9" fill="none" stroke="currentColor" strokeWidth="1" />
              </svg>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURE LEDGER */}
      <section id="features" className="relative z-10 px-6 md:px-12 py-20 md:py-32 border-t border-[#f4ede0]/10">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="mb-16 max-w-2xl"
          >
            <div className="text-[10px] tracking-[0.35em] uppercase font-mono text-[#e87a5d] mb-4 flex items-center gap-3">
              <span className="h-px w-10 bg-[#e87a5d]" />
              מה יש בפנים
            </div>
            <h2 className="font-serif text-4xl md:text-5xl lg:text-6xl leading-[1.05] tracking-tight">
              <span className="font-light text-[#f4ede0]/85">כלי עבודה,</span>{' '}
              <span className="italic gradient-text-coral font-medium">לא דשבורד.</span>
            </h2>
          </motion.div>

          <div className="space-y-0 border-y border-[#f4ede0]/10">
            {features.map((f, i) => (
              <motion.div
                key={f.tag}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.5 }}
                transition={{ duration: 0.7, delay: i * 0.08, ease: [0.22, 1, 0.36, 1] }}
                className="group grid grid-cols-[auto_1fr_auto] md:grid-cols-[120px_180px_1fr_auto] gap-x-6 md:gap-x-10 gap-y-2 py-8 md:py-10 border-b border-[#f4ede0]/10 last:border-b-0 items-start hover:bg-[#f4ede0]/[0.015] transition-colors"
              >
                <div className="text-[10px] tracking-[0.3em] uppercase font-mono text-[#e87a5d] pt-2">
                  {f.tag}
                </div>
                <div className="hidden md:block text-[11px] tracking-[0.25em] uppercase font-mono text-[#f4ede0]/55 pt-2">
                  {f.label}
                </div>
                <div>
                  <h3 className="font-serif text-2xl md:text-3xl text-[#f4ede0] leading-tight">
                    {f.title}
                  </h3>
                  <p className="mt-3 text-sm md:text-base text-[#f4ede0]/60 leading-relaxed max-w-xl">
                    {f.desc}
                  </p>
                  <div className="md:hidden text-[10px] tracking-[0.25em] uppercase font-mono text-[#f4ede0]/50 mt-3">
                    {f.label}
                  </div>
                </div>
                <div className="hidden md:flex w-12 h-12 rounded-full border border-[#f4ede0]/15 items-center justify-center text-[#f4ede0]/40 group-hover:text-[#e87a5d] group-hover:border-[#e87a5d]/40 transition-all duration-500">
                  <f.icon className="w-4 h-4" strokeWidth={1.5} />
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* SIGN IN */}
      <section id="signin" className="relative z-10 px-6 md:px-12 py-20 md:py-32 border-t border-[#f4ede0]/10">
        <div className="max-w-md mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="text-[10px] tracking-[0.35em] uppercase font-mono text-[#e87a5d] mb-4 flex items-center gap-3 justify-center">
              <span className="h-px w-10 bg-[#e87a5d]" />
              כניסה
              <span className="h-px w-10 bg-[#e87a5d]" />
            </div>
            <h2 className="font-serif text-4xl md:text-5xl text-center leading-tight tracking-tight mb-3">
              <span className="font-light text-[#f4ede0]/85">ברוכים</span>{' '}
              <span className="italic gradient-text-coral font-medium">הבאים.</span>
            </h2>
            <p className="text-center text-[#f4ede0]/55 text-sm mb-12">
              התחברו כדי לנהל את הפגישות וההכנסות
            </p>

            <div className="bg-gradient-to-b from-[#1a1612]/80 to-[#13100d]/80 backdrop-blur-xl border border-[#f4ede0]/10 rounded-2xl p-7 md:p-9 shadow-2xl shadow-black/50 ring-1 ring-white/[0.03]">
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <label htmlFor="email" className="text-[10px] tracking-[0.25em] uppercase font-mono text-[#f4ede0]/55 block">
                    אימייל
                  </label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    dir="ltr"
                    className="bg-transparent border-0 border-b border-[#f4ede0]/15 rounded-none px-0 h-11 text-[#f4ede0] placeholder:text-[#f4ede0]/25 focus-visible:border-[#e87a5d] focus-visible:ring-0 text-base"
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="password" className="text-[10px] tracking-[0.25em] uppercase font-mono text-[#f4ede0]/55 block">
                    סיסמה
                  </label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="bg-transparent border-0 border-b border-[#f4ede0]/15 rounded-none px-0 h-11 text-[#f4ede0] placeholder:text-[#f4ede0]/25 focus-visible:border-[#e87a5d] focus-visible:ring-0 text-base"
                  />
                </div>

                {error && (
                  <div className="border-r-2 border-[#e87a5d] bg-[#e87a5d]/10 px-3 py-2 text-sm text-[#f5b8a0]">
                    {error}
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-[#e87a5d] hover:bg-[#f08d72] text-[#0d0a08] rounded-full h-12 font-medium tracking-wide transition-all hover:scale-[1.01] glow-coral mt-2"
                >
                  {loading && <Loader2 className="w-4 h-4 animate-spin ml-2" />}
                  {loading ? 'מתחבר…' : 'התחברות'}
                </Button>
              </form>

              <div className="relative my-7">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-[#f4ede0]/10" />
                </div>
                <div className="relative flex justify-center">
                  <span className="bg-[#13100d] px-4 text-[10px] tracking-[0.3em] uppercase font-mono text-[#f4ede0]/40">או</span>
                </div>
              </div>

              <Button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={loading}
                variant="outline"
                className="w-full h-12 rounded-full bg-transparent border border-[#f4ede0]/15 text-[#f4ede0] hover:bg-[#f4ede0]/[0.04] hover:border-[#f4ede0]/25 hover:text-[#f4ede0] tracking-wide transition-all"
              >
                התחברות עם Google
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      <footer className="relative z-10 border-t border-[#f4ede0]/10 px-6 md:px-12 py-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-[10px] tracking-[0.3em] uppercase font-mono text-[#f4ede0]/40">
        <span>Tel Aviv · Press · 2026</span>
        <span className="text-[#e87a5d]">●</span>
        <span>Q2 · Edition 01</span>
      </footer>
    </div>
  );
};

export default Auth;
