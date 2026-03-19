import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Zap } from 'lucide-react';
import { motion } from 'framer-motion';
import type { OrganizationType } from '@/types';

export default function RegisterPage() {
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [tipo, setTipo] = useState<OrganizationType>('REPRESENTANTE');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await register(nome, email, senha, tipo);
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,hsl(239_84%_67%/0.08),transparent_50%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,hsl(258_90%_66%/0.06),transparent_50%)]" />

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="relative z-10">
        <Card className="w-full max-w-md border-glow bg-card/80 glass">
          <CardHeader className="text-center space-y-4">
            <div className="flex justify-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl gradient-primary shadow-lg shadow-primary/25">
                <Zap className="h-7 w-7 text-white" />
              </div>
            </div>
            <div>
              <CardTitle className="text-2xl font-bold letter-tight">Criar Conta</CardTitle>
              <CardDescription>Preencha seus dados para começar</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="nome">Nome</Label>
                <Input id="nome" value={nome} onChange={e => setNome(e.target.value)} placeholder="Seu nome completo" required className="bg-muted border-border/50" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="seu@email.com" required className="bg-muted border-border/50" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="senha">Senha</Label>
                <Input id="senha" type="password" value={senha} onChange={e => setSenha(e.target.value)} placeholder="••••••••" required className="bg-muted border-border/50" />
              </div>
              <div className="space-y-2">
                <Label>Tipo de Organização</Label>
                <Select value={tipo} onValueChange={(v) => setTipo(v as OrganizationType)}>
                  <SelectTrigger className="bg-muted border-border/50"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="REPRESENTANTE">Representante Comercial</SelectItem>
                    <SelectItem value="EMPRESA">Empresa</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" className="w-full gradient-primary border-0 text-white shadow-lg shadow-primary/25" disabled={loading}>
                {loading ? 'Criando...' : 'Criar Conta'}
              </Button>
            </form>
            <p className="mt-4 text-center text-sm text-muted-foreground">
              Já tem conta? <Link to="/login" className="text-primary font-medium hover:underline">Entrar</Link>
            </p>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
