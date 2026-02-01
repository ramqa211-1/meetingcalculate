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

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS' }).format(amount);
}

async function sendViaGreenApi(phoneNumber: string, message: string): Promise<boolean> {
  if (!GREENAPI_INSTANCE_ID || !GREENAPI_TOKEN) {
    console.error('GREEN-API credentials not configured');
    return false;
  }

  const chatId = phoneNumber.includes('@') ? phoneNumber : `${phoneNumber}@c.us`;

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
    console.error('Error sending WhatsApp:', error);
    return false;
  }
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
    const body = await req.json();
    const { userId, message: rawMessage, type } = body;

    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'userId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: whatsappSettings, error: settingsError } = await supabase
      .from('whatsapp_settings')
      .select('phone_number, notifications_enabled')
      .eq('user_id', userId)
      .maybeSingle();

    if (settingsError || !whatsappSettings?.phone_number) {
      return new Response(
        JSON.stringify({ error: 'User has no WhatsApp phone configured', sent: false }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!whatsappSettings.notifications_enabled && type !== 'direct') {
      return new Response(
        JSON.stringify({ error: 'User has notifications disabled', sent: false }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let message = rawMessage;

    if (type === 'monthly_report' && !rawMessage) {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
        .toISOString()
        .slice(0, 10);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)
        .toISOString()
        .slice(0, 10);

      const { data: events } = await supabase
        .from('events')
        .select('*')
        .eq('user_id', userId)
        .gte('date', startOfMonth)
        .lte('date', endOfMonth);

      const totalRevenue = (events || []).reduce((s, e) => s + e.total_amount, 0);
      const paidRevenue = (events || [])
        .filter((e) => e.payment_status === 'paid')
        .reduce((s, e) => s + e.total_amount, 0);
      const totalHours = (events || []).reduce((s, e) => s + e.duration_hours, 0);

      const monthName = now.toLocaleDateString('he-IL', { month: 'long', year: 'numeric' });
      message = `📊 סיכום חודשי - ${monthName}\n\n💰 הכנסה כוללת: ${formatCurrency(totalRevenue)}\n✅ שולם: ${formatCurrency(paidRevenue)}\n⏳ ממתין: ${formatCurrency(totalRevenue - paidRevenue)}\n📅 פגישות: ${(events || []).length}\n⏱️ שעות: ${totalHours.toFixed(1)}`;
    } else if (!message) {
      return new Response(
        JSON.stringify({ error: 'message or type is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const sent = await sendViaGreenApi(whatsappSettings.phone_number, message);

    return new Response(
      JSON.stringify({ sent, message: sent ? 'Notification sent' : 'Failed to send' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Send WhatsApp notification error:', error);
    return new Response(
      JSON.stringify({ error: error?.message || 'Internal error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
