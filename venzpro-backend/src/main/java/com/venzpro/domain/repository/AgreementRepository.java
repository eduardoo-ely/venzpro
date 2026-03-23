package com.venzpro.domain.repository;

import com.venzpro.domain.entity.Agreement;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface AgreementRepository extends JpaRepository<Agreement, UUID> {

    boolean existsByRepresentanteIdAndEmpresaIdAndAtivoTrue(
            UUID representanteId, UUID empresaId);

    List<Agreement> findAllByRepresentanteIdAndAtivoTrue(UUID representanteId);
}