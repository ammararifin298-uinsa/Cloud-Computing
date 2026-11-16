FROM python:3.12-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

RUN mkdir -p /cdn-uploads \
    && addgroup --system appuser \
    && adduser --system --ingroup appuser --home /home/appuser appuser \
    && chown -R appuser:appuser /app /cdn-uploads

USER appuser

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
