import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HelpCircle, X, MessageCircle, Mail, Bug } from 'lucide-react';
import { Button } from '@/components/ui/button';

// ── Configuração — edite conforme necessário ─────────────────────────────────
const SUPPORT_WHATSAPP = '5500000000000';          // ex: 5511999990000
const SUPPORT_EMAIL    = 'suporte@venzpro.com.br';
const SYSTEM_NAME      = 'VenzPro';
// ─────────────────────────────────────────────────────────────────────────────

function whatsappUrl(msg: string) {
  return `https://wa.me/${SUPPORT_WHATSAPP}?text=${encodeURIComponent(msg)}`;
}

function mailtoUrl(subject: string, body: string) {
  return `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

/**
 * Botão flutuante de suporte no canto inferior esquerdo.
 * Abre um mini-menu com opções de WhatsApp e email.
 */
export function SupportButton() {
  const [open, setOpen] = useState(false);

  const pageInfo = typeof window !== 'undefined' ? window.location.pathname : '';

  const whatsappMsg =
    `Olá! Preciso de ajuda com o ${SYSTEM_NAME}.\n\nPágina: ${pageInfo}\n\nDescrição do problema:\n`;

  const emailSubject = `[${SYSTEM_NAME}] Preciso de ajuda`;
  const emailBody    =
    `Olá,\n\nPreciso de ajuda com o ${SYSTEM_NAME}.\n\nPágina: ${pageInfo}\n\nDescrição do problema:\n\n`;

  return (
    <div className="fixed bottom-6 left-6 z-50 flex flex-col items-start gap-2">
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            className="flex flex-col gap-2 mb-1"
          >
            {/* WhatsApp */}
            <a
              href={whatsappUrl(whatsappMsg)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-emerald-500 text-white text-sm font-medium shadow-lg shadow-emerald-500/30 hover:bg-emerald-600 transition-colors"
            >
              <MessageCircle className="h-4 w-4" />
              Chamar no WhatsApp
            </a>

            {/* Email */}
            <a
              href={mailtoUrl(emailSubject, emailBody)}
              className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-card border border-border text-sm font-medium shadow-sm hover:bg-muted/50 transition-colors"
            >
              <Mail className="h-4 w-4 text-primary" />
              Enviar por e-mail
            </a>

            {/* Reportar bug */}
            <a
              href={mailtoUrl(`[${SYSTEM_NAME}] Reportar problema`, `Página: ${pageInfo}\n\nProblema encontrado:\n\n`)}
              className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-card border border-border text-sm font-medium shadow-sm hover:bg-muted/50 transition-colors"
            >
              <Bug className="h-4 w-4 text-amber-500" />
              Reportar problema
            </a>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Botão principal */}
      <Button
        onClick={() => setOpen(o => !o)}
        size="icon"
        className={`h-11 w-11 rounded-full shadow-lg transition-all ${
          open
            ? 'bg-muted border border-border text-foreground'
            : 'gradient-primary border-0 text-white shadow-primary/30'
        }`}
        title="Suporte"
      >
        {open ? <X className="h-5 w-5" /> : <HelpCircle className="h-5 w-5" />}
      </Button>
    </div>
  );
}
