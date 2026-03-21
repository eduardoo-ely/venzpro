-- =============================================================================
-- Funções do VenzPro
-- =============================================================================

-- Função de audit trigger
CREATE OR REPLACE FUNCTION audit_trigger_fn() RETURNS TRIGGER AS $func$
BEGIN
INSERT INTO audit_log (
    organization_id,
    table_name,
    operation,
    record_id,
    old_data,
    new_data
)
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
$func$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função tenant stats
CREATE OR REPLACE FUNCTION tenant_stats(org_id UUID)
RETURNS TABLE (
    total_customers BIGINT,
    total_orders BIGINT,
    orders_open BIGINT,
    orders_closed BIGINT,
    revenue_total NUMERIC,
    revenue_month NUMERIC
) AS $func$
BEGIN
RETURN QUERY
SELECT
    (SELECT COUNT(*) FROM customers WHERE organization_id = org_id),
    (SELECT COUNT(*) FROM orders WHERE organization_id = org_id),
    (SELECT COUNT(*) FROM orders WHERE organization_id = org_id AND status = 'ORCAMENTO'),
    (SELECT COUNT(*) FROM orders WHERE organization_id = org_id AND status = 'FECHADO'),
    (SELECT COALESCE(SUM(valor_total),0) FROM orders WHERE organization_id = org_id AND status = 'FECHADO'),
    (SELECT COALESCE(SUM(valor_total),0) FROM orders WHERE organization_id = org_id AND status = 'FECHADO' AND created_at >= date_trunc('month', NOW()));
END;
$func$ LANGUAGE plpgsql;