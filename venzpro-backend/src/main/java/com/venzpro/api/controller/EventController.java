package com.venzpro.api.controller;

import com.venzpro.application.dto.request.EventRequest;
import com.venzpro.application.dto.response.EventResponse;
import com.venzpro.application.service.EventService;
import com.venzpro.infrastructure.security.VenzproPrincipal;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/events")
@RequiredArgsConstructor
public class EventController {

    private final EventService eventService;

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public EventResponse create(@Valid @RequestBody EventRequest req,
                                @AuthenticationPrincipal VenzproPrincipal principal) {
        return eventService.create(req, principal.userId(), principal.organizationId());
    }

    @GetMapping
    public List<EventResponse> findAll(@AuthenticationPrincipal VenzproPrincipal principal) {
        return eventService.findAll(principal.organizationId());
    }

    @GetMapping("/{id}")
    public EventResponse findById(@PathVariable UUID id,
                                  @AuthenticationPrincipal VenzproPrincipal principal) {
        return eventService.findById(id, principal.organizationId());
    }

    @PutMapping("/{id}")
    public EventResponse update(@PathVariable UUID id,
                                @Valid @RequestBody EventRequest req,
                                @AuthenticationPrincipal VenzproPrincipal principal) {
        return eventService.update(id, req, principal.organizationId());
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable UUID id,
                       @AuthenticationPrincipal VenzproPrincipal principal) {
        eventService.delete(id, principal.organizationId());
    }
}
