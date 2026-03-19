import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getUsersByOrg, createUser } from '@/api/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Plus, Building2, User } from 'lucide-react';
import type { UserRole } from '@/types';

export default function ConfiguracoesPage() {
  const { user, organization } = useAuth();
  const orgId = organization?.id || '';
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ nome: '', email: '', role: 'VENDEDOR' as UserRole });

  const { data: users = [] } = useQuery({ queryKey: ['users', orgId], queryFn: () => getUsersByOrg(orgId), enabled: !!orgId });

  const inviteMut = useMutation({
    mutationFn: (d: { nome: string; email: string; role: UserRole }) => createUser({ ...d, organizationId: orgId }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); setOpen(false); },
  });

  const handleInvite = (e: React.FormEvent) => {
    e.preventDefault();
    inviteMut.mutate(form);
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold">Configurações</h1>
        <p className="text-muted-foreground">Gerencie sua organização e equipe</p>
      </div>

      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg"><Building2 className="h-5 w-5" />Organização</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex justify-between"><span className="text-muted-foreground">Nome:</span><span className="font-medium">{organization?.nome}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Tipo:</span><Badge variant="secondary">{organization?.tipo}</Badge></div>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg"><User className="h-5 w-5" />Meu Perfil</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex justify-between"><span className="text-muted-foreground">Nome:</span><span className="font-medium">{user?.nome}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Email:</span><span>{user?.email}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Role:</span><Badge variant="secondary">{user?.role}</Badge></div>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Equipe</CardTitle>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-2" />Convidar</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Convidar Usuário</DialogTitle></DialogHeader>
              <form onSubmit={handleInvite} className="space-y-4">
                <div className="space-y-2"><Label>Nome</Label><Input value={form.nome} onChange={e => setForm(p => ({ ...p, nome: e.target.value }))} required /></div>
                <div className="space-y-2"><Label>Email</Label><Input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} required /></div>
                <div className="space-y-2">
                  <Label>Role</Label>
                  <Select value={form.role} onValueChange={v => setForm(p => ({ ...p, role: v as UserRole }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ADMIN">Admin</SelectItem>
                      <SelectItem value="VENDEDOR">Vendedor</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button type="submit" className="w-full">Convidar</Button>
              </form>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.length === 0 ? (
                <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-4">Nenhum usuário na equipe</TableCell></TableRow>
              ) : users.map(u => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">{u.nome}</TableCell>
                  <TableCell>{u.email}</TableCell>
                  <TableCell><Badge variant="secondary">{u.role}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
