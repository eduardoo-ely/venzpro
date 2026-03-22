-- ── 1. ATUALIZAÇÃO DOS UTILIZADORES (SUPORTE) ─────────────────────────────────
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check 
    CHECK (role IN ('ADMIN','VENDEDOR','GERENTE','SUPORTE'));

-- ── 2. ATUALIZAÇÃO DOS CLIENTES (Carteira, Aprovação e Documento) ─────────────
ALTER TABLE customers RENAME COLUMN user_id TO owner_id;
ALTER TABLE customers ALTER COLUMN owner_id DROP NOT NULL;

ALTER TABLE customers ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'PENDENTE' 
    CHECK (status IN ('PENDENTE','APROVADO','REJEITADO'));
ALTER TABLE customers ADD COLUMN cpf_cnpj VARCHAR(20);
ALTER TABLE customers ADD COLUMN created_by UUID REFERENCES users(id);

ALTER TABLE customers ADD CONSTRAINT uq_customers_cpf_cnpj_org 
    UNIQUE (organization_id, cpf_cnpj);

-- ── 3. ATUALIZAÇÃO DOS PEDIDOS (Novos Status e Auditoria de Cancelamento) ─────
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE orders ADD CONSTRAINT orders_status_check 
    CHECK (status IN ('ORCAMENTO','ENVIADO','APROVADO','REJEITADO','CONCLUIDO','CANCELADO'));

ALTER TABLE orders ADD COLUMN cancelado_por UUID REFERENCES users(id);
ALTER TABLE orders ADD COLUMN cancelado_em TIMESTAMPTZ;
ALTER TABLE orders ADD COLUMN motivo_cancelamento TEXT;

-- ── 4. ITENS DO PEDIDO (Regra 10: Snapshot de Preço) ──────────────────────────
CREATE TABLE order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id),
    quantidade NUMERIC(15,4) NOT NULL CHECK (quantidade > 0),
    preco_unitario NUMERIC(15,4) NOT NULL CHECK (preco_unitario >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_order_items_order ON order_items(order_id);

-- ── 5. REPRESENTAÇÕES / ACORDOS (Opt-in de Partilha e Comissão) ───────────────
CREATE TABLE agreements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    representante_org_id UUID NOT NULL REFERENCES organizations(id),
    empresa_company_id UUID NOT NULL REFERENCES companies(id),
    percentual_comissao NUMERIC(5,2) NOT NULL DEFAULT 0 
        CHECK (percentual_comissao >= 0 AND percentual_comissao <= 100),
    compartilhar_pedidos BOOLEAN NOT NULL DEFAULT FALSE,
    compartilhar_dashboard BOOLEAN NOT NULL DEFAULT FALSE,
    compartilhar_clientes BOOLEAN NOT NULL DEFAULT FALSE,
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_agreements_rep_emp UNIQUE (representante_org_id, empresa_company_id)
);

-- ── 6. NOTIFICAÇÕES E HISTÓRICO ────────────────────
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id),
    user_id UUID REFERENCES users(id),
    titulo VARCHAR(200) NOT NULL,
    mensagem TEXT NOT NULL,
    lida BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE customer_owner_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    old_owner_id UUID REFERENCES users(id),
    new_owner_id UUID REFERENCES users(id),
    changed_by UUID NOT NULL REFERENCES users(id),
    changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE order_status_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    old_status VARCHAR(20) CHECK (old_status IS NULL OR old_status IN ('ORCAMENTO','ENVIADO','APROVADO','REJEITADO','CONCLUIDO','CANCELADO')),
    new_status VARCHAR(20) NOT NULL CHECK (new_status IN ('ORCAMENTO','ENVIADO','APROVADO','REJEITADO','CONCLUIDO','CANCELADO')),
    changed_by UUID NOT NULL REFERENCES users(id),
    motivo TEXT,
    changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
