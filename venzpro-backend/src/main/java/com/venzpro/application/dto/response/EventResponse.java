package com.venzpro.application.dto.response;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.venzpro.domain.entity.Event;
import com.venzpro.domain.enums.EventStatus;
import com.venzpro.domain.enums.EventType;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

public record EventResponse(
        UUID id,
        UUID userId,
        UUID customerId,
        String clienteNome,
        UUID companyId,
        String empresaNome,
        UUID organizationId,
        EventType tipo,
        String titulo,
        String descricao,

        @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
        LocalDateTime dataInicio,

        @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
        LocalDateTime dataFim,

        EventStatus status,
        List<String> participantes,

        @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
        LocalDateTime createdAt
) {
    public static EventResponse from(Event e) {
        return new EventResponse(
                e.getId(),
                e.getUser().getId(),
                e.getCustomer() != null ? e.getCustomer().getId()   : null,
                e.getCustomer() != null ? e.getCustomer().getNome() : null,
                e.getCompany()  != null ? e.getCompany().getId()    : null,
                e.getCompany()  != null ? e.getCompany().getNome()  : null,
                e.getOrganization().getId(),
                e.getTipo(),
                e.getTitulo(),
                e.getDescricao(),
                e.getDataInicio(),
                e.getDataFim(),
                e.getStatus(),
                e.getParticipantes() != null ? new ArrayList<>(e.getParticipantes()) : new ArrayList<>(),
                e.getCreatedAt()
        );
    }
}