-- =============================================================================
-- Dados iniciais do VenzPro
-- Executado automaticamente ao iniciar o backend.
-- Usa INSERT ... ON CONFLICT DO NOTHING para ser idempotente
-- (rodar várias vezes não duplica dados).
-- =============================================================================

-- Organização demo
INSERT INTO organizations (id, nome, tipo, created_at)
VALUES (
    'a0000000-0000-0000-0000-000000000001',
    'VenzPro Demo',
    'REPRESENTANTE',
    NOW()
) ON CONFLICT (id) DO NOTHING;

-- Usuário admin padrão
-- Senha: admin123  (hash BCrypt gerado com strength=12)
-- Troque a senha após o primeiro acesso em /configuracoes
INSERT INTO users (id, nome, email, senha, role, organization_id, must_change_password, created_at)
VALUES (
    'b0000000-0000-0000-0000-000000000001',
    'Administrador',
    'admin@venzpro.com',
    '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4oZ5uL8K6.',
    'ADMIN',
    'a0000000-0000-0000-0000-000000000001',
    false,
    NOW()
) ON CONFLICT (id) DO NOTHING;
