import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getUsersByOrg, createUser } from '@/api/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Plus, User as UserIcon, Building2, Users, Plug, Calendar, MessageSquare } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { AvatarInitials } from '@/components/AvatarInitials';
import { motion } from 'framer-motion';
import type { UserRole } from '@/types';

export default function ConfiguracoesPage() {
  const { user, organization } = useAuth();
  const orgId = organization?.id || '';
  const qc = useQueryClient();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteForm, setInviteForm] = useState({ nome: '', email: '', role: 'VENDEDOR' as UserRole });

  const { data: users = [] } = useQuery({ queryKey: ['users', orgId], queryFn: () => getUsersByOrg(orgId), enabled: !!orgId });

  const inviteMut = useMutation({
    mutationFn: () => createUser({ ...inviteForm, organizationId: orgId }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); setInviteOpen(false); },
  });

  const integrations = [
    { name: 'Google Calendar', icon: Calendar, status: 'available' as const, description: 'Sincronize eventos e compromissos' },
    { name: 'WhatsApp Business', icon: MessageSquare, status: 'soon' as const, description: 'Envie mensagens automatizadas' },
  ];

  return (
    <div className="space-y-8">
      <PageHeader title="Configurações" subtitle="Gerencie seu perfil e organização" />

      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
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
              <Badge variant="outline" className="ml-auto mb-1 text-xs gradient-text border-primary/30">{user?.role}</Badge>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="border-glow bg-card h-full">
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <Building2 className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-semibold">Organização</h3>
              </div>
              <div className="space-y-3">
                <div><Label className="text-xs text-muted-foreground">Nome</Label><p className="text-sm font-medium">{organization?.nome}</p></div>
                <div><Label className="text-xs text-muted-foreground">Tipo</Label><Badge variant="outline" className="text-[10px]">{organization?.tipo}</Badge></div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <Card className="border-glow bg-card h-full">
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <UserIcon className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-semibold">Perfil</h3>
              </div>
              <div className="space-y-3">
                <div><Label className="text-xs text-muted-foreground">Nome</Label><p className="text-sm font-medium">{user?.nome}</p></div>
                <div><Label className="text-xs text-muted-foreground">Email</Label><p className="text-sm font-medium">{user?.email}</p></div>
                <div><Label className="text-xs text-muted-foreground">Role</Label><p className="text-sm font-medium">{user?.role}</p></div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <Card className="border-glow bg-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-semibold">Equipe</h3>
                <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{users.length}</span>
              </div>
              <Button size="sm" onClick={() => setInviteOpen(true)} className="gradient-primary border-0 text-white text-xs h-8">
                <Plus className="h-3.5 w-3.5 mr-1" />Convidar
              </Button>
            </div>
            <div className="space-y-2">
              {users.map(u => (
                <div key={u.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/30 transition-colors">
                  <AvatarInitials name={u.nome} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{u.nome}</p>
                    <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                  </div>
                  <Badge variant="outline" className="text-[10px]">{u.role}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
        <Card className="border-glow bg-card">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Plug className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold">Integrações</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {integrations.map(int => (
                <div key={int.name} className="flex items-center gap-3 p-4 rounded-lg border border-border/50 hover:border-primary/30 transition-colors">
                  <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <int.icon className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{int.name}</p>
                    <p className="text-[10px] text-muted-foreground">{int.description}</p>
                  </div>
                  {int.status === 'available' ? (
                    <Button size="sm" variant="outline" className="text-xs h-7 border-primary/30 text-primary">Conectar</Button>
                  ) : (
                    <Badge variant="outline" className="text-[10px] text-muted-foreground">Em breve</Badge>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent className="border-glow bg-card">
          <DialogHeader><DialogTitle>Convidar Membro</DialogTitle></DialogHeader>
          <form onSubmit={e => { e.preventDefault(); inviteMut.mutate(); }} className="space-y-4">
            <div className="space-y-2"><Label>Nome *</Label><Input value={inviteForm.nome} onChange={e => setInviteForm(f => ({ ...f, nome: e.target.value }))} required className="bg-muted border-border/50" /></div>
            <div className="space-y-2"><Label>Email *</Label><Input type="email" value={inviteForm.email} onChange={e => setInviteForm(f => ({ ...f, email: e.target.value }))} required className="bg-muted border-border/50" /></div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={inviteForm.role} onValueChange={v => setInviteForm(f => ({ ...f, role: v as UserRole }))}>
                <SelectTrigger className="bg-muted border-border/50"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="ADMIN">Admin</SelectItem><SelectItem value="VENDEDOR">Vendedor</SelectItem></SelectContent>
              </Select>
            </div>
            <Button type="submit" className="w-full gradient-primary border-0 text-white">Enviar Convite</Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
