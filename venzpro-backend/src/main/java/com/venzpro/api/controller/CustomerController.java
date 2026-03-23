package com.venzpro.api.controller;

import com.venzpro.application.dto.request.CustomerOwnerRequest;
import com.venzpro.application.dto.request.CustomerRequest;
import com.venzpro.application.dto.request.CustomerStatusRequest;
import com.venzpro.application.dto.response.CustomerResponse;
import com.venzpro.application.service.CustomerService;
import com.venzpro.domain.enums.UserRole;
import com.venzpro.infrastructure.security.VenzproPrincipal;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

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
        return customerService.create(req, principal.userId());
    }

    @GetMapping
    public List<CustomerResponse> findAll(
            @AuthenticationPrincipal VenzproPrincipal principal) {
        return customerService.findAll(
                principal.organizationId(),
                principal.userId(),
                UserRole.valueOf(principal.role()));
    }

    @GetMapping("/{id}")
    public CustomerResponse findById(
            @PathVariable UUID id,
            @AuthenticationPrincipal VenzproPrincipal principal) {
        return customerService.findById(id, principal.organizationId());
    }

    @PutMapping("/{id}")
    public CustomerResponse update(
            @PathVariable UUID id,
            @Valid @RequestBody CustomerRequest req,
            @AuthenticationPrincipal VenzproPrincipal principal) {
        return customerService.update(id, req, principal.organizationId());
    }


    @PatchMapping("/{id}/status")
    @PreAuthorize("hasAnyRole('ADMIN', 'GERENTE')")
    public CustomerResponse updateStatus(
            @PathVariable UUID id,
            @Valid @RequestBody CustomerStatusRequest req,
            @AuthenticationPrincipal VenzproPrincipal principal) {

        return customerService.updateStatus(
                id,
                principal.organizationId(),
                principal.userId(),
                UserRole.valueOf(principal.role()),
                req
        );
    }


    @PatchMapping("/{id}/owner")
    @PreAuthorize("hasAnyRole('ADMIN', 'GERENTE')")
    public CustomerResponse updateOwner(
            @PathVariable UUID id,
            @RequestBody CustomerOwnerRequest req,
            @AuthenticationPrincipal VenzproPrincipal principal) {

        return customerService.updateOwner(
                id,
                principal.organizationId(),
                principal.userId(),
                UserRole.valueOf(principal.role()),
                req
        );
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(
            @PathVariable UUID id,
            @AuthenticationPrincipal VenzproPrincipal principal) {
        customerService.delete(id, principal.organizationId());
    }
}