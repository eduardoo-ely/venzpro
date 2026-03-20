package com.venzpro.api.controller;

import com.venzpro.application.dto.request.CatalogFileRequest;
import com.venzpro.application.dto.response.CatalogFileResponse;
import com.venzpro.application.service.CatalogFileService;
import com.venzpro.config.security.VenzproPrincipal;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/files")
@RequiredArgsConstructor
public class CatalogFileController {

    private final CatalogFileService fileService;

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public CatalogFileResponse create(@Valid @RequestBody CatalogFileRequest req,
                                      @AuthenticationPrincipal VenzproPrincipal principal) {
        return fileService.create(req, principal.organizationId());
    }

    @GetMapping
    public List<CatalogFileResponse> findAll(@AuthenticationPrincipal VenzproPrincipal principal) {
        return fileService.findAll(principal.organizationId());
    }

    @GetMapping("/company/{companyId}")
    public List<CatalogFileResponse> findByCompany(@PathVariable UUID companyId,
                                                    @AuthenticationPrincipal VenzproPrincipal principal) {
        return fileService.findByCompany(companyId, principal.organizationId());
    }

    @GetMapping("/{id}")
    public CatalogFileResponse findById(@PathVariable UUID id,
                                        @AuthenticationPrincipal VenzproPrincipal principal) {
        return fileService.findById(id, principal.organizationId());
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable UUID id,
                       @AuthenticationPrincipal VenzproPrincipal principal) {
        fileService.delete(id, principal.organizationId());
    }
}
