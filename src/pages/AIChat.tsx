import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/use-auth';
import { callOpenAI } from '@/lib/openai';
import Layout from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Bot, Send, Loader2, Sparkles } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

const AIChat = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, isAdmin, loading: authLoading } = useAuth();
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
      return;
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    setMessages([
      {
        id: 'welcome',
        role: 'assistant',
        content:
          'שלום! אני עוזר AI שלך. איך אוכל לעזור לך היום?\n\nאפשר לשאול אותי שאלות כמו:\n- מה התשלום הצפוי בסוף החודש?\n- איזה הרצאות יש לי השבוע?\n- איזה לקוחות ממתינים לתשלום?',
        timestamp: new Date(),
      },
    ]);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || loading || !user) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const openAiMessages = [
        {
          role: 'system',
          content:
            'אתה עוזר לניהול פגישות והכנסות. ענה בעברית. אם המשתמש מבקש ליצור/לערוך/למחוק פגישה, החזר JSON עם action: { type: "CREATE_EVENT"|"UPDATE_EVENT"|"DELETE_EVENT", data: {...} }. אחרת החזר רק תשובה טקסטואלית.',
        },
        ...messages.map((m) => ({ role: m.role, content: m.content })),
        { role: 'user', content: userMessage.content },
      ];

      const { response } = await callOpenAI(openAiMessages);
      let content = response;
      let action: { type: string; data: unknown } | null = null;
      try {
        const parsed = JSON.parse(response);
        if (parsed.action) {
          action = parsed.action;
          content = parsed.response || parsed.message || 'בוצע.';
        }
      } catch {
        // not JSON, use as text
      }

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMessage]);

      if (action && isAdmin) {
        await handleAction(action);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: 'שגיאה',
        description: 'לא ניתן לשלוח הודעה. נסה שוב.',
        variant: 'destructive',
      });
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'מצטער, אירעה שגיאה. נסה שוב מאוחר יותר.',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (action: { type: string; data: any }) => {
    if (!user) return;
    try {
      switch (action.type) {
        case 'CREATE_EVENT': {
          await addDoc(collection(db, 'users', user.uid, 'events'), action.data);
          toast({ title: 'פגישה נוצרה', description: 'הפגישה נוספה בהצלחה' });
          break;
        }
        case 'UPDATE_EVENT': {
          await updateDoc(
            doc(db, 'users', user.uid, 'events', action.data.id),
            action.data.updates
          );
          toast({ title: 'פגישה עודכנה', description: 'הפגישה עודכנה בהצלחה' });
          break;
        }
        case 'DELETE_EVENT': {
          await deleteDoc(doc(db, 'users', user.uid, 'events', action.data.id));
          toast({ title: 'פגישה נמחקה', description: 'הפגישה הוסרה בהצלחה' });
          break;
        }
      }
    } catch (error) {
      console.error('Error handling action:', error);
      toast({
        title: 'שגיאה',
        description: 'לא ניתן לבצע את הפעולה',
        variant: 'destructive',
      });
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!user) {
    return null;
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <div className="flex items-center gap-2">
            <Bot className="w-6 h-6 sm:w-8 sm:h-8 text-primary" />
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">צ'אט AI</h1>
          </div>
          <p className="text-muted-foreground mt-1">
            שאל שאלות על הפגישות, ההכנסות והפרויקטים שלך
          </p>
        </div>

        <Card className="h-[calc(100vh-200px)] md:h-[600px] flex flex-col">
          <CardHeader className="border-b">
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              עוזר AI
            </CardTitle>
            <CardDescription>
              {isAdmin
                ? 'אתה אדמין - אתה יכול ליצור, לעדכן ולמחוק רשומות'
                : 'אתה יכול לשאול שאלות ולקבל מידע על הנתונים שלך'}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col p-0">
            <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
              <div className="space-y-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex gap-3 ${
                      message.role === 'user' ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    {message.role === 'assistant' && (
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Bot className="w-4 h-4 text-primary" />
                      </div>
                    )}
                    <div
                      className={`max-w-[80%] rounded-lg p-3 ${
                        message.role === 'user'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted'
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                      <p className="text-xs opacity-70 mt-1">
                        {message.timestamp.toLocaleTimeString('he-IL', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                    {message.role === 'user' && (
                      <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                        <span className="text-xs">אתה</span>
                      </div>
                    )}
                  </div>
                ))}
                {loading && (
                  <div className="flex gap-3 justify-start">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <Bot className="w-4 h-4 text-primary" />
                    </div>
                    <div className="bg-muted rounded-lg p-3">
                      <Loader2 className="w-4 h-4 animate-spin" />
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>
            <div className="border-t p-4">
              <div className="flex gap-2">
                <Textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyPress}
                  placeholder="שאל שאלה... (Enter לשליחה, Shift+Enter לשורה חדשה)"
                  className="min-h-[50px] sm:min-h-[60px] resize-none"
                  disabled={loading}
                />
                <Button
                  onClick={handleSend}
                  disabled={!input.trim() || loading}
                  className="self-end"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default AIChat;
