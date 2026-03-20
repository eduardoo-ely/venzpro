package com.venzpro.api.controller;

import com.venzpro.application.dto.request.CustomerRequest;
import com.venzpro.application.dto.response.CustomerResponse;
import com.venzpro.application.service.CustomerService;
import com.venzpro.config.security.VenzproPrincipal;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

/**
 * CustomerController refatorado para multi-tenant real.
 *
 * ANTES: recebia organizationId no path ou no body.
 *
 * AGORA:
 *  - O organizationId NUNCA aparece neste controller.
 *  - Ele é extraído do JWT pelo JwtAuthenticationFilter
 *    e colocado no TenantContext para uso interno.
 *  - O userId do usuário logado é passado apenas quando
 *    necessário para associar o recurso ao criador.
 *
 * Não há mais risco de um usuário manipular o orgId na URL
 * para acessar dados de outro tenant.
 */
@RestController
@RequestMapping("/api/customers")
@RequiredArgsConstructor
public class CustomerController {

    private final CustomerService customerService;

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public CustomerResponse create(
            @Valid @RequestBody CustomerRequest req,
            @AuthenticationPrincipal VenzproPrincipal principal) {
        // userId vem do token — o service associa o cliente ao criador
        return customerService.create(req, principal.userId());
    }

    @GetMapping
    public List<CustomerResponse> findAll() {
        // organizationId vem do TenantContext — injetado pelo filtro JWT
        return customerService.findAll();
    }

    @GetMapping("/{id}")
    public CustomerResponse findById(@PathVariable UUID id) {
        return customerService.findById(id);
    }

    @PutMapping("/{id}")
    public CustomerResponse update(
            @PathVariable UUID id,
            @Valid @RequestBody CustomerRequest req) {
        return customerService.update(id, req);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable UUID id) {
        customerService.delete(id);
    }
}
