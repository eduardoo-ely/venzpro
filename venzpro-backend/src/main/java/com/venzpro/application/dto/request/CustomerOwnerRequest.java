package com.venzpro.application.dto.request;

import java.util.UUID;

public record CustomerOwnerRequest(
        UUID ownerId
) {}