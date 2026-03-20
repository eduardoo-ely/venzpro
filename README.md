# VenzPro — Guia de Instalação

Sistema de gestão comercial para representantes e equipes de vendas.

---

## ✅ Pré-requisitos

Você só precisa ter instalado:

- **[Docker Desktop](https://www.docker.com/products/docker-desktop/)** (Windows, Mac ou Linux)

Nada mais. Sem Java, sem PostgreSQL, sem configuração.

---

## 🚀 Como rodar

**1. Baixe ou clone este repositório**

```bash
git clone <url-do-repositório>
cd venzpro-main
```

**2. Suba o sistema com um único comando**

```bash
docker-compose up -d --build
```

Aguarde cerca de **2 a 3 minutos** na primeira vez (precisa baixar as imagens e compilar o backend). Nas próximas vezes será bem mais rápido.

**3. Acesse o sistema**

Abra no navegador: **http://localhost:8080**

---

## 🔑 Credenciais padrão

| Campo | Valor |
|-------|-------|
| Email | `admin@venzpro.com` |
| Senha | `admin123` |

> ⚠️ **Troque a senha após o primeiro acesso!**

---

## 📱 Criar sua própria conta

Se preferir criar uma conta nova em vez de usar a padrão:

**Via API:**
```bash
curl -X POST http://localhost:8080/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "nome": "Seu Nome",
    "email": "seu@email.com",
    "senha": "suasenha123",
    "nomeOrganizacao": "Nome da Sua Empresa",
    "tipoOrganizacao": "REPRESENTANTE"
  }'
```

Isso cria uma organização e um usuário ADMIN automaticamente e retorna o token JWT.

---

## 🛑 Como parar o sistema

```bash
# Para os containers (dados são mantidos)
docker-compose stop

# Para e remove os containers (dados são mantidos no volume)
docker-compose down

# Para, remove containers E apaga os dados do banco
docker-compose down -v
```

---

## 🔁 Como reiniciar após uma parada

```bash
docker-compose up -d
```

Não precisa do `--build` nas próximas vezes, a menos que o código tenha mudado.

---

## 🩺 Verificar se está funcionando

```bash
# Ver status dos containers
docker-compose ps

# Ver logs do backend
docker-compose logs backend

# Ver logs do banco
docker-compose logs postgres

# Testar que o backend está respondendo
curl http://localhost:8080/actuator/health
# Deve retornar: {"status":"UP"}
```

---

## 📋 Endpoints principais da API

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| POST | `/api/auth/register` | Criar conta + organização |
| POST | `/api/auth/login` | Fazer login, recebe JWT |
| GET | `/api/customers` | Listar clientes |
| POST | `/api/customers` | Criar cliente |
| GET | `/api/orders` | Listar pedidos |
| POST | `/api/orders` | Criar pedido |
| GET | `/api/events` | Listar eventos |
| GET | `/api/companies` | Listar empresas |

Todos os endpoints (exceto `/api/auth/**`) exigem o header:
```
Authorization: Bearer <token_recebido_no_login>
```

---

## ❓ Problemas comuns

**Porta 8080 ou 5432 já está em uso**
```bash
# Ver quem está usando a porta
lsof -i :8080   # Mac/Linux
netstat -ano | findstr :8080   # Windows
```

**Backend demora para iniciar**
Normal na primeira vez. Aguarde até ver no log:
```
Started VenzproApplication in X.XXX seconds
```

**Banco de dados corrompido / quero começar do zero**
```bash
docker-compose down -v   # remove tudo incluindo dados
docker-compose up -d --build
```

---

## 📞 Suporte

Em caso de dúvidas, envie o output do seguinte comando:
```bash
docker-compose logs > logs.txt
```
E compartilhe o arquivo `logs.txt`.
