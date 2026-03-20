package com.venzpro.application.service;

import com.venzpro.application.dto.request.CatalogFileRequest;
import com.venzpro.application.dto.response.CatalogFileResponse;
import com.venzpro.domain.entity.CatalogFile;
import com.venzpro.domain.repository.CatalogFileRepository;
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
public class CatalogFileService {

    private final CatalogFileRepository fileRepository;
    private final CompanyRepository companyRepository;
    private final OrganizationRepository organizationRepository;

    @Transactional
    public CatalogFileResponse create(CatalogFileRequest req, UUID organizationId) {
        var company = companyRepository.findByIdAndOrganizationId(req.companyId(), organizationId)
                .orElseThrow(() -> new ResourceNotFoundException("Empresa", req.companyId()));
        var org = organizationRepository.findById(organizationId)
                .orElseThrow(() -> new ResourceNotFoundException("Organização", organizationId));

        var file = CatalogFile.builder()
                .company(company).organization(org)
                .nome(req.nome()).url(req.url()).tipo(req.tipo())
                .build();
        return CatalogFileResponse.from(fileRepository.save(file));
    }

    @Transactional(readOnly = true)
    public List<CatalogFileResponse> findAll(UUID organizationId) {
        return fileRepository.findAllByOrganizationId(organizationId)
                .stream().map(CatalogFileResponse::from).toList();
    }

    @Transactional(readOnly = true)
    public List<CatalogFileResponse> findByCompany(UUID companyId, UUID organizationId) {
        companyRepository.findByIdAndOrganizationId(companyId, organizationId)
                .orElseThrow(() -> new ResourceNotFoundException("Empresa", companyId));
        return fileRepository.findAllByCompanyIdAndOrganizationId(companyId, organizationId)
                .stream().map(CatalogFileResponse::from).toList();
    }

    @Transactional(readOnly = true)
    public CatalogFileResponse findById(UUID id, UUID organizationId) {
        return fileRepository.findByIdAndOrganizationId(id, organizationId)
                .map(CatalogFileResponse::from)
                .orElseThrow(() -> new ResourceNotFoundException("Arquivo", id));
    }

    @Transactional
    public void delete(UUID id, UUID organizationId) {
        var file = fileRepository.findByIdAndOrganizationId(id, organizationId)
                .orElseThrow(() -> new ResourceNotFoundException("Arquivo", id));
        fileRepository.delete(file);
    }
}
