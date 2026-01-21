import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import Layout from '@/components/Layout';
import KPICard from '@/components/dashboard/KPICard';
import { DollarSign, Calendar, Clock, TrendingUp, PieChart, Shield } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend, Pie, PieChart as RePieChart, Cell } from 'recharts';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { he } from 'date-fns/locale';
import { useAuth } from '@/hooks/use-auth';

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

const COLORS = ['hsl(243, 75%, 59%)', 'hsl(142, 76%, 36%)', 'hsl(38, 92%, 50%)', 'hsl(199, 89%, 48%)', 'hsl(280, 61%, 50%)'];

const Reports = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { isAdmin, loading: authLoading } = useAuth();

  useEffect(() => {
    checkAuth();
    fetchMonthlyEvents();
  }, []);

  useEffect(() => {
    if (!authLoading) {
      fetchMonthlyEvents();
    }
  }, [isAdmin, authLoading]);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate('/auth');
    }
  };

  const fetchMonthlyEvents = async () => {
    try {
      const start = format(startOfMonth(new Date()), 'yyyy-MM-dd');
      const end = format(endOfMonth(new Date()), 'yyyy-MM-dd');

      const { data, error } = await supabase
        .from('events')
        .select('*')
        .gte('date', start)
        .lte('date', end);

      if (error) throw error;
      setEvents(data || []);
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

    return Array.from(typeMap.entries()).map(([name, value]) => ({
      name,
      value,
    }));
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

    return Array.from(weekMap.entries()).map(([name, revenue]) => ({
      name,
      revenue,
    }));
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
      <div className="space-y-8">
        {/* Header */}
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold text-foreground">דוח חודשי</h1>
            {isAdmin && (
              <div className="flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary rounded-md text-sm">
                <Shield className="w-4 h-4" />
                <span>אדמין</span>
              </div>
            )}
          </div>
          <p className="text-muted-foreground mt-1">
            {format(new Date(), 'MMMM yyyy', { locale: he })}
            {isAdmin && ' - כל האירועים במערכת'}
          </p>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard
            title="הכנסה צפויה החודש"
            value={formatCurrency(kpis.totalRevenue)}
            subtitle="סך הכל"
            icon={<DollarSign className="w-5 h-5" />}
            colorClass="bg-primary/10 text-primary"
          />
          <KPICard
            title="כבר שולם"
            value={formatCurrency(kpis.paidRevenue)}
            subtitle="הכנסה שהתקבלה"
            icon={<TrendingUp className="w-5 h-5" />}
            colorClass="bg-accent/10 text-accent"
          />
          <KPICard
            title="מספר אירועים"
            value={kpis.totalEvents}
            subtitle="החודש"
            icon={<Calendar className="w-5 h-5" />}
            colorClass="bg-info/10 text-info"
          />
          <KPICard
            title="שעות מצטברות"
            value={kpis.totalHours.toFixed(1)}
            subtitle={`ממוצע ${formatCurrency(kpis.avgRate)}/שעה`}
            icon={<Clock className="w-5 h-5" />}
            colorClass="bg-warning/10 text-warning"
          />
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Weekly Revenue Chart */}
          <Card>
            <CardHeader>
              <CardTitle>הכנסות לפי שבוע</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={weeklyData}>
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip 
                    formatter={(value) => formatCurrency(value as number)}
                    labelStyle={{ color: 'hsl(var(--foreground))' }}
                  />
                  <Legend />
                  <Bar dataKey="revenue" fill="hsl(243, 75%, 59%)" name="הכנסה" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Event Type Distribution */}
          <Card>
            <CardHeader>
              <CardTitle>חלוקה לפי סוג שירות</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <RePieChart>
                  <Pie
                    data={eventTypeData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={(entry) => `${entry.name}: ${formatCurrency(entry.value)}`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {eventTypeData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => formatCurrency(value as number)} />
                </RePieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Additional Stats */}
        <Card>
          <CardHeader>
            <CardTitle>סטטיסטיקות נוספות</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <p className="text-2xl font-bold text-primary">
                  {formatCurrency(kpis.unpaidRevenue)}
                </p>
                <p className="text-sm text-muted-foreground mt-1">ממתין לתשלום</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-accent">
                  {((kpis.paidRevenue / kpis.totalRevenue) * 100 || 0).toFixed(1)}%
                </p>
                <p className="text-sm text-muted-foreground mt-1">אחוז תשלום</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-info">
                  {(kpis.totalEvents > 0 ? kpis.totalRevenue / kpis.totalEvents : 0).toFixed(0)} ₪
                </p>
                <p className="text-sm text-muted-foreground mt-1">ממוצע לפגישה</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default Reports;
