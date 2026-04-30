import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/use-auth';
import Layout from '@/components/Layout';
import KPICard from '@/components/dashboard/KPICard';
import AIInsightsCard from '@/components/dashboard/AIInsightsCard';
import { useEmploymentContext } from '@/hooks/use-employment-context';
import { useIsMobile } from '@/hooks/use-mobile';
import { DollarSign, Calendar, Clock, TrendingUp, Shield, Download } from 'lucide-react';
import { exportToJSON, exportToCSV } from '@/lib/export';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend, Pie, PieChart as RePieChart, Cell } from 'recharts';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { he } from 'date-fns/locale';

interface Event {
  id: string;
  date: string;
  start_time: string;
  duration_hours: number;
  client_name: string;
  event_type: string;
  rate_type: string;
  rate: number;
  total_amount: number;
  payment_status: string;
  source: string;
}

// Editorial financial palette — earthy, warm, distinctive
const COLORS = [
  'hsl(9 65% 32%)',   // oxblood
  'hsl(155 35% 26%)', // forest
  'hsl(32 70% 38%)',  // mustard
  'hsl(200 35% 30%)', // deep teal
  'hsl(25 35% 25%)',  // cocoa
];

const Reports = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { user, isAdmin, loading: authLoading } = useAuth();
  const { employmentContext } = useEmploymentContext();
  const isMobile = useIsMobile();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
      return;
    }
    if (user) {
      fetchMonthlyEvents();
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!authLoading && user) {
      fetchMonthlyEvents();
    }
  }, [isAdmin, authLoading, user]);

  const fetchMonthlyEvents = async () => {
    if (!user) return;
    try {
      const start = format(startOfMonth(new Date()), 'yyyy-MM-dd');
      const end = format(endOfMonth(new Date()), 'yyyy-MM-dd');
      const q = query(
        collection(db, 'users', user.uid, 'events'),
        where('date', '>=', start),
        where('date', '<=', end)
      );
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Event));
      setEvents(data);
    } catch (error) {
      console.error('Error fetching events:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateKPIs = () => {
    const totalRevenue = events.reduce((sum, event) => sum + event.total_amount, 0);
    const paidRevenue = events
      .filter((e) => e.payment_status === 'paid')
      .reduce((sum, event) => sum + event.total_amount, 0);
    const unpaidRevenue = totalRevenue - paidRevenue;
    const totalHours = events.reduce((sum, event) => sum + event.duration_hours, 0);
    const avgRate = totalHours > 0 ? totalRevenue / totalHours : 0;
    return {
      totalRevenue,
      paidRevenue,
      unpaidRevenue,
      totalEvents: events.length,
      totalHours,
      avgRate,
    };
  };

  const getEventTypeData = () => {
    const typeMap = new Map<string, number>();
    events.forEach((event) => {
      const current = typeMap.get(event.event_type) || 0;
      typeMap.set(event.event_type, current + event.total_amount);
    });
    return Array.from(typeMap.entries()).map(([name, value]) => ({ name, value }));
  };

  const getWeeklyData = () => {
    const weekMap = new Map<string, number>();
    events.forEach((event) => {
      const date = new Date(event.date);
      const weekNum = Math.floor(date.getDate() / 7) + 1;
      const weekKey = `שבוע ${weekNum}`;
      const current = weekMap.get(weekKey) || 0;
      weekMap.set(weekKey, current + event.total_amount);
    });
    return Array.from(weekMap.entries()).map(([name, revenue]) => ({ name, revenue }));
  };

  const kpis = calculateKPIs();
  const eventTypeData = getEventTypeData();
  const weeklyData = getWeeklyData();

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('he-IL', {
      style: 'currency',
      currency: 'ILS',
    }).format(amount);
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
      <div className="space-y-8 md:space-y-10">
        <header className="border-b border-foreground/15 pb-6 md:pb-8">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
            <div>
              <div className="eyebrow-lg mb-3 flex items-center gap-3">
                <span>דוח רבעוני</span>
                <span className="h-px w-8 bg-foreground/40" />
                <span className="font-mono tabular-nums">§ Reports</span>
                {isAdmin && (
                  <span className="inline-flex items-center gap-1 border border-primary/40 text-primary px-2 py-0.5 text-[10px] tracking-[0.2em] uppercase">
                    <Shield className="w-3 h-3" />
                    אדמין
                  </span>
                )}
              </div>
              <h1 className="font-serif text-4xl md:text-6xl leading-[1.05] text-foreground">
                דוח חודשי
              </h1>
              <p className="mt-3 text-sm md:text-base text-muted-foreground max-w-md leading-relaxed">
                {format(new Date(), 'MMMM yyyy', { locale: he })}
                {isAdmin && ' · כל האירועים במערכת'}
              </p>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2 rounded-sm font-mono text-xs tracking-wider uppercase">
                  <Download className="w-3.5 h-3.5" />
                  ייצוא
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => exportToJSON(events, 'events-monthly')}>
                  JSON
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => exportToCSV(events as Record<string, unknown>[], 'events-monthly')}>
                  CSV
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <AIInsightsCard
          events={events}
          kpis={kpis}
          employmentContext={employmentContext}
          formatCurrency={formatCurrency}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard
            title="הכנסה צפויה החודש"
            value={formatCurrency(kpis.totalRevenue)}
            subtitle="סך הכל"
            icon={<DollarSign />}
            colorClass="text-primary"
          />
          <KPICard
            title="כבר שולם"
            value={formatCurrency(kpis.paidRevenue)}
            subtitle="הכנסה שהתקבלה"
            icon={<TrendingUp />}
            colorClass="text-accent"
          />
          <KPICard
            title="מספר אירועים"
            value={kpis.totalEvents}
            subtitle="החודש"
            icon={<Calendar />}
            colorClass="text-foreground"
          />
          <KPICard
            title="שעות מצטברות"
            value={kpis.totalHours.toFixed(1)}
            subtitle={`ממוצע ${formatCurrency(kpis.avgRate)}/שעה`}
            icon={<Clock />}
            colorClass="text-foreground"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="rounded-sm">
            <CardHeader className="border-b border-border/60 pb-4">
              <div className="eyebrow mb-1">תרשים I</div>
              <CardTitle className="font-serif text-2xl">הכנסות לפי שבוע</CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <ResponsiveContainer width="100%" height={isMobile ? 250 : 300}>
                <BarChart data={weeklyData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} angle={0} />
                  <YAxis
                    tick={{ fontSize: 12 }}
                    tickFormatter={(value) => {
                      if (value >= 1000) return `₪${(value / 1000).toFixed(0)}K`;
                      return `₪${value}`;
                    }}
                    width={50}
                  />
                  <Tooltip
                    formatter={(value) => formatCurrency(value as number)}
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '6px',
                    }}
                    labelStyle={{ color: 'hsl(var(--foreground))' }}
                  />
                  <Legend wrapperStyle={{ paddingTop: '20px' }} />
                  <Bar dataKey="revenue" fill="hsl(9 65% 32%)" name="הכנסה" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="rounded-sm">
            <CardHeader className="border-b border-border/60 pb-4">
              <div className="eyebrow mb-1">תרשים II</div>
              <CardTitle className="font-serif text-2xl">חלוקה לפי סוג שירות</CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <ResponsiveContainer width="100%" height={isMobile ? 250 : 300}>
                <RePieChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                  <Pie
                    data={eventTypeData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => (percent > 0.05 ? `${name} (${(percent * 100).toFixed(0)}%)` : '')}
                    outerRadius={100}
                    innerRadius={60}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {eventTypeData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value) => formatCurrency(value as number)}
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '6px',
                    }}
                  />
                  <Legend layout="horizontal" align="center" verticalAlign="bottom" wrapperStyle={{ paddingTop: '20px' }} />
                </RePieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        <Card className="rounded-sm">
          <CardHeader className="border-b border-border/60 pb-4">
            <div className="eyebrow mb-1">סטטיסטיקות נוספות</div>
            <CardTitle className="font-serif text-2xl">חיתוכי מפתח</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 sm:divide-x sm:divide-border/70 sm:[direction:rtl]">
              <div className="text-center px-4">
                <p className="font-mono tabular-nums text-3xl md:text-4xl text-primary leading-none">
                  {formatCurrency(kpis.unpaidRevenue)}
                </p>
                <div className="h-px w-10 bg-foreground/30 mx-auto my-3" />
                <p className="eyebrow text-muted-foreground">ממתין לתשלום</p>
              </div>
              <div className="text-center px-4">
                <p className="font-mono tabular-nums text-3xl md:text-4xl text-foreground leading-none">
                  {((kpis.paidRevenue / kpis.totalRevenue) * 100 || 0).toFixed(1)}%
                </p>
                <div className="h-px w-10 bg-foreground/30 mx-auto my-3" />
                <p className="eyebrow text-muted-foreground">אחוז תשלום</p>
              </div>
              <div className="text-center px-4">
                <p className="font-mono tabular-nums text-3xl md:text-4xl text-foreground leading-none">
                  {(kpis.totalEvents > 0 ? kpis.totalRevenue / kpis.totalEvents : 0).toFixed(0)} ₪
                </p>
                <div className="h-px w-10 bg-foreground/30 mx-auto my-3" />
                <p className="eyebrow text-muted-foreground">ממוצע לפגישה</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default Reports;
