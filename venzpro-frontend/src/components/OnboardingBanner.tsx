import { useNavigate } from 'react-router-dom';
import { useAuth }     from '@/contexts/AuthContext';
import { useCustomers } from '@/hooks/useCustomers';
import { useOrders }    from '@/hooks/useOrders';
import { useCompanies } from '@/hooks/useCompanies';
import { useProducts }  from '@/hooks/useProducts';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, CheckCircle2, Building2, Package, UserPlus, ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import api from '@/api/api';
import { useState } from 'react';
import { toast } from 'sonner';

/**
 * OnboardingBanner — Jornada do Hub Comercial (Passo 4 do Roadmap)
 *
 * 4 passos reais que guiam o utilizador pelo fluxo completo:
 *   1. Registar um Fornecedor/Empresa
 *   2. Registar/Importar Produtos
 *   3. Registar um Cliente e aprovar
 *   4. Tirar o primeiro Pedido
 *
 * Visibilidade: controlada por user.onboardingCompleted (persiste no banco).
 * O banner desaparece apenas quando o utilizador clica "Concluir" E
 * todos os 4 passos foram completados.
 */
export function OnboardingBanner() {
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();

  const { companies,        isLoading: lCo } = useCompanies();
  const { products,         isLoading: lPr } = useProducts();
  const { customers,        isLoading: lC  } = useCustomers();
  const { orders,           isLoading: lO  } = useOrders();

  const [completing, setCompleting] = useState(false);

  // Guarda principal — já concluiu onboarding
  if (user?.onboardingCompleted) return null;
  if (lCo || lPr || lC || lO)    return null;

  // Avaliação do progresso de cada passo
  const hasEmpresa  = companies.length > 0;
  const hasProdutos = products.length  > 0;
  const clienteAprovado = customers.some(c => c.status === 'APROVADO');
  const hasPedido   = orders.length    > 0;

  const passos = [
    {
      num:      1,
      icon:     Building2,
      title:    'Registar fornecedor',
      desc:     'Cadastre a empresa cujos produtos você representa.',
      cta:      'Ir para Empresas',
      href:     '/empresas',
      done:     hasEmpresa,
      disabled: false,
      color:    'hsl(239 84% 67%)',
    },
    {
      num:      2,
      icon:     Package,
      title:    'Registar produtos',
      desc:     'Adicione o catálogo de produtos da empresa fornecedora.',
      cta:      'Ir para Produtos',
      href:     '/produtos',
      done:     hasProdutos,
      disabled: !hasEmpresa,
      color:    'hsl(258 90% 66%)',
    },
    {
      num:      3,
      icon:     UserPlus,
      title:    'Registar e aprovar cliente',
      desc:     'Cadastre um cliente e aguarde a aprovação do gestor.',
      cta:      'Ir para Clientes',
      href:     '/clientes',
      done:     clienteAprovado,
      disabled: !hasProdutos,
      color:    'hsl(188 95% 43%)',
    },
    {
      num:      4,
      icon:     ShoppingCart,
      title:    'Criar o primeiro pedido',
      desc:     'Com tudo pronto, crie o primeiro orçamento de vendas.',
      cta:      'Ir para Pedidos',
      href:     '/pedidos',
      done:     hasPedido,
      disabled: !clienteAprovado,
      color:    'hsl(160 84% 39%)',
    },
  ];

  const passosFeitos = passos.filter(p => p.done).length;
  const progresso    = Math.round((passosFeitos / passos.length) * 100);
  const tudoPronto   = passosFeitos === passos.length;

  const handleConcluir = async () => {
    if (!tudoPronto) return;
    setCompleting(true);
    try {
      await api.patch('/users/me/onboarding/complete');
      await refreshUser();
      toast.success('Configuração inicial concluída! Bem-vindo ao VenzPro 🎉');
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
          <div className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 to-transparent p-5">

            {/* Cabeçalho */}
            <div className="flex items-center justify-between mb-1">
              <div>
                <p className="text-sm font-semibold text-primary flex items-center gap-2">
                  🚀 Configure o Hub Comercial em 4 etapas
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Siga a jornada abaixo para começar a vender com o VenzPro.
                </p>
              </div>
              <span className="text-xs text-muted-foreground font-medium tabular-nums">
              {passosFeitos}/{passos.length} concluídos
            </span>
            </div>

            {/* Barra de progresso */}
            <div className="w-full h-1.5 bg-primary/10 rounded-full mb-5 overflow-hidden">
              <motion.div
                  className="h-full gradient-primary rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${progresso}%` }}
                  transition={{ duration: 0.6, ease: 'easeOut' }}
              />
            </div>

            {/* Passos — layout horizontal em desktop, vertical em mobile */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {passos.map((passo, idx) => (
                  <motion.div
                      key={passo.num}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.06 }}
                      className={`relative flex flex-col gap-3 p-4 rounded-xl border transition-all ${
                          passo.done
                              ? 'bg-emerald-500/8 border-emerald-500/20'
                              : passo.disabled
                                  ? 'bg-muted/20 border-border/20 opacity-50'
                                  : 'bg-card border-border/50 shadow-sm hover:border-primary/30'
                      }`}
                  >
                    {/* Conector entre passos — só em desktop */}
                    {idx < passos.length - 1 && (
                        <div className="hidden lg:block absolute -right-1.5 top-1/2 -translate-y-1/2 z-10">
                          <ArrowRight className={`h-3 w-3 ${passo.done ? 'text-emerald-500' : 'text-muted-foreground/20'}`} />
                        </div>
                    )}

                    {/* Ícone */}
                    <div className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${
                        passo.done ? 'bg-emerald-500/15' : ''
                    }`} style={!passo.done ? { background: `${passo.color.replace(')', ' / 0.12)')}` } : {}}>
                      {passo.done
                          ? <CheckCircle2 className="h-4.5 w-4.5 text-emerald-500" style={{ width: 18, height: 18 }} />
                          : <passo.icon className="h-4 w-4" style={{ color: passo.disabled ? 'hsl(215 16% 47%)' : passo.color }} />
                      }
                    </div>

                    {/* Conteúdo */}
                    <div className="flex-1">
                      <p className={`text-xs font-semibold mb-0.5 ${passo.done ? 'line-through text-muted-foreground' : ''}`}>
                        {passo.num}. {passo.title}
                      </p>
                      <p className="text-[11px] text-muted-foreground leading-relaxed">
                        {passo.desc}
                      </p>
                    </div>

                    {/* CTA */}
                    {!passo.done && (
                        <Button
                            size="sm"
                            disabled={passo.disabled}
                            onClick={() => navigate(passo.href)}
                            className={`h-7 text-[11px] px-2.5 gap-1 mt-auto ${
                                passo.disabled
                                    ? ''
                                    : 'gradient-primary border-0 text-white shadow-sm'
                            }`}
                        >
                          {passo.cta}
                          <ArrowRight className="h-3 w-3" />
                        </Button>
                    )}
                  </motion.div>
              ))}
            </div>

            {/* Botão de conclusão */}
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
                        className="gradient-primary border-0 text-white gap-2 shadow-lg shadow-primary/25"
                    >
                      {completing ? (
                          <>Salvando...</>
                      ) : (
                          <><CheckCircle2 className="h-4 w-4" />Concluir configuração inicial</>
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