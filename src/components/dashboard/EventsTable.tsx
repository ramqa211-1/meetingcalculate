import { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Pencil, Trash2, MoreHorizontal } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { format } from 'date-fns';
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
  notes?: string;
  tags?: string[];
}

interface EventsTableProps {
  events: Event[];
  onEdit: (event: Event) => void;
  onDelete: (id: string) => void;
}

const EventsTable = ({ events, onEdit, onDelete }: EventsTableProps) => {
  const [sortField, setSortField] = useState<keyof Event>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const sortedEvents = [...events].sort((a, b) => {
    const aValue = a[sortField];
    const bValue = b[sortField];
    
    if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  const handleSort = (field: keyof Event) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('he-IL', {
      style: 'currency',
      currency: 'ILS',
    }).format(amount);
  };

  const calculateEndTime = (startTime: string, duration: number) => {
    const [hours, minutes] = startTime.split(':').map(Number);
    const totalMinutes = hours * 60 + minutes + duration * 60;
    const endHours = Math.floor(totalMinutes / 60) % 24;
    const endMinutes = totalMinutes % 60;
    return `${endHours.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')}`;
  };

  return (
    <div className="rounded-lg border border-white/40 bg-white/65 backdrop-blur-sm">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="text-right">
              <Button variant="ghost" onClick={() => handleSort('date')} className="font-semibold">
                תאריך
              </Button>
            </TableHead>
            <TableHead className="text-right">זמן התחלה</TableHead>
            <TableHead className="text-right">זמן סיום</TableHead>
            <TableHead className="text-right">משך</TableHead>
            <TableHead className="text-right">
              <Button variant="ghost" onClick={() => handleSort('client_name')} className="font-semibold">
                לקוח
              </Button>
            </TableHead>
            <TableHead className="text-right">סוג</TableHead>
            <TableHead className="text-right">תמחור</TableHead>
            <TableHead className="text-right">
              <Button variant="ghost" onClick={() => handleSort('total_amount')} className="font-semibold">
                סכום
              </Button>
            </TableHead>
            <TableHead className="text-right">סטטוס תשלום</TableHead>
            <TableHead className="text-right">מקור</TableHead>
            <TableHead className="text-right">פעולות</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedEvents.length === 0 ? (
            <TableRow>
              <TableCell colSpan={11} className="text-center py-8 text-muted-foreground">
                אין פגישות להצגה. הוסף פגישה חדשה כדי להתחיל.
              </TableCell>
            </TableRow>
          ) : (
            sortedEvents.map((event) => (
              <TableRow key={event.id}>
                <TableCell className="font-medium">
                  {format(new Date(event.date), 'dd/MM/yyyy', { locale: he })}
                </TableCell>
                <TableCell>{event.start_time}</TableCell>
                <TableCell>{calculateEndTime(event.start_time, event.duration_hours)}</TableCell>
                <TableCell>{event.duration_hours} שעות</TableCell>
                <TableCell>{event.client_name}</TableCell>
                <TableCell>
                  <Badge variant="outline">{event.event_type}</Badge>
                </TableCell>
                <TableCell>
                  {event.rate_type === 'hourly' ? 'לשעה' : 'לפגישה'} - {formatCurrency(event.rate)}
                </TableCell>
                <TableCell className="font-bold">{formatCurrency(event.total_amount)}</TableCell>
                <TableCell>
                  <Badge variant={event.payment_status === 'paid' ? 'default' : 'secondary'}>
                    {event.payment_status === 'paid' ? 'שולם' : 'לא שולם'}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={event.source === 'whatsapp' ? 'outline' : 'secondary'}>
                    {event.source === 'whatsapp' ? 'WhatsApp' : 'מערכת'}
                  </Badge>
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onEdit(event)}>
                        <Pencil className="w-4 h-4 ml-2" />
                        ערוך
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => onDelete(event.id)}
                        className="text-destructive"
                      >
                        <Trash2 className="w-4 h-4 ml-2" />
                        מחק
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
};

export default EventsTable;
