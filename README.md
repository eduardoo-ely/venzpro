# VenzPro — Guia de Instalação

Sistema de gestão comercial para representantes e equipes de vendas.

---

## ✅ Pré-requisito único

Você só precisa ter instalado:

- **[Docker Desktop](https://www.docker.com/products/docker-desktop/)** (Windows, Mac ou Linux)

Nada mais. Sem Node.js, sem Java, sem PostgreSQL.

---

## 🚀 Como rodar (3 passos)

**1. Baixe ou clone este repositório**

```bash
git clone <url-do-repositório>
cd venzpro-main
```

**2. Suba tudo com um único comando**

```bash
docker-compose up -d --build
```

⏳ Na **primeira vez** aguarde **3 a 5 minutos** — o Docker precisa:
- Baixar as imagens base
- Compilar o backend Java
- Compilar o frontend React
- Inicializar o banco de dados

Nas próximas vezes será muito mais rápido.

**3. Acesse o sistema**

Abra no navegador: **http://localhost:8080**

---

## 🔑 Credenciais padrão

| Campo | Valor          |
|-------|----------------|
| Email | `admin@venzpro.com` |
| Senha | `admin123`     |

> ⚠️ **Troque a senha após o primeiro acesso!**

---

## 📱 Criar sua própria conta

Clique em **"Cadastre-se"** na tela de login, ou via API:

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
# Ver status dos 3 containers
docker-compose ps

# Ver logs do frontend
docker-compose logs frontend

# Ver logs do backend
docker-compose logs backend

# Ver logs do banco
docker-compose logs postgres

# Testar que o backend está respondendo
curl http://localhost:8080/actuator/health
# Deve retornar: {"status":"UP"}
```

---

## ❓ Problemas comuns

**Porta 8080 já está em uso**
```bash
# Ver quem está usando a porta
lsof -i :8080        # Mac/Linux
netstat -ano | findstr :8080   # Windows
```
Encerre o processo que usa a porta ou altere no `docker-compose.yml`:
```yaml
ports:
  - "3000:80"  # agora acesse em http://localhost:3000
```

**Backend demora para iniciar / frontend mostra erro de API**

Normal na primeira vez. O frontend aguarda o backend estar saudável antes de subir.
Se demorar muito, verifique:
```bash
docker-compose logs backend
```
Aguarde até ver: `Started VenzproApplication in X.XXX seconds`

**Banco de dados corrompido / quero começar do zero**
```bash
docker-compose down -v   # remove tudo incluindo dados
docker-compose up -d --build
```

**Frontend não abre**
```bash
docker-compose logs frontend
# Verifique se o nginx subiu corretamente
```

---

## 📞 Suporte

Em caso de dúvidas, envie o output do seguinte comando:
```bash
docker-compose logs > logs.txt
```
E compartilhe o arquivo `logs.txt`.