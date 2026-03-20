package com.venzpro.exception;

/**
 * Lançada quando um recurso não é encontrado OU quando pertence a outra organização.
 * Retornada como HTTP 404 — nunca revela se o recurso existe em outra organização.
 */
public class ResourceNotFoundException extends RuntimeException {
    public ResourceNotFoundException(String message) {
        super(message);
    }
    public ResourceNotFoundException(String resource, Object id) {
        super(resource + " não encontrado: " + id);
    }
}
