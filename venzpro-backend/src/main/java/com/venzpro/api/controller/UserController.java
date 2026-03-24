package com.venzpro.api.controller;

import com.venzpro.application.dto.request.UpdateUserAccessRequest;
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

    /** Lista todos os usuários ativos da organização. */
    @GetMapping
    public List<UserResponse> findAll(@AuthenticationPrincipal VenzproPrincipal principal) {
        return userService.findByOrganization(principal.organizationId());
    }

    /**
     * Retorna o perfil completo do usuário autenticado,
     * incluindo permissões granulares e flag de onboarding.
     * Chamado pelo frontend após atualizar dados do próprio usuário.
     */
    @GetMapping("/me")
    public UserResponse me(@AuthenticationPrincipal VenzproPrincipal principal) {
        return userService.findById(principal.userId(), principal.organizationId());
    }

    /** Retorna um usuário específico da organização. */
    @GetMapping("/{id}")
    public UserResponse findById(
            @PathVariable UUID id,
            @AuthenticationPrincipal VenzproPrincipal principal) {
        return userService.findById(id, principal.organizationId());
    }

    /**
     * Atualiza cargo e permissões granulares de um usuário.
     * Apenas ADMIN pode executar.
     */
    @PatchMapping("/{id}/access")
    @PreAuthorize("hasRole('ADMIN')")
    public UserResponse updateAccess(
            @PathVariable UUID id,
            @Valid @RequestBody UpdateUserAccessRequest req,
            @AuthenticationPrincipal VenzproPrincipal principal) {
        return userService.updateAccess(id, principal.organizationId(), req);
    }

    /**
     * Marca o onboarding do usuário autenticado como concluído.
     *
     * Regra 5: o onboarding é obrigatório e seu estado persiste no banco.
     * O frontend exibe o banner enquanto {@code onboardingCompleted = false}.
     * Após chamar este endpoint, o frontend deve chamar {@code refreshUser()}.
     */
    @PatchMapping("/me/onboarding/complete")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void completeOnboarding(@AuthenticationPrincipal VenzproPrincipal principal) {
        userService.completeOnboarding(principal.userId(), principal.organizationId());
    }

    /**
     * Remove um usuário da organização (soft-delete).
     * Apenas ADMIN pode executar. Protege o último admin da organização.
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
