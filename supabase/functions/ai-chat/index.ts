import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    });
  }

  try {
    // Get auth token
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      global: {
        headers: { Authorization: authHeader },
      },
    });

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Check if user is admin (for write operations)
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    const isAdmin = profile?.role === 'admin';

    // Parse request
    const { message, messages } = await req.json();

    if (!message) {
      return new Response(
        JSON.stringify({ error: 'Message is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Fetch all events and settings for context
    const { data: events } = await supabase
      .from('events')
      .select('*')
      .order('date', { ascending: false })
      .limit(100);

    const { data: settings } = await supabase
      .from('user_settings')
      .select('*');

    // Build context
    const context = {
      events: events || [],
      settings: settings || [],
      currentUser: {
        id: user.id,
        email: user.email,
        isAdmin,
      },
    };

    // System prompt
    const systemPrompt = `אתה עוזר AI למערכת ניהול פגישות והכנסות. 
המערכת כוללת:
- פגישות/הרצאות/פרויקטים עם תאריכים, לקוחות, תמחור, וסטטוס תשלום
- הגדרות משתמשים עם מחירי ברירת מחדל

תפקידך:
1. לענות על שאלות על הנתונים במערכת
2. לחשב סכומים, תאריכים, וסטטיסטיקות
3. לעזור בניהול פגישות ופרויקטים
${isAdmin ? '4. כאדמין, אתה יכול ליצור, לעדכן ולמחוק רשומות' : '4. אתה יכול רק לקרוא נתונים, לא לשנות אותם'}

השתמש בנתונים הבאים:
${JSON.stringify(context, null, 2)}

ענה בעברית, בצורה ברורה ומועילה.`;

    // Prepare messages for OpenAI
    const openAIMessages: Message[] = [
      { role: 'system', content: systemPrompt },
      ...(messages || []).map((m: Message) => ({
        role: m.role,
        content: m.content,
      })),
      { role: 'user', content: message },
    ];

    // Call OpenAI API
    if (!OPENAI_API_KEY) {
      // Fallback: Simple response without OpenAI
      return new Response(
        JSON.stringify({
          response: 'שירות AI לא מוגדר. אנא הגדר OPENAI_API_KEY ב-Supabase.',
          action: null,
        }),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    }

    const openAIResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: openAIMessages,
        temperature: 0.7,
      }),
    });

    if (!openAIResponse.ok) {
      const error = await openAIResponse.text();
      throw new Error(`OpenAI API error: ${error}`);
    }

    const openAIData = await openAIResponse.json();
    const aiResponse = openAIData.choices[0]?.message?.content || 'לא הצלחתי לענות';

    // Parse action from response (if any)
    let action = null;
    const actionMatch = aiResponse.match(/\[ACTION:(\w+):(.*?)\]/);
    if (actionMatch && isAdmin) {
      const [, actionType, actionData] = actionMatch;
      try {
        const parsedData = JSON.parse(actionData);
        action = { type: actionType, data: parsedData };
      } catch (e) {
        // Ignore parse errors
      }
    }

    // Clean response from action markers
    const cleanResponse = aiResponse.replace(/\[ACTION:.*?\]/g, '').trim();

    return new Response(
      JSON.stringify({
        response: cleanResponse,
        action,
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  }
});
