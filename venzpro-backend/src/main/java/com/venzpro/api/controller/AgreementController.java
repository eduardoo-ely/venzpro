package com.venzpro.api.controller;

import com.venzpro.application.dto.request.AgreementRequest;
import com.venzpro.application.dto.response.AgreementResponse;
import com.venzpro.application.service.AgreementService;
import com.venzpro.domain.entity.Agreement;
import com.venzpro.infrastructure.security.TenantContext;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/agreements")
@RequiredArgsConstructor
public class AgreementController {

    private final AgreementService agreementService;

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public AgreementResponse create(@Valid @RequestBody AgreementRequest request) {
        UUID organizationId = TenantContext.get();
        Agreement agreement = agreementService.create(request, organizationId);
        return AgreementResponse.from(agreement);
    }

    @GetMapping("/me")
    public List<AgreementResponse> listMyAgreements() {
        UUID organizationId = TenantContext.get();
        return agreementService.findByRepresentante(organizationId)
                .stream()
                .map(AgreementResponse::from)
                .toList();
    }

    @PatchMapping("/{id}/toggle")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void toggleStatus(@PathVariable UUID id) {
        agreementService.toggleStatus(id);
    }
}