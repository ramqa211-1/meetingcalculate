import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, orderBy, getDocs, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/use-auth';
import Layout from '@/components/Layout';
import KPICard from '@/components/dashboard/KPICard';
import EventsTable from '@/components/dashboard/EventsTable';
import AddEventDialog from '@/components/dashboard/AddEventDialog';
import { DollarSign, Calendar, Clock, TrendingUp, Shield, Download, ChevronRight, ChevronLeft } from 'lucide-react';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';
import { exportToJSON, exportToCSV } from '@/lib/export';
import CreateInvoiceDialog from '@/components/invoices/CreateInvoiceDialog';
import type { PrefillEvent } from '@/components/invoices/CreateInvoiceDialog';
import type { Invoice, BusinessProfile } from '@/types/invoice';
import InvoicePreview from '@/components/invoices/InvoicePreview';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { useToast } from '@/hooks/use-toast';

type RangeMode = 'month' | 'quarter' | 'half' | 'year';

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

const startOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1);
const addMonths = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth() + n, 1);

const Dashboard = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [invoicePrefill, setInvoicePrefill] = useState<PrefillEvent | null>(null);
  const [invoiceDialogOpen, setInvoiceDialogOpen] = useState(false);
  const [createdInvoice, setCreatedInvoice] = useState<{ invoice: Invoice; profile: BusinessProfile } | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<Date>(() => startOfMonth(new Date()));
  const [rangeMode, setRangeMode] = useState<RangeMode>('month');
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, isAdmin, loading: authLoading } = useAuth();

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

  const handleCreateInvoiceFromEvent = (event: Event) => {
    setInvoicePrefill({
      id: event.id,
      client_name: event.client_name,
      event_type: event.event_type,
      date: event.date,
      total_amount: event.total_amount,
    });
    setInvoiceDialogOpen(true);
  };

  const handleInvoiceCreated = (invoice: Invoice, profile: BusinessProfile) => {
    setCreatedInvoice({ invoice, profile });
    setInvoiceDialogOpen(false);
    setInvoicePrefill(null);
  };

  const handleTogglePayment = async (id: string, currentStatus: string) => {
    if (!user) return;
    const newStatus = currentStatus === 'paid' ? 'unpaid' : 'paid';
    // Optimistic update
    setEvents(prev => prev.map(e => e.id === id ? { ...e, payment_status: newStatus } : e));
    try {
      await updateDoc(doc(db, 'users', user.uid, 'events', id), { payment_status: newStatus });
      toast({
        title: newStatus === 'paid' ? 'סומן כשולם' : 'סומן כלא שולם',
        description: `סטטוס התשלום עודכן בהצלחה`,
      });
    } catch (error) {
      // Rollback on failure
      setEvents(prev => prev.map(e => e.id === id ? { ...e, payment_status: currentStatus } : e));
      console.error('Error toggling payment:', error);
      toast({ title: 'שגיאה', description: 'לא ניתן לעדכן את סטטוס התשלום', variant: 'destructive' });
    }
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

  const dateRange = useMemo(() => {
    if (rangeMode === 'month') {
      return { start: selectedMonth, end: addMonths(selectedMonth, 1) };
    }
    const monthsBack = rangeMode === 'quarter' ? 3 : rangeMode === 'half' ? 6 : 12;
    const nowMonth = startOfMonth(new Date());
    return { start: addMonths(nowMonth, -(monthsBack - 1)), end: addMonths(nowMonth, 1) };
  }, [rangeMode, selectedMonth]);

  const filteredEvents = useMemo(() => {
    return events.filter((e) => {
      const d = new Date(e.date);
      return d >= dateRange.start && d < dateRange.end;
    });
  }, [events, dateRange]);

  const calculateKPIs = (list: Event[]) => {
    const totalRevenue = list.reduce((sum, event) => sum + event.total_amount, 0);
    const paidRevenue = list
      .filter((e) => e.payment_status === 'paid')
      .reduce((sum, event) => sum + event.total_amount, 0);
    const unpaidRevenue = totalRevenue - paidRevenue;
    const totalHours = list.reduce((sum, event) => sum + event.duration_hours, 0);
    return {
      totalRevenue,
      paidRevenue,
      unpaidRevenue,
      totalEvents: list.length,
      totalHours,
    };
  };

  const kpis = calculateKPIs(filteredEvents);

  const minMonth = useMemo(() => addMonths(startOfMonth(new Date()), -11), []);
  const canGoPrev = selectedMonth > minMonth;
  const goPrevMonth = () => setSelectedMonth((m) => addMonths(m, -1));
  const goNextMonth = () => setSelectedMonth((m) => addMonths(m, 1));
  const monthLabel = format(selectedMonth, 'LLLL yyyy', { locale: he });

  const rangeLabel =
    rangeMode === 'month'
      ? monthLabel
      : rangeMode === 'quarter'
      ? '3 חודשים אחרונים'
      : rangeMode === 'half'
      ? 'חצי שנה אחרונה'
      : 'שנה אחרונה';

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
  <>
    <Layout>
      <div className="space-y-8 md:space-y-12 py-2">
        {/* Editorial masthead */}
        <header className="border-b border-foreground/15 pb-6 md:pb-8">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
            <div>
              <div className="eyebrow-lg mb-3 flex items-center gap-3">
                <span>דו״ח רבעוני</span>
                <span className="h-px w-8 bg-foreground/40" />
                <span className="font-mono tabular-nums">{format(new Date(), 'yyyy', { locale: he })}</span>
                {isAdmin && (
                  <>
                    <span className="h-px w-8 bg-foreground/40" />
                    <span className="inline-flex items-center gap-1 text-primary normal-case tracking-normal text-[11px]">
                      <Shield className="w-3 h-3" />
                      Admin
                    </span>
                  </>
                )}
              </div>
              <h1 className="font-serif text-4xl md:text-6xl leading-[1.05] text-foreground">
                לוח הבקרה
              </h1>
              <p className="mt-3 text-sm md:text-base text-muted-foreground max-w-md leading-relaxed">
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
                <DropdownMenuItem onClick={() => exportToJSON(filteredEvents, `events-${rangeMode}`)}>
                  JSON ({rangeLabel})
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => exportToCSV(filteredEvents as Record<string, unknown>[], `events-${rangeMode}`)}>
                  CSV ({rangeLabel})
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => exportToJSON(events, 'events-all')}>
                  JSON (כל ההיסטוריה)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => exportToCSV(events as Record<string, unknown>[], 'events-all')}>
                  CSV (כל ההיסטוריה)
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
        </header>

        {/* Range selector — editorial pill row */}
        <div className="flex flex-col items-center gap-4">
          <div className="eyebrow">תקופת צפייה</div>
          <ToggleGroup
            type="single"
            value={rangeMode}
            onValueChange={(v) => v && setRangeMode(v as RangeMode)}
            className="bg-card border border-border rounded-sm divide-x divide-border/70 [&>*]:rounded-none [&>*:first-child]:rounded-r-sm [&>*:last-child]:rounded-l-sm"
          >
            <ToggleGroupItem value="month" className="px-3 sm:px-5 text-xs sm:text-sm font-medium data-[state=on]:bg-foreground data-[state=on]:text-background">חודש</ToggleGroupItem>
            <ToggleGroupItem value="quarter" className="px-3 sm:px-5 text-xs sm:text-sm font-medium data-[state=on]:bg-foreground data-[state=on]:text-background">3 חודשים</ToggleGroupItem>
            <ToggleGroupItem value="half" className="px-3 sm:px-5 text-xs sm:text-sm font-medium data-[state=on]:bg-foreground data-[state=on]:text-background">חצי שנה</ToggleGroupItem>
            <ToggleGroupItem value="year" className="px-3 sm:px-5 text-xs sm:text-sm font-medium data-[state=on]:bg-foreground data-[state=on]:text-background">שנה</ToggleGroupItem>
          </ToggleGroup>

          {rangeMode === 'month' ? (
            <div className="flex items-center gap-3 sm:gap-5">
              <Button
                variant="ghost"
                size="sm"
                onClick={goPrevMonth}
                disabled={!canGoPrev}
                className="h-8 w-8 p-0 hover:bg-foreground/5"
                title={canGoPrev ? 'חודש קודם' : 'הארכיון מוגבל ל-12 חודשים'}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
              <span className="font-serif text-2xl sm:text-3xl capitalize min-w-[180px] text-center text-foreground">
                {monthLabel}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={goNextMonth}
                className="h-8 w-8 p-0 hover:bg-foreground/5"
                title="חודש הבא"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
            </div>
          ) : (
            <div className="font-serif text-2xl sm:text-3xl text-foreground">{rangeLabel}</div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard
            title="הכנסה כוללת"
            value={formatCurrency(kpis.totalRevenue)}
            subtitle={`${rangeLabel} — מכל הפגישות`}
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
            title="ממתין לתשלום"
            value={formatCurrency(kpis.unpaidRevenue)}
            subtitle="הכנסה צפויה"
            icon={<Clock />}
            colorClass="text-warning"
          />
          <KPICard
            title="פגישות"
            value={kpis.totalEvents}
            subtitle={`${kpis.totalHours} שעות סה"כ`}
            icon={<Calendar />}
            colorClass="text-info"
          />
        </div>

        <section className="space-y-5">
          <div className="flex items-end justify-between border-b border-foreground/15 pb-3">
            <div>
              <div className="eyebrow mb-1">לוח פעילות</div>
              <h2 className="font-serif text-2xl sm:text-3xl text-foreground leading-tight">
                פגישות · {rangeLabel}
              </h2>
            </div>
            <div className="font-mono text-xs text-muted-foreground tabular-nums">
              {filteredEvents.length} רשומות
            </div>
          </div>
          <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
            <EventsTable
              events={filteredEvents}
              onEdit={handleEditEvent}
              onDelete={handleDeleteEvent}
              onTogglePayment={handleTogglePayment}
              onCreateInvoice={handleCreateInvoiceFromEvent}
            />
          </div>
        </section>
      </div>
    </Layout>

    {/* Invoice creation from event row (controlled) */}
    <CreateInvoiceDialog
      onCreated={handleInvoiceCreated}
      open={invoiceDialogOpen}
      onOpenChange={open => { setInvoiceDialogOpen(open); if (!open) setInvoicePrefill(null); }}
      prefillEvent={invoicePrefill ?? undefined}
    />

    {/* Auto-open preview after invoice is created */}
    {createdInvoice && (
      <InvoicePreview
        open={!!createdInvoice}
        onOpenChange={o => !o && setCreatedInvoice(null)}
        invoice={createdInvoice.invoice}
        businessProfile={createdInvoice.profile}
      />
    )}
  </>
  );
};

export default Dashboard;
