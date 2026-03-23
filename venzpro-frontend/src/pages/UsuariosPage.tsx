import { useUsers } from '@/hooks/useUsers';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Shield, Trash2, UserCheck } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { AvatarInitials } from '@/components/AvatarInitials';
import { EmptyState } from '@/components/EmptyState';
import { motion } from 'framer-motion';
import type { UserRole } from '@/types';

const ROLES: { value: UserRole; label: string }[] = [
  { value: 'ADMIN',    label: 'Administrador' },
  { value: 'GERENTE',  label: 'Gerente' },
  { value: 'VENDEDOR', label: 'Vendedor' },
  { value: 'SUPORTE',  label: 'Suporte' },
];

const roleColors: Record<UserRole, string> = {
  ADMIN:    'text-primary border-primary/30 bg-primary/10',
  GERENTE:  'text-cyan-400 border-cyan-400/30 bg-cyan-400/10',
  VENDEDOR: 'text-emerald-400 border-emerald-400/30 bg-emerald-400/10',
  SUPORTE:  'text-amber-400 border-amber-400/30 bg-amber-400/10',
};

export default function UsuariosPage() {
  const { user: me } = useAuth();
  const { users, isLoading, updateRole, remove } = useUsers();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Usuários"
        subtitle="Gerencie os membros da sua organização"
      />

      {isLoading && (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="border-glow bg-card">
              <CardContent className="p-4 flex items-center gap-4">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-1/3" />
                  <Skeleton className="h-3 w-1/4" />
                </div>
                <Skeleton className="h-8 w-28 rounded-md" />
                <Skeleton className="h-8 w-8 rounded-md" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {!isLoading && users.length === 0 && (
        <EmptyState
          icon={UserCheck}
          title="Nenhum usuário encontrado"
          description="Convide membros para sua organização."
        />
      )}

      {!isLoading && users.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-3"
        >
          {users.map((u) => {
            const isMe = u.id === me?.id;
            return (
              <Card key={u.id} className="border-glow bg-card group">
                <CardContent className="p-4 flex items-center gap-4">
                  <AvatarInitials name={u.nome} size="md" />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium truncate">{u.nome}</p>
                      {isMe && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/20 text-primary font-bold">
                          Você
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                    {u.createdAt && (
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        Desde {new Date(u.createdAt).toLocaleDateString('pt-BR')}
                      </p>
                    )}
                  </div>

                  {/* Role badge ou select */}
                  {me?.role === 'ADMIN' && !isMe ? (
                    <Select
                      value={u.role}
                      onValueChange={(role) => updateRole.mutate({ id: u.id, role })}
                      disabled={updateRole.isPending}
                    >
                      <SelectTrigger className="h-8 w-36 text-xs bg-muted border-border/50">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ROLES.map((r) => (
                          <SelectItem key={r.value} value={r.value} className="text-xs">
                            {r.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Badge
                      variant="outline"
                      className={`text-[10px] font-semibold ${roleColors[u.role as UserRole]}`}
                    >
                      {ROLES.find((r) => r.value === u.role)?.label ?? u.role}
                    </Badge>
                  )}

                  {/* Remover — só ADMIN, não pode remover a si mesmo */}
                  {me?.role === 'ADMIN' && !isMe && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="border-glow bg-card">
                        <AlertDialogHeader>
                          <AlertDialogTitle>Remover {u.nome}?</AlertDialogTitle>
                          <AlertDialogDescription>
                            O usuário perderá acesso ao sistema. Esta ação não pode ser desfeita.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => remove.mutate(u.id)}
                            className="bg-destructive text-white"
                          >
                            Remover
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </motion.div>
      )}

      {/* Info para não-ADMINs */}
      {!isLoading && me?.role !== 'ADMIN' && (
        <Card className="border-glow bg-card border-primary/20">
          <CardContent className="p-4 flex items-center gap-3 text-sm text-muted-foreground">
            <Shield className="h-4 w-4 text-primary shrink-0" />
            Apenas administradores podem alterar roles ou remover usuários.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
