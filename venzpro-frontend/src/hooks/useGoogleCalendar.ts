/**
 * useGoogleCalendar.ts
 *
 * Integração real com a Google Calendar API v3 via OAuth2 Implicit Flow.
 *
 * ── Pré-requisito (uma vez, no Google Cloud Console) ──────────────────────────
 * 1. Acesse https://console.cloud.google.com
 * 2. Crie um projeto → APIs & Services → Enable APIs → "Google Calendar API"
 * 3. Credentials → Create OAuth2 Client → Web Application
 * 4. Authorized JavaScript origins: http://localhost:3000 (e seu domínio de produção)
 * 5. Copie o Client ID e adicione ao .env:
 *    VITE_GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
 *
 * A API do Google Calendar é GRATUITA para uso pessoal e comercial sem cobrança
 * até 1.000.000 de requests/dia por projeto (Google Calendar API free tier).
 *
 * ── Fluxo ─────────────────────────────────────────────────────────────────────
 * connect()  → abre popup OAuth2 → usuário autoriza → token salvo em memória
 * sync()     → puxa eventos do Google → cria no VenzPro via eventsApi
 * pushEvent  → cria evento no Google Calendar a partir de um evento VenzPro
 * disconnect → revoga token e limpa estado
 */

import { useState, useCallback, useRef } from 'react';
import { eventsApi, type EventPayload } from '@/api/endpoints';
import type { Event as AppEvent } from '@/types';
import { notify } from '@/lib/toast';

// ── Configuração ───────────────────────────────────────────────────────────────

const CLIENT_ID  = import.meta.env.VITE_GOOGLE_CLIENT_ID ?? '';
const SCOPES     = 'https://www.googleapis.com/auth/calendar.events';
const CALENDAR_API = 'https://www.googleapis.com/calendar/v3';

// ── Tipos internos ─────────────────────────────────────────────────────────────

interface GoogleCalendarEvent {
  id:      string;
  summary: string;
  description?: string;
  start:   { dateTime?: string; date?: string };
  end:     { dateTime?: string; date?: string };
  status:  string;
  attendees?: Array<{ email: string }>;
}

interface TokenInfo {
  access_token: string;
  expires_at:   number; // timestamp ms
}

// ── Hook ───────────────────────────────────────────────────────────────────────

export function useGoogleCalendar() {
  const [isConnected, setIsConnected]   = useState(false);
  const [isSyncing,   setIsSyncing]     = useState(false);
  const [syncedCount, setSyncedCount]   = useState(0);
  const tokenRef = useRef<TokenInfo | null>(null);

  // ── OAuth2 implicit flow via popup ────────────────────────────────────────

  const connect = useCallback((): Promise<string> => {
    return new Promise((resolve, reject) => {
      if (!CLIENT_ID) {
        reject(new Error('VITE_GOOGLE_CLIENT_ID não configurado no .env'));
        return;
      }

      const redirectUri = `${window.location.origin}/google-oauth-callback.html`;
      const params = new URLSearchParams({
        client_id:     CLIENT_ID,
        redirect_uri:  redirectUri,
        response_type: 'token',
        scope:         SCOPES,
        prompt:        'consent',
      });

      const url  = `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
      const popup = window.open(url, 'google-oauth', 'width=500,height=600,left=200,top=100');

      if (!popup) {
        reject(new Error('Popup bloqueado. Permita popups para este site.'));
        return;
      }

      // Polling: aguarda o popup redirecionar de volta com o token
      const poll = setInterval(() => {
        try {
          if (popup.closed) {
            clearInterval(poll);
            reject(new Error('Janela fechada pelo usuário.'));
            return;
          }

          const hash = popup.location.hash;
          if (hash && hash.includes('access_token')) {
            clearInterval(poll);
            popup.close();

            const params = new URLSearchParams(hash.slice(1));
            const token   = params.get('access_token') ?? '';
            const expiresIn = parseInt(params.get('expires_in') ?? '3600', 10);

            tokenRef.current = {
              access_token: token,
              expires_at:   Date.now() + expiresIn * 1000,
            };
            setIsConnected(true);
            resolve(token);
          }
        } catch {
          // SOP error enquanto popup ainda está em accounts.google.com — normal, ignorar
        }
      }, 300);

      // Timeout após 3 minutos
      setTimeout(() => {
        clearInterval(poll);
        if (!popup.closed) popup.close();
        reject(new Error('Tempo de autenticação esgotado.'));
      }, 180_000);
    });
  }, []);

  const getToken = useCallback(async (): Promise<string> => {
    const t = tokenRef.current;
    if (t && Date.now() < t.expires_at - 60_000) {
      return t.access_token;
    }
    // Token expirado → reconectar
    return connect();
  }, [connect]);

  const disconnect = useCallback(() => {
    tokenRef.current = null;
    setIsConnected(false);
    setSyncedCount(0);
    notify.info('Google Calendar desconectado.');
  }, []);

  // ── Buscar eventos do Google Calendar ─────────────────────────────────────

  const fetchGoogleEvents = useCallback(async (): Promise<GoogleCalendarEvent[]> => {
    const token = await getToken();

    // Puxa eventos dos próximos 90 dias
    const timeMin = new Date().toISOString();
    const timeMax = new Date(Date.now() + 90 * 24 * 3600 * 1000).toISOString();

    const res = await fetch(
        `${CALENDAR_API}/calendars/primary/events?` +
        `timeMin=${encodeURIComponent(timeMin)}&` +
        `timeMax=${encodeURIComponent(timeMax)}&` +
        `singleEvents=true&orderBy=startTime&maxResults=50`,
        { headers: { Authorization: `Bearer ${token}` } }
    );

    if (!res.ok) throw new Error(`Google API error: ${res.status}`);
    const data = await res.json();
    return data.items ?? [];
  }, [getToken]);

  // ── Sincronizar: Google → VenzPro ─────────────────────────────────────────

  const sync = useCallback(async () => {
    setIsSyncing(true);
    try {
      const googleEvents = await fetchGoogleEvents();
      let created = 0;

      for (const gEvent of googleEvents) {
        if (gEvent.status === 'cancelled') continue;

        const dataInicio = gEvent.start.dateTime ?? gEvent.start.date ?? '';
        const dataFim    = gEvent.end.dateTime   ?? gEvent.end.date   ?? undefined;

        const payload: EventPayload = {
          titulo:        gEvent.summary ?? 'Evento Google',
          tipo:          'REUNIAO',
          status:        'AGENDADO',
          dataInicio,
          dataFim:       dataFim ?? undefined,
          descricao:     gEvent.description ?? undefined,
          participantes: gEvent.attendees?.map(a => a.email) ?? [],
        };

        try {
          await eventsApi.create(payload);
          created++;
        } catch {
          // Ignora duplicatas — evento já existe no VenzPro
        }
      }

      setSyncedCount(created);
      notify.success(`${created} evento(s) importados do Google Calendar.`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao sincronizar';
      notify.error(msg);
    } finally {
      setIsSyncing(false);
    }
  }, [fetchGoogleEvents]);

  // ── Enviar evento VenzPro → Google Calendar ───────────────────────────────

  const pushEvent = useCallback(async (event: Partial<AppEvent>): Promise<string | null> => {
    try {
      const token = await getToken();

      const body = {
        summary:     event.titulo ?? 'Evento VenzPro',
        description: event.descricao ?? '',
        start: {
          dateTime: event.dataInicio,
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
        end: {
          dateTime: event.dataFim ?? event.dataInicio,
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
        attendees: (event.participantes ?? []).map(email => ({ email })),
      };

      const res = await fetch(`${CALENDAR_API}/calendars/primary/events`, {
        method:  'POST',
        headers: {
          Authorization:  `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) throw new Error(`Erro ao criar evento: ${res.status}`);
      const created = await res.json();
      notify.success('Evento enviado ao Google Calendar!');
      return created.id ?? null;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao enviar evento';
      notify.error(msg);
      return null;
    }
  }, [getToken]);

  return {
    isConnected,
    isSyncing,
    syncedCount,
    connect,
    disconnect,
    sync,
    pushEvent,
  };
}