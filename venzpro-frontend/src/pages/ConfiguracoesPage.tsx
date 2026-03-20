import { useAuth } from '@/contexts/AuthContext';
import { useUsers } from '@/hooks/useUsers';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { User as UserIcon, Building2, Users, Plug, Calendar, MessageSquare, Trash2 } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { AvatarInitials } from '@/components/AvatarInitials';
import { motion } from 'framer-motion';
import type { UserRole } from '@/types';

export default function ConfiguracoesPage() {
  const { user, organization } = useAuth();
  const { users, isLoading, updateRole, remove } = useUsers();

  const integrations = [
    { name: 'Google Calendar', icon: Calendar, status: 'available' as const, description: 'Sincronize eventos e compromissos' },
    { name: 'WhatsApp Business', icon: MessageSquare, status: 'soon' as const, description: 'Envie mensagens automatizadas' },
  ];

  return (
    <div className="space-y-8">
      <PageHeader title="Configurações" subtitle="Gerencie seu perfil e organização" />

      {/* Perfil */}
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
              <div className="flex items-center gap-2 mb-4"><Building2 className="h-4 w-4 text-primary" /><h3 className="text-sm font-semibold">Organização</h3></div>
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
              <div className="flex items-center gap-2 mb-4"><UserIcon className="h-4 w-4 text-primary" /><h3 className="text-sm font-semibold">Perfil</h3></div>
              <div className="space-y-3">
                <div><Label className="text-xs text-muted-foreground">Nome</Label><p className="text-sm font-medium">{user?.nome}</p></div>
                <div><Label className="text-xs text-muted-foreground">Email</Label><p className="text-sm font-medium">{user?.email}</p></div>
                <div><Label className="text-xs text-muted-foreground">Função</Label><p className="text-sm font-medium">{user?.role}</p></div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Equipe */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <Card className="border-glow bg-card">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Users className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold">Equipe</h3>
              <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{users.length}</span>
            </div>

            {isLoading && (
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3 p-3">
                    <Skeleton className="h-8 w-8 rounded-full" />
                    <div className="flex-1 space-y-1"><Skeleton className="h-3 w-1/3" /><Skeleton className="h-3 w-1/4" /></div>
                    <Skeleton className="h-6 w-20" />
                  </div>
                ))}
              </div>
            )}

            {!isLoading && (
              <div className="space-y-2">
                {users.map(u => (
                  <div key={u.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/30 transition-colors group">
                    <AvatarInitials name={u.nome} size="sm" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{u.nome}</p>
                      <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                    </div>
                    {/* ADMIN pode alterar roles de outros usuários */}
                    {user?.role === 'ADMIN' && u.id !== user.id ? (
                      <div className="flex items-center gap-2">
                        <Select value={u.role} onValueChange={(role) => updateRole.mutate({ id: u.id, role })}>
                          <SelectTrigger className="h-7 w-28 text-[10px] bg-muted border-border/50"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="ADMIN">Admin</SelectItem>
                            <SelectItem value="VENDEDOR">Vendedor</SelectItem>
                          </SelectContent>
                        </Select>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive opacity-0 group-hover:opacity-100 transition-opacity">
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent className="border-glow bg-card">
                            <AlertDialogHeader><AlertDialogTitle>Remover {u.nome}?</AlertDialogTitle><AlertDialogDescription>O usuário perderá acesso ao sistema.</AlertDialogDescription></AlertDialogHeader>
                            <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => remove.mutate(u.id)} className="bg-destructive text-white">Remover</AlertDialogAction></AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    ) : (
                      <Badge variant="outline" className="text-[10px]">{u.role as UserRole}</Badge>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Integrações */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
        <Card className="border-glow bg-card">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-4"><Plug className="h-4 w-4 text-primary" /><h3 className="text-sm font-semibold">Integrações</h3></div>
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
                  {int.status === 'available'
                    ? <Button size="sm" variant="outline" className="text-xs h-7 border-primary/30 text-primary">Conectar</Button>
                    : <Badge variant="outline" className="text-[10px] text-muted-foreground">Em breve</Badge>}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
