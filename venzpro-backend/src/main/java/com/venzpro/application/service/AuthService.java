package com.venzpro.application.service;

import com.venzpro.application.dto.request.LoginRequest;
import com.venzpro.application.dto.request.RegisterRequest;
import com.venzpro.application.dto.response.AuthResponse;
import com.venzpro.config.security.JwtService;
import com.venzpro.domain.entity.Organization;
import com.venzpro.domain.entity.User;
import com.venzpro.domain.enums.UserRole;
import com.venzpro.domain.repository.OrganizationRepository;
import com.venzpro.domain.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import com.venzpro.application.service.AuditService;
import com.venzpro.exception.BusinessException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Service de autenticação.
 *
 * ADICIONADO: resolve os problemas críticos:
 *  1. Senhas codificadas com BCrypt (passwordEncoder.encode)
 *  2. Verificação de senha com passwordEncoder.matches (nunca compara texto puro)
 *  3. Geração de JWT após autenticação bem-sucedida
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final OrganizationRepository organizationRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final AuditService auditService;

    // ----------------------------------------------------------------
    // LOGIN
    // ----------------------------------------------------------------

    /**
     * Autentica um usuário por email e senha.
     *
     * Fluxo:
     *  1. Busca o usuário pelo email
     *  2. Compara a senha com o hash BCrypt no banco
     *  3. Se válido, gera e retorna um JWT
     *
     * IMPORTANTE: tanto "email não encontrado" quanto "senha errada"
     * retornam a mesma mensagem genérica — isso evita enumeration attack
     * (atacante descobrir quais emails existem no sistema).
     */
    @Transactional(readOnly = true)
    public AuthResponse login(LoginRequest request) {
        // Busca usuário — exceção genérica se não encontrado
        User user = userRepository.findByEmail(request.email())
                .orElseThrow(() -> new BadCredentialsException("Credenciais inválidas"));

        // Verifica senha com BCrypt — NUNCA compare texto puro
        if (!passwordEncoder.matches(request.senha(), user.getSenha())) {
            log.warn("Tentativa de login com senha inválida para: {}", request.email());
            auditService.logError(null, null, AuditService.LOGIN_FAILED, "Email: " + request.email());
            throw new BadCredentialsException("Credenciais inválidas");
        }

        // Busca organização
        Organization org = organizationRepository.findById(user.getOrganization().getId())
                .orElseThrow(() -> new BadCredentialsException("Organização não encontrada"));

        // Gera o token JWT com userId, organizationId e role
        String token = jwtService.generateToken(
                user.getId(),
                user.getOrganization().getId(),
                user.getEmail(),
                user.getRole().name()
        );

        log.info("Login bem-sucedido para usuário: {}", user.getId());
        auditService.log(user.getOrganization().getId(), user.getId(), AuditService.LOGIN, "User", user.getId(), "Login: " + user.getEmail());
        return buildAuthResponse(token, user, org);
    }

    // ----------------------------------------------------------------
    // REGISTRO
    // ----------------------------------------------------------------

    /**
     * Registra um novo cliente: cria organização + usuário admin.
     *
     * Transactional garante que se qualquer etapa falhar,
     * nenhuma alteração é persistida no banco.
     */
    @Transactional
    public AuthResponse register(RegisterRequest request) {
        // Verifica se email já existe
        if (userRepository.existsByEmail(request.email())) {
            throw new BusinessException("Este email já está em uso.");
        }

        // 1. Cria a organização
        Organization org = Organization.builder()
                .nome(request.nomeOrganizacao() != null && !request.nomeOrganizacao().isBlank() ? request.nomeOrganizacao() : "Org de " + request.nome())
                .tipo(request.tipoOrganizacao())
                .build();
        org = organizationRepository.save(org);

        // 2. Cria o usuário admin com senha criptografada
        User user = User.builder()
                .nome(request.nome())
                .email(request.email())
                // CRÍTICO: senha é hasheada com BCrypt antes de salvar
                .senha(passwordEncoder.encode(request.senha()))
                .role(UserRole.ADMIN)
                .organization(org)
                .build();
        user = userRepository.save(user);

        // 3. Gera JWT
        String token = jwtService.generateToken(
                user.getId(),
                user.getOrganization().getId(),
                user.getEmail(),
                user.getRole().name()
        );

        log.info("Novo usuário registrado: {} na organização: {}", user.getId(), org.getId());
        auditService.log(org.getId(), user.getId(), AuditService.REGISTER, "User", user.getId(), "Registro: " + user.getEmail());
        return buildAuthResponse(token, user, org);
    }

    // ----------------------------------------------------------------
    // PRIVADOS
    // ----------------------------------------------------------------

    private AuthResponse buildAuthResponse(String token, User user, Organization org) {
        return new AuthResponse(
                token,
                new AuthResponse.UserData(
                        user.getId().toString(),
                        user.getNome(),
                        user.getEmail(),
                        user.getRole(),
                        user.getOrganization().getId().toString()
                ),
                new AuthResponse.OrganizationData(
                        org.getId().toString(),
                        org.getNome(),
                        org.getTipo()
                )
        );
    }
}
