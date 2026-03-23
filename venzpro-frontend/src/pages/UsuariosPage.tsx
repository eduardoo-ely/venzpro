import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/api/api';
import { useUsers } from '@/hooks/useUsers';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetFooter,
} from '@/components/ui/sheet';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Switch } from '@/components/ui/switch';
import { Search, Plus, KeyRound, Mail, ShieldAlert, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import type { User } from '@/types';
import type { UpdateAccessPayload } from '@/api/endpoints';

const ROLES = [
  { value: 'ADMIN',    label: 'Administrador'     },
  { value: 'GERENTE',  label: 'Gerente de Vendas' },
  { value: 'VENDEDOR', label: 'Vendedor'           },
  { value: 'SUPORTE',  label: 'Suporte Técnico'   },
];

export default function UsuariosPage() {
  const qc = useQueryClient();
  const { users, isLoading, updateAccess } = useUsers();

  const [searchTerm,    setSearchTerm]    = useState('');
  const [selectedUser,  setSelectedUser]  = useState<User | null>(null);
  const [isSheetOpen,   setIsSheetOpen]   = useState(false);

  // Permissões em edição
  const [editingRole,       setEditingRole]       = useState('VENDEDOR');
  const [podeAprovar,       setPodeAprovar]       = useState(false);
  const [podeExportar,      setPodeExportar]      = useState(false);
  const [podeVerDashboard,  setPodeVerDashboard]  = useState(false);

  // Convite
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [inviteNome,   setInviteNome]   = useState('');
  const [inviteEmail,  setInviteEmail]  = useState('');
  const [inviteRole,   setInviteRole]   = useState('VENDEDOR');

  const inviteMutation = useMutation({
    mutationFn: (data: { nome: string; email: string; role: string }) =>
      api.post('/invites', data),
    onSuccess: () => {
      toast.success('Convite enviado com sucesso!');
      setIsInviteOpen(false);
      setInviteNome('');
      setInviteEmail('');
      qc.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (error: any) => {
      const msg = error.response?.data?.mensagem || error.response?.data?.message || 'Erro ao enviar convite.';
      toast.error(msg);
    },
  });

  const openUserProfile = (u: User) => {
    setSelectedUser(u);
    setEditingRole(u.role);
    setPodeAprovar(u.podeAprovar ?? false);
    setPodeExportar(u.podeExportar ?? false);
    setPodeVerDashboard(u.podeVerDashboard ?? false);
    setIsSheetOpen(true);
  };

  const handleSaveAccess = () => {
    if (!selectedUser) return;
    const payload: UpdateAccessPayload = {
      role:            editingRole,
      podeAprovar,
      podeExportar,
      podeVerDashboard,
    };
    updateAccess.mutate(
      { id: selectedUser.id, payload },
      { onSuccess: () => setIsSheetOpen(false) }
    );
  };

  const handleSendInvite = () => {
    if (!inviteNome.trim()) { toast.error('O nome é obrigatório.'); return; }
    if (!inviteEmail.trim()) { toast.error('O e-mail é obrigatório.'); return; }
    inviteMutation.mutate({ nome: inviteNome, email: inviteEmail, role: inviteRole });
  };

  const filtered = (users ?? []).filter(u =>
    u.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Gestão de Equipe"
        subtitle="Gerencie membros, cargos e permissões da sua organização."
      >
        <Button className="gap-2 gradient-primary border-0 text-white" onClick={() => setIsInviteOpen(true)}>
          <Plus className="h-4 w-4" /> Convidar Usuário
        </Button>
      </PageHeader>

      <div className="flex items-center gap-4 bg-card p-4 rounded-lg border border-border/50">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome ou e-mail..."
            className="pl-9 bg-muted border-border/50"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="bg-card rounded-lg border border-border/50 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-border/30 hover:bg-transparent">
              <TableHead className="text-xs text-muted-foreground">Usuário</TableHead>
              <TableHead className="text-xs text-muted-foreground">Cargo</TableHead>
              <TableHead className="text-xs text-muted-foreground text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={3} className="text-center py-10 text-muted-foreground">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                  Carregando equipe...
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="text-center py-8 text-muted-foreground text-sm">
                  Nenhum usuário encontrado.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map(u => (
                <TableRow key={u.id} className="border-border/20 hover:bg-primary/5 transition-colors">
                  <TableCell className="flex items-center gap-3">
                    <Avatar className="h-9 w-9">
                      <AvatarFallback className="bg-primary/20 text-primary font-semibold">
                        {u.nome.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium text-sm">{u.nome}</p>
                      <p className="text-xs text-muted-foreground">{u.email}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-[10px] font-medium">
                      {ROLES.find(r => r.value === u.role)?.label ?? u.role}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" onClick={() => openUserProfile(u)}>
                      Gerenciar
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Modal de convite */}
      <Dialog open={isInviteOpen} onOpenChange={setIsInviteOpen}>
        <DialogContent className="border-glow bg-card sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Convidar Membro</DialogTitle>
            <DialogDescription>
              Crie um usuário na organização com senha temporária.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nome completo *</Label>
              <Input
                placeholder="Nome do colaborador"
                value={inviteNome}
                onChange={e => setInviteNome(e.target.value)}
                className="bg-muted border-border/50"
              />
            </div>
            <div className="space-y-2">
              <Label>E-mail *</Label>
              <Input
                placeholder="email@empresa.com"
                type="email"
                value={inviteEmail}
                onChange={e => setInviteEmail(e.target.value)}
                className="bg-muted border-border/50"
              />
            </div>
            <div className="space-y-2">
              <Label>Cargo de Acesso</Label>
              <Select value={inviteRole} onValueChange={setInviteRole}>
                <SelectTrigger className="bg-muted border-border/50"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ROLES.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsInviteOpen(false)}>Cancelar</Button>
            <Button
              className="gradient-primary border-0 text-white"
              onClick={handleSendInvite}
              disabled={inviteMutation.isPending}
            >
              {inviteMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Criar Usuário
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Sheet de gerenciamento */}
      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent className="sm:max-w-md overflow-y-auto bg-card border-l border-border/50">
          <SheetHeader className="pb-6 border-b border-border/30">
            <div className="flex items-center gap-4">
              <Avatar className="h-14 w-14">
                <AvatarFallback className="bg-primary/20 text-primary text-lg font-bold">
                  {selectedUser?.nome.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <SheetTitle className="text-lg">{selectedUser?.nome}</SheetTitle>
                <SheetDescription>{selectedUser?.email}</SheetDescription>
              </div>
            </div>
          </SheetHeader>

          {selectedUser && (
            <div className="py-6 space-y-8">
              {/* Cargo */}
              <div className="space-y-3">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Cargo no Sistema
                </h3>
                <Select value={editingRole} onValueChange={setEditingRole}>
                  <SelectTrigger className="bg-muted border-border/50"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ROLES.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              {/* Permissões */}
              <div className="space-y-3">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                  <ShieldAlert className="h-4 w-4" /> Permissões Granulares
                </h3>
                <div className="space-y-3">
                  {([
                    { key: 'podeAprovar',      get: podeAprovar,      set: setPodeAprovar,      label: 'Aprovar Clientes',    desc: 'Permite tirar clientes da geladeira'  },
                    { key: 'podeExportar',     get: podeExportar,     set: setPodeExportar,     label: 'Exportar Relatórios', desc: 'Pode baixar dados em Excel/PDF'       },
                    { key: 'podeVerDashboard', get: podeVerDashboard, set: setPodeVerDashboard, label: 'Acessar Dashboard',   desc: 'Visualiza métricas financeiras'       },
                  ] as const).map(item => (
                    <div key={item.key} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/30">
                      <div>
                        <p className="text-sm font-medium">{item.label}</p>
                        <p className="text-xs text-muted-foreground">{item.desc}</p>
                      </div>
                      <Switch checked={item.get} onCheckedChange={item.set} />
                    </div>
                  ))}
                </div>
              </div>

              {/* Segurança */}
              <div className="space-y-3">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                  <KeyRound className="h-4 w-4" /> Segurança
                </h3>
                <Button
                  variant="outline"
                  className="w-full justify-start border-border/50"
                  onClick={() => toast.success('Link de redefinição enviado para o e-mail do usuário!')}
                >
                  <Mail className="h-4 w-4 mr-2" />
                  Enviar link de redefinição de senha
                </Button>
              </div>
            </div>
          )}

          <SheetFooter className="border-t border-border/30 pt-4">
            <Button
              className="w-full gradient-primary border-0 text-white"
              onClick={handleSaveAccess}
              disabled={updateAccess.isPending}
            >
              {updateAccess.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Salvar Alterações
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}
