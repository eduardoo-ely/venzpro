package com.venzpro.application.dto.response;

import com.venzpro.domain.entity.Notification;
import java.time.OffsetDateTime; // <-- Mudamos para OffsetDateTime
import java.util.UUID;

public record NotificationResponse(
        UUID id,
        String titulo,
        String mensagem,
        boolean lida,
        OffsetDateTime createdAt // <-- Mudamos aqui também
) {
    public static NotificationResponse from(Notification n) {
        return new NotificationResponse(
                n.getId(),
                n.getTitulo(),
                n.getMensagem(),
                n.isLida(),
                n.getCreatedAt()
        );
    }
}