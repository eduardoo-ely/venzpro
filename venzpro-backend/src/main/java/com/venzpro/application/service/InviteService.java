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
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.util.Base64;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class InviteService {

    private final UserRepository         userRepository;
    private final OrganizationRepository organizationRepository;
    private final PasswordEncoder        passwordEncoder;

    /**
     * Cria um novo usuário na organização do ADMIN autenticado.
     *
     * Gera uma senha temporária segura.
     * O usuário criado terá mustChangePassword=true para forçar troca no primeiro acesso.
     *
     * Regra de negócio: organizationId vem sempre do JWT (TenantContext),
     * nunca do corpo da requisição.
     */
    @Transactional
    public UserResponse invite(InviteRequest req) {
        UUID orgId = TenantContext.get();

        String emailNormalizado = req.email().toLowerCase().trim();

        if (userRepository.existsByEmail(emailNormalizado)) {
            throw new BusinessException("Email já cadastrado: " + emailNormalizado);
        }

        var org = organizationRepository.findById(orgId)
                .orElseThrow(() -> new ResourceNotFoundException("Organização", orgId));

        // Gera senha temporária segura (12 chars, URL-safe)
        String tempPassword = generateSecureToken(12);

        var user = User.builder()
                .nome(req.nome())
                .email(emailNormalizado)
                .senha(passwordEncoder.encode(tempPassword))
                .role(req.role() != null ? req.role() : UserRole.VENDEDOR)
                .organization(org)
                .mustChangePassword(true)
                // Permissões padrão — podem ser ajustadas pelo ADMIN depois
                .podeAprovar(false)
                .podeExportar(false)
                .podeVerDashboard(false)
                .build();

        user = userRepository.save(user);

        log.info(
            "Usuário convidado: {} ({}) na org {} pelo ADMIN",
            user.getEmail(), user.getRole(), orgId
        );

        // TODO: enviar e-mail com senha temporária (integração futura)
        // emailService.sendInvite(user.getEmail(), tempPassword);

        return UserResponse.from(user);
    }

    private String generateSecureToken(int length) {
        byte[] bytes = new byte[length];
        new SecureRandom().nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes).substring(0, length);
    }
}
