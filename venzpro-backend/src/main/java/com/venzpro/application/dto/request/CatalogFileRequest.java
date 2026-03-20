package com.venzpro.application.dto.request;

import com.venzpro.domain.enums.FileType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import java.util.UUID;

public record CatalogFileRequest(
    @NotNull(message = "Empresa obrigatória") UUID companyId,
    @NotBlank(message = "Nome obrigatório") String nome,
    @NotBlank(message = "URL obrigatória")
    @Pattern(regexp = "^https?://.*", message = "URL deve começar com http:// ou https://")
    String url,
    @NotNull(message = "Tipo obrigatório") FileType tipo
) {}
