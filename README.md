# Dripdirective

Dripdirective is a full-stack styling workspace for:

- profile + self-photo uploads
- wardrobe uploads and AI processing
- outfit recommendations from your closet
- virtual try-on through the Runpod/FASHN flow

## Stack

- Backend: FastAPI, SQLAlchemy, Postgres, ChromaDB
- Frontend: React 19, Vite, React Router
- Try-on: Runpod + FASHN VTON

## Quick Start

### Backend

```bash
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python check_env.py
python run.py
```

Backend runs at `http://localhost:8000`.

### Frontend

```bash
cd frontend_v2
cp .env.example .env
npm install
npm run dev
```

Frontend v2 runs at `http://localhost:5174`.

Set `VITE_API_BASE_URL` in `frontend_v2/.env` if your backend is not on `http://localhost:8000`.

## Local Testing

Use the local runbook for frontend + backend testing against RDS:

- [docs/LOCAL_TEST_RUNBOOK.md](docs/LOCAL_TEST_RUNBOOK.md)

## Docker

```bash
docker compose up --build
```

- Backend: `http://localhost:8000`
- Frontend: `http://localhost:8085`

The Docker frontend now builds and serves `frontend_v2`.

## Runpod Try-On

This repo supports both:

- Runpod Serverless
- dedicated Runpod Pod deployments

Pod deployment guide:

- [docs/RUNPOD_FASHN_VTON_POD_DEPLOYMENT.md](docs/RUNPOD_FASHN_VTON_POD_DEPLOYMENT.md)
- `deployment/runpod/fashn_vton_pod/backend_env_a4500.example` contains a ready-made backend preset if you deploy the pod on `RTX A4500`.

Serverless deployment guide:

- [docs/RUNPOD_FASHN_VTON_DEPLOYMENT.md](docs/RUNPOD_FASHN_VTON_DEPLOYMENT.md)

## Frontend Deployment

Use the v2 deployment runbook:

- [docs/FRONTEND_DEPLOYMENT_RUNBOOK.md](docs/FRONTEND_DEPLOYMENT_RUNBOOK.md)

## Project Layout

```text
drip_directive/
├── app/                # FastAPI backend
├── frontend_v2/        # Primary web frontend
├── deployment/runpod/  # Runpod worker + pod assets
├── docs/               # Deployment and ops docs
├── uploads/            # Local file storage
└── chroma_data/        # Local vector store
```

## Notes

- No database schema change is required for the frontend/backend migration in this pass.
- The legacy `frontend/` app has been retired in favor of `frontend_v2`.
