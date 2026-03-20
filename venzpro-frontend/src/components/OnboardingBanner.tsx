import { useNavigate } from 'react-router-dom';
import { useCustomers } from '@/hooks/useCustomers';
import { useOrders } from '@/hooks/useOrders';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, UserPlus, Package, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * Exibido no Dashboard enquanto o usuário ainda está configurando o sistema.
 * Desaparece automaticamente quando clientes E pedidos existem.
 */
export function OnboardingBanner() {
  const { customers, isLoading: lC } = useCustomers();
  const { orders,    isLoading: lO } = useOrders();
  const navigate = useNavigate();

  if (lC || lO) return null;

  const hasCustomers = customers.length > 0;
  const hasOrders    = orders.length    > 0;

  // Banner some quando tudo estiver feito
  if (hasCustomers && hasOrders) return null;

  const steps = [
    {
      num:   1,
      icon:  UserPlus,
      title: 'Cadastre seu primeiro cliente',
      desc:  'Adicione os clientes que você atende para poder criar pedidos.',
      cta:   'Cadastrar cliente',
      href:  '/clientes',
      done:  hasCustomers,
    },
    {
      num:   2,
      icon:  Package,
      title: 'Crie seu primeiro pedido',
      desc:  hasCustomers
        ? 'Agora crie um orçamento ou pedido para um cliente.'
        : 'Após cadastrar um cliente, você poderá criar pedidos.',
      cta:   'Criar pedido',
      href:  '/pedidos',
      done:  hasOrders,
      disabled: !hasCustomers,
    },
  ];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -12 }}
        className="mb-6"
      >
        <div className="rounded-2xl border border-primary/20 bg-primary/5 p-5">
          <p className="text-sm font-semibold text-primary mb-4 flex items-center gap-2">
            🚀 Primeiros passos — configure o sistema em 2 etapas
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {steps.map(step => (
              <div
                key={step.num}
                className={`flex items-start gap-4 p-4 rounded-xl border transition-all ${
                  step.done
                    ? 'bg-emerald-500/10 border-emerald-500/20'
                    : step.disabled
                    ? 'bg-muted/30 border-border/30 opacity-60'
                    : 'bg-card border-border/50 shadow-sm'
                }`}
              >
                {/* Ícone / check */}
                <div className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 ${
                  step.done ? 'bg-emerald-500/20' : 'bg-primary/10'
                }`}>
                  {step.done
                    ? <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                    : <step.icon className={`h-5 w-5 ${step.disabled ? 'text-muted-foreground' : 'text-primary'}`} />
                  }
                </div>

                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-semibold mb-0.5 ${step.done ? 'line-through text-muted-foreground' : ''}`}>
                    Passo {step.num}: {step.title}
                  </p>
                  <p className="text-xs text-muted-foreground mb-3">{step.desc}</p>

                  {!step.done && (
                    <Button
                      size="sm"
                      disabled={step.disabled}
                      onClick={() => navigate(step.href)}
                      className={`h-7 text-xs gap-1.5 ${step.disabled ? '' : 'gradient-primary border-0 text-white'}`}
                    >
                      {step.cta}
                      <ArrowRight className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
