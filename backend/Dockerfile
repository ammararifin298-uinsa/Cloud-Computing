FROM node:22-alpine

WORKDIR /app

COPY package.json ./
RUN npm install --omit=dev --no-audit --no-fund

COPY src ./src

RUN addgroup -S appuser && adduser -S appuser -G appuser \
    && chown -R appuser:appuser /app

USER appuser

EXPOSE 8000

CMD ["node", "src/trackingServer.js"]
