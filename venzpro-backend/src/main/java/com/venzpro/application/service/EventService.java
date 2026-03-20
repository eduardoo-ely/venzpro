package com.venzpro.application.service;

import com.venzpro.application.dto.request.EventRequest;
import com.venzpro.application.dto.response.EventResponse;
import com.venzpro.domain.entity.Event;
import com.venzpro.domain.repository.*;
import com.venzpro.exception.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class EventService {

    private final EventRepository eventRepository;
    private final UserRepository userRepository;
    private final CustomerRepository customerRepository;
    private final CompanyRepository companyRepository;
    private final OrganizationRepository organizationRepository;

    @Transactional
    public EventResponse create(EventRequest req, UUID userId, UUID organizationId) {
        var user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Usuário", userId));
        var org = organizationRepository.findById(organizationId)
                .orElseThrow(() -> new ResourceNotFoundException("Organização", organizationId));

        var customer = req.customerId() != null
                ? customerRepository.findByIdAndOrganizationId(req.customerId(), organizationId).orElse(null)
                : null;
        var company = req.companyId() != null
                ? companyRepository.findByIdAndOrganizationId(req.companyId(), organizationId).orElse(null)
                : null;

        var event = Event.builder()
                .user(user).customer(customer).company(company).organization(org)
                .tipo(req.tipo()).titulo(req.titulo()).descricao(req.descricao())
                .dataInicio(req.dataInicio()).dataFim(req.dataFim()).status(req.status())
                .participantes(req.participantes() != null ? new ArrayList<>(req.participantes()) : new ArrayList<>())
                .build();

        return EventResponse.from(eventRepository.save(event));
    }

    @Transactional(readOnly = true)
    public List<EventResponse> findAll(UUID organizationId) {
        return eventRepository.findAllByOrganizationId(organizationId)
                .stream().map(EventResponse::from).toList();
    }

    @Transactional(readOnly = true)
    public EventResponse findById(UUID id, UUID organizationId) {
        return eventRepository.findByIdAndOrganizationId(id, organizationId)
                .map(EventResponse::from)
                .orElseThrow(() -> new ResourceNotFoundException("Evento", id));
    }

    @Transactional
    public EventResponse update(UUID id, EventRequest req, UUID organizationId) {
        var event = eventRepository.findByIdAndOrganizationId(id, organizationId)
                .orElseThrow(() -> new ResourceNotFoundException("Evento", id));

        var customer = req.customerId() != null
                ? customerRepository.findByIdAndOrganizationId(req.customerId(), organizationId).orElse(null)
                : null;
        var company = req.companyId() != null
                ? companyRepository.findByIdAndOrganizationId(req.companyId(), organizationId).orElse(null)
                : null;

        event.setCustomer(customer);
        event.setCompany(company);
        event.setTipo(req.tipo());
        event.setTitulo(req.titulo());
        event.setDescricao(req.descricao());
        event.setDataInicio(req.dataInicio());
        event.setDataFim(req.dataFim());
        event.setStatus(req.status());
        event.getParticipantes().clear();
        if (req.participantes() != null) event.getParticipantes().addAll(req.participantes());

        return EventResponse.from(eventRepository.save(event));
    }

    @Transactional
    public void delete(UUID id, UUID organizationId) {
        var event = eventRepository.findByIdAndOrganizationId(id, organizationId)
                .orElseThrow(() -> new ResourceNotFoundException("Evento", id));
        eventRepository.delete(event);
    }
}
