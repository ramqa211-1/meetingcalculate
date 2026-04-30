import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import Layout from '@/components/Layout';
import PageMasthead from '@/components/PageMasthead';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Eye, XCircle } from 'lucide-react';
import CreateInvoiceDialog from '@/components/invoices/CreateInvoiceDialog';
import InvoicePreview from '@/components/invoices/InvoicePreview';
import { getInvoices, cancelInvoice, getBusinessProfile } from '@/lib/invoices';
import type { Invoice, BusinessProfile } from '@/types/invoice';
import { DOCUMENT_TYPE_LABELS } from '@/types/invoice';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';

const formatCurrency = (n: number) =>
  new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS' }).format(n);

const formatDate = (d: string) => {
  try { return format(new Date(d), 'dd/MM/yyyy', { locale: he }); } catch { return d; }
};

const Invoices = () => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [businessProfile, setBusinessProfile] = useState<BusinessProfile | null>(null);
  const [previewInvoice, setPreviewInvoice] = useState<Invoice | null>(null);
  const [cancelId, setCancelId] = useState<string | null>(null);
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && !user) navigate('/auth');
    if (user) fetchData();
  }, [user, authLoading, navigate]);

  const fetchData = async () => {
    if (!user) return;
    try {
      const [inv, profile] = await Promise.all([
        getInvoices(user.uid),
        getBusinessProfile(user.uid),
      ]);
      setInvoices(inv);
      setBusinessProfile(profile);
    } catch (err) {
      console.error('fetch invoices failed:', err);
      const msg = err instanceof Error ? err.message : 'לא ניתן לטעון חשבוניות';
      toast({ title: 'שגיאה', description: msg, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleCreated = (invoice: Invoice, profile: BusinessProfile) => {
    setInvoices(prev => [invoice, ...prev]);
    setBusinessProfile(profile);
    setPreviewInvoice(invoice);
  };

  const handleCancel = async () => {
    if (!user || !cancelId) return;
    try {
      await cancelInvoice(user.uid, cancelId);
      setInvoices(prev => prev.map(i => i.id === cancelId ? { ...i, status: 'cancelled' } : i));
      toast({ title: 'המסמך בוטל' });
    } catch (err) {
      console.error('cancel invoice failed:', err);
      const msg = err instanceof Error ? err.message : 'לא ניתן לבטל מסמך';
      toast({ title: 'שגיאה', description: msg, variant: 'destructive' });
    } finally {
      setCancelId(null);
    }
  };

  const statusBadge = (status: Invoice['status']) =>
    status === 'issued' ? (
      <Badge variant="outline" className="border-accent/50 text-accent font-mono text-[10px] tracking-[0.18em] uppercase rounded-sm">
        בתוקף
      </Badge>
    ) : (
      <Badge variant="outline" className="border-destructive/50 text-destructive font-mono text-[10px] tracking-[0.18em] uppercase rounded-sm">
        בוטל
      </Badge>
    );

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
        <PageMasthead
          eyebrow="תיק חשבוניות"
          marker="§ Ledger"
          headlineLight="חשבוניות"
          headlineAccent="ומסמכים."
          description="הפקה, ניהול וביטול של חשבוניות, קבלות ומסמכים עסקיים — חתום ומאומת"
          meta={<span className="font-mono tabular-nums">{invoices.length.toString().padStart(3, '0')}</span>}
          actions={<CreateInvoiceDialog onCreated={handleCreated} />}
        />

        {!businessProfile?.osek_id && (
          <div className="relative bg-card/60 backdrop-blur-sm border border-primary/30 rounded-xl px-5 py-4 text-sm text-foreground/85 overflow-hidden">
            <div className="absolute right-0 top-0 bottom-0 w-1 bg-primary" />
            <div className="absolute right-0 top-0 bottom-0 w-1 bg-primary blur-sm opacity-60" />
            <span className="text-[10px] tracking-[0.3em] uppercase font-mono text-primary mb-1.5 block">
              דרושה השלמה
            </span>
            לפני הפקת חשבונית, מלא את{' '}
            <button
              className="underline underline-offset-2 font-medium text-primary hover:text-primary/80 transition-colors"
              onClick={() => navigate('/settings')}
            >
              פרטי העסק בהגדרות
            </button>
            .
          </div>
        )}

        <div className="rounded-sm border border-border bg-card overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-right">מס׳ מסמך</TableHead>
                <TableHead className="text-right">תאריך</TableHead>
                <TableHead className="text-right">לקוח</TableHead>
                <TableHead className="text-right hidden sm:table-cell">סוג</TableHead>
                <TableHead className="text-right">סכום</TableHead>
                <TableHead className="text-right hidden sm:table-cell">סטטוס</TableHead>
                <TableHead className="text-right w-[80px]">פעולות</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    אין מסמכים עדיין. לחץ "חשבונית חדשה" כדי להתחיל.
                  </TableCell>
                </TableRow>
              ) : (
                invoices.map(invoice => (
                  <TableRow key={invoice.id} className={invoice.status === 'cancelled' ? 'opacity-50' : ''}>
                    <TableCell className="font-mono font-medium">{invoice.document_number}</TableCell>
                    <TableCell>{formatDate(invoice.issue_date)}</TableCell>
                    <TableCell className="font-medium">{invoice.client_snapshot.name}</TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <Badge variant="outline">{DOCUMENT_TYPE_LABELS[invoice.document_type]}</Badge>
                    </TableCell>
                    <TableCell className="font-bold">{formatCurrency(invoice.total)}</TableCell>
                    <TableCell className="hidden sm:table-cell">{statusBadge(invoice.status)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          title="צפה / הורד PDF"
                          onClick={() => setPreviewInvoice(invoice)}
                          disabled={!businessProfile}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        {invoice.status === 'issued' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            title="בטל מסמך"
                            className="text-destructive hover:text-destructive"
                            onClick={() => setCancelId(invoice.id)}
                          >
                            <XCircle className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {previewInvoice && businessProfile && (
        <InvoicePreview
          open={!!previewInvoice}
          onOpenChange={open => !open && setPreviewInvoice(null)}
          invoice={previewInvoice}
          businessProfile={businessProfile}
        />
      )}

      <AlertDialog open={!!cancelId} onOpenChange={open => !open && setCancelId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ביטול מסמך</AlertDialogTitle>
            <AlertDialogDescription>
              האם אתה בטוח שברצונך לבטל מסמך זה? לא ניתן לשחזר ביטול.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ביטול</AlertDialogCancel>
            <AlertDialogAction onClick={handleCancel} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              אשר ביטול
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
};

export default Invoices;
