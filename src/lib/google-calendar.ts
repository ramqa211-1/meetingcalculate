export interface CalendarEventInput {
  summary: string;
  description: string;
  start: { dateTime: string };
  end: { dateTime: string };
}

let gapiInitialized = false;
let gapiInitializing = false;

async function initGoogleCalendar(): Promise<void> {
  if (gapiInitialized) return;
  if (gapiInitializing) {
    // Wait for initialization to complete
    while (gapiInitializing) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    return;
  }

  gapiInitializing = true;
  try {
    const { gapi } = await import('gapi-script');
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    
    if (!clientId) {
      throw new Error('Google Client ID not configured. Add VITE_GOOGLE_CLIENT_ID to .env');
    }

    await new Promise<void>((resolve, reject) => {
      gapi.load('client:auth2', async () => {
        try {
          await gapi.client.init({
            clientId: clientId,
            discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest'],
            scope: 'https://www.googleapis.com/auth/calendar.events',
          });
          gapiInitialized = true;
          resolve();
        } catch (error) {
          reject(error);
        }
      });
    });
  } finally {
    gapiInitializing = false;
  }
}

async function ensureSignedIn(gapiInstance: typeof import('gapi-script').gapi): Promise<void> {
  const auth = gapiInstance.auth2.getAuthInstance();
  if (auth.isSignedIn.get()) return;

  const trySignIn = (prompt?: 'consent' | 'select_account') => {
    const options = prompt ? { prompt } : undefined;
    return auth.signIn(options);
  };

  try {
    await trySignIn('select_account');
  } catch (err) {
    const obj = err as { type?: string; error?: string };
    if (obj?.type === 'tokenFailed' || obj?.error === 'server_error') {
      try {
        await trySignIn('consent');
      } catch {
        throw new Error(
          'שגיאת שרת של Google. נסה: 1) לרענן את הדף ולנסות שוב 2) לאפשר חלונות קופצים 3) לבדוק שהחשבון ברשימת Test users ב-Google Cloud Console.'
        );
      }
    } else {
      throw err;
    }
  }
}

export async function addToGoogleCalendar(event: CalendarEventInput): Promise<unknown> {
  const { gapi } = await import('gapi-script');

  await initGoogleCalendar();

  await ensureSignedIn(gapi);

  if (!gapi?.client?.calendar?.events) {
    throw new Error('Google Calendar API not loaded. Ensure gapi client is initialized with calendar scope.');
  }

  // Ensure ISO times include timezone for Google Calendar (Israel = +02:00)
  const toCalendarTime = (dateTime: string) => {
    if (/Z$|[+-]\d{2}:?\d{2}$/.test(dateTime)) return dateTime;
    return `${dateTime.replace(/\.\d{3}$/, '')}+02:00`;
  };

  const resource = {
    summary: event.summary,
    description: event.description,
    start: { dateTime: toCalendarTime(event.start.dateTime), timeZone: 'Asia/Jerusalem' },
    end: { dateTime: toCalendarTime(event.end.dateTime), timeZone: 'Asia/Jerusalem' },
  };

  const request = gapi.client.calendar.events.insert({
    calendarId: 'primary',
    resource,
  });

  return request;
}

export function calculateEndTime(date: string, startTime: string, durationHours: number): string {
  const [h, m] = startTime.split(':').map(Number);
  const totalMinutes = h * 60 + m + Math.round(durationHours * 60);
  const endH = Math.floor(totalMinutes / 60) % 24;
  const endM = totalMinutes % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date}T${pad(endH)}:${pad(endM)}:00`;
}
