package com.venzpro.api.controller;

import com.venzpro.exception.BusinessException;
import com.venzpro.exception.ResourceNotFoundException;
import com.venzpro.exception.TenantViolationException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Tratamento centralizado de erros.
 * Retorna JSON simples e amigável — sem stacktrace, sem jargão técnico.
 * Segue o formato: { "mensagem": "...", "campos": {...}, "timestamp": "..." }
 */
@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler {

    // ── 404 — Recurso não encontrado ─────────────────────────────────────────

    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<Map<String, Object>> handleNotFound(ResourceNotFoundException ex) {
        log.debug("Recurso não encontrado: {}", ex.getMessage());
        return response(HttpStatus.NOT_FOUND, ex.getMessage());
    }

    // ── 409 — Conflito de negócio ─────────────────────────────────────────────

    @ExceptionHandler(BusinessException.class)
    public ResponseEntity<Map<String, Object>> handleBusiness(BusinessException ex) {
        log.debug("Regra de negócio: {}", ex.getMessage());
        return response(HttpStatus.CONFLICT, ex.getMessage());
    }

    // ── 400 — Campos inválidos (@Valid) ───────────────────────────────────────

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, Object>> handleValidation(MethodArgumentNotValidException ex) {
        Map<String, String> campos = ex.getBindingResult().getFieldErrors().stream()
                .collect(Collectors.toMap(
                        FieldError::getField,
                        fe -> fe.getDefaultMessage() != null ? fe.getDefaultMessage() : "Valor inválido",
                        (a, b) -> a
                ));

        var body = base(HttpStatus.BAD_REQUEST, "Corrija os campos indicados antes de continuar.");
        body.put("campos", campos);
        return ResponseEntity.badRequest().body(body);
    }

    // ── 400 — Parâmetro com tipo errado ──────────────────────────────────────

    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    public ResponseEntity<Map<String, Object>> handleTypeMismatch(MethodArgumentTypeMismatchException ex) {
        return response(HttpStatus.BAD_REQUEST,
                "O campo '" + ex.getName() + "' recebeu um valor inválido.");
    }

    // ── 401 — Não autenticado ─────────────────────────────────────────────────

    @ExceptionHandler({AuthenticationException.class, BadCredentialsException.class})
    public ResponseEntity<Map<String, Object>> handleAuth(Exception ex) {
        log.debug("Falha de autenticação: {}", ex.getMessage());
        return response(HttpStatus.UNAUTHORIZED,
                "Email ou senha incorretos. Verifique e tente novamente.");
    }

    // ── 403 — Sem permissão ───────────────────────────────────────────────────


    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<Map<String, Object>> handleAccessDenied(AccessDeniedException ex) {
        return response(HttpStatus.FORBIDDEN,
                "Você não tem permissão para realizar esta ação.");
    }

    @ExceptionHandler(TenantViolationException.class)
    public ResponseEntity<Map<String, Object>> handleTenantViolation(TenantViolationException ex) {
        log.error("VIOLAÇÃO MULTI-TENANT: {}", ex.getMessage());
        return response(HttpStatus.FORBIDDEN,
                "Você não tem permissão para acessar este recurso.");
    }

    @ExceptionHandler(TenantViolationException.class)
    public ResponseEntity<Object> handleTenantViolation(TenantViolationException ex) {
        return ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body(Map.of("error", "Acesso Negado", "message", ex.getMessage()));
    }

    // ── 500 — Erro interno (nunca expõe detalhes) ─────────────────────────────

    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, Object>> handleGeneral(Exception ex) {
        log.error("Erro interno: {}", ex.getMessage(), ex);
        return response(HttpStatus.INTERNAL_SERVER_ERROR,
                "Ocorreu um erro inesperado. Se persistir, use o botão 'Reportar Problema'.");
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private Map<String, Object> base(HttpStatus status, String mensagem) {
        var m = new LinkedHashMap<String, Object>();
        m.put("mensagem", mensagem);
        m.put("status", status.value());
        m.put("timestamp", Instant.now().toString());
        return m;
    }

    private ResponseEntity<Map<String, Object>> response(HttpStatus status, String mensagem) {
        return ResponseEntity.status(status).body(base(status, mensagem));
    }
}
