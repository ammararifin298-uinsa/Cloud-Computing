FROM postgres:16-alpine

USER root
RUN apk add --no-cache minio \
    && mkdir -p /data

EXPOSE 9000 9001

ENTRYPOINT ["/usr/bin/minio"]
CMD ["server", "/data", "--console-address", ":9001"]
