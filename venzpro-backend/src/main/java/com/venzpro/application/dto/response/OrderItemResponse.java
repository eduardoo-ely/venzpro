package com.venzpro.application.dto.response;

import com.venzpro.domain.entity.OrderItem;

import java.math.BigDecimal;
import java.util.UUID;

public record OrderItemResponse(
    UUID id,
    UUID productId,
    String nomeProduto,
    BigDecimal quantidade,
    BigDecimal precoUnitario,
    BigDecimal subtotal
) {
    public static OrderItemResponse from(OrderItem item) {
        BigDecimal subtotal = item.getPrecoUnitario().multiply(item.getQuantidade());
        return new OrderItemResponse(
            item.getId(),
            item.getProduct().getId(),
            item.getProduct().getNome(),
            item.getQuantidade(),
            item.getPrecoUnitario(),
            subtotal
        );
    }
}
