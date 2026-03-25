-- =============================================================================
-- V2__Companies_Add_CNPJ_Address.sql
-- VenzPro — Adiciona campos de CNPJ e endereço na tabela companies.
--
-- Contexto: EmpresasPage coleta esses dados via BrasilAPI mas o backend
-- descartava silenciosamente pois CompanyRequest só aceitava { nome }.
-- Esta migration corrige a inconsistência de dados (bug #4 da auditoria).
-- =============================================================================

ALTER TABLE companies
    ADD COLUMN IF NOT EXISTS cnpj            VARCHAR(18),
    ADD COLUMN IF NOT EXISTS razao_social    VARCHAR(300),
    ADD COLUMN IF NOT EXISTS cep             VARCHAR(9),
    ADD COLUMN IF NOT EXISTS logradouro      VARCHAR(300),
    ADD COLUMN IF NOT EXISTS numero          VARCHAR(20),
    ADD COLUMN IF NOT EXISTS complemento     VARCHAR(100),
    ADD COLUMN IF NOT EXISTS bairro          VARCHAR(100),
    ADD COLUMN IF NOT EXISTS cidade          VARCHAR(100),
    ADD COLUMN IF NOT EXISTS uf              VARCHAR(2);

-- CNPJ único por organização (quando informado)
-- Usamos partial index para não conflitar com registros sem CNPJ (NULL ≠ NULL no SQL)
CREATE UNIQUE INDEX IF NOT EXISTS uq_companies_cnpj_org
    ON companies (organization_id, cnpj)
    WHERE cnpj IS NOT NULL;

-- Índice para busca por CNPJ
CREATE INDEX IF NOT EXISTS idx_companies_cnpj
    ON companies (cnpj)
    WHERE cnpj IS NOT NULL;

COMMENT ON COLUMN companies.cnpj         IS 'CNPJ formatado: XX.XXX.XXX/XXXX-XX (preenchido via BrasilAPI no frontend)';
COMMENT ON COLUMN companies.razao_social IS 'Razão social conforme Receita Federal';
COMMENT ON COLUMN companies.cep          IS 'CEP formatado: XXXXX-XXX';
COMMENT ON COLUMN companies.logradouro   IS 'Logradouro conforme CNPJ/CEP';
COMMENT ON COLUMN companies.numero       IS 'Número do endereço (manual — BrasilAPI não retorna)';
COMMENT ON COLUMN companies.complemento  IS 'Complemento do endereço';
COMMENT ON COLUMN companies.bairro       IS 'Bairro conforme CNPJ/CEP';
COMMENT ON COLUMN companies.cidade       IS 'Município conforme CNPJ/CEP';
COMMENT ON COLUMN companies.uf           IS 'UF (sigla do estado), 2 caracteres';