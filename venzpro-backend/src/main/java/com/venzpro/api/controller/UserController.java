package com.venzpro.api.controller;

import com.venzpro.application.dto.response.UserResponse;
import com.venzpro.application.service.UserService;
import com.venzpro.infrastructure.security.VenzproPrincipal;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    /**
     * Lista todos os usuários da organização.
     * Qualquer usuário autenticado pode ver a equipe.
     */
    @GetMapping
    public List<UserResponse> findAll(@AuthenticationPrincipal VenzproPrincipal principal) {
        return userService.findByOrganization(principal.organizationId());
    }

    /**
     * Retorna o perfil completo do usuário autenticado,
     * incluindo todas as permissões granulares.
     * Usado pelo frontend para atualizar o contexto de autenticação.
     */
    @GetMapping("/me")
    public UserResponse me(@AuthenticationPrincipal VenzproPrincipal principal) {
        return userService.findById(principal.userId(), principal.organizationId());
    }

    /**
     * Retorna um usuário específico da organização.
     */
    @GetMapping("/{id}")
    public UserResponse findById(
            @PathVariable UUID id,
            @AuthenticationPrincipal VenzproPrincipal principal) {
        return userService.findById(id, principal.organizationId());
    }

    /**
     * Atualiza cargo e permissões granulares de um usuário.
     * Apenas ADMIN pode executar esta ação.
     */
    @PatchMapping("/{id}/access")
    @PreAuthorize("hasRole('ADMIN')")
    public UserResponse updateAccess(
            @PathVariable UUID id,
            @Valid @RequestBody com.venzpro.application.dto.request.UpdateUserAccessRequest req,
            @AuthenticationPrincipal VenzproPrincipal principal) {
        return userService.updateAccess(id, principal.organizationId(), req);
    }

    /**
     * Remove um usuário da organização.
     * Apenas ADMIN pode executar esta ação.
     */
    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("hasRole('ADMIN')")
    public void delete(
            @PathVariable UUID id,
            @AuthenticationPrincipal VenzproPrincipal principal) {
        userService.delete(id, principal.organizationId());
    }
}
