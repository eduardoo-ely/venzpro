package com.venzpro.application.service;

import com.opencsv.CSVReader;
import com.opencsv.CSVReaderBuilder;
import com.venzpro.config.security.TenantContext;
import com.venzpro.domain.entity.Product;
import com.venzpro.domain.enums.UnidadeMedida;
import com.venzpro.domain.repository.ProductRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.ByteArrayOutputStream;
import java.io.InputStreamReader;
import java.io.Reader;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class ProductImportExportService {

    private final ProductRepository productRepository;
    private static final int BATCH_SIZE = 500;

    /**
     * Importação assíncrona de CSV usando OpenCSV.
     * Lê o ficheiro em lotes (batch) para otimizar o uso da RAM e do PostgreSQL.
     */
    @Async
    public void importProductsAsync(MultipartFile file) {
        // Captura o tenant atual da thread principal (HTTP Request)
        final UUID organizationId = TenantContext.get();

        try {
            // INJETA o tenant na nova Thread assíncrona para não falhar o TenantIsolationAspect
            TenantContext.set(organizationId);

            log.info("Iniciando importação de produtos para org: {}", organizationId);

            try (Reader reader = new InputStreamReader(file.getInputStream(), StandardCharsets.UTF_8);
                 CSVReader csvReader = new CSVReaderBuilder(reader).withSkipLines(1).build()) {

                String[] nextLine;
                List<Product> batch = new ArrayList<>();
                int totalImported = 0;

                while ((nextLine = csvReader.readNext()) != null) {
                    if (nextLine.length < 3) continue; // ignora linhas incompletas

                    // Estrutura esperada do CSV: Nome, Descricao, Preco, Unidade, SKU
                    Product p = Product.builder()
                            .nome(nextLine[0].trim())
                            .descricao(nextLine[1].trim())
                            .precoBase(new BigDecimal(nextLine[2].trim().replace(",", ".")))
                            .unidade(UnidadeMedida.valueOf(nextLine[3].trim().toUpperCase()))
                            .codigoSku(nextLine.length > 4 ? nextLine[4].trim() : null)
                            .ativo(true)
                            .build();

                    p.setOrganizationId(organizationId);
                    batch.add(p);

                    // Salva em lotes de 500 para evitar OutOfMemoryError
                    if (batch.size() >= BATCH_SIZE) {
                        productRepository.saveAll(batch);
                        totalImported += batch.size();
                        batch.clear();
                    }
                }

                // Salva o remanescente
                if (!batch.isEmpty()) {
                    productRepository.saveAll(batch);
                    totalImported += batch.size();
                }

                log.info("Importação concluída. Total de {} produtos importados.", totalImported);
            }
        } catch (Exception e) {
            log.error("Erro ao importar CSV para org {}: {}", organizationId, e.getMessage());
            // Num sistema real, poderias gravar este erro numa tabela de "ImportJobs" para notificar o frontend
        } finally {
            // Limpa o contexto da thread para evitar vazamentos de memória (Memory Leaks)
            TenantContext.clear();
        }
    }

    /**
     * Exporta todo o catálogo ativo da organização para um ficheiro Excel (XLSX).
     */
    @Transactional(readOnly = true)
    public byte[] exportProductsToExcel() {
        UUID orgId = TenantContext.get();
        List<Product> products = productRepository.findAllForExport(orgId);

        try (Workbook workbook = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Sheet sheet = workbook.createSheet("Catálogo de Produtos");

            // Cria o cabeçalho
            Row headerRow = sheet.createRow(0);
            headerRow.createCell(0).setCellValue("SKU");
            headerRow.createCell(1).setCellValue("Nome");
            headerRow.createCell(2).setCellValue("Descrição");
            headerRow.createCell(3).setCellValue("Preço Base");
            headerRow.createCell(4).setCellValue("Unidade");

            // Preenche as linhas
            int rowIdx = 1;
            for (Product p : products) {
                Row row = sheet.createRow(rowIdx++);
                row.createCell(0).setCellValue(p.getCodigoSku() != null ? p.getCodigoSku() : "");
                row.createCell(1).setCellValue(p.getNome());
                row.createCell(2).setCellValue(p.getDescricao() != null ? p.getDescricao() : "");
                row.createCell(3).setCellValue(p.getPrecoBase().doubleValue());
                row.createCell(4).setCellValue(p.getUnidade().name());
            }

            // Auto-size das colunas
            for (int i = 0; i < 5; i++) {
                sheet.autoSizeColumn(i);
            }

            workbook.write(out);
            return out.toByteArray();

        } catch (Exception e) {
            log.error("Erro ao gerar exportação Excel para org {}", orgId, e);
            throw new RuntimeException("Falha ao gerar o ficheiro Excel.");
        }
    }
}