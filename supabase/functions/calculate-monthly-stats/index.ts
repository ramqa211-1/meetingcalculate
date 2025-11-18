import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId, query } = await req.json();
    
    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'Missing userId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get current month events
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: events, error } = await supabase
      .from('events')
      .select('*')
      .eq('user_id', userId)
      .gte('date', startOfMonth)
      .lte('date', endOfMonth);

    if (error) throw error;

    // Calculate stats
    const totalRevenue = events.reduce((sum, e) => sum + e.total_amount, 0);
    const paidRevenue = events.filter(e => e.payment_status === 'paid')
      .reduce((sum, e) => sum + e.total_amount, 0);
    const unpaidRevenue = totalRevenue - paidRevenue;
    const totalEvents = events.length;
    const totalHours = events.reduce((sum, e) => sum + e.duration_hours, 0);

    const stats = {
      totalRevenue,
      paidRevenue,
      unpaidRevenue,
      totalEvents,
      totalHours,
      avgRate: totalHours > 0 ? totalRevenue / totalHours : 0,
    };

    // If query is provided, generate a natural language response
    if (query) {
      const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
      if (!LOVABLE_API_KEY) {
        throw new Error('LOVABLE_API_KEY is not configured');
      }

      const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [
            {
              role: 'system',
              content: 'אתה עוזר שעונה על שאלות לגבי הכנסות ופגישות. תן תשובות קצרות וממוקדות בעברית.'
            },
            {
              role: 'user',
              content: `סטטיסטיקות החודש:
- הכנסה כוללת: ${totalRevenue} ₪
- כבר שולם: ${paidRevenue} ₪
- ממתין לתשלום: ${unpaidRevenue} ₪
- מספר פגישות: ${totalEvents}
- שעות עבודה: ${totalHours}

שאלה: ${query}`
            }
          ],
          temperature: 0.5,
        }),
      });

      if (!aiResponse.ok) {
        console.error('AI error:', await aiResponse.text());
        throw new Error('AI gateway error');
      }

      const aiData = await aiResponse.json();
      const answer = aiData.choices[0].message.content;

      return new Response(
        JSON.stringify({ stats, answer }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ stats }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Server error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
