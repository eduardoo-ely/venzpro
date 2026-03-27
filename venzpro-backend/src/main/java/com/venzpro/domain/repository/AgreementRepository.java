package com.venzpro.domain.repository;

import com.venzpro.domain.entity.Agreement;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;
import java.util.Optional;

public interface AgreementRepository extends JpaRepository<Agreement, UUID> {

    boolean existsByRepresentanteIdAndEmpresaIdAndAtivoTrue(
            UUID representanteId, UUID empresaId);

    Optional<Agreement> findByIdAndRepresentanteId(UUID id, UUID representanteId);
    List<Agreement> findAllByRepresentanteIdAndAtivoTrue(UUID representanteId);
}