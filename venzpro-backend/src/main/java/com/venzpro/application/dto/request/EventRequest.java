package com.venzpro.application.dto.request;

import com.venzpro.domain.enums.EventStatus;
import com.venzpro.domain.enums.EventType;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

public record EventRequest(
    @NotBlank(message = "Título obrigatório") @Size(max = 200) String titulo,
    @NotNull(message = "Tipo obrigatório") EventType tipo,
    @NotNull(message = "Data de início obrigatória") LocalDateTime dataInicio,
    LocalDateTime dataFim,
    UUID customerId,
    UUID companyId,
    @Size(max = 2000) String descricao,
    @NotNull(message = "Status obrigatório") EventStatus status,
    List<@Email(message = "Email de participante inválido") String> participantes
) {}
