package com.venzpro.application.service;

import com.venzpro.application.dto.request.CompanyRequest;
import com.venzpro.application.dto.response.CompanyResponse;
import com.venzpro.domain.entity.Company;
import com.venzpro.domain.repository.CatalogFileRepository;
import com.venzpro.domain.repository.CompanyRepository;
import com.venzpro.domain.repository.OrderRepository;
import com.venzpro.domain.repository.OrganizationRepository;
import com.venzpro.infrastructure.exception.BusinessException;
import com.venzpro.infrastructure.exception.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class CompanyService {

    private final CompanyRepository      companyRepository;
    private final OrganizationRepository organizationRepository;
    private final OrderRepository        orderRepository;       // ← injetado
    private final CatalogFileRepository  catalogFileRepository; // ← injetado

    @Transactional
    public CompanyResponse create(CompanyRequest req, UUID organizationId) {
        var org = organizationRepository.findById(organizationId)
                .orElseThrow(() -> new ResourceNotFoundException("Organização", organizationId));

        if (req.cnpj() != null && !req.cnpj().isBlank()) {
            if (companyRepository.existsByCnpjAndOrganizationId(req.cnpj(), organizationId)) {
                throw new BusinessException(
                        "Já existe uma empresa cadastrada com este CNPJ nesta organização.");
            }
        }

        var company = buildFromRequest(req, org);
        return CompanyResponse.from(companyRepository.save(company));
    }

    @Transactional(readOnly = true)
    public List<CompanyResponse> findAll(UUID organizationId) {
        return companyRepository.findAllByOrganizationId(organizationId)
                .stream().map(CompanyResponse::from).toList();
    }

    @Transactional(readOnly = true)
    public CompanyResponse findById(UUID id, UUID organizationId) {
        return companyRepository.findByIdAndOrganizationId(id, organizationId)
                .map(CompanyResponse::from)
                .orElseThrow(() -> new ResourceNotFoundException("Empresa", id));
    }

    @Transactional
    public CompanyResponse update(UUID id, CompanyRequest req, UUID organizationId) {
        var company = companyRepository.findByIdAndOrganizationId(id, organizationId)
                .orElseThrow(() -> new ResourceNotFoundException("Empresa", id));

        if (req.cnpj() != null && !req.cnpj().isBlank()) {
            boolean cnpjDeOutra = companyRepository
                    .existsByCnpjAndOrganizationIdAndIdNot(req.cnpj(), organizationId, id);
            if (cnpjDeOutra) {
                throw new BusinessException(
                        "Já existe outra empresa cadastrada com este CNPJ nesta organização.");
            }
        }

        applyRequest(company, req);
        return CompanyResponse.from(companyRepository.save(company));
    }

    @Transactional
    public void delete(UUID id, UUID organizationId) {
        var company = companyRepository.findByIdAndOrganizationId(id, organizationId)
                .orElseThrow(() -> new ResourceNotFoundException("Empresa", id));

        // Guard 1: impede exclusão com pedidos ativos (bug A1 — auditoria)
        if (orderRepository.existsByCompanyIdAndDeletedAtIsNull(id)) {
            throw new BusinessException(
                    "Não é possível excluir esta empresa pois ela possui pedidos associados. " +
                            "Cancele ou conclua os pedidos antes de excluir.");
        }

        // Guard 2: impede exclusão silenciosa de catálogos (cascata sem aviso)
        long arquivos = catalogFileRepository.countByCompanyId(id);
        if (arquivos > 0) {
            throw new BusinessException(
                    "A empresa possui " + arquivos + " catálogo(s) vinculado(s). " +
                            "Remova os catálogos antes de excluir a empresa.");
        }

        companyRepository.delete(company);
    }

    // ── Helpers privados ──────────────────────────────────────────────────────

    private Company buildFromRequest(CompanyRequest req, com.venzpro.domain.entity.Organization org) {
        return Company.builder()
                .nome(req.nome())
                .cnpj(nullIfBlank(req.cnpj()))
                .razaoSocial(nullIfBlank(req.razaoSocial()))
                .cep(nullIfBlank(req.cep()))
                .logradouro(nullIfBlank(req.logradouro()))
                .numero(nullIfBlank(req.numero()))
                .complemento(nullIfBlank(req.complemento()))
                .bairro(nullIfBlank(req.bairro()))
                .cidade(nullIfBlank(req.cidade()))
                .uf(nullIfBlank(req.uf()))
                .organization(org)
                .build();
    }

    private void applyRequest(Company company, CompanyRequest req) {
        company.setNome(req.nome());
        company.setCnpj(nullIfBlank(req.cnpj()));
        company.setRazaoSocial(nullIfBlank(req.razaoSocial()));
        company.setCep(nullIfBlank(req.cep()));
        company.setLogradouro(nullIfBlank(req.logradouro()));
        company.setNumero(nullIfBlank(req.numero()));
        company.setComplemento(nullIfBlank(req.complemento()));
        company.setBairro(nullIfBlank(req.bairro()));
        company.setCidade(nullIfBlank(req.cidade()));
        company.setUf(nullIfBlank(req.uf()));
    }

    private static String nullIfBlank(String value) {
        return (value == null || value.isBlank()) ? null : value;
    }
}