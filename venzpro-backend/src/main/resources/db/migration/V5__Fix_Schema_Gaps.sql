-- ── V5: Corrige inconsistências de schema e adiciona índices faltantes ────────

-- 1. Garante que a coluna must_change_password existe na tabela users
--    (adicionada no código mas ausente em algumas instalações)
ALTER TABLE users
    ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN NOT NULL DEFAULT FALSE;

-- 2. Garante as colunas de permissão granular nos usuários
--    (V4 pode não ter rodado em alguns ambientes)
ALTER TABLE users
    ADD COLUMN IF NOT EXISTS pode_aprovar       BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS pode_exportar      BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS pode_ver_dashboard BOOLEAN NOT NULL DEFAULT FALSE;

-- 3. Atualiza o ADMIN padrão do seed para ter todas as permissões
UPDATE users
SET pode_aprovar       = TRUE,
    pode_exportar      = TRUE,
    pode_ver_dashboard = TRUE
WHERE id = 'b0000000-0000-0000-0000-000000000001';

-- 4. Índice para busca de notificações por usuário e status de leitura
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
    ON notifications(user_id, lida)
    WHERE lida = FALSE;

-- 5. Índice para histórico de status de pedidos por pedido
CREATE INDEX IF NOT EXISTS idx_order_status_history_order
    ON order_status_history(order_id, changed_at DESC);

-- 6. Índice para histórico de owner de clientes
CREATE INDEX IF NOT EXISTS idx_customer_owner_history_customer
    ON customer_owner_history(customer_id, changed_at DESC);

-- 7. Garante que a coluna owner_id em customers pode ser NULL
--    (já corrigido na V2, mas garante para ambientes com schema legado)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'customers'
          AND column_name = 'owner_id'
          AND is_nullable = 'NO'
    ) THEN
        ALTER TABLE customers ALTER COLUMN owner_id DROP NOT NULL;
    END IF;
END $$;

-- 8. Garante que a coluna created_by existe em customers
ALTER TABLE customers
    ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id);
