import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Trash2, Loader2, FileText, Import } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { getClients, createInvoice, getBusinessProfile } from '@/lib/invoices';
import { collection, query, getDocs, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Client, InvoiceItem, DocumentType, Invoice, BusinessProfile } from '@/types/invoice';
import { DOCUMENT_TYPE_LABELS } from '@/types/invoice';

interface EventRow {
  id: string;
  date: string;
  client_name: string;
  event_type: string;
  total_amount: number;
  payment_status: string;
  duration_hours: number;
}

export interface PrefillEvent {
  id: string;
  client_name: string;
  event_type: string;
  date: string;
  total_amount: number;
}

interface CreateInvoiceDialogProps {
  onCreated: (invoice: Invoice, profile: BusinessProfile) => void;
  // Controlled mode — used when opening from an event row
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  prefillEvent?: PrefillEvent;
}

const today = () => new Date().toISOString().split('T')[0];

const CreateInvoiceDialog = ({
  onCreated,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  prefillEvent,
}: CreateInvoiceDialogProps) => {
  const isControlled = controlledOpen !== undefined;

  const [internalOpen, setInternalOpen] = useState(false);
  const open = isControlled ? controlledOpen! : internalOpen;
  const setOpen = isControlled
    ? (val: boolean) => { controlledOnOpenChange?.(val); }
    : setInternalOpen;

  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClientId, setSelectedClientId] = useState('');
  const [clientMatchWarning, setClientMatchWarning] = useState('');
  const [documentType, setDocumentType] = useState<DocumentType>('invoice_receipt');
  const [issueDate, setIssueDate] = useState(today());
  const [items, setItems] = useState<InvoiceItem[]>([
    { description: '', quantity: 1, unit_price: 0, total: 0 },
  ]);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  // Event import (from "ייבא מפגישות" button)
  const [importOpen, setImportOpen] = useState(false);
  const [clientEvents, setClientEvents] = useState<EventRow[]>([]);
  const [selectedEventIds, setSelectedEventIds] = useState<Set<string>>(new Set());
  const [loadingEvents, setLoadingEvents] = useState(false);

  const { user } = useAuth();
  const { toast } = useToast();

  // Load clients whenever dialog opens
  useEffect(() => {
    if (open && user) {
      getClients(user.uid).then(loadedClients => {
        setClients(loadedClients);

        // Auto-match client by name when opened from an event row
        if (prefillEvent) {
          const match = loadedClients.find(
            c => c.name.trim().toLowerCase() === prefillEvent.client_name.trim().toLowerCase()
          );
          if (match) {
            setSelectedClientId(match.id);
            setClientMatchWarning('');
          } else {
            setClientMatchWarning(
              `הלקוח "${prefillEvent.client_name}" לא נמצא ברשימת הלקוחות — בחר לקוח קיים או הוסף אותו תחילה`
            );
          }
        }
      }).catch(console.error);
    }
  }, [open, user]);

  // Pre-fill items when opened from event row
  useEffect(() => {
    if (open && prefillEvent) {
      setIssueDate(today());
      setItems([{
        description: `${prefillEvent.event_type} — ${prefillEvent.date}`,
        quantity: 1,
        unit_price: prefillEvent.total_amount,
        total: prefillEvent.total_amount,
      }]);
      setSelectedEventIds(new Set([prefillEvent.id]));
    }
  }, [open, prefillEvent]);

  const selectedClient = clients.find(c => c.id === selectedClientId) || null;

  const updateItem = (index: number, field: keyof InvoiceItem, value: string | number) => {
    setItems(prev => {
      const updated = [...prev];
      const item = { ...updated[index], [field]: value };
      if (field === 'quantity' || field === 'unit_price') {
        item.total = Number(item.quantity) * Number(item.unit_price);
      }
      updated[index] = item;
      return updated;
    });
  };

  const addItem = () => {
    setItems(prev => [...prev, { description: '', quantity: 1, unit_price: 0, total: 0 }]);
  };

  const removeItem = (index: number) => {
    setItems(prev => prev.filter((_, i) => i !== index));
  };

  const total = items.reduce((sum, item) => sum + item.total, 0);

  const handleImportEvents = async () => {
    if (!user || !selectedClient) return;
    setLoadingEvents(true);
    setImportOpen(true);
    try {
      const q = query(collection(db, 'users', user.uid, 'events'), orderBy('date', 'desc'));
      const snap = await getDocs(q);
      const all = snap.docs.map(d => ({ id: d.id, ...d.data() } as EventRow));
      const filtered = all.filter(
        e => e.client_name.trim().toLowerCase() === selectedClient.name.trim().toLowerCase()
      );
      setClientEvents(filtered);
    } catch (err) {
      console.error('import events failed:', err);
      const msg = err instanceof Error ? err.message : 'לא ניתן לטעון פגישות';
      toast({ title: 'שגיאה', description: msg, variant: 'destructive' });
    } finally {
      setLoadingEvents(false);
    }
  };

  const handleConfirmImport = () => {
    const eventsToImport = clientEvents.filter(e => selectedEventIds.has(e.id));
    const newItems: InvoiceItem[] = eventsToImport.map(e => ({
      description: `${e.event_type} — ${e.date}`,
      quantity: 1,
      unit_price: e.total_amount,
      total: e.total_amount,
    }));
    setItems(prev => {
      const nonEmpty = prev.filter(i => i.description.trim());
      return [...nonEmpty, ...newItems];
    });
    setImportOpen(false);
  };

  const handleSave = async () => {
    if (!user) return;
    if (!selectedClientId) {
      toast({ title: 'יש לבחור לקוח', variant: 'destructive' });
      return;
    }
    if (items.every(i => !i.description.trim())) {
      toast({ title: 'יש להוסיף לפחות פריט אחד', variant: 'destructive' });
      return;
    }

    const validItems = items.filter(i => i.description.trim());

    setSaving(true);
    try {
      const profile = await getBusinessProfile(user.uid);
      if (!profile?.osek_id) {
        toast({
          title: 'חסרים פרטי עסק',
          description: 'מלא את פרטי העסק בהגדרות לפני הפקת חשבונית',
          variant: 'destructive',
        });
        return;
      }

      const invoice = await createInvoice(user.uid, {
        document_type: documentType,
        issue_date: issueDate,
        client_id: selectedClientId,
        client_snapshot: {
          name: selectedClient!.name,
          tax_id: selectedClient!.tax_id,
          address: selectedClient!.address,
          email: selectedClient!.email,
          phone: selectedClient!.phone,
        },
        items: validItems,
        notes: notes.trim() || undefined,
        linked_event_ids: [...selectedEventIds],
      });

      toast({
        title: `${DOCUMENT_TYPE_LABELS[documentType]} הופקה`,
        description: `מס׳ ${invoice.document_number} — סכום: ${new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS' }).format(invoice.total)}`,
      });
      onCreated(invoice, profile);
      setOpen(false);
      resetForm();
    } catch (err) {
      console.error('createInvoice failed:', err);
      const msg = err instanceof Error ? err.message : 'לא ניתן ליצור חשבונית';
      toast({ title: 'שגיאה', description: msg, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setSelectedClientId('');
    setClientMatchWarning('');
    setDocumentType('invoice_receipt');
    setIssueDate(today());
    setItems([{ description: '', quantity: 1, unit_price: 0, total: 0 }]);
    setNotes('');
    setClientEvents([]);
    setSelectedEventIds(new Set());
  };

  const handleOpenChange = (val: boolean) => {
    setOpen(val);
    if (!val) resetForm();
  };

  const formatCurrency = (n: number) =>
    new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS' }).format(n);

  const dialogTitle = prefillEvent
    ? `הפקת חשבונית — ${prefillEvent.client_name}`
    : 'הפקת מסמך חדש';

  const dialogContent = (
    <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <FileText className="w-5 h-5" />
          {dialogTitle}
        </DialogTitle>
      </DialogHeader>

      <div className="space-y-5">
        {/* Client + type + date */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label>לקוח *</Label>
            <Select value={selectedClientId} onValueChange={v => { setSelectedClientId(v); setClientMatchWarning(''); }}>
              <SelectTrigger>
                <SelectValue placeholder="בחר לקוח" />
              </SelectTrigger>
              <SelectContent>
                {clients.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {clientMatchWarning && (
              <p className="text-xs text-amber-600">{clientMatchWarning}</p>
            )}
          </div>
          <div className="space-y-1">
            <Label>סוג מסמך</Label>
            <Select value={documentType} onValueChange={v => setDocumentType(v as DocumentType)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {(Object.entries(DOCUMENT_TYPE_LABELS) as [DocumentType, string][]).map(([val, label]) => (
                  <SelectItem key={val} value={val}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-1">
          <Label>תאריך הפקה</Label>
          <Input type="date" value={issueDate} onChange={e => setIssueDate(e.target.value)} className="w-48" />
        </div>

        {/* Items table */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>פריטים</Label>
            <div className="flex gap-2">
              {selectedClientId && (
                <Button type="button" variant="outline" size="sm" onClick={handleImportEvents} className="gap-1 text-xs">
                  <Import className="w-3 h-3" />
                  ייבא פגישות נוספות
                </Button>
              )}
              <Button type="button" variant="outline" size="sm" onClick={addItem} className="gap-1 text-xs">
                <Plus className="w-3 h-3" />
                הוסף שורה
              </Button>
            </div>
          </div>

          <div className="rounded border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted">
                <tr>
                  <th className="text-right p-2 font-medium">תיאור</th>
                  <th className="text-center p-2 font-medium w-16">כמות</th>
                  <th className="text-right p-2 font-medium w-28">מחיר</th>
                  <th className="text-right p-2 font-medium w-24">סכום</th>
                  <th className="w-8"></th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, i) => (
                  <tr key={i} className="border-t">
                    <td className="p-1">
                      <Input
                        value={item.description}
                        onChange={e => updateItem(i, 'description', e.target.value)}
                        placeholder="תיאור השירות"
                        className="h-8 text-sm border-0 shadow-none focus-visible:ring-0"
                      />
                    </td>
                    <td className="p-1">
                      <Input
                        type="number" min="1" step="0.5"
                        value={item.quantity}
                        onChange={e => updateItem(i, 'quantity', parseFloat(e.target.value) || 1)}
                        className="h-8 text-sm text-center border-0 shadow-none focus-visible:ring-0"
                      />
                    </td>
                    <td className="p-1">
                      <Input
                        type="number" min="0"
                        value={item.unit_price}
                        onChange={e => updateItem(i, 'unit_price', parseFloat(e.target.value) || 0)}
                        className="h-8 text-sm border-0 shadow-none focus-visible:ring-0"
                      />
                    </td>
                    <td className="p-1 text-right font-medium pr-2">{formatCurrency(item.total)}</td>
                    <td className="p-1">
                      {items.length > 1 && (
                        <Button
                          type="button" variant="ghost" size="sm"
                          className="h-7 w-7 p-0 text-destructive"
                          onClick={() => removeItem(i)}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 bg-muted/50">
                  <td colSpan={3} className="p-2 text-right font-bold">סה"כ לתשלום</td>
                  <td className="p-2 text-right font-bold text-base">{formatCurrency(total)}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        <div className="space-y-1">
          <Label>הערות (אופציונלי)</Label>
          <Textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="הערות שיופיעו על המסמך..."
            rows={2}
          />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={() => handleOpenChange(false)}>ביטול</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
            הפק {DOCUMENT_TYPE_LABELS[documentType]}
          </Button>
        </div>
      </div>
    </DialogContent>
  );

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        {!isControlled && (
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              חשבונית חדשה
            </Button>
          </DialogTrigger>
        )}
        {dialogContent}
      </Dialog>

      {/* Import additional events sub-dialog */}
      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>ייבוא פגישות — {selectedClient?.name}</DialogTitle>
          </DialogHeader>
          {loadingEvents ? (
            <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" /></div>
          ) : clientEvents.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">לא נמצאו פגישות ללקוח זה</p>
          ) : (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">{clientEvents.length} פגישות. סמן לייבוא:</p>
              <div className="space-y-1 max-h-64 overflow-y-auto">
                {clientEvents.map(e => (
                  <div
                    key={e.id}
                    className="flex items-center gap-3 p-2 rounded hover:bg-muted cursor-pointer"
                    onClick={() => {
                      setSelectedEventIds(prev => {
                        const s = new Set(prev);
                        s.has(e.id) ? s.delete(e.id) : s.add(e.id);
                        return s;
                      });
                    }}
                  >
                    <Checkbox checked={selectedEventIds.has(e.id)} readOnly />
                    <div className="flex-1 text-sm">
                      <span className="font-medium">{e.event_type}</span>
                      <span className="text-muted-foreground mr-2">{e.date}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={e.payment_status === 'paid' ? 'default' : 'secondary'} className="text-xs">
                        {e.payment_status === 'paid' ? 'שולם' : 'לא שולם'}
                      </Badge>
                      <span className="text-sm font-medium">{formatCurrency(e.total_amount)}</span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setImportOpen(false)}>ביטול</Button>
                <Button onClick={handleConfirmImport} disabled={selectedEventIds.size === 0}>
                  ייבא {selectedEventIds.size > 0 ? `(${selectedEventIds.size})` : ''}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default CreateInvoiceDialog;
