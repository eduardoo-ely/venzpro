package com.venzpro.application.service;

import com.venzpro.application.dto.request.InviteRequest;
import com.venzpro.application.dto.response.UserResponse;
import com.venzpro.infrastructure.security.TenantContext;
import com.venzpro.infrastructure.exception.BusinessException;
import com.venzpro.infrastructure.exception.ResourceNotFoundException;
import com.venzpro.domain.entity.User;
import com.venzpro.domain.enums.UserRole;
import com.venzpro.domain.repository.OrganizationRepository;
import com.venzpro.domain.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.util.Base64;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class InviteService {

    private final UserRepository         userRepository;
    private final OrganizationRepository organizationRepository;
    private final PasswordEncoder        passwordEncoder;

    @Transactional
    public UserResponse invite(InviteRequest req) {
        UUID orgId = TenantContext.get();

        if (userRepository.existsByEmail(req.email())) {
            throw new BusinessException("Email já cadastrado: " + req.email());
        }

        var org = organizationRepository.findById(orgId)
                .orElseThrow(() -> new ResourceNotFoundException("Organização", orgId));

        String tempPassword = generateSecureToken(12);

        var user = User.builder()
                .nome(req.nome())
                .email(req.email())
                .senha(passwordEncoder.encode(tempPassword))
                .role(req.role() != null ? req.role() : UserRole.VENDEDOR)
                .organization(org)
                .mustChangePassword(true)
                .build();

        user = userRepository.save(user);

        return UserResponse.from(user);
    }

    private String generateSecureToken(int length) {
        byte[] bytes = new byte[length];
        new SecureRandom().nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes).substring(0, length);
    }
}
