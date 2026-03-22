package com.venzpro.infrastructure.exception;

/**
 * Lançada quando uma operação viola o isolamento multi-tenant.
 * Sempre retornada como HTTP 403 pelo GlobalExceptionHandler.
 *
 * Indica um bug no código de negócio ou tentativa de acesso malicioso.
 * Deve ser logada em nível ERROR para auditoria.
 */
public class TenantViolationException extends RuntimeException {
    public TenantViolationException(String message) {
        super(message);
    }
}
