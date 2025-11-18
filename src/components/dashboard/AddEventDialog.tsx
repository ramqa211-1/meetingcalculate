import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const eventSchema = z.object({
  date: z.string().min(1, 'יש לבחור תאריך'),
  start_time: z.string().min(1, 'יש לבחור שעת התחלה'),
  duration_hours: z.string().min(1, 'יש להזין משך'),
  client_name: z.string().min(1, 'יש להזין שם לקוח'),
  event_type: z.string().min(1, 'יש לבחור סוג אירוע'),
  rate_type: z.enum(['hourly', 'fixed']),
  rate: z.string().min(1, 'יש להזין מחיר'),
  payment_status: z.enum(['paid', 'unpaid']),
  notes: z.string().optional(),
});

type EventFormData = z.infer<typeof eventSchema>;

interface AddEventDialogProps {
  onEventAdded: () => void;
}

const AddEventDialog = ({ onEventAdded }: AddEventDialogProps) => {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();

  const form = useForm<EventFormData>({
    resolver: zodResolver(eventSchema),
    defaultValues: {
      date: '',
      start_time: '',
      duration_hours: '',
      client_name: '',
      event_type: '',
      rate_type: 'hourly',
      rate: '',
      payment_status: 'unpaid',
      notes: '',
    },
  });

  const onSubmit = async (data: EventFormData) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('משתמש לא מחובר');

      const duration = parseFloat(data.duration_hours);
      const rate = parseFloat(data.rate);
      const totalAmount = data.rate_type === 'hourly' ? duration * rate : rate;

      const { error } = await supabase.from('events').insert({
        user_id: user.id,
        date: data.date,
        start_time: data.start_time,
        duration_hours: duration,
        client_name: data.client_name,
        event_type: data.event_type,
        rate_type: data.rate_type,
        rate: rate,
        total_amount: totalAmount,
        payment_status: data.payment_status,
        source: 'web',
        notes: data.notes,
      });

      if (error) throw error;

      toast({
        title: 'הפגישה נוספה בהצלחה',
        description: `פגישה עם ${data.client_name} נוספה למערכת`,
      });

      form.reset();
      setOpen(false);
      onEventAdded();
    } catch (error) {
      console.error('Error adding event:', error);
      toast({
        title: 'שגיאה',
        description: 'לא ניתן להוסיף את הפגישה. נסה שוב.',
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="w-4 h-4" />
          הוסף פגישה חדשה
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">הוספת פגישה חדשה</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>תאריך</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="start_time"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>שעת התחלה</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="duration_hours"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>משך (בשעות)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.5" placeholder="2" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="client_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>שם הלקוח</FormLabel>
                    <FormControl>
                      <Input placeholder="דני כהן" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="event_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>סוג האירוע</FormLabel>
                  <FormControl>
                    <Input placeholder="הרצאה / ייעוץ / פגישה" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="rate_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>סוג תמחור</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="בחר סוג תמחור" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="hourly">מחיר לשעה</SelectItem>
                        <SelectItem value="fixed">מחיר לפגישה</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="rate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>מחיר</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="300" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="payment_status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>סטטוס תשלום</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="בחר סטטוס" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="paid">שולם</SelectItem>
                      <SelectItem value="unpaid">לא שולם</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>הערות (אופציונלי)</FormLabel>
                  <FormControl>
                    <Textarea placeholder="הערות נוספות..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                ביטול
              </Button>
              <Button type="submit">שמור פגישה</Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default AddEventDialog;
