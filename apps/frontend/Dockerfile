FROM registry.access.redhat.com/ubi9/nginx-124:latest
USER root
COPY frontend/dist /opt/app-root/src
COPY frontend/nginx.conf /etc/nginx/nginx.conf
COPY frontend/docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh && \
    chmod -R g+rwX /opt/app-root/src
USER 1001
EXPOSE 8080
CMD ["/usr/local/bin/docker-entrypoint.sh"]
