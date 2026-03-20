package com.venzpro.application.dto.response;

import com.venzpro.domain.entity.Order;
import com.venzpro.domain.enums.OrderStatus;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

public record OrderResponse(
    UUID id,
    UUID customerId, String clienteNome,
    UUID companyId,  String empresaNome,
    UUID userId,     String vendedorNome,
    UUID organizationId,
    BigDecimal valorTotal, OrderStatus status,
    String descricao, LocalDateTime createdAt
) {
    public static OrderResponse from(Order o) {
        return new OrderResponse(
            o.getId(),
            o.getCustomer().getId(), o.getCustomer().getNome(),
            o.getCompany().getId(),  o.getCompany().getNome(),
            o.getUser().getId(),     o.getUser().getNome(),
            o.getOrganization().getId(),
            o.getValorTotal(), o.getStatus(), o.getDescricao(), o.getCreatedAt()
        );
    }
}
