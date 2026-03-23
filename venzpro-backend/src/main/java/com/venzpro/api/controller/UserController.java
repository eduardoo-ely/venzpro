package com.venzpro.api.controller;

import com.venzpro.application.dto.request.UpdateUserRoleRequest;
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

    @GetMapping
    public List<UserResponse> findAll(@AuthenticationPrincipal VenzproPrincipal principal) {
        return userService.findByOrganization(principal.organizationId());
    }

    @GetMapping("/me")
    public UserResponse me(@AuthenticationPrincipal VenzproPrincipal principal) {
        return userService.findById(principal.userId(), principal.organizationId());
    }

    @GetMapping("/{id}")
    public UserResponse findById(@PathVariable UUID id,
                                 @AuthenticationPrincipal VenzproPrincipal principal) {
        return userService.findById(id, principal.organizationId());
    }

    @PatchMapping("/{id}/access")
    @org.springframework.security.access.prepost.PreAuthorize("hasRole('ADMIN')")
    public UserResponse updateAccess(
            @PathVariable UUID id,
            @jakarta.validation.Valid @RequestBody com.venzpro.application.dto.request.UpdateUserAccessRequest req,
            @org.springframework.security.core.annotation.AuthenticationPrincipal com.venzpro.infrastructure.security.VenzproPrincipal principal) {
        return userService.updateAccess(id, principal.organizationId(), req);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("hasRole('ADMIN')")
    public void delete(@PathVariable UUID id,
                       @AuthenticationPrincipal VenzproPrincipal principal) {
        userService.delete(id, principal.organizationId());
    }
}
