# Dripdirective Frontend v2

This is the primary web frontend for Dripdirective.

It is built to:

- stay lightweight and fast on web
- align with the current backend and Runpod/FASHN try-on flow
- replace the retired Expo web frontend

## What is included

- public editorial landing page
- email/password auth flow
- authenticated command-center overview
- profile studio with self-photo uploads and preferred try-on image selection
- wardrobe lab with direct item try-on
- style engine with recommendation history and recommendation try-on controls

## Stack

- React 19
- Vite
- React Router
- Axios
- Lucide icons

## Run locally

```bash
cd frontend_v2
cp .env.example .env
npm install
npm run dev
```

The app expects the backend API at `http://localhost:8000` by default.

To point at another backend:

```env
VITE_API_BASE_URL=http://your-backend-host:8000
```

## Notes

- This v2 app is web-only.
- It uses the backend endpoints already present in this repo.
- The recommendation and wardrobe try-on flows are wired to the new backend request shape that supports selecting a `user_image_id`.
