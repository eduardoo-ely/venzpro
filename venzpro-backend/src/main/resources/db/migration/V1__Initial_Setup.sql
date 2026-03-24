-- =============================================================================
-- V1__Initial_Setup.sql
-- VenzPro — Schema consolidado, definitivo e auto-suficiente.
-- =============================================================================

-- ── Extensões ─────────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================================================
-- TABELAS BASE
-- =============================================================================

-- ── organizations ─────────────────────────────────────────────────────────────
CREATE TABLE organizations (
                               id         UUID         NOT NULL DEFAULT gen_random_uuid(),
                               nome       VARCHAR(200) NOT NULL,
                               tipo       VARCHAR(20)  NOT NULL CHECK (tipo IN ('REPRESENTANTE','EMPRESA')),
                               created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
                               updated_at TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
                               deleted_at TIMESTAMPTZ,
                               CONSTRAINT pk_organizations PRIMARY KEY (id)
);

-- ── users ─────────────────────────────────────────────────────────────────────
CREATE TABLE users (
                       id                   UUID         NOT NULL DEFAULT gen_random_uuid(),
                       organization_id      UUID         NOT NULL,
                       nome                 VARCHAR(200) NOT NULL,
                       email                VARCHAR(255) NOT NULL,
                       senha                VARCHAR(255) NOT NULL,
                       role                 VARCHAR(20)  NOT NULL CHECK (role IN ('ADMIN','VENDEDOR','GERENTE','SUPORTE')),
    -- Permissões granulares (sobrescrevem o role para ações específicas)
                       pode_aprovar         BOOLEAN      NOT NULL DEFAULT FALSE,
                       pode_exportar        BOOLEAN      NOT NULL DEFAULT FALSE,
                       pode_ver_dashboard   BOOLEAN      NOT NULL DEFAULT FALSE,
    -- Controle de primeiro acesso
                       must_change_password BOOLEAN      NOT NULL DEFAULT FALSE,
    -- Onboarding obrigatório (Regra 5)
                       onboarding_completed BOOLEAN      NOT NULL DEFAULT FALSE,
    -- Auditoria e soft-delete
                       created_at           TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
                       updated_at           TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
                       deleted_at           TIMESTAMPTZ,
                       CONSTRAINT pk_users         PRIMARY KEY (id),
                       CONSTRAINT uq_users_email   UNIQUE (email),
                       CONSTRAINT fk_users_org     FOREIGN KEY (organization_id) REFERENCES organizations(id)
);

CREATE INDEX idx_users_org        ON users(organization_id);
CREATE INDEX idx_users_email      ON users(email);
CREATE INDEX idx_users_active     ON users(organization_id) WHERE deleted_at IS NULL;

-- ── companies ─────────────────────────────────────────────────────────────────
CREATE TABLE companies (
                           id              UUID         NOT NULL DEFAULT gen_random_uuid(),
                           organization_id UUID         NOT NULL,
                           nome            VARCHAR(200) NOT NULL,
                           created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
                           updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
                           deleted_at      TIMESTAMPTZ,
                           CONSTRAINT pk_companies   PRIMARY KEY (id),
                           CONSTRAINT fk_companies_org FOREIGN KEY (organization_id) REFERENCES organizations(id)
);

CREATE INDEX idx_companies_org    ON companies(organization_id);
CREATE INDEX idx_companies_active ON companies(organization_id) WHERE deleted_at IS NULL;

-- ── customers ─────────────────────────────────────────────────────────────────
CREATE TABLE customers (
                           id              UUID         NOT NULL DEFAULT gen_random_uuid(),
                           organization_id UUID         NOT NULL,
                           owner_id        UUID,                  -- Responsável pela carteira (nullable)
                           created_by      UUID,                  -- Quem cadastrou o cliente
                           nome            VARCHAR(200) NOT NULL,
                           telefone        VARCHAR(30),
                           email           VARCHAR(255),
                           cidade          VARCHAR(100),
                           cpf_cnpj        VARCHAR(20),
                           status          VARCHAR(20)  NOT NULL DEFAULT 'PENDENTE'
                               CHECK (status IN ('PENDENTE','APROVADO','REJEITADO')),
                           created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
                           updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
                           deleted_at      TIMESTAMPTZ,
                           CONSTRAINT pk_customers            PRIMARY KEY (id),
                           CONSTRAINT fk_customers_org        FOREIGN KEY (organization_id) REFERENCES organizations(id),
                           CONSTRAINT fk_customers_owner      FOREIGN KEY (owner_id)        REFERENCES users(id),
                           CONSTRAINT fk_customers_creator    FOREIGN KEY (created_by)      REFERENCES users(id),
    -- CPF/CNPJ único por organização (apenas registros ativos)
                           CONSTRAINT uq_customers_doc_org    UNIQUE (organization_id, cpf_cnpj)
);

CREATE INDEX idx_customers_org       ON customers(organization_id);
CREATE INDEX idx_customers_owner     ON customers(organization_id, owner_id);
CREATE INDEX idx_customers_no_owner  ON customers(organization_id) WHERE owner_id IS NULL AND deleted_at IS NULL;
CREATE INDEX idx_customers_status    ON customers(organization_id, status) WHERE deleted_at IS NULL;

-- ── products ──────────────────────────────────────────────────────────────────
CREATE TABLE products (
                          id              UUID           NOT NULL DEFAULT gen_random_uuid(),
                          organization_id UUID           NOT NULL,
                          company_id      UUID,
                          nome            VARCHAR(200)   NOT NULL,
                          descricao       TEXT,
                          preco_base      NUMERIC(15,4)  NOT NULL DEFAULT 0 CHECK (preco_base >= 0),
                          unidade         VARCHAR(20)    NOT NULL DEFAULT 'UN'
                              CHECK (unidade IN ('UN','KG','CX','L','M','M2','M3','PC','PAR','HR')),
                          ativo           BOOLEAN        NOT NULL DEFAULT TRUE,
                          codigo_sku      VARCHAR(100),
                          created_at      TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
                          updated_at      TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
                          deleted_at      TIMESTAMPTZ,
                          CONSTRAINT pk_products         PRIMARY KEY (id),
                          CONSTRAINT fk_products_org     FOREIGN KEY (organization_id) REFERENCES organizations(id),
                          CONSTRAINT fk_products_company FOREIGN KEY (company_id)      REFERENCES companies(id),
                          CONSTRAINT uq_products_sku_org UNIQUE (organization_id, codigo_sku)
);

CREATE INDEX idx_products_org    ON products(organization_id);
CREATE INDEX idx_products_org_co ON products(organization_id, company_id);
CREATE INDEX idx_products_ativo  ON products(organization_id, ativo) WHERE deleted_at IS NULL;

-- ── orders ────────────────────────────────────────────────────────────────────
-- Todos os status do fluxo de negócio estão presentes no CHECK.
-- Transições válidas (aplicadas no backend via OrderService):
--   ORCAMENTO → ENVIADO | CANCELADO
--   ENVIADO   → APROVADO | REJEITADO | CANCELADO
--   APROVADO  → CONCLUIDO | CANCELADO  (cancelar APROVADO exige motivo)
--   REJEITADO → (terminal)
--   CONCLUIDO → (terminal — não pode ser cancelado)
--   CANCELADO → (terminal)
CREATE TABLE orders (
                        id                  UUID           NOT NULL DEFAULT gen_random_uuid(),
                        organization_id     UUID           NOT NULL,
                        customer_id         UUID           NOT NULL,
                        company_id          UUID           NOT NULL,
                        user_id             UUID           NOT NULL,
                        valor_total         NUMERIC(15,2)  NOT NULL DEFAULT 0,
                        status              VARCHAR(20)    NOT NULL DEFAULT 'ORCAMENTO'
                            CHECK (status IN (
                                              'ORCAMENTO','ENVIADO','APROVADO',
                                              'REJEITADO','CONCLUIDO','CANCELADO'
                                )),
                        descricao           TEXT,
    -- Auditoria de cancelamento
                        cancelado_por       UUID,
                        cancelado_em        TIMESTAMPTZ,
                        motivo_cancelamento TEXT,
    -- Soft-delete e auditoria
                        created_at          TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
                        updated_at          TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
                        deleted_at          TIMESTAMPTZ,
                        CONSTRAINT pk_orders          PRIMARY KEY (id),
                        CONSTRAINT fk_orders_org      FOREIGN KEY (organization_id) REFERENCES organizations(id),
                        CONSTRAINT fk_orders_customer FOREIGN KEY (customer_id)     REFERENCES customers(id),
                        CONSTRAINT fk_orders_company  FOREIGN KEY (company_id)      REFERENCES companies(id),
                        CONSTRAINT fk_orders_user     FOREIGN KEY (user_id)         REFERENCES users(id),
                        CONSTRAINT fk_orders_cancelby FOREIGN KEY (cancelado_por)   REFERENCES users(id)
);

CREATE INDEX idx_orders_org    ON orders(organization_id);
CREATE INDEX idx_orders_status ON orders(organization_id, status) WHERE deleted_at IS NULL;
CREATE INDEX idx_orders_user   ON orders(organization_id, user_id) WHERE deleted_at IS NULL;

-- ── order_items ───────────────────────────────────────────────────────────────
-- Preço congelado no momento da venda (snapshot — Regra 13).
CREATE TABLE order_items (
                             id             UUID          NOT NULL DEFAULT gen_random_uuid(),
                             order_id       UUID          NOT NULL,
                             product_id     UUID          NOT NULL,
                             quantidade     NUMERIC(15,4) NOT NULL CHECK (quantidade > 0),
                             preco_unitario NUMERIC(15,4) NOT NULL CHECK (preco_unitario >= 0),
                             created_at     TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
                             updated_at     TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
                             deleted_at     TIMESTAMPTZ,
                             CONSTRAINT pk_order_items    PRIMARY KEY (id),
                             CONSTRAINT fk_oi_order       FOREIGN KEY (order_id)   REFERENCES orders(id)   ON DELETE CASCADE,
                             CONSTRAINT fk_oi_product     FOREIGN KEY (product_id) REFERENCES products(id)
);

CREATE INDEX idx_order_items_order ON order_items(order_id);

-- ── agreements ────────────────────────────────────────────────────────────────
-- Relação N:N entre REPRESENTANTE e EMPRESA (Regra 10 / Regra 11).
CREATE TABLE agreements (
                            id                   UUID          NOT NULL DEFAULT gen_random_uuid(),
                            representante_org_id UUID          NOT NULL,
                            empresa_company_id   UUID          NOT NULL,
                            percentual_comissao  NUMERIC(5,2)  NOT NULL DEFAULT 0
                                CHECK (percentual_comissao BETWEEN 0 AND 100),
                            compartilhar_pedidos   BOOLEAN NOT NULL DEFAULT FALSE,
                            compartilhar_dashboard BOOLEAN NOT NULL DEFAULT FALSE,
                            compartilhar_clientes  BOOLEAN NOT NULL DEFAULT FALSE,
                            ativo                  BOOLEAN NOT NULL DEFAULT TRUE,
                            created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                            updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                            deleted_at             TIMESTAMPTZ,
                            CONSTRAINT pk_agreements        PRIMARY KEY (id),
                            CONSTRAINT fk_agr_representante FOREIGN KEY (representante_org_id) REFERENCES organizations(id),
                            CONSTRAINT fk_agr_empresa       FOREIGN KEY (empresa_company_id)   REFERENCES companies(id),
                            CONSTRAINT uq_agreements_pair   UNIQUE (representante_org_id, empresa_company_id)
);

-- ── notifications ─────────────────────────────────────────────────────────────
CREATE TABLE notifications (
                               id              UUID         NOT NULL DEFAULT gen_random_uuid(),
                               organization_id UUID         NOT NULL,
                               user_id         UUID,
                               titulo          VARCHAR(200) NOT NULL,
                               mensagem        TEXT         NOT NULL,
                               lida            BOOLEAN      NOT NULL DEFAULT FALSE,
                               created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
                               updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
                               deleted_at      TIMESTAMPTZ,
                               CONSTRAINT pk_notifications  PRIMARY KEY (id),
                               CONSTRAINT fk_notif_org      FOREIGN KEY (organization_id) REFERENCES organizations(id),
                               CONSTRAINT fk_notif_user     FOREIGN KEY (user_id)         REFERENCES users(id)
);

CREATE INDEX idx_notifications_user_unread
    ON notifications(user_id, lida)
    WHERE lida = FALSE AND deleted_at IS NULL;

-- =============================================================================
-- TABELAS DE SUPORTE / HISTÓRICO
-- =============================================================================

-- ── catalog_files ─────────────────────────────────────────────────────────────
CREATE TABLE catalog_files (
                               id              UUID         NOT NULL DEFAULT gen_random_uuid(),
                               organization_id UUID         NOT NULL,
                               company_id      UUID         NOT NULL,
                               nome            VARCHAR(200) NOT NULL,
                               url             TEXT         NOT NULL,
                               tipo            VARCHAR(20)  NOT NULL CHECK (tipo IN ('PDF','IMAGEM')),
                               created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
                               updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
                               deleted_at      TIMESTAMPTZ,
                               CONSTRAINT pk_catalog_files  PRIMARY KEY (id),
                               CONSTRAINT fk_cf_org         FOREIGN KEY (organization_id) REFERENCES organizations(id),
                               CONSTRAINT fk_cf_company     FOREIGN KEY (company_id)      REFERENCES companies(id)
);

CREATE INDEX idx_cf_org ON catalog_files(organization_id) WHERE deleted_at IS NULL;

-- ── audit_log ─────────────────────────────────────────────────────────────────
-- Auditoria não usa soft-delete — registros são imutáveis por design.
CREATE TABLE audit_log (
                           id              UUID        NOT NULL DEFAULT gen_random_uuid(),
                           organization_id UUID,
                           user_id         UUID,
                           action          VARCHAR(50) NOT NULL,
                           entity_type     VARCHAR(50),
                           entity_id       UUID,
                           details         TEXT,
                           level           VARCHAR(10) NOT NULL DEFAULT 'INFO',
                           created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                           CONSTRAINT pk_audit_log PRIMARY KEY (id)
);

CREATE INDEX idx_audit_org_date  ON audit_log(organization_id, created_at);
CREATE INDEX idx_audit_user_date ON audit_log(user_id, created_at);

-- ── order_status_history ──────────────────────────────────────────────────────
CREATE TABLE order_status_history (
                                      id         UUID        NOT NULL DEFAULT gen_random_uuid(),
                                      order_id   UUID        NOT NULL,
                                      old_status VARCHAR(20) CHECK (old_status IS NULL OR old_status IN (
                                                                                                         'ORCAMENTO','ENVIADO','APROVADO','REJEITADO','CONCLUIDO','CANCELADO')),
                                      new_status VARCHAR(20) NOT NULL CHECK (new_status IN (
                                                                                            'ORCAMENTO','ENVIADO','APROVADO','REJEITADO','CONCLUIDO','CANCELADO')),
                                      changed_by UUID        NOT NULL,
                                      motivo     TEXT,
                                      changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                                      CONSTRAINT pk_osh        PRIMARY KEY (id),
                                      CONSTRAINT fk_osh_order  FOREIGN KEY (order_id)   REFERENCES orders(id) ON DELETE CASCADE,
                                      CONSTRAINT fk_osh_user   FOREIGN KEY (changed_by) REFERENCES users(id)
);

CREATE INDEX idx_osh_order ON order_status_history(order_id, changed_at DESC);

-- ── customer_owner_history ────────────────────────────────────────────────────
CREATE TABLE customer_owner_history (
                                        id          UUID        NOT NULL DEFAULT gen_random_uuid(),
                                        customer_id UUID        NOT NULL,
                                        old_owner_id UUID,
                                        new_owner_id UUID,
                                        changed_by  UUID        NOT NULL,
                                        changed_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                                        CONSTRAINT pk_coh        PRIMARY KEY (id),
                                        CONSTRAINT fk_coh_customer  FOREIGN KEY (customer_id)  REFERENCES customers(id) ON DELETE CASCADE,
                                        CONSTRAINT fk_coh_old_owner FOREIGN KEY (old_owner_id) REFERENCES users(id),
                                        CONSTRAINT fk_coh_new_owner FOREIGN KEY (new_owner_id) REFERENCES users(id),
                                        CONSTRAINT fk_coh_by        FOREIGN KEY (changed_by)   REFERENCES users(id)
);

CREATE INDEX idx_coh_customer ON customer_owner_history(customer_id, changed_at DESC);

-- ── event_participantes ───────────────────────────────────────────────────────
CREATE TABLE events (
                        id              UUID        NOT NULL DEFAULT gen_random_uuid(),
                        organization_id UUID        NOT NULL,
                        user_id         UUID        NOT NULL,
                        customer_id     UUID,
                        company_id      UUID,
                        tipo            VARCHAR(20) NOT NULL CHECK (tipo IN ('VISITA','REUNIAO','FOLLOW_UP')),
                        titulo          VARCHAR(200) NOT NULL,
                        descricao       TEXT,
                        data_inicio     TIMESTAMPTZ NOT NULL,
                        data_fim        TIMESTAMPTZ,
                        status          VARCHAR(20) NOT NULL CHECK (status IN ('AGENDADO','CONCLUIDO','CANCELADO')),
                        created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                        updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                        deleted_at      TIMESTAMPTZ,
                        CONSTRAINT pk_events      PRIMARY KEY (id),
                        CONSTRAINT fk_events_org  FOREIGN KEY (organization_id) REFERENCES organizations(id),
                        CONSTRAINT fk_events_user FOREIGN KEY (user_id)         REFERENCES users(id)
);

CREATE INDEX idx_events_org  ON events(organization_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_events_date ON events(organization_id, data_inicio) WHERE deleted_at IS NULL;

CREATE TABLE event_participantes (
                                     event_id UUID         NOT NULL,
                                     email    VARCHAR(255) NOT NULL,
                                     CONSTRAINT fk_ep_event FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
);

CREATE INDEX idx_ep_event ON event_participantes(event_id);

-- =============================================================================
-- TRIGGERS — atualização automática de updated_at
-- =============================================================================

CREATE OR REPLACE FUNCTION fn_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplica o trigger em todas as tabelas com updated_at
DO $$
DECLARE
t TEXT;
BEGIN
FOR t IN SELECT unnest(ARRAY[
                           'organizations','users','companies','customers','products',
                       'orders','order_items','agreements','notifications',
                       'catalog_files','events'
                           ])
                    LOOP
             EXECUTE format(
            'CREATE TRIGGER trg_%s_updated_at
             BEFORE UPDATE ON %s
             FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at()',
            t, t
        );
END LOOP;
END $$;

-- =============================================================================
-- FUNÇÃO UTILITÁRIA — estatísticas por tenant
-- =============================================================================

CREATE OR REPLACE FUNCTION tenant_stats(org_id UUID)
RETURNS TABLE (
    total_customers BIGINT,
    total_orders    BIGINT,
    orders_open     BIGINT,
    revenue_total   NUMERIC,
    revenue_month   NUMERIC,
    total_products  BIGINT
) AS $$
BEGIN
RETURN QUERY
SELECT
    (SELECT COUNT(*) FROM customers WHERE organization_id = org_id AND deleted_at IS NULL),
    (SELECT COUNT(*) FROM orders    WHERE organization_id = org_id AND deleted_at IS NULL),
    (SELECT COUNT(*) FROM orders    WHERE organization_id = org_id AND status = 'ORCAMENTO' AND deleted_at IS NULL),
    (SELECT COALESCE(SUM(valor_total), 0) FROM orders
     WHERE organization_id = org_id AND status = 'CONCLUIDO' AND deleted_at IS NULL),
    (SELECT COALESCE(SUM(valor_total), 0) FROM orders
     WHERE organization_id = org_id AND status = 'CONCLUIDO'
       AND deleted_at IS NULL
       AND created_at >= date_trunc('month', NOW())),
    (SELECT COUNT(*) FROM products  WHERE organization_id = org_id AND ativo = TRUE AND deleted_at IS NULL);
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- =============================================================================
-- SEED — dados iniciais para desenvolvimento/demo
-- =============================================================================

INSERT INTO organizations (id, nome, tipo)
VALUES ('a0000000-0000-0000-0000-000000000001', 'VenzPro Demo', 'REPRESENTANTE')
    ON CONFLICT (id) DO NOTHING;

-- Admin padrão — senha: admin123 (BCrypt strength=12)
-- onboarding_completed=TRUE para não bloquear o admin de seed
INSERT INTO users (
    id, organization_id, nome, email, senha, role,
    pode_aprovar, pode_exportar, pode_ver_dashboard,
    onboarding_completed
) VALUES (
             'b0000000-0000-0000-0000-000000000001',
             'a0000000-0000-0000-0000-000000000001',
             'Administrador',
             'admin@venzpro.com',
             '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewF.S2K.l8S/UqM6',
             'ADMIN',
             TRUE, TRUE, TRUE,
             TRUE
         ) ON CONFLICT (id) DO NOTHING;