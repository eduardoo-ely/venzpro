package com.venzpro.application.service;

import com.venzpro.application.dto.request.CustomerRequest;
import com.venzpro.application.dto.response.CustomerResponse;
import com.venzpro.config.security.TenantContext;
import com.venzpro.domain.entity.Customer;
import com.venzpro.domain.repository.CustomerRepository;
import com.venzpro.domain.repository.OrganizationRepository;
import com.venzpro.domain.repository.UserRepository;
import com.venzpro.exception.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

/**
 * CustomerService refatorado para multi-tenant real.
 *
 * ANTES: todos os métodos recebiam UUID organizationId como parâmetro.
 *        O organizationId vinha do controller, que pegava do principal.
 *
 * AGORA: o organizationId é lido diretamente do TenantContext (ThreadLocal).
 *        O controller não precisa mais passar organizationId.
 *        É impossível acessar dados de outra organização por acidente.
 *
 * O mesmo padrão se aplica a todos os outros Services.
 */
@Service
@RequiredArgsConstructor
public class CustomerService {

    private final CustomerRepository customerRepository;
    private final UserRepository     userRepository;
    private final OrganizationRepository organizationRepository;

    @Transactional
    public CustomerResponse create(CustomerRequest req, UUID userId) {
        UUID orgId = TenantContext.get();   // ← vem do JWT, não do frontend

        var user = userRepository.findByIdForCurrentTenant(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Usuário", userId));
        var org = organizationRepository.findById(orgId)
                .orElseThrow(() -> new ResourceNotFoundException("Organização", orgId));

        var customer = Customer.builder()
                .nome(req.nome()).telefone(req.telefone())
                .email(req.email()).cidade(req.cidade())
                .user(user).organization(org)
                .build();

        return CustomerResponse.from(customerRepository.save(customer));
    }

    @Transactional(readOnly = true)
    public List<CustomerResponse> findAll() {
        // TenantAwareRepository injeta organizationId automaticamente
        return customerRepository.findAllForCurrentTenant()
                .stream().map(CustomerResponse::from).toList();
    }

    @Transactional(readOnly = true)
    public CustomerResponse findById(UUID id) {
        return CustomerResponse.from(customerRepository.getByIdOrThrow(id, "Cliente"));
        // se não encontrar OU pertencer a outra org → 404
    }

    @Transactional
    public CustomerResponse update(UUID id, CustomerRequest req) {
        var customer = customerRepository.getByIdOrThrow(id, "Cliente");

        customer.setNome(req.nome());
        customer.setTelefone(req.telefone());
        customer.setEmail(req.email());
        customer.setCidade(req.cidade());

        return CustomerResponse.from(customerRepository.save(customer));
    }

    @Transactional
    public void delete(UUID id) {
        var customer = customerRepository.getByIdOrThrow(id, "Cliente");
        customerRepository.delete(customer);
    }
}
