package com.venzpro.application.dto.response;

import com.venzpro.domain.entity.Order;
import com.venzpro.domain.enums.OrderStatus;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

public record OrderResponse(
    UUID id,
    UUID customerId,
    String clienteNome,
    UUID companyId,
    String empresaNome,
    UUID userId,
    String vendedorNome,
    UUID organizationId,
    BigDecimal valorTotal,
    OrderStatus status,
    String descricao,
    List<OrderItemResponse> items,
    UUID canceladoPor,
    OffsetDateTime canceladoEm,
    String motivoCancelamento,
    LocalDateTime createdAt
) {
    public static OrderResponse from(Order o) {
        return new OrderResponse(
            o.getId(),
            o.getCustomer().getId(),
            o.getCustomer().getNome(),
            o.getCompany().getId(),
            o.getCompany().getNome(),
            o.getUser().getId(),
            o.getUser().getNome(),
            o.getOrganization().getId(),
            o.getValorTotal(),
            o.getStatus(),
            o.getDescricao(),
            o.getItens().stream().map(OrderItemResponse::from).toList(),
            o.getCanceladoPor() != null ? o.getCanceladoPor().getId() : null,
            o.getCanceladoEm(),
            o.getMotivoCancelamento(),
            o.getCreatedAt()
        );
    }
}