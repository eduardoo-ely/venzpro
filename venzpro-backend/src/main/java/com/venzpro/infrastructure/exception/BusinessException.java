package com.venzpro.infrastructure.exception;

/**
 * Lançada quando uma regra de negócio é violada (ex: email duplicado).
 * Retornada como HTTP 409 Conflict.
 */
public class BusinessException extends RuntimeException {
    public BusinessException(String message) {
        super(message);
    }
}
