package com.venzpro.api.controller;

import com.venzpro.application.dto.request.CompanyRequest;
import com.venzpro.application.dto.response.CompanyResponse;
import com.venzpro.application.service.CompanyService;
import com.venzpro.config.security.VenzproPrincipal;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/companies")
@RequiredArgsConstructor
public class CompanyController {

    private final CompanyService companyService;

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public CompanyResponse create(@Valid @RequestBody CompanyRequest req,
                                  @AuthenticationPrincipal VenzproPrincipal principal) {
        return companyService.create(req, principal.organizationId());
    }

    @GetMapping
    public List<CompanyResponse> findAll(@AuthenticationPrincipal VenzproPrincipal principal) {
        return companyService.findAll(principal.organizationId());
    }

    @GetMapping("/{id}")
    public CompanyResponse findById(@PathVariable UUID id,
                                    @AuthenticationPrincipal VenzproPrincipal principal) {
        return companyService.findById(id, principal.organizationId());
    }

    @PutMapping("/{id}")
    public CompanyResponse update(@PathVariable UUID id,
                                  @Valid @RequestBody CompanyRequest req,
                                  @AuthenticationPrincipal VenzproPrincipal principal) {
        return companyService.update(id, req, principal.organizationId());
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable UUID id,
                       @AuthenticationPrincipal VenzproPrincipal principal) {
        companyService.delete(id, principal.organizationId());
    }
}
