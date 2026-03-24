import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useCustomers } from '@/hooks/useCustomers';
import { useOrders } from '@/hooks/useOrders';
import { useCompanies } from '@/hooks/useCompanies';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, UserPlus, Package, Building2, CheckCircle2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import api from '@/api/api';
import { useState } from 'react';
import { toast } from 'sonner';

/**
 * Banner de onboarding obrigatório — Regra 5.
 *
 * Visibilidade controlada pela flag `user.onboardingCompleted` que vem
 * do AuthContext (persiste no banco de dados).
 *
 * O banner NÃO desaparece apenas por ter clientes/pedidos — o usuário
 * precisa concluir explicitamente o fluxo ou o admin pode resetar.
 *
 * Quando o último passo é concluído, o backend é notificado via
 * PATCH /api/users/me/onboarding/complete e o AuthContext é atualizado.
 */
export function OnboardingBanner() {
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();

  const { customers, isLoading: lC } = useCustomers();
  const { orders,    isLoading: lO } = useOrders();
  const { companies, isLoading: lCo } = useCompanies();

  const [completing, setCompleting] = useState(false);

  // ── Guarda principal: se onboarding já foi concluído, não renderiza ─────────
  // Esta é a verificação definitiva — não depende de contagens de entidades.
  if (user?.onboardingCompleted) return null;

  // Enquanto os dados carregam, não mostra o banner para evitar flicker
  if (lC || lO || lCo) return null;

  // Progresso dos passos (usado apenas para feedback visual)
  const hasCompanies = companies.length > 0;
  const hasCustomers = customers.length > 0;
  const hasOrders    = orders.length > 0;

  const passos = [
    {
      num:      1,
      icon:     Building2,
      title:    'Cadastre uma empresa parceira',
      desc:     'Adicione a empresa cujos produtos você vai representar e vender.',
      cta:      'Cadastrar empresa',
      href:     '/empresas',
      done:     hasCompanies,
      disabled: false,
    },
    {
      num:      2,
      icon:     UserPlus,
      title:    'Cadastre seu primeiro cliente',
      desc:     'Adicione os clientes que você atende para poder criar pedidos.',
      cta:      'Cadastrar cliente',
      href:     '/clientes',
      done:     hasCustomers,
      disabled: !hasCompanies,
    },
    {
      num:      3,
      icon:     Package,
      title:    'Crie seu primeiro pedido',
      desc:     hasCustomers
        ? 'Agora crie um orçamento para um cliente aprovado.'
        : 'Após cadastrar e aprovar um cliente, você poderá criar pedidos.',
      cta:      'Criar pedido',
      href:     '/pedidos',
      done:     hasOrders,
      disabled: !hasCustomers,
    },
  ];

  const totalPassos  = passos.length;
  const passosFeitos = passos.filter(p => p.done).length;
  const progresso    = Math.round((passosFeitos / totalPassos) * 100);
  const tudoPronto   = passosFeitos === totalPassos;

  /**
   * Notifica o backend que o onboarding foi concluído e atualiza o contexto.
   * Apenas disponível quando todos os passos estão feitos.
   */
  const handleConcluir = async () => {
    if (!tudoPronto) return;
    setCompleting(true);
    try {
      await api.patch('/users/me/onboarding/complete');
      await refreshUser(); // atualiza onboardingCompleted no AuthContext
      toast.success('Onboarding concluído! Bem-vindo ao VenzPro 🎉');
    } catch {
      toast.error('Não foi possível salvar o progresso. Tente novamente.');
    } finally {
      setCompleting(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -16 }}
        transition={{ duration: 0.3 }}
        className="mb-6"
      >
        <div className="rounded-2xl border border-primary/20 bg-primary/5 p-5">
          {/* Cabeçalho */}
          <div className="flex items-center justify-between mb-1">
            <p className="text-sm font-semibold text-primary flex items-center gap-2">
              🚀 Primeiros passos — configure o sistema em {totalPassos} etapas
            </p>
            <span className="text-xs text-muted-foreground font-medium">
              {passosFeitos}/{totalPassos} concluídos
            </span>
          </div>

          {/* Barra de progresso */}
          <div className="w-full h-1.5 bg-primary/10 rounded-full mb-4 overflow-hidden">
            <motion.div
              className="h-full gradient-primary rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${progresso}%` }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
            />
          </div>

          {/* Lista de passos */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {passos.map(passo => (
              <div
                key={passo.num}
                className={`flex items-start gap-3 p-4 rounded-xl border transition-all ${
                  passo.done
                    ? 'bg-emerald-500/10 border-emerald-500/20'
                    : passo.disabled
                    ? 'bg-muted/30 border-border/30 opacity-60'
                    : 'bg-card border-border/50 shadow-sm'
                }`}
              >
                {/* Ícone */}
                <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${
                  passo.done ? 'bg-emerald-500/20' : 'bg-primary/10'
                }`}>
                  {passo.done
                    ? <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    : <passo.icon className={`h-4 w-4 ${passo.disabled ? 'text-muted-foreground' : 'text-primary'}`} />
                  }
                </div>

                {/* Conteúdo */}
                <div className="flex-1 min-w-0">
                  <p className={`text-xs font-semibold mb-0.5 ${passo.done ? 'line-through text-muted-foreground' : ''}`}>
                    {passo.num}. {passo.title}
                  </p>
                  <p className="text-[11px] text-muted-foreground mb-2 leading-relaxed">
                    {passo.desc}
                  </p>
                  {!passo.done && (
                    <Button
                      size="sm"
                      disabled={passo.disabled}
                      onClick={() => navigate(passo.href)}
                      className={`h-6 text-[11px] px-2 gap-1 ${
                        passo.disabled ? '' : 'gradient-primary border-0 text-white'
                      }`}
                    >
                      {passo.cta}
                      <ArrowRight className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Botão de conclusão — aparece apenas quando tudo está feito */}
          <AnimatePresence>
            {tudoPronto && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-4 flex justify-end"
              >
                <Button
                  onClick={handleConcluir}
                  disabled={completing}
                  className="gradient-primary border-0 text-white gap-2"
                >
                  {completing ? (
                    <>Salvando...</>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4" />
                      Concluir configuração inicial
                    </>
                  )}
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
