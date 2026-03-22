package com.venzpro.application.service;

import com.venzpro.application.dto.request.CustomerRequest;
import com.venzpro.application.dto.response.CustomerResponse;
import com.venzpro.infrastructure.security.TenantContext;
import com.venzpro.infrastructure.exception.ResourceNotFoundException;
import com.venzpro.domain.entity.Customer;
import com.venzpro.domain.repository.CustomerRepository;
import com.venzpro.domain.repository.OrganizationRepository;
import com.venzpro.domain.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class CustomerService {

    private final CustomerRepository customerRepository;
    private final UserRepository     userRepository;
    private final OrganizationRepository organizationRepository;

    @Transactional
    public CustomerResponse create(CustomerRequest req, UUID userId) {
        UUID orgId = TenantContext.get();

        var user = userRepository.findByIdForCurrentTenant(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Usuário", userId));
        var org = organizationRepository.findById(orgId)
                .orElseThrow(() -> new ResourceNotFoundException("Organização", orgId));

        var customer = Customer.builder()
                .nome(req.nome()).telefone(req.telefone())
                .email(req.email()).cidade(req.cidade())
                .cpfCnpj(req.cpfCnpj())
                .owner(user).createdBy(user).organization(org)
                .build();

        return CustomerResponse.from(customerRepository.save(customer));
    }

    @Transactional(readOnly = true)
    public List<CustomerResponse> findAll() {
        return customerRepository.findAllForCurrentTenant()
                .stream().map(CustomerResponse::from).toList();
    }

    @Transactional(readOnly = true)
    public CustomerResponse findById(UUID id) {
        return CustomerResponse.from(customerRepository.getByIdOrThrow(id, "Cliente"));
    }

    @Transactional
    public CustomerResponse update(UUID id, CustomerRequest req) {
        var customer = customerRepository.getByIdOrThrow(id, "Cliente");

        customer.setNome(req.nome());
        customer.setTelefone(req.telefone());
        customer.setEmail(req.email());
        customer.setCidade(req.cidade());
        if (req.cpfCnpj() != null) {
            customer.setCpfCnpj(req.cpfCnpj());
        }
        if (req.status() != null) {
            customer.setStatus(req.status());
        }

        return CustomerResponse.from(customerRepository.save(customer));
    }

    @Transactional
    public void delete(UUID id) {
        var customer = customerRepository.getByIdOrThrow(id, "Cliente");
        customerRepository.delete(customer);
    }
}
