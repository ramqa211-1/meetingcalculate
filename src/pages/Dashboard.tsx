import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, orderBy, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/use-auth';
import Layout from '@/components/Layout';
import KPICard from '@/components/dashboard/KPICard';
import EventsTable from '@/components/dashboard/EventsTable';
import AddEventDialog from '@/components/dashboard/AddEventDialog';
import { DollarSign, Calendar, Clock, TrendingUp, Shield, Download } from 'lucide-react';
import { exportToJSON, exportToCSV } from '@/lib/export';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import backgroundImage from '@/assets/background.png';

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
  const { user, isAdmin, loading: authLoading } = useAuth();
  const isMobile = useIsMobile();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
      return;
    }
    if (user) {
      fetchEvents();
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!authLoading && user) {
      fetchEvents();
    }
  }, [isAdmin, authLoading, user]);

  const fetchEvents = async () => {
    if (!user) return;
    try {
      const q = query(
        collection(db, 'users', user.uid, 'events'),
        orderBy('date', 'desc')
      );
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Event));
      setEvents(data);
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
    if (!user) return;
    try {
      await deleteDoc(doc(db, 'users', user.uid, 'events', id));
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
      <div
        className="space-y-6 md:space-y-8 p-4 md:p-8 rounded-lg min-h-[calc(100vh-200px)] bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: isMobile ? undefined : `url(${backgroundImage})`,
          backgroundColor: isMobile ? 'hsl(var(--muted) / 0.5)' : undefined,
        }}
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground">לוח הבקרה</h1>
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
                : 'סקירה מלאה של הפגישות וההכנסות שלך'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <Download className="w-4 h-4" />
                  ייצוא נתונים
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => exportToJSON(events, 'events')}>
                  JSON
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => exportToCSV(events as Record<string, unknown>[], 'events')}>
                  CSV
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <AddEventDialog
              editEvent={editingEvent}
              onEditComplete={handleEditComplete}
              onEventAdded={fetchEvents}
            />
          </div>
        </div>

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

        <div className="space-y-4">
          <h2 className="text-xl sm:text-2xl font-bold text-foreground">פגישות אחרונות</h2>
          <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
            <EventsTable
              events={events}
              onEdit={handleEditEvent}
              onDelete={handleDeleteEvent}
            />
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Dashboard;
