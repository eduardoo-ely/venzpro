package com.venzpro.api.controller;

import com.venzpro.exception.BusinessException;
import com.venzpro.exception.ResourceNotFoundException;
import com.venzpro.exception.TenantViolationException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;

import java.net.URI;
import java.time.Instant;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Centraliza o tratamento de todas as exceções.
 * Usa RFC 7807 Problem Details (disponível nativamente no Spring 6+).
 * Nunca expõe stack traces — apenas mensagens controladas.
 */
@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler {

    // ── 404 Not Found ────────────────────────────────────────────────────────

    @ExceptionHandler(ResourceNotFoundException.class)
    public ProblemDetail handleNotFound(ResourceNotFoundException ex) {
        log.debug("Recurso não encontrado: {}", ex.getMessage());
        return problem(HttpStatus.NOT_FOUND, "Recurso não encontrado", ex.getMessage());
    }

    // ── 409 Conflict (regra de negócio) ──────────────────────────────────────

    @ExceptionHandler(BusinessException.class)
    public ProblemDetail handleBusiness(BusinessException ex) {
        log.debug("Regra de negócio violada: {}", ex.getMessage());
        return problem(HttpStatus.CONFLICT, "Conflito", ex.getMessage());
    }

    // ── 403 Violação multi-tenant ────────────────────────────────────────────

    @ExceptionHandler(TenantViolationException.class)
    public ProblemDetail handleTenantViolation(TenantViolationException ex) {
        log.error("VIOLAÇÃO MULTI-TENANT: {}", ex.getMessage());
        return problem(HttpStatus.FORBIDDEN, "Acesso negado",
                "Você não tem permissão para acessar este recurso.");
    }

    // ── 400 Validation (@Valid) ───────────────────────────────────────────────

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ProblemDetail handleValidation(MethodArgumentNotValidException ex) {
        Map<String, String> fieldErrors = ex.getBindingResult().getFieldErrors().stream()
                .collect(Collectors.toMap(
                        FieldError::getField,
                        fe -> fe.getDefaultMessage() != null ? fe.getDefaultMessage() : "inválido",
                        (a, b) -> a   // em caso de campos duplicados, mantém o primeiro
                ));

        var pd = problem(HttpStatus.BAD_REQUEST, "Dados inválidos",
                "Um ou mais campos não passaram na validação.");
        pd.setProperty("campos", fieldErrors);
        return pd;
    }

    // ── 400 Tipo de parâmetro inválido (UUID malformado etc.) ─────────────────

    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    public ProblemDetail handleTypeMismatch(MethodArgumentTypeMismatchException ex) {
        String msg = "Parâmetro '%s' com valor inválido: '%s'".formatted(ex.getName(), ex.getValue());
        return problem(HttpStatus.BAD_REQUEST, "Parâmetro inválido", msg);
    }

    // ── 401 Autenticação inválida ─────────────────────────────────────────────

    @ExceptionHandler({AuthenticationException.class, BadCredentialsException.class})
    public ProblemDetail handleAuthentication(Exception ex) {
        log.debug("Falha de autenticação: {}", ex.getMessage());
        return problem(HttpStatus.UNAUTHORIZED, "Não autorizado", "Credenciais inválidas.");
    }

    // ── 403 Sem permissão ────────────────────────────────────────────────────

    @ExceptionHandler(AccessDeniedException.class)
    public ProblemDetail handleAccessDenied(AccessDeniedException ex) {
        log.debug("Acesso negado: {}", ex.getMessage());
        return problem(HttpStatus.FORBIDDEN, "Acesso negado",
                "Você não tem permissão para executar esta operação.");
    }

    // ── 500 Fallback ─────────────────────────────────────────────────────────

    @ExceptionHandler(Exception.class)
    public ProblemDetail handleGeneral(Exception ex) {
        log.error("Erro inesperado: {}", ex.getMessage(), ex);
        return problem(HttpStatus.INTERNAL_SERVER_ERROR, "Erro interno",
                "Ocorreu um erro inesperado. Tente novamente.");
    }

    // ── Helper ───────────────────────────────────────────────────────────────

    private ProblemDetail problem(HttpStatus status, String title, String detail) {
        var pd = ProblemDetail.forStatusAndDetail(status, detail);
        pd.setTitle(title);
        pd.setType(URI.create("about:blank"));
        pd.setProperty("timestamp", Instant.now().toString());
        return pd;
    }
}
