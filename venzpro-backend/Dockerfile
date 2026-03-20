# ── Estágio 1: build ────────────────────────────────────────────────────────
FROM maven:3.9.6-eclipse-temurin-21 AS build

WORKDIR /app

# Copia só o pom.xml primeiro — aproveita cache do Docker se só o código mudar
COPY pom.xml .
RUN mvn dependency:go-offline -q

# Copia o código e compila
COPY src ./src
RUN mvn package -DskipTests -q

# ── Estágio 2: imagem final ──────────────────────────────────────────────────
FROM eclipse-temurin:21-jre-alpine

WORKDIR /app

# Copia só o JAR gerado
COPY --from=build /app/target/*.jar app.jar

# Porta do Spring Boot
EXPOSE 8080

# Health check — Docker sabe quando o app está pronto
HEALTHCHECK --interval=15s --timeout=5s --start-period=40s --retries=5 \
  CMD wget -qO- http://localhost:8080/actuator/health || exit 1

ENTRYPOINT ["java", "-jar", "app.jar"]
