# Docker Guide

This repo's Docker setup now runs:

- `backend`: FastAPI API on port `8000`
- `frontend`: production build of `frontend_v2` on port `8085`

## Start

```bash
docker compose up --build
```

## Endpoints

- Backend: `http://localhost:8000`
- Frontend: `http://localhost:8085`
- Health: `http://localhost:8000/health`

## Required Environment

Create `.env` in the repo root and set at least:

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/dripdirective
SECRET_KEY=change-me
GOOGLE_API_KEY=
OPENAI_API_KEY=
```

For Runpod try-on, also set the relevant provider variables from [docs/env.example](docs/env.example).

## Frontend Notes

- The Docker frontend image builds `frontend_v2` with `VITE_API_BASE_URL=http://localhost:8000`.
- For other environments, change the `VITE_API_BASE_URL` build arg in [docker-compose.yml](docker-compose.yml).

## Common Commands

```bash
docker compose up -d
docker compose down
docker compose logs -f backend
docker compose logs -f frontend
docker compose restart backend
docker compose restart frontend
```

## Persistent Data

- `uploads/` for user, wardrobe, generated, and try-on images
- `chroma_data/` for local vector storage

## EC2 Override

For EC2/backend-only deployments:

```bash
docker compose -f docker-compose.yml -f docker-compose.ec2.yml up -d --build
```
