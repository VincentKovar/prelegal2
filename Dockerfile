# Stage 1: Build frontend
FROM node:20-alpine AS frontend-builder

WORKDIR /app/frontend

COPY frontend/package*.json ./
RUN npm ci

COPY frontend/ ./
RUN npm run build

# Stage 2: Python runtime
FROM python:3.12-slim

WORKDIR /app

# Install uv
RUN pip install uv

# Copy backend
COPY backend/ ./backend/

# Copy document catalog and templates (read by the backend at runtime)
COPY catalog.json ./catalog.json
COPY packages/templates/ ./packages/templates/

# Install Python dependencies
WORKDIR /app/backend
RUN uv sync

# Copy frontend build
WORKDIR /app
COPY --from=frontend-builder /app/frontend/out ./frontend/out

EXPOSE 8000

WORKDIR /app/backend
CMD ["uv", "run", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
