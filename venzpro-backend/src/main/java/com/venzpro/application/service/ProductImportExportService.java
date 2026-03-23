package com.venzpro.application.service;

import com.opencsv.CSVReader;
import com.opencsv.CSVReaderBuilder;
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
     * Importação assíncrona via CSV.
     * organizationId é passado explicitamente pelo controller para evitar
     * perda de contexto quando o @Async cria uma nova thread.
     */
    @Async
    public void importProductsAsync(MultipartFile file, UUID organizationId) {
        log.info("Iniciando importação de produtos para org: {}", organizationId);
        try {
            try (Reader reader = new InputStreamReader(
                    file.getInputStream(), StandardCharsets.UTF_8);
                 CSVReader csvReader = new CSVReaderBuilder(reader)
                         .withSkipLines(1).build()) {

                String[] nextLine;
                List<Product> batch = new ArrayList<>();
                int totalImported   = 0;

                while ((nextLine = csvReader.readNext()) != null) {
                    if (nextLine.length < 4) continue;

                    Product p = Product.builder()
                            .nome(nextLine[0].trim())
                            .descricao(nextLine[1].trim())
                            .precoBase(new BigDecimal(
                                    nextLine[2].trim().replace(",", ".")))
                            .unidade(UnidadeMedida.valueOf(
                                    nextLine[3].trim().toUpperCase()))
                            .ativo(true)
                            .build();
                    p.setOrganizationId(organizationId);
                    batch.add(p);

                    if (batch.size() >= BATCH_SIZE) {
                        productRepository.saveAll(batch);
                        totalImported += batch.size();
                        batch.clear();
                    }
                }

                if (!batch.isEmpty()) {
                    productRepository.saveAll(batch);
                    totalImported += batch.size();
                }

                log.info("Importação concluída: {} produtos para org {}", totalImported, organizationId);
            }
        } catch (Exception e) {
            log.error("Erro ao importar CSV para org {}: {}", organizationId, e.getMessage());
        }
    }

    /**
     * Exportação para Excel.
     * organizationId passado explicitamente (igual à importação).
     * Não usa TenantContext.get() para ser reutilizável em contextos assíncronos futuros.
     */
    @Transactional(readOnly = true)
    public byte[] exportProductsToExcel(UUID organizationId) {
        List<Product> products = productRepository.findAllForExport(organizationId);

        try (Workbook workbook = new XSSFWorkbook();
             ByteArrayOutputStream out = new ByteArrayOutputStream()) {

            Sheet sheet = workbook.createSheet("Catálogo de Produtos");

            Row header = sheet.createRow(0);
            header.createCell(0).setCellValue("SKU");
            header.createCell(1).setCellValue("Nome");
            header.createCell(2).setCellValue("Descrição");
            header.createCell(3).setCellValue("Preço Base");
            header.createCell(4).setCellValue("Unidade");

            int rowIdx = 1;
            for (Product p : products) {
                Row row = sheet.createRow(rowIdx++);
                row.createCell(0).setCellValue(p.getCodigoSku() != null ? p.getCodigoSku() : "");
                row.createCell(1).setCellValue(p.getNome());
                row.createCell(2).setCellValue(p.getDescricao() != null ? p.getDescricao() : "");
                row.createCell(3).setCellValue(p.getPrecoBase().doubleValue());
                row.createCell(4).setCellValue(p.getUnidade().name());
            }

            for (int i = 0; i < 5; i++) {
                sheet.autoSizeColumn(i);
            }

            workbook.write(out);
            return out.toByteArray();

        } catch (Exception e) {
            log.error("Erro ao gerar exportação Excel para org {}", organizationId, e);
            throw new RuntimeException("Falha ao gerar o ficheiro Excel.");
        }
    }
}
