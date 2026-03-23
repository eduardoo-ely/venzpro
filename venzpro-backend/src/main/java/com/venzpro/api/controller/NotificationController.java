package com.venzpro.api.controller;

import com.venzpro.application.dto.response.NotificationResponse;
import com.venzpro.domain.repository.NotificationRepository;
import com.venzpro.infrastructure.security.VenzproPrincipal;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/notifications")
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationRepository notificationRepository;

    @GetMapping
    public Page<NotificationResponse> getUnread(
            @AuthenticationPrincipal VenzproPrincipal principal,
            Pageable pageable) {

        return notificationRepository
                .findAllByUserIdAndLidaFalseOrderByCreatedAtDesc(
                        principal.userId(), pageable)
                .map(NotificationResponse::from);
    }

    @GetMapping("/count")
    public long countUnread(
            @AuthenticationPrincipal VenzproPrincipal principal) {
        return notificationRepository
                .countByUserIdAndLidaFalse(principal.userId());
    }

    @PatchMapping("/{id}/read")
    public void markAsRead(
            @PathVariable UUID id,
            @AuthenticationPrincipal VenzproPrincipal principal) {

        notificationRepository.findById(id).ifPresent(n -> {
            if (n.getUser().getId().equals(principal.userId())) {
                n.setLida(true);
                notificationRepository.save(n);
            }
        });
    }
}