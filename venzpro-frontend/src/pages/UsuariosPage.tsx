import React, { useState } from "react";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import api from "@/api/api";
import { useUsers } from "@/hooks/useUsers";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { Search, Plus, KeyRound, Mail, User as UserIcon, ShieldAlert, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { User } from "@/types";

export default function UsuariosPage() {
  const qc = useQueryClient();
  const { users, isLoading, updateAccess } = useUsers();

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  // Estados Granulares de Permissão
  const [editingRole, setEditingRole] = useState<string>("");
  const [podeAprovar, setPodeAprovar] = useState(false);
  const [podeExportar, setPodeExportar] = useState(false);
  const [podeVerDashboard, setPodeVerDashboard] = useState(false);

  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("VENDEDOR");

  const inviteMutation = useMutation({
    mutationFn: (data: { email: string; role: string }) => api.post("/invites", data),
    onSuccess: () => {
      toast.success("Convite enviado com sucesso!");
      setIsInviteOpen(false);
      setInviteEmail("");
      qc.invalidateQueries({ queryKey: ["users"] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Erro ao enviar convite.");
    }
  });

  const openUserProfile = (user: User) => {
    setSelectedUser(user);
    setEditingRole(user.role);
    setPodeAprovar(user.podeAprovar || false);
    setPodeExportar(user.podeExportar || false);
    setPodeVerDashboard(user.podeVerDashboard || false);
    setIsSheetOpen(true);
  };

  const handleSaveAccess = () => {
    if (selectedUser) {
      updateAccess.mutate(
          {
            id: selectedUser.id,
            payload: { role: editingRole, podeAprovar, podeExportar, podeVerDashboard }
          },
          { onSuccess: () => setIsSheetOpen(false) }
      );
    }
  };

  const handleSendInvite = () => {
    if (!inviteEmail) return toast.error("O E-mail é obrigatório.");
    inviteMutation.mutate({ email: inviteEmail, role: inviteRole });
  };

  const filteredUsers = users?.filter(user =>
      user.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  return (
      <div className="space-y-6">
        <PageHeader
            title="Gestão de Equipe"
            description="Gerencie os membros, níveis de acesso e permissões da sua organização."
            action={
              <Button className="gap-2" onClick={() => setIsInviteOpen(true)}>
                <Plus className="h-4 w-4" /> Convidar Usuário
              </Button>
            }
        />

        <div className="flex items-center gap-4 bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
            <Input
                placeholder="Buscar por nome ou e-mail..."
                className="pl-9"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
          <Table>
            <TableHeader className="bg-gray-50">
              <TableRow>
                <TableHead>Usuário</TableHead>
                <TableHead>Cargo</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-8 text-gray-500">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                      Carregando equipe...
                    </TableCell>
                  </TableRow>
              ) : filteredUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-8 text-gray-500">
                      Nenhum usuário encontrado.
                    </TableCell>
                  </TableRow>
              ) : (
                  filteredUsers.map((user) => (
                      <TableRow key={user.id} className="hover:bg-gray-50">
                        <TableCell className="flex items-center gap-3">
                          <Avatar className="h-9 w-9">
                            <AvatarFallback className="bg-blue-100 text-blue-700 font-semibold">
                              {user.nome.substring(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium text-gray-900">{user.nome}</p>
                            <p className="text-sm text-gray-500">{user.email}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="font-medium bg-white">
                            {user.role}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" onClick={() => openUserProfile(user)}>
                            Gerenciar
                          </Button>
                        </TableCell>
                      </TableRow>
                  ))
              )}
            </TableBody>
          </Table>
        </div>

        <Dialog open={isInviteOpen} onOpenChange={setIsInviteOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Convidar Membro</DialogTitle>
              <DialogDescription>
                Envie um convite para adicionar um novo membro à sua organização.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>E-mail do colaborador</Label>
                <Input
                    placeholder="email@empresa.com"
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Cargo de Acesso</Label>
                <Select value={inviteRole} onValueChange={setInviteRole}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ADMIN">Administrador</SelectItem>
                    <SelectItem value="GERENTE">Gerente de Vendas</SelectItem>
                    <SelectItem value="VENDEDOR">Vendedor</SelectItem>
                    <SelectItem value="SUPORTE">Suporte Técnico</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsInviteOpen(false)}>Cancelar</Button>
              <Button onClick={handleSendInvite} disabled={inviteMutation.isPending}>
                {inviteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Enviar Convite
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
          <SheetContent className="sm:max-w-md overflow-y-auto">
            <SheetHeader className="pb-6 border-b">
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16 border-2 border-white shadow-sm">
                  <AvatarFallback className="bg-blue-600 text-white text-xl">
                    {selectedUser?.nome.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <SheetTitle className="text-xl">{selectedUser?.nome}</SheetTitle>
                  <SheetDescription>{selectedUser?.email}</SheetDescription>
                </div>
              </div>
            </SheetHeader>

            {selectedUser && (
                <div className="py-6 space-y-8">

                  <div className="space-y-4">
                    <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider flex items-center gap-2">
                      <UserIcon className="h-4 w-4" /> Cargo no Sistema
                    </h3>
                    <div className="grid gap-4 bg-gray-50 p-4 rounded-lg border">
                      <div className="grid gap-2">
                        <Label>Perfil de Acesso</Label>
                        <Select value={editingRole} onValueChange={setEditingRole}>
                          <SelectTrigger className="bg-white">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="ADMIN">Administrador</SelectItem>
                            <SelectItem value="GERENTE">Gerente de Vendas</SelectItem>
                            <SelectItem value="VENDEDOR">Vendedor</SelectItem>
                            <SelectItem value="SUPORTE">Suporte Técnico</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider flex items-center gap-2">
                      <ShieldAlert className="h-4 w-4" /> Permissões Granulares
                    </h3>
                    <div className="bg-gray-50 p-4 rounded-lg border space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <Label className="text-base">Aprovar Clientes</Label>
                          <p className="text-sm text-gray-500">Permite tirar clientes da geladeira</p>
                        </div>
                        <Switch checked={podeAprovar} onCheckedChange={setPodeAprovar} />
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <Label className="text-base">Exportar Relatórios</Label>
                          <p className="text-sm text-gray-500">Pode baixar dados em Excel/PDF</p>
                        </div>
                        <Switch checked={podeExportar} onCheckedChange={setPodeExportar} />
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <Label className="text-base">Acessar Dashboard</Label>
                          <p className="text-sm text-gray-500">Visualiza métricas financeiras</p>
                        </div>
                        <Switch checked={podeVerDashboard} onCheckedChange={setPodeVerDashboard} />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider flex items-center gap-2">
                      <KeyRound className="h-4 w-4" /> Segurança
                    </h3>
                    <div className="flex flex-col gap-3">
                      <Button variant="outline" className="justify-start" onClick={() => toast.success("Link enviado para o email do usuário!")}>
                        <Mail className="h-4 w-4 mr-2" />
                        Enviar link de redefinição de senha
                      </Button>
                    </div>
                  </div>

                </div>
            )}

            <SheetFooter className="mt-6 border-t pt-6">
              <Button
                  variant="default"
                  className="w-full"
                  onClick={handleSaveAccess}
                  disabled={updateAccess.isPending}
              >
                {updateAccess.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Salvar Alterações
              </Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>
      </div>
  );
}