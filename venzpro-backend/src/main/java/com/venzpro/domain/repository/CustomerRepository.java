package com.venzpro.domain.repository;

import com.venzpro.domain.entity.Customer;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface CustomerRepository extends TenantAwareRepository<Customer> {

    List<Customer> findAllByOrganizationId(UUID organizationId);

    // Visibilidade de VENDEDOR: apenas clientes onde é owner
    List<Customer> findAllByOrganizationIdAndOwnerId(UUID organizationId, UUID ownerId);

    Optional<Customer> findByIdAndOrganizationId(UUID id, UUID organizationId);

    List<Customer> findAllByOrganizationIdAndOwnerIsNull(UUID organizationId);

    // Validação de CPF/CNPJ duplicado
    boolean existsByCpfCnpjAndOrganizationId(String cpfCnpj, UUID organizationId);

    // Validação ao editar: exclui o próprio cliente do check
    boolean existsByCpfCnpjAndOrganizationIdAndIdNot(
            String cpfCnpj, UUID organizationId, UUID id);
}
