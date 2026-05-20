FROM registry.access.redhat.com/ubi9/openjdk-21:latest AS builder
USER root
WORKDIR /build
COPY pom.xml .
COPY src src
RUN mvn package -DskipTests -q

FROM registry.access.redhat.com/ubi9/openjdk-21-runtime:latest
WORKDIR /deployments
COPY --from=builder /build/target/quarkus-app /deployments/
EXPOSE 8080
ENV JAVA_OPTS_APPEND="-Dquarkus.http.host=0.0.0.0"
