import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const GREEN_API_URL = 'https://api.green-api.com';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const GREENAPI_INSTANCE_ID = Deno.env.get('GREENAPI_INSTANCE_ID');
const GREENAPI_TOKEN = Deno.env.get('GREENAPI_TOKEN');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function sendWhatsAppMessage(chatId: string, message: string): Promise<boolean> {
  if (!GREENAPI_INSTANCE_ID || !GREENAPI_TOKEN) {
    console.error('GREEN-API credentials not configured');
    return false;
  }

  try {
    const url = `${GREEN_API_URL}/waInstance${GREENAPI_INSTANCE_ID}/sendMessage/${GREENAPI_TOKEN}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chatId, message }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error('GREEN-API send error:', err);
      return false;
    }
    return true;
  } catch (error) {
    console.error('Error sending WhatsApp message:', error);
    return false;
  }
}

function extractPhoneFromChatId(chatId: string): string {
  return chatId.replace('@c.us', '').replace('@g.us', '');
}

function normalizePhone(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.startsWith('972')) return cleaned;
  if (cleaned.startsWith('0')) return '972' + cleaned.slice(1);
  return '972' + cleaned;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS' }).format(amount);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const payload = await req.json();

    if (payload.typeWebhook !== 'incomingMessageReceived') {
      return new Response(JSON.stringify({ received: true }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const chatId = payload.senderData?.chatId;
    const senderPhone = extractPhoneFromChatId(chatId || '');
    const messageText =
      payload.messageData?.textMessageData?.textMessage ||
      payload.messageData?.extendedTextMessageData?.text ||
      '';

    if (!chatId || !messageText.trim()) {
      return new Response(JSON.stringify({ received: true }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const normalizedPhone = normalizePhone(senderPhone);

    const { data: whatsappSettings } = await supabase
      .from('whatsapp_settings')
      .select('user_id')
      .eq('phone_number', normalizedPhone)
      .maybeSingle();

    let userId = whatsappSettings?.user_id;

    if (!userId) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('phone_number', normalizedPhone)
        .maybeSingle();
      userId = profile?.id;
    }

    if (!userId) {
      await sendWhatsAppMessage(
        chatId,
        'שלום! אינך מזוהה במערכת. היכנס להגדרות באפליקציה והוסף את מספר הטלפון שלך כדי להשתמש בשירות.'
      );
      return new Response(JSON.stringify({ received: true }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const trimmedMessage = messageText.trim();
    const isCommand = trimmedMessage.startsWith('/');

    if (isCommand) {
      const [cmd, ...args] = trimmedMessage.split(/\s+/);
      const cmdLower = cmd.toLowerCase();

      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

      if (cmdLower === '/stats' || cmdLower === '/סטטיסטיקות') {
        const { data: events } = await supabase
          .from('events')
          .select('*')
          .eq('user_id', userId)
          .gte('date', startOfMonth.toISOString().slice(0, 10))
          .lte('date', endOfMonth.toISOString().slice(0, 10));

        const totalRevenue = (events || []).reduce((s, e) => s + e.total_amount, 0);
        const paidRevenue = (events || [])
          .filter((e) => e.payment_status === 'paid')
          .reduce((s, e) => s + e.total_amount, 0);
        const totalHours = (events || []).reduce((s, e) => s + e.duration_hours, 0);

        const msg = `📊 סטטיסטיקות החודש:\n💰 הכנסה כוללת: ${formatCurrency(totalRevenue)}\n✅ שולם: ${formatCurrency(paidRevenue)}\n⏳ ממתין: ${formatCurrency(totalRevenue - paidRevenue)}\n📅 פגישות: ${(events || []).length}\n⏱️ שעות: ${totalHours.toFixed(1)}`;
        await sendWhatsAppMessage(chatId, msg);
      } else if (cmdLower === '/today' || cmdLower === '/היום') {
        const today = now.toISOString().slice(0, 10);
        const { data: events } = await supabase
          .from('events')
          .select('*')
          .eq('user_id', userId)
          .eq('date', today)
          .order('start_time');

        if (!events || events.length === 0) {
          await sendWhatsAppMessage(chatId, `📅 אין פגישות להיום (${now.toLocaleDateString('he-IL')})`);
        } else {
          const lines = events.map(
            (e, i) =>
              `${i + 1}. ${e.client_name} - ${e.start_time?.slice(0, 5)} (${e.duration_hours} שעות) - ${e.event_type}`
          );
          await sendWhatsAppMessage(
            chatId,
            `📅 פגישות היום (${now.toLocaleDateString('he-IL')}):\n${lines.join('\n')}`
          );
        }
      } else if (cmdLower === '/week' || cmdLower === '/שבוע') {
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay() + 1);
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);

        const { data: events } = await supabase
          .from('events')
          .select('*')
          .eq('user_id', userId)
          .gte('date', startOfWeek.toISOString().slice(0, 10))
          .lte('date', endOfWeek.toISOString().slice(0, 10))
          .order('date')
          .order('start_time');

        if (!events || events.length === 0) {
          await sendWhatsAppMessage(chatId, '📅 אין פגישות השבוע');
        } else {
          const lines = events.map(
            (e) =>
              `• ${e.date} ${e.start_time?.slice(0, 5)} - ${e.client_name} (${e.event_type}) - ${formatCurrency(e.total_amount)}`
          );
          await sendWhatsAppMessage(
            chatId,
            `📅 פגישות השבוע:\n${lines.join('\n')}`
          );
        }
      } else if (cmdLower === '/help' || cmdLower === '/עזרה') {
        const helpMsg = `📋 פקודות זמינות:
/stats - סטטיסטיקות החודש
/today - פגישות היום
/week - פגישות השבוע
/add [פרטים] - הוסף פגישה (לדוגמה: /add מחר 14:00 שעתיים חברת ABC סדנה 1000)
לשליחת טקסט חופשי - כתוב פרטי הפגישה והמערכת תנסה לפרש`;
        await sendWhatsAppMessage(chatId, helpMsg);
      } else if (cmdLower === '/add' && args.length > 0) {
        const eventText = args.join(' ');
        const parseRes = await fetch(`${SUPABASE_URL}/functions/v1/parse-whatsapp-message`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          },
          body: JSON.stringify({ message: eventText, userId }),
        });
        const data = await parseRes.json().catch(() => ({}));

        if (!parseRes.ok) {
          await sendWhatsAppMessage(chatId, '❌ שגיאה: ' + (data?.error || 'לא הצלחתי לפרש את ההודעה'));
        } else if (data?.error) {
          await sendWhatsAppMessage(chatId, '❌ ' + data.error);
        } else if (data?.message) {
          await sendWhatsAppMessage(chatId, '✅ ' + data.message);
        } else {
          await sendWhatsAppMessage(chatId, '❌ לא הצלחתי להבין. נסה: /add מחר 14:00 שעתיים לקוח סדנה 1000');
        }
      } else {
        await sendWhatsAppMessage(chatId, 'לא מזהה את הפקודה. שלח /help לרשימת פקודות.');
      }
    } else {
      const parseRes = await fetch(`${SUPABASE_URL}/functions/v1/parse-whatsapp-message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify({ message: trimmedMessage, userId }),
      });
      const data = await parseRes.json().catch(() => ({}));

      if (!parseRes.ok) {
        await sendWhatsAppMessage(
          chatId,
          'לא הצלחתי לפרש את ההודעה כפגישה. נסה /add ואז פרטי הפגישה, או /help לעזרה.'
        );
      } else if (data?.error) {
        await sendWhatsAppMessage(chatId, '❌ ' + data.error);
      } else if (data?.message) {
        await sendWhatsAppMessage(chatId, '✅ ' + data.message);
      } else {
        await sendWhatsAppMessage(chatId, 'לא הצלחתי להבין. שלח /help לעזרה.');
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('WhatsApp bot error:', error);
    return new Response(
      JSON.stringify({ error: error?.message || 'Internal error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
