import { useState } from 'react';
import { useAuth }  from '@/contexts/AuthContext';
import { useUsers } from '@/hooks/useUsers';
import { useGoogleCalendar } from '@/hooks/useGoogleCalendar';
import { Card, CardContent } from '@/components/ui/card';
import { Badge }   from '@/components/ui/badge';
import { Button }  from '@/components/ui/button';
import { Label }   from '@/components/ui/label';
import { Switch }  from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import {
  User as UserIcon, Building2, Users, Plug, Trash2, Settings2,
  Calendar, MessageSquare, Zap, CheckCircle2, Loader2, Link2Off,
  RefreshCw,
} from 'lucide-react';
import { PageHeader }     from '@/components/PageHeader';
import { AvatarInitials } from '@/components/AvatarInitials';
import { motion }         from 'framer-motion';
import type { User, UserRole } from '@/types';
import type { UpdateAccessPayload } from '@/api/endpoints';

const ROLES: { value: UserRole; label: string }[] = [
  { value: 'ADMIN',    label: 'Administrador' },
  { value: 'GERENTE',  label: 'Gerente'       },
  { value: 'VENDEDOR', label: 'Vendedor'      },
  { value: 'SUPORTE',  label: 'Suporte'       },
];

interface AccessEditorState {
  open: boolean; user: User | null; role: string;
  podeAprovar: boolean; podeExportar: boolean; podeVerDashboard: boolean;
}

const EDITOR_VAZIO: AccessEditorState = {
  open: false, user: null, role: 'VENDEDOR',
  podeAprovar: false, podeExportar: false, podeVerDashboard: false,
};

export default function ConfiguracoesPage() {
  const { user, organization } = useAuth();
  const { users, isLoading, updateAccess, remove } = useUsers();
  const [editor, setEditor] = useState<AccessEditorState>(EDITOR_VAZIO);

  // Google Calendar
  const { isConnected, isSyncing, connect, disconnect, sync } = useGoogleCalendar();
  const [isConnecting, setIsConnecting] = useState(false);

  const isAdmin = user?.role === 'ADMIN';

  const abrirEditor = (u: User) => setEditor({
    open: true, user: u, role: u.role,
    podeAprovar:     u.podeAprovar     ?? false,
    podeExportar:    u.podeExportar    ?? false,
    podeVerDashboard:u.podeVerDashboard ?? false,
  });

  const salvarAcesso = () => {
    if (!editor.user) return;
    const payload: UpdateAccessPayload = {
      role: editor.role,
      podeAprovar:     editor.podeAprovar,
      podeExportar:    editor.podeExportar,
      podeVerDashboard:editor.podeVerDashboard,
    };
    updateAccess.mutate({ id: editor.user.id, payload }, { onSuccess: () => setEditor(EDITOR_VAZIO) });
  };

  const handleGoogleConnect = async () => {
    setIsConnecting(true);
    try { await connect(); }
    catch (err) {
      const msg = err instanceof Error ? err.message : '';
      if (!msg.includes('fechada') && !msg.includes('usuário'))
        import('@/lib/toast').then(({ notify }) => notify.error(msg || 'Erro ao conectar com o Google.'));
    } finally { setIsConnecting(false); }
  };

  return (
      <div className="space-y-6">
        <PageHeader title="Configurações" subtitle="Gerencie perfil, equipe e integrações" />

        <Tabs defaultValue="perfil" className="space-y-6">
          <TabsList className="bg-muted/50 border border-border/30 p-1 h-auto flex-wrap">
            <TabsTrigger value="perfil"      className="gap-2 data-[state=active]:gradient-primary data-[state=active]:text-white data-[state=active]:border-0"><UserIcon    className="h-3.5 w-3.5" />Perfil</TabsTrigger>
            <TabsTrigger value="equipe"      className="gap-2 data-[state=active]:gradient-primary data-[state=active]:text-white data-[state=active]:border-0"><Users       className="h-3.5 w-3.5" />Equipe</TabsTrigger>
            <TabsTrigger value="integracoes" className="gap-2 data-[state=active]:gradient-primary data-[state=active]:text-white data-[state=active]:border-0"><Plug        className="h-3.5 w-3.5" />Integrações</TabsTrigger>
          </TabsList>

          {/* ── Aba Perfil ──────────────────────────────────────────────────────── */}
          <TabsContent value="perfil" className="space-y-6">
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
              <Card className="border-glow bg-card overflow-hidden">
                <div className="h-24 gradient-primary opacity-80" />
                <CardContent className="p-6 -mt-10 relative">
                  <div className="flex items-end gap-4">
                    <div className="ring-4 ring-card rounded-full">
                      {user && <AvatarInitials name={user.nome} size="lg" />}
                    </div>
                    <div className="pb-1">
                      <h2 className="text-lg font-bold letter-tight">{user?.nome}</h2>
                      <p className="text-sm text-muted-foreground">{user?.email}</p>
                    </div>
                    <Badge variant="outline" className="ml-auto mb-1 text-xs border-primary/30 gradient-text">
                      {ROLES.find(r => r.value === user?.role)?.label ?? user?.role}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="border-glow bg-card">
                <CardContent className="p-6 space-y-3">
                  <div className="flex items-center gap-2 mb-2"><Building2 className="h-4 w-4 text-primary" /><h3 className="text-sm font-semibold">Organização</h3></div>
                  <div><Label className="text-xs text-muted-foreground">Nome</Label><p className="text-sm font-medium">{organization?.nome}</p></div>
                  <div><Label className="text-xs text-muted-foreground">Tipo</Label><Badge variant="outline" className="text-[10px] mt-1 block w-fit">{organization?.tipo}</Badge></div>
                </CardContent>
              </Card>
              <Card className="border-glow bg-card">
                <CardContent className="p-6 space-y-3">
                  <div className="flex items-center gap-2 mb-2"><UserIcon className="h-4 w-4 text-primary" /><h3 className="text-sm font-semibold">Meu Perfil</h3></div>
                  <div><Label className="text-xs text-muted-foreground">Nome</Label><p className="text-sm font-medium">{user?.nome}</p></div>
                  <div><Label className="text-xs text-muted-foreground">Email</Label><p className="text-sm font-medium">{user?.email}</p></div>
                  <div><Label className="text-xs text-muted-foreground">Função</Label><p className="text-sm font-medium">{ROLES.find(r => r.value === user?.role)?.label ?? user?.role}</p></div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ── Aba Equipe ──────────────────────────────────────────────────────── */}
          <TabsContent value="equipe">
            <Card className="border-glow bg-card">
              <CardContent className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Users className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-semibold">Equipe</h3>
                  <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{users.length}</span>
                </div>
                {isLoading ? (
                    <div className="space-y-2">
                      {Array.from({ length: 3 }).map((_, i) => (
                          <div key={i} className="flex items-center gap-3 p-3">
                            <Skeleton className="h-8 w-8 rounded-full" />
                            <div className="flex-1 space-y-1"><Skeleton className="h-3 w-1/3" /><Skeleton className="h-3 w-1/4" /></div>
                            <Skeleton className="h-6 w-28" />
                          </div>
                      ))}
                    </div>
                ) : (
                    <div className="space-y-1">
                      {users.map(u => {
                        const isMe = u.id === user?.id;
                        return (
                            <div key={u.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/30 transition-colors group">
                              <AvatarInitials name={u.nome} size="sm" />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <p className="text-sm font-medium truncate">{u.nome}</p>
                                  {isMe && <span className="text-[9px] font-bold px-1 py-0.5 rounded bg-primary/20 text-primary uppercase tracking-wide">Você</span>}
                                </div>
                                <p className="text-[10px] text-muted-foreground truncate">{u.email}</p>
                              </div>
                              {isAdmin && !isMe ? (
                                  <div className="flex items-center gap-2">
                                    <Button variant="ghost" size="sm" className="h-7 text-xs text-primary gap-1" onClick={() => abrirEditor(u)}>
                                      <Settings2 className="h-3 w-3" />Gerenciar
                                    </Button>
                                    <AlertDialog>
                                      <AlertDialogTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 className="h-3.5 w-3.5" /></Button>
                                      </AlertDialogTrigger>
                                      <AlertDialogContent className="border-glow bg-card">
                                        <AlertDialogHeader><AlertDialogTitle>Remover {u.nome}?</AlertDialogTitle><AlertDialogDescription>O usuário perderá acesso.</AlertDialogDescription></AlertDialogHeader>
                                        <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => remove.mutate(u.id)} className="bg-destructive text-white">Remover</AlertDialogAction></AlertDialogFooter>
                                      </AlertDialogContent>
                                    </AlertDialog>
                                  </div>
                              ) : (
                                  <Badge variant="outline" className="text-[10px]">{ROLES.find(r => r.value === u.role)?.label ?? u.role}</Badge>
                              )}
                            </div>
                        );
                      })}
                    </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Aba Integrações ─────────────────────────────────────────────────── */}
          <TabsContent value="integracoes" className="space-y-4">

            {/* Google Calendar */}
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
              <Card className="border-glow bg-card">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    {/* Ícone Google Calendar */}
                    <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-[#4285F4] to-[#34A853] flex items-center justify-center shrink-0 shadow-lg">
                      <Calendar className="h-6 w-6 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-sm font-semibold">Google Calendar</h3>
                        {isConnected
                            ? <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full"><CheckCircle2 className="h-3 w-3" />Conectado</span>
                            : <span className="text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded-full">Não conectado</span>
                        }
                      </div>
                      <p className="text-xs text-muted-foreground mb-4">
                        Sincronize eventos da Agenda com o Google Calendar. Importe reuniões e visitas agendadas no Google, ou exporte eventos do VenzPro para o seu calendário.
                      </p>

                      {!isConnected ? (
                          <div className="space-y-3">
                            <Button onClick={handleGoogleConnect} disabled={isConnecting}
                                    className="gradient-primary border-0 text-white gap-2 shadow-sm shadow-primary/25">
                              {isConnecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plug className="h-4 w-4" />}
                              {isConnecting ? 'Conectando...' : 'Conectar Google Calendar'}
                            </Button>
                            <p className="text-[10px] text-muted-foreground">
                              Requer: <code className="bg-muted px-1 rounded font-mono">VITE_GOOGLE_CLIENT_ID</code> configurado no <code className="bg-muted px-1 rounded font-mono">.env</code>.
                              API gratuita — 1M requests/dia.
                            </p>
                          </div>
                      ) : (
                          <div className="flex flex-wrap gap-2">
                            <Button onClick={sync} disabled={isSyncing} variant="outline"
                                    className="border-emerald-500/30 text-emerald-500 hover:bg-emerald-500/10 gap-2">
                              {isSyncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                              {isSyncing ? 'Sincronizando...' : 'Sincronizar agora'}
                            </Button>
                            <Button onClick={disconnect} variant="ghost" size="sm"
                                    className="text-muted-foreground hover:text-destructive gap-1.5">
                              <Link2Off className="h-3.5 w-3.5" />Desconectar
                            </Button>
                          </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* WhatsApp Business — em breve */}
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
              <Card className="border-glow bg-card opacity-60">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-[#25D366] to-[#128C7E] flex items-center justify-center shrink-0">
                      <MessageSquare className="h-6 w-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-sm font-semibold">WhatsApp Business</h3>
                        <Badge variant="outline" className="text-[10px] text-muted-foreground">Em breve</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Envie notificações automáticas de pedidos, aprovações e alertas diretamente no WhatsApp dos clientes e da equipe.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* APIs Fiscais — em breve */}
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <Card className="border-glow bg-card opacity-60">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-[#f59e0b] to-[#d97706] flex items-center justify-center shrink-0">
                      <Zap className="h-6 w-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-sm font-semibold">APIs Fiscais</h3>
                        <Badge variant="outline" className="text-[10px] text-muted-foreground">Em breve</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Emissão automática de NF-e e NFS-e, integração com SEFAZ e consulta de situação fiscal dos clientes via CPF/CNPJ.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>
        </Tabs>

        {/* Modal de acesso */}
        <Dialog open={editor.open} onOpenChange={o => setEditor(s => ({ ...s, open: o }))}>
          <DialogContent className="border-glow bg-card max-w-md">
            <DialogHeader><DialogTitle>Gerenciar acesso — {editor.user?.nome}</DialogTitle></DialogHeader>
            <div className="space-y-6 py-2">
              <div className="space-y-2">
                <Label>Cargo</Label>
                <Select value={editor.role} onValueChange={v => setEditor(s => ({ ...s, role: v }))}>
                  <SelectTrigger className="bg-muted border-border/50"><SelectValue /></SelectTrigger>
                  <SelectContent>{ROLES.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-3">
                <Label className="text-xs text-muted-foreground uppercase tracking-wider">Permissões Granulares</Label>
                {([
                  { key: 'podeAprovar',      label: 'Aprovar Clientes',    desc: 'Permite tirar clientes da geladeira'  },
                  { key: 'podeExportar',     label: 'Exportar Relatórios', desc: 'Pode baixar dados em Excel/PDF'       },
                  { key: 'podeVerDashboard', label: 'Acessar Dashboard',   desc: 'Visualiza métricas financeiras'       },
                ] as const).map(({ key, label, desc }) => (
                    <div key={key} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/30">
                      <div><p className="text-sm font-medium">{label}</p><p className="text-xs text-muted-foreground">{desc}</p></div>
                      <Switch checked={editor[key]} onCheckedChange={v => setEditor(s => ({ ...s, [key]: v }))} />
                    </div>
                ))}
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setEditor(EDITOR_VAZIO)}>Cancelar</Button>
                <Button className="gradient-primary border-0 text-white" disabled={updateAccess.isPending} onClick={salvarAcesso}>
                  {updateAccess.isPending ? 'Salvando...' : 'Salvar alterações'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
  );
}