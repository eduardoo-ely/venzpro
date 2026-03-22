// ─────────────────────────────────────────────────────────────────────────────
// FILE: ProductRequest.java
// ─────────────────────────────────────────────────────────────────────────────
package com.venzpro.application.dto.request;

import com.venzpro.domain.enums.UnidadeMedida;
import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.util.UUID;

/**
 * DTO de entrada para criação e actualização de produtos.
 * Bean Validation garante que valores inválidos são rejeitados com HTTP 400.
 */
public record ProductRequest(

        /** Empresa à qual o produto pertence. NULL = catálogo global da org. */
        UUID companyId,

        @NotBlank(message = "Nome é obrigatório")
        @Size(max = 200, message = "Nome deve ter no máximo 200 caracteres")
        String nome,

        @Size(max = 5000, message = "Descrição demasiado longa")
        String descricao,

        @NotNull(message = "Preço base é obrigatório")
        @DecimalMin(value = "0.0", message = "Preço não pode ser negativo")
        @Digits(integer = 11, fraction = 4, message = "Formato de preço inválido")
        BigDecimal precoBase,

        @NotNull(message = "Unidade de medida é obrigatória")
        UnidadeMedida unidade,

        @Size(max = 100, message = "SKU deve ter no máximo 100 caracteres")
        String codigoSku

) {}


// ─────────────────────────────────────────────────────────────────────────────
// FILE: PatchPriceRequest.java
// ─────────────────────────────────────────────────────────────────────────────
package com.venzpro.application.dto.request;

import jakarta.validation.constraints.*;
        import java.math.BigDecimal;

/**
 * DTO específico para PATCH /api/products/{id}/price
 * Endpoint restrito a ADMIN e GERENTE (RBAC via @PreAuthorize).
 */
public record PatchPriceRequest(

        @NotNull(message = "Novo preço é obrigatório")
        @DecimalMin(value = "0.0", message = "Preço não pode ser negativo")
        @Digits(integer = 11, fraction = 4, message = "Formato de preço inválido")
        BigDecimal novoPreco

) {}


// ─────────────────────────────────────────────────────────────────────────────
// FILE: ProductResponse.java
// ─────────────────────────────────────────────────────────────────────────────
package com.venzpro.application.dto.response;

import com.venzpro.domain.entity.Product;
import com.venzpro.domain.enums.UnidadeMedida;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

/**
 * DTO de saída para produtos.
 * Expõe apenas os campos necessários ao frontend — nunca a entidade JPA directamente.
 */
public record ProductResponse(
        UUID         id,
        UUID         organizationId,
        UUID         companyId,
        String       empresaNome,
        String       nome,
        String       descricao,
        BigDecimal   precoBase,
        UnidadeMedida unidade,
        Boolean      ativo,
        String       codigoSku,
        Instant      createdAt,
        Instant      updatedAt
) {
    /** Factory method — converte entidade para DTO de forma centralizada. */
    public static ProductResponse from(Product p) {
        return new ProductResponse(
                p.getId(),
                p.getOrganizationId(),
                p.getCompany() != null ? p.getCompany().getId() : null,
                p.getCompany() != null ? p.getCompany().getNome() : null,
                p.getNome(),
                p.getDescricao(),
                p.getPrecoBase(),
                p.getUnidade(),
                p.getAtivo(),
                p.getCodigoSku() != null ? p.getCodigoSku().toString() : null,
                p.getCreatedAt(),
                p.getUpdatedAt()
        );
    }
}