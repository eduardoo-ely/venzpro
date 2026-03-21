-- Extensão para UUIDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp"@@

CREATE OR REPLACE FUNCTION tenant_stats(org_id UUID)
RETURNS TABLE (
    total_customers BIGINT,
    total_orders    BIGINT,
    orders_open     BIGINT,
    orders_closed   BIGINT,
    revenue_total   NUMERIC,
    revenue_month   NUMERIC
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
       AND created_at >= date_trunc('month', NOW()));
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER@@