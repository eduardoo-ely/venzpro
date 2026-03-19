import type { Event } from '@/types';

export const useGoogleCalendar = () => ({
  isConnected: false,
  sync: async () => {
    console.log('Google Calendar sync - TODO: implement OAuth2 flow');
  },
  pushEvent: async (_event: Partial<Event>) => {
    console.log('Push event to Google Calendar - TODO');
  },
  pullEvents: async (): Promise<Event[]> => {
    console.log('Pull events from Google Calendar - TODO');
    return [];
  },
});
