package com.venzpro.application.service;

import com.venzpro.application.dto.request.CompanyRequest;
import com.venzpro.application.dto.response.CompanyResponse;
import com.venzpro.domain.entity.Company;
import com.venzpro.domain.repository.CompanyRepository;
import com.venzpro.domain.repository.OrganizationRepository;
import com.venzpro.exception.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class CompanyService {

    private final CompanyRepository companyRepository;
    private final OrganizationRepository organizationRepository;

    @Transactional
    public CompanyResponse create(CompanyRequest req, UUID organizationId) {
        var org = organizationRepository.findById(organizationId)
                .orElseThrow(() -> new ResourceNotFoundException("Organização", organizationId));
        var company = Company.builder().nome(req.nome()).organization(org).build();
        return CompanyResponse.from(companyRepository.save(company));
    }

    @Transactional(readOnly = true)
    public List<CompanyResponse> findAll(UUID organizationId) {
        return companyRepository.findAllByOrganizationId(organizationId)
                .stream().map(CompanyResponse::from).toList();
    }

    @Transactional(readOnly = true)
    public CompanyResponse findById(UUID id, UUID organizationId) {
        return companyRepository.findByIdAndOrganizationId(id, organizationId)
                .map(CompanyResponse::from)
                .orElseThrow(() -> new ResourceNotFoundException("Empresa", id));
    }

    @Transactional
    public CompanyResponse update(UUID id, CompanyRequest req, UUID organizationId) {
        var company = companyRepository.findByIdAndOrganizationId(id, organizationId)
                .orElseThrow(() -> new ResourceNotFoundException("Empresa", id));
        company.setNome(req.nome());
        return CompanyResponse.from(companyRepository.save(company));
    }

    @Transactional
    public void delete(UUID id, UUID organizationId) {
        var company = companyRepository.findByIdAndOrganizationId(id, organizationId)
                .orElseThrow(() -> new ResourceNotFoundException("Empresa", id));
        companyRepository.delete(company);
    }
}
