import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
// Try new publishable key first, fallback to legacy anon key
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_PUBLISHABLE_KEY') || Deno.env.get('SUPABASE_ANON_KEY') || '';
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
    // Get auth token (user JWT from frontend)
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }
    const jwt = authHeader.replace(/^Bearer\s+/i, '').trim();
    if (!jwt) {
      return new Response(
        JSON.stringify({ error: 'Invalid authorization header' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client with service role
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Verify user from JWT - pass the token explicitly to getUser()
    const { data: { user }, error: userError } = await supabase.auth.getUser(jwt);
    if (userError || !user) {
      console.error('Auth error:', userError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized', details: userError?.message }),
        { status: 401, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
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
    const body = await req.json();
    const { message, messages, type, events: providedEvents, kpis, employmentContext } = body;

    // Handle generate_insights request type
    if (type === 'generate_insights') {
      const eventsData = providedEvents || [];
      const employmentData = employmentContext || null;

      const insightsSystemPrompt = `אתה יועץ פיננסי חכם שמנתח נתונים של עצמאי שעובד גם כשכיר.

נתוני המשתמש:
${JSON.stringify({ kpis, events: eventsData, employmentContext: employmentData }, null, 2)}

אם המשתמש מוגדר כשכיר (employmentContext.is_full_time_employee = true):
- חשב את שווי השעה והשעה היומית שלו מהשכר
- עבור כל אירוע - בדוק אם היה בשעות עבודה (בין work_start_time ל-work_end_time, ימים א-ה)
- אם אירוע היה בשעות עבודה - עלות ההזדמנות = שכר יומי. רווח נטו = הכנסה מהאירוע - עלות יום חופש
- אם אירוע היה מחוץ לשעות עבודה - רווח נטו = הכנסה מלאה
- נתח: כמה אירועים היו כדאיים vs לא כדאיים
- המלצות: הימנע מפרויקטים בשעות עבודה אלא אם מעל ~₪1,500, העדף ערבים וסופ"ש

פורמט התגובה - כתוב בעברית, בצורה מובנית:
1. סיכום המצב התעסוקתי (אם יש)
2. ניתוח כדאיות פרויקטים - כמה כדאיים/לא כדאיים עם דוגמאות
3. המלצות תזמון - איזה שעות/ימים עדיפים
4. ניתוח תמחור - ממוצע לשעה, רף מינימום מומלץ
5. סיכום כלכלי - רווח נטו אמיתי, תוספת למשכורת
6. 3-5 המלצות פעולה קונקרטיות

השתמש באימוג'ים לקריאות. ענה בפסקאות קצרות וברורות.`;

      if (!OPENAI_API_KEY) {
        return new Response(
          JSON.stringify({
            response: 'שירות AI לא מוגדר. אנא הגדר OPENAI_API_KEY ב-Supabase.',
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
          }
        );
      }

      const insightsResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: insightsSystemPrompt },
            { role: 'user', content: 'בצע ניתוח מלא והחזר תובנות מפורטות לפי הפורמט המבוקש.' },
          ],
          temperature: 0.5,
        }),
      });

      if (!insightsResponse.ok) {
        const errText = await insightsResponse.text();
        throw new Error(`OpenAI API error: ${errText}`);
      }

      const insightsData = await insightsResponse.json();
      const insightsText = insightsData.choices[0]?.message?.content || 'לא הצלחתי ליצור תובנות.';

      return new Response(
        JSON.stringify({ response: insightsText }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        }
      );
    }

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

    const { data: employmentCtx } = await supabase
      .from('employment_context')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    // Build context
    const context = {
      events: events || [],
      settings: settings || [],
      employmentContext: employmentCtx || null,
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
- הקשר תעסוקתי (שכר, שעות עבודה) - אם מוגדר, השתמש בזה לחישוב כדאיות פרויקטים

תפקידך:
1. לענות על שאלות על הנתונים במערכת
2. לחשב סכומים, תאריכים, וסטטיסטיקות
3. לעזור בניהול פגישות ופרויקטים
4. אם יש employmentContext - חשב כדאיות פרויקטים (עלות יום חופש vs הכנסה)
${isAdmin ? '5. כאדמין, אתה יכול ליצור, לעדכן ולמחוק רשומות' : '5. אתה יכול רק לקרוא נתונים, לא לשנות אותם'}

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
