# Local Test Runbook

Use this flow when you want to test the backend and `frontend_v2` locally while the main database lives in RDS.

## 1. Backend setup

```bash
cd /Users/suvom/Desktop/POC/drip_directive
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
python check_env.py
```

What to set in `.env` before you start:

- `DATABASE_URL` should point at your RDS Postgres instance.
- `SECRET_KEY` should be a real random value.
- `LLM_PROVIDER` must match the API key you actually have.
- `VIRTUAL_TRYON_PROVIDER=legacy` is fine for local app smoke tests before the Runpod pod is running.
- If `USE_S3=true`, make sure your shell also has AWS credentials or `AWS_PROFILE`.

RDS note:

- The machine running the backend must be allowed by the RDS security group on port `5432`.
- This app currently creates tables on startup with `Base.metadata.create_all(...)`, so there is no separate Alembic step for local bring-up.

## 2. Start the backend

```bash
cd /Users/suvom/Desktop/POC/drip_directive
source venv/bin/activate
python run.py
```

Backend test URLs:

- `http://localhost:8000/health`
- `http://localhost:8000/docs`

Quick smoke check:

```bash
curl http://localhost:8000/health
```

Expected result:

- `"status": "healthy"`
- `"database": "connected"`

## 3. Frontend setup

```bash
cd /Users/suvom/Desktop/POC/drip_directive/frontend_v2
cp .env.example .env
npm install
```

Set this in `frontend_v2/.env`:

```env
VITE_API_BASE_URL=http://localhost:8000
```

If `frontend_v2/.env` is currently pointing at your deployed API, switch it back to `http://localhost:8000` before local browser testing.

## 4. Start the frontend

```bash
cd /Users/suvom/Desktop/POC/drip_directive/frontend_v2
npm run dev
```

Frontend URL:

- `http://localhost:5174`

## 5. Browser smoke test

Use the UI in this order:

1. Open `http://localhost:5174`.
2. Sign up or log in.
3. Go to `/app/profile` and save a basic profile.
4. Upload one full-body user image.
5. Trigger user-image AI processing.
6. Go to `/app/wardrobe` and upload one or more garment images.
7. Trigger wardrobe processing and wait for items to move to completed.
8. Go to `/app/recommendations` and generate a simple outfit prompt like `Weekend brunch look in neutrals`.
9. Review the recommendation history and outfit cards.

## 6. API smoke test without the UI

If you want to isolate backend issues from frontend issues, use Swagger:

- Open `http://localhost:8000/docs`
- Call `/api/auth/signup` or `/api/auth/login`
- Use the returned bearer token in the authorize dialog
- Then test:
  - `GET /api/users/workspace-summary`
  - `POST /api/images/upload`
  - `POST /api/ai/process-user-images`
  - `POST /api/wardrobe/upload`
  - `POST /api/ai/process-all-wardrobe`
  - `POST /api/recommendations/generate`
  - `GET /api/recommendations/`

## 7. Try-on testing

Try-on is the last step, not the first step.

- If `VIRTUAL_TRYON_PROVIDER=legacy`, you can test the rest of the app without the Runpod pod.
- If `VIRTUAL_TRYON_PROVIDER=runpod_pod`, only test try-on after the Runpod pod is created, the pod API is running, and `RUNPOD_POD_API_URL` plus `RUNPOD_POD_API_TOKEN` are set.

## 8. Common failures

- `Database connectivity test failed`
  - Check the RDS hostname, credentials, database name, and security-group access.
- `CORS` errors in the browser
  - Make sure `CORS_ALLOW_ORIGINS` includes `http://localhost:5174`.
- Upload works but images do not render
  - Check whether you are using local uploads or S3, and whether returned image URLs are reachable.
- Recommendations fail after uploads
  - Make sure the user image and wardrobe items are processed before generating recommendations.
