package com.venzpro.application.service;

import com.venzpro.application.dto.request.AgreementRequest;
import com.venzpro.domain.entity.Agreement;
import com.venzpro.domain.entity.Company;
import com.venzpro.domain.entity.Organization;
import com.venzpro.domain.repository.AgreementRepository;
import com.venzpro.domain.repository.CompanyRepository;
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
public class AgreementService {

    private final AgreementRepository agreementRepository;
    private final OrganizationRepository organizationRepository;
    private final CompanyRepository companyRepository;

    @Transactional(readOnly = true)
    public boolean hasActiveAgreement(UUID representanteOrgId, UUID empresaId) {
        return agreementRepository
                .existsByRepresentanteIdAndEmpresaIdAndAtivoTrue(
                        representanteOrgId, empresaId);
    }

    @Transactional(readOnly = true)
    public List<Agreement> findByRepresentante(UUID representanteOrgId) {
        return agreementRepository
                .findAllByRepresentanteIdAndAtivoTrue(representanteOrgId);
    }

    @Transactional
    public Agreement create(AgreementRequest req, UUID representanteOrgId) {
        boolean exists = agreementRepository.existsByRepresentanteIdAndEmpresaIdAndAtivoTrue(
                representanteOrgId, req.empresaCompanyId());

        if (exists) {
            throw new BusinessException("Já existe um acordo ativo com esta empresa.");
        }

        Organization representante = organizationRepository.findById(representanteOrgId)
                .orElseThrow(() -> new ResourceNotFoundException("Organização (Representante)", representanteOrgId));

        Company empresa = companyRepository.findById(req.empresaCompanyId())
                .orElseThrow(() -> new ResourceNotFoundException("Empresa", req.empresaCompanyId()));

        Agreement agreement = Agreement.builder()
                .representante(representante)
                .empresa(empresa)
                .percentualComissao(req.percentualComissao())
                .compartilharPedidos(req.compartilharPedidos())
                .compartilharDashboard(req.compartilharDashboard())
                .compartilharClientes(req.compartilharClientes())
                .ativo(true)
                .build();

        return agreementRepository.save(agreement);
    }

    @Transactional
    public void toggleStatus(UUID id) {
        Agreement agreement = agreementRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Acordo", id));

        agreement.setAtivo(!agreement.isAtivo());
        agreementRepository.save(agreement);
    }
}