import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, orderBy, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/use-auth';
import Layout from '@/components/Layout';
import KPICard from '@/components/dashboard/KPICard';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { useToast } from '@/hooks/use-toast';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';
import { DollarSign, Calendar, Clock, TrendingUp, BarChart3 } from 'lucide-react';

interface Event {
  id: string;
  date: string;
  duration_hours: number;
  client_name: string;
  event_type: string;
  total_amount: number;
  payment_status: string;
}

type RangeMode = 'quarter' | 'half' | 'year';

const startOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1);
const addMonths = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth() + n, 1);

// Editorial financial palette — earthy, warm, distinctive
const COLORS = [
  'hsl(9 65% 32%)',   // oxblood
  'hsl(155 35% 26%)', // forest
  'hsl(32 70% 38%)',  // mustard
  'hsl(200 35% 30%)', // deep teal
  'hsl(25 35% 25%)',  // cocoa
  'hsl(280 25% 35%)', // deep plum
  'hsl(355 45% 40%)', // crimson
  'hsl(45 45% 50%)',  // antique gold
];

const formatCurrency = (n: number) =>
  new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS', maximumFractionDigits: 0 }).format(n);

const Statistics = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [rangeMode, setRangeMode] = useState<RangeMode>('year');
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
      return;
    }
    if (user) fetchEvents();
  }, [user, authLoading, navigate]);

  const fetchEvents = async () => {
    if (!user) return;
    try {
      const q = query(collection(db, 'users', user.uid, 'events'), orderBy('date', 'desc'));
      const snap = await getDocs(q);
      setEvents(snap.docs.map(d => ({ id: d.id, ...d.data() } as Event)));
    } catch (err) {
      console.error('fetch events failed:', err);
      toast({ title: 'שגיאה', description: 'לא ניתן לטעון נתונים', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const monthsBack = rangeMode === 'quarter' ? 3 : rangeMode === 'half' ? 6 : 12;

  const filteredEvents = useMemo(() => {
    const start = addMonths(startOfMonth(new Date()), -(monthsBack - 1));
    const end = addMonths(startOfMonth(new Date()), 1);
    return events.filter(e => {
      const d = new Date(e.date);
      return d >= start && d < end;
    });
  }, [events, monthsBack]);

  // === KPIs ===
  const totalRevenue = filteredEvents.reduce((s, e) => s + e.total_amount, 0);
  const totalEvents = filteredEvents.length;
  const avgPerEvent = totalEvents ? totalRevenue / totalEvents : 0;
  const totalHours = filteredEvents.reduce((s, e) => s + e.duration_hours, 0);
  const paidRevenue = filteredEvents.filter(e => e.payment_status === 'paid').reduce((s, e) => s + e.total_amount, 0);
  const unpaidRevenue = totalRevenue - paidRevenue;

  // === Revenue & events trend by month ===
  const monthlyTrend = useMemo(() => {
    const buckets = new Map<string, { month: string; revenue: number; events: number; hours: number }>();
    for (let i = monthsBack - 1; i >= 0; i--) {
      const m = addMonths(startOfMonth(new Date()), -i);
      const key = format(m, 'yyyy-MM');
      buckets.set(key, {
        month: format(m, 'MMM yy', { locale: he }),
        revenue: 0,
        events: 0,
        hours: 0,
      });
    }
    for (const e of filteredEvents) {
      const key = format(new Date(e.date), 'yyyy-MM');
      const b = buckets.get(key);
      if (b) {
        b.revenue += e.total_amount;
        b.events += 1;
        b.hours += e.duration_hours;
      }
    }
    return Array.from(buckets.values());
  }, [filteredEvents, monthsBack]);

  // === Paid vs Unpaid ===
  const paymentSplit = [
    { name: 'שולם', value: paidRevenue },
    { name: 'ממתין לתשלום', value: unpaidRevenue },
  ].filter(d => d.value > 0);

  // === Top clients ===
  const topClients = useMemo(() => {
    const m = new Map<string, { name: string; revenue: number; events: number }>();
    for (const e of filteredEvents) {
      const key = e.client_name || 'לא ידוע';
      const ex = m.get(key) || { name: key, revenue: 0, events: 0 };
      ex.revenue += e.total_amount;
      ex.events += 1;
      m.set(key, ex);
    }
    return Array.from(m.values()).sort((a, b) => b.revenue - a.revenue).slice(0, 5);
  }, [filteredEvents]);

  // === Event types ===
  const eventTypeBreakdown = useMemo(() => {
    const m = new Map<string, number>();
    for (const e of filteredEvents) {
      const key = e.event_type || 'אחר';
      m.set(key, (m.get(key) || 0) + 1);
    }
    return Array.from(m.entries()).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [filteredEvents]);

  const rangeLabel =
    rangeMode === 'quarter' ? '3 חודשים אחרונים' : rangeMode === 'half' ? 'חצי שנה אחרונה' : 'שנה אחרונה';

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">טוען...</p>
        </div>
      </Layout>
    );
  }

  if (filteredEvents.length === 0) {
    return (
      <Layout>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
              <BarChart3 className="w-7 h-7" />
              סטטיסטיקות וגרפים
            </h1>
            <p className="text-muted-foreground mt-1">תובנות ומגמות מהנתונים שלך</p>
          </div>
          <Card>
            <CardContent className="py-16 text-center text-muted-foreground">
              אין מספיק נתונים להצגה. הוסף פגישות כדי לראות סטטיסטיקות.
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-8 md:space-y-10">
        <header className="border-b border-foreground/15 pb-6 md:pb-8">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
            <div>
              <div className="eyebrow-lg mb-3 flex items-center gap-3">
                <span>תובנות ומגמות</span>
                <span className="h-px w-8 bg-foreground/40" />
                <span className="font-mono tabular-nums">Analytics</span>
              </div>
              <h1 className="font-serif text-4xl md:text-6xl leading-[1.05] text-foreground">
                סטטיסטיקות וגרפים
              </h1>
              <p className="mt-3 text-sm md:text-base text-muted-foreground max-w-md leading-relaxed">
                תובנות ומגמות מהנתונים שלך — {rangeLabel}
              </p>
            </div>
            <ToggleGroup
              type="single"
              value={rangeMode}
              onValueChange={(v) => v && setRangeMode(v as RangeMode)}
              className="bg-card border border-border rounded-sm divide-x divide-border/70 [&>*]:rounded-none [&>*:first-child]:rounded-r-sm [&>*:last-child]:rounded-l-sm"
            >
              <ToggleGroupItem value="quarter" className="px-3 sm:px-5 text-xs sm:text-sm font-medium data-[state=on]:bg-foreground data-[state=on]:text-background">3 חודשים</ToggleGroupItem>
              <ToggleGroupItem value="half" className="px-3 sm:px-5 text-xs sm:text-sm font-medium data-[state=on]:bg-foreground data-[state=on]:text-background">חצי שנה</ToggleGroupItem>
              <ToggleGroupItem value="year" className="px-3 sm:px-5 text-xs sm:text-sm font-medium data-[state=on]:bg-foreground data-[state=on]:text-background">שנה</ToggleGroupItem>
            </ToggleGroup>
          </div>
        </header>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard
            title="הכנסה כוללת"
            value={formatCurrency(totalRevenue)}
            subtitle={rangeLabel}
            icon={<DollarSign />}
            colorClass="text-primary"
          />
          <KPICard
            title="ממוצע לפגישה"
            value={formatCurrency(avgPerEvent)}
            subtitle={`${totalEvents} פגישות`}
            icon={<TrendingUp />}
            colorClass="text-accent"
          />
          <KPICard
            title="פגישות"
            value={totalEvents}
            subtitle={`${totalHours.toFixed(1)} שעות סה"כ`}
            icon={<Calendar />}
            colorClass="text-info"
          />
          <KPICard
            title="ממוצע לחודש"
            value={formatCurrency(totalRevenue / monthsBack)}
            subtitle={`לאורך ${monthsBack} חודשים`}
            icon={<Clock />}
            colorClass="text-warning"
          />
        </div>

        {/* Revenue trend */}
        <Card>
          <CardHeader>
            <CardTitle>מגמת הכנסה לאורך זמן</CardTitle>
            <CardDescription>הכנסה חודשית — {rangeLabel}</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={monthlyTrend} margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="month" reversed />
                <YAxis tickFormatter={(v) => `₪${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  formatter={(v: number) => formatCurrency(v)}
                  labelStyle={{ direction: 'rtl' }}
                />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  name="הכנסה"
                  stroke={COLORS[0]}
                  strokeWidth={3}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Two-column row: Payment split + Event types */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle>שולם מול ממתין</CardTitle>
              <CardDescription>פילוח הכנסה לפי סטטוס תשלום</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie
                    data={paymentSplit}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={2}
                    label={(entry) => formatCurrency(entry.value as number)}
                  >
                    {paymentSplit.map((_, i) => (
                      <Cell key={i} fill={i === 0 ? COLORS[1] : COLORS[2]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: number) => formatCurrency(v)} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>פילוח לפי סוג פגישה</CardTitle>
              <CardDescription>מספר פגישות לפי קטגוריה</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie
                    data={eventTypeBreakdown}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
                    label={(entry) => `${entry.name} (${entry.value})`}
                  >
                    {eventTypeBreakdown.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Top clients */}
        <Card>
          <CardHeader>
            <CardTitle>5 הלקוחות המובילים</CardTitle>
            <CardDescription>מדורג לפי הכנסה — {rangeLabel}</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={topClients} layout="vertical" margin={{ top: 5, right: 20, left: 80, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis type="number" tickFormatter={(v) => `₪${(v / 1000).toFixed(0)}k`} />
                <YAxis dataKey="name" type="category" width={120} />
                <Tooltip
                  formatter={(v: number, name: string) =>
                    name === 'revenue' ? formatCurrency(v) : `${v} פגישות`
                  }
                />
                <Bar dataKey="revenue" name="הכנסה" fill={COLORS[0]} radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Hours per month + Events per month */}
        <Card>
          <CardHeader>
            <CardTitle>פעילות חודשית</CardTitle>
            <CardDescription>שעות עבודה ומספר פגישות לפי חודש</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={monthlyTrend} margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="month" reversed />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip />
                <Legend />
                <Bar yAxisId="left" dataKey="events" name="פגישות" fill={COLORS[0]} radius={[6, 6, 0, 0]} />
                <Bar yAxisId="right" dataKey="hours" name="שעות" fill={COLORS[1]} radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default Statistics;
