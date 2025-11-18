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
    const { message, userId } = await req.json();
    
    if (!message || !userId) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    // Use Lovable AI to parse the message
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
            content: `אתה עוזר שמנתח הודעות וואטסאפ ומחלץ מהן פרטי פגישות.
            
החזר תמיד JSON בפורמט הבא:
{
  "date": "YYYY-MM-DD",
  "start_time": "HH:MM",
  "duration_hours": number,
  "client_name": "string",
  "event_type": "string",
  "rate": number,
  "rate_type": "hourly" | "fixed"
}

כללים:
- תאריכים יחסיים כמו "מחר", "יום ראשון", "בעוד שבוע" - המר לתאריך מדויק
- אם לא צוין סוג תמחור, ברירת מחדל היא "hourly"
- אם לא צוין סוג אירוע, השתמש ב"פגישה"
- אם משהו חסר, החזר null בשדה הרלוונטי`
          },
          {
            role: 'user',
            content: `התאריך היום: ${new Date().toLocaleDateString('he-IL')}
            
הודעה לניתוח:
${message}`
          }
        ],
        temperature: 0.3,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI Gateway error:', aiResponse.status, errorText);
      
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: 'מגבלת קצב הושגה. נסה שוב בעוד מספר שניות.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: 'יש להוסיף זיכוי למערכת. פנה לתמיכה.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      throw new Error('AI gateway error');
    }

    const aiData = await aiResponse.json();
    const parsedContent = aiData.choices[0].message.content;
    
    // Extract JSON from the response
    let eventData;
    try {
      // Try to find JSON in the response
      const jsonMatch = parsedContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        eventData = JSON.parse(jsonMatch[0]);
      } else {
        eventData = JSON.parse(parsedContent);
      }
    } catch (e) {
      console.error('Error parsing AI response:', e);
      return new Response(
        JSON.stringify({ error: 'לא הצלחתי להבין את ההודעה. נסה לנסח אותה בצורה יותר ברורה.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Calculate total amount
    const totalAmount = eventData.rate_type === 'hourly' 
      ? eventData.duration_hours * eventData.rate 
      : eventData.rate;

    // Save to database
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: newEvent, error: dbError } = await supabase
      .from('events')
      .insert({
        user_id: userId,
        date: eventData.date,
        start_time: eventData.start_time,
        duration_hours: eventData.duration_hours,
        client_name: eventData.client_name,
        event_type: eventData.event_type,
        rate_type: eventData.rate_type,
        rate: eventData.rate,
        total_amount: totalAmount,
        payment_status: 'unpaid',
        source: 'whatsapp',
      })
      .select()
      .single();

    if (dbError) {
      console.error('Database error:', dbError);
      throw dbError;
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        event: newEvent,
        message: `הפגישה נוספה בהצלחה! ${eventData.client_name} - ${eventData.date} בשעה ${eventData.start_time}`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'שגיאה בעיבוד הבקשה';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
