package com.venzpro.api.controller;

import com.venzpro.application.dto.request.OrderRequest;
import com.venzpro.application.dto.response.OrderResponse;
import com.venzpro.application.service.OrderService;
import com.venzpro.infrastructure.security.VenzproPrincipal;
import com.venzpro.domain.enums.OrderStatus;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/orders")
@RequiredArgsConstructor
public class OrderController {

    private final OrderService orderService;

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public OrderResponse create(@Valid @RequestBody OrderRequest req,
                                @AuthenticationPrincipal VenzproPrincipal principal) {
        return orderService.create(req, principal.userId(), principal.organizationId());
    }

    @GetMapping
    public List<OrderResponse> findAll(@RequestParam(required = false) OrderStatus status,
                                       @AuthenticationPrincipal VenzproPrincipal principal) {
        return orderService.findAll(principal.organizationId(), status);
    }

    @GetMapping("/{id}")
    public OrderResponse findById(@PathVariable UUID id,
                                  @AuthenticationPrincipal VenzproPrincipal principal) {
        return orderService.findById(id, principal.organizationId());
    }

    @PatchMapping("/{id}/status")
    public OrderResponse updateStatus(@PathVariable UUID id,
                                      @RequestParam OrderStatus status,
                                      @AuthenticationPrincipal VenzproPrincipal principal) {
        return orderService.updateStatus(id, status, principal.organizationId());
    }

    @PutMapping("/{id}")
    public OrderResponse update(@PathVariable UUID id,
                                @Valid @RequestBody OrderRequest req,
                                @AuthenticationPrincipal VenzproPrincipal principal) {
        return orderService.update(id, req, principal.userId(), principal.organizationId());
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable UUID id,
                       @AuthenticationPrincipal VenzproPrincipal principal) {
        orderService.delete(id, principal.organizationId());
    }
}
