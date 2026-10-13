FROM node:22-slim AS ui
WORKDIR /ui
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY backend/ backend/
COPY data/ data/
COPY demo/ demo/
COPY --from=ui /ui/dist frontend/dist
WORKDIR /app/backend
ENV PORT=8000
EXPOSE 8000
CMD ["sh", "-c", "uvicorn rayshop.server:app --host 0.0.0.0 --port ${PORT}"]
