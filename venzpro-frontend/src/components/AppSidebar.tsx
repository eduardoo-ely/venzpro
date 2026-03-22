import {
  LayoutDashboard, Users, Package, Calendar, Building2, FolderOpen,
  Settings, LogOut, Zap, ShieldCheck,
} from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { AvatarInitials } from '@/components/AvatarInitials';
import { useOrders } from '@/hooks/useOrders';
import { useEvents } from '@/hooks/useEvents';
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarHeader, SidebarFooter, useSidebar,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed  = state === 'collapsed';
  const location   = useLocation();
  const { user, logout } = useAuth();

  const isAdmin = user?.role === 'ADMIN';

  // Badge Pedidos: apenas status ORCAMENTO (em aberto)
  const { orders } = useOrders('ORCAMENTO');
  const pedidosBadge = orders.length > 0 ? String(orders.length) : null;

  // Badge Agenda: eventos com status AGENDADO
  const { events } = useEvents();
  const agendaBadge = events.filter(e => e.status === 'AGENDADO').length > 0
      ? String(events.filter(e => e.status === 'AGENDADO').length)
      : null;

  const items = [
    { title: 'Dashboard',     url: '/',             icon: LayoutDashboard, badge: null         },
    { title: 'Clientes',      url: '/clientes',      icon: Users,           badge: null         },
    { title: 'Pedidos',       url: '/pedidos',       icon: Package,         badge: pedidosBadge },
    { title: 'Agenda',        url: '/agenda',        icon: Calendar,        badge: agendaBadge  },
    { title: 'Empresas',      url: '/empresas',      icon: Building2,       badge: null         },
    { title: 'Catálogos',     url: '/catalogos',     icon: FolderOpen,      badge: null         },
    { title: 'Configurações', url: '/configuracoes', icon: Settings,        badge: null         },
    ...(isAdmin ? [{ title: 'Usuários', url: '/usuarios', icon: ShieldCheck, badge: null }] : []),
  ];

  return (
      <Sidebar collapsible="icon" className="border-r border-sidebar-border glass">
        <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-[hsl(239,84%,67%,0.08)] to-transparent pointer-events-none" />

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

        <SidebarContent className="relative z-10">
          <SidebarGroup>
            <SidebarGroupLabel className="text-sidebar-foreground/30 text-[10px] uppercase tracking-widest font-semibold px-4">
              {!collapsed && 'Menu'}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {items.map((item) => {
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

        <SidebarFooter className="p-3 relative z-10 border-t border-sidebar-border">
          <div className="flex items-center gap-3">
            {user && <AvatarInitials name={user.nome} size="sm" />}
            {!collapsed && user && (
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-xs font-medium text-sidebar-foreground truncate">{user.nome}</p>
                    {isAdmin && (
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
                >
                  <LogOut className="h-3.5 w-3.5" />
                </Button>
            )}
          </div>
        </SidebarFooter>
      </Sidebar>
  );
}