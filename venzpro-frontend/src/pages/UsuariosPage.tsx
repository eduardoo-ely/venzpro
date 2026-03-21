import { Shield } from 'lucide-react';

// Página de gerenciamento de usuários — visível apenas para ADMIN
export default function UsuariosPage() {
  return (
      <div className="p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
            <Shield className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Gerenciar Usuários</h1>
            <p className="text-sm text-muted-foreground">Administre os usuários da organização</p>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">
          Listagem de usuários em desenvolvimento. Conecte ao endpoint <code>/api/users</code> do backend.
        </div>
      </div>
  );
}