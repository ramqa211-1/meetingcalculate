export interface CalendarEventInput {
  summary: string;
  description: string;
  start: { dateTime: string };
  end: { dateTime: string };
}

export async function addToGoogleCalendar(event: CalendarEventInput): Promise<unknown> {
  const { gapi } = await import('gapi-script');
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
