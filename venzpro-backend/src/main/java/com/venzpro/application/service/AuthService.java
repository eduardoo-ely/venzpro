package com.venzpro.application.service;

import com.venzpro.application.dto.request.LoginRequest;
import com.venzpro.application.dto.request.RegisterRequest;
import com.venzpro.application.dto.response.AuthResponse;
import com.venzpro.infrastructure.security.JwtService;
import com.venzpro.infrastructure.exception.BusinessException;
import com.venzpro.domain.entity.Organization;
import com.venzpro.domain.entity.User;
import com.venzpro.domain.enums.UserRole;
import com.venzpro.domain.repository.OrganizationRepository;
import com.venzpro.domain.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository         userRepository;
    private final OrganizationRepository organizationRepository;
    private final PasswordEncoder        passwordEncoder;
    private final JwtService             jwtService;
    private final AuditService           auditService;

    // ── LOGIN ─────────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public AuthResponse login(LoginRequest request) {
        String email = request.email().toLowerCase().trim();

        // A entidade User agora valida isEnabled() baseado no deletedAt
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new BadCredentialsException("Credenciais inválidas"));

        if (!passwordEncoder.matches(request.senha(), user.getSenha())) {
            log.warn("Tentativa de login com senha inválida para: {}", email);
            auditService.logError(null, null, AuditService.LOGIN_FAILED, "Email: " + email);
            throw new BadCredentialsException("Credenciais inválidas");
        }

        // Aceder diretamente ao ID da organização via BaseTenantEntity
        String token = jwtService.generateToken(
                user.getId(),
                user.getOrganizationId(),
                user.getEmail(),
                user.getRole().name()
        );

        log.info("Login bem-sucedido para usuário: {}", user.getId());
        auditService.log(
                user.getOrganizationId(), user.getId(),
                AuditService.LOGIN, "User", user.getId(), "Login: " + user.getEmail()
        );

        // Busca a entidade completa para o DTO de resposta
        Organization org = organizationRepository.findById(user.getOrganizationId())
                .orElseThrow(() -> new BusinessException("Erro de consistência: Organização não encontrada"));

        return buildAuthResponse(token, user, org);
    }

    // ── REGISTRO ──────────────────────────────────────────────────────────────

    @Transactional
    public AuthResponse register(RegisterRequest request) {
        String email = request.email().toLowerCase().trim();

        if (userRepository.existsByEmail(email)) {
            throw new BusinessException("Este email já está em uso.");
        }

        // 1. Cria a Organização
        Organization org = Organization.builder()
                .nome(request.nomeOrganizacao() != null && !request.nomeOrganizacao().isBlank()
                        ? request.nomeOrganizacao()
                        : "Org de " + request.nome())
                .tipo(request.tipoOrganizacao())
                .build();
        org = organizationRepository.save(org);

        // 2. Constrói o Utilizador
        User user = User.builder()
                .nome(request.nome())
                .email(email)
                .senha(passwordEncoder.encode(request.senha()))
                .role(UserRole.ADMIN)
                .onboardingCompleted(false) // Regra 5: Novo utilizador inicia onboarding
                .podeAprovar(true)
                .podeExportar(true)
                .podeVerDashboard(true)
                .build();

        // REGRA CRÍTICA: Definir explicitamente o organizationId por causa do insertable=false no User.java
        user.setOrganizationId(org.getId());

        user = userRepository.save(user);

        // 3. Gera Token
        String token = jwtService.generateToken(
                user.getId(),
                user.getOrganizationId(),
                user.getEmail(),
                user.getRole().name()
        );

        log.info("Novo usuário registrado: {} na organização: {}", user.getId(), org.getId());
        auditService.log(
                org.getId(), user.getId(),
                AuditService.REGISTER, "User", user.getId(), "Registro: " + user.getEmail()
        );

        return buildAuthResponse(token, user, org);
    }

    // ── PRIVADOS ──────────────────────────────────────────────────────────────

    private AuthResponse buildAuthResponse(String token, User user, Organization org) {
        return new AuthResponse(
                token,
                AuthResponse.UserData.from(user),
                new AuthResponse.OrganizationData(
                        org.getId().toString(),
                        org.getNome(),
                        org.getTipo()
                )
        );
    }
}