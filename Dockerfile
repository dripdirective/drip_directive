FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

# System deps (curl for healthcheck; build deps for some wheels)
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    gcc \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r /app/requirements.txt

COPY app /app/app
COPY run.py /app/run.py

EXPOSE 8000

# Production server: Gunicorn manages multiple Uvicorn workers.
# Control with env:
# - WEB_CONCURRENCY (default 2)
# - GUNICORN_TIMEOUT (default 120)
CMD ["sh", "-c", "gunicorn -k uvicorn.workers.UvicornWorker -w ${WEB_CONCURRENCY:-2} -b 0.0.0.0:8000 --timeout ${GUNICORN_TIMEOUT:-120} --access-logfile - --error-logfile - app.main:app"]
