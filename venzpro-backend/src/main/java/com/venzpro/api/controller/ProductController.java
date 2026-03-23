package com.venzpro.api.controller;

import com.venzpro.application.dto.request.PatchPriceRequest;
import com.venzpro.application.dto.request.ProductRequest;
import com.venzpro.application.dto.response.ProductResponse;
import com.venzpro.application.service.ProductImportExportService;
import com.venzpro.application.service.ProductService;
import com.venzpro.infrastructure.security.VenzproPrincipal;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.UUID;

@RestController
@RequestMapping("/api/products")
@RequiredArgsConstructor
public class ProductController {

    private final ProductService productService;
    private final ProductImportExportService importExportService;

    // ── CRUD ──────────────────────────────────────────────────────────────────

    /**
     * Cria um novo produto no catálogo da organização autenticada.
     * organizationId vem do JWT — nunca do corpo da requisição.
     */
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ProductResponse create(
            @Valid @RequestBody ProductRequest request,
            @AuthenticationPrincipal VenzproPrincipal principal) {
        return productService.create(request, principal.organizationId());
    }

    @GetMapping
    public Page<ProductResponse> findAll(Pageable pageable) {
        return productService.findAll(pageable);
    }

    @GetMapping("/search")
    public Page<ProductResponse> search(
            @RequestParam String termo,
            Pageable pageable) {
        return productService.search(termo, pageable);
    }

    @GetMapping("/{id}")
    public ProductResponse findById(@PathVariable UUID id) {
        return productService.findById(id);
    }

    @PutMapping("/{id}")
    public ProductResponse update(
            @PathVariable UUID id,
            @Valid @RequestBody ProductRequest request) {
        return productService.update(id, request);
    }

    /**
     * Apenas ADMIN e GERENTE podem alterar o preço base do catálogo.
     */
    @PatchMapping("/{id}/price")
    @PreAuthorize("hasAnyRole('ADMIN', 'GERENTE')")
    public ProductResponse patchPrice(
            @PathVariable UUID id,
            @Valid @RequestBody PatchPriceRequest request) {
        return productService.patchPrice(id, request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable UUID id) {
        productService.delete(id);
    }

    // ── IMPORTAÇÃO E EXPORTAÇÃO ───────────────────────────────────────────────

    /**
     * Importação assíncrona de produtos via CSV.
     * organizationId passado explicitamente para evitar perda de contexto no @Async.
     */
    @PostMapping(value = "/import", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<String> importCsv(
            @RequestParam("file") MultipartFile file,
            @AuthenticationPrincipal VenzproPrincipal principal) {
        importExportService.importProductsAsync(file, principal.organizationId());
        return ResponseEntity.accepted()
                .body("Importação iniciada. Catálogo atualizado em breve.");
    }

    @GetMapping(
            value  = "/export",
            produces = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    )
    public ResponseEntity<byte[]> exportExcel(
            @AuthenticationPrincipal VenzproPrincipal principal) {
        byte[] excel = importExportService.exportProductsToExcel(principal.organizationId());
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"catalogo_produtos.xlsx\"")
                .body(excel);
    }
}
