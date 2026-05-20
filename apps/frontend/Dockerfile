FROM registry.access.redhat.com/ubi9/nodejs-22:latest AS builder
USER root
WORKDIR /build
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM registry.access.redhat.com/ubi9/nginx-124:latest
COPY --from=builder /build/dist /opt/app-root/src
COPY nginx.conf /etc/nginx/nginx.conf
COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
USER root
RUN chmod +x /usr/local/bin/docker-entrypoint.sh
USER 1001
EXPOSE 8080
CMD ["/usr/local/bin/docker-entrypoint.sh"]
