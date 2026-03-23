package com.venzpro.application.service;

import com.venzpro.domain.entity.Agreement;
import com.venzpro.domain.repository.AgreementRepository;
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

    /**
     * Verifica se um representante tem vínculo com uma empresa.
     * Usado pelo OrderService para validar criação de pedido.
     */
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
}
