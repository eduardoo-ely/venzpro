package com.venzpro.api.controller;

import com.venzpro.application.dto.request.UpdateUserRoleRequest;
import com.venzpro.application.dto.response.UserResponse;
import com.venzpro.application.service.UserService;
import com.venzpro.config.security.VenzproPrincipal;
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

    /** Lista todos os usuários da organização do token */
    @GetMapping
    public List<UserResponse> findAll(@AuthenticationPrincipal VenzproPrincipal principal) {
        return userService.findByOrganization(principal.organizationId());
    }

    /** Busca um usuário por ID — só da mesma organização */
    @GetMapping("/{id}")
    public UserResponse findById(@PathVariable UUID id,
                                 @AuthenticationPrincipal VenzproPrincipal principal) {
        return userService.findById(id, principal.organizationId());
    }

    /** Altera a role de um usuário — somente ADMIN */
    @PatchMapping("/{id}/role")
    @PreAuthorize("hasRole('ADMIN')")
    public UserResponse updateRole(@PathVariable UUID id,
                                   @Valid @RequestBody UpdateUserRoleRequest req,
                                   @AuthenticationPrincipal VenzproPrincipal principal) {
        return userService.updateRole(id, principal.organizationId(), req);
    }

    /** Remove um usuário — somente ADMIN */
    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("hasRole('ADMIN')")
    public void delete(@PathVariable UUID id,
                       @AuthenticationPrincipal VenzproPrincipal principal) {
        userService.delete(id, principal.organizationId());
    }
}
