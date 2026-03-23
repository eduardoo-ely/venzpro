package com.venzpro.api.controller;

import com.venzpro.application.dto.request.InviteRequest;
import com.venzpro.application.dto.response.UserResponse;
import com.venzpro.application.service.InviteService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/invites")
@RequiredArgsConstructor
public class InviteController {

    private final InviteService inviteService;

    /**
     * Convida um novo usuário para a organização.
     * Apenas ADMIN pode convidar — gera senha temporária.
     * Usuário criado com mustChangePassword=true.
     */
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasRole('ADMIN')")
    public UserResponse invite(@Valid @RequestBody InviteRequest req) {
        return inviteService.invite(req);
    }
}