import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import type { Client } from '@/types/invoice';

const schema = z.object({
  name: z.string().min(1, 'שם חובה'),
  tax_id: z.string().optional(),
  address: z.string().optional(),
  email: z.string().email('כתובת מייל לא תקינה').optional().or(z.literal('')),
  phone: z.string().optional(),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

interface ClientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editClient?: Client | null;
  onSave: (data: FormData) => Promise<void>;
}

const ClientDialog = ({ open, onOpenChange, editClient, onSave }: ClientDialogProps) => {
  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', tax_id: '', address: '', email: '', phone: '', notes: '' },
  });

  useEffect(() => {
    if (editClient) {
      form.reset({
        name: editClient.name,
        tax_id: editClient.tax_id || '',
        address: editClient.address || '',
        email: editClient.email || '',
        phone: editClient.phone || '',
        notes: editClient.notes || '',
      });
    } else {
      form.reset({ name: '', tax_id: '', address: '', email: '', phone: '', notes: '' });
    }
  }, [editClient, form]);

  const onSubmit = async (data: FormData) => {
    await onSave(data);
    form.reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editClient ? 'עריכת לקוח' : 'לקוח חדש'}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>שם *</FormLabel>
                  <FormControl><Input placeholder="ישראל ישראלי" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="tax_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>ת.ז. / ח.פ.</FormLabel>
                  <FormControl><Input placeholder="000000000" dir="ltr" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>אימייל</FormLabel>
                  <FormControl><Input type="email" placeholder="client@example.com" dir="ltr" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>טלפון</FormLabel>
                  <FormControl><Input type="tel" placeholder="050-0000000" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>כתובת</FormLabel>
                  <FormControl><Input placeholder="רחוב, עיר" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>הערות</FormLabel>
                  <FormControl><Textarea placeholder="הערות נוספות..." rows={2} {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>ביטול</Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
                שמור
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default ClientDialog;
