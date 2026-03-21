package com.venzpro.application.service;

import com.venzpro.application.dto.request.InviteRequest;
import com.venzpro.application.dto.response.UserResponse;
import com.venzpro.config.security.TenantContext;
import com.venzpro.domain.entity.User;
import com.venzpro.domain.enums.UserRole;
import com.venzpro.domain.repository.OrganizationRepository;
import com.venzpro.domain.repository.UserRepository;
import com.venzpro.exception.BusinessException;
import com.venzpro.exception.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.util.Base64;
import java.util.UUID;

/**
 * Serviço de convite de novos usuários para uma organização.
 *
 * Fluxo de múltiplos usuários por organização:
 *
 * 1. ADMIN chama POST /api/users/invite com { nome, email, role }
 * 2. Sistema cria o User com senha temporária aleatória
 * 3. [TODO] Envio de e-mail com link de definição de senha
 * 4. Usuário convidado acessa o link, define sua senha
 * 5. Login normal com JWT — organizationId do token isola seus dados
 *
 * Todos os usuários criados herdam o organizationId do ADMIN que convida.
 * É impossível criar um usuário em outra organização.
 */
@Service
@RequiredArgsConstructor
public class InviteService {

    private final UserRepository         userRepository;
    private final OrganizationRepository organizationRepository;
    private final PasswordEncoder        passwordEncoder;

    @Transactional
    public UserResponse invite(InviteRequest req) {
        UUID orgId = TenantContext.get();   // organização do ADMIN que está convidando

        if (userRepository.existsByEmail(req.email())) {
            throw new BusinessException("Email já cadastrado: " + req.email());
        }

        var org = organizationRepository.findById(orgId)
                .orElseThrow(() -> new ResourceNotFoundException("Organização", orgId));

        // Senha temporária — usuário deverá redefinir no primeiro acesso
        String tempPassword = generateSecureToken(12);

        var user = User.builder()
                .nome(req.nome())
                .email(req.email())
                .senha(passwordEncoder.encode(tempPassword))
                .role(req.role() != null ? req.role() : UserRole.VENDEDOR)
                .organization(org)
                .mustChangePassword(true)   // flag para forçar troca na próxima sessão
                .build();

        user = userRepository.save(user);

        // TODO: enviar e-mail com link de ativação contendo token de redefinição
        // emailService.sendInvite(user.getEmail(), tempPassword, org.getNome());

        return UserResponse.from(user);
    }

    private String generateSecureToken(int length) {
        byte[] bytes = new byte[length];
        new SecureRandom().nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes).substring(0, length);
    }
}
