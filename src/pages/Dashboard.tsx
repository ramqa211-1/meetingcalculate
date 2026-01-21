import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import Layout from '@/components/Layout';
import KPICard from '@/components/dashboard/KPICard';
import EventsTable from '@/components/dashboard/EventsTable';
import AddEventDialog from '@/components/dashboard/AddEventDialog';
import { DollarSign, Calendar, Clock, TrendingUp, Shield } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
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
  notes?: string;
  tags?: string[];
}

const Dashboard = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isAdmin, loading: authLoading } = useAuth();

  useEffect(() => {
    checkAuth();
    fetchEvents();
  }, []);

  useEffect(() => {
    if (!authLoading) {
      fetchEvents();
    }
  }, [isAdmin, authLoading]);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate('/auth');
    }
  };

  const fetchEvents = async () => {
    try {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .order('date', { ascending: false });

      if (error) throw error;
      setEvents(data || []);
    } catch (error) {
      console.error('Error fetching events:', error);
      toast({
        title: 'שגיאה',
        description: 'לא ניתן לטעון את הפגישות',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEditEvent = (event: Event) => {
    setEditingEvent(event);
  };

  const handleEditComplete = () => {
    setEditingEvent(null);
    fetchEvents();
  };

  const handleDeleteEvent = async (id: string) => {
    try {
      const { error } = await supabase.from('events').delete().eq('id', id);
      if (error) throw error;

      toast({
        title: 'הפגישה נמחקה',
        description: 'הפגישה הוסרה מהמערכת',
      });
      fetchEvents();
    } catch (error) {
      console.error('Error deleting event:', error);
      toast({
        title: 'שגיאה',
        description: 'לא ניתן למחוק את הפגישה',
        variant: 'destructive',
      });
    }
  };

  const calculateKPIs = () => {
    const totalRevenue = events.reduce((sum, event) => sum + event.total_amount, 0);
    const paidRevenue = events
      .filter((e) => e.payment_status === 'paid')
      .reduce((sum, event) => sum + event.total_amount, 0);
    const unpaidRevenue = totalRevenue - paidRevenue;
    const totalHours = events.reduce((sum, event) => sum + event.duration_hours, 0);

    return {
      totalRevenue,
      paidRevenue,
      unpaidRevenue,
      totalEvents: events.length,
      totalHours,
    };
  };

  const kpis = calculateKPIs();

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
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-bold text-foreground">לוח הבקרה</h1>
              {isAdmin && (
                <div className="flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary rounded-md text-sm">
                  <Shield className="w-4 h-4" />
                  <span>אדמין</span>
                </div>
              )}
            </div>
            <p className="text-muted-foreground mt-1">
              {isAdmin 
                ? 'סקירה מלאה של כל הפגישות וההכנסות במערכת'
                : 'סקירה מלאה של הפגישות וההכנסות שלך'
              }
            </p>
          </div>
          <AddEventDialog 
            editEvent={editingEvent} 
            onEditComplete={handleEditComplete}
            onEventAdded={fetchEvents}
          />
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard
            title="הכנסה כוללת"
            value={formatCurrency(kpis.totalRevenue)}
            subtitle="מכל הפגישות"
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
            title="ממתין לתשלום"
            value={formatCurrency(kpis.unpaidRevenue)}
            subtitle="הכנסה צפויה"
            icon={<Clock className="w-5 h-5" />}
            colorClass="bg-warning/10 text-warning"
          />
          <KPICard
            title="פגישות"
            value={kpis.totalEvents}
            subtitle={`${kpis.totalHours} שעות סה"כ`}
            icon={<Calendar className="w-5 h-5" />}
            colorClass="bg-info/10 text-info"
          />
        </div>

        {/* Events Table */}
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-foreground">פגישות אחרונות</h2>
          <EventsTable
            events={events}
            onEdit={handleEditEvent}
            onDelete={handleDeleteEvent}
          />
        </div>
      </div>
    </Layout>
  );
};

export default Dashboard;
