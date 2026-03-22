package com.venzpro.domain.enums;

/**
 * Unidades de medida para o catálogo de produtos.
 * Os valores devem coincidir com o CHECK CONSTRAINT definido no Flyway SQL.
 */
public enum UnidadeMedida {
    UN,   // Unidade
    KG,   // Quilograma
    CX,   // Caixa
    L,    // Litro
    M,    // Metro linear
    M2,   // Metro quadrado
    M3,   // Metro cúbico
    PC,   // Peça
    PAR,  // Par
    HR    // Hora (serviços)
}