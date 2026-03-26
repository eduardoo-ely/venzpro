package com.venzpro.api.controller;

import com.venzpro.application.dto.request.OrderRequest;
import com.venzpro.application.dto.request.OrderStatusRequest;
import com.venzpro.application.dto.response.OrderResponse;
import com.venzpro.application.service.OrderService;
import com.venzpro.domain.enums.UserRole;
import com.venzpro.infrastructure.security.VenzproPrincipal;
import com.venzpro.domain.enums.OrderStatus;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/orders")
@RequiredArgsConstructor
public class OrderController {

    private final OrderService orderService;

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public OrderResponse create(
            @Valid @RequestBody OrderRequest req,
            @AuthenticationPrincipal VenzproPrincipal principal) {
        return orderService.create(req, principal.userId(), principal.organizationId());
    }

    @GetMapping
    public ResponseEntity<Page<OrderResponse>> findAll(
            @RequestParam(required = false) OrderStatus status,
            @AuthenticationPrincipal VenzproPrincipal principal,
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {

        Page<OrderResponse> page = orderService.findAll(
                principal.organizationId(),
                principal.userId(),
                UserRole.valueOf(principal.role()),
                status,
                pageable
        );
        return ResponseEntity.ok(page);
    }

    @GetMapping("/{id}")
    public OrderResponse findById(
            @PathVariable UUID id,
            @AuthenticationPrincipal VenzproPrincipal principal) {
        return orderService.findById(id, principal.organizationId(), principal.userId(), UserRole.valueOf(principal.role()));
    }

    @PutMapping("/{id}")
    public OrderResponse update(
            @PathVariable UUID id,
            @Valid @RequestBody OrderRequest req,
            @AuthenticationPrincipal VenzproPrincipal principal) {
        return orderService.update(id, req, principal.userId(), principal.organizationId(), UserRole.valueOf(principal.role()));
    }

    @PatchMapping("/{id}/status")
    public OrderResponse updateStatus(
            @PathVariable UUID id,
            @Valid @RequestBody OrderStatusRequest req,
            @AuthenticationPrincipal VenzproPrincipal principal) {
        return orderService.updateStatus(
                id,
                principal.userId(),
                principal.organizationId(),
                UserRole.valueOf(principal.role()),
                req
        );
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(
            @PathVariable UUID id,
            @AuthenticationPrincipal VenzproPrincipal principal) {
        orderService.delete(id, principal.organizationId(), principal.userId(), UserRole.valueOf(principal.role()));
    }
}