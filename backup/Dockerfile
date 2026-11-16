FROM postgres:16-alpine

RUN mkdir -p /backups

COPY backup.sh /backup.sh
COPY restore.sh /restore.sh
RUN sed -i 's/\r$//' /backup.sh /restore.sh && chmod +x /backup.sh /restore.sh

CMD ["/backup.sh"]
