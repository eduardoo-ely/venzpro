-- =============================================================================
-- VenzPro — Schema PostgreSQL para Multi-Tenant com RLS
-- =============================================================================
-- Estratégia de multi-tenancy: "Shared Database, Shared Schema"
-- Todas as tabelas têm organization_id + PostgreSQL Row-Level Security (RLS)
-- como segunda camada de proteção além do isolamento na aplicação.
-- =============================================================================

-- Extensão para UUID nativo
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";  -- diagnóstico de queries lentas

-- =============================================================================
-- ENUMS
-- =============================================================================
CREATE TYPE organization_type AS ENUM ('REPRESENTANTE', 'EMPRESA');
CREATE TYPE user_role          AS ENUM ('ADMIN', 'VENDEDOR');
CREATE TYPE order_status       AS ENUM ('ORCAMENTO', 'FECHADO', 'CANCELADO');
CREATE TYPE event_type         AS ENUM ('VISITA', 'REUNIAO', 'FOLLOW_UP');
CREATE TYPE event_status       AS ENUM ('AGENDADO', 'CONCLUIDO', 'CANCELADO');
CREATE TYPE file_type          AS ENUM ('PDF', 'IMAGEM');

-- =============================================================================
-- ORGANIZATIONS
-- Tabela raiz do multi-tenancy. Cada linha é um tenant isolado.
-- =============================================================================
CREATE TABLE organizations (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nome        VARCHAR(200) NOT NULL,
    tipo        organization_type NOT NULL,
    plan        VARCHAR(50) DEFAULT 'FREE',       -- FREE, STARTER, PRO, ENTERPRISE
    is_active   BOOLEAN DEFAULT true,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- USERS
-- =============================================================================
CREATE TABLE users (
    id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id      UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    nome                 VARCHAR(200) NOT NULL,
    email                VARCHAR(320) NOT NULL,
    senha                VARCHAR(255) NOT NULL,        -- BCrypt hash
    role                 user_role NOT NULL DEFAULT 'VENDEDOR',
    must_change_password BOOLEAN DEFAULT false,
    last_login_at        TIMESTAMPTZ,
    is_active            BOOLEAN DEFAULT true,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT users_email_unique UNIQUE (email)
);

-- Índice de busca por email (login)
CREATE INDEX idx_users_email ON users (email);
-- Índice principal de tenant
CREATE INDEX idx_users_org ON users (organization_id);
-- Índice composto para listagem de equipe
CREATE INDEX idx_users_org_role ON users (organization_id, role);

-- =============================================================================
-- COMPANIES
-- =============================================================================
CREATE TABLE companies (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    nome            VARCHAR(200) NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_companies_org ON companies (organization_id);
-- Índice para busca por nome dentro do tenant
CREATE INDEX idx_companies_org_nome ON companies (organization_id, nome text_pattern_ops);

-- =============================================================================
-- CUSTOMERS
-- =============================================================================
CREATE TABLE customers (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id         UUID NOT NULL REFERENCES users(id),
    nome            VARCHAR(200) NOT NULL,
    telefone        VARCHAR(30),
    email           VARCHAR(320),
    cidade          VARCHAR(100),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_customers_org         ON customers (organization_id);
CREATE INDEX idx_customers_org_nome    ON customers (organization_id, nome text_pattern_ops);
CREATE INDEX idx_customers_org_user    ON customers (organization_id, user_id);
-- Para busca full-text futura
CREATE INDEX idx_customers_nome_fts    ON customers USING gin(to_tsvector('portuguese', nome));

-- =============================================================================
-- ORDERS
-- =============================================================================
CREATE TABLE orders (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    customer_id     UUID NOT NULL REFERENCES customers(id),
    company_id      UUID NOT NULL REFERENCES companies(id),
    user_id         UUID NOT NULL REFERENCES users(id),
    valor_total     NUMERIC(15, 2),
    status          order_status NOT NULL DEFAULT 'ORCAMENTO',
    descricao       TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices críticos para o kanban e listagem
CREATE INDEX idx_orders_org              ON orders (organization_id);
CREATE INDEX idx_orders_org_status       ON orders (organization_id, status);
CREATE INDEX idx_orders_org_created      ON orders (organization_id, created_at DESC);
CREATE INDEX idx_orders_org_customer     ON orders (organization_id, customer_id);
-- Para relatório de faturamento mensal
CREATE INDEX idx_orders_org_created_month ON orders (organization_id, date_trunc('month', created_at));

-- =============================================================================
-- EVENTS
-- =============================================================================
CREATE TABLE events (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id         UUID NOT NULL REFERENCES users(id),
    customer_id     UUID REFERENCES customers(id),
    company_id      UUID REFERENCES companies(id),
    tipo            event_type NOT NULL,
    titulo          VARCHAR(200) NOT NULL,
    descricao       TEXT,
    data_inicio     TIMESTAMPTZ NOT NULL,
    data_fim        TIMESTAMPTZ,
    status          event_status NOT NULL DEFAULT 'AGENDADO',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_events_org             ON events (organization_id);
CREATE INDEX idx_events_org_user        ON events (organization_id, user_id);
CREATE INDEX idx_events_org_inicio      ON events (organization_id, data_inicio);
-- Para agenda: próximos eventos agendados
CREATE INDEX idx_events_org_status_date ON events (organization_id, status, data_inicio)
    WHERE status = 'AGENDADO';

-- =============================================================================
-- EVENT_PARTICIPANTES (substitui @ElementCollection — tabela explícita)
-- =============================================================================
CREATE TABLE event_participantes (
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    email    VARCHAR(320) NOT NULL,
    PRIMARY KEY (event_id, email)
);

CREATE INDEX idx_event_participantes_event ON event_participantes (event_id);

-- =============================================================================
-- CATALOG_FILES
-- =============================================================================
CREATE TABLE catalog_files (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    company_id      UUID NOT NULL REFERENCES companies(id),
    nome            VARCHAR(200) NOT NULL,
    url             VARCHAR(2000) NOT NULL,
    tipo            file_type NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_files_org         ON catalog_files (organization_id);
CREATE INDEX idx_files_org_company ON catalog_files (organization_id, company_id);

-- =============================================================================
-- ROW-LEVEL SECURITY (RLS) — Segunda camada de isolamento
--
-- Mesmo que a aplicação tenha um bug e tente buscar sem filtro de tenant,
-- o PostgreSQL bloqueia a query e retorna apenas as linhas do tenant correto.
--
-- Uso: a aplicação define a variável de sessão app.current_org_id no início
-- de cada request via um interceptor JDBC (ver TenantSessionInterceptor.java).
-- =============================================================================

-- Habilitar RLS nas tabelas de negócio
ALTER TABLE companies        ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers        ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders           ENABLE ROW LEVEL SECURITY;
ALTER TABLE events           ENABLE ROW LEVEL SECURITY;
ALTER TABLE catalog_files    ENABLE ROW LEVEL SECURITY;
ALTER TABLE users            ENABLE ROW LEVEL SECURITY;

-- Políticas: cada tabela só retorna/aceita linhas do tenant atual
-- (a variável app.current_org_id é definida pela aplicação por request)

CREATE POLICY tenant_isolation ON companies
    USING (organization_id = current_setting('app.current_org_id', true)::uuid);

CREATE POLICY tenant_isolation ON customers
    USING (organization_id = current_setting('app.current_org_id', true)::uuid);

CREATE POLICY tenant_isolation ON orders
    USING (organization_id = current_setting('app.current_org_id', true)::uuid);

CREATE POLICY tenant_isolation ON events
    USING (organization_id = current_setting('app.current_org_id', true)::uuid);

CREATE POLICY tenant_isolation ON catalog_files
    USING (organization_id = current_setting('app.current_org_id', true)::uuid);

CREATE POLICY tenant_isolation ON users
    USING (organization_id = current_setting('app.current_org_id', true)::uuid);

-- Usuário de aplicação (sem BYPASSRLS)
-- CREATE ROLE venzpro_app WITH LOGIN PASSWORD 'senha_forte';
-- GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO venzpro_app;

-- =============================================================================
-- TABELA DE AUDITORIA
-- Registra todas as operações de escrita com tenant e usuário
-- =============================================================================
CREATE TABLE audit_log (
    id              BIGSERIAL PRIMARY KEY,
    organization_id UUID,
    user_id         UUID,
    table_name      VARCHAR(100) NOT NULL,
    operation       VARCHAR(10) NOT NULL,   -- INSERT, UPDATE, DELETE
    record_id       UUID,
    old_data        JSONB,
    new_data        JSONB,
    ip_address      INET,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
) PARTITION BY RANGE (created_at);          -- particionar por mês para performance

-- Cria partição do mês atual automaticamente (rodar via cron mensal)
-- CREATE TABLE audit_log_2026_03 PARTITION OF audit_log
--     FOR VALUES FROM ('2026-03-01') TO ('2026-04-01');

CREATE INDEX idx_audit_org_date  ON audit_log (organization_id, created_at DESC);
CREATE INDEX idx_audit_table     ON audit_log (table_name, record_id);

-- =============================================================================
-- TRIGGER DE AUDITORIA AUTOMÁTICA
-- =============================================================================
CREATE OR REPLACE FUNCTION audit_trigger_fn() RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO audit_log (organization_id, table_name, operation, record_id, old_data, new_data)
    VALUES (
        COALESCE(NEW.organization_id, OLD.organization_id),
        TG_TABLE_NAME,
        TG_OP,
        COALESCE(NEW.id, OLD.id),
        CASE WHEN TG_OP != 'INSERT' THEN row_to_json(OLD)::jsonb END,
        CASE WHEN TG_OP != 'DELETE' THEN row_to_json(NEW)::jsonb END
    );
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Aplica o trigger nas tabelas críticas
CREATE TRIGGER audit_customers  AFTER INSERT OR UPDATE OR DELETE ON customers
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_fn();

CREATE TRIGGER audit_orders     AFTER INSERT OR UPDATE OR DELETE ON orders
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_fn();

-- =============================================================================
-- FUNÇÃO DE ESTATÍSTICAS POR TENANT (para dashboard)
-- =============================================================================
CREATE OR REPLACE FUNCTION tenant_stats(org_id UUID)
RETURNS TABLE (
    total_customers  BIGINT,
    total_orders     BIGINT,
    orders_open      BIGINT,
    orders_closed    BIGINT,
    revenue_total    NUMERIC,
    revenue_month    NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        (SELECT COUNT(*) FROM customers  WHERE organization_id = org_id),
        (SELECT COUNT(*) FROM orders     WHERE organization_id = org_id),
        (SELECT COUNT(*) FROM orders     WHERE organization_id = org_id AND status = 'ORCAMENTO'),
        (SELECT COUNT(*) FROM orders     WHERE organization_id = org_id AND status = 'FECHADO'),
        (SELECT COALESCE(SUM(valor_total), 0) FROM orders WHERE organization_id = org_id AND status = 'FECHADO'),
        (SELECT COALESCE(SUM(valor_total), 0) FROM orders WHERE organization_id = org_id
            AND status = 'FECHADO' AND created_at >= date_trunc('month', NOW()));
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- =============================================================================
-- ÍNDICES DE SUPORTE A ESCALA
-- =============================================================================

-- Partial index: orçamentos abertos são a query mais frequente do kanban
CREATE INDEX idx_orders_open ON orders (organization_id, created_at DESC)
    WHERE status = 'ORCAMENTO';

-- Cobertura para listagem de clientes (evita table scan)
CREATE INDEX idx_customers_covering ON customers (organization_id, id, nome, email, cidade, telefone, user_id, created_at);
