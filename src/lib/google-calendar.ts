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

export async function addToGoogleCalendar(event: CalendarEventInput): Promise<unknown> {
  const { gapi } = await import('gapi-script');
  
  // Initialize if needed
  await initGoogleCalendar();
  
  // Check if user is signed in
  const auth = gapi.auth2.getAuthInstance();
  if (!auth.isSignedIn.get()) {
    // Prompt user to sign in
    await auth.signIn();
  }
  
  if (!gapi?.client?.calendar?.events) {
    throw new Error('Google Calendar API not loaded. Ensure gapi client is initialized with calendar scope.');
  }
  
  const request = gapi.client.calendar.events.insert({
    calendarId: 'primary',
    resource: event,
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
