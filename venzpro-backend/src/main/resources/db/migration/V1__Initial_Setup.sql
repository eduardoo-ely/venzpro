-- ── Extensões ─────────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================================================
-- TABELAS BASE
-- =============================================================================

-- ── organizations ─────────────────────────────────────────────────────────────
CREATE TABLE organizations (
                               id         UUID        NOT NULL DEFAULT gen_random_uuid(),
                               nome       VARCHAR(200) NOT NULL,
                               tipo       VARCHAR(20)  NOT NULL CHECK (tipo IN ('REPRESENTANTE','EMPRESA')),
                               created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                               CONSTRAINT pk_organizations PRIMARY KEY (id)
);

-- ── users ─────────────────────────────────────────────────────────────────────
CREATE TABLE users (
                       id                  UUID        NOT NULL DEFAULT gen_random_uuid(),
                       organization_id     UUID        NOT NULL,
                       nome                VARCHAR(200) NOT NULL,
                       email               VARCHAR(255) NOT NULL,
                       senha               VARCHAR(255) NOT NULL,
                       role                VARCHAR(20)  NOT NULL CHECK (role IN ('ADMIN','VENDEDOR','GERENTE')),
                       must_change_password BOOLEAN     NOT NULL DEFAULT FALSE,
                       created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                       CONSTRAINT pk_users PRIMARY KEY (id),
                       CONSTRAINT uq_users_email UNIQUE (email),
                       CONSTRAINT fk_users_org FOREIGN KEY (organization_id) REFERENCES organizations(id)
);

CREATE INDEX idx_users_org ON users(organization_id);

-- ── companies ─────────────────────────────────────────────────────────────────
CREATE TABLE companies (
                           id              UUID        NOT NULL DEFAULT gen_random_uuid(),
                           organization_id UUID        NOT NULL,
                           nome            VARCHAR(200) NOT NULL,
                           created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                           CONSTRAINT pk_companies PRIMARY KEY (id),
                           CONSTRAINT fk_companies_org FOREIGN KEY (organization_id) REFERENCES organizations(id)
);

CREATE INDEX idx_companies_org ON companies(organization_id);

-- ── customers ─────────────────────────────────────────────────────────────────
CREATE TABLE customers (
                           id              UUID        NOT NULL DEFAULT gen_random_uuid(),
                           organization_id UUID        NOT NULL,
                           user_id         UUID        NOT NULL,
                           nome            VARCHAR(200) NOT NULL,
                           telefone        VARCHAR(30),
                           email           VARCHAR(255),
                           cidade          VARCHAR(100),
                           created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                           CONSTRAINT pk_customers PRIMARY KEY (id),
                           CONSTRAINT fk_customers_org  FOREIGN KEY (organization_id) REFERENCES organizations(id),
                           CONSTRAINT fk_customers_user FOREIGN KEY (user_id)         REFERENCES users(id)
);

CREATE INDEX idx_customers_org  ON customers(organization_id);
CREATE INDEX idx_customers_user ON customers(user_id);

-- ── orders ────────────────────────────────────────────────────────────────────
CREATE TABLE orders (
                        id              UUID           NOT NULL DEFAULT gen_random_uuid(),
                        organization_id UUID           NOT NULL,
                        customer_id     UUID           NOT NULL,
                        company_id      UUID           NOT NULL,
                        user_id         UUID           NOT NULL,
                        valor_total     NUMERIC(15,2)  NOT NULL DEFAULT 0,
                        status          VARCHAR(20)    NOT NULL CHECK (status IN ('ORCAMENTO','FECHADO','CANCELADO')),
                        descricao       TEXT,
                        created_at      TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
                        CONSTRAINT pk_orders PRIMARY KEY (id),
                        CONSTRAINT fk_orders_org      FOREIGN KEY (organization_id) REFERENCES organizations(id),
                        CONSTRAINT fk_orders_customer FOREIGN KEY (customer_id)     REFERENCES customers(id),
                        CONSTRAINT fk_orders_company  FOREIGN KEY (company_id)      REFERENCES companies(id),
                        CONSTRAINT fk_orders_user     FOREIGN KEY (user_id)         REFERENCES users(id)
);

CREATE INDEX idx_orders_org    ON orders(organization_id);
CREATE INDEX idx_orders_status ON orders(organization_id, status);

-- ── events ────────────────────────────────────────────────────────────────────
CREATE TABLE events (
                        id              UUID        NOT NULL DEFAULT gen_random_uuid(),
                        organization_id UUID        NOT NULL,
                        user_id         UUID        NOT NULL,
                        customer_id     UUID,
                        company_id      UUID,
                        tipo            VARCHAR(20)  NOT NULL CHECK (tipo IN ('VISITA','REUNIAO','FOLLOW_UP')),
                        titulo          VARCHAR(200) NOT NULL,
                        descricao       TEXT,
                        data_inicio     TIMESTAMPTZ  NOT NULL,
                        data_fim        TIMESTAMPTZ,
                        status          VARCHAR(20)  NOT NULL CHECK (status IN ('AGENDADO','CONCLUIDO','CANCELADO')),
                        created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
                        CONSTRAINT pk_events PRIMARY KEY (id),
                        CONSTRAINT fk_events_org  FOREIGN KEY (organization_id) REFERENCES organizations(id),
                        CONSTRAINT fk_events_user FOREIGN KEY (user_id)         REFERENCES users(id)
);

CREATE INDEX idx_events_org  ON events(organization_id);
CREATE INDEX idx_events_date ON events(organization_id, data_inicio);

-- ── event_participantes ───────────────────────────────────────────────────────
CREATE TABLE event_participantes (
                                     event_id UUID        NOT NULL,
                                     email    VARCHAR(255) NOT NULL,
                                     CONSTRAINT fk_ep_event FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
);

CREATE INDEX idx_ep_event ON event_participantes(event_id);

-- ── catalog_files ─────────────────────────────────────────────────────────────
CREATE TABLE catalog_files (
                               id              UUID        NOT NULL DEFAULT gen_random_uuid(),
                               organization_id UUID        NOT NULL,
                               company_id      UUID        NOT NULL,
                               nome            VARCHAR(200) NOT NULL,
                               url             TEXT        NOT NULL,
                               tipo            VARCHAR(20)  NOT NULL CHECK (tipo IN ('PDF','IMAGEM')),
                               created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
                               CONSTRAINT pk_catalog_files PRIMARY KEY (id),
                               CONSTRAINT fk_cf_org     FOREIGN KEY (organization_id) REFERENCES organizations(id),
                               CONSTRAINT fk_cf_company FOREIGN KEY (company_id)      REFERENCES companies(id)
);

CREATE INDEX idx_cf_org ON catalog_files(organization_id);

-- ── audit_log ─────────────────────────────────────────────────────────────────
CREATE TABLE audit_log (
                           id              UUID        NOT NULL DEFAULT gen_random_uuid(),
                           organization_id UUID,
                           user_id         UUID,
                           action          VARCHAR(50)  NOT NULL,
                           entity_type     VARCHAR(50),
                           entity_id       UUID,
                           details         TEXT,
                           level           VARCHAR(10)  NOT NULL DEFAULT 'INFO',
                           created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
                           CONSTRAINT pk_audit_log PRIMARY KEY (id)
);

CREATE INDEX idx_audit_org_date  ON audit_log(organization_id, created_at);
CREATE INDEX idx_audit_user_date ON audit_log(user_id, created_at);

-- =============================================================================
-- NOVO: MÓDULO DE CATÁLOGO DE PRODUTOS
-- =============================================================================

-- ── products ──────────────────────────────────────────────────────────────────
CREATE TABLE products (
                          id              UUID           NOT NULL DEFAULT gen_random_uuid(),
                          organization_id UUID           NOT NULL,
                          company_id      UUID,
                          nome            VARCHAR(200)   NOT NULL,
                          descricao       TEXT,
                          preco_base      NUMERIC(15,4)  NOT NULL DEFAULT 0 CHECK (preco_base >= 0),
                          unidade         VARCHAR(20)    NOT NULL DEFAULT 'UN'  -- UN, KG, CX, L, etc.
                              CHECK (unidade IN ('UN','KG','CX','L','M','M2','M3','PC','PAR','HR')),
                          ativo           BOOLEAN        NOT NULL DEFAULT TRUE,
                          codigo_sku      VARCHAR(100),
                          created_at      TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
                          updated_at      TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
                          CONSTRAINT pk_products         PRIMARY KEY (id),
                          CONSTRAINT fk_products_org     FOREIGN KEY (organization_id) REFERENCES organizations(id),
                          CONSTRAINT fk_products_company FOREIGN KEY (company_id) REFERENCES companies(id),
                          CONSTRAINT uq_products_sku_org UNIQUE (organization_id, codigo_sku)
                              DEFERRABLE INITIALLY DEFERRED
);

CREATE INDEX idx_products_org    ON products(organization_id);
CREATE INDEX idx_products_org_co ON products(organization_id, company_id);
CREATE INDEX idx_products_ativo  ON products(organization_id, ativo);

CREATE OR REPLACE FUNCTION fn_update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_products_updated_at
    BEFORE UPDATE ON products
    FOR EACH ROW EXECUTE FUNCTION fn_update_updated_at();

-- =============================================================================
-- FUNÇÃO UTILITÁRIA: estatísticas por tenant (preservada do schema original)
-- =============================================================================
CREATE OR REPLACE FUNCTION tenant_stats(org_id UUID)
RETURNS TABLE (
    total_customers BIGINT,
    total_orders    BIGINT,
    orders_open     BIGINT,
    orders_closed   BIGINT,
    revenue_total   NUMERIC,
    revenue_month   NUMERIC,
    total_products  BIGINT
) AS $$
BEGIN
RETURN QUERY
SELECT
    (SELECT COUNT(*) FROM customers WHERE organization_id = org_id),
    (SELECT COUNT(*) FROM orders    WHERE organization_id = org_id),
    (SELECT COUNT(*) FROM orders    WHERE organization_id = org_id AND status = 'ORCAMENTO'),
    (SELECT COUNT(*) FROM orders    WHERE organization_id = org_id AND status = 'FECHADO'),
    (SELECT COALESCE(SUM(valor_total), 0) FROM orders
     WHERE organization_id = org_id AND status = 'FECHADO'),
    (SELECT COALESCE(SUM(valor_total), 0) FROM orders
     WHERE organization_id = org_id
       AND status = 'FECHADO'
       AND created_at >= date_trunc('month', NOW())),
    (SELECT COUNT(*) FROM products WHERE organization_id = org_id AND ativo = TRUE);
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- =============================================================================
-- DADOS INICIAIS (seed) — mesmos do data.sql original, mas agora em SQL puro
-- =============================================================================
INSERT INTO organizations (id, nome, tipo, created_at)
VALUES (
           'a0000000-0000-0000-0000-000000000001',
           'VenzPro Demo',
           'REPRESENTANTE',
           NOW()
       ) ON CONFLICT (id) DO NOTHING;

-- Utilizador admin — senha: admin123 (BCrypt strength=12)
INSERT INTO users (id, organization_id, nome, email, senha, role, must_change_password, created_at)
VALUES (
           'b0000000-0000-0000-0000-000000000001',
           'a0000000-0000-0000-0000-000000000001',
           'Administrador',
           'admin@venzpro.com',
           'admin123',
           'ADMIN',
           FALSE,
           NOW()
       ) ON CONFLICT (id) DO NOTHING;