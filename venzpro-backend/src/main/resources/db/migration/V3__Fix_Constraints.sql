-- ── V3: Corrige inconsistências entre enum Java e constraints SQL ────────

-- 1. Corrige status de orders: substitui FECHADO por todos os status válidos
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE orders ADD CONSTRAINT orders_status_check
    CHECK (status IN (
                      'ORCAMENTO','ENVIADO','APROVADO','REJEITADO','CONCLUIDO','CANCELADO'
        ));

-- 2. Adiciona SUPORTE na constraint de users (estava faltando no V1)
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check
    CHECK (role IN ('ADMIN','VENDEDOR','GERENTE','SUPORTE'));

-- 3. Corrige orders existentes com status FECHADO → CONCLUIDO
UPDATE orders SET status = 'CONCLUIDO' WHERE status = 'FECHADO';

-- 4. Índice para busca de clientes sem owner (notificações)
CREATE INDEX IF NOT EXISTS idx_customers_no_owner
    ON customers(organization_id) WHERE owner_id IS NULL;

-- 5. Índice composto para busca de clientes por owner (visibilidade VENDEDOR)
CREATE INDEX IF NOT EXISTS idx_customers_owner
    ON customers(organization_id, owner_id);

-- 6. Notificações: índice para busca eficiente por organização e lida
CREATE INDEX IF NOT EXISTS idx_notifications_org_unread
    ON notifications(organization_id, lida) WHERE lida = FALSE;
