-- Organização demo
INSERT INTO organizations (id, nome, tipo, created_at)
VALUES (
           'a0000000-0000-0000-0000-000000000001',
           'VenzPro Demo',
           'REPRESENTANTE',
           NOW()
       ) ON CONFLICT (id) DO NOTHING@@

-- Usuário admin — senha: admin123 (BCrypt strength=12)
INSERT INTO users (id, nome, email, senha, role, organization_id, must_change_password, created_at)
VALUES (
    'b0000000-0000-0000-0000-000000000001',
    'Administrador',
    'admin@venzpro.com',
    '$2a$12$UlJBH7bJyQnVh0nAJmQZEuGcEe.s0I3eZHMpOwBH1NLTRrn7YNkb6',
    'ADMIN',
    'a0000000-0000-0000-0000-000000000001',
    false,
    NOW()
    ) ON CONFLICT (id) DO NOTHING@@