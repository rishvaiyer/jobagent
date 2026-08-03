FROM node:20-alpine AS frontend

WORKDIR /app/jobagent/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    JOBAGENT_DATA_DIR=/data \
    JOBAGENT_DB_PATH=/data/jobagent.db

WORKDIR /app/jobagent
COPY backend/requirements.txt backend/requirements.txt
RUN pip install --no-cache-dir -r backend/requirements.txt
COPY backend/ backend/
COPY --from=frontend /app/jobagent/frontend/dist frontend/dist

EXPOSE 8080
CMD ["sh", "-c", "uvicorn backend.production:app --host 0.0.0.0 --port ${PORT:-8080}"]
