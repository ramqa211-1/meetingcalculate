import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import Layout from '@/components/Layout';
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
import { Plus, Pencil, Trash2 } from 'lucide-react';
import ClientDialog from '@/components/clients/ClientDialog';
import { getClients, createClient, updateClient, deleteClient } from '@/lib/invoices';
import type { Client } from '@/types/invoice';

const Clients = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editClient, setEditClient] = useState<Client | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && !user) navigate('/auth');
    if (user) fetchClients();
  }, [user, authLoading, navigate]);

  const fetchClients = async () => {
    if (!user) return;
    try {
      const data = await getClients(user.uid);
      setClients(data);
    } catch (err) {
      console.error('fetchClients failed:', err);
      const msg = err instanceof Error ? err.message : 'לא ניתן לטעון לקוחות';
      toast({ title: 'שגיאה', description: msg, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (data: Omit<Client, 'id' | 'created_at'>) => {
    if (!user) return;
    try {
      if (editClient) {
        await updateClient(user.uid, editClient.id, data);
        toast({ title: 'לקוח עודכן', description: `${data.name} עודכן בהצלחה` });
      } else {
        await createClient(user.uid, data);
        toast({ title: 'לקוח נוסף', description: `${data.name} נוסף למערכת` });
      }
      setEditClient(null);
      await fetchClients();
    } catch (err) {
      console.error('saveClient failed:', err);
      const msg = err instanceof Error ? err.message : 'לא ניתן לשמור לקוח';
      toast({ title: 'שגיאה', description: msg, variant: 'destructive' });
      throw err;
    }
  };

  const handleDelete = async () => {
    if (!user || !deleteId) return;
    try {
      await deleteClient(user.uid, deleteId);
      setClients(prev => prev.filter(c => c.id !== deleteId));
      toast({ title: 'לקוח נמחק' });
    } catch (err) {
      console.error('deleteClient failed:', err);
      const msg = err instanceof Error ? err.message : 'לא ניתן למחוק לקוח';
      toast({ title: 'שגיאה', description: msg, variant: 'destructive' });
    } finally {
      setDeleteId(null);
    }
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
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">לקוחות</h1>
            <p className="text-muted-foreground mt-1">ניהול רשימת הלקוחות שלך</p>
          </div>
          <Button
            onClick={() => { setEditClient(null); setDialogOpen(true); }}
            className="gap-2"
          >
            <Plus className="w-4 h-4" />
            לקוח חדש
          </Button>
        </div>

        <div className="rounded-lg border bg-card overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-right">שם</TableHead>
                <TableHead className="text-right hidden sm:table-cell">ת.ז. / ח.פ.</TableHead>
                <TableHead className="text-right hidden md:table-cell">אימייל</TableHead>
                <TableHead className="text-right hidden md:table-cell">טלפון</TableHead>
                <TableHead className="text-right w-[80px]">פעולות</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clients.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    אין לקוחות. הוסף לקוח חדש כדי להתחיל.
                  </TableCell>
                </TableRow>
              ) : (
                clients.map(client => (
                  <TableRow key={client.id}>
                    <TableCell className="font-medium">{client.name}</TableCell>
                    <TableCell className="hidden sm:table-cell">
                      {client.tax_id ? (
                        <Badge variant="outline" className="font-mono">{client.tax_id}</Badge>
                      ) : (
                        <span className="text-muted-foreground text-sm">—</span>
                      )}
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-sm">
                      {client.email || <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-sm">
                      {client.phone || <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => { setEditClient(client); setDialogOpen(true); }}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => setDeleteId(client.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <ClientDialog
        open={dialogOpen}
        onOpenChange={open => { setDialogOpen(open); if (!open) setEditClient(null); }}
        editClient={editClient}
        onSave={handleSave}
      />

      <AlertDialog open={!!deleteId} onOpenChange={open => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>מחיקת לקוח</AlertDialogTitle>
            <AlertDialogDescription>האם אתה בטוח שברצונך למחוק לקוח זה? פעולה זו אינה ניתנת לביטול.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ביטול</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              מחק
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
};

export default Clients;
