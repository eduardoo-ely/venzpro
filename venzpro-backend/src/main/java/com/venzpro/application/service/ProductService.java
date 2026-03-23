package com.venzpro.application.service;

import com.venzpro.application.dto.request.PatchPriceRequest;
import com.venzpro.application.dto.request.ProductRequest;
import com.venzpro.application.dto.response.ProductResponse;
import com.venzpro.infrastructure.security.TenantContext;
import com.venzpro.infrastructure.exception.ResourceNotFoundException;
import com.venzpro.domain.entity.Product;
import com.venzpro.domain.repository.CompanyRepository;
import com.venzpro.domain.repository.OrganizationRepository;
import com.venzpro.domain.repository.ProductRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class ProductService {

    private final ProductRepository      productRepository;
    private final CompanyRepository      companyRepository;
    private final OrganizationRepository organizationRepository;

    // ── Criar produto (organizationId sempre vem do JWT via controller) ───────

    @Transactional
    public ProductResponse create(ProductRequest req, UUID organizationId) {
        // Garante que a organização existe
        organizationRepository.findById(organizationId)
                .orElseThrow(() -> new ResourceNotFoundException("Organização", organizationId));

        var company = req.companyId() != null
                ? companyRepository.findByIdAndOrganizationId(req.companyId(), organizationId)
                        .orElseThrow(() -> new ResourceNotFoundException("Empresa", req.companyId()))
                : null;

        var product = Product.builder()
                .nome(req.nome())
                .descricao(req.descricao())
                .precoBase(req.precoBase())
                .unidade(req.unidade())
                .codigoSku(req.codigoSku())
                .company(company)
                .build();

        product.setOrganizationId(organizationId);

        var saved = productRepository.save(product);
        log.info("Produto criado: {} na org: {}", saved.getId(), organizationId);
        return ProductResponse.from(saved);
    }

    @Transactional(readOnly = true)
    public Page<ProductResponse> findAll(Pageable pageable) {
        UUID orgId = TenantContext.get();
        return productRepository
                .findAllByOrganizationIdAndAtivoTrue(orgId, pageable)
                .map(ProductResponse::from);
    }

    @Transactional(readOnly = true)
    public Page<ProductResponse> findByCompany(UUID companyId, Pageable pageable) {
        UUID orgId = TenantContext.get();
        companyRepository.findByIdAndOrganizationId(companyId, orgId)
                .orElseThrow(() -> new ResourceNotFoundException("Empresa", companyId));
        return productRepository
                .findAllByOrganizationIdAndCompanyIdAndAtivoTrue(orgId, companyId, pageable)
                .map(ProductResponse::from);
    }

    @Transactional(readOnly = true)
    public Page<ProductResponse> search(String termo, Pageable pageable) {
        UUID orgId = TenantContext.get();
        return productRepository.searchByTermo(orgId, termo, pageable)
                .map(ProductResponse::from);
    }

    @Transactional(readOnly = true)
    public ProductResponse findById(UUID id) {
        UUID orgId = TenantContext.get();
        return productRepository.findByIdAndOrganizationId(id, orgId)
                .map(ProductResponse::from)
                .orElseThrow(() -> new ResourceNotFoundException("Produto", id));
    }

    @Transactional
    public ProductResponse update(UUID id, ProductRequest req) {
        UUID orgId = TenantContext.get();

        var product = productRepository.findByIdAndOrganizationId(id, orgId)
                .orElseThrow(() -> new ResourceNotFoundException("Produto", id));

        var company = req.companyId() != null
                ? companyRepository.findByIdAndOrganizationId(req.companyId(), orgId)
                        .orElseThrow(() -> new ResourceNotFoundException("Empresa", req.companyId()))
                : null;

        product.setNome(req.nome());
        product.setDescricao(req.descricao());
        product.setUnidade(req.unidade());
        product.setCompany(company);
        product.alterarPreco(req.precoBase());

        return ProductResponse.from(productRepository.save(product));
    }

    @Transactional
    public ProductResponse patchPrice(UUID id, PatchPriceRequest req) {
        UUID orgId = TenantContext.get();

        int updated = productRepository.updatePrecoByIdAndOrganizationId(
                id, orgId, req.novoPreco()
        );

        if (updated == 0) {
            throw new ResourceNotFoundException("Produto", id);
        }

        log.info("Preço do produto {} alterado para {} na org {}", id, req.novoPreco(), orgId);

        return productRepository.findByIdAndOrganizationId(id, orgId)
                .map(ProductResponse::from)
                .orElseThrow(() -> new ResourceNotFoundException("Produto", id));
    }

    @Transactional
    public void delete(UUID id) {
        UUID orgId = TenantContext.get();

        var product = productRepository.findByIdAndOrganizationId(id, orgId)
                .orElseThrow(() -> new ResourceNotFoundException("Produto", id));

        product.desativar();
        productRepository.save(product);
        log.info("Produto {} desativado (soft-delete) na org {}", id, orgId);
    }

    @Transactional(readOnly = true)
    public long countAtivos() {
        return productRepository.countByOrganizationIdAndAtivoTrue(TenantContext.get());
    }
}
