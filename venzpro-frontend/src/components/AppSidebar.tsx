import {
  LayoutDashboard, Users, Package, Calendar, Building2,
  FolderOpen, Settings, LogOut, Zap, ShieldCheck, ShoppingBag,
} from 'lucide-react';
import { NavLink }   from '@/components/NavLink';
import { useLocation } from 'react-router-dom';
import { useAuth }   from '@/contexts/AuthContext';
import { AvatarInitials } from '@/components/AvatarInitials';
import { useOrders }  from '@/hooks/useOrders';
import { useEvents }  from '@/hooks/useEvents';
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
  SidebarHeader, SidebarFooter, useSidebar,
} from '@/components/ui/sidebar';
import { Button }    from '@/components/ui/button';
import type { UserRole } from '@/types/auth';

// ── Definição dos itens de menu ───────────────────────────────────────────────

interface NavItem {
  title:         string;
  url:           string;
  icon:          React.ElementType;
  /** Roles que podem ver este item. Undefined = qualquer autenticado. */
  allowedRoles?: UserRole[];
  badge?:        string | null;
}

/**
 * Itens base do menu — badges calculados dinamicamente abaixo.
 * allowedRoles espelha as regras do ROUTE_ACCESS_MAP em auth.ts.
 */
const BASE_ITEMS: Omit<NavItem, 'badge'>[] = [
  { title: 'Dashboard',     url: '/',             icon: LayoutDashboard },
  { title: 'Clientes',      url: '/clientes',     icon: Users           },
  { title: 'Pedidos',       url: '/pedidos',      icon: Package         },
  { title: 'Agenda',        url: '/agenda',       icon: Calendar        },
  { title: 'Empresas',      url: '/empresas',     icon: Building2       },
  { title: 'Produtos',      url: '/produtos',     icon: ShoppingBag     },
  { title: 'Catálogos',     url: '/catalogos',    icon: FolderOpen      },
  { title: 'Configurações', url: '/configuracoes',icon: Settings        },
  {
    title:        'Usuários',
    url:          '/usuarios',
    icon:         ShieldCheck,
    allowedRoles: ['ADMIN'],             // Espelha ProtectedRoute em App.tsx
  },
];

// ── Componente ────────────────────────────────────────────────────────────────

export function AppSidebar() {
  const { state }         = useSidebar();
  const collapsed         = state === 'collapsed';
  const location          = useLocation();
  const { user, logout }  = useAuth();

  const userRole = user?.role as UserRole | undefined;

  // Badges dinâmicos
  const { orders } = useOrders('ORCAMENTO');
  const { events } = useEvents();

  const pedidosBadge = orders?.length ? String(orders.length) : null;
  const agendaBadge  = events?.filter((e: any) => e.status === 'AGENDADO').length
      ? String(events.filter((e: any) => e.status === 'AGENDADO').length)
      : null;

  const badgeMap: Record<string, string | null> = {
    '/pedidos': pedidosBadge,
    '/agenda':  agendaBadge,
  };

  // Filtra itens pelo role do usuário — itens sem allowedRoles são visíveis para todos
  const visibleItems: NavItem[] = BASE_ITEMS
      .filter(item =>
          !item.allowedRoles ||
          (userRole && item.allowedRoles.includes(userRole))
      )
      .map(item => ({
        ...item,
        badge: badgeMap[item.url] ?? null,
      }));

  return (
      <Sidebar collapsible="icon" className="border-r border-sidebar-border glass">
        {/* Gradiente decorativo */}
        <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-[hsl(239,84%,67%,0.08)] to-transparent pointer-events-none" />

        {/* Logo */}
        <SidebarHeader className="p-4 relative z-10">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl gradient-primary shadow-lg shadow-primary/25">
              <Zap className="h-5 w-5 text-white" />
            </div>
            {!collapsed && (
                <div className="flex flex-col">
                  <span className="text-sm font-bold text-sidebar-foreground letter-tight">VenzPro</span>
                  <span className="text-[11px] text-sidebar-foreground/40">Gestão de vendas</span>
                </div>
            )}
          </div>
        </SidebarHeader>

        {/* Navegação */}
        <SidebarContent className="relative z-10">
          <SidebarGroup>
            <SidebarGroupLabel className="text-sidebar-foreground/30 text-[10px] uppercase tracking-widest font-semibold px-4">
              {!collapsed && 'Menu'}
            </SidebarGroupLabel>

            <SidebarGroupContent>
              <SidebarMenu>
                {visibleItems.map((item) => {
                  const isActive = item.url === '/'
                      ? location.pathname === '/'
                      : location.pathname.startsWith(item.url);

                  return (
                      <SidebarMenuItem key={item.title}>
                        <SidebarMenuButton asChild isActive={isActive}>
                          <NavLink
                              to={item.url}
                              end={item.url === '/'}
                              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all duration-200 text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 relative group"
                              activeClassName="bg-sidebar-accent text-white font-medium"
                          >
                            {isActive && (
                                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full gradient-primary" />
                            )}
                            <item.icon className="h-4 w-4 shrink-0" />
                            {!collapsed && (
                                <>
                                  <span className="flex-1">{item.title}</span>
                                  {item.badge && (
                                      <span className="h-5 min-w-[20px] px-1.5 flex items-center justify-center rounded-full text-[10px] font-bold gradient-primary text-white">
                                {item.badge}
                              </span>
                                  )}
                                </>
                            )}
                          </NavLink>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        {/* Rodapé com perfil do usuário */}
        <SidebarFooter className="p-3 relative z-10 border-t border-sidebar-border">
          <div className="flex items-center gap-3">
            {user && <AvatarInitials name={user.nome} size="sm" />}
            {!collapsed && user && (
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-xs font-medium text-sidebar-foreground truncate">{user.nome}</p>
                    {userRole === 'ADMIN' && (
                        <span className="text-[9px] font-bold px-1 py-0.5 rounded bg-primary/20 text-primary uppercase tracking-wide">
                    Admin
                  </span>
                    )}
                  </div>
                  <p className="text-[10px] text-sidebar-foreground/40 truncate">{user.email}</p>
                </div>
            )}
            {!collapsed && (
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={logout}
                    className="h-8 w-8 text-sidebar-foreground/40 hover:text-destructive shrink-0"
                    title="Sair"
                >
                  <LogOut className="h-3.5 w-3.5" />
                </Button>
            )}
          </div>
        </SidebarFooter>
      </Sidebar>
  );
}