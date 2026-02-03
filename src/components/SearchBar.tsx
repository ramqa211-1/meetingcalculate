import { useState, useEffect, useCallback } from 'react';
import { collection, query, orderBy, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/use-auth';
import { callOpenAI } from '@/lib/openai';
import { Button } from '@/components/ui/button';
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from '@/components/ui/command';
import { Search, Loader2 } from 'lucide-react';

interface EventRecord {
  id: string;
  date?: string;
  start_time?: string;
  client_name?: string;
  event_type?: string;
  total_amount?: number;
  payment_status?: string;
  [key: string]: unknown;
}

export function SearchBar() {
  const [open, setOpen] = useState(false);
  const [queryText, setQueryText] = useState('');
  const [events, setEvents] = useState<EventRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<string[]>([]);
  const { user } = useAuth();

  const fetchEvents = useCallback(async () => {
    if (!user) return;
    try {
      const q = query(
        collection(db, 'users', user.uid, 'events'),
        orderBy('date', 'desc')
      );
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as EventRecord));
      setEvents(data);
    } catch (error) {
      console.error('Error fetching events for search:', error);
    }
  }, [user]);

  useEffect(() => {
    if (open && user) {
      fetchEvents();
    }
  }, [open, user, fetchEvents]);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  const handleSearch = async () => {
    if (!queryText.trim()) {
      setResults(['הקלד שאלה על הפגישות שלך ולחץ Enter.']);
      return;
    }
    setLoading(true);
    setResults([]);
    try {
      const { response } = await callOpenAI([
        {
          role: 'system',
          content: `אתה מנוע חיפוש חכם על פגישות והכנסות. הנתונים: ${JSON.stringify(events.slice(0, 100))}. 
השב בעברית, בקצרה. אם השאלה על לקוח/תאריך/סכום - הצג רשימה או סיכום מתאים.`,
        },
        { role: 'user', content: queryText.trim() },
      ]);
      const lines = response
        .split(/\n+/)
        .map((s) => s.trim())
        .filter(Boolean);
      setResults(lines.length > 0 ? lines : [response]);
    } catch (error) {
      setResults([`שגיאה: ${error instanceof Error ? error.message : 'נסה שוב'}`]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="gap-2"
        onClick={() => setOpen(true)}
      >
        <Search className="w-4 h-4" />
        חיפוש (Ctrl+K)
      </Button>
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput
          placeholder="חפש פגישות, לקוחות, סכומים..."
          value={queryText}
          onValueChange={setQueryText}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleSearch();
            }
          }}
        />
        <CommandList>
          <CommandEmpty>
            {loading ? (
              <div className="flex items-center justify-center py-6 gap-2">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>מחפש...</span>
              </div>
            ) : (
              <div className="py-6 text-center text-sm text-muted-foreground">
                הקלד שאלה ולחץ Enter. לדוגמה: &quot;כמה הרווחתי מלקוח X?&quot;
              </div>
            )}
          </CommandEmpty>
          {results.length > 0 && !loading && (
            <CommandGroup heading="תוצאות">
              {results.map((line, i) => (
                <CommandItem key={i} className="whitespace-pre-wrap">
                  {line}
                </CommandItem>
              ))}
            </CommandGroup>
          )}
        </CommandList>
      </CommandDialog>
    </>
  );
}
